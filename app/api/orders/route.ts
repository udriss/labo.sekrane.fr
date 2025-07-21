import { NextRequest, NextResponse } from 'next/server'
import { getOrders } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    const orders = await getOrders()
    return NextResponse.json(orders)
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
    // TODO: Implémenter la création de commande
    return NextResponse.json({ message: 'Non implémenté' }, { status: 501 })
  } catch (error) {
    console.error('Erreur création order:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}
