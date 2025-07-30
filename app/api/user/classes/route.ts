// app/api/user/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserServiceSQL } from '@/lib/services/userService.sql';
import { withAudit } from '@/lib/api/with-audit';
import { is } from "date-fns/locale";



// GET - Récupérer les classes personnalisées de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await UserServiceSQL.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    const customClasses = (user.customClasses || []).map((className: string, index: number) => ({
      id: `CLASS_CUSTOM_${user.id}_${index}`,
      name: className,
      type: 'custom',
      createdAt: user.updatedAt || user.createdAt,
      createdBy: user.id,
      isCustom: true
    }));
    return NextResponse.json({ customClasses });
  } catch (error) {
    console.error("Erreur lors de la récupération des classes personnalisées:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des classes personnalisées" },
      { status: 500 }
    );
  }
}

// POST - Ajouter une nouvelle classe personnalisée
export const POST = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nom de classe requis" }, { status: 400 });
    }

    const user = await UserServiceSQL.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    const customClasses = user.customClasses || [];
    if (customClasses.includes(name.trim())) {
      return NextResponse.json({ error: "Cette classe existe déjà" }, { status: 409 });
    }
    const updatedUser = await UserServiceSQL.update(session.user.id, {
      customClasses: [...customClasses, name.trim()]
    });
    if (!updatedUser) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }
    const newClass = {
      id: `CLASS_CUSTOM_${session.user.id}_${(updatedUser.customClasses?.length ?? 1) - 1}`,
      name: name.trim(),
      type: 'custom',
      createdAt: new Date().toISOString(),
      createdBy: session.user.id
    };
    return NextResponse.json(newClass, { status: 201 });
  },
  {
    module: 'USERS',
    entity: 'customClass',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      className: response?.name,
      classType: 'custom'
    })
  }
);

// DELETE - Supprimer une classe personnalisée
export const DELETE = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const className = searchParams.get('name');

    if (!className) {
      return NextResponse.json({ error: "Nom de classe requis" }, { status: 400 });
    }

    const user = await UserServiceSQL.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    const customClasses = user.customClasses || [];
    const classIndex = customClasses.indexOf(className);
    if (classIndex === -1) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }
    const updated = [...customClasses];
    updated.splice(classIndex, 1);
    const updatedUser = await UserServiceSQL.update(session.user.id, {
      customClasses: updated
    });
    if (!updatedUser) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }
    return NextResponse.json({ 
      message: "Classe supprimée avec succès",
      deletedClass: { name: className }
    });
  },
  {
    module: 'USERS',
    entity: 'customClass',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedClass?.id,
    customDetails: (req) => ({
      className: new URL(req.url).searchParams.get('name')
    })
  }
);