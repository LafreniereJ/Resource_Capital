import { compareMetadata } from '@/lib/metadata'

export const metadata = compareMetadata

export default function CompareLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
