// app/api/audit/user/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { DateRange } from '@/types/audit';

export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { userId } = await context.params;
    const userRole = (session.user as any).role;

    // Users can only see their own activity, admins can see anyone's
    if (userRole !== 'ADMIN' && session.user.id !== userId) {
      return NextResponse.json({ error: 'Privilèges insuffisants' }, { status: 403 });
    }

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
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateRange = {
        start: thirtyDaysAgo,
        end: new Date()
      };
    }

    const entries = await auditLogger.getUserActivity(userId, dateRange);

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length,
      userId,
      dateRange
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
