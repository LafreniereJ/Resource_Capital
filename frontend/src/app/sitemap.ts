import { MetadataRoute } from 'next'
import { supabase } from '@/lib/db'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://resourcecapital.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages with their priorities and change frequencies
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${BASE_URL}/stocks`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/companies`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/news`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/map`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/compare`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/reports`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/transactions`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
    ]

    // Fetch all companies for dynamic company pages
    let companyPages: MetadataRoute.Sitemap = []
    try {
        const { data: companies } = await supabase
            .from('companies')
            .select('ticker, last_updated')
            .order('market_cap', { ascending: false, nullsFirst: false })

        if (companies) {
            companyPages = companies.map((company) => ({
                url: `${BASE_URL}/companies/${company.ticker}`,
                lastModified: company.last_updated ? new Date(company.last_updated) : new Date(),
                changeFrequency: 'daily' as const,
                priority: 0.8,
            }))
        }
    } catch (error) {
        console.error('Error fetching companies for sitemap:', error)
    }

    // Fetch all reports for dynamic report pages
    let reportPages: MetadataRoute.Sitemap = []
    try {
        const { data: reports } = await supabase
            .from('reports')
            .select('id, created_at')
            .order('created_at', { ascending: false })

        if (reports) {
            reportPages = reports.map((report) => ({
                url: `${BASE_URL}/reports/${report.id}`,
                lastModified: report.created_at ? new Date(report.created_at) : new Date(),
                changeFrequency: 'monthly' as const,
                priority: 0.6,
            }))
        }
    } catch (error) {
        console.error('Error fetching reports for sitemap:', error)
    }

    // Fetch projects with their company tickers for dynamic project pages
    let projectPages: MetadataRoute.Sitemap = []
    try {
        const { data: projects } = await supabase
            .from('projects')
            .select(`
                id,
                created_at,
                companies!inner(ticker)
            `)
            .order('created_at', { ascending: false })

        if (projects) {
            projectPages = projects.map((project: any) => ({
                url: `${BASE_URL}/companies/${project.companies.ticker}/projects/${project.id}`,
                lastModified: project.created_at ? new Date(project.created_at) : new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.5,
            }))
        }
    } catch (error) {
        console.error('Error fetching projects for sitemap:', error)
    }

    return [...staticPages, ...companyPages, ...reportPages, ...projectPages]
}
