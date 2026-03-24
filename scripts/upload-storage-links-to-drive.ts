import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { createSign, randomUUID } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import Papa from 'papaparse'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ path: path.resolve(process.cwd(), '.env'), quiet: true })

type CliOptions = {
    csvPath: string
    folderId: string
    concurrency: number
    dryRun: boolean
    serviceAccountJsonPath: string | null
}

type StorageExportRow = {
    submission_id?: string
    export_file_name?: string
    submitter_name?: string
    week_number?: string
    year?: string
    status?: string
    is_archived?: string
    image_path?: string
    signed_url?: string
    expires_at?: string
    error?: string
}

type UploadResult = {
    submissionId: string
    exportFileName: string
    driveFileId: string
    driveFileName: string
    driveWebViewLink: string
    driveWebContentLink: string
    sourceSignedUrl: string
    status: 'UPLOADED' | 'SKIPPED' | 'FAILED'
    error: string
}

type DriveCredentials = {
    clientEmail: string
    privateKey: string
}

type DriveFileResponse = {
    id: string
    name: string
    webViewLink?: string
    webContentLink?: string
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const DEFAULT_CONCURRENCY = 4

function printUsage() {
    console.log(`
Usage:
  node --import tsx scripts/upload-storage-links-to-drive.ts --csv <path> --folder <drive-folder-id-or-url> [--service-account-json <path>] [--concurrency 4] [--dry-run]

Examples:
  node --import tsx scripts/upload-storage-links-to-drive.ts --csv ./ace-media-storage-links-approved-active-2026-03-23.csv --folder https://drive.google.com/drive/folders/123abc
  node --import tsx scripts/upload-storage-links-to-drive.ts --csv /tmp/export.csv --folder 123abc --concurrency 2
  node --import tsx scripts/upload-storage-links-to-drive.ts --csv "C:\\Users\\you\\Downloads\\export.csv" --folder 123abc --service-account-json "C:\\Users\\you\\Downloads\\drive-service-account.json"

Credentials:
  Preferred on Windows: --service-account-json <path> or GOOGLE_APPLICATION_CREDENTIALS=<path>.
  Otherwise the script uses GOOGLE_DRIVE_CLIENT_EMAIL / GOOGLE_DRIVE_PRIVATE_KEY.
  If those are not set, it falls back to FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY.

Notes:
  The service account must have access to the destination Drive folder.
  The Google Drive API must be enabled in the Google Cloud project for the service account.
`.trim())
}

function parseArgs(argv: string[]): CliOptions {
    let csvPath = ''
    let folderValue = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || ''
    let concurrency = DEFAULT_CONCURRENCY
    let dryRun = false
    let serviceAccountJsonPath: string | null = null

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if (arg === '--help' || arg === '-h') {
            printUsage()
            process.exit(0)
        }

        if (arg === '--dry-run') {
            dryRun = true
            continue
        }

        if (arg === '--csv') {
            csvPath = argv[index + 1] || ''
            index += 1
            continue
        }

        if (arg === '--folder') {
            folderValue = argv[index + 1] || ''
            index += 1
            continue
        }

        if (arg === '--concurrency') {
            concurrency = Number(argv[index + 1] || DEFAULT_CONCURRENCY)
            index += 1
            continue
        }

        if (arg === '--service-account-json') {
            serviceAccountJsonPath = argv[index + 1] || ''
            index += 1
            continue
        }
    }

    if (!csvPath) {
        throw new Error('Missing required --csv argument.')
    }

    if (!folderValue) {
        throw new Error('Missing required --folder argument or GOOGLE_DRIVE_FOLDER_ID environment variable.')
    }

    if (!Number.isFinite(concurrency) || concurrency < 1) {
        throw new Error(`Invalid --concurrency value: ${concurrency}`)
    }

    return {
        csvPath: path.resolve(process.cwd(), csvPath),
        folderId: extractDriveFolderId(folderValue),
        concurrency: Math.floor(concurrency),
        dryRun,
        serviceAccountJsonPath: serviceAccountJsonPath ? path.resolve(process.cwd(), serviceAccountJsonPath) : null,
    }
}

function extractDriveFolderId(value: string) {
    const trimmed = value.trim()
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    if (folderMatch?.[1]) {
        return folderMatch[1]
    }

    const idMatch = trimmed.match(/[a-zA-Z0-9_-]{10,}/)
    if (!idMatch?.[0]) {
        throw new Error(`Could not extract a Google Drive folder ID from: ${value}`)
    }

    return idMatch[0]
}

async function readServiceAccountJson(filePath: string): Promise<DriveCredentials> {
    const content = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(content) as {
        client_email?: string
        private_key?: string
    }

    const clientEmail = parsed.client_email?.trim()
    const privateKey = parsed.private_key?.trim()

    if (!clientEmail || !privateKey) {
        throw new Error(`Service account JSON is missing client_email or private_key: ${filePath}`)
    }

    return {
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
    }
}

async function requireDriveCredentials(serviceAccountJsonPath: string | null): Promise<DriveCredentials> {
    const jsonPath =
        serviceAccountJsonPath ||
        process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
        null

    if (jsonPath) {
        return await readServiceAccountJson(path.resolve(process.cwd(), jsonPath))
    }

    const clientEmail =
        process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim() ||
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim()
    const privateKeyRaw =
        process.env.GOOGLE_DRIVE_PRIVATE_KEY?.trim() ||
        process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()

    if (!clientEmail || !privateKeyRaw) {
        throw new Error('Missing Drive credentials. Use --service-account-json, GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_DRIVE_CLIENT_EMAIL / GOOGLE_DRIVE_PRIVATE_KEY, or FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY.')
    }

    return {
        clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    }
}

function parseCsv(content: string) {
    const parsed = Papa.parse<StorageExportRow>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
    })

    if (parsed.errors.length > 0) {
        const details = parsed.errors.map((error) => error.message).join('; ')
        throw new Error(`Failed to parse CSV: ${details}`)
    }

    return parsed.data
}

function base64UrlEncode(input: string | Buffer) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

async function fetchDriveAccessToken(credentials: DriveCredentials) {
    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt = issuedAt + 3600

    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = base64UrlEncode(JSON.stringify({
        iss: credentials.clientEmail,
        scope: DRIVE_SCOPE,
        aud: 'https://oauth2.googleapis.com/token',
        iat: issuedAt,
        exp: expiresAt,
    }))

    const signer = createSign('RSA-SHA256')
    signer.update(`${header}.${payload}`)
    signer.end()

    const signature = signer.sign(credentials.privateKey)
    const assertion = `${header}.${payload}.${base64UrlEncode(signature)}`

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to fetch Drive access token (${response.status}): ${body}`)
    }

    const data = await response.json() as { access_token?: string }
    if (!data.access_token) {
        throw new Error('Google OAuth token response did not include access_token.')
    }

    return data.access_token
}

function inferMimeType(fileName: string, responseMimeType: string | null) {
    if (responseMimeType && responseMimeType !== 'application/octet-stream') {
        return responseMimeType
    }

    const extension = (fileName.split('.').pop() || '').toLowerCase()

    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg'
        case 'png':
            return 'image/png'
        case 'webp':
            return 'image/webp'
        case 'gif':
            return 'image/gif'
        case 'heic':
            return 'image/heic'
        case 'heif':
            return 'image/heif'
        case 'mp4':
            return 'video/mp4'
        case 'mov':
            return 'video/quicktime'
        default:
            return 'application/octet-stream'
    }
}

function buildMultipartBody(metadata: Record<string, unknown>, fileBuffer: Buffer, mimeType: string) {
    const boundary = `codex-${randomUUID()}`
    const metadataPart = Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        'utf8'
    )
    const mediaHeaderPart = Buffer.from(
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
        'utf8'
    )
    const closingPart = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')

    return {
        body: Buffer.concat([metadataPart, mediaHeaderPart, fileBuffer, closingPart]),
        contentType: `multipart/related; boundary=${boundary}`,
    }
}

async function uploadFileToDrive(accessToken: string, folderId: string, fileName: string, fileBuffer: Buffer, mimeType: string) {
    const { body, contentType } = buildMultipartBody(
        {
            name: fileName,
            parents: [folderId],
        },
        fileBuffer,
        mimeType
    )

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': contentType,
            'Content-Length': String(body.byteLength),
        },
        body,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Drive upload failed (${response.status}): ${errorText}`)
    }

    return await response.json() as DriveFileResponse
}

async function downloadSignedFile(url: string) {
    const response = await fetch(url)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Signed URL download failed (${response.status}): ${errorText}`)
    }

    const contentType = response.headers.get('content-type')
    const arrayBuffer = await response.arrayBuffer()

    return {
        fileBuffer: Buffer.from(arrayBuffer),
        contentType,
    }
}

async function runWithConcurrency<TInput, TOutput>(
    items: TInput[],
    concurrency: number,
    worker: (item: TInput, index: number) => Promise<TOutput>
) {
    const results = new Array<TOutput>(items.length)
    let nextIndex = 0

    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const currentIndex = nextIndex
            nextIndex += 1

            if (currentIndex >= items.length) {
                return
            }

            results[currentIndex] = await worker(items[currentIndex], currentIndex)
        }
    })

    await Promise.all(runners)
    return results
}

function sanitizeFileName(value: string, fallback: string) {
    const trimmed = value.trim()
    return trimmed ? trimmed : fallback
}

function buildResultsCsv(results: UploadResult[]) {
    return Papa.unparse(results.map((result) => ({
        submission_id: result.submissionId,
        export_file_name: result.exportFileName,
        drive_file_id: result.driveFileId,
        drive_file_name: result.driveFileName,
        drive_web_view_link: result.driveWebViewLink,
        drive_web_content_link: result.driveWebContentLink,
        source_signed_url: result.sourceSignedUrl,
        status: result.status,
        error: result.error,
    })))
}

function buildResultsPath(csvPath: string) {
    const directory = path.dirname(csvPath)
    const extension = path.extname(csvPath)
    const basename = path.basename(csvPath, extension)
    return path.join(directory, `${basename}.drive-upload-results.csv`)
}

async function main() {
    const options = parseArgs(process.argv.slice(2))
    const csvContent = await readFile(options.csvPath, 'utf8')
    const rows = parseCsv(csvContent)

    if (rows.length === 0) {
        throw new Error(`No rows found in CSV: ${options.csvPath}`)
    }

    const actionableRows = rows.filter((row) => row.signed_url?.trim())
    const skippedRows = rows.length - actionableRows.length

    console.log(`Loaded ${rows.length} CSV rows from ${options.csvPath}`)
    console.log(`Actionable rows with signed URLs: ${actionableRows.length}`)
    if (skippedRows > 0) {
        console.log(`Rows skipped immediately due to missing signed_url: ${skippedRows}`)
    }

    if (options.dryRun) {
        console.log('Dry run complete. No files were uploaded.')
        return
    }

    const credentials = await requireDriveCredentials(options.serviceAccountJsonPath)
    const accessToken = await fetchDriveAccessToken(credentials)
    const results = await runWithConcurrency(actionableRows, options.concurrency, async (row, index) => {
        const submissionId = row.submission_id?.trim() || `row-${index + 2}`
        const exportFileName = sanitizeFileName(
            row.export_file_name || '',
            `${submissionId}.${(row.image_path?.split('.').pop() || 'bin').toLowerCase()}`
        )
        const signedUrl = row.signed_url?.trim() || ''

        process.stdout.write(`Uploading ${index + 1}/${actionableRows.length}: ${exportFileName}\n`)

        try {
            const { fileBuffer, contentType } = await downloadSignedFile(signedUrl)
            const driveFile = await uploadFileToDrive(
                accessToken,
                options.folderId,
                exportFileName,
                fileBuffer,
                inferMimeType(exportFileName, contentType)
            )

            return {
                submissionId,
                exportFileName,
                driveFileId: driveFile.id || '',
                driveFileName: driveFile.name || exportFileName,
                driveWebViewLink: driveFile.webViewLink || '',
                driveWebContentLink: driveFile.webContentLink || '',
                sourceSignedUrl: signedUrl,
                status: 'UPLOADED',
                error: '',
            } satisfies UploadResult
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return {
                submissionId,
                exportFileName,
                driveFileId: '',
                driveFileName: '',
                driveWebViewLink: '',
                driveWebContentLink: '',
                sourceSignedUrl: signedUrl,
                status: 'FAILED',
                error: message,
            } satisfies UploadResult
        }
    })

    const missingSignedUrlResults: UploadResult[] = rows
        .filter((row) => !row.signed_url?.trim())
        .map((row, index) => ({
            submissionId: row.submission_id?.trim() || `skipped-row-${index + 2}`,
            exportFileName: sanitizeFileName(row.export_file_name || '', `skipped-row-${index + 2}`),
            driveFileId: '',
            driveFileName: '',
            driveWebViewLink: '',
            driveWebContentLink: '',
            sourceSignedUrl: '',
            status: 'SKIPPED',
            error: row.error?.trim() || 'Row did not include a signed_url value.',
        }))

    const allResults = [...results, ...missingSignedUrlResults]
    const resultsPath = buildResultsPath(options.csvPath)
    await writeFile(resultsPath, buildResultsCsv(allResults), 'utf8')

    const uploadedCount = allResults.filter((result) => result.status === 'UPLOADED').length
    const failedCount = allResults.filter((result) => result.status === 'FAILED').length
    const skippedCount = allResults.filter((result) => result.status === 'SKIPPED').length

    console.log('')
    console.log(`Uploaded: ${uploadedCount}`)
    console.log(`Failed: ${failedCount}`)
    console.log(`Skipped: ${skippedCount}`)
    console.log(`Results CSV: ${resultsPath}`)
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
