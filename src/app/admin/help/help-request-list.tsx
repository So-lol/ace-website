'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, Eye, FileImage, LifeBuoy, Mail, UserRound, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { AdminHelpRequestListItem } from '@/lib/actions/help-requests'

interface HelpRequestListProps {
    helpRequests: AdminHelpRequestListItem[]
}

function formatDateTime(date: Date) {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

export default function HelpRequestList({ helpRequests }: HelpRequestListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [viewImageOpen, setViewImageOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<AdminHelpRequestListItem | null>(null)

    const filteredRequests = helpRequests.filter((request) => {
        const searchLower = searchTerm.toLowerCase()

        return request.title.toLowerCase().includes(searchLower)
            || request.details.toLowerCase().includes(searchLower)
            || request.submitter.name.toLowerCase().includes(searchLower)
            || request.submitter.email.toLowerCase().includes(searchLower)
    })

    const openViewImage = (request: AdminHelpRequestListItem) => {
        setSelectedRequest(request)
        setViewImageOpen(true)
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, details, or submitter..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
            </div>

            {filteredRequests.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <LifeBuoy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold mb-2">No help requests found</h3>
                        <p className="text-muted-foreground">
                            New user-reported issues will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <Card key={request.id} className="overflow-hidden">
                            <div className="flex flex-col lg:flex-row">
                                <div
                                    className="w-full lg:w-72 h-56 bg-muted shrink-0 relative cursor-pointer hover:opacity-90 transition-opacity group"
                                    onClick={() => openViewImage(request)}
                                >
                                    {request.imageUrl ? (
                                        <Image
                                            src={request.imageUrl}
                                            alt={request.title}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FileImage className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Eye className="w-8 h-8 text-white" />
                                    </div>
                                </div>

                                <CardContent className="flex-1 p-5">
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-2">{request.title}</h2>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {request.details || 'No additional details provided.'}
                                            </p>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <UserRound className="w-4 h-4" />
                                                <span>{request.submitter.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                <span>{request.submitter.email}</span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                            Submitted {formatDateTime(request.createdAt)}
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={viewImageOpen} onOpenChange={setViewImageOpen}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/90 border-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{selectedRequest?.title || 'Help request image'}</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-[80vh]">
                        {selectedRequest?.imageUrl && (
                            <Image
                                src={selectedRequest.imageUrl}
                                alt={selectedRequest.title}
                                fill
                                unoptimized
                                className="object-contain"
                            />
                        )}
                        <button
                            type="button"
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 text-foreground flex items-center justify-center hover:bg-background"
                            onClick={() => setViewImageOpen(false)}
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
