import { prisma } from '@/lib/services/db';

export interface Equipement {
  // legacy naming kept
  id: number;
  discipline: string;
  name: string;
  categoryId?: number | null;
  quantity: number;
  salleId?: number | null;
  localisationId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EquipmentService {
  static async getAll(discipline?: string): Promise<Equipement[]> {
    return prisma.materielInventaire.findMany({
      where: discipline ? { discipline } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  static async getById(id: number): Promise<Equipement | null> {
    return prisma.materielInventaire.findUnique({
      where: { id },
    });
  }

  static async create(
    data: Omit<Equipement, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Equipement> {
    return prisma.materielInventaire.create({
      data,
    });
  }

  static async update(
    id: number,
    data: Partial<Omit<Equipement, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Equipement> {
    return prisma.materielInventaire.update({
      where: { id },
      data,
    });
  }

  static async delete(id: number): Promise<void> {
    await prisma.materielInventaire.delete({
      where: { id },
    });
  }

  static async getByCategory(discipline: string, categoryId: number): Promise<Equipement[]> {
    return prisma.materielInventaire.findMany({
      where: {
        discipline,
        categoryId,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getLowStock(threshold: number = 5): Promise<Equipement[]> {
    return prisma.materielInventaire.findMany({
      where: {
        quantity: {
          lte: threshold,
        },
      },
      orderBy: { quantity: 'asc' },
    });
  }
}
