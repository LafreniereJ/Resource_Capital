import { getNews } from '@/lib/db';
import NewsClient from './NewsClient';
import { newsMetadata } from '@/lib/metadata';

export const metadata = newsMetadata;
export const revalidate = 60; // Cache for 60 seconds

interface NewsArticle {
    id: number;
    ticker: string;
    title: string;
    description: string;
    source: string;
    url: string;
    published_at: string;
    image_url?: string;
    category?: string;
}

export default async function NewsPage() {
    const initialNews = await getNews({ limit: 20 }) as NewsArticle[];

    return <NewsClient initialNews={initialNews} />;
}
