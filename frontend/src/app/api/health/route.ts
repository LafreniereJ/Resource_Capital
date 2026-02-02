import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

/**
 * Public Health Check Endpoint
 *
 * This endpoint is designed for external uptime monitoring services like:
 * - UptimeRobot
 * - Pingdom
 * - BetterStack (formerly BetterUptime)
 * - AWS Route53 Health Checks
 *
 * It returns a simple status that monitoring services can parse.
 * For detailed health info, use /api/admin/system-health (requires auth)
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    api: boolean;
  };
  version: string;
  responseTime?: number;
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();

  let dbHealthy = false;

  try {
    // Quick database connectivity check
    const { error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    dbHealthy = !error;
  } catch {
    dbHealthy = false;
  }

  const responseTime = Date.now() - startTime;

  // API is always healthy if we can respond
  const apiHealthy = true;

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (dbHealthy && apiHealthy) {
    status = 'healthy';
  } else if (apiHealthy) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy,
      api: apiHealthy,
    },
    version: process.env.npm_package_version || '1.0.0',
    responseTime,
  };

  // Return appropriate HTTP status code for monitoring services
  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// HEAD request for simple ping checks
export async function HEAD(): Promise<NextResponse> {
  try {
    const { error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    return new NextResponse(null, {
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
