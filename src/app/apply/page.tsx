'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    CheckCircle2,
    ClipboardList,
    Sparkles,
    Heart,
    Users,
    GraduationCap,
    User,
    MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { submitAceApplication } from '@/lib/actions/ace-applications'
import { AceRole } from '@/types/index'

const ACTIVITIES = [
    'Study',
    'Go out to restaurants',
    'Gym Buddy',
    'Play Sports',
    'Gaming',
    'Chill/Hangout',
    'Arts/Crafts',
    'Get drinks (Boba, matcha, etc)',
    'Outdoor activities (hiking, biking, running, etc)',
    'Shopping',
    'Raves / Parties',
    'Go to campus events',
    'Brainrot',
]

const TOTAL_STEPS = 6

type FormData = {
    // Step 1 - Contact
    name: string
    pronouns: string
    email: string
    phone: string
    instagram: string
    // Step 2 - Academic
    university: string
    universityOther: string
    schoolYear: string
    majorsMinors: string
    livesOnCampus: string
    livesOnCampusOther: string
    // Step 3 - Role
    role: AceRole | ''
    // Step 4a - Family Head
    familyHeadAcknowledged: boolean
    familyHeadWhy: string
    familyHeadHowHelp: string
    familyHeadExclusions: string
    familyHeadIdentities: string
    familyHeadFamilyPrefs: string
    familyHeadConcerns: string
    // Step 4b - ACE Questions
    goals: string
    willingMultiple: string
    preferredActivities: string[]
    preferredActivitiesOther: string
    familyHeadPreference: string
    pairingPreferences: string
    pairingExclusions: string
    meetFrequency: string
    otherCommitments: string
    coreIdentities: string
    // Step 5 - Personal
    hobbies: string
    musicTaste: string
    perfectDay: string
    dreamVacation: string
    introExtroScale: number
    reachOutStyle: string
    additionalInfo: string
    // Step 6 - Final
    availableForReveal: string
    finalComments: string
    selfIntro: string
}

const initialFormData: FormData = {
    name: '',
    pronouns: '',
    email: '',
    phone: '',
    instagram: '',
    university: 'University of Minnesota - Twin Cities',
    universityOther: '',
    schoolYear: '',
    majorsMinors: '',
    livesOnCampus: '',
    livesOnCampusOther: '',
    role: '',
    familyHeadAcknowledged: false,
    familyHeadWhy: '',
    familyHeadHowHelp: '',
    familyHeadExclusions: '',
    familyHeadIdentities: '',
    familyHeadFamilyPrefs: '',
    familyHeadConcerns: '',
    goals: '',
    willingMultiple: '',
    preferredActivities: [],
    preferredActivitiesOther: '',
    familyHeadPreference: '',
    pairingPreferences: '',
    pairingExclusions: '',
    meetFrequency: '',
    otherCommitments: '',
    coreIdentities: '',
    hobbies: '',
    musicTaste: '',
    perfectDay: '',
    dreamVacation: '',
    introExtroScale: 5,
    reachOutStyle: '',
    additionalInfo: '',
    availableForReveal: '',
    finalComments: '',
    selfIntro: '',
}

const stepLabels = [
    'Contact',
    'Academic',
    'Role',
    'Questions',
    'Personal',
    'Final',
]

const stepIcons = [
    User,
    GraduationCap,
    Users,
    MessageCircle,
    Heart,
    ClipboardList,
]

export default function ApplyPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<FormData>(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load saved data on mount
    useEffect(() => {
        const savedData = localStorage.getItem('ace-application-form')
        const savedStep = localStorage.getItem('ace-application-step')

        if (savedData) {
            try {
                setFormData(JSON.parse(savedData))
            } catch (e) {
                console.error('Failed to parse saved form data', e)
            }
        }

        if (savedStep) {
            try {
                setStep(parseInt(savedStep, 10))
            } catch (e) {
                console.error('Failed to parse saved step', e)
            }
        }

        setIsLoaded(true)
    }, [])

    // Save data on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('ace-application-form', JSON.stringify(formData))
            localStorage.setItem('ace-application-step', step.toString())
        }
    }, [formData, step, isLoaded])

    const update = (field: keyof FormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const toggleActivity = (activity: string) => {
        setFormData((prev) => ({
            ...prev,
            preferredActivities: prev.preferredActivities.includes(activity)
                ? prev.preferredActivities.filter((a) => a !== activity)
                : [...prev.preferredActivities, activity],
        }))
    }

    const validateStep = (): boolean => {
        switch (step) {
            case 1:
                if (!formData.name || !formData.pronouns || !formData.email || !formData.phone || !formData.instagram) {
                    toast.error('Please fill in all contact fields.')
                    return false
                }
                if (!/\S+@\S+\.\S+/.test(formData.email)) {
                    toast.error('Please enter a valid email address.')
                    return false
                }
                return true
            case 2:
                if (!formData.schoolYear || !formData.majorsMinors || !formData.livesOnCampus) {
                    toast.error('Please fill in all academic fields.')
                    return false
                }
                return true
            case 3:
                if (!formData.role) {
                    toast.error('Please select a role.')
                    return false
                }
                return true
            case 4:
                if (formData.role === 'FAMILY_HEAD') {
                    if (!formData.familyHeadAcknowledged) {
                        toast.error('Please acknowledge the Family Head responsibilities.')
                        return false
                    }
                    if (!formData.familyHeadWhy || !formData.familyHeadHowHelp || !formData.familyHeadExclusions || !formData.familyHeadIdentities || !formData.familyHeadFamilyPrefs || !formData.familyHeadConcerns) {
                        toast.error('Please fill in all Family Head questions.')
                        return false
                    }
                } else {
                    if (!formData.goals || !formData.familyHeadPreference || !formData.pairingPreferences || !formData.pairingExclusions || !formData.otherCommitments || !formData.coreIdentities) {
                        toast.error('Please fill in all A.C.E. questions.')
                        return false
                    }
                }
                return true
            case 5:
                if (!formData.hobbies || !formData.musicTaste || !formData.perfectDay || !formData.reachOutStyle) {
                    toast.error('Please fill in all personal questions.')
                    return false
                }
                return true
            case 6:
                if (!formData.availableForReveal || !formData.selfIntro) {
                    toast.error('Please fill in all final questions.')
                    return false
                }
                return true
            default:
                return true
        }
    }

    const handleNext = () => {
        if (validateStep()) {
            setStep((s) => Math.min(s + 1, TOTAL_STEPS))
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleBack = () => {
        setStep((s) => Math.max(s - 1, 1))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = async () => {
        if (!validateStep()) return
        setIsSubmitting(true)

        try {
            const university = formData.university === 'Other'
                ? formData.universityOther
                : formData.university
            const livesOnCampus = formData.livesOnCampus === 'Other'
                ? formData.livesOnCampusOther
                : formData.livesOnCampus

            const result = await submitAceApplication({
                ...formData,
                role: formData.role as AceRole,
                university,
                livesOnCampus,
            })

            if (result.success) {
                // Clear saved data on success
                localStorage.removeItem('ace-application-form')
                localStorage.removeItem('ace-application-step')

                setIsSubmitted(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                toast.error(result.error || 'Something went wrong.')
            }
        } catch {
            toast.error('Failed to submit. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ------ SUCCESS SCREEN ------
    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col">
                <NavbarWithAuthClient />
                <main className="flex-1 flex items-center justify-center py-12 px-4">
                    <div className="max-w-lg text-center">
                        <div className="w-20 h-20 rounded-full doraemon-gradient flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4">Application Submitted! 🎉</h1>
                        <p className="text-muted-foreground mb-2">
                            Thank you for applying to VSAM&apos;s A.C.E. Program!
                        </p>
                        <p className="text-muted-foreground mb-8">
                            We&apos;ll be reviewing applications and you&apos;ll learn about your pairing at the reveal event
                            on <strong>Friday, October 24th from 6-8 PM</strong> in Bruininks 114.
                            Keep an eye on our Instagram for more details!
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link href="/">
                                <Button variant="outline" className="gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Home
                                </Button>
                            </Link>
                            <a href="https://instagram.com/vsam.ace/" target="_blank" rel="noopener noreferrer">
                                <Button className="gap-2 doraemon-gradient text-white hover:opacity-90">
                                    Follow on Instagram
                                </Button>
                            </a>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    // ------ MULTI-STEP FORM ------
    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 max-w-3xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 text-sm font-medium">
                            <Sparkles className="w-4 h-4" />
                            Fall A.C.E. Application
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            VSAM&apos;s A.C.E. Application
                        </h1>
                        <p className="text-muted-foreground">
                            Anh, Chị/Chanh, Em — Build lasting bonds in our community 💕
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            {stepLabels.map((label, i) => {
                                const Icon = stepIcons[i]
                                const isActive = step === i + 1
                                const isCompleted = step > i + 1
                                return (
                                    <div
                                        key={label}
                                        className="flex flex-col items-center gap-1 flex-1"
                                    >
                                        <div
                                            className={`
                                                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                                                transition-all duration-300
                                                ${isCompleted
                                                    ? 'doraemon-gradient text-white scale-90'
                                                    : isActive
                                                        ? 'doraemon-gradient text-white scale-110 doraemon-glow'
                                                        : 'bg-muted text-muted-foreground'
                                                }
                                            `}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <Icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full doraemon-gradient rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            Step {step} of {TOTAL_STEPS}
                        </p>
                    </div>

                    {/* Deadline Banner */}
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center mb-6">
                        <p className="text-sm font-medium text-destructive">
                            ‼️📋 DEADLINE: 11:59 PM, FRIDAY, OCT 17
                        </p>
                    </div>

                    <Card className="doraemon-shadow">
                        <CardContent className="p-6 md:p-8">
                            {/* ====== STEP 1: CONTACT ====== */}
                            {step === 1 && (
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
                                        <Input id="name" value={formData.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" className="h-11" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pronouns">Pronouns *</Label>
                                        <Input id="pronouns" value={formData.pronouns} onChange={(e) => update('pronouns', e.target.value)} placeholder="e.g. he/him, she/her, they/them" className="h-11" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">✉️ Email *</Label>
                                        <Input id="email" type="email" value={formData.email} onChange={(e) => update('email', e.target.value)} placeholder="your.email@umn.edu" className="h-11" required />
                                        <p className="text-xs text-muted-foreground">We will be sending a confirmation email, so please enter an email that you will check!</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">📞 Phone Number *</Label>
                                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(xxx) xxx-xxxx" className="h-11" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="instagram">📲 Instagram Username *</Label>
                                        <Input id="instagram" value={formData.instagram} onChange={(e) => update('instagram', e.target.value)} placeholder="@yourusername or n/a" className="h-11" required />
                                        <p className="text-xs text-muted-foreground">
                                            Used to keep track of points and to stay updated on weekly goals. If you don&apos;t have insta, add any other social media handle or write n/a.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ====== STEP 2: ACADEMIC ====== */}
                            {step === 2 && (
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
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="University of Minnesota - Twin Cities">University of Minnesota - Twin Cities</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {formData.university === 'Other' && (
                                            <Input value={formData.universityOther} onChange={(e) => update('universityOther', e.target.value)} placeholder="Enter your university" className="h-11 mt-2" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Your school year? (Age Wise, Not Credit Wise) *</Label>
                                        <Select value={formData.schoolYear} onValueChange={(v) => update('schoolYear', v)}>
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select year" /></SelectTrigger>
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
                                        <Input id="majors" value={formData.majorsMinors} onChange={(e) => update('majorsMinors', e.target.value)} placeholder="e.g. Computer Science, Biology Minor" className="h-11" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Do you live on or nearby campus? *</Label>
                                        <Select value={formData.livesOnCampus} onValueChange={(v) => update('livesOnCampus', v)}>
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No, I commute by bus and don't have a car.">No, I commute by bus</SelectItem>
                                                <SelectItem value="No, I commute by car.">No, I commute by car</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {formData.livesOnCampus === 'Other' && (
                                            <Input value={formData.livesOnCampusOther} onChange={(e) => update('livesOnCampusOther', e.target.value)} placeholder="Please specify" className="h-11 mt-2" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ====== STEP 3: ROLE SELECTION ====== */}
                            {step === 3 && (
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
                                        {([
                                            { value: 'FAMILY_HEAD', label: 'Family Head 🏠', desc: 'Coordinate hangouts for your family. Low-commitment role ideal for those who want to meet lots of people.' },
                                            { value: 'ANH', label: 'Anh (Older Brother)', desc: 'Be a mentor and guide a younger sibling through their university experience.' },
                                            { value: 'CHI', label: 'Chị (Older Sister)', desc: 'Be a mentor and guide a younger sibling through their university experience.' },
                                            { value: 'CHANH', label: 'Chanh (Gender neutral older sibling)', desc: 'Be a mentor and guide a younger sibling through their university experience.' },
                                            { value: 'EM', label: 'Em (Younger Sibling)', desc: 'Be paired with a mentor who will help you navigate university life. Required for PSEO & 1st years.' },
                                        ] as const).map((option) => (
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
                                                <p className="font-medium text-foreground">Perks: Free discount card, skip-the-line food vouchers, double-portion food vouchers at VSAM events!</p>
                                                <p>Questions? Contact Trey Hoang at <a href="mailto:hoang408@umn.edu" className="text-primary underline">hoang408@umn.edu</a></p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* ====== STEP 4: ROLE-SPECIFIC QUESTIONS ====== */}
                            {step === 4 && formData.role === 'FAMILY_HEAD' && (
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
                                        <Textarea value={formData.familyHeadWhy} onChange={(e) => update('familyHeadWhy', e.target.value)} placeholder="Share your motivation..." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>How do you plan on helping others have a good experience with ACE? *</Label>
                                        <Textarea value={formData.familyHeadHowHelp} onChange={(e) => update('familyHeadHowHelp', e.target.value)} placeholder="Describe your approach..." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Is there anyone specific you would not like to be in your family? Why? *</Label>
                                        <Textarea value={formData.familyHeadExclusions} onChange={(e) => update('familyHeadExclusions', e.target.value)} placeholder="Ex: Family member, Close friends, etc." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>What are your 1-4 core identities? *</Label>
                                        <Textarea value={formData.familyHeadIdentities} onChange={(e) => update('familyHeadIdentities', e.target.value)} placeholder="Ex: First-Gen, MBTI type, Ethnicity, etc." rows={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Do you have any preferences for the type of people in your family? *</Label>
                                        <Textarea value={formData.familyHeadFamilyPrefs} onChange={(e) => update('familyHeadFamilyPrefs', e.target.value)} placeholder="Ex: Specific individuals, interests, people I don't know, etc." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>💯 Any concerns about the responsibilities? How can coordinators support you? *</Label>
                                        <Textarea value={formData.familyHeadConcerns} onChange={(e) => update('familyHeadConcerns', e.target.value)} placeholder="Share any concerns or needs..." rows={3} />
                                    </div>
                                </div>
                            )}

                            {step === 4 && formData.role !== 'FAMILY_HEAD' && (
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
                                        <Textarea value={formData.goals} onChange={(e) => update('goals', e.target.value)} placeholder="Goals, Mentorship, Experiences, Friendships, etc." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Would you be willing to have more than one big/little? *</Label>
                                        <Select value={formData.willingMultiple} onValueChange={(v) => update('willingMultiple', v)}>
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
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
                                                    <Label htmlFor={`act-${activity}`} className="text-sm cursor-pointer">{activity}</Label>
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
                                        <Textarea value={formData.familyHeadPreference} onChange={(e) => update('familyHeadPreference', e.target.value)} placeholder="Leadership Style, Personality, Specific Traits, Gender, etc..." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Any preferences for who you want to be paired with? Be specific. *</Label>
                                        <Textarea value={formData.pairingPreferences} onChange={(e) => update('pairingPreferences', e.target.value)} placeholder="Ex: Gender, Goals, Interests, Specific Individual" rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Anyone specific you would NOT like to be paired with? *</Label>
                                        <Textarea value={formData.pairingExclusions} onChange={(e) => update('pairingExclusions', e.target.value)} placeholder="Ex: Family member, Close friends, etc." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>How frequently can you meet with your pairing? *</Label>
                                        <Select value={formData.meetFrequency} onValueChange={(v) => update('meetFrequency', v)}>
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Weekly">Weekly</SelectItem>
                                                <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                                                <SelectItem value="I'm free most of the time">I&apos;m free most of the time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>What other commitments do you have besides school? *</Label>
                                        <Textarea value={formData.otherCommitments} onChange={(e) => update('otherCommitments', e.target.value)} placeholder="Ex: Work, Volunteering, Student Groups" rows={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>What are your 1-4 core identities? *</Label>
                                        <Textarea value={formData.coreIdentities} onChange={(e) => update('coreIdentities', e.target.value)} placeholder="Ex: First-Gen, MBTI, Ethnicity, Sexuality & Gender identity, etc." rows={2} />
                                    </div>
                                </div>
                            )}

                            {/* ====== STEP 5: PERSONAL ====== */}
                            {step === 5 && (
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
                                        <Textarea value={formData.hobbies} onChange={(e) => update('hobbies', e.target.value)} placeholder="Try to be specific or list as many as possible!" rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>What is your favorite music genre/artist/song? *</Label>
                                        <Textarea value={formData.musicTaste} onChange={(e) => update('musicTaste', e.target.value)} placeholder="Ex: Vpop, Rap, Alternative Rock, Indie, R&B" rows={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>What would constitute a &quot;perfect&quot; day for you? *</Label>
                                        <Textarea value={formData.perfectDay} onChange={(e) => update('perfectDay', e.target.value)} placeholder="Ex: Sleeping in, dedicating my day to a hobby, hanging out with friends..." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>What is your dream vacation and why?</Label>
                                        <Textarea value={formData.dreamVacation} onChange={(e) => update('dreamVacation', e.target.value)} placeholder="Ex: Iceland for nature, Korea for K-pop, Japan for anime..." rows={2} />
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
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="I'd be okay with reaching out to them to hangout.">I&apos;d reach out to them</SelectItem>
                                                <SelectItem value="I'd wait until they reach out to me to hangout.">I&apos;d wait for them to reach out</SelectItem>
                                                <SelectItem value="I'd expect an equal effort both ways.">I&apos;d expect equal effort</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Any additional info to help us find your best pairing/family?</Label>
                                        <Textarea value={formData.additionalInfo} onChange={(e) => update('additionalInfo', e.target.value)} placeholder="Anything else you'd like us to know..." rows={3} />
                                    </div>
                                </div>
                            )}

                            {/* ====== STEP 6: FINAL ====== */}
                            {step === 6 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                                            <ClipboardList className="w-5 h-5 text-primary" />
                                            You Are Nearly Finished! 🎉
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            You will be added to an Instagram group chat. Trey Hoang will be your main contact. Questions? Email{' '}
                                            <a href="mailto:hoang408@umn.edu" className="text-primary underline">hoang408@umn.edu</a> with &quot;ACE&quot; in the subject line.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Are you available on Friday, October 24th @ 6-8 PM? *</Label>
                                        <Select value={formData.availableForReveal} onValueChange={(v) => update('availableForReveal', v)}>
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="YES!!!! :D">YES!!!! :D</SelectItem>
                                                <SelectItem value="NO >:(">NO &gt;:(</SelectItem>
                                                <SelectItem value="Only for a portion of the time">Only for a portion of the time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Any final comments or questions?</Label>
                                        <Textarea value={formData.finalComments} onChange={(e) => update('finalComments', e.target.value)} placeholder="Leave any final thoughts here..." rows={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Write a snippet to introduce yourself to your pairing! *</Label>
                                        <Textarea value={formData.selfIntro} onChange={(e) => update('selfIntro', e.target.value)} placeholder="Include your name, pronouns, year, major, fun fact, contact info, etc." rows={4} />
                                        <p className="text-xs text-muted-foreground">
                                            Especially important if you are unable to attend the reveal event!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between items-center mt-8 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleBack}
                                    disabled={step === 1}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>

                                {step < TOTAL_STEPS ? (
                                    <Button
                                        type="button"
                                        onClick={handleNext}
                                        className="gap-2 doraemon-gradient text-white hover:opacity-90"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="gap-2 doraemon-gradient text-white hover:opacity-90 px-8"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                Submit Application
                                                <CheckCircle2 className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tip */}
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        💡 Your progress is saved locally — you can navigate between steps freely.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    )
}
