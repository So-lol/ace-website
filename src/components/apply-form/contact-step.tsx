import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { User } from 'lucide-react'
import { FormData } from './types'

interface ContactStepProps {
    formData: FormData
    update: (field: keyof FormData, value: any) => void
}

export function ContactStep({ formData, update }: ContactStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-primary" />
                    Contact Information
                </h2>
                <p className="text-sm text-muted-foreground">
                    We&apos;ll use this to reach out to you about your pairing.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="name">Name (Preferred First and Last) *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your name"
                    className="h-11"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="pronouns">Pronouns *</Label>
                <Input
                    id="pronouns"
                    value={formData.pronouns}
                    onChange={(e) => update('pronouns', e.target.value)}
                    placeholder="e.g. he/him, she/her, they/them"
                    className="h-11"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">✉️ Email *</Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="your.email@umn.edu"
                    className="h-11"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    We will be sending a confirmation email, so please enter an email that you will check!
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">📞 Phone Number *</Label>
                <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="(xxx) xxx-xxxx"
                    className="h-11"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="instagram">📲 Instagram Username *</Label>
                <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => update('instagram', e.target.value)}
                    placeholder="@yourusername or n/a"
                    className="h-11"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Used to keep track of points and to stay updated on weekly goals. If you don&apos;t have insta, add any other social media handle or write n/a.
                </p>
            </div>
        </div>
    )
}
