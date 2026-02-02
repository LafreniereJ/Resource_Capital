import type { Metadata } from 'next'

const siteConfig = {
    name: 'Resource Capital',
    description: 'Institutional-grade mining intelligence platform for TSX/TSXV companies. Real-time stock prices, project maps, company analysis, and market data.',
    url: 'https://resourcecapital.com', // Update with actual domain
    ogImage: '/og-image.png',
    twitterHandle: '@resourcecapital',
}

interface PageMetadataOptions {
    title: string
    description: string
    path?: string
    ogImage?: string
    noIndex?: boolean
}

export function generatePageMetadata({
    title,
    description,
    path = '',
    ogImage,
    noIndex = false,
}: PageMetadataOptions): Metadata {
    const url = `${siteConfig.url}${path}`
    const fullTitle = `${title} | ${siteConfig.name}`
    const image = ogImage || siteConfig.ogImage

    return {
        title: fullTitle,
        description,
        keywords: [
            'mining stocks',
            'TSX mining',
            'TSXV stocks',
            'mining investment',
            'gold stocks',
            'silver stocks',
            'copper stocks',
            'mining companies Canada',
            'mining projects',
            'resource capital',
        ],
        authors: [{ name: 'Resource Capital' }],
        creator: 'Resource Capital',
        publisher: 'Resource Capital',
        robots: noIndex ? 'noindex, nofollow' : 'index, follow',
        openGraph: {
            type: 'website',
            locale: 'en_US',
            url,
            title: fullTitle,
            description,
            siteName: siteConfig.name,
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            images: [image],
            creator: siteConfig.twitterHandle,
        },
        alternates: {
            canonical: url,
        },
    }
}

// Pre-built metadata for common pages
export const stocksMetadata = generatePageMetadata({
    title: 'Stock List',
    description: 'Browse 200+ TSX/TSXV mining stocks. Real-time prices, daily changes, market cap, and volume data for Canadian mining companies.',
    path: '/stocks',
})

export const screenerMetadata = generatePageMetadata({
    title: 'Advanced Stock Screener',
    description: 'Professional-grade mining stock screener with advanced filters. Filter by market cap, price, change %, commodity, exchange, 52-week range, and more.',
    path: '/screener',
})

export const companiesMetadata = generatePageMetadata({
    title: 'Mining Companies',
    description: 'Comprehensive directory of Canadian mining companies. Browse gold, silver, copper, and base metals producers on TSX and TSXV exchanges.',
    path: '/companies',
})

export const mapMetadata = generatePageMetadata({
    title: 'Mining Project Map',
    description: 'Interactive map of mining projects across Canada. Explore gold, silver, copper, and lithium deposits with detailed project information.',
    path: '/map',
})

export const compareMetadata = generatePageMetadata({
    title: 'Company Comparison',
    description: 'Compare mining companies side by side. Analyze financials, valuations, and performance metrics to make informed investment decisions.',
    path: '/compare',
})

export const newsMetadata = generatePageMetadata({
    title: 'Mining News',
    description: 'Latest mining industry news and press releases. Stay informed on TSX/TSXV mining company announcements, market updates, and industry trends.',
    path: '/news',
})

export const reportsMetadata = generatePageMetadata({
    title: 'Research Reports',
    description: 'In-depth mining research reports and analysis. Access company deep dives, sector reviews, and market intelligence.',
    path: '/reports',
})

export const transactionsMetadata = generatePageMetadata({
    title: 'M&A Transactions',
    description: 'Track mining mergers, acquisitions, and corporate transactions. Monitor deal activity across the Canadian mining sector.',
    path: '/transactions',
})

export const watchlistMetadata = generatePageMetadata({
    title: 'My Watchlist',
    description: 'Track your favorite mining companies and projects. Monitor prices and get alerts on stocks that matter to you.',
    path: '/watchlist',
    noIndex: true, // User-specific page
})

export const profileMetadata = generatePageMetadata({
    title: 'My Profile',
    description: 'Manage your Resource Capital account settings and preferences.',
    path: '/profile',
    noIndex: true,
})

export const settingsMetadata = generatePageMetadata({
    title: 'Settings',
    description: 'Customize your Resource Capital experience. Set preferences for display, notifications, and more.',
    path: '/settings',
    noIndex: true,
})

// Auth page metadata (noIndex for privacy)
export const loginMetadata = generatePageMetadata({
    title: 'Sign In',
    description: 'Sign in to your Resource Capital account to access mining intelligence, watchlists, and personalized insights.',
    path: '/login',
    noIndex: true,
})

export const signupMetadata = generatePageMetadata({
    title: 'Create Account',
    description: 'Join Resource Capital to access institutional-grade mining intelligence. Track stocks, build watchlists, and stay ahead of the market.',
    path: '/signup',
    noIndex: true,
})

export const forgotPasswordMetadata = generatePageMetadata({
    title: 'Reset Password',
    description: 'Reset your Resource Capital account password.',
    path: '/forgot-password',
    noIndex: true,
})

export const updatePasswordMetadata = generatePageMetadata({
    title: 'Update Password',
    description: 'Set a new password for your Resource Capital account.',
    path: '/update-password',
    noIndex: true,
})

export const verifyEmailMetadata = generatePageMetadata({
    title: 'Verify Email',
    description: 'Verify your email address to complete your Resource Capital account setup.',
    path: '/verify-email',
    noIndex: true,
})

// Homepage metadata
export const homeMetadata = generatePageMetadata({
    title: 'Mining Intelligence Platform',
    description: 'Institutional-grade mining intelligence platform for TSX/TSXV companies. Real-time stock prices, interactive project maps, company analysis, and market data for Canadian mining investors.',
    path: '/',
})

// Dynamic metadata generators
export function generateCompanyMetadata(ticker: string, name: string, commodity?: string): Metadata {
    const commodityText = commodity ? ` (${commodity})` : ''
    return generatePageMetadata({
        title: `${ticker} - ${name}`,
        description: `Detailed analysis of ${name} (${ticker})${commodityText}. Stock price, financials, projects, and news for this TSX/TSXV mining company.`,
        path: `/companies/${ticker}`,
    })
}

export function generateProjectMetadata(projectName: string, companyName: string, ticker: string): Metadata {
    return generatePageMetadata({
        title: `${projectName} - ${companyName}`,
        description: `Explore the ${projectName} mining project owned by ${companyName} (${ticker}). Location, resources, development stage, and key metrics.`,
        path: `/companies/${ticker}/projects`,
    })
}

export function generateReportMetadata(title: string, id: number): Metadata {
    return generatePageMetadata({
        title,
        description: `Read the full research report: ${title}. In-depth analysis and insights for mining investors.`,
        path: `/reports/${id}`,
    })
}
