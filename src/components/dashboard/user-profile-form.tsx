'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Link as LinkIcon, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { updateUserProfile } from '@/lib/actions/users'
import { UserDoc } from '@/types/firestore'

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    pronouns: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    majorsMinors: z.string().optional(),
    socialLinks: z.array(z.object({
        url: z.string().url('Invalid URL').or(z.literal(''))
    })).max(5, 'Maximum 5 social links allowed')
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface UserProfileFormProps {
    user: Omit<UserDoc, 'createdAt' | 'updatedAt'> & {
        id: string
        createdAt: any // Allow serialized non-Timestamp values
        updatedAt: any
    }
}

export function UserProfileForm({ user }: UserProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user.name || '',
            pronouns: user.pronouns || '',
            email: user.email || '',
            phone: user.phone || '',
            majorsMinors: user.majorsMinors || '',
            socialLinks: user.socialLinks?.map(url => ({ url })) || []
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'socialLinks'
    })

    async function onSubmit(data: ProfileFormValues) {
        setIsLoading(true)
        try {
            // Map socialLinks back to string array for backend
            // Filter out empty social links before saving
            const payload = {
                ...data,
                socialLinks: data.socialLinks.map(link => link.url).filter(url => url.length > 0)
            }
            const result = await updateUserProfile(user.id, payload as any)
            if (result.success) {
                toast.success('Profile updated successfully!')
            } else {
                toast.error(result.error || 'Failed to update profile')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="doraemon-shadow border-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Save className="w-5 h-5 text-primary" />
                    Edit Profile
                </CardTitle>
                <CardDescription>
                    Update your personal information and social accounts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                {...form.register('name')}
                                className="h-11"
                                placeholder="Your name"
                            />
                            {form.formState.errors.name && (
                                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pronouns">Pronouns</Label>
                            <Input
                                id="pronouns"
                                {...form.register('pronouns')}
                                className="h-11"
                                placeholder="e.g. He/Him, They/Them"
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                {...form.register('email')}
                                className="h-11"
                                placeholder="your@email.com"
                            />
                            {form.formState.errors.email && (
                                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                {...form.register('phone')}
                                className="h-11"
                                placeholder="e.g. (123) 456-7890"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="majorsMinors">Majors / Minors</Label>
                        <Input
                            id="majorsMinors"
                            {...form.register('majorsMinors')}
                            className="h-11"
                            placeholder="e.g. Computer Science, Asian American Studies"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Social accounts</Label>
                            {fields.length < 5 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ url: '' })}
                                    className="gap-1 text-xs"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Link
                                </Button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            {...form.register(`socialLinks.${index}.url` as const)}
                                            placeholder="https://instagram.com/yourhandle"
                                            className="h-10"
                                        />
                                        {form.formState.errors.socialLinks?.[index]?.url && (
                                            <p className="text-xs text-destructive mt-1">
                                                {form.formState.errors.socialLinks[index]?.url?.message}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        className="text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed rounded-xl bg-muted/30">
                                    <p className="text-sm text-muted-foreground">No social accounts added.</p>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        onClick={() => append({ url: '' })}
                                        className="text-xs"
                                    >
                                        Click here to add one
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button
                            type="submit"
                            className="doraemon-gradient text-white doraemon-glow px-8 h-11"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
