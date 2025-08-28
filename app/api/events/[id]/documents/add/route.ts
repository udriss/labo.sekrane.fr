// Deprecated: use /api/events/[id]/documents (POST) instead.
// Keeping file to avoid 404 if older frontend still calls the old endpoint.
import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Endpoint déplacé. Utiliser POST /api/events/[id]/documents',
      deprecated: true,
    },
    { status: 410 },
  );
}
