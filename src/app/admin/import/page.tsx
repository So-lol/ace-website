'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/admin'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FileUp,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Download,
    Loader2,
    XCircle
} from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { importUsers, importPairings, ImportStats } from '@/lib/actions/admin'

export default function ImportPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [fileName, setFileName] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<any[] | null>(null)
    const [importType, setImportType] = useState<'users' | 'pairings'>('users')
    const [stats, setStats] = useState<ImportStats | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a valid CSV file')
            return
        }

        setFileName(file.name)
        setStats(null)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setParsedData(results.data)
                toast.success(`Parsed ${results.data.length} rows successfully`)

                // Heuristic to detect type based on columns
                const columns = results.meta.fields || []
                if (columns.includes('mentor_email')) {
                    setImportType('pairings')
                } else {
                    setImportType('users')
                }
            },
            error: (err) => {
                console.error('CSV Parse Error:', err)
                toast.error('Failed to parse CSV file')
            }
        })
    }

    const handleImport = async () => {
        if (!parsedData) return

        setIsLoading(true)
        try {
            let result: ImportStats
            if (importType === 'users') {
                result = await importUsers(parsedData)
            } else {
                result = await importPairings(parsedData)
            }

            setStats(result)
            if (result.failed === 0) {
                toast.success(`Successfully imported ${result.success} records!`)
            } else if (result.success > 0) {
                toast.warning(`Imported ${result.success} records, but ${result.failed} failed.`)
            } else {
                toast.error(`Import failed. ${result.failed} records could not be processed.`)
            }
        } catch (err: any) {
            console.error('Import error:', err)
            toast.error(err.message || 'An unexpected error occurred during import')
        } finally {
            setIsLoading(false)
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
                                Import users, families, and pairings in bulk using a CSV file
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
                                <Button variant="outline" className="gap-2" onClick={() => toast.info('Template download coming soon!')}>
                                    <Download className="w-4 h-4 text-primary" />
                                    Users Template
                                </Button>
                                <Button variant="outline" className="gap-2" onClick={() => toast.info('Template download coming soon!')}>
                                    <Download className="w-4 h-4 text-[#E60012]" />
                                    Pairings Template
                                </Button>
                            </div>
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
                                                Detected: {importType === 'users' ? 'Users' : 'Pairings'}
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

                            {fileName && parsedData && (
                                <div className="flex gap-3 justify-end pt-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setFileName(null)
                                            setParsedData(null)
                                            setStats(null)
                                        }}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="doraemon-gradient text-white gap-2"
                                        onClick={handleImport}
                                        disabled={isLoading}
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
                                            <div className="flex gap-4 text-sm mb-3">
                                                <span>Total: <strong>{stats.total}</strong></span>
                                                <span className="text-green-700 dark:text-green-300">Success: <strong>{stats.success}</strong></span>
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
                                            <li>• Ensure column names exactly match the expected schema below.</li>
                                            <li>• For pairings, the mentor and mentee emails <strong>must</strong> already exist in the system.</li>
                                            <li>• Duplicates with existing IDs/Emails will be updated (merged).</li>
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
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </>
    )
}

