import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { GraduationCap } from 'lucide-react'
import { FormData } from './types'

interface AcademicStepProps {
    formData: FormData
    update: (field: keyof FormData, value: any) => void
}

export function AcademicStep({ formData, update }: AcademicStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    📚 Academic Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                    The more intentional your answers are, the easier it is for us to pair you!
                </p>
            </div>
            <div className="space-y-2">
                <Label>What university do you go to? *</Label>
                <Select value={formData.university} onValueChange={(v) => update('university', v)}>
                    <SelectTrigger className="h-11">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="University of Minnesota - Twin Cities">
                            University of Minnesota - Twin Cities
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
                {formData.university === 'Other' && (
                    <Input
                        value={formData.universityOther}
                        onChange={(e) => update('universityOther', e.target.value)}
                        placeholder="Enter your university"
                        className="h-11 mt-2"
                    />
                )}
            </div>
            <div className="space-y-2">
                <Label>Your school year? (Age Wise, Not Credit Wise) *</Label>
                <Select value={formData.schoolYear} onValueChange={(v) => update('schoolYear', v)}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PSEO">PSEO</SelectItem>
                        <SelectItem value="1st year">1st year</SelectItem>
                        <SelectItem value="2nd year">2nd year</SelectItem>
                        <SelectItem value="3rd year">3rd year</SelectItem>
                        <SelectItem value="4th year">4th year</SelectItem>
                        <SelectItem value="Grad School +">Grad School +</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="majors">What are your (intended) Majors/Minors? *</Label>
                <Input
                    id="majors"
                    value={formData.majorsMinors}
                    onChange={(e) => update('majorsMinors', e.target.value)}
                    placeholder="e.g. Computer Science, Biology Minor"
                    className="h-11"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label>Do you live on or nearby campus? *</Label>
                <Select value={formData.livesOnCampus} onValueChange={(v) => update('livesOnCampus', v)}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No, I commute by bus and don't have a car.">
                            No, I commute by bus
                        </SelectItem>
                        <SelectItem value="No, I commute by car.">
                            No, I commute by car
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
                {formData.livesOnCampus === 'Other' && (
                    <Input
                        value={formData.livesOnCampusOther}
                        onChange={(e) => update('livesOnCampusOther', e.target.value)}
                        placeholder="Please specify"
                        className="h-11 mt-2"
                    />
                )}
            </div>
        </div>
    )
}
