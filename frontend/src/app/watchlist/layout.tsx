import { watchlistMetadata } from '@/lib/metadata'

export const metadata = watchlistMetadata

export default function WatchlistLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
