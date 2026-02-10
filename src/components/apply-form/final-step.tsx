import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ClipboardList } from 'lucide-react'
import { FormData } from './types'

interface FinalStepProps {
    formData: FormData
    update: (field: keyof FormData, value: any) => void
}

export function FinalStep({ formData, update }: FinalStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    📋 Final Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                    Almost there! Just a few more details before you submit.
                </p>
            </div>
            <div className="space-y-2">
                <Label>Are you available for the reveal event on Friday, Oct 24th? *</Label>
                <div className="flex gap-4">
                    {['Yes', 'No', 'Maybe'].map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => update('availableForReveal', opt)}
                            className={`
                                flex-1 py-3 rounded-md border-2 transition-all duration-200
                                ${formData.availableForReveal === opt
                                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }
                            `}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label>Anything else you&apos;d like to share or ask? Any concerns?</Label>
                <Textarea
                    value={formData.finalComments}
                    onChange={(e) => update('finalComments', e.target.value)}
                    placeholder="We're here to help!"
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>A short self-intro (2-4 sentences). *</Label>
                <Textarea
                    value={formData.selfIntro}
                    onChange={(e) => update('selfIntro', e.target.value)}
                    placeholder="This will be shared with your pairing/family head later!"
                    rows={3}
                />
            </div>
        </div>
    )
}
