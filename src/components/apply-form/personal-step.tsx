import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Heart } from 'lucide-react'
import { FormData } from './types'

interface PersonalStepProps {
    formData: FormData
    update: (field: keyof FormData, value: any) => void
}

export function PersonalStep({ formData, update }: PersonalStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <Heart className="w-5 h-5 text-[#E60012]" />
                    💯 Personal Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                    The more intentional your answers are, the better A.C.E. pairing and experience you will have!
                </p>
            </div>
            <div className="space-y-2">
                <Label>What are your hobbies or interests? *</Label>
                <Textarea
                    value={formData.hobbies}
                    onChange={(e) => update('hobbies', e.target.value)}
                    placeholder="Try to be specific or list as many as possible!"
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>What is your favorite music genre/artist/song? *</Label>
                <Textarea
                    value={formData.musicTaste}
                    onChange={(e) => update('musicTaste', e.target.value)}
                    placeholder="Ex: Vpop, Rap, Alternative Rock, Indie, R&B"
                    rows={2}
                />
            </div>
            <div className="space-y-2">
                <Label>What would constitute a &quot;perfect&quot; day for you? *</Label>
                <Textarea
                    value={formData.perfectDay}
                    onChange={(e) => update('perfectDay', e.target.value)}
                    placeholder="Ex: Sleeping in, dedicating my day to a hobby, hanging out with friends..."
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>What is your dream vacation and why?</Label>
                <Textarea
                    value={formData.dreamVacation}
                    onChange={(e) => update('dreamVacation', e.target.value)}
                    placeholder="Ex: Iceland for nature, Korea for K-pop, Japan for anime..."
                    rows={2}
                />
            </div>
            <div className="space-y-3">
                <Label>How introverted/extroverted are you? (1-10) *</Label>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Very Introverted</span>
                    <div className="flex-1 flex gap-1">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => update('introExtroScale', n)}
                                className={`
                                    flex-1 h-10 rounded-md text-sm font-medium transition-all duration-200
                                    ${formData.introExtroScale === n
                                        ? 'doraemon-gradient text-white scale-110'
                                        : 'bg-muted hover:bg-primary/10 text-foreground'
                                    }
                                `}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Very Extroverted</span>
                </div>
            </div>
            <div className="space-y-2">
                <Label>What would you do if your pairing didn&apos;t reach out as much? *</Label>
                <Select value={formData.reachOutStyle} onValueChange={(v) => update('reachOutStyle', v)}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="I'd be okay with reaching out to them to hangout.">
                            I&apos;d reach out to them
                        </SelectItem>
                        <SelectItem value="I'd wait until they reach out to me to hangout.">
                            I&apos;d wait for them to reach out
                        </SelectItem>
                        <SelectItem value="I'd expect an equal effort both ways.">
                            I&apos;d expect equal effort
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Any additional info to help us find your best pairing/family?</Label>
                <Textarea
                    value={formData.additionalInfo}
                    onChange={(e) => update('additionalInfo', e.target.value)}
                    placeholder="Anything else you'd like us to know..."
                    rows={3}
                />
            </div>
        </div>
    )
}
