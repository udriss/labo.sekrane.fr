import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json')

// Fonction pour lire le fichier commandes
async function readOrdersFile() {
  try {
    const data = await fs.readFile(ORDERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture fichier orders:', error)
    return { orders: [] }
  }
}

// Fonction pour écrire dans le fichier commandes
async function writeOrdersFile(data: any) {
  try {
    await fs.writeFile(ORDERS_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture fichier orders:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const ordersData = await readOrdersFile()
    return NextResponse.json(ordersData.orders || [])
  } catch (error) {
    console.error('Erreur API orders:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des commandes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      title,
      description,
      supplier,
      totalAmount,
      currency = 'EUR',
      items = []
    } = body

    // Validation des données
    if (!title || !supplier) {
      return NextResponse.json(
        { error: 'Le titre et le fournisseur sont requis' },
        { status: 400 }
      )
    }

    // Créer la nouvelle commande
    const newOrder = {
      id: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || null,
      status: 'PENDING',
      totalAmount: totalAmount || 0,
      currency,
      supplier,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      items
    }

    // Lire le fichier existant et ajouter la nouvelle commande
    const ordersData = await readOrdersFile()
    ordersData.orders.push(newOrder)
    
    // Sauvegarder le fichier
    await writeOrdersFile(ordersData)
    
    return NextResponse.json(newOrder, { status: 201 })
  } catch (error) {
    console.error('Erreur création order:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de la commande requis' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const ordersData = await readOrdersFile()
    
    const orderIndex = ordersData.orders.findIndex((order: any) => order.id === orderId)
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Mettre à jour la commande
    const updatedOrder = {
      ...ordersData.orders[orderIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    ordersData.orders[orderIndex] = updatedOrder
    await writeOrdersFile(ordersData)
    
    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Erreur mise à jour order:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de la commande requis' },
        { status: 400 }
      )
    }

    const ordersData = await readOrdersFile()
    const orderIndex = ordersData.orders.findIndex((order: any) => order.id === orderId)
    
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la commande
    const deletedOrder = ordersData.orders.splice(orderIndex, 1)[0]
    await writeOrdersFile(ordersData)
    
    return NextResponse.json({ message: 'Commande supprimée', order: deletedOrder })
  } catch (error) {
    console.error('Erreur suppression order:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}
