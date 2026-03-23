'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ImageIcon, LifeBuoy, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Footer, NavbarWithAuthClient } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitHelpRequest } from '@/lib/actions/help-requests'

export default function HelpForm() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [title, setTitle] = useState('')
    const [details, setDetails] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDragActive, setIsDragActive] = useState(false)
    const getSelectedFile = () => file || fileInputRef.current?.files?.[0] || null

    const setSelectedFile = useCallback((selectedFile: File | null) => {
        if (selectedFile) {
            setPreview((previousPreview) => {
                if (previousPreview) {
                    URL.revokeObjectURL(previousPreview)
                }

                return isImagePreviewable(selectedFile)
                    ? URL.createObjectURL(selectedFile)
                    : null
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        const selectedFile = getSelectedFile()
        if (!selectedFile) {
            toast.error('Please upload a screenshot or photo of the issue.')
            return
        }

        setIsSubmitting(true)

        try {
            const normalizedFile = await normalizeImageFile(selectedFile)
            const result = await submitHelpRequest(normalizedFile, title, details)

            if (!result.success) {
                toast.error(result.error || 'Failed to submit help request.')
                setIsSubmitting(false)
                return
            }

            setTitle('')
            setDetails('')
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            setSelectedFile(null)
            toast.success('Help request submitted.')
            router.refresh()
        } catch (error) {
            console.error('Help request submission error:', error)
            toast.error('Failed to submit help request.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <NavbarWithAuthClient />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 max-w-2xl">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl doraemon-gradient mb-4">
                            <LifeBuoy className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Need Help?</h1>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            Report a bug or issue to the ACE admin team. Add a short title, upload a screenshot,
                            and include any extra context that will help us reproduce it.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Issue Summary</CardTitle>
                                <CardDescription>
                                    Keep the title short and specific so admins can scan requests quickly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="help-title">Problem title</Label>
                                    <Input
                                        id="help-title"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder="Example: Submit button stays disabled after uploading a photo"
                                        maxLength={120}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="help-details">More details</Label>
                                    <Textarea
                                        id="help-details"
                                        value={details}
                                        onChange={(event) => setDetails(event.target.value)}
                                        placeholder="What happened, what you expected, and any steps that reliably reproduce it."
                                        rows={4}
                                        maxLength={1000}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Optional, but helpful for tricky issues.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Issue Screenshot</CardTitle>
                                <CardDescription>
                                    Upload a screenshot or photo showing the problem.
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
                                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                                            isDragActive
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic,image/heif,image/webp"
                                            onChange={handleFileInputChange}
                                            className="hidden"
                                        />
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="font-medium mb-1">
                                            {isDragActive ? 'Drop your screenshot here' : 'Drag and drop a screenshot'}
                                        </p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            or click to select a file
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mb-4"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                openFilePicker()
                                            }}
                                        >
                                            Choose File
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            JPG, PNG, WebP, HEIC, or HEIF • Max 10MB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                                            {preview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={preview}
                                                    alt="Issue preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <div className="text-center text-muted-foreground">
                                                        <ImageIcon className="mx-auto mb-2 h-10 w-10" />
                                                        <div className="text-sm font-medium">File ready to upload</div>
                                                        <div className="text-xs">The image will be converted before submission if needed.</div>
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

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-12 doraemon-gradient text-white gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending Request...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Submit Help Request
                                </>
                            )}
                        </Button>
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

        if (!compressedBlob || compressedBlob.size >= file.size) {
            return file
        }

        const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'help-request'

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
        || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension)
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
            console.warn('createImageBitmap failed for help request normalization:', error)
        }
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
        console.warn('Image element decode failed for help request normalization:', error)
        return null
    }
}

function loadImageElement(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image()

        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Failed to load image.'))
        image.src = src
    })
}
