'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Camera,
    Upload,
    X,
    ArrowLeft,
    ImageIcon,
    CheckCircle2
} from 'lucide-react'
import { submitPhotoSubmission } from '@/lib/actions/submissions'
import { toast } from 'sonner'
import { BonusActivity } from '@/types'

interface SubmitFormProps {
    bonusActivities: BonusActivity[]
    weekNumber: number
    year: number
}

export default function SubmitForm({ bonusActivities, weekNumber, year }: SubmitFormProps) {
    // deadline calculation (next Sunday) could be added here or passed in
    // For now, simple text
    const deadline = "Sunday 11:59 PM"

    // Create an object to replace the old constant usage
    const currentWeek = {
        weekNumber,
        year,
        deadline
    }
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [selectedBonuses, setSelectedBonuses] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDragActive, setIsDragActive] = useState(false)
    const getSelectedFile = () => file || fileInputRef.current?.files?.[0] || null

    const setSelectedFile = useCallback((selectedFile: File | null) => {
        if (selectedFile) {
            setPreview((previousPreview) => {
                if (previousPreview) {
                    URL.revokeObjectURL(previousPreview)
                }
                return URL.createObjectURL(selectedFile)
            })
            setFile(selectedFile)
            return
        }

        setFile(null)
        setPreview((previousPreview) => {
            if (previousPreview) {
                URL.revokeObjectURL(previousPreview)
            }
            return null
        })
    }, [])

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview)
            }
        }
    }, [preview])

    const removeFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        setSelectedFile(null)
    }

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null
        setSelectedFile(selectedFile)
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragActive(false)
        const selectedFile = event.dataTransfer.files?.[0] || null
        setSelectedFile(selectedFile)
    }

    const openFilePicker = () => {
        fileInputRef.current?.click()
    }

    const toggleBonus = (bonusId: string) => {
        setSelectedBonuses(prev =>
            prev.includes(bonusId)
                ? prev.filter(id => id !== bonusId)
                : [...prev, bonusId]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const selectedFile = getSelectedFile()
        if (!selectedFile) {
            toast.error('Please choose a photo to upload.')
            return
        }

        setIsSubmitting(true)

        try {
            const normalizedFile = await normalizeImageFile(selectedFile)
            const submissionResult = await submitPhotoSubmission(
                normalizedFile,
                currentWeek.weekNumber,
                currentWeek.year,
                selectedBonuses
            )

            if (!submissionResult.success) {
                toast.error(submissionResult.error || 'Failed to create submission')
                setIsSubmitting(false)
                return
            }

            toast.success('Photo submitted successfully!')
            router.push('/dashboard/submissions')
            router.refresh()
        } catch (error) {
            console.error('Submission error:', error)
            toast.error('An unexpected error occurred. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const basePoints = 10
    const bonusPoints = selectedBonuses.reduce((acc, id) => {
        const bonus = bonusActivities.find(b => b.id === id)
        return acc + (bonus?.points || 0)
    }, 0)
    const totalPoints = basePoints + bonusPoints

    // ... Render code ...
    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 max-w-2xl">
                    {/* Back Link */}
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl doraemon-gradient mb-4">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Submit Weekly Photo</h1>
                        <p className="text-muted-foreground">
                            Week {currentWeek.weekNumber} • Deadline: {currentWeek.deadline}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Photo Upload */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="text-lg">Photo Upload</CardTitle>
                                <CardDescription>
                                    Upload a photo of you spending time with your Em(s)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!file ? (
                                    <div
                                        onClick={openFilePicker}
                                        onDragEnter={(event) => {
                                            event.preventDefault()
                                            setIsDragActive(true)
                                        }}
                                        onDragOver={(event) => {
                                            event.preventDefault()
                                            setIsDragActive(true)
                                        }}
                                        onDragLeave={(event) => {
                                            event.preventDefault()
                                            setIsDragActive(false)
                                        }}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                      ${isDragActive
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.heic,.webp,image/jpeg,image/png,image/heic,image/webp"
                                            onChange={handleFileInputChange}
                                            className="hidden"
                                            data-testid="submission-file-input"
                                        />
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="font-medium mb-1">
                                            {isDragActive ? 'Drop your photo here' : 'Drag and drop your photo'}
                                        </p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            or click to select a file
                                        </p>
                                        <Button type="button" variant="outline" className="mb-4" onClick={(event) => {
                                            event.stopPropagation()
                                            openFilePicker()
                                        }}>
                                            Choose File
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            JPG, PNG, HEIC, or WebP • Max 10MB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={preview || ''}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeFile}
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="mt-3 flex items-center gap-2 text-sm">
                                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground truncate">{file.name}</span>
                                            <span className="text-muted-foreground">
                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Bonus Activities */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="text-lg">Bonus Activities (Optional)</CardTitle>
                                <CardDescription>
                                    Select any bonus activities you completed this week for extra points
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {bonusActivities.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">
                                            No active bonus activities for this week.
                                        </p>
                                    ) : (
                                        bonusActivities.map((bonus) => (
                                            <div
                                                key={bonus.id}
                                                data-testid={`bonus-option-${bonus.id}`}
                                                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer
                        ${selectedBonuses.includes(bonus.id)
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-transparent bg-muted/50 hover:bg-muted'
                                                    }`}
                                                onClick={() => toggleBonus(bonus.id)}
                                            >
                                                <Checkbox
                                                    id={bonus.id}
                                                    checked={selectedBonuses.includes(bonus.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onCheckedChange={() => toggleBonus(bonus.id)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1">
                                                    <Label
                                                        htmlFor={bonus.id}
                                                        className="font-medium cursor-pointer"
                                                        onClick={(event) => {
                                                            event.preventDefault()
                                                            event.stopPropagation()
                                                            toggleBonus(bonus.id)
                                                        }}
                                                    >
                                                        {bonus.name}
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {bonus.description}
                                                    </p>
                                                </div>
                                                <div className="text-sm font-semibold text-primary">
                                                    +{bonus.points} pts
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Points Summary */}
                        <Card className="mb-6 bg-muted/30">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-muted-foreground">Base points</span>
                                    <span className="font-medium">+{basePoints}</span>
                                </div>
                                {bonusPoints > 0 && (
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-muted-foreground">
                                            Bonus points ({selectedBonuses.length} activities)
                                        </span>
                                        <span className="font-medium text-[#FFD700]">+{bonusPoints}</span>
                                    </div>
                                )}
                                <div className="border-t pt-4 flex items-center justify-between">
                                    <span className="font-semibold">Potential total</span>
                                    <span className="text-xl font-bold text-primary">{totalPoints} pts</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-12 doraemon-gradient text-white gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Submit Photo
                                </>
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground mt-4">
                            By submitting, you confirm this photo was taken this week with your pairing.
                        </p>
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    )
}

async function normalizeImageFile(file: File): Promise<File> {
    try {
        if (typeof window === 'undefined') {
            return file
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            return file
        }

        const imageBitmap = await createImageBitmap(file)
        const maxDimension = 1600
        const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height))
        const width = Math.max(1, Math.round(imageBitmap.width * scale))
        const height = Math.max(1, Math.round(imageBitmap.height * scale))
        const canvas = document.createElement('canvas')

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        if (!context) {
            imageBitmap.close()
            return file
        }

        context.drawImage(imageBitmap, 0, 0, width, height)
        imageBitmap.close()

        const compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.82)
        })

        if (!compressedBlob || compressedBlob.size >= file.size) {
            return file
        }

        const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'submission'

        return new File([compressedBlob], `${normalizedName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
        })
    } catch (error) {
        console.warn('Falling back to original image after normalization failure:', error)
        return file
    }
}
