'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  analyzeSentiment,
  getSentimentColor,
  getSentimentBgColor,
  SentimentResult,
} from '@/lib/sentiment';

interface SentimentBadgeProps {
  title: string;
  description?: string;
  showScore?: boolean;
  showConfidence?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Displays a sentiment indicator badge for news articles
 */
export function SentimentBadge({
  title,
  description,
  showScore = false,
  showConfidence = false,
  size = 'sm',
  className = '',
}: SentimentBadgeProps) {
  const sentiment = useMemo(
    () => analyzeSentiment(title, description),
    [title, description]
  );

  const Icon = sentiment.label === 'bullish'
    ? TrendingUp
    : sentiment.label === 'bearish'
    ? TrendingDown
    : Minus;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  // Don't show badge for very low confidence neutral sentiment
  if (sentiment.label === 'neutral' && sentiment.confidence < 0.2) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${getSentimentBgColor(sentiment.label)} ${getSentimentColor(sentiment.label)} ${className}`}
      title={`Sentiment: ${sentiment.label} (${Math.round(sentiment.confidence * 100)}% confidence)`}
    >
      <Icon size={iconSizes[size]} />
      <span className="capitalize">{sentiment.label}</span>
      {showScore && (
        <span className="opacity-70">
          ({sentiment.score > 0 ? '+' : ''}{sentiment.score.toFixed(2)})
        </span>
      )}
      {showConfidence && (
        <span className="opacity-50 text-[0.8em]">
          {Math.round(sentiment.confidence * 100)}%
        </span>
      )}
    </span>
  );
}

interface SentimentBarProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Displays sentiment as a visual bar indicator
 */
export function SentimentBar({ title, description, className = '' }: SentimentBarProps) {
  const sentiment = useMemo(
    () => analyzeSentiment(title, description),
    [title, description]
  );

  // Convert score (-1 to 1) to percentage (0 to 100)
  const percentage = ((sentiment.score + 1) / 2) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-red-400">Bearish</span>
        <span className={getSentimentColor(sentiment.label)}>
          {sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)}
        </span>
        <span className="text-green-400">Bullish</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-gradient-to-r from-red-500 via-gray-400 to-green-500 h-full"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div className="relative h-3">
        <div
          className="absolute top-0 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white transform -translate-x-1/2"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface SentimentDetailsProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Shows detailed sentiment analysis with signal breakdown
 */
export function SentimentDetails({ title, description, className = '' }: SentimentDetailsProps) {
  const sentiment = useMemo(
    () => analyzeSentiment(title, description),
    [title, description]
  );

  if (sentiment.signals.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No strong sentiment signals detected
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <SentimentBadge title={title} description={description} size="md" />
        <span className="text-sm text-gray-400">
          Confidence: {Math.round(sentiment.confidence * 100)}%
        </span>
      </div>

      <div className="text-sm">
        <span className="text-gray-500">Key signals:</span>
        <ul className="mt-1 space-y-1">
          {sentiment.signals.map((signal, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className={`w-16 text-right ${
                  signal.weight > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {signal.weight > 0 ? '+' : ''}{signal.weight.toFixed(2)}
              </span>
              <span className="text-gray-300">{signal.keyword}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Export the analyzeSentiment function for direct use
export { analyzeSentiment } from '@/lib/sentiment';
export type { SentimentResult };
