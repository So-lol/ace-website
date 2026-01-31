import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin'
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
    Download
} from 'lucide-react'

export const metadata: Metadata = {
    title: 'Import Data',
    description: 'Import users, families, and pairings from CSV',
}

export default function ImportPage() {
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
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-2 text-white font-bold">
                                        1
                                    </div>
                                    <h4 className="font-medium mb-1">Download Template</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Get our CSV template with required columns
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-2 text-white font-bold">
                                        2
                                    </div>
                                    <h4 className="font-medium mb-1">Fill In Data</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Add user/family data following the template format
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <div className="w-10 h-10 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-2 text-white font-bold">
                                        3
                                    </div>
                                    <h4 className="font-medium mb-1">Upload & Preview</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Review changes before committing
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" className="gap-2">
                                    <Download className="w-4 h-4" />
                                    Download Users Template
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    <Download className="w-4 h-4" />
                                    Download Families Template
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upload Area */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload CSV File</CardTitle>
                            <CardDescription>
                                Drag and drop your CSV file or click to browse
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed rounded-xl p-12 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold mb-1">Drop your CSV file here</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    or click to browse
                                </p>
                                <Button variant="outline">Select File</Button>
                            </div>

                            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                                            Before importing:
                                        </p>
                                        <ul className="text-amber-700 dark:text-amber-300 space-y-1">
                                            <li>• Ensure emails are unique and valid</li>
                                            <li>• Family names must not already exist</li>
                                            <li>• Mentor emails must already be in the system for pairing imports</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Expected Columns */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Expected CSV Columns</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Users Import</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">email *</Badge>
                                        <Badge variant="outline">name *</Badge>
                                        <Badge variant="outline">role *</Badge>
                                        <Badge variant="secondary">family_name</Badge>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Pairings Import</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">mentor_email *</Badge>
                                        <Badge variant="outline">mentee1_email *</Badge>
                                        <Badge variant="secondary">mentee2_email</Badge>
                                        <Badge variant="outline">family_name *</Badge>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    * Required fields. Optional fields shown in gray.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    )
}
