import { prisma } from '../db/prisma'
import { Role } from '@prisma/client';

import type { 
  Chemical, 
  Materiel, 
  Order, 
  NotebookEntry, 
  Calendar,
  StatsData,
  ChemicalStatus,
  EquipmentStatus,
  OrderStatus,
  NotebookStatus
} from '../../types/prisma'


// Service pour les statistiques
export async function getStatsData(): Promise<StatsData> {
  try {
    // Statistiques des produits chimiques
    const chemicals = await prisma.chemical.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const chemicalStats = {
      total: await prisma.chemical.count(),
      lowStock: await prisma.chemical.count({
        where: { status: 'LOW_STOCK' }
      }),
      expired: await prisma.chemical.count({
        where: { status: 'EXPIRED' }
      }),
      byStatus: chemicals.reduce((acc: Record<ChemicalStatus, number>, curr: any) => {
        acc[curr.status as ChemicalStatus] = curr._count.status
        return acc
      }, {} as Record<ChemicalStatus, number>)
    }

    // Statistiques des équipements
    const materiel = await prisma.materiel.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const equipmentStats = {
      total: await prisma.materiel.count(),
      available: await prisma.materiel.count({
        where: { status: 'AVAILABLE' }
      }),
      maintenance: await prisma.materiel.count({
        where: { status: 'MAINTENANCE' }
      }),
      byStatus: materiel.reduce((acc: Record<EquipmentStatus, number>, curr: any) => {
        acc[curr.status as EquipmentStatus] = curr._count.status
        return acc
      }, {} as Record<EquipmentStatus, number>)
    }

    // Statistiques des commandes
    const orders = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const orderTotalAmount = await prisma.order.aggregate({
      _sum: { totalAmount: true }
    })

    const orderStats = {
      pending: await prisma.order.count({
        where: { status: { in: ['SENT', 'CONFIRMED'] } }
      }),
      total: await prisma.order.count(),
      totalAmount: orderTotalAmount._sum.totalAmount || 0,
      byStatus: orders.reduce((acc: Record<OrderStatus, number>, curr: any) => {
        acc[curr.status as OrderStatus] = curr._count.status
        return acc
      }, {} as Record<OrderStatus, number>)
    }

    // Statistiques des cahiers de TP
    const notebooks = await prisma.notebookEntry.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const notebookStats = {
      total: await prisma.notebookEntry.count(),
      recent: await prisma.notebookEntry.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
          }
        }
      }),
      byStatus: notebooks.reduce((acc: Record<NotebookStatus, number>, curr: any) => {
        acc[curr.status as NotebookStatus] = curr._count.status
        return acc
      }, {} as Record<NotebookStatus, number>)
    }

    // Informations utilisateur récupérées dynamiquement
    const user = await prisma.user.findFirst({
      where: { role: Role.ADMIN }, // Exemple : récupérer un utilisateur admin
      select: { name: true, role: true }
    });

    if (!user) {
      throw new Error("Aucun utilisateur admin trouvé");
    }

    return {
      chemicals: chemicalStats,
      materiel: equipmentStats,
      orders: orderStats,
      notebooks: notebookStats,
      user: user
    };
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error)
    throw error
  }
}

// Service pour les produits chimiques
export async function getChemicals() {
  return await prisma.chemical.findMany({
    include: {
      supplier: true
    },
    orderBy: { name: 'asc' }
  })
}

export async function getChemicalById(id: string) {
  return await prisma.chemical.findUnique({
    where: { id },
    include: {
      supplier: true,
      usedInNotebooks: {
        include: {
          notebook: true
        }
      }
    }
  })
}

export async function getChemicalByBarcode(barcode: string) {
  return await prisma.chemical.findUnique({
    where: { barcode },
    include: {
      supplier: true
    }
  })
}

// Service pour les équipements
export async function getEquipment() {
  return await prisma.materiel.findMany({
    include: {
      supplier: true
    },
    orderBy: { name: 'asc' }
  })
}

export async function getEquipmentById(id: string) {
  return await prisma.materiel.findUnique({
    where: { id },
    include: {
      supplier: true,
      usedInNotebooks: {
        include: {
          notebook: true
        }
      }
    }
  })
}

export async function getEquipmentByBarcode(barcode: string) {
  return await prisma.materiel.findUnique({
    where: { barcode },
    include: {
      supplier: true
    }
  })
}

// Service pour les commandes
export async function getOrders() {
  return await prisma.order.findMany({
    include: {
      supplier: true,
      user: true,
      items: {
        include: {
          chemical: true,
          materiel: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getOrderById(id: string) {
  return await prisma.order.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: true,
      items: {
        include: {
          chemical: true,
          materiel: true
        }
      }
    }
  })
}

// Service pour les cahiers de TP
export async function getNotebookEntries() {
  return await prisma.notebookEntry.findMany({
    include: {
      createdBy: true,
      assignedTo: true
    },
    orderBy: { scheduledDate: 'desc' }
  })
}

export async function getNotebookEntryById(id: string) {
  return await prisma.notebookEntry.findUnique({
    where: { id },
    include: {
      createdBy: true,
      assignedTo: true,
      chemicals: {
        include: {
          chemical: true
        }
      },
      materiel: {
        include: {
          materiel: true
        }
      }
    }
  })
}

// Service pour le calendrier
export async function getCalendarEvents() {
  return await prisma.calendar.findMany({
    orderBy: { startDate: 'asc' }
  })
}

export async function getCalendarEventsForPeriod(startDate: Date, endDate: Date) {
  return await prisma.calendar.findMany({
    where: {
      startDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { startDate: 'asc' }
  })
}

// Service pour le scanner
export async function searchProductByCode(code: string) {
  // Chercher d'abord dans les produits chimiques
  const chemical = await getChemicalByBarcode(code)
  if (chemical) {
    return {
      type: 'chemical' as const,
      data: chemical
    }
  }

  // Chercher dans les équipements
  const materiel = await getEquipmentByBarcode(code)
  if (materiel) {
    return {
      type: 'materiel' as const,
      data: materiel
    }
  }

  return null
}

// Service pour les fournisseurs
export async function getSuppliers() {
  return await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })
}
