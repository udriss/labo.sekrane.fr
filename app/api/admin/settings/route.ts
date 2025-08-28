import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { loadAppSettings, saveAppSettings } from '@/lib/services/app-settings';

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const settings = await loadAppSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const updated = await saveAppSettings(body.settings || body);
    return NextResponse.json({ settings: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to save settings', message: e.message },
      { status: 500 },
    );
  }
}
