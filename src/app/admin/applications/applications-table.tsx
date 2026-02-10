'use client'

import { useState } from 'react'
import { AceApplication } from '@/types/index'
import { deleteAceApplication } from '@/lib/actions/ace-applications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Search,
    Trash2,
    Eye,
    Download,
    ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<string, string> = {
    FAMILY_HEAD: 'Family Head',
    ANH: 'Anh',
    CHI: 'Chị',
    CHANH: 'Chanh',
    EM: 'Em',
}

const ROLE_COLORS: Record<string, string> = {
    FAMILY_HEAD: 'bg-amber-100 text-amber-800',
    ANH: 'bg-blue-100 text-blue-800',
    CHI: 'bg-pink-100 text-pink-800',
    CHANH: 'bg-purple-100 text-purple-800',
    EM: 'bg-green-100 text-green-800',
}

export function ApplicationsTable({ applications }: { applications: AceApplication[] }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [viewing, setViewing] = useState<AceApplication | null>(null)

    const filtered = applications.filter((app) => {
        const matchesSearch =
            app.name.toLowerCase().includes(search.toLowerCase()) ||
            app.email.toLowerCase().includes(search.toLowerCase()) ||
            app.schoolYear.toLowerCase().includes(search.toLowerCase())
        const matchesRole = roleFilter === 'all' || app.role === roleFilter
        return matchesSearch && matchesRole
    })

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this application?')) return
        const result = await deleteAceApplication(id)
        if (result.success) {
            toast.success('Application deleted')
            router.refresh()
        } else {
            toast.error('Failed to delete application')
        }
    }

    const exportCSV = () => {
        const headers = [
            'Name', 'Pronouns', 'Email', 'Phone', 'Instagram',
            'University', 'Year', 'Majors/Minors', 'Campus', 'Role',
            'Hobbies', 'Music', 'Perfect Day', 'Dream Vacation',
            'Intro/Extro Scale', 'Reach Out Style',
            'Available for Reveal', 'Self Intro',
            'Submitted'
        ]

        const rows = filtered.map((app) => [
            app.name, app.pronouns, app.email, app.phone, app.instagram,
            app.university, app.schoolYear, app.majorsMinors, app.livesOnCampus, ROLE_LABELS[app.role],
            app.hobbies, app.musicTaste, app.perfectDay, app.dreamVacation,
            app.introExtroScale, app.reachOutStyle,
            app.availableForReveal, app.selfIntro,
            new Date(app.createdAt).toLocaleDateString()
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ace-applications-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded')
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5" />
                            Applications ({filtered.length})
                        </CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or year..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-1">
                            {['all', 'FAMILY_HEAD', 'ANH', 'CHI', 'CHANH', 'EM'].map((role) => (
                                <Button
                                    key={role}
                                    variant={roleFilter === role ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setRoleFilter(role)}
                                    className="text-xs"
                                >
                                    {role === 'all' ? 'All' : ROLE_LABELS[role]}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No applications found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((app) => (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-medium">{app.name}</TableCell>
                                            <TableCell className="text-sm">{app.email}</TableCell>
                                            <TableCell className="text-sm">{app.schoolYear}</TableCell>
                                            <TableCell>
                                                <Badge className={ROLE_COLORS[app.role] || ''} variant="secondary">
                                                    {ROLE_LABELS[app.role]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(app.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setViewing(app)}
                                                        title="View Application"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(app.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {viewing && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {viewing.name}
                                    <Badge className={ROLE_COLORS[viewing.role] || ''} variant="secondary">
                                        {ROLE_LABELS[viewing.role]}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription>
                                    Submitted {new Date(viewing.createdAt).toLocaleString()}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                {/* Contact */}
                                <Section title="Contact Information">
                                    <Field label="Pronouns" value={viewing.pronouns} />
                                    <Field label="Email" value={viewing.email} />
                                    <Field label="Phone" value={viewing.phone} />
                                    <Field label="Instagram" value={viewing.instagram} />
                                </Section>

                                {/* Academic */}
                                <Section title="Academic">
                                    <Field label="University" value={viewing.university} />
                                    <Field label="Year" value={viewing.schoolYear} />
                                    <Field label="Majors/Minors" value={viewing.majorsMinors} />
                                    <Field label="Campus" value={viewing.livesOnCampus} />
                                </Section>

                                {/* Role-specific */}
                                {viewing.role === 'FAMILY_HEAD' ? (
                                    <Section title="Family Head Questions">
                                        <Field label="Why Family Head?" value={viewing.familyHeadWhy} />
                                        <Field label="How will you help?" value={viewing.familyHeadHowHelp} />
                                        <Field label="Exclusions" value={viewing.familyHeadExclusions} />
                                        <Field label="Core Identities" value={viewing.familyHeadIdentities} />
                                        <Field label="Family Preferences" value={viewing.familyHeadFamilyPrefs} />
                                        <Field label="Concerns" value={viewing.familyHeadConcerns} />
                                    </Section>
                                ) : (
                                    <Section title="A.C.E. Questions">
                                        <Field label="Goals" value={viewing.goals} />
                                        <Field label="Willing Multiple" value={viewing.willingMultiple} />
                                        <Field label="Activities" value={viewing.preferredActivities?.join(', ')} />
                                        {viewing.preferredActivitiesOther && <Field label="Other Activities" value={viewing.preferredActivitiesOther} />}
                                        <Field label="Family Head Preference" value={viewing.familyHeadPreference} />
                                        <Field label="Pairing Preferences" value={viewing.pairingPreferences} />
                                        <Field label="Exclusions" value={viewing.pairingExclusions} />
                                        <Field label="Meet Frequency" value={viewing.meetFrequency} />
                                        <Field label="Other Commitments" value={viewing.otherCommitments} />
                                        <Field label="Core Identities" value={viewing.coreIdentities} />
                                    </Section>
                                )}

                                {/* Personal */}
                                <Section title="Personal">
                                    <Field label="Hobbies" value={viewing.hobbies} />
                                    <Field label="Music" value={viewing.musicTaste} />
                                    <Field label="Perfect Day" value={viewing.perfectDay} />
                                    <Field label="Dream Vacation" value={viewing.dreamVacation} />
                                    <Field label="Intro/Extro (1-10)" value={String(viewing.introExtroScale)} />
                                    <Field label="Reach Out Style" value={viewing.reachOutStyle} />
                                    {viewing.additionalInfo && <Field label="Additional Info" value={viewing.additionalInfo} />}
                                </Section>

                                {/* Final */}
                                <Section title="Final">
                                    <Field label="Available for Reveal" value={viewing.availableForReveal} />
                                    {viewing.finalComments && <Field label="Comments" value={viewing.finalComments} />}
                                    <Field label="Self Intro" value={viewing.selfIntro} />
                                </Section>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="font-semibold text-sm text-primary mb-2 uppercase tracking-wide">{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

function Field({ label, value }: { label: string; value?: string }) {
    return (
        <div>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <p className="text-sm">{value || '—'}</p>
        </div>
    )
}
