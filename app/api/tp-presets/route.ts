import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const level = searchParams.get('level')
    const subject = searchParams.get('subject')

    const where: any = { isActive: true }

    // Filtre de recherche
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { objectives: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtres spécifiques
    if (level) where.level = level
    if (subject) where.subject = subject

    const tpPresets = await prisma.tpPreset.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        chemicals: {
          include: {
            chemical: {
              select: { id: true, name: true, formula: true, unit: true }
            }
          }
        },
        materials: {
          include: {
            material: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ 
      tpPresets,
      total: tpPresets.length
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des TP presets:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des TP presets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.title || !body.createdById) {
      return NextResponse.json({ 
        error: 'Le titre et le créateur sont requis' 
      }, { status: 400 })
    }

    const tpPreset = await prisma.tpPreset.create({
      data: {
        title: body.title,
        description: body.description,
        objectives: body.objectives,
        procedure: body.procedure,
        duration: body.duration ? parseInt(body.duration) : null,
        level: body.level,
        subject: body.subject,
        createdById: body.createdById,
        attachments: body.attachments || [],
        chemicals: body.chemicals ? {
          create: body.chemicals.map((chem: any) => ({
            chemicalId: chem.chemicalId,
            quantityUsed: parseFloat(chem.quantityUsed),
            unit: chem.unit,
            notes: chem.notes
          }))
        } : undefined,
        materials: body.materials ? {
          create: body.materials.map((mat: any) => ({
            materialId: mat.materialId,
            quantity: parseInt(mat.quantity) || 1,
            notes: mat.notes
          }))
        } : undefined
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        chemicals: {
          include: {
            chemical: {
              select: { id: true, name: true, formula: true, unit: true }
            }
          }
        },
        materials: {
          include: {
            material: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      }
    })
    
    return NextResponse.json(tpPreset, { status: 201 })
  } catch (error) {
    console.error('Erreur création TP preset:', error)
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

    // Supprimer les relations existantes
    await prisma.tpPresetChemical.deleteMany({
      where: { tpPresetId: id }
    })
    await prisma.tpPresetMaterial.deleteMany({
      where: { tpPresetId: id }
    })

    // Mettre à jour avec les nouvelles données
    const tpPreset = await prisma.tpPreset.update({
      where: { id },
      data: {
        ...updateData,
        duration: updateData.duration ? parseInt(updateData.duration) : null,
        attachments: updateData.attachments || [],
        chemicals: updateData.chemicals ? {
          create: updateData.chemicals.map((chem: any) => ({
            chemicalId: chem.chemicalId,
            quantityUsed: parseFloat(chem.quantityUsed),
            unit: chem.unit,
            notes: chem.notes
          }))
        } : undefined,
        materials: updateData.materials ? {
          create: updateData.materials.map((mat: any) => ({
            materialId: mat.materialId,
            quantity: parseInt(mat.quantity) || 1,
            notes: mat.notes
          }))
        } : undefined
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        chemicals: {
          include: {
            chemical: {
              select: { id: true, name: true, formula: true, unit: true }
            }
          }
        },
        materials: {
          include: {
            material: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      }
    })
    
    return NextResponse.json(tpPreset)
  } catch (error) {
    console.error('Erreur mise à jour TP preset:', error)
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

    await prisma.tpPreset.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'TP preset supprimé avec succès' })
  } catch (error) {
    console.error('Erreur suppression TP preset:', error)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
