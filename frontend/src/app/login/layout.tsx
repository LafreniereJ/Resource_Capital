import { loginMetadata } from '@/lib/metadata'

export const metadata = loginMetadata

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
