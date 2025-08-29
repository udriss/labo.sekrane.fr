// api/classes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { auth } from '@/auth';

const CreateClassSchema = z.object({
  name: z.string().min(1, 'Le nom de la classe est requis'),
  description: z.string().optional(),
  system: z.boolean().optional(), // Use system field directly
});

const UpdateClassSchema = CreateClassSchema.partial();

const DEFAULT_SYSTEM_CLASSES = [
  '201',
  '202',
  '203',
  '204',
  '205',
  '206',
  '1ère ES',
  '1ère STI2D',
  'Tle STI2D',
  'Tle ES',
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userIdStr = session?.user ? (session.user as any).id : undefined;
    const userId = typeof userIdStr === 'string' ? parseInt(userIdStr, 10) : userIdStr;
    const { searchParams } = new URL(request.url);
    const withMembers = searchParams.get('withMembers') === 'true';
    // Fetch DB classes
    const dbClasses = await prisma.classe.findMany({
      include: {
        users: withMembers
          ? {
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            }
          : false,
        _count: { select: { users: true } },
      },
      orderBy: [{ name: 'asc' }],
    });
    // Do NOT auto-seed defaults here to avoid duplicates; seeding is handled by scripts
    const classesAll = dbClasses;

    let mine: typeof classesAll = [];
    if (typeof userId === 'number' && !Number.isNaN(userId)) {
      const memberships = await prisma.classeUtilisateur.findMany({
        where: { userId },
        select: { classId: true },
      });
      const memberIds = new Set(memberships.map((m) => m.classId));
      mine = classesAll.filter((c: any) => memberIds.has(c.id));
    }
    const predefinedClasses = classesAll.filter((c: any) => c.system);
    const customClasses = classesAll.filter((c: any) => !c.system);
    return NextResponse.json({
      success: true,
      predefinedClasses,
      customClasses,
      mine,
      count: classesAll.length,
    });
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userIdStr = session?.user ? (session.user as any).id : undefined;
    const userId = typeof userIdStr === 'string' ? parseInt(userIdStr, 10) : userIdStr;
    const body = await request.json();
    
    // Handle legacy 'type' field for backward compatibility
    if (body.type && !body.system) {
      body.system = body.type === 'predefined';
      delete body.type;
    }
    
    const validatedData = CreateClassSchema.parse(body);

    // Classes can have duplicate names, so we remove this validation
    // Different teachers can choose identical names for their classes

    const { system, ...rest } = validatedData as any;
    const newClass = await prisma.classe.create({
      data: {
        ...rest,
        system: system ?? false, // Default to false (custom) if not specified
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    // If we have an authenticated user, associate them to the class
    if (typeof userId === 'number' && !Number.isNaN(userId)) {
      try {
        await prisma.classeUtilisateur.create({
          data: { userId, classId: newClass.id },
        });
      } catch (e) {
        // Ignore if already a member
      }
    }

    return NextResponse.json(
      {
        success: true,
        class: newClass,
        message: 'Classe ajoutée avec succès',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    console.error('Failed to create class:', error);
    return NextResponse.json({ success: false, error: 'Failed to create class' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json({ success: false, error: 'ID de classe requis' }, { status: 400 });
    }

    const body = await request.json();
    
    // Handle legacy 'type' field for backward compatibility
    if (body.type && !body.system) {
      body.system = body.type === 'predefined';
      delete body.type;
    }
    
    const validatedData = UpdateClassSchema.parse(body);

    // Check if class exists
    const existingClass = await prisma.classe.findUnique({
      where: { id: parseInt(classId) },
    });

    if (!existingClass) {
      return NextResponse.json({ success: false, error: 'Classe non trouvée' }, { status: 404 });
    }

    // Classes can have duplicate names, so we remove the name conflict validation
    // Different teachers can choose identical names for their classes

    const updatedClass = await prisma.classe.update({
      where: { id: parseInt(classId) },
      data: validatedData,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      class: updatedClass,
      message: 'Classe mise à jour avec succès',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    console.error('Failed to update class:', error);
    return NextResponse.json({ success: false, error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json({ success: false, error: 'ID de classe requis' }, { status: 400 });
    }

    // Check if class exists and has no members
    const classWithCounts = await prisma.classe.findUnique({
      where: { id: parseInt(classId) },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!classWithCounts) {
      return NextResponse.json({ success: false, error: 'Classe non trouvée' }, { status: 404 });
    }

    if (classWithCounts._count.users > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Impossible de supprimer une classe contenant des membres',
        },
        { status: 400 },
      );
    }

    await prisma.classe.delete({
      where: { id: parseInt(classId) },
    });

    return NextResponse.json({
      success: true,
      message: 'Classe supprimée avec succès',
    });
  } catch (error) {
    console.error('Failed to delete class:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete class' }, { status: 500 });
  }
}
