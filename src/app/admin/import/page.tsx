'use client'

import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin'
import { Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Download,
    Loader2,
    Eye,
} from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
    commitApplicationsImport,
    commitPairingsImport,
    commitUsersImport,
    previewApplicationsImport,
    previewPairingsImport,
    previewUsersImport,
    ImportConflictStrategy,
    ImportCsvRow,
    ImportPreview,
    ImportStats
} from '@/lib/actions/admin'
import {
    exportLeaderboardToCSV,
    exportPairingsToCSV,
    exportUsersToCSV,
    type CSVExportOptions
} from '@/lib/actions/csv'
import { getErrorMessage } from '@/lib/errors'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getFamilies } from '@/lib/actions/families'
import { getCsvActivityHistory } from '@/lib/actions/audit'
import type { AuditLogDoc } from '@/types/firestore'

const USER_TEMPLATE = 'email,name,role,family_id,uid\nmentor@example.com,Ace Mentor,MENTOR,,\nmentee@example.com,Ace Mentee,MENTEE,,'
const PAIRING_TEMPLATE = 'mentor_email,mentee1_email,mentee2_email,family_id\nmentor@example.com,mentee1@example.com,mentee2@example.com,family_123'
const APPLICATION_TEMPLATE = 'name,pronouns,email,phone,instagram,university,schoolyear,majorsminors,livesoncampus,role,hobbies,musictaste,perfectday,dreamvacation,introextroscale,reachoutstyle,availableforreveal,selfintro,submitted\nAce Applicant,they/them,applicant@example.com,555-123-4567,@ace,University of Minnesota - Twin Cities,2nd year,Computer Science,Yes,ANH,Studying,K-pop,Brunch and a walk,Tokyo,7,Text me first,Yes,Hello world,2026-03-20'

type CsvHistoryItem = Omit<AuditLogDoc, 'timestamp'> & {
    timestamp: Date
}

type FamilyOption = {
    id: string
    name: string
}

export default function ImportPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isExporting, setIsExporting] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<ImportCsvRow[] | null>(null)
    const [importType, setImportType] = useState<'users' | 'pairings' | 'applications'>('users')
    const [preview, setPreview] = useState<ImportPreview | null>(null)
    const [stats, setStats] = useState<ImportStats | null>(null)
    const [strategy, setStrategy] = useState<ImportConflictStrategy>('skip')
    const [families, setFamilies] = useState<FamilyOption[]>([])
    const [history, setHistory] = useState<CsvHistoryItem[]>([])
    const [exportFamilyId, setExportFamilyId] = useState('all')
    const [exportSeasonYear, setExportSeasonYear] = useState('')
    const [exportWeekNumber, setExportWeekNumber] = useState('')

    useEffect(() => {
        let isActive = true

        async function loadMetadata() {
            try {
                const [familyResults, historyResults] = await Promise.all([
                    getFamilies(true),
                    getCsvActivityHistory(20),
                ])

                if (!isActive) {
                    return
                }

                setFamilies(familyResults.map(family => ({ id: family.id, name: family.name })))
                setHistory(historyResults.map(log => ({
                    ...log,
                    timestamp: log.timestamp.toDate(),
                })))
            } catch (error) {
                console.error('Failed to load CSV metadata:', error)
            }
        }

        loadMetadata()

        return () => {
            isActive = false
        }
    }, [])

    const downloadTextFile = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
    }

    const resetState = () => {
        setFileName(null)
        setParsedData(null)
        setPreview(null)
        setStats(null)
        setStrategy('skip')
    }

    const buildIssueReport = (statuses: Array<'conflict' | 'invalid'>) => {
        if (!preview) {
            return ''
        }

        const rows = preview.rows.filter(row => statuses.includes(row.status as 'conflict' | 'invalid'))
        return [
            'row_number,key,status,action,messages',
            ...rows.map(row => [
                row.rowNumber,
                row.key,
                row.status,
                row.action,
                row.messages.join(' | '),
            ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')),
        ].join('\n')
    }

    const getExportOptions = (): CSVExportOptions => ({
        familyId: exportFamilyId === 'all' ? undefined : exportFamilyId,
        seasonYear: exportSeasonYear ? Number(exportSeasonYear) : undefined,
        weekNumber: exportWeekNumber ? Number(exportWeekNumber) : undefined,
    })

    const refreshHistory = async () => {
        try {
            const historyResults = await getCsvActivityHistory(20)
            setHistory(historyResults.map(log => ({
                ...log,
                timestamp: log.timestamp.toDate(),
            })))
        } catch (error) {
            console.error('Failed to refresh CSV history:', error)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a valid CSV file')
            return
        }

        setFileName(file.name)
        setStats(null)
        setPreview(null)
        setStrategy('skip')

        Papa.parse<ImportCsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                setParsedData(results.data)
                if (results.data.length === 0) {
                    toast.error('The CSV did not contain any data rows')
                    return
                }

                // Heuristic to detect type based on columns
                const columns = results.meta.fields || []
                const detectedType = columns.includes('mentor_email')
                    ? 'pairings'
                    : columns.includes('pronouns') || columns.includes('schoolyear') || columns.includes('introextroscale')
                        ? 'applications'
                        : 'users'
                setImportType(detectedType)

                setIsLoading(true)
                try {
                    const previewResult = detectedType === 'users'
                        ? await previewUsersImport(results.data)
                        : detectedType === 'pairings'
                            ? await previewPairingsImport(results.data)
                            : await previewApplicationsImport(results.data)

                    setPreview(previewResult)
                    toast.success(`Previewed ${previewResult.total} rows`)
                } catch (error: unknown) {
                    console.error('CSV preview error:', error)
                    toast.error(getErrorMessage(error, 'Failed to preview CSV import'))
                } finally {
                    setIsLoading(false)
                }
            },
            error: (err) => {
                console.error('CSV Parse Error:', err)
                toast.error('Failed to parse CSV file')
            }
        })
    }

    const handleImport = async () => {
        if (!parsedData || !preview) return

        setIsLoading(true)
        try {
            let result: ImportStats
            if (importType === 'users') {
                result = await commitUsersImport(parsedData, strategy)
            } else if (importType === 'pairings') {
                result = await commitPairingsImport(parsedData, strategy)
            } else {
                result = await commitApplicationsImport(parsedData, strategy)
            }

            setStats(result)
            await refreshHistory()
            if (result.failed === 0 && result.success > 0) {
                toast.success(`Imported ${result.success} records`)
            } else if (result.success > 0 || result.skipped > 0) {
                toast.warning(`Imported ${result.success}, skipped ${result.skipped}, failed ${result.failed}`)
            } else {
                toast.error(`Import failed. ${result.failed} rows could not be processed`)
            }
        } catch (error: unknown) {
            console.error('Import error:', error)
            toast.error(getErrorMessage(error, 'An unexpected error occurred during import'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = async (type: 'users' | 'pairings' | 'leaderboard') => {
        setIsExporting(type)
        try {
            const result = type === 'users'
                ? await exportUsersToCSV(getExportOptions())
                : type === 'pairings'
                    ? await exportPairingsToCSV(getExportOptions())
                    : await exportLeaderboardToCSV(getExportOptions())

            if (!result.success || !result.data) {
                toast.error(result.error || `Failed to export ${type} CSV`)
                return
            }

            downloadTextFile(result.data, `ace-${type}-${new Date().toISOString().slice(0, 10)}.csv`)
            toast.success(`${type[0].toUpperCase()}${type.slice(1)} CSV downloaded`)
            await refreshHistory()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, `Failed to export ${type} CSV`))
        } finally {
            setIsExporting(null)
        }
    }

    return (
        <>
            <AdminHeader title="Import Data" />

            <main className="p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Instructions */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-primary" />
                                CSV Import Guide
                            </CardTitle>
                            <CardDescription>
                                Import users, pairings, and ACE applications in bulk using a CSV file
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-muted/50 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                                    <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-2 text-white font-bold">
                                        1
                                    </div>
                                    <h4 className="font-medium mb-1 text-sm">Download Template</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        get format
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                                    <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-2 text-white font-bold">
                                        2
                                    </div>
                                    <h4 className="font-medium mb-1 text-sm">Fill In Data</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        add records
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                                    <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-2 text-white font-bold">
                                        3
                                    </div>
                                    <h4 className="font-medium mb-1 text-sm">Upload & Preview</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        complete import
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-2">
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => downloadTextFile(USER_TEMPLATE, 'ace-users-template.csv')}
                                >
                                    <Download className="w-4 h-4 text-primary" />
                                    Users Template
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => downloadTextFile(PAIRING_TEMPLATE, 'ace-pairings-template.csv')}
                                >
                                    <Download className="w-4 h-4 text-[#E60012]" />
                                    Pairings Template
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => downloadTextFile(APPLICATION_TEMPLATE, 'ace-applications-template.csv')}
                                >
                                    <Download className="w-4 h-4 text-emerald-600" />
                                    Applications Template
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="w-5 h-5 text-primary" />
                                CSV Export
                            </CardTitle>
                            <CardDescription>
                                Download filtered users, pairings, or leaderboard data as CSV.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Family</p>
                                    <Select value={exportFamilyId} onValueChange={setExportFamilyId}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All families</SelectItem>
                                            {families.map(family => (
                                                <SelectItem key={family.id} value={family.id}>
                                                    {family.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Season Year</p>
                                    <Input
                                        inputMode="numeric"
                                        placeholder="2026"
                                        value={exportSeasonYear}
                                        onChange={(e) => setExportSeasonYear(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Week Number</p>
                                    <Input
                                        inputMode="numeric"
                                        placeholder="4"
                                        value={exportWeekNumber}
                                        onChange={(e) => setExportWeekNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                `family` applies to users, pairings, and leaderboard exports. `season` and `week` apply to leaderboard exports and are computed from approved submissions.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handleExport('users')}
                                    disabled={isExporting !== null}
                                >
                                    {isExporting === 'users' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Export Users
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handleExport('pairings')}
                                    disabled={isExporting !== null}
                                >
                                    {isExporting === 'pairings' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Export Pairings
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => handleExport('leaderboard')}
                                    disabled={isExporting !== null}
                                >
                                    {isExporting === 'leaderboard' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Export Leaderboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>CSV Activity Archive</CardTitle>
                            <CardDescription>
                                Recent CSV imports and exports recorded for admins.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Actor</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                                            <TableCell>{log.actorEmail || 'Unknown'}</TableCell>
                                            <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                                            <TableCell>{log.targetType}</TableCell>
                                            <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
                                                {log.details}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                                No CSV import/export activity yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Upload Area */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle>Upload CSV File</CardTitle>
                            <CardDescription>
                                Select a CSV file to bulk {importType} data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div
                                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${fileName ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/50'
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Choose CSV file"
                                />
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${fileName ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {fileName ? <FileSpreadsheet className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                                </div>
                                {fileName ? (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-primary">{fileName}</h3>
                                        <div className="flex items-center justify-center gap-2">
                                            <Badge variant="outline" className="bg-white/50 dark:bg-black/20">
                                                {parsedData?.length || 0} rows found
                                            </Badge>
                                            <Badge className="doraemon-gradient text-white border-none">
                                                Detected: {importType === 'users' ? 'Users' : importType === 'pairings' ? 'Pairings' : 'Applications'}
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="font-semibold mb-1">Select your CSV file</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Click or drag & drop to start parsing
                                        </p>
                                        <Button variant="outline" size="sm" className="pointer-events-none">Choose File</Button>
                                    </>
                                )}
                            </div>

                            {preview && (
                                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-primary" />
                                                Server Preview
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Validation, duplicate detection, and idempotency check completed before commit.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline">Valid: {preview.valid}</Badge>
                                            <Badge variant="outline">Conflicts: {preview.conflicts}</Badge>
                                            <Badge variant="outline">Invalid: {preview.invalid}</Badge>
                                        </div>
                                    </div>

                                    {preview.missingColumns.length > 0 && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                                            Missing columns: {preview.missingColumns.join(', ')}
                                        </div>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                                        <div className="rounded-lg border bg-background">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Row</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Action</TableHead>
                                                        <TableHead>Key</TableHead>
                                                        <TableHead>Messages</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {preview.rows.slice(0, 10).map((row) => (
                                                        <TableRow key={`${row.rowNumber}-${row.key}`}>
                                                            <TableCell>{row.rowNumber}</TableCell>
                                                            <TableCell className="capitalize">{row.status}</TableCell>
                                                            <TableCell className="capitalize">{row.action}</TableCell>
                                                            <TableCell>{row.key}</TableCell>
                                                            <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
                                                                {row.messages.length > 0 ? row.messages.join('; ') : 'Ready to import'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="space-y-4 rounded-lg border bg-background p-4">
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Conflict strategy</p>
                                                <Select value={strategy} onValueChange={(value: ImportConflictStrategy) => setStrategy(value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="skip">Skip existing records</SelectItem>
                                                        <SelectItem value="merge">Merge conservatively</SelectItem>
                                                        <SelectItem value="replace">Replace existing values</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    `skip` is safest, `merge` keeps existing records and applies additive updates, `replace` overwrites imported fields.
                                                </p>
                                            </div>

                                            {preview.errorReport.trim() !== 'row_number,key,status,action,messages' && (
                                                <div className="space-y-2">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2"
                                                        onClick={() => downloadTextFile(preview.errorReport, `${importType}-preview-issues.csv`)}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download All Issues
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2"
                                                        onClick={() => downloadTextFile(buildIssueReport(['conflict']), `${importType}-preview-conflicts.csv`)}
                                                        disabled={!preview.rows.some(row => row.status === 'conflict')}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Export Conflicts Only
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2"
                                                        onClick={() => downloadTextFile(buildIssueReport(['invalid']), `${importType}-preview-errors.csv`)}
                                                        disabled={!preview.rows.some(row => row.status === 'invalid')}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Export Errors Only
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {fileName && parsedData && preview && (
                                <div className="flex gap-3 justify-end pt-4">
                                    <Button
                                        variant="ghost"
                                        onClick={resetState}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="doraemon-gradient text-white gap-2"
                                        onClick={handleImport}
                                        disabled={isLoading || preview.processable === 0}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Confirm & Import
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {stats && (
                                <div className={`p-4 rounded-lg border ${stats.failed === 0 ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {stats.failed === 0 ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="w-full">
                                            <p className={`font-semibold ${stats.failed === 0 ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'} mb-1`}>
                                                Import Complete
                                            </p>
                                            <div className="flex flex-wrap gap-4 text-sm mb-3">
                                                <span>Total: <strong>{stats.total}</strong></span>
                                                <span className="text-green-700 dark:text-green-300">Success: <strong>{stats.success}</strong></span>
                                                <span>Created: <strong>{stats.created}</strong></span>
                                                <span>Updated: <strong>{stats.updated}</strong></span>
                                                <span>Skipped: <strong>{stats.skipped}</strong></span>
                                                <span className={stats.failed > 0 ? 'text-red-600' : ''}>Failed: <strong>{stats.failed}</strong></span>
                                            </div>

                                            {stats.errors.length > 0 && (
                                                <div className="mt-2 p-3 bg-white/50 dark:bg-black/20 rounded border border-inherit max-h-40 overflow-y-auto text-xs font-mono space-y-1">
                                                    {stats.errors.map((err, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <span className="text-red-500">•</span>
                                                            <span>{err}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {stats.errorReport.trim() !== 'row_number,key,status,action,messages' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-3 gap-2"
                                                    onClick={() => downloadTextFile(stats.errorReport, `${importType}-import-errors.csv`)}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download Final Error Report
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                        <p className="font-medium text-foreground mb-1">Important:</p>
                                        <ul className="space-y-1">
                                            <li>• The upload is validated server-side before any write happens.</li>
                                            <li>• For pairings, mentor and mentee emails <strong>must</strong> already exist and map to the expected roles.</li>
                                            <li>• Duplicate rows inside the same CSV are blocked so the import stays idempotent.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Schema Reference */}
                    <Card className="mt-8 border-none bg-transparent shadow-none">
                        <CardHeader className="px-0">
                            <CardTitle className="text-lg">Expected CSV Columns</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-card doraemon-shadow rounded-xl">
                                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        Users Import
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['email', 'name', 'role'].map(c => <Badge key={c} variant="outline" className="border-primary/30">{c}*</Badge>)}
                                        <Badge variant="secondary" className="bg-muted">family_id</Badge>
                                        <Badge variant="secondary" className="bg-muted">uid</Badge>
                                    </div>
                                </div>
                                <div className="p-4 bg-card doraemon-shadow rounded-xl">
                                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#E60012]" />
                                        Pairings Import
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['mentor_email', 'mentee1_email'].map(c => <Badge key={c} variant="outline" className="border-[#E60012]/30">{c}*</Badge>)}
                                        <Badge variant="secondary" className="bg-muted">mentee2_email</Badge>
                                        <Badge variant="secondary" className="bg-muted">family_id</Badge>
                                    </div>
                                </div>
                                <div className="p-4 bg-card doraemon-shadow rounded-xl md:col-span-2">
                                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                                        Applications Import
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['name', 'email', 'phone', 'role'].map(c => <Badge key={c} variant="outline" className="border-emerald-600/30">{c}*</Badge>)}
                                        {['pronouns', 'instagram', 'schoolyear', 'introextroscale', 'submitted'].map(c => <Badge key={c} variant="secondary" className="bg-muted">{c}</Badge>)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </>
    )
}
