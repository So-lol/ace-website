'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NavbarWithAuthClient, Footer } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

    const setBonusSelection = useCallback((bonusId: string, selected: boolean) => {
        setSelectedBonuses((previous) => {
            const isSelected = previous.includes(bonusId)

            if (selected) {
                return isSelected ? previous : [...previous, bonusId]
            }

            return isSelected ? previous.filter((id) => id !== bonusId) : previous
        })
    }, [])

    const toggleBonus = useCallback((bonusId: string) => {
        setSelectedBonuses((previous) =>
            previous.includes(bonusId)
                ? previous.filter((id) => id !== bonusId)
                : [...previous, bonusId]
        )
    }, [])

    const handleBonusRowClick = useCallback((event: React.MouseEvent<HTMLDivElement>, bonusId: string) => {
        const target = event.target as HTMLElement

        if (target.closest('[role="checkbox"]') || target.tagName === 'INPUT') {
            return
        }

        toggleBonus(bonusId)
    }, [toggleBonus])

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
            const formData = new FormData()
            formData.set('file', normalizedFile)
            formData.set('weekNumber', String(currentWeek.weekNumber))
            formData.set('year', String(currentWeek.year))

            selectedBonuses.forEach((bonusId) => {
                formData.append('bonusActivityIds', bonusId)
            })

            const submissionResult = await submitPhotoSubmission(formData)

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
            toast.error(getSubmissionErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    const basePoints = 10
    const bonusPoints = selectedBonuses.reduce((acc, id) => {
        const bonus = bonusActivities.find(b => b.id === id)
        return acc + Number(bonus?.points || 0)
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
                                            accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.mov,.mp4,image/jpeg,image/png,image/heic,image/heif,image/webp,video/quicktime,video/mp4"
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
                                            JPG, PNG, HEIC, HEIF, WebP, MOV, or MP4 • Max 10MB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                                            {isImagePreviewable(file) && preview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={preview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <div className="text-center text-muted-foreground">
                                                        <ImageIcon className="mx-auto mb-2 h-10 w-10" />
                                                        <div className="text-sm font-medium">File ready to upload</div>
                                                        <div className="text-xs">A flat image will be generated during submission.</div>
                                                    </div>
                                                </div>
                                            )}
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
                                        bonusActivities.map((bonus) => {
                                            const isSelected = selectedBonuses.includes(bonus.id)

                                            return (
                                            <div
                                                key={bonus.id}
                                                role="button"
                                                tabIndex={0}
                                                aria-pressed={isSelected}
                                                data-testid={`bonus-option-${bonus.id}`}
                                                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer
                        ${isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-transparent bg-muted/50 hover:bg-muted'
                                                    }`}
                                                onClick={(event) => handleBonusRowClick(event, bonus.id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        toggleBonus(bonus.id)
                                                    }
                                                }}
                                            >
                                                <Checkbox
                                                    id={bonus.id}
                                                    checked={isSelected}
                                                    aria-label={bonus.name}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onCheckedChange={(checked) => setBonusSelection(bonus.id, checked === true)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-left">
                                                        {bonus.name}
                                                    </div>
                                                    <p className="text-left text-sm text-muted-foreground mt-1">
                                                        {bonus.description}
                                                    </p>
                                                </div>
                                                <div className="text-sm font-semibold text-primary">
                                                    +{bonus.points} pts
                                                </div>
                                            </div>
                                        )})
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

        if (!shouldNormalizeUpload(file)) {
            return file
        }

        const imageSource = await loadImageSource(file)
        if (!imageSource) {
            return file
        }

        const maxDimension = 1600
        const scale = Math.min(1, maxDimension / Math.max(imageSource.width, imageSource.height))
        const width = Math.max(1, Math.round(imageSource.width * scale))
        const height = Math.max(1, Math.round(imageSource.height * scale))
        const canvas = document.createElement('canvas')

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        if (!context) {
            imageSource.dispose()
            return file
        }

        imageSource.draw(context, width, height)
        imageSource.dispose()

        const compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.82)
        })

        if (!compressedBlob) {
            return file
        }

        if (!requiresFlatImage(file) && compressedBlob.size >= file.size) {
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

function shouldNormalizeUpload(file: File) {
    const type = file.type.toLowerCase()
    const extension = getFileExtension(file.name)

    return type.startsWith('image/')
        || type.startsWith('video/')
        || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'mov', 'mp4'].includes(extension)
}

function requiresFlatImage(file: File) {
    const type = file.type.toLowerCase()
    const extension = getFileExtension(file.name)

    return type === 'image/heic'
        || type === 'image/heif'
        || type.startsWith('video/')
        || ['heic', 'heif', 'mov', 'mp4'].includes(extension)
}

function isImagePreviewable(file: File) {
    const type = file.type.toLowerCase()
    const extension = getFileExtension(file.name)

    return type.startsWith('image/')
        && !['image/heic', 'image/heif'].includes(type)
        && !['heic', 'heif'].includes(extension)
}

function getFileExtension(fileName: string) {
    return fileName.split('.').pop()?.toLowerCase() || ''
}

type DrawableImageSource = {
    width: number
    height: number
    draw: (context: CanvasRenderingContext2D, width: number, height: number) => void
    dispose: () => void
}

async function loadImageSource(file: File): Promise<DrawableImageSource | null> {
    if (typeof createImageBitmap === 'function') {
        try {
            const imageBitmap = await createImageBitmap(file)
            return {
                width: imageBitmap.width,
                height: imageBitmap.height,
                draw: (context, width, height) => context.drawImage(imageBitmap, 0, 0, width, height),
                dispose: () => imageBitmap.close(),
            }
        } catch (error) {
            console.warn('createImageBitmap failed for upload preview normalization:', error)
        }
    }

    if (file.type.startsWith('video/') || ['mov', 'mp4'].includes(getFileExtension(file.name))) {
        return loadVideoFrameSource(file)
    }

    const objectUrl = URL.createObjectURL(file)

    try {
        const image = await loadImageElement(objectUrl)
        return {
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
            draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
            dispose: () => URL.revokeObjectURL(objectUrl),
        }
    } catch (error) {
        URL.revokeObjectURL(objectUrl)
        console.warn('Image element decode failed for upload preview normalization:', error)
        return loadVideoFrameSource(file)
    }
}

async function loadVideoFrameSource(file: File): Promise<DrawableImageSource | null> {
    const objectUrl = URL.createObjectURL(file)

    try {
        const video = await loadVideoElement(objectUrl)
        return {
            width: video.videoWidth || 1,
            height: video.videoHeight || 1,
            draw: (context, width, height) => context.drawImage(video, 0, 0, width, height),
            dispose: () => {
                video.pause()
                video.removeAttribute('src')
                video.load()
                URL.revokeObjectURL(objectUrl)
            },
        }
    } catch (error) {
        URL.revokeObjectURL(objectUrl)
        console.warn('Video frame decode failed for upload normalization:', error)
        return null
    }
}

function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Failed to decode selected image'))
        image.src = objectUrl
    })
}

function loadVideoElement(objectUrl: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        video.muted = true
        video.playsInline = true
        video.preload = 'metadata'
        video.onloadeddata = async () => {
            try {
                video.currentTime = 0
            } catch {
                // Some browsers already expose the first frame on loadeddata.
            }
            resolve(video)
        }
        video.onerror = () => reject(new Error('Failed to decode selected video frame'))
        video.src = objectUrl
    })
}

function getSubmissionErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'An unexpected error occurred. Please try again.'
}
