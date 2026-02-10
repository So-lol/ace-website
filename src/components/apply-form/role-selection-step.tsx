import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import { FormData } from './types'

interface RoleSelectionStepProps {
    formData: FormData
    update: (field: keyof FormData, value: any) => void
}

export function RoleSelectionStep({ formData, update }: RoleSelectionStepProps) {
    const roles = [
        {
            value: 'FAMILY_HEAD',
            label: 'Family Head 🏠',
            desc: 'Coordinate hangouts for your family. Low-commitment role ideal for those who want to meet lots of people.'
        },
        {
            value: 'ANH',
            label: 'Anh (Older Brother)',
            desc: 'Be a mentor and guide a younger sibling through their university experience.'
        },
        {
            value: 'CHI',
            label: 'Chị (Older Sister)',
            desc: 'Be a mentor and guide a younger sibling through their university experience.'
        },
        {
            value: 'CHANH',
            label: 'Chanh (Gender neutral older sibling)',
            desc: 'Be a mentor and guide a younger sibling through their university experience.'
        },
        {
            value: 'EM',
            label: 'Em (Younger Sibling)',
            desc: 'Be paired with a mentor who will help you navigate university life. Required for PSEO & 1st years.'
        },
    ] as const

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-primary" />
                    ✨ A.C.E. Role Selection
                </h2>
                <p className="text-sm text-muted-foreground">
                    Select from Anh, Chị/Chanh, Em, or Family Head! PSEO and 1st years are required to choose Em.
                </p>
            </div>
            <div className="grid gap-3">
                {roles.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => update('role', option.value)}
                        className={`
                            text-left p-4 rounded-lg border-2 transition-all duration-200
                            ${formData.role === option.value
                                ? 'border-primary bg-primary/5 doraemon-shadow'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            }
                        `}
                    >
                        <div className="font-semibold mb-1">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </button>
                ))}
            </div>

            {/* Family Head info panel */}
            {formData.role === 'FAMILY_HEAD' && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">🏠 About Family Heads</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                        <p>The Family Head is the core part of every family. Responsibilities include:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Reach out to bigs to check how A.C.E. month is going</li>
                            <li>Send pre-made announcements each week</li>
                            <li>Help schedule hangouts and start communication</li>
                            <li>Communicate any concerns to A.C.E. coordinators</li>
                        </ul>
                        <p className="font-medium text-foreground">
                            Perks: Free discount card, skip-the-line food vouchers, double-portion food vouchers at VSAM events!
                        </p>
                        <p>Questions? Contact Tri Nguyen at <a href="mailto:nguy5683@umn.edu" className="text-primary underline">nguy5683@umn.edu</a></p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
