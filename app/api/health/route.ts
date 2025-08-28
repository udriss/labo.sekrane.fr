import { NextResponse } from 'next/server';

export async function GET() {
  // Simple health check without WebSocket dependency
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
