/**
 * News Sentiment Analysis
 *
 * Analyzes mining news articles for bullish/bearish sentiment.
 * Uses keyword-based scoring optimized for mining industry news.
 *
 * Sentiment scores range from -1 (very bearish) to +1 (very bullish)
 * - >= 0.3: Bullish
 * - -0.3 to 0.3: Neutral
 * - <= -0.3: Bearish
 */

// Mining-specific bullish keywords with weights
const BULLISH_KEYWORDS: Record<string, number> = {
  // Production & Growth
  'record production': 0.8,
  'record output': 0.8,
  'record quarter': 0.7,
  'production increase': 0.6,
  'output increase': 0.6,
  'expansion': 0.5,
  'ramp-up': 0.5,
  'ramping up': 0.5,
  'ahead of schedule': 0.7,
  'on schedule': 0.3,
  'on budget': 0.3,
  'under budget': 0.6,

  // Exploration & Discoveries
  'high-grade': 0.7,
  'high grade': 0.7,
  'significant intercept': 0.6,
  'discovery': 0.6,
  'new discovery': 0.7,
  'extends mineralization': 0.5,
  'bonanza grade': 0.9,
  'visible gold': 0.7,
  'intercepts': 0.4,
  'drilling success': 0.6,
  'positive results': 0.5,
  'encouraging results': 0.4,

  // Financials & Deals
  'beats estimates': 0.7,
  'exceeds expectations': 0.7,
  'strong earnings': 0.6,
  'profit increase': 0.5,
  'revenue growth': 0.5,
  'dividend increase': 0.6,
  'special dividend': 0.7,
  'share buyback': 0.4,
  'upgrade': 0.5,
  'price target raised': 0.6,
  'buy rating': 0.5,
  'outperform': 0.5,

  // Strategic & Operational
  'strategic acquisition': 0.5,
  'merger': 0.4,
  'joint venture': 0.4,
  'partnership': 0.3,
  'permit approved': 0.6,
  'permitting success': 0.6,
  'feasibility study positive': 0.6,
  'pfs positive': 0.5,
  'dfs positive': 0.6,
  'construction start': 0.5,
  'first pour': 0.7,
  'commercial production': 0.6,

  // Resource & Reserve
  'resource increase': 0.5,
  'reserve increase': 0.6,
  'resource upgrade': 0.5,
  'measured and indicated': 0.3,
  'mineral reserve': 0.3,
  'mine life extension': 0.5,
};

// Mining-specific bearish keywords with weights
const BEARISH_KEYWORDS: Record<string, number> = {
  // Production Issues
  'production decline': -0.6,
  'output decline': -0.6,
  'suspension': -0.7,
  'suspended operations': -0.8,
  'shutdown': -0.7,
  'force majeure': -0.6,
  'operational issues': -0.5,
  'equipment failure': -0.5,
  'geotechnical issues': -0.5,
  'ground conditions': -0.4,
  'weather delays': -0.3,
  'behind schedule': -0.5,
  'over budget': -0.5,

  // Financial Concerns
  'misses estimates': -0.6,
  'below expectations': -0.5,
  'loss': -0.4,
  'write-down': -0.6,
  'impairment': -0.6,
  'cost overrun': -0.5,
  'cash burn': -0.5,
  'liquidity concerns': -0.7,
  'refinancing': -0.4,
  'debt': -0.3,
  'downgrade': -0.5,
  'price target cut': -0.5,
  'sell rating': -0.6,
  'underperform': -0.5,

  // Exploration Disappointments
  'disappointing results': -0.6,
  'no significant': -0.4,
  'narrow intercept': -0.3,
  'low grade': -0.4,
  'uneconomic': -0.6,
  'discontinued': -0.5,

  // Regulatory & Legal
  'permit denied': -0.7,
  'permit delay': -0.5,
  'regulatory issues': -0.5,
  'legal action': -0.5,
  'lawsuit': -0.5,
  'environmental concerns': -0.4,
  'community opposition': -0.4,
  'strike': -0.6,
  'labor dispute': -0.5,

  // Safety & Incidents
  'fatality': -0.8,
  'accident': -0.5,
  'injury': -0.4,
  'safety incident': -0.5,

  // Market Conditions
  'commodity price decline': -0.4,
  'market weakness': -0.3,
  'oversupply': -0.3,
};

// Intensity modifiers
const INTENSIFIERS: Record<string, number> = {
  'very': 1.3,
  'extremely': 1.5,
  'significantly': 1.3,
  'substantially': 1.3,
  'materially': 1.2,
  'dramatically': 1.4,
  'major': 1.2,
  'minor': 0.7,
  'slight': 0.5,
  'modest': 0.7,
  'potential': 0.6,
  'possible': 0.5,
  'expected': 0.8,
  'confirmed': 1.1,
};

// Negation words that flip sentiment
const NEGATIONS = ['not', 'no', "didn't", "doesn't", "won't", 'never', 'without', 'failed to', 'unable to'];

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'bullish' | 'neutral' | 'bearish';
  confidence: number; // 0 to 1
  signals: {
    keyword: string;
    weight: number;
    context?: string;
  }[];
}

/**
 * Analyze sentiment of a news article
 */
export function analyzeSentiment(title: string, description?: string): SentimentResult {
  const text = `${title} ${description || ''}`.toLowerCase();
  const words = text.split(/\s+/);
  const signals: SentimentResult['signals'] = [];

  let totalScore = 0;
  let matchCount = 0;

  // Check for bullish keywords
  for (const [keyword, weight] of Object.entries(BULLISH_KEYWORDS)) {
    if (text.includes(keyword)) {
      let adjustedWeight = weight;

      // Check for negation
      const keywordIndex = text.indexOf(keyword);
      const precedingText = text.slice(Math.max(0, keywordIndex - 20), keywordIndex);
      const hasNegation = NEGATIONS.some(neg => precedingText.includes(neg));
      if (hasNegation) {
        adjustedWeight = -weight * 0.8;
      }

      // Check for intensifiers
      for (const [intensifier, multiplier] of Object.entries(INTENSIFIERS)) {
        if (precedingText.includes(intensifier)) {
          adjustedWeight *= multiplier;
          break;
        }
      }

      signals.push({ keyword, weight: adjustedWeight });
      totalScore += adjustedWeight;
      matchCount++;
    }
  }

  // Check for bearish keywords
  for (const [keyword, weight] of Object.entries(BEARISH_KEYWORDS)) {
    if (text.includes(keyword)) {
      let adjustedWeight = weight;

      // Check for negation (flips bearish to bullish)
      const keywordIndex = text.indexOf(keyword);
      const precedingText = text.slice(Math.max(0, keywordIndex - 20), keywordIndex);
      const hasNegation = NEGATIONS.some(neg => precedingText.includes(neg));
      if (hasNegation) {
        adjustedWeight = -weight * 0.8;
      }

      // Check for intensifiers
      for (const [intensifier, multiplier] of Object.entries(INTENSIFIERS)) {
        if (precedingText.includes(intensifier)) {
          adjustedWeight *= multiplier;
          break;
        }
      }

      signals.push({ keyword, weight: adjustedWeight });
      totalScore += adjustedWeight;
      matchCount++;
    }
  }

  // Normalize score to -1 to 1 range
  const normalizedScore = matchCount > 0
    ? Math.max(-1, Math.min(1, totalScore / Math.sqrt(matchCount)))
    : 0;

  // Calculate confidence based on match count and signal strength
  const confidence = Math.min(1, matchCount * 0.15 + Math.abs(normalizedScore) * 0.3);

  // Determine label
  let label: SentimentResult['label'];
  if (normalizedScore >= 0.25) {
    label = 'bullish';
  } else if (normalizedScore <= -0.25) {
    label = 'bearish';
  } else {
    label = 'neutral';
  }

  return {
    score: Math.round(normalizedScore * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    signals: signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 5),
  };
}

/**
 * Get sentiment color for UI display
 */
export function getSentimentColor(label: SentimentResult['label']): string {
  switch (label) {
    case 'bullish':
      return 'text-green-400';
    case 'bearish':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get sentiment background color for UI display
 */
export function getSentimentBgColor(label: SentimentResult['label']): string {
  switch (label) {
    case 'bullish':
      return 'bg-green-500/10 border-green-500/30';
    case 'bearish':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-gray-500/10 border-gray-500/30';
  }
}

/**
 * Get sentiment icon/emoji
 */
export function getSentimentIcon(label: SentimentResult['label']): string {
  switch (label) {
    case 'bullish':
      return '📈';
    case 'bearish':
      return '📉';
    default:
      return '➖';
  }
}
