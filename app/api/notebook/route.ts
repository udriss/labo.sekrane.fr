import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const notebooks = await prisma.notebookEntry.findMany({ 
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { name: true, email: true }
      },
      assignedTo: {
        select: { name: true, email: true }
      }
    }
  })
  return NextResponse.json({ notebooks })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      title, 
      description, 
      scheduledDate, 
      duration, 
      class: className, 
      groups, 
      createdById,
      objectives,
      procedure 
    } = body
    
    // Validation des données requises
    if (!title) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }
    
    // Gestion de la date (requise)
    let parsedDate = new Date()
    if (scheduledDate) {
      const tempDate = new Date(scheduledDate)
      if (!isNaN(tempDate.getTime())) {
        parsedDate = tempDate
      }
    }
    
    const notebook = await prisma.notebookEntry.create({
      data: {
        title,
        description: description || "",
        scheduledDate: parsedDate,
        duration: duration || null,
        class: className || "",
        groups: groups || [],
        createdById: createdById || "",
        objectives: objectives || null,
        procedure: procedure || null
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        }
      }
    })
    
    return NextResponse.json(notebook, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du TP:', error)
    return NextResponse.json({ error: "Erreur lors de la création du TP" }, { status: 500 })
  }
}
