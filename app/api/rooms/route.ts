import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeLocations = searchParams.get('includeLocations') === 'true'

    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: includeLocations ? {
        locations: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      } : undefined,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des salles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.name) {
      return NextResponse.json({ error: 'Le nom de la salle est requis' }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        name: body.name,
        description: body.description,
        locations: body.locations ? {
          create: body.locations.map((loc: any) => ({
            name: loc.name,
            description: loc.description
          }))
        } : undefined
      },
      include: {
        locations: true
      }
    })
    
    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error('Erreur création salle:', error)
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis pour la mise à jour' }, { status: 400 })
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        locations: true
      }
    })
    
    return NextResponse.json(room)
  } catch (error) {
    console.error('Erreur mise à jour salle:', error)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis pour la suppression' }, { status: 400 })
    }

    await prisma.room.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Salle supprimée avec succès' })
  } catch (error) {
    console.error('Erreur suppression salle:', error)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
