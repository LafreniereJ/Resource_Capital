/**
 * OpenAPI 3.0 Specification for Resource Capital API
 *
 * This document describes the public API endpoints available for
 * accessing mining company data, stock prices, news, and more.
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Resource Capital API',
    description: `
# Resource Capital Mining Intelligence API

Access comprehensive mining industry data including:
- **Stock Data**: Real-time and historical prices for 200+ TSX/TSXV mining companies
- **Metal Prices**: Live commodity prices (Gold, Silver, Copper, Platinum, Palladium, Nickel, Uranium)
- **News**: Aggregated mining industry news from trusted sources
- **Company Profiles**: Detailed company information, projects, and financials

## Authentication

Public endpoints require no authentication. Rate limits apply:
- **Free tier**: 60 requests/minute
- **Pro tier**: 1,000 requests/day
- **Institutional tier**: 10,000 requests/day

For authenticated requests, include your API key in the header:
\`\`\`
X-API-Key: your_api_key_here
\`\`\`

## Rate Limiting

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets
    `,
    version: '1.0.0',
    contact: {
      name: 'Resource Capital Support',
      email: 'api@resourcecapital.com',
      url: 'https://resourcecapital.com/support',
    },
    license: {
      name: 'Proprietary',
      url: 'https://resourcecapital.com/terms',
    },
  },
  servers: [
    {
      url: 'https://resourcecapital.com/api',
      description: 'Production server',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Development server',
    },
  ],
  tags: [
    { name: 'Stocks', description: 'Stock price and market data' },
    { name: 'Companies', description: 'Company profiles and details' },
    { name: 'Metals', description: 'Commodity prices' },
    { name: 'News', description: 'Mining industry news' },
    { name: 'Search', description: 'Search functionality' },
    { name: 'Projects', description: 'Mining project data' },
    { name: 'Health', description: 'API status endpoints' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check',
        description: 'Check API health status. Used by uptime monitoring services.',
        tags: ['Health'],
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus',
                },
              },
            },
          },
          503: {
            description: 'API is unhealthy',
          },
        },
      },
    },
    '/stocks': {
      get: {
        summary: 'List Stocks',
        description: 'Get paginated list of mining stocks with optional filtering and sorting.',
        tags: ['Stocks'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          {
            name: 'sort',
            in: 'query',
            description: 'Sort field',
            schema: {
              type: 'string',
              enum: ['ticker', 'name', 'current_price', 'day_change_percent', 'market_cap', 'volume'],
              default: 'ticker',
            },
          },
          {
            name: 'order',
            in: 'query',
            description: 'Sort order',
            schema: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
          },
          {
            name: 'commodity',
            in: 'query',
            description: 'Filter by primary commodity',
            schema: { type: 'string' },
          },
          {
            name: 'exchange',
            in: 'query',
            description: 'Filter by exchange (TSX, TSXV)',
            schema: { type: 'string', enum: ['TSX', 'TSXV'] },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search by ticker or company name',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of stocks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stocks: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Stock' },
                    },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stocks/{ticker}': {
      get: {
        summary: 'Get Stock Details',
        description: 'Get detailed information for a specific stock by ticker symbol.',
        tags: ['Stocks'],
        parameters: [
          {
            name: 'ticker',
            in: 'path',
            required: true,
            description: 'Stock ticker symbol (e.g., ABX, NEM)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Stock details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StockDetail' },
              },
            },
          },
          404: {
            description: 'Stock not found',
          },
        },
      },
    },
    '/stocks/{ticker}/price': {
      get: {
        summary: 'Get Price History',
        description: 'Get historical price data for a stock.',
        tags: ['Stocks'],
        parameters: [
          {
            name: 'ticker',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'period',
            in: 'query',
            description: 'Time period',
            schema: {
              type: 'string',
              enum: ['1d', '5d', '1m', '3m', '6m', '1y', '5y'],
              default: '1y',
            },
          },
        ],
        responses: {
          200: {
            description: 'Price history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    prices: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          open: { type: 'number' },
                          high: { type: 'number' },
                          low: { type: 'number' },
                          close: { type: 'number' },
                          volume: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/metals': {
      get: {
        summary: 'Get Metal Prices',
        description: 'Get current prices for all tracked commodities.',
        tags: ['Metals'],
        responses: {
          200: {
            description: 'List of metal prices',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MetalPrice' },
                },
              },
            },
          },
        },
      },
    },
    '/news': {
      get: {
        summary: 'Get News Articles',
        description: 'Get mining industry news articles with optional filtering.',
        tags: ['News'],
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
          },
          {
            name: 'ticker',
            in: 'query',
            description: 'Filter by company ticker',
            schema: { type: 'string' },
          },
          {
            name: 'source',
            in: 'query',
            description: 'Filter by news source',
            schema: { type: 'string' },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search in title and description',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'List of news articles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/NewsArticle' },
                },
              },
            },
          },
        },
      },
    },
    '/search': {
      get: {
        summary: 'Global Search',
        description: 'Search across companies and news.',
        tags: ['Search'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query (min 2 characters)',
            schema: { type: 'string', minLength: 2 },
          },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: {
          200: {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    companies: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SearchResult' },
                    },
                    news: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SearchResult' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/projects/geo': {
      get: {
        summary: 'Get Project Locations',
        description: 'Get all mining projects with geographic coordinates for mapping.',
        tags: ['Projects'],
        responses: {
          200: {
            description: 'List of project locations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/GeoProject' },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number (1-indexed)',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
    schemas: {
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
          },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            properties: {
              database: { type: 'boolean' },
              api: { type: 'boolean' },
            },
          },
          version: { type: 'string' },
          responseTime: { type: 'integer', description: 'Response time in ms' },
        },
      },
      Stock: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          ticker: { type: 'string', example: 'ABX' },
          name: { type: 'string', example: 'Barrick Gold Corporation' },
          exchange: { type: 'string', enum: ['TSX', 'TSXV'] },
          commodity: { type: 'string', example: 'Gold' },
          current_price: { type: 'number', example: 23.45 },
          prev_close: { type: 'number' },
          day_change: { type: 'number' },
          day_change_percent: { type: 'number', example: 2.5 },
          market_cap: { type: 'number', example: 42000000000 },
          volume: { type: 'integer' },
          currency: { type: 'string', example: 'CAD' },
          last_updated: { type: 'string', format: 'date-time' },
        },
      },
      StockDetail: {
        allOf: [
          { $ref: '#/components/schemas/Stock' },
          {
            type: 'object',
            properties: {
              description: { type: 'string' },
              website: { type: 'string', format: 'uri' },
              high_52w: { type: 'number' },
              low_52w: { type: 'number' },
              avg_volume: { type: 'integer' },
              pe_ratio: { type: 'number' },
              eps: { type: 'number' },
              dividend_yield: { type: 'number' },
              projects: {
                type: 'array',
                items: { $ref: '#/components/schemas/ProjectSummary' },
              },
            },
          },
        ],
      },
      MetalPrice: {
        type: 'object',
        properties: {
          commodity: { type: 'string', example: 'Gold' },
          symbol: { type: 'string', example: 'GC=F' },
          price: { type: 'number', example: 2024.5 },
          currency: { type: 'string', example: 'USD' },
          change_percent: { type: 'number', example: 0.45 },
          day_high: { type: 'number' },
          day_low: { type: 'number' },
          prev_close: { type: 'number' },
          fetched_at: { type: 'string', format: 'date-time' },
        },
      },
      NewsArticle: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          source: { type: 'string', example: 'Mining.com' },
          ticker: { type: 'string', nullable: true },
          published_at: { type: 'string', format: 'date-time' },
          image_url: { type: 'string', format: 'uri', nullable: true },
        },
      },
      SearchResult: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['company', 'news'] },
          id: { type: 'integer' },
          name: { type: 'string' },
          ticker: { type: 'string', nullable: true },
          subtitle: { type: 'string', nullable: true },
          url: { type: 'string' },
        },
      },
      ProjectSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          location: { type: 'string' },
          stage: { type: 'string', enum: ['Exploration', 'Development', 'Production', 'Closure'] },
          commodity: { type: 'string' },
        },
      },
      GeoProject: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          company_name: { type: 'string' },
          ticker: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          location: { type: 'string' },
          stage: { type: 'string' },
          commodity: { type: 'string' },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authenticated requests',
      },
    },
  },
};

export default openApiSpec;
