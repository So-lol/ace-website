import { getMediaDistributionOverview, getMediaLibrary, getMediaStats } from '@/lib/actions/media'
import MediaList from './media-list'

export default async function MediaAdminPage() {
    const [media, stats, distribution] = await Promise.all([
        getMediaLibrary(),
        getMediaStats(),
        getMediaDistributionOverview(),
    ])

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Media Management</h1>
                <p className="text-muted-foreground">
                    View submitted images, manage archive status, run integrity checks, and sync files to Google Drive.
                </p>
            </div>

            <MediaList media={media} stats={stats} distribution={distribution} />
        </div>
    )
}
