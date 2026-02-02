import { getCompanies, getNews, getStocks } from '@/lib/db';
import LandingClient from './LandingClient';
import { homeMetadata } from '@/lib/metadata';

export const metadata = homeMetadata;
export const revalidate = 60; // Cache for 60 seconds

interface Stock {
  id: number;
  ticker: string;
  name: string;
  commodity: string;
  current_price: number | null;
  day_change_percent: number | null;
  market_cap: number | null;
}

interface NewsArticle {
  id: number;
  ticker: string;
  title: string;
  description: string;
  source: string;
  url: string;
  published_at: string;
  image_url?: string;
}

const MOCK_STOCKS: Stock[] = [
  { id: 1, ticker: 'NEM', name: 'Newmont Corporation', commodity: 'Gold', current_price: 52.40, day_change_percent: 2.5, market_cap: 60000000000 },
  { id: 2, ticker: 'FCX', name: 'Freeport-McMoRan', commodity: 'Copper', current_price: 48.15, day_change_percent: -1.8, market_cap: 72000000000 },
  { id: 3, ticker: 'TECK', name: 'Teck Resources', commodity: 'Diversified', current_price: 65.30, day_change_percent: 1.2, market_cap: 34000000000 },
  { id: 4, ticker: 'CCO', name: 'Cameco', commodity: 'Uranium', current_price: 54.20, day_change_percent: -0.5, market_cap: 23000000000 },
  { id: 5, ticker: 'AEM', name: 'Agnico Eagle', commodity: 'Gold', current_price: 78.90, day_change_percent: 3.1, market_cap: 39000000000 },
];

const MOCK_NEWS: NewsArticle[] = [
  { id: 1, ticker: 'NEM', title: 'Gold Prices Surge Amid Economic Uncertainty', description: 'Markets react to latest Fed announcements...', source: 'Mining Weekly', url: '#', published_at: new Date().toISOString() },
  { id: 2, ticker: 'FCX', title: 'Copper Demand Expected to Rise in 2025', description: 'Electric vehicle production drives demand...', source: 'Reuters', url: '#', published_at: new Date().toISOString() },
];

export default async function Home() {
  const isVercel = process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_URL;
  let stocks: Stock[] = [];
  let news: NewsArticle[] = [];

  if (isVercel) {
    stocks = MOCK_STOCKS;
    news = MOCK_NEWS;
  } else {
    try {
      stocks = await getStocks({ limit: 100 }) as Stock[];
      news = await getNews({ limit: 5 }) as NewsArticle[];
    } catch (e) {
      stocks = MOCK_STOCKS;
      news = MOCK_NEWS;
    }
  }

  return <LandingClient stocks={stocks} news={news} />;
}
