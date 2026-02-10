'use client'

import { useState, useEffect } from 'react'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { submitAceApplication } from '@/lib/actions/ace-applications'
import { AceRole } from '@/types/index'

// Modular Components
import { FormData, initialFormData, TOTAL_STEPS } from '@/components/apply-form/types'
import { FormProgress } from '@/components/apply-form/form-progress'
import { ContactStep } from '@/components/apply-form/contact-step'
import { AcademicStep } from '@/components/apply-form/academic-step'
import { RoleSelectionStep } from '@/components/apply-form/role-selection-step'
import { RoleQuestionsStep } from '@/components/apply-form/role-questions-step'
import { PersonalStep } from '@/components/apply-form/personal-step'
import { FinalStep } from '@/components/apply-form/final-step'
import { SuccessScreen } from '@/components/apply-form/success-screen'

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
                const stepNum = parseInt(savedStep, 10)
                if (!isNaN(stepNum)) setStep(stepNum)
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

    if (isSubmitted) {
        return <SuccessScreen />
    }

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 max-w-3xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 text-sm font-medium">
                            <Sparkles className="w-4 h-4" />
                            Spring A.C.E. Application
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            VSAM&apos;s A.C.E. Application
                        </h1>
                        <p className="text-muted-foreground">
                            Anh, Chị/Chanh, Em — Build lasting bonds in our community 💕
                        </p>
                    </div>

                    <FormProgress currentStep={step} />

                    {/* Deadline Banner */}
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center mb-6">
                        <p className="text-sm font-medium text-destructive">
                            ‼️📋 DEADLINE: 11:59 PM, FRIDAY, Feb 27
                        </p>
                    </div>

                    <Card className="doraemon-shadow">
                        <CardContent className="p-6 md:p-8">
                            {step === 1 && <ContactStep formData={formData} update={update} />}
                            {step === 2 && <AcademicStep formData={formData} update={update} />}
                            {step === 3 && <RoleSelectionStep formData={formData} update={update} />}
                            {step === 4 && (
                                <RoleQuestionsStep
                                    formData={formData}
                                    update={update}
                                    toggleActivity={toggleActivity}
                                />
                            )}
                            {step === 5 && <PersonalStep formData={formData} update={update} />}
                            {step === 6 && <FinalStep formData={formData} update={update} />}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-10 pt-6 border-t">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={step === 1 || isSubmitting}
                                    className="gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>

                                {step < TOTAL_STEPS ? (
                                    <Button
                                        onClick={handleNext}
                                        disabled={isSubmitting}
                                        className="gap-2 doraemon-gradient text-white doraemon-glow"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="gap-2 doraemon-gradient text-white doraemon-glow px-8"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                Submit Application
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    )
}
