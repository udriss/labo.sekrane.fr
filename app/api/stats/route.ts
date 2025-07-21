import { NextRequest, NextResponse } from 'next/server'
import { getStatsData } from '@/lib/services/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      )
    }

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
