import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Users, MessageCircle } from 'lucide-react'
import { FormData, ACTIVITIES } from './types'

interface RoleQuestionsStepProps {
    formData: FormData
    update: (field: keyof FormData, value: any) => void
    toggleActivity: (activity: string) => void
}

export function RoleQuestionsStep({ formData, update, toggleActivity }: RoleQuestionsStepProps) {
    if (formData.role === 'FAMILY_HEAD') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                        <Users className="w-5 h-5 text-primary" />
                        ✨ Family Head Questions
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        The more intentional your answers are, the easier it is for us to match you with a family.
                    </p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <Checkbox
                        id="fh-ack"
                        checked={formData.familyHeadAcknowledged}
                        onCheckedChange={(v) => update('familyHeadAcknowledged', !!v)}
                    />
                    <Label htmlFor="fh-ack" className="text-sm leading-relaxed cursor-pointer">
                        I have read the Family Head responsibilities carefully and agree to take them on to the best of my ability. I understand that Head Coordinators will be relying on me but that I will have their full support as well! 🏠 Family Head all the way!
                    </Label>
                </div>
                <div className="space-y-2">
                    <Label>Why do you want to be a Family Head? What do you hope to gain? *</Label>
                    <Textarea
                        value={formData.familyHeadWhy}
                        onChange={(e) => update('familyHeadWhy', e.target.value)}
                        placeholder="Share your motivation..."
                        rows={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label>How do you plan on helping others have a good experience with ACE? *</Label>
                    <Textarea
                        value={formData.familyHeadHowHelp}
                        onChange={(e) => update('familyHeadHowHelp', e.target.value)}
                        placeholder="Describe your approach..."
                        rows={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Is there anyone specific you would not like to be in your family? Why? *</Label>
                    <Textarea
                        value={formData.familyHeadExclusions}
                        onChange={(e) => update('familyHeadExclusions', e.target.value)}
                        placeholder="Ex: Family member, Close friends, etc."
                        rows={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label>What are your 1-4 core identities? *</Label>
                    <Textarea
                        value={formData.familyHeadIdentities}
                        onChange={(e) => update('familyHeadIdentities', e.target.value)}
                        placeholder="Ex: First-Gen, MBTI type, Ethnicity, etc."
                        rows={2}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Do you have any preferences for the type of people in your family? *</Label>
                    <Textarea
                        value={formData.familyHeadFamilyPrefs}
                        onChange={(e) => update('familyHeadFamilyPrefs', e.target.value)}
                        placeholder="Ex: Specific individuals, interests, people I don't know, etc."
                        rows={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label>💯 Any concerns about the responsibilities? How can coordinators support you? *</Label>
                    <Textarea
                        value={formData.familyHeadConcerns}
                        onChange={(e) => update('familyHeadConcerns', e.target.value)}
                        placeholder="Share any concerns or needs..."
                        rows={3}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    ✨ A.C.E. Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                    The more intentional your answers are, the easier it is for us to pair you!
                </p>
            </div>
            <div className="space-y-2">
                <Label>What are you looking to get out of being a big or little? *</Label>
                <Textarea
                    value={formData.goals}
                    onChange={(e) => update('goals', e.target.value)}
                    placeholder="Goals, Mentorship, Experiences, Friendships, etc."
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>Would you be willing to have more than one big/little? *</Label>
                <Select value={formData.willingMultiple} onValueChange={(v) => update('willingMultiple', v)}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-3">
                <Label>What activities would you like to do with your pair/family? *</Label>
                <div className="grid grid-cols-2 gap-2">
                    {ACTIVITIES.map((activity) => (
                        <div key={activity} className="flex items-center gap-2">
                            <Checkbox
                                id={`act-${activity}`}
                                checked={formData.preferredActivities.includes(activity)}
                                onCheckedChange={() => toggleActivity(activity)}
                            />
                            <Label htmlFor={`act-${activity}`} className="text-sm cursor-pointer">
                                {activity}
                            </Label>
                        </div>
                    ))}
                </div>
                <Input
                    value={formData.preferredActivitiesOther}
                    onChange={(e) => update('preferredActivitiesOther', e.target.value)}
                    placeholder="Other activities..."
                    className="h-11"
                />
            </div>
            <div className="space-y-2">
                <Label>What kind of family head would you like? *</Label>
                <Textarea
                    value={formData.familyHeadPreference}
                    onChange={(e) => update('familyHeadPreference', e.target.value)}
                    placeholder="Leadership Style, Personality, Specific Traits, Gender, etc..."
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>Any preferences for who you want to be paired with? Be specific. *</Label>
                <Textarea
                    value={formData.pairingPreferences}
                    onChange={(e) => update('pairingPreferences', e.target.value)}
                    placeholder="Ex: Gender, Goals, Interests, Specific Individual"
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>Anyone specific you would NOT like to be paired with? *</Label>
                <Textarea
                    value={formData.pairingExclusions}
                    onChange={(e) => update('pairingExclusions', e.target.value)}
                    placeholder="Ex: Family member, Close friends, etc."
                    rows={3}
                />
            </div>
            <div className="space-y-2">
                <Label>How frequently can you meet with your pairing? *</Label>
                <Select value={formData.meetFrequency} onValueChange={(v) => update('meetFrequency', v)}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="I'm free most of the time">I&apos;m free most of the time</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>What other commitments do you have besides school? *</Label>
                <Textarea
                    value={formData.otherCommitments}
                    onChange={(e) => update('otherCommitments', e.target.value)}
                    placeholder="Ex: Work, Volunteering, Student Groups"
                    rows={2}
                />
            </div>
            <div className="space-y-2">
                <Label>What are your 1-4 core identities? *</Label>
                <Textarea
                    value={formData.coreIdentities}
                    onChange={(e) => update('coreIdentities', e.target.value)}
                    placeholder="Ex: First-Gen, MBTI, Ethnicity, Sexuality & Gender identity, etc."
                    rows={2}
                />
            </div>
        </div>
    )
}
