import { getStocks, getDashboardStats } from '@/lib/db';
import ScreenerClient from './ScreenerClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Advanced Stock Screener | Resource Capital',
    description: 'Screen 200+ TSX/TSXV mining stocks with advanced filters. Filter by market cap, price, change %, commodity, exchange, and more.',
    openGraph: {
        title: 'Advanced Stock Screener | Resource Capital',
        description: 'Professional-grade mining stock screener with multi-filter search.',
        type: 'website',
    },
};

export const revalidate = 60; // Cache for 60 seconds

interface Stock {
    id: number;
    ticker: string;
    name: string;
    exchange: string;
    commodity: string;
    current_price: number | null;
    prev_close: number | null;
    day_change: number | null;
    day_change_percent: number | null;
    day_open: number | null;
    day_high: number | null;
    day_low: number | null;
    day_volume: number | null;
    market_cap: number | null;
    high_52w: number | null;
    low_52w: number | null;
    avg_volume: number | null;
    currency: string;
    last_updated: string | null;
    project_count: number;
}

interface DashboardStats {
    totalCompanies: number;
    totalMarketCap: number;
    totalProjects: number;
    totalNews: number;
}

export default async function ScreenerPage() {
    // Fetch all stocks for client-side advanced filtering
    const stocks = await getStocks({ limit: 500 }) as Stock[];
    const stats = await getDashboardStats() as DashboardStats;

    // Extract unique commodities and exchanges for filter options
    const commodities = [...new Set(stocks.map(s => s.commodity).filter(Boolean))].sort();
    const exchanges = [...new Set(stocks.map(s => s.exchange).filter(Boolean))].sort();

    return (
        <ScreenerClient
            initialStocks={stocks}
            stats={stats}
            commodityOptions={commodities}
            exchangeOptions={exchanges}
        />
    );
}
