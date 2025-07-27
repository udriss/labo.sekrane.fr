import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const EQUIPMENT_INVENTORY_FILE = path.join(process.cwd(), 'data', 'equipment-inventory.json')
const NOTEBOOK_FILE = path.join(process.cwd(), 'data', 'notebook.json')
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')
const CHEMICALS_FILE = path.join(process.cwd(), 'data', 'chemicals-inventory.json')
const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json')

// Fonction pour lire un fichier JSON
async function readJsonFile(filePath: string, defaultValue: any = {}) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Erreur lecture fichier ${filePath}:`, error)
    return defaultValue
  }
}

// Fonction pour obtenir les statistiques
async function getStatsData() {
  try {
    // Lire tous les fichiers JSON
    const [equipment, notebook, users, chemicals, orders] = await Promise.all([
      readJsonFile(EQUIPMENT_INVENTORY_FILE, { equipment: [], stats: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 } }),
      readJsonFile(NOTEBOOK_FILE, { experiments: [] }),
      readJsonFile(USERS_FILE, { users: [] }),
      readJsonFile(CHEMICALS_FILE, { chemicals: [] }),
      readJsonFile(ORDERS_FILE, { orders: [] })
    ])

    // Calculer les statistiques d'équipement
    const equipmentStats = {
      total: equipment.equipment?.length || 0,
      available: equipment.equipment?.filter((e: any) => e.quantity > 0 && e.status === 'AVAILABLE').length || 0,
      maintenance: equipment.equipment?.filter((e: any) => e.status === 'MAINTENANCE').length || 0,
      outOfStock: equipment.equipment?.filter((e: any) => e.quantity === 0).length || 0
    }

    // Calculer les statistiques de notebook
    const notebookStats = {
      total: notebook.experiments?.length || 0,
      thisMonth: notebook.experiments?.filter((exp: any) => {
        const expDate = new Date(exp.createdAt || exp.date)
        const now = new Date()
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
      }).length || 0,
      completed: notebook.experiments?.filter((exp: any) => exp.status === 'COMPLETED').length || 0,
      inProgress: notebook.experiments?.filter((exp: any) => exp.status === 'IN_PROGRESS').length || 0
    }

    // Calculer les statistiques d'utilisateurs
    const userStats = {
      total: users.users?.length || 0,
      active: users.users?.filter((user: any) => user.isActive !== false).length || 0,
      admins: users.users?.filter((user: any) => user.role === 'ADMIN').length || 0
    }

    // Calculer les statistiques de réactifs chimiques
    const chemicalStats = {
      total: chemicals.chemicals?.length || 0,
      lowStock: chemicals.chemicals?.filter((chem: any) => chem.quantity <= (chem.minQuantity || 10)).length || 0,
      expired: chemicals.chemicals?.filter((chem: any) => {
        if (!chem.expirationDate) return false
        return new Date(chem.expirationDate) < new Date()
      }).length || 0
    }

    // Calculer les statistiques de commandes
    const orderStats = {
      total: orders.orders?.length || 0,
      pending: orders.orders?.filter((order: any) => order.status === 'PENDING').length || 0,
      delivered: orders.orders?.filter((order: any) => order.status === 'DELIVERED').length || 0,
      thisMonth: orders.orders?.filter((order: any) => {
        const orderDate = new Date(order.createdAt || order.date)
        const now = new Date()
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()
      }).length || 0
    }

    return {
      equipment: equipmentStats,
      notebook: notebookStats,
      users: userStats,
      chemicals: chemicalStats,
      orders: orderStats,
      summary: {
        totalItems: equipmentStats.total + chemicalStats.total,
        totalExperiments: notebookStats.total,
        totalUsers: userStats.total,
        totalOrders: orderStats.total
      }
    }
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getStatsData()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erreur API stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des statistiques' },
      { status: 500 }
    )
  }
}
