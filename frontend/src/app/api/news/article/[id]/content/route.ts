import { NextResponse } from 'next/server';
import { getNewsById } from '@/lib/db';
import * as cheerio from 'cheerio';

interface NewsArticle {
    id: number;
    title: string;
    description: string;
    url: string;
    source: string;
    published_at: string;
    ticker?: string;
    image_url?: string;
}

function formatTimeAgo(dateStr: string): string {
    if (!dateStr) return 'Recently';

    try {
        const pubDate = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - pubDate.getTime();

        // Handle future dates (timezone issues)
        if (diffMs < 0) return 'Just now';

        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return 'Recently';
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
        return NextResponse.json(
            { error: 'Invalid article ID' },
            { status: 400 }
        );
    }

    try {
        const article = await getNewsById(articleId) as NewsArticle | undefined;

        if (!article) {
            return NextResponse.json(
                { error: 'Article not found' },
                { status: 404 }
            );
        }

        const url = article.url;

        if (!url) {
            return NextResponse.json({
                title: article.title,
                source: article.source,
                published_at: article.published_at,
                time_ago: formatTimeAgo(article.published_at),
                ticker: article.ticker,
                content: article.description || '',
                content_type: 'summary',
                original_url: url
            });
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove script, style, nav, footer elements
            $('script, style, nav, footer, header, aside, iframe, noscript').remove();

            // Try to find article content (common selectors)
            let content = null;
            const selectors = ['article', '.article-content', '.post-content', '.entry-content',
                             '.article-body', '.story-body', 'main', '.content'];

            for (const selector of selectors) {
                const elem = $(selector);
                if (elem.length > 0) {
                    content = elem;
                    break;
                }
            }

            if (!content) {
                content = $('body');
            }

            // Extract paragraphs
            const paragraphs: string[] = [];
            content.find('p, h2, h3, blockquote, ul, ol').each((_, elem) => {
                const text = $(elem).text().trim();
                if (text) {
                    paragraphs.push(text);
                }
            });

            const textContent = paragraphs.join('\n\n');

            // Get article image if present
            let imageUrl = article.image_url;
            const ogImage = $('meta[property="og:image"]').attr('content');
            if (ogImage) {
                imageUrl = ogImage;
            }

            return NextResponse.json({
                title: article.title,
                source: article.source,
                published_at: article.published_at,
                time_ago: formatTimeAgo(article.published_at),
                ticker: article.ticker,
                content: textContent.slice(0, 15000), // Limit content length
                content_type: 'full',
                image_url: imageUrl,
                original_url: url
            });

        } catch (fetchError) {
            // Fallback to description if fetch fails
            return NextResponse.json({
                title: article.title,
                source: article.source,
                published_at: article.published_at,
                time_ago: formatTimeAgo(article.published_at),
                ticker: article.ticker,
                content: article.description || '',
                content_type: 'summary',
                image_url: article.image_url,
                original_url: url,
                error: `Could not fetch full article: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
            });
        }

    } catch (error) {
        console.error('Error fetching article:', error);
        return NextResponse.json(
            { error: 'Failed to fetch article' },
            { status: 500 }
        );
    }
}
