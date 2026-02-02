import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi';

/**
 * Returns the OpenAPI specification in JSON format.
 * Can be used with tools like Swagger UI, Redoc, or Postman.
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
