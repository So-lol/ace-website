import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
                <Loader2 className="w-16 h-16 text-primary animate-spin absolute top-0 left-0" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Loading...</h3>
                <p className="text-sm text-muted-foreground">Preparing your community experience 💕</p>
            </div>
        </div>
    )
}
