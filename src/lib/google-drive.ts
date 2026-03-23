import 'server-only'

import { createSign } from 'node:crypto'

export interface GoogleDriveMediaDestination {
    configured: boolean
    folderId: string | null
    folderUrl: string | null
    serviceAccountEmail: string | null
    credentialSource: 'firebase-admin' | 'google-drive' | null
    configurationError: string | null
}

interface GoogleDriveCredentials {
    projectId: string
    clientEmail: string
    privateKey: string
    source: 'firebase-admin' | 'google-drive'
}

interface GoogleOAuthTokenResponse {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
}

export interface GoogleDriveFolderSummary {
    id: string
    name: string
    webViewLink: string | null
}

export interface GoogleDriveFileSummary {
    id: string
    name: string
    appProperties?: Record<string, string>
    webViewLink?: string | null
    webContentLink?: string | null
}

interface GoogleDriveFileResponse {
    id: string
    name: string
    webViewLink?: string | null
    webContentLink?: string | null
}

interface GoogleDriveListFilesResponse {
    files?: GoogleDriveFileSummary[]
    nextPageToken?: string
}

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token'
let cachedAccessToken: { token: string; expiresAt: number } | null = null

function getEnvValue(key: string) {
    const value = process.env[key]?.trim()
    return value ? value : null
}

function resolveGoogleDriveCredentials(): GoogleDriveCredentials | null {
    const hasDedicatedDriveCredentials = Boolean(
        process.env.GOOGLE_DRIVE_PROJECT_ID ||
        process.env.GOOGLE_DRIVE_CLIENT_EMAIL ||
        process.env.GOOGLE_DRIVE_PRIVATE_KEY
    )

    if (hasDedicatedDriveCredentials) {
        const projectId = getEnvValue('GOOGLE_DRIVE_PROJECT_ID')
        const clientEmail = getEnvValue('GOOGLE_DRIVE_CLIENT_EMAIL')
        const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n') || null

        if (!projectId || !clientEmail || !privateKey) {
            return null
        }

        return {
            projectId,
            clientEmail,
            privateKey,
            source: 'google-drive',
        }
    }

    const projectId = getEnvValue('FIREBASE_ADMIN_PROJECT_ID')
    const clientEmail = getEnvValue('FIREBASE_ADMIN_CLIENT_EMAIL')
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') || null

    if (!projectId || !clientEmail || !privateKey) {
        return null
    }

    return {
        projectId,
        clientEmail,
        privateKey,
        source: 'firebase-admin',
    }
}

export function getGoogleDriveMediaDestination(): GoogleDriveMediaDestination {
    const folderId = getEnvValue('GOOGLE_DRIVE_MEDIA_FOLDER_ID')
    const credentials = resolveGoogleDriveCredentials()
    const hasDedicatedDriveCredentials = Boolean(
        process.env.GOOGLE_DRIVE_PROJECT_ID ||
        process.env.GOOGLE_DRIVE_CLIENT_EMAIL ||
        process.env.GOOGLE_DRIVE_PRIVATE_KEY
    )

    if (!folderId) {
        return {
            configured: false,
            folderId: null,
            folderUrl: null,
            serviceAccountEmail: credentials?.clientEmail || null,
            credentialSource: credentials?.source || null,
            configurationError: 'Set GOOGLE_DRIVE_MEDIA_FOLDER_ID to enable Google Drive sync.',
        }
    }

    if (!credentials) {
        return {
            configured: false,
            folderId,
            folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
            serviceAccountEmail: null,
            credentialSource: null,
            configurationError: hasDedicatedDriveCredentials
                ? 'Google Drive service account credentials are incomplete.'
                : 'Firebase Admin service account credentials are missing.',
        }
    }

    return {
        configured: true,
        folderId,
        folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
        serviceAccountEmail: credentials.clientEmail,
        credentialSource: credentials.source,
        configurationError: null,
    }
}

function encodeBase64Url(value: string | Buffer) {
    return Buffer.from(value)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

async function requestGoogleDriveAccessToken() {
    if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
        return cachedAccessToken.token
    }

    const credentials = resolveGoogleDriveCredentials()

    if (!credentials) {
        throw new Error('Google Drive credentials are not configured.')
    }

    const issuedAt = Math.floor(Date.now() / 1000)
    const expiresAt = issuedAt + 3600

    const jwtHeader = encodeBase64Url(JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
    }))

    const jwtPayload = encodeBase64Url(JSON.stringify({
        iss: credentials.clientEmail,
        scope: GOOGLE_DRIVE_SCOPE,
        aud: GOOGLE_TOKEN_AUDIENCE,
        exp: expiresAt,
        iat: issuedAt,
    }))

    const unsignedToken = `${jwtHeader}.${jwtPayload}`
    const signer = createSign('RSA-SHA256')
    signer.update(unsignedToken)
    signer.end()

    const signature = encodeBase64Url(signer.sign(credentials.privateKey))
    const assertion = `${unsignedToken}.${signature}`

    const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
        cache: 'no-store',
    })

    const payload = await response.json() as GoogleOAuthTokenResponse

    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description || payload.error || 'Failed to authenticate with Google Drive.')
    }

    cachedAccessToken = {
        token: payload.access_token,
        expiresAt: Date.now() + (payload.expires_in || 3600) * 1000,
    }

    return payload.access_token
}

async function googleDriveRequest<T>(path: string, init: RequestInit = {}) {
    const accessToken = await requestGoogleDriveAccessToken()
    const response = await fetch(`https://www.googleapis.com${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init.headers || {}),
        },
        cache: 'no-store',
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Google Drive request failed.')
    }

    if (response.status === 204) {
        return null as T
    }

    return await response.json() as T
}

export async function getGoogleDriveFolderSummary(folderId: string): Promise<GoogleDriveFolderSummary> {
    const params = new URLSearchParams({
        fields: 'id,name,webViewLink',
        supportsAllDrives: 'true',
    })

    const folder = await googleDriveRequest<GoogleDriveFolderSummary>(`/drive/v3/files/${folderId}?${params.toString()}`)

    return {
        id: folder.id,
        name: folder.name,
        webViewLink: folder.webViewLink || null,
    }
}

export async function listGoogleDriveFolderFiles(folderId: string): Promise<GoogleDriveFileSummary[]> {
    const files: GoogleDriveFileSummary[] = []
    let pageToken: string | undefined

    do {
        const params = new URLSearchParams({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken,files(id,name,appProperties,webViewLink,webContentLink)',
            includeItemsFromAllDrives: 'true',
            supportsAllDrives: 'true',
            pageSize: '1000',
        })

        if (pageToken) {
            params.set('pageToken', pageToken)
        }

        const response = await googleDriveRequest<GoogleDriveListFilesResponse>(`/drive/v3/files?${params.toString()}`)
        files.push(...(response.files || []))
        pageToken = response.nextPageToken
    } while (pageToken)

    return files
}

export async function updateGoogleDriveFileMetadata(
    fileId: string,
    metadata: Record<string, unknown>
): Promise<GoogleDriveFileSummary> {
    const params = new URLSearchParams({
        fields: 'id,name,appProperties,webViewLink,webContentLink',
        supportsAllDrives: 'true',
    })

    return await googleDriveRequest<GoogleDriveFileSummary>(`/drive/v3/files/${fileId}?${params.toString()}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
    })
}

export async function uploadGoogleDriveFile(input: {
    fileId?: string
    fileName: string
    folderId: string
    contentType: string
    bytes: Buffer
    metadata: Record<string, unknown>
}): Promise<GoogleDriveFileSummary> {
    const accessToken = await requestGoogleDriveAccessToken()
    const formData = new FormData()
    const metadata = input.fileId
        ? input.metadata
        : {
            ...input.metadata,
            parents: [input.folderId],
        }

    formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    )
    formData.append(
        'file',
        new Blob([new Uint8Array(input.bytes)], { type: input.contentType }),
        input.fileName
    )

    const params = new URLSearchParams({
        uploadType: 'multipart',
        supportsAllDrives: 'true',
        fields: 'id,name,webViewLink,webContentLink',
    })

    const target = input.fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${input.fileId}?${params.toString()}`
        : `https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`

    const response = await fetch(target, {
        method: input.fileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        cache: 'no-store',
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to upload file to Google Drive.')
    }

    const payload = await response.json() as GoogleDriveFileResponse

    return {
        id: payload.id,
        name: payload.name,
        webViewLink: payload.webViewLink || null,
        webContentLink: payload.webContentLink || null,
    }
}
