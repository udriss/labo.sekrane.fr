import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';

function getFrenchMonthFolder(date = new Date()) {
  const raw = date.toLocaleString('fr-FR', { month: 'long' });
  // Normalize: remove accents, replace apostrophes with '_', spaces with '_', restrict charset
  let safe = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  safe = safe.replace(/['’]/g, '_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safe) safe = 'mois';
  return `${safe}_${date.getFullYear()}`;
}

function sanitizeFilename(name: string): string {
  // Remove any path components and keep safe characters
  const base = name.split(/[\\/]/).pop() || 'fichier';
  // Replace spaces with underscores, remove disallowed chars
  return base.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-éèêëàâäôöîïûüçÉÈÊËÀÂÄÔÖÎÏÛÜÇ]/g, '');
}

async function ensureUniqueFile(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  let finalPath = filePath;
  let counter = 1;
  try {
    await fs.access(finalPath);
    // Exists, iterate
    while (true) {
      const candidate = path.join(dir, `${base}-${counter}${ext}`);
      try {
        await fs.access(candidate);
        counter++;
      } catch {
        finalPath = candidate;
        break;
      }
    }
  } catch {
    // Does not exist, keep original
  }
  return finalPath;
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Endpoint obsolète. Utilisez /api/events/:id/documents (multipart) avec eventId ou implémentez l\'ajout de brouillon.',
    },
    { status: 410 },
  );
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Endpoint obsolète. Utilisez DELETE /api/events/:id/documents?fileUrl=...',
    },
    { status: 410 },
  );
}
