import { getMediaLibrary, getMediaStats } from '@/lib/actions/media'
import MediaList from './media-list'

export default async function MediaAdminPage() {
    const [media, stats] = await Promise.all([
        getMediaLibrary() as Promise<any[]>,
        getMediaStats()
    ])

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Media Management</h1>
                <p className="text-muted-foreground">
                    View submitted images, manage archive status, and enforce retention policy.
                </p>
            </div>

            <MediaList media={media} stats={stats} />
        </div>
    )
}
