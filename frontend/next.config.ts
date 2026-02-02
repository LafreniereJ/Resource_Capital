import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    resolveAlias: {
      'better-sqlite3': './src/lib/sqlite-stub.ts',
    },
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Only upload source maps in production
  silent: !process.env.CI,

  // Upload source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map upload
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hides source maps from production builds
  hideSourceMaps: true,

  // Automatically tree-shake unused Sentry code
  disableLogger: true,

  // Route browser requests to Sentry through a Next.js rewrite
  // to avoid ad-blockers blocking Sentry requests
  tunnelRoute: "/monitoring",

  // Automatically annotate React components with Sentry data
  reactComponentAnnotation: {
    enabled: true,
  },

  // Disable auto-instrumentation in development
  autoInstrumentServerFunctions: process.env.NODE_ENV === 'production',
  autoInstrumentMiddleware: process.env.NODE_ENV === 'production',
};

// Only wrap with Sentry if DSN is configured
const exportedConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default exportedConfig;
