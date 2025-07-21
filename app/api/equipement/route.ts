import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

// GET - Récupérer tous les équipements
export async function GET() {
  try {
    const materiel = await prisma.materiel.findMany({
      include: {
        supplier: true,
        maintenanceLogs: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ 
      materiel,
      total: materiel.length,
      available: materiel.filter((e: any) => e.status === 'AVAILABLE').length,
      maintenance: materiel.filter((e: any) => e.status === 'MAINTENANCE').length
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des équipements" },
      { status: 500 }
    )
  }
}

// POST - Ajouter un nouvel équipement
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validation des données requises
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: "Le nom et le type sont requis" },
        { status: 400 }
      )
    }

    // Validation du type d'équipement
    const validTypes = ['GLASSWARE', 'HEATING', 'MEASURING', 'SAFETY', 'MIXING', 'FILTRATION', 'OPTICAL', 'ELECTRONIC', 'OTHER']
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { error: "Type d'équipement invalide" },
        { status: 400 }
      )
    }

    // Créer l'équipement
    const materiel = await prisma.materiel.create({
      data: {
        name: data.name,
        type: data.type,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        quantity: data.quantity || 1,
        location: data.location || null,
        room: data.room || null,
        notes: data.notes || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        status: 'AVAILABLE'
      }
    })

    return NextResponse.json({ 
      materiel,
      message: "Équipement ajouté avec succès" 
    }, { status: 201 })
    
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'équipement:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de l'équipement" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un équipement
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json(
        { error: "ID de l'équipement requis" },
        { status: 400 }
      )
    }

    const materiel = await prisma.materiel.update({
      where: { id },
      data: {
        ...updateData,
        purchaseDate: updateData.purchaseDate ? new Date(updateData.purchaseDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        supplier: true
      }
    })

    return NextResponse.json({ 
      materiel,
      message: "Équipement mis à jour avec succès" 
    })
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'équipement" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un équipement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: "ID de l'équipement requis" },
        { status: 400 }
      )
    }

    // Vérifier si l'équipement est utilisé dans des notebooks
    const usageCount = await prisma.notebookEquipment.count({
      where: { equipmentId: id }
    })

    if (usageCount > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer: équipement utilisé dans des TP" },
        { status: 400 }
      )
    }

    await prisma.materiel.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: "Équipement supprimé avec succès" 
    })
    
  } catch (error) {
    console.error("Erreur lors de la suppression:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'équipement" },
      { status: 500 }
    )
  }
}
