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
  
  const notebook = await prisma.notebookEntry.create({
    data: {
      title,
      description,
      scheduledDate: new Date(scheduledDate),
      duration,
      class: className,
      groups,
      createdById,
      objectives,
      procedure
    },
    include: {
      createdBy: {
        select: { name: true, email: true }
      }
    }
  })
  return NextResponse.json(notebook, { status: 201 })
}
