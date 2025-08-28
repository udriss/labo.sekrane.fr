import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';

// Simple in-memory cache (per server instance) with short TTL to reduce DB hits on dashboards
type CacheEntry = { expiry: number; payload: any };
let statsCache: CacheEntry | null = null;
const TTL_MS = 5000; // 5s

// GET /api/chemicals/stats
// Provides aggregated inventory statistics.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threshold = parseInt(searchParams.get('threshold') || '5');

    if (statsCache && statsCache.expiry > Date.now()) {
      return NextResponse.json(statsCache.payload);
    }

    const [inventories, presetCount] = await Promise.all([
      prisma.reactifInventaire.findMany({
        select: {
          id: true,
          stock: true,
          salle: { select: { id: true, name: true } },
          localisation: { select: { id: true, name: true, salleId: true } },
        },
      }),
      prisma.reactifPreset.count(),
    ]);

    let totalStock = 0;
    let lowStockCount = 0;
    const bySalleMap = new Map<
      number,
      { id: number; name: string; count: number; stock: number }
    >();
    const byLocMap = new Map<
      number,
      { id: number; name: string; salleId: number; count: number; stock: number }
    >();

    for (const inv of inventories) {
      totalStock += inv.stock;
      if (inv.stock <= threshold) lowStockCount++;
      if (inv.salle) {
        const s = bySalleMap.get(inv.salle.id) || {
          id: inv.salle.id,
          name: inv.salle.name,
          count: 0,
          stock: 0,
        };
        s.count++;
        s.stock += inv.stock;
        bySalleMap.set(inv.salle.id, s);
      }
      if (inv.localisation) {
        const l = byLocMap.get(inv.localisation.id) || {
          id: inv.localisation.id,
          name: inv.localisation.name,
          salleId: inv.localisation.salleId,
          count: 0,
          stock: 0,
        };
        l.count++;
        l.stock += inv.stock;
        byLocMap.set(inv.localisation.id, l);
      }
    }

    const payload = {
      totalInventories: inventories.length,
      totalPresets: presetCount,
      totalStock,
      lowStock: { count: lowStockCount, threshold },
      bySalle: Array.from(bySalleMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      byLocalisation: Array.from(byLocMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
    statsCache = { expiry: Date.now() + TTL_MS, payload };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Erreur stats chemicals:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
