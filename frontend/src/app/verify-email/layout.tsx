import { verifyEmailMetadata } from '@/lib/metadata'

export const metadata = verifyEmailMetadata

export default function VerifyEmailLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
