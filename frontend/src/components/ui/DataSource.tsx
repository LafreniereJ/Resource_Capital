'use client';

import { Info } from 'lucide-react';

/**
 * Data source definitions for attribution
 */
export const DATA_SOURCES = {
    yfinance: {
        name: 'Yahoo Finance',
        shortName: 'yfinance',
        url: 'https://finance.yahoo.com',
        description: 'Stock prices, financials, and company data via yfinance',
        delay: '15-min delayed',
    },
    tmx: {
        name: 'TMX Group',
        shortName: 'TMX',
        url: 'https://www.tmx.com',
        description: 'Official TSX/TSXV exchange data and press releases',
        delay: 'Real-time',
    },
    sedar: {
        name: 'SEDAR+',
        shortName: 'SEDAR+',
        url: 'https://www.sedarplus.ca',
        description: 'Canadian securities filings and technical reports',
        delay: 'Same-day',
    },
    miningcom: {
        name: 'Mining.com',
        shortName: 'Mining.com',
        url: 'https://www.mining.com',
        description: 'Mining industry news and analysis',
        delay: 'Real-time',
    },
    kitco: {
        name: 'Kitco',
        shortName: 'Kitco',
        url: 'https://www.kitco.com',
        description: 'Precious metals news and prices',
        delay: 'Real-time',
    },
    internal: {
        name: 'Resource Capital',
        shortName: 'RC',
        url: null,
        description: 'Curated and extracted from technical reports',
        delay: 'On-demand',
    },
} as const;

export type DataSourceId = keyof typeof DATA_SOURCES;

interface DataSourceBadgeProps {
    source: DataSourceId;
    showDelay?: boolean;
    className?: string;
}

/**
 * Small inline badge showing data source
 */
export function DataSourceBadge({ source, showDelay = false, className = '' }: DataSourceBadgeProps) {
    const sourceInfo = DATA_SOURCES[source];
    if (!sourceInfo) return null;

    return (
        <span
            className={`inline-flex items-center gap-1 text-[10px] text-gray-500 ${className}`}
            title={sourceInfo.description}
        >
            <span className="opacity-60">via</span>
            {sourceInfo.url ? (
                <a
                    href={sourceInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                    {sourceInfo.shortName}
                </a>
            ) : (
                <span className="text-gray-400">{sourceInfo.shortName}</span>
            )}
            {showDelay && (
                <span className="text-gray-600">({sourceInfo.delay})</span>
            )}
        </span>
    );
}

interface DataSourceFooterProps {
    sources: DataSourceId[];
    className?: string;
}

/**
 * Footer showing all data sources used on a page
 */
export function DataSourceFooter({ sources, className = '' }: DataSourceFooterProps) {
    if (!sources.length) return null;

    return (
        <div className={`text-xs text-gray-500 border-t border-white/5 pt-4 ${className}`}>
            <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50" />
                <div>
                    <span className="text-gray-400">Data sources: </span>
                    {sources.map((sourceId, index) => {
                        const source = DATA_SOURCES[sourceId];
                        if (!source) return null;
                        return (
                            <span key={sourceId}>
                                {source.url ? (
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-cyan-400 transition-colors"
                                    >
                                        {source.name}
                                    </a>
                                ) : (
                                    <span className="text-gray-400">{source.name}</span>
                                )}
                                <span className="text-gray-600 ml-1">({source.delay})</span>
                                {index < sources.length - 1 && <span className="text-gray-600">, </span>}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

interface DataSourceTooltipProps {
    source: DataSourceId;
    children: React.ReactNode;
}

/**
 * Wrapper that adds tooltip with data source info
 */
export function DataSourceTooltip({ source, children }: DataSourceTooltipProps) {
    const sourceInfo = DATA_SOURCES[source];
    if (!sourceInfo) return <>{children}</>;

    return (
        <div className="group relative inline-block">
            {children}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="font-medium text-white">{sourceInfo.name}</div>
                <div className="text-gray-400">{sourceInfo.delay}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
}

/**
 * Mapping of data types to their sources
 */
export const DATA_TYPE_SOURCES: Record<string, DataSourceId[]> = {
    stockPrice: ['yfinance'],
    metalPrice: ['yfinance'],
    companyInfo: ['yfinance', 'tmx'],
    financials: ['yfinance', 'sedar'],
    news: ['tmx', 'miningcom', 'kitco'],
    projects: ['internal', 'sedar'],
    reserves: ['sedar', 'internal'],
    insiderTransactions: ['sedar'],
};

export default DataSourceBadge;
