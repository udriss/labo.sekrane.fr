import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
// Envoi d'emails déplacé dans un dialogue dédié côté UI; ici on ne fait que ajouter les comptes et les tokens

type BulkRow = {
  email: string;
  name?: string | null;
  role?: string;
  password?: string | null;
  overwrite?: boolean | null;
};

function parseCSV(text: string): BulkRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const res: BulkRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const email = cols[idx('email')] || '';
    if (!email) continue;
    res.push({
      email,
      name: idx('name') >= 0 ? cols[idx('name')] : null,
      role: idx('role') >= 0 ? cols[idx('role')] : 'ELEVE',
      password: idx('password') >= 0 ? cols[idx('password')] : null,
    });
  }
  return res;
}

function parseTXT(text: string): BulkRow[] {
  // Each line: email;name;role;password (role, password optional)
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [email, name, role, password] = l.split(/[;,\t]/).map((s) => s.trim());
      return { email, name: name || null, role: role || 'ELEVE', password: password || null };
    })
    .filter((r) => !!r.email);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== 'ADMIN' && role !== 'ADMINLABO'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentType = req.headers.get('content-type') || '';
  let rows: BulkRow[] = [];
  let sendActivation = false;
  if (contentType.includes('application/json')) {
    const body = await req.json();
    rows = Array.isArray(body?.rows) ? (body.rows as BulkRow[]) : [];
    sendActivation = !!body?.sendActivation;
  } else if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as unknown as File | null;
    const format = ((form.get('format') as string) || 'csv').toLowerCase();
    sendActivation = ((form.get('sendActivation') as string) || 'false') === 'true';
    const text = file ? await file.text() : '';
    rows = format === 'txt' ? parseTXT(text) : parseCSV(text);
    if (!rows.length) {
      const textArea = (form.get('text') as string) || '';
      rows = format === 'txt' ? parseTXT(textArea) : parseCSV(textArea);
    }
  } else {
    const text = await req.text();
    const format = (new URL(req.url).searchParams.get('format') || 'csv').toLowerCase();
    sendActivation = (new URL(req.url).searchParams.get('sendActivation') || 'false') === 'true';
    rows = format === 'txt' ? parseTXT(text) : parseCSV(text);
  }

  const allowed = new Set([
    'ADMIN',
    'ADMINLABO',
    'ENSEIGNANT',
    'LABORANTIN_PHYSIQUE',
    'LABORANTIN_CHIMIE',
    'ELEVE',
  ]);
  const toCreate = rows
    .map((r) => ({
      email: (r.email || '').trim(),
      name: (r.name || null) as string | null,
      role: allowed.has((r.role || 'ELEVE').toUpperCase())
        ? (r.role || 'ELEVE').toUpperCase()
        : 'ELEVE',
      password: r.password || null,
      overwrite: !!(r as any).overwrite,
    }))
    .filter((r) => !!r.email);

  // Server-side validation to prevent invalid imports when client preview was skipped
  const errors: Array<{ email: string; issues: string[] }> = [];
  const seen = new Set<string>();
  for (const r of toCreate) {
    const issues: string[] = [];
    const low = r.email.toLowerCase();
    if (!/.+@.+\..+/.test(r.email)) issues.push('Email invalide');
    if (!r.name || !String(r.name).trim()) issues.push('Nom manquant');
    if (!allowed.has(r.role)) issues.push('Rôle invalide');
    if (seen.has(low)) issues.push('Doublon dans le fichier');
    seen.add(low);
    if (issues.length) errors.push({ email: r.email, issues });
  }
  if (errors.length) {
    return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
  }

  const created: Array<{
    id: number;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    hasPassword: boolean;
  }> = [];
  const overwritten: Array<{
    id: number;
    email: string;
    name: string | null;
    role: string;
  }> = [];
  for (const row of toCreate) {
    const exists = await prisma.utilisateur.findUnique({ where: { email: row.email } });
    if (exists) {
      if (row.overwrite) {
        const data: any = {
          name: row.name,
          role: row.role as any,
        };
        if (row.password && String(row.password).trim()) {
          data.password = await bcrypt.hash(String(row.password), 10);
        }
        const u = await prisma.utilisateur.update({
          where: { id: exists.id },
          data,
          select: { id: true, email: true, name: true, role: true },
        });
        overwritten.push(u as any);
      }
      continue;
    }
    const hasPwd = !!(row.password && String(row.password).trim());
    const hash = hasPwd ? await bcrypt.hash(String(row.password), 10) : null;
    const u = await prisma.utilisateur.create({
      data: {
        email: row.email,
        name: row.name,
        role: row.role as any, // cast vers enum Prisma Role (valeur uppercase validée ci-dessus)
        password: hash,
        // Politique: tous les comptes ajoutés via import sont INACTIFS, même si un mot de passe est fourni
        isActive: false,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, password: true },
    });
    created.push({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as any,
      isActive: false,
      hasPassword: !!u.password,
    });
  }

  // Générer systématiquement des tokens d'activation pour tous les comptes ajoutés (pas pour les comptes écrasés)
  let tokensCreated = 0;
  if (created.length) {
    const now = Date.now();
    for (const u of created) {
      const token = `${u.id}-${Math.random().toString(36).slice(2)}${Math.random()
        .toString(36)
        .slice(2)}`;
      const expiresAt = new Date(now + 1000 * 60 * 60 * 24 * 7); // 7 jours
      await prisma.activationToken.create({ data: { email: u.email, token, expiresAt } });
      tokensCreated++;
    }
  }

  return NextResponse.json({
    createdCount: created.length,
    tokensCreated,
    overwrittenCount: overwritten.length,
    created,
    overwritten,
  });
}
