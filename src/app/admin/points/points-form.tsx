'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Minus, Trophy, History, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { adjustPairingPoints } from '@/lib/actions/points'

interface Pairing {
    id: string
    mentorName: string
    familyName: string
    totalPoints: number
}

interface AuditLog {
    id: string
    action: string
    targetId: string
    actorId: string
    details: string
    timestamp: Date
    metadata?: {
        previousPoints: number
        adjustment: number
        newPoints: number
        actorName?: string
    }
}

interface PointsFormProps {
    pairings: Pairing[]
    auditLogs: AuditLog[]
}

export default function PointsForm({ pairings, auditLogs }: PointsFormProps) {
    const [selectedPairingId, setSelectedPairingId] = useState<string>('')
    const [amount, setAmount] = useState<string>('')
    const [reason, setReason] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(true)

    const selectedPairing = pairings.find(p => p.id === selectedPairingId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedPairingId) {
            toast.error('Please select a pairing')
            return
        }

        if (!amount || parseInt(amount) === 0) {
            toast.error('Please enter a valid amount')
            return
        }

        if (!reason.trim()) {
            toast.error('Reason is required for all point adjustments')
            return
        }

        setIsLoading(true)
        try {
            const adjustmentAmount = isAdding ? Math.abs(parseInt(amount)) : -Math.abs(parseInt(amount))

            const result = await adjustPairingPoints({
                pairingId: selectedPairingId,
                amount: adjustmentAmount,
                reason: reason.trim()
            })

            if (result.success) {
                toast.success(`Points ${isAdding ? 'added' : 'deducted'} successfully`)
                setAmount('')
                setReason('')
                setSelectedPairingId('')
            } else {
                toast.error(result.error || 'Failed to adjust points')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            {/* Adjustment Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-[#FFD700]" />
                        Manual Point Adjustment
                    </CardTitle>
                    <CardDescription>
                        Add or deduct points from a pairing. All adjustments require a reason and are logged.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Pairing Select */}
                        <div className="space-y-2">
                            <Label htmlFor="pairing">Select Pairing</Label>
                            <Select value={selectedPairingId} onValueChange={setSelectedPairingId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a pairing..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {pairings.map(pairing => (
                                        <SelectItem key={pairing.id} value={pairing.id}>
                                            {pairing.mentorName} ({pairing.familyName}) - {pairing.totalPoints} pts
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Current Points Display */}
                        {selectedPairing && (
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground">Current Points</div>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-[#FFD700]" />
                                    {selectedPairing.totalPoints}
                                </div>
                            </div>
                        )}

                        {/* Add/Deduct Toggle */}
                        <div className="space-y-2">
                            <Label>Action</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={isAdding ? 'default' : 'outline'}
                                    className={isAdding ? 'bg-green-600 hover:bg-green-700' : ''}
                                    onClick={() => setIsAdding(true)}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Points
                                </Button>
                                <Button
                                    type="button"
                                    variant={!isAdding ? 'default' : 'outline'}
                                    className={!isAdding ? 'bg-red-600 hover:bg-red-700' : ''}
                                    onClick={() => setIsAdding(false)}
                                >
                                    <Minus className="w-4 h-4 mr-1" />
                                    Deduct Points
                                </Button>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                min="1"
                                placeholder="Enter points..."
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        {/* Reason (Required) */}
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="flex items-center gap-1">
                                Reason
                                <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="reason"
                                placeholder="Explain the reason for this adjustment..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                className="min-h-[80px]"
                            />
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Required for audit purposes
                            </p>
                        </div>

                        {/* Preview */}
                        {selectedPairing && amount && (
                            <div className="p-4 border rounded-lg bg-background">
                                <div className="text-sm text-muted-foreground mb-1">Preview</div>
                                <div className="flex items-center gap-2">
                                    <span>{selectedPairing.totalPoints}</span>
                                    <span className={isAdding ? 'text-green-600' : 'text-red-600'}>
                                        {isAdding ? '+' : '-'}{Math.abs(parseInt(amount) || 0)}
                                    </span>
                                    <span>=</span>
                                    <span className="font-bold">
                                        {selectedPairing.totalPoints + (isAdding ? Math.abs(parseInt(amount) || 0) : -Math.abs(parseInt(amount) || 0))}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Button type="submit" disabled={isLoading || !selectedPairingId || !amount || !reason.trim()}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isAdding ? 'Add Points' : 'Deduct Points'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Audit History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Recent Point Adjustments
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Change</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No point adjustments recorded yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                auditLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(log.timestamp)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={log.action === 'POINTS_ADDED' ? 'default' : 'destructive'}>
                                                {log.action === 'POINTS_ADDED' ? 'Added' : 'Deducted'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={log.metadata?.adjustment && log.metadata.adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {log.metadata?.adjustment && log.metadata.adjustment > 0 ? '+' : ''}
                                            {log.metadata?.adjustment}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={log.details}>
                                            {log.details}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {log.metadata?.actorName || 'Admin'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
