import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Resource Capital - Mining Intelligence Platform'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#050510',
                    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 40,
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 20,
                            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 24,
                        }}
                    >
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <span
                        style={{
                            fontSize: 56,
                            fontWeight: 'bold',
                            color: 'white',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Resource Capital
                    </span>
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: 28,
                        color: '#9ca3af',
                        textAlign: 'center',
                        maxWidth: 800,
                        lineHeight: 1.4,
                    }}
                >
                    Institutional-Grade Mining Intelligence for TSX/TSXV
                </div>

                {/* Features */}
                <div
                    style={{
                        display: 'flex',
                        marginTop: 48,
                        gap: 32,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 24px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                    >
                        <span style={{ color: '#10b981', fontSize: 20 }}>200+ Companies</span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 24px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                        }}
                    >
                        <span style={{ color: '#06b6d4', fontSize: 20 }}>Real-Time Prices</span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 24px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                    >
                        <span style={{ color: '#8b5cf6', fontSize: 20 }}>Project Maps</span>
                    </div>
                </div>

                {/* URL */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        fontSize: 18,
                        color: '#6b7280',
                    }}
                >
                    resourcecapital.com
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
