import { NextRequest, NextResponse } from 'next/server'
import { getChemicals } from '@/lib/services/database'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const hazardClass = searchParams.get('hazardClass')

    const where: any = {}

    // Filtre de recherche
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { formula: { contains: search, mode: 'insensitive' } },
        { casNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtre par statut
    if (status && status !== 'ALL') {
      where.status = status
    }

    // Filtre par classe de danger
    if (hazardClass && hazardClass !== 'ALL') {
      where.hazardClass = hazardClass
    }

    const chemicals = await prisma.chemical.findMany({
      where,
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcul des statistiques côté serveur (date statique)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const stats = {
      total: chemicals.length,
      inStock: chemicals.filter((c: any) => c.status === 'IN_STOCK').length,
      lowStock: chemicals.filter((c: any) => c.status === 'LOW_STOCK').length,
      expired: chemicals.filter((c: any) => c.status === 'EXPIRED').length,
      expiringSoon: chemicals.filter((c: any) => {
        if (!c.expirationDate) return false
        return new Date(c.expirationDate) <= thirtyDaysFromNow && c.status === 'IN_STOCK'
      }).length
    }

    return NextResponse.json({ 
      chemicals,
      stats
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des produits chimiques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits chimiques' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const chemical = await prisma.chemical.create({
      data: {
        name: body.name,
        formula: body.formula,
        casNumber: body.casNumber,
        quantity: parseFloat(body.quantity),
        unit: body.unit,
        concentration: body.concentration ? parseFloat(body.concentration) : null,
        storage: body.storage,
        hazardClass: body.hazardClass,
        status: body.status || 'IN_STOCK',
        supplierId: body.supplierId || null
      }
    })
    
    return NextResponse.json(chemical)
  } catch (error) {
    console.error('Erreur création chemical:', error)
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
}
