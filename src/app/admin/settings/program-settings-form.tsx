'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateProgramSettings } from '@/lib/actions/program-settings'
import { calculateProgramWeek, type CurrentProgramWeek } from '@/lib/program-settings'
import type { ProgramSettings } from '@/types'

interface ProgramSettingsFormProps {
    settings: ProgramSettings
    currentWeek: CurrentProgramWeek
}

export default function ProgramSettingsForm({ settings, currentWeek }: ProgramSettingsFormProps) {
    const router = useRouter()
    const [programStartDate, setProgramStartDate] = useState(settings.programStartDate)
    const [weekCountStartDate, setWeekCountStartDate] = useState(settings.weekCountStartDate)
    const [isSaving, setIsSaving] = useState(false)

    const previewWeek = useMemo(
        () => calculateProgramWeek(weekCountStartDate),
        [weekCountStartDate]
    )

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSaving(true)

        try {
            const result = await updateProgramSettings({
                programStartDate,
                weekCountStartDate,
            })

            if (!result.success) {
                toast.error(result.error || 'Failed to update program settings.')
                return
            }

            toast.success('Program settings updated.')
            router.refresh()
        } catch {
            toast.error('Failed to update program settings.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        Schedule Controls
                    </CardTitle>
                    <CardDescription>
                        These dates control the ACE program schedule shown across the dashboard, submission flow, and admin reporting.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="programStartDate">Program Start Date</Label>
                                <Input
                                    id="programStartDate"
                                    type="date"
                                    value={programStartDate}
                                    onChange={(event) => setProgramStartDate(event.target.value)}
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    Administrative reference for when the ACE program begins.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weekCountStartDate">Week Count Start Date</Label>
                                <Input
                                    id="weekCountStartDate"
                                    type="date"
                                    value={weekCountStartDate}
                                    onChange={(event) => setWeekCountStartDate(event.target.value)}
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    Week 1 starts on this date. Every 7 days advances the week number by 1.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-muted-foreground mb-1">Current saved week</div>
                                <div className="text-2xl font-bold">
                                    {currentWeek.weekNumber > 0 ? `Week ${currentWeek.weekNumber}` : 'Not started'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Based on the currently saved settings.
                                </div>
                            </div>

                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-muted-foreground mb-1">Preview from form values</div>
                                <div className="text-2xl font-bold">
                                    {previewWeek.weekNumber > 0 ? `Week ${previewWeek.weekNumber}` : 'Not started'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    This preview updates before you save changes.
                                </div>
                            </div>
                        </div>

                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Program Settings
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
