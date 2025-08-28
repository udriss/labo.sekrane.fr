import { z } from 'zod';

// Ancien schéma (utilisé pour compat partielle, sans propriétés physiques)
export const chemicalCreateSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  casNumber: z.string().optional().or(z.literal('')),
  stock: z.number().min(0, 'Stock >= 0'),
  salleId: z.number().int().positive().optional(),
  localisationId: z.number().int().positive().optional(),
});

// Nouveau schéma pour ajout inventaire + éventuelle ajout preset
export const chemicalInventoryCreateSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  formula: z.string().optional().or(z.literal('')),
  casNumber: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  hazard: z.array(z.string()).optional(), // hazardClass list
  molarMass: z.number().optional(),
  density: z.number().optional(),
  boilingPointC: z.number().optional(),
  meltingPointC: z.number().optional(),
  stock: z.number().min(0, 'Stock >= 0'),
  salleId: z.number().int().positive().nullable().optional(),
  localisationId: z.number().int().positive().nullable().optional(),
  unit: z.string().min(1, 'Unité requise').max(32).optional(),
  minStock: z.number().min(0).optional(),
  purchaseDate: z.preprocess((v) => (v ? new Date(v as any) : undefined), z.date().optional()),
  expirationDate: z.preprocess((v) => (v ? new Date(v as any) : undefined), z.date().optional()),
  notes: z.string().optional(),
  supplierId: z.number().int().positive().optional(),
  supplierName: z.string().optional(), // fallback pour ajout fournisseur à la volée
});

export const chemicalInventoryUpdateSchema = chemicalInventoryCreateSchema
  .partial()
  .extend({ id: z.number().int().positive() });

export type ChemicalCreateInput = z.infer<typeof chemicalInventoryCreateSchema>;
export type ChemicalUpdateInput = z.infer<typeof chemicalInventoryUpdateSchema>;
