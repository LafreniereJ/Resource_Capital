import { updatePasswordMetadata } from '@/lib/metadata'

export const metadata = updatePasswordMetadata

export default function UpdatePasswordLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
