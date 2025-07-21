import { NextRequest, NextResponse } from 'next/server'
import { searchProductByCode } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Le paramètre code est requis' },
        { status: 400 }
      )
    }

    const result = await searchProductByCode(code)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Produit non trouvé', code },
        { status: 404 }
      )
    }

    return NextResponse.json({
      type: result.type,
      product: result.data,
      found: true
    })
  } catch (error) {
    console.error('Erreur API scanner:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    )
  }
}
