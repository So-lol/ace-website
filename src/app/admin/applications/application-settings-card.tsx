'use client'

import { useState } from 'react'
import { updateAceApplicationSettings } from '@/lib/actions/ace-applications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Settings2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ApplicationSettingsCardProps {
    isOpen: boolean
    deadlineAtIso: string | null
    revealAtIso: string | null
    updatedAtIso: string | null
}

function toLocalISOString(value: string | null) {
    if (!value) return ''

    const date = new Date(value)
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

export function ApplicationSettingsCard({
    isOpen,
    deadlineAtIso,
    revealAtIso,
    updatedAtIso,
}: ApplicationSettingsCardProps) {
    const router = useRouter()
    const [applicationsOpen, setApplicationsOpen] = useState(isOpen)
    const [deadlineAt, setDeadlineAt] = useState(toLocalISOString(deadlineAtIso))
    const [revealAt, setRevealAt] = useState(toLocalISOString(revealAtIso))
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)

        try {
            const result = await updateAceApplicationSettings({
                isOpen: applicationsOpen,
                deadlineAtIso: deadlineAt ? new Date(deadlineAt).toISOString() : null,
                revealAtIso: revealAt ? new Date(revealAt).toISOString() : null,
            })

            if (result.success) {
                toast.success('Application settings updated')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update application settings')
            }
        } catch {
            toast.error('Failed to update application settings')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    Application Settings
                </CardTitle>
                <CardDescription>
                    Only admins can open or close ACE applications and adjust key dates.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="font-medium">Applications are currently {applicationsOpen ? 'open' : 'closed'}</div>
                        <p className="text-sm text-muted-foreground">
                            Closing applications blocks new submissions immediately, including direct server-action submits.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant={applicationsOpen ? 'default' : 'secondary'}>
                            {applicationsOpen ? 'Open' : 'Closed'}
                        </Badge>
                        <Switch checked={applicationsOpen} onCheckedChange={setApplicationsOpen} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="deadlineAt">Application Deadline</Label>
                        <Input
                            id="deadlineAt"
                            type="datetime-local"
                            value={deadlineAt}
                            onChange={(e) => setDeadlineAt(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            This appears on the apply page and closed state.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="revealAt">Reveal Date</Label>
                        <Input
                            id="revealAt"
                            type="datetime-local"
                            value={revealAt}
                            onChange={(e) => setRevealAt(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            This appears after submission and for users who already applied.
                        </p>
                    </div>
                </div>

                {updatedAtIso && (
                    <p className="text-xs text-muted-foreground">
                        Last updated {new Date(updatedAtIso).toLocaleString()}
                    </p>
                )}

                <Button onClick={handleSave} disabled={isSaving} className="doraemon-gradient text-white">
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Application Settings
                </Button>
            </CardContent>
        </Card>
    )
}
