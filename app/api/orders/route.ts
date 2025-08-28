// api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';

// ORDERS config requires CREATE, UPDATE, STATUS, ALERT (no DELETE), and all are now covered by routes.
// DELETE for orders is still unimplemented (501), which matches current design.
// next steps
// Optional: add a tiny test to exercise PUT /api/orders UPDATE vs STATUS branches.
// When orders module is fully implemented, replace mock objects with real Prisma writes and keep the same notification calls.

type OrderStatus = 'PENDING' | 'APPROVED' | 'ORDERED' | 'DELIVERED' | 'CANCELLED';

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'En cours de développement',
      message:
        "Le module de commandes n'est pas encore implémenté. Cette fonctionnalité sera disponible prochainement.",
      status: 'under_construction',
    },
    { status: 501 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { items, priority = 'normal', notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order items are required' }, { status: 400 });
    }

    // Simuler la création d'une commande (en attente de l'implémentation complète)
    const mockOrder = {
      id: Date.now(), // Mock ID
      status: 'PENDING' as OrderStatus,
      priority,
      items,
      notes,
      createdBy: Number(session.user.id),
      createdAt: new Date(),
    };

    // Envoyer notification en fonction de la priorité
    const severity = priority === 'urgent' ? 'high' : priority === 'high' ? 'medium' : 'low';
    const emoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚡' : '📦';

    if (priority === 'urgent') {
      notificationService
        .createAndDispatch({
          module: 'ORDERS',
          actionType: 'ALERT',
          message: `${emoji} Commande urgente ajoutée: ${items.length} article(s)`,
          severity: 'high',
          data: {
            orderId: mockOrder.id,
            priority,
            itemCount: items.length,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
        })
        .catch(() => {});
    } else {
      notificationService
        .createAndDispatch({
          module: 'ORDERS',
          actionType: 'CREATE',
          message: `${emoji} Nouvelle commande ajoutée: ${items.length} article(s)`,
          severity,
          data: {
            orderId: mockOrder.id,
            priority,
            itemCount: items.length,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        order: mockOrder,
        message: 'Commande simulée ajoutée avec succès (module en développement)',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
    }

    // Simuler la mise à jour du statut
    const mockOrder = {
      id: Number(id),
      status: status as OrderStatus,
      updatedAt: new Date(),
      ...updateData,
    };

    // Notification: STATUS si le statut change, sinon UPDATE pour autres modifications
    if (typeof status !== 'undefined' && status !== null && String(status).length > 0) {
      const statusLabels: Record<OrderStatus, string> = {
        PENDING: 'En attente',
        APPROVED: 'Approuvée',
        ORDERED: 'Commandée',
        DELIVERED: 'Livrée',
        CANCELLED: 'Annulée',
      };
      const statusKey = status as OrderStatus;
      notificationService
        .createAndDispatch({
          module: 'ORDERS',
          actionType: 'STATUS',
          message: `Statut commande modifié: <strong>#${id}</strong> → ${statusLabels[statusKey] || status}`,
          data: {
            orderId: id,
            newStatus: status,
            statusLabel: statusLabels[statusKey] || status,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
        })
        .catch(() => {});
    } else {
      // Changement hors statut → UPDATE
      const changedFields = Object.keys(updateData);
      const priority = (updateData as any).priority;
      const items = (updateData as any).items;
      const severity = priority === 'urgent' ? 'high' : priority === 'high' ? 'medium' : 'low';

      notificationService
        .createAndDispatch({
          module: 'ORDERS',
          actionType: 'UPDATE',
          message: `Commande mise à jour: <strong>#${id}</strong>${
            changedFields.length ? ` (champs: ${changedFields.join(', ')})` : ''
          }`,
          severity,
          data: {
            orderId: Number(id),
            updated: changedFields,
            priority,
            itemCount: Array.isArray(items) ? items.length : undefined,
            triggeredBy: session?.user?.name || session?.user?.email || 'système',
          },
        })
        .catch(() => {});
    }

    const responseMessage =
      typeof status !== 'undefined' && status !== null && String(status).length > 0
        ? 'Statut de commande simulé mis à jour (module en développement)'
        : 'Commande simulée mise à jour (module en développement)';

    return NextResponse.json({
      order: mockOrder,
      message: responseMessage,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commande:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'En cours de développement',
      message: "La suppression de commandes n'est pas encore implémentée.",
      status: 'under_construction',
    },
    { status: 501 },
  );
}
