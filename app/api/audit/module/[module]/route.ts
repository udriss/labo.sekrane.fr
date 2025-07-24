// app/api/audit/module/[module]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { DateRange } from '@/types/audit';

export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ module: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check if user has admin privileges
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'TEACHER' && 
        userRole !== 'ADMINLABO' && userRole !== 'LABORANTIN') {
      return NextResponse.json({ error: 'Privilèges insuffisants' }, { status: 403 });
    }

    const { module } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateRange: DateRange | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    } else {
      // Default to last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dateRange = {
        start: sevenDaysAgo,
        end: new Date()
      };
    }

    const entries = await auditLogger.getModuleActivity(module.toUpperCase(), dateRange);

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length,
      module: module.toUpperCase(),
      dateRange
    });
  } catch (error) {
    console.error('Error getting module activity:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
