/**
 * seed-all.ts
 * Script de seed unifié regroupant :
 *  - Admin + presets réactifs de base
 *  - Enrichissement températures (si données)
 *  - Classes système (Classe.system=true)
 *  - Salles + localisations
 *  - Fournisseurs
 *  - Catégories + Presets matériel + Matériel perso + Items matériel depuis presets
 *  - Inventaires réactifs (chimie) + inventaires physiques
 *  - Configurations de notifications
 */
import { PrismaClient, Role } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
// Additional manual seed for specified events & timeslots (idempotent)
async function seedExtraEvents() {
  try {
    // Upsert Evenement 3 & 4
    await prisma.evenement.upsert({
      where: { id: 3 },
      update: { classIds: [1, 2], salleIds: [1, 2] },
      create: {
        id: 3,
        title: 'Événement ID 3',
        discipline: 'chimie',
        ownerId: 1,
        notes: '',
        type: 'TP',
        classIds: [1, 2],
        salleIds: [1, 2],
        createdAt: new Date('2025-08-17T16:30:24.942Z'),
        updatedAt: new Date('2025-08-17T16:30:24.972Z'),
      },
    });
    await prisma.evenement.upsert({
      where: { id: 4 },
      update: { classIds: [1], salleIds: [1] },
      create: {
        id: 4,
        title: 'Événement ID 4',
        discipline: 'chimie',
        ownerId: 1,
        notes: '',
        type: 'TP',
        classIds: [1],
        salleIds: [1],
        createdAt: new Date('2025-08-17T16:33:43.373Z'),
        updatedAt: new Date('2025-08-17T16:33:43.423Z'),
      },
    });
    // Creneaux (avoid duplicates by id)
    const creneaux = [
      {
        id: 9,
        eventId: 3,
        startDate: '2025-08-16T10:00:00',
        endDate: '2025-08-16T11:00:00',
        timeslotDate: '2025-08-16T00:00:00',
        salleIds: [1],
        classIds: [1, 2],
      },
      {
        id: 10,
        eventId: 4,
        startDate: '2025-08-16T16:00:00',
        endDate: '2025-08-16T18:00:00',
        timeslotDate: '2025-08-16T00:00:00',
        salleIds: [1],
        classIds: [1],
      },
      {
        id: 11,
        eventId: 4,
        startDate: '2025-08-16T14:00:00',
        endDate: '2025-08-16T18:00:00',
        timeslotDate: '2025-08-16T00:00:00',
        salleIds: [1],
        classIds: [1],
      },
    ];
    for (const c of creneaux) {
      await prisma.creneau.upsert({
        where: { id: c.id },
        update: {
          salleIds: c.salleIds,
          classIds: c.classIds,
        },
        create: {
          id: c.id,
          eventId: c.eventId,
          discipline: 'chimie',
          userId: 1,
          eventOwner: 1,
          state: 'created',
          startDate: new Date(c.startDate),
          endDate: new Date(c.endDate),
          timeslotDate: new Date(c.timeslotDate),
          salleIds: c.salleIds,
          classIds: c.classIds,
          // notes: '', // Field removed - to be deleted from schema
        },
      });
    }
  } catch (e) {
    console.error('Extra seed error', e);
  } finally {
    // no disconnect here; main seed flow handles it
  }
}

async function seedAdmin() {
  const password = await bcrypt.hash('admin123', 10);
  await prisma.utilisateur.upsert({
    where: { email: 'admin@labo.fr' },
    update: {},
    create: { email: 'admin@labo.fr', name: 'Admin', role: Role.ADMIN, password },
  });
  console.log('👤 Admin ok');
}

async function seedReactifPresets() {
  const count = await prisma.reactifPreset.count();
  if (count > 0) {
    console.log('🧪 ReactifPreset déjà présents');
    return;
  }
  // Chemin identique au script original (seed.ts) => data/common-chemicals.json
  const file = path.join(process.cwd(), 'data', 'common-chemicals.json');
  if (!fs.existsSync(file)) {
    console.warn('Fichier common-chemicals.json introuvable, skip.');
    return;
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf-8')) as { chemicals: any[] };

  // Convert Unicode subscripts/superscripts and middle dot to LaTeX inline (_{} and ^{})
  const subMap: Record<string, string> = {
    '₀': '0',
    '₁': '1',
    '₂': '2',
    '₃': '3',
    '₄': '4',
    '₅': '5',
    '₆': '6',
    '₇': '7',
    '₈': '8',
    '₉': '9',
  };
  const supMap: Record<string, string> = {
    '⁰': '0',
    '¹': '1',
    '²': '2',
    '³': '3',
    '⁴': '4',
    '⁵': '5',
    '⁶': '6',
    '⁷': '7',
    '⁸': '8',
    '⁹': '9',
  };
  const toLatex = (formula: unknown): string | null => {
    if (typeof formula !== 'string' || !formula) return null;
    // Skip if it already looks like LaTeX
    if (formula.includes('_{') || formula.includes('^{') || formula.includes('\\')) return formula;
    let out = '';
    for (const ch of formula) {
      if (subMap[ch]) {
        out += `_{${subMap[ch]}}`;
      } else if (supMap[ch]) {
        out += `^{${supMap[ch]}}`;
      } else if (ch === '·' || ch === '⋅') {
        out += ' \\cdot ';
      } else {
        out += ch;
      }
    }
    return out;
  };
  // Densités approximatives (g/cm3 équivalent) sans unité stockée (valeurs null si non trouvé rapidement)
  const densityMap: Record<string, number> = {
    'Acide chlorhydrique': 1.18,
    'Acide sulfurique': 1.84,
    'Acide nitrique': 1.51,
    'Acide acétique': 1.049,
    'Acide phosphorique': 1.88,
    'Hydroxyde de sodium': 2.13,
    'Hydroxyde de potassium': 2.04,
    'Hydroxyde de calcium': 2.24,
    Ammoniaque: 0.88,
    'Chlorure de sodium': 2.16,
    'Sulfate de cuivre pentahydraté': 2.28,
    "Nitrate d'argent": 4.35,
    'Chlorure de fer (III)': 2.9,
    Éthanol: 0.789,
    Méthanol: 0.792,
    Acétone: 0.791,
    Dichlorométhane: 1.33,
    Hexane: 0.655,
    Glucose: 1.54,
    Saccharose: 1.59,
    Urée: 1.335,
    'Dioxyde de carbone': 0.00198,
    Dihydrogène: 0.000083,
    Dioxygène: 0.00143,
    'Chlorure de magnésium': 2.32,
    'Sulfate de magnésium': 2.66,
    'Acide borique': 1.44,
    'Tétrachlorure de carbone': 1.59,
    'Chlorure de zinc': 2.91,
    'Acide oxalique': 1.9,
    'Bicarbonate de sodium': 2.2,
    'Phosphate de calcium': 3.14,
    "Chlorure d'ammonium": 1.53,
    'Acide citrique': 1.66,
    'Chlorure de cobalt(II)': 2.52,
    'Nitrate de potassium': 2.1,
    'Chlorure de calcium': 2.15,
    'Acide malique': 1.6,
    'Acide tartrique': 1.76,
    'Acide lactique': 1.21,
    'Chlorure de baryum': 3.86,
    'Sulfate de baryum': 4.5,
    'Chlorure de lithium': 2.07,
    'Sulfate de lithium': 2.22,
    "Chlorure d'aluminium": 2.44,
    "Sulfate d'aluminium": 2.71,
    'Chlorure de cuivre(I)': 4.14,
    'Sulfate de cuivre(I)': 3.6,
    'Chlorure de mercure(I)': 5.4,
    'Sulfate de mercure(I)': 6.47,
    'Chlorure de mercure(II)': 5.44,
    'Sulfate de mercure(II)': 6.47,
    'Chlorure de plomb(II)': 5.85,
    'Sulfate de plomb(II)': 6.2,
    'Sulfate de zinc': 3.54,
    'Chlorure de fer(II)': 3.4,
    'Sulfate de fer(II)': 2.84,
    'Acide formique': 1.22,
    'Acide benzoïque': 1.32,
    'Acide ascorbique': 1.65,
    'Acide salicylique': 1.44,
    'Acide picrique': 1.77,
    'Acide fluorhydrique': 0.99,
    'Acide chromique': 2.7,
    'Acide perchlorique': 1.77,
    'Acide sulfurique fumant': 1.89,
    'Acide phosphoreux': 1.65,
    'Acide borique anhydre': 2.46,
    'Acide succinique': 1.57,
    'Acide glutamique': 1.54,
    'Acide aspartique': 1.66,
    'Acide trichloroacétique': 1.63,
  };
  const batch = json.chemicals.map((c) => ({
    name: c.name,
    // Normalize formula to LaTeX inline where possible
    formula: toLatex(c.formula) ?? null,
    casNumber: c.casNumber ?? null,
    category: c.category ?? null,
    hazardClass: c.hazardClass ?? null,
    molarMass: typeof c.molarMass === 'number' ? c.molarMass : null,
    density: densityMap[c.name] ?? (typeof c.density === 'number' ? c.density : null),
    boilingPointC: typeof c.boilingPointC === 'number' ? c.boilingPointC : null,
    meltingPointC: typeof c.meltingPointC === 'number' ? c.meltingPointC : null,
  }));
  const chunkSize = 100;
  for (let i = 0; i < batch.length; i += chunkSize) {
    await prisma.reactifPreset.createMany({
      data: batch.slice(i, i + chunkSize),
      skipDuplicates: true,
    });
  }
  console.log(`🧪 ${batch.length} ReactifPreset insérés.`);
}

// Enrichissement températures (ex seed-temps.ts) – réduit ici (on reprend intégralement mapping d'origine)
interface TempData {
  boilingPointC?: number | null;
  meltingPointC?: number | null;
}
const tempsMapping: Record<string, TempData> = {
  'Acide chlorhydrique': { boilingPointC: -85, meltingPointC: -114 },
  'Acide sulfurique': { boilingPointC: 337, meltingPointC: 10 },
  'Acide nitrique': { boilingPointC: 83, meltingPointC: -42 },
  'Acide acétique': { boilingPointC: 118, meltingPointC: 16.6 },
  'Acide phosphorique': { boilingPointC: 158, meltingPointC: 42 },
  'Hydroxyde de sodium': { boilingPointC: 1388, meltingPointC: 318 },
  'Hydroxyde de potassium': { boilingPointC: 1320, meltingPointC: 360 },
  'Hydroxyde de calcium': { boilingPointC: 2850, meltingPointC: 580 },
  Ammoniaque: { boilingPointC: -33.3, meltingPointC: -77.7 },
  'Chlorure de sodium': { boilingPointC: 1465, meltingPointC: 801 },
  'Sulfate de cuivre pentahydraté': { boilingPointC: null, meltingPointC: 110 },
  "Nitrate d'argent": { boilingPointC: 444, meltingPointC: 212 },
  'Chlorure de fer (III)': { boilingPointC: 315, meltingPointC: 306 },
  Éthanol: { boilingPointC: 78.37, meltingPointC: -114 },
  Méthanol: { boilingPointC: 64.7, meltingPointC: -97.6 },
  Acétone: { boilingPointC: 56, meltingPointC: -95 },
  Dichlorométhane: { boilingPointC: 40, meltingPointC: -97 },
  Hexane: { boilingPointC: 68.7, meltingPointC: -95 },
  'Bleu de bromothymol': { boilingPointC: null, meltingPointC: 202 },
  Phénolphtaléine: { boilingPointC: null, meltingPointC: 262 },
  'Rouge de méthyle': { boilingPointC: null, meltingPointC: 180 },
  'Permanganate de potassium': { boilingPointC: null, meltingPointC: 240 },
  'Dichromate de potassium': { boilingPointC: null, meltingPointC: 398 },
  "Peroxyde d'hydrogène": { boilingPointC: 150.2, meltingPointC: -0.4 },
  Glucose: { boilingPointC: null, meltingPointC: 146 },
  Saccharose: { boilingPointC: null, meltingPointC: 186 },
  Urée: { boilingPointC: null, meltingPointC: 133 },
  'Dioxyde de carbone': { boilingPointC: -78.5, meltingPointC: -56.6 },
  Dihydrogène: { boilingPointC: -252.9, meltingPointC: -259.1 },
  Dioxygène: { boilingPointC: -183, meltingPointC: -218.8 },
  'Chlorure de magnésium': { boilingPointC: 1412, meltingPointC: 714 },
  'Sulfate de magnésium': { boilingPointC: 1124, meltingPointC: 1124 },
  'Acide borique': { boilingPointC: null, meltingPointC: 170 },
  'Tétrachlorure de carbone': { boilingPointC: 76.7, meltingPointC: -23 },
  'Chlorure de zinc': { boilingPointC: 732, meltingPointC: 290 },
  'Acide oxalique': { boilingPointC: null, meltingPointC: 189 },
  'Bicarbonate de sodium': { boilingPointC: null, meltingPointC: 50 },
  'Phosphate de calcium': { boilingPointC: null, meltingPointC: 1670 },
  "Chlorure d'ammonium": { boilingPointC: 520, meltingPointC: 338 },
  'Acide citrique': { boilingPointC: null, meltingPointC: 153 },
  'Chlorure de cobalt(II)': { boilingPointC: 1049, meltingPointC: 735 },
  'Nitrate de potassium': { boilingPointC: 400, meltingPointC: 334 },
  'Chlorure de calcium': { boilingPointC: 1935, meltingPointC: 772 },
  'Acide malique': { boilingPointC: null, meltingPointC: 131 },
  'Acide tartrique': { boilingPointC: null, meltingPointC: 170 },
  'Acide lactique': { boilingPointC: 122, meltingPointC: 53 },
  'Chlorure de baryum': { boilingPointC: 1560, meltingPointC: 963 },
  'Sulfate de baryum': { boilingPointC: null, meltingPointC: 1580 },
  'Chlorure de lithium': { boilingPointC: 1382, meltingPointC: 605 },
  'Sulfate de lithium': { boilingPointC: null, meltingPointC: 860 },
  "Chlorure d'aluminium": { boilingPointC: 180, meltingPointC: 192.4 },
  "Sulfate d'aluminium": { boilingPointC: null, meltingPointC: 770 },
  'Chlorure de cuivre(I)': { boilingPointC: 1490, meltingPointC: 430 },
  'Sulfate de cuivre(I)': { boilingPointC: null, meltingPointC: 200 },
  'Chlorure de mercure(I)': { boilingPointC: 383, meltingPointC: 383 },
  'Sulfate de mercure(I)': { boilingPointC: null, meltingPointC: 580 },
  'Chlorure de mercure(II)': { boilingPointC: 302, meltingPointC: 276 },
  'Sulfate de mercure(II)': { boilingPointC: null, meltingPointC: 580 },
  'Chlorure de plomb(II)': { boilingPointC: 950, meltingPointC: 501 },
  'Sulfate de plomb(II)': { boilingPointC: null, meltingPointC: 1170 },
  'Sulfate de zinc': { boilingPointC: null, meltingPointC: 680 },
  'Chlorure de fer(II)': { boilingPointC: 1023, meltingPointC: 677 },
  'Sulfate de fer(II)': { boilingPointC: null, meltingPointC: 680 },
  'Acide formique': { boilingPointC: 100.8, meltingPointC: 8.4 },
  'Acide benzoïque': { boilingPointC: 249, meltingPointC: 122.4 },
  'Acide ascorbique': { boilingPointC: null, meltingPointC: 190 },
  'Acide salicylique': { boilingPointC: 211, meltingPointC: 159 },
  'Acide picrique': { boilingPointC: 300, meltingPointC: 122.5 },
  'Acide fluorhydrique': { boilingPointC: 19.5, meltingPointC: -83.6 },
  'Acide chromique': { boilingPointC: null, meltingPointC: 197 },
  'Acide permanganique': { boilingPointC: null, meltingPointC: 20 },
  'Acide perchlorique': { boilingPointC: 203, meltingPointC: -17 },
  'Acide hypochloreux': { boilingPointC: null, meltingPointC: -23 },
  'Acide sulfurique fumant': { boilingPointC: 337, meltingPointC: 10 },
  'Acide phosphoreux': { boilingPointC: 200, meltingPointC: 73 },
  'Acide borique anhydre': { boilingPointC: null, meltingPointC: 450 },
  'Acide nitreux': { boilingPointC: null, meltingPointC: -11 },
  'Acide cyanurique': { boilingPointC: null, meltingPointC: 330 },
  'Acide adipique': { boilingPointC: null, meltingPointC: 151 },
  'Acide succinique': { boilingPointC: 235, meltingPointC: 185 },
  'Acide glutamique': { boilingPointC: null, meltingPointC: 205 },
  'Acide aspartique': { boilingPointC: null, meltingPointC: 270 },
  'Acide citramalique': { boilingPointC: null, meltingPointC: 105 },
  'Acide méthanesulfonique': { boilingPointC: 167, meltingPointC: 19 },
  'Acide trifluoroacétique': { boilingPointC: 72.4, meltingPointC: -15.3 },
  'Acide dichloroacétique': { boilingPointC: 194, meltingPointC: 9.6 },
  'Acide trichloroacétique': { boilingPointC: 196, meltingPointC: 53 },
  'Acide oxalique dihydraté': { boilingPointC: null, meltingPointC: 101 },
  'Acide malonique': { boilingPointC: null, meltingPointC: 135 },
  'Acide pimélique': { boilingPointC: null, meltingPointC: 103 },
  'Acide subérique': { boilingPointC: null, meltingPointC: 141 },
  'Acide azélaïque': { boilingPointC: null, meltingPointC: 106 },
  'Acide sébacique': { boilingPointC: null, meltingPointC: 134 },
  'Acide undécanoïque': { boilingPointC: 281, meltingPointC: 28 },
  'Acide dodécanoïque': { boilingPointC: 298.9, meltingPointC: 44 },
};
async function seedTemperatureEnrichment() {
  const presets = await prisma.reactifPreset.findMany();
  let updated = 0;
  for (const p of presets) {
    const data = tempsMapping[p.name];
    if (!data) continue;
    const needsUpdate =
      (data.boilingPointC !== undefined && p.boilingPointC == null) ||
      (data.meltingPointC !== undefined && p.meltingPointC == null);
    if (!needsUpdate) continue;
    await prisma.reactifPreset.update({
      where: { id: p.id },
      data: {
        boilingPointC: data.boilingPointC ?? p.boilingPointC,
        meltingPointC: data.meltingPointC ?? p.meltingPointC,
      },
    });
    updated++;
  }
  console.log(`🌡️  Températures enrichies sur ${updated} presets.`);
}

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
async function seedSystemClasses() {
  let created = 0;
  let updated = 0;
  for (const name of DEFAULT_SYSTEM_CLASSES) {
    const existing = await prisma.classe.findFirst({ where: { name } });
    if (!existing) {
      await prisma.classe.create({ data: { name, system: true } });
      created++;
    } else if (!existing.system) {
      await prisma.classe.update({ where: { id: existing.id }, data: { system: true } });
      updated++;
    }
  }
  console.log(`🏷️  Classes système ok (ajoutées: ${created}, mises à jour: ${updated}).`);
}

// Intégration complète de seed-salles.ts
async function seedSalles() {
  console.log('🏫 Seeding salles et localisations (global)...');
  const sallesData = [
    {
      name: 'Salle de Chimie A',
      description: 'Laboratoire principal de chimie avec paillasses équipées',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: 24,
      localisations: [
        'Paillasse 1',
        'Paillasse 2',
        'Paillasse 3',
        'Paillasse 4',
        'Armoire réactifs',
        'Hotte aspirante 1',
        'Hotte aspirante 2',
        'Placard matériel',
      ],
    },
    {
      name: 'Salle de Chimie B',
      description: 'Laboratoire secondaire de chimie',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: 16,
      localisations: [
        'Paillasse 1',
        'Paillasse 2',
        'Armoire matériel',
        'Hotte aspirante',
        'Réfrigérateur',
        'Placard produits',
      ],
    },
    {
      name: 'Salle de Physique A',
      description: 'Laboratoire de physique avec équipements optiques',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: 20,
      localisations: [
        'Table optique 1',
        'Table optique 2',
        'Armoire instruments',
        'Placard mesure',
        'Étagère oscilloscopes',
        'Réserve composants',
      ],
    },
    {
      name: 'Salle de Physique B',
      description: 'Laboratoire de physique mécanique et électricité',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: 18,
      localisations: [
        'Table mécanique 1',
        'Table mécanique 2',
        'Armoire électricité',
        'Placard moteurs',
        'Étagère capteurs',
        'Coffre générateurs',
      ],
    },
    {
      name: 'Salle SVT',
      description: 'Laboratoire de Sciences de la Vie et de la Terre',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: 22,
      localisations: [
        'Paillasse biologie 1',
        'Paillasse biologie 2',
        'Microscopes',
        'Réfrigérateur échantillons',
        'Armoire matériel bio',
        'Terrarium',
        'Aquarium',
        'Herbier',
      ],
    },
    {
      name: 'Salle Technologie',
      description: 'Atelier de technologie et fabrication',
      batiment: 'Bâtiment Technique',
      placesDisponibles: 15,
      localisations: [
        'Établi 1',
        'Établi 2',
        'Établi 3',
        'Armoire outils',
        'Placard matériaux',
        'Zone découpe',
        'Casiers projets',
        'Poste soudure',
      ],
    },
    {
      name: 'Salle Informatique',
      description: "Salle équipée d'ordinateurs pour les cours de programmation",
      batiment: 'Bâtiment Principal',
      placesDisponibles: 30,
      localisations: [
        'Poste 1-15',
        'Poste 16-30',
        'Bureau professeur',
        'Armoire serveur',
        'Placard câbles',
        'Imprimantes',
      ],
    },
    {
      name: 'Réserve Générale',
      description: 'Réserve centrale pour le matériel pédagogique',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: null,
      localisations: [
        'Étagère A',
        'Étagère B',
        'Étagère C',
        'Étagère D',
        'Armoire sécurisée',
        'Zone volumineux',
        'Réfrigérateur',
        'Congélateur',
      ],
    },
    {
      name: 'Préparation',
      description: 'Salle de préparation des expériences',
      batiment: 'Bâtiment Sciences',
      placesDisponibles: 4,
      localisations: [
        'Plan de travail 1',
        'Plan de travail 2',
        'Évier préparation',
        'Armoire produits',
        'Balance précision',
        'Hotte préparation',
      ],
    },
  ];
  let sallesCreated = 0;
  let locCreated = 0;
  for (const s of sallesData) {
    const existing = await prisma.salle.findUnique({ where: { name: s.name } });
    if (existing) {
      continue;
    }
    const salle = await prisma.salle.create({
      data: {
        name: s.name,
        description: s.description,
        batiment: s.batiment,
        placesDisponibles: s.placesDisponibles as any,
      },
    });
    sallesCreated++;
    for (const loc of s.localisations || []) {
      try {
        await prisma.localisation.create({
          data: { name: loc, salleId: salle.id, description: `Localisation dans ${salle.name}` },
        });
        locCreated++;
      } catch {}
    }
  }
  console.log(
    `🏫 Salles & localisations ok (new salles: ${sallesCreated}, localisations: ${locCreated})`,
  );
}

// Intégration complète de seed-suppliers.ts
async function seedSuppliers() {
  console.log('🏢 Seeding suppliers (global)...');
  const suppliersData = [
    {
      name: 'VWR International',
      contactEmail: 'commandes@vwr.com',
      phone: '01 47 45 67 89',
      address: '201 rue Carnot, 94120 Fontenay-sous-Bois',
      notes: 'Fournisseur principal pour produits chimiques et verrerie',
      kind: 'NORMAL',
    },
    {
      name: 'Fisher Scientific',
      contactEmail: 'service.client@fishersci.fr',
      phone: '01 60 92 48 00',
      address: '690 rue de la Bergeresse, 45160 Olivet',
      notes: 'Équipements de laboratoire et consommables',
      kind: 'NORMAL',
    },
    {
      name: 'Sigma-Aldrich',
      contactEmail: 'france@sigmaaldrich.com',
      phone: '01 41 99 26 00',
      address: "2909 route de Saint-Julien, 38297 L'Isle-d'Abeau",
      notes: 'Spécialisé en produits chimiques de haute qualité',
      kind: 'NORMAL',
    },
    {
      name: 'Merck KGaA',
      contactEmail: 'commandes.fr@merckgroup.com',
      phone: '01 47 14 67 00',
      address: "Immeuble Ampère, 1 place de l'Iris, 92400 Courbevoie",
      notes: 'Produits chimiques et équipements analytiques',
      kind: 'NORMAL',
    },
    {
      name: 'PHYWE France',
      contactEmail: 'info@phywe.fr',
      phone: '03 88 67 52 56',
      address: "Parc d'Innovation, 650 Boulevard Gonthier d'Andernach, 67400 Illkirch",
      notes: 'Équipements pédagogiques pour physique',
      kind: 'NORMAL',
    },
    {
      name: 'Leybold Didactic',
      contactEmail: 'info@leybold-didactic.com',
      phone: '01 48 62 26 60',
      address: '3 rue de la Bresle, 78310 Maurepas',
      notes: 'Matériel didactique physique et technologie',
      kind: 'NORMAL',
    },
    {
      name: '3B Scientific',
      contactEmail: 'info@3bscientific.fr',
      phone: '03 88 38 40 60',
      address: 'Zone industrielle, 15 rue des Frères Lumière, 68200 Mulhouse',
      notes: 'Modèles anatomiques et équipements sciences',
      kind: 'NORMAL',
    },
    {
      name: 'Sordalab',
      contactEmail: 'info@sordalab.com',
      phone: '05 61 71 38 29',
      address: "1 avenue de l'Europe, 31130 Balma",
      notes: 'Verrerie et petit matériel de laboratoire',
      kind: 'NORMAL',
    },
    {
      name: 'Deltalab',
      contactEmail: 'commandes@deltalab.fr',
      phone: '01 69 79 44 70',
      address: 'Parc Gutenberg, Voie C, 91620 Nozay',
      notes: 'Consommables et plastiques de laboratoire',
      kind: 'NORMAL',
    },
    {
      name: 'Amazon Business',
      contactEmail: 'amazon-business@amazon.fr',
      phone: '0800 91 19 11',
      address: 'Service client en ligne',
      notes: 'Achats ponctuels et matériel général',
      kind: 'NORMAL',
    },
    {
      name: 'Bureau Vallée',
      contactEmail: 'contact@bureau-vallee.fr',
      phone: '02 38 87 29 00',
      address: "ZAC des Portes de l'Orléanais, 45770 Saran",
      notes: 'Fournitures de bureau et petit matériel',
      kind: 'NORMAL',
    },
    {
      name: 'Manutan',
      contactEmail: 'info@manutan.fr',
      phone: '02 38 58 88 00',
      address: 'BP 67, 45330 Le Malesherbois',
      notes: 'Équipements généraux et mobilier',
      kind: 'NORMAL',
    },
    {
      name: 'RS Components',
      contactEmail: 'ventes@rs-components.com',
      phone: '01 60 92 94 94',
      address: 'Rue des Frères Caudron, 78140 Vélizy-Villacoublay',
      notes: 'Composants électroniques et équipements techniques',
      kind: 'NORMAL',
    },
    {
      name: 'Farnell',
      contactEmail: 'websales@farnell.com',
      phone: '01 46 62 26 60',
      address: '6 rue André Ampère, 91300 Massy',
      notes: 'Électronique et automatisme industriel',
      kind: 'NORMAL',
    },
    {
      name: 'Conrad Electronic',
      contactEmail: 'info@conrad.fr',
      phone: '01 56 47 51 00',
      address: '44 avenue de la République, 93300 Aubervilliers',
      notes: 'Électronique grand public et outillage',
      kind: 'NORMAL',
    },
    {
      name: 'Établissements Dupont',
      contactEmail: 'contact@etablissements-dupont.fr',
      phone: '02 35 67 89 10',
      address: '15 rue de la Science, 76000 Rouen',
      notes: 'Fournisseur local, livraisons rapides',
      kind: 'NORMAL',
    },
    {
      name: 'Labo Services',
      contactEmail: 'commandes@labo-services.com',
      phone: '04 76 87 45 23',
      address: '28 avenue de la Chimie, 38000 Grenoble',
      notes: 'Maintenance et fournitures spécialisées',
      kind: 'NORMAL',
    },
  ];
  let created = 0;
  for (const s of suppliersData) {
    const existing = await prisma.supplier.findUnique({ where: { name: s.name } });
    if (existing) continue;
    await prisma.supplier.create({ data: s as any });
    created++;
  }
  console.log(`🏢 Suppliers ok (new: ${created})`);
}

// ---- Materiel (intégration de seed-materiel.js) ----
// Catégories de base (seedMaterielCategories)
async function seedMaterielCategories() {
  const categories = [
    {
      name: 'Verrerie',
      discipline: 'chimie',
      description: 'Récipients en verre pour expériences chimiques',
    },
    {
      name: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Verrerie jaugée pour mesures précises',
    },
    {
      name: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Appareils de mesure pour analyse chimique',
    },
    {
      name: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Équipements de chauffage et mélange',
    },
    { name: 'Distillation', discipline: 'chimie', description: 'Matériel pour distillation' },
    { name: 'Filtration', discipline: 'chimie', description: 'Matériel pour filtration' },
    { name: 'Électrochimie', discipline: 'chimie', description: 'Matériel pour électrochimie' },
    {
      name: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Appareils de mesure électronique',
    },
    {
      name: 'Composants électroniques',
      discipline: 'physique',
      description: 'Composants pour circuits électroniques',
    },
    {
      name: 'Mécanique',
      discipline: 'physique',
      description: 'Équipements pour expériences de mécanique',
    },
    { name: 'Optique', discipline: 'physique', description: "Matériel pour expériences d'optique" },
    {
      name: 'Thermodynamique',
      discipline: 'physique',
      description: 'Équipements pour études thermodynamiques',
    },
    {
      name: 'Ondes et vibrations',
      discipline: 'physique',
      description: 'Matériel pour ondes et vibrations',
    },
    {
      name: 'Radioactivité',
      discipline: 'physique',
      description: 'Matériel pour expériences de radioactivité',
    },
    {
      name: 'Sécurité',
      discipline: 'commun',
      description: 'Équipements de protection individuelle',
    },
    {
      name: 'Lavage et nettoyage',
      discipline: 'commun',
      description: "Matériel d'entretien et nettoyage",
    },
    {
      name: 'Supports et fixation',
      discipline: 'commun',
      description: 'Supports, pinces et systèmes de fixation',
    },
    {
      name: 'Stockage et rangement',
      discipline: 'commun',
      description: 'Rangement et stockage du matériel',
    },
    {
      name: 'Outils généraux',
      discipline: 'commun',
      description: 'Outils polyvalents pour laboratoire',
    },
  ];
  for (const category of categories) {
    await prisma.materielCategorie.upsert({
      where: { name_discipline: { name: category.name, discipline: category.discipline } },
      update: { description: category.description },
      create: category,
    });
  }
  console.log('📂 Catégories matériel ok');
}

async function seedMaterielPresets() {
  console.log('🔬 Seeding MaterielPreset (full)...');
  const chimiePresets = [
    {
      name: 'Bécher',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Bécher en verre borosilicate pour mesures et réactions',
      defaultQty: 5,
    },
    {
      name: 'Erlenmeyer',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Fiole conique pour réactions et titrages',
      defaultQty: 3,
    },
    {
      name: 'Tube à essai',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Tubes pour petites expériences et tests',
      defaultQty: 50,
    },
    {
      name: 'Verre de montre',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Support pour évaporation et pesées',
      defaultQty: 10,
    },
    {
      name: 'Entonnoir',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Entonnoir en verre pour transferts',
      defaultQty: 5,
    },
    {
      name: 'Cristallisoir',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Récipient large pour cristallisation',
      defaultQty: 3,
    },
    {
      name: 'Ballon à fond rond',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Ballon pour distillation et chauffage',
      defaultQty: 5,
    },
    {
      name: 'Ballon à fond plat',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Ballon pour réactions avec agitation',
      defaultQty: 5,
    },
    {
      name: 'Ampoule à décanter',
      category: 'Verrerie',
      discipline: 'chimie',
      description: 'Séparation de liquides non miscibles',
      defaultQty: 3,
    },
    {
      name: 'Pipette jaugée',
      category: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Pipette de précision pour mesures volumétriques',
      defaultQty: 2,
    },
    {
      name: 'Burette graduée',
      category: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Burette pour titrages précis',
      defaultQty: 2,
    },
    {
      name: 'Fiole jaugée',
      category: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Fiole pour préparation de solutions',
      defaultQty: 5,
    },
    {
      name: 'Pipette graduée',
      category: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Pipette graduée pour mesures variables',
      defaultQty: 5,
    },
    {
      name: 'Éprouvette graduée',
      category: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Mesure approximative de volumes',
      defaultQty: 10,
    },
    {
      name: 'Micropipette',
      category: 'Verrerie de précision',
      discipline: 'chimie',
      description: 'Pipette de très haute précision',
      defaultQty: 3,
    },
    {
      name: 'Balance analytique',
      category: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Balance de précision 0.1mg',
      defaultQty: 1,
    },
    {
      name: 'pH-mètre',
      category: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Mesure précise du pH',
      defaultQty: 1,
    },
    {
      name: 'Conductimètre',
      category: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Mesure de la conductivité',
      defaultQty: 1,
    },
    {
      name: 'Thermomètre',
      category: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Mesure de température',
      defaultQty: 5,
    },
    {
      name: 'Densimètre',
      category: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Mesure de la densité des liquides',
      defaultQty: 2,
    },
    {
      name: 'Colorimètre',
      category: 'Instruments de mesure',
      discipline: 'chimie',
      description: 'Analyse spectrophotométrique',
      defaultQty: 1,
    },
    {
      name: 'Agitateur magnétique',
      category: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Agitateur magnétique avec chauffage',
      defaultQty: 2,
    },
    {
      name: 'Plaque chauffante',
      category: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Plaque chauffante pour réactions',
      defaultQty: 3,
    },
    {
      name: 'Bain-marie',
      category: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Chauffage au bain-marie',
      defaultQty: 2,
    },
    {
      name: 'Bec Bunsen',
      category: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Brûleur à gaz pour chauffage direct',
      defaultQty: 5,
    },
    {
      name: 'Four',
      category: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Four haute température',
      defaultQty: 1,
    },
    {
      name: 'Étuve',
      category: 'Chauffage et agitation',
      discipline: 'chimie',
      description: 'Séchage à température contrôlée',
      defaultQty: 1,
    },
    {
      name: 'Colonne de distillation',
      category: 'Distillation',
      discipline: 'chimie',
      description: 'Colonne pour distillation fractionnée',
      defaultQty: 2,
    },
    {
      name: 'Réfrigérant',
      category: 'Distillation',
      discipline: 'chimie',
      description: 'Condenseur pour distillation',
      defaultQty: 3,
    },
    {
      name: 'Tête de distillation',
      category: 'Distillation',
      discipline: 'chimie',
      description: 'Adaptateur pour montage de distillation',
      defaultQty: 3,
    },
    {
      name: 'Entonnoir Büchner',
      category: 'Filtration',
      discipline: 'chimie',
      description: 'Filtration sous vide',
      defaultQty: 3,
    },
    {
      name: 'Fiole à vide',
      category: 'Filtration',
      discipline: 'chimie',
      description: 'Récipient pour filtration sous vide',
      defaultQty: 3,
    },
    {
      name: 'Papier filtre',
      category: 'Filtration',
      discipline: 'chimie',
      description: 'Papier pour filtration',
      defaultQty: 100,
    },
    {
      name: 'Électrodes',
      category: 'Électrochimie',
      discipline: 'chimie',
      description: 'Électrodes pour électrolyse',
      defaultQty: 6,
    },
    {
      name: 'Générateur de courant',
      category: 'Électrochimie',
      discipline: 'chimie',
      description: 'Source de courant continu',
      defaultQty: 2,
    },
    {
      name: 'Hotte aspirante',
      category: 'Sécurité',
      discipline: 'chimie',
      description: 'Évacuation des vapeurs toxiques',
      defaultQty: 2,
    },
    {
      name: 'Douche de sécurité',
      category: 'Sécurité',
      discipline: 'chimie',
      description: "Douche d'urgence",
      defaultQty: 1,
    },
    {
      name: 'Lave-œil',
      category: 'Sécurité',
      discipline: 'chimie',
      description: "Rinçage oculaire d'urgence",
      defaultQty: 2,
    },
  ];
  const physiquePresets = [
    {
      name: 'Multimètre',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Mesure tension, courant, résistance',
      defaultQty: 5,
    },
    {
      name: 'Oscilloscope',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Visualisation des signaux électriques',
      defaultQty: 2,
    },
    {
      name: 'Générateur de fonctions',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Génération de signaux variables',
      defaultQty: 2,
    },
    {
      name: 'Alimentation stabilisée',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Source de tension continue variable',
      defaultQty: 3,
    },
    {
      name: 'Ampèremètre',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Mesure du courant électrique',
      defaultQty: 5,
    },
    {
      name: 'Voltmètre',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Mesure de la tension électrique',
      defaultQty: 5,
    },
    {
      name: 'Wattmètre',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Mesure de la puissance électrique',
      defaultQty: 2,
    },
    {
      name: 'Ohmmètre',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Mesure de la résistance électrique',
      defaultQty: 3,
    },
    {
      name: 'Capacimètre',
      category: 'Instruments de mesure électrique',
      discipline: 'physique',
      description: 'Mesure de la capacité',
      defaultQty: 2,
    },
    {
      name: 'Résistances',
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Assortiment de résistances diverses',
      defaultQty: 100,
    },
    {
      name: 'Condensateurs',
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Condensateurs de différentes valeurs',
      defaultQty: 50,
    },
    {
      name: "Bobines d'induction",
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Bobines pour circuits inductifs',
      defaultQty: 20,
    },
    {
      name: 'Diodes',
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Diodes pour redressement',
      defaultQty: 30,
    },
    {
      name: 'LED',
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Diodes électroluminescentes',
      defaultQty: 50,
    },
    {
      name: 'Transistors',
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Transistors NPN et PNP',
      defaultQty: 20,
    },
    {
      name: "Plaques d'essai",
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Breadboard pour prototypage',
      defaultQty: 10,
    },
    {
      name: 'Fils de connexion',
      category: 'Composants électroniques',
      discipline: 'physique',
      description: 'Fils pour montages électriques',
      defaultQty: 200,
    },
    {
      name: 'Dynamomètre',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Mesure des forces',
      defaultQty: 10,
    },
    {
      name: 'Règle graduée',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Mesure de longueurs',
      defaultQty: 20,
    },
    {
      name: 'Pied à coulisse',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Mesure précise de dimensions',
      defaultQty: 5,
    },
    {
      name: 'Micromètre',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Mesure de très haute précision',
      defaultQty: 3,
    },
    {
      name: 'Chronomètre',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Mesure précise du temps',
      defaultQty: 5,
    },
    {
      name: 'Balance de précision',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Mesure de masse précise',
      defaultQty: 2,
    },
    {
      name: 'Ressorts',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Ressorts pour études élastiques',
      defaultQty: 20,
    },
    {
      name: 'Masses marquées',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Masses étalons pour expériences',
      defaultQty: 50,
    },
    {
      name: 'Pendule simple',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Étude des oscillations',
      defaultQty: 5,
    },
    {
      name: 'Plan incliné',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Étude des forces sur plan incliné',
      defaultQty: 3,
    },
    {
      name: 'Poulie',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Système de poulies simples',
      defaultQty: 10,
    },
    {
      name: 'Levier',
      category: 'Mécanique',
      discipline: 'physique',
      description: 'Étude des moments de force',
      defaultQty: 5,
    },
    {
      name: 'Prisme',
      category: 'Optique',
      discipline: 'physique',
      description: 'Décomposition de la lumière',
      defaultQty: 5,
    },
    {
      name: 'Lentille convergente',
      category: 'Optique',
      discipline: 'physique',
      description: 'Lentille pour expériences optiques',
      defaultQty: 10,
    },
    {
      name: 'Lentille divergente',
      category: 'Optique',
      discipline: 'physique',
      description: 'Lentille divergente pour optique',
      defaultQty: 10,
    },
    {
      name: 'Miroir plan',
      category: 'Optique',
      discipline: 'physique',
      description: 'Miroir pour réflexion',
      defaultQty: 10,
    },
    {
      name: 'Miroir concave',
      category: 'Optique',
      discipline: 'physique',
      description: 'Miroir sphérique concave',
      defaultQty: 5,
    },
    {
      name: 'Miroir convexe',
      category: 'Optique',
      discipline: 'physique',
      description: 'Miroir sphérique convexe',
      defaultQty: 5,
    },
    {
      name: 'Laser He-Ne',
      category: 'Optique',
      discipline: 'physique',
      description: 'Laser pour expériences optiques',
      defaultQty: 2,
    },
    {
      name: 'Écran translucide',
      category: 'Optique',
      discipline: 'physique',
      description: 'Écran pour projections optiques',
      defaultQty: 5,
    },
    {
      name: 'Demi-cylindre',
      category: 'Optique',
      discipline: 'physique',
      description: 'Étude de la réfraction',
      defaultQty: 5,
    },
    {
      name: 'Fibres optiques',
      category: 'Optique',
      discipline: 'physique',
      description: 'Guidage de la lumière',
      defaultQty: 10,
    },
    {
      name: 'Polariseur',
      category: 'Optique',
      discipline: 'physique',
      description: 'Filtres polarisants',
      defaultQty: 5,
    },
    {
      name: 'Réseau de diffraction',
      category: 'Optique',
      discipline: 'physique',
      description: 'Analyse spectrale',
      defaultQty: 3,
    },
    {
      name: 'Thermomètre électronique',
      category: 'Thermodynamique',
      discipline: 'physique',
      description: 'Mesure précise de température',
      defaultQty: 5,
    },
    {
      name: 'Calorimètre',
      category: 'Thermodynamique',
      discipline: 'physique',
      description: 'Mesure de chaleur',
      defaultQty: 3,
    },
    {
      name: 'Thermocouple',
      category: 'Thermodynamique',
      discipline: 'physique',
      description: 'Capteur de température',
      defaultQty: 10,
    },
    {
      name: 'Plaque chauffante',
      category: 'Thermodynamique',
      discipline: 'physique',
      description: 'Source de chaleur contrôlée',
      defaultQty: 3,
    },
    {
      name: 'Bain thermostaté',
      category: 'Thermodynamique',
      discipline: 'physique',
      description: 'Maintien de température constante',
      defaultQty: 2,
    },
    {
      name: "Générateur d'ultrasons",
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: "Production d'ultrasons",
      defaultQty: 2,
    },
    {
      name: "Récepteur d'ultrasons",
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: "Détection d'ultrasons",
      defaultQty: 2,
    },
    {
      name: 'Diapason',
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: 'Source de fréquence pure',
      defaultQty: 5,
    },
    {
      name: 'Microphone',
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: 'Capteur de son',
      defaultQty: 3,
    },
    {
      name: 'Haut-parleur',
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: 'Émetteur de son',
      defaultQty: 3,
    },
    {
      name: 'Corde vibrante',
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: 'Étude des ondes stationnaires',
      defaultQty: 3,
    },
    {
      name: 'Vibreur',
      category: 'Ondes et vibrations',
      discipline: 'physique',
      description: 'Générateur de vibrations',
      defaultQty: 2,
    },
    {
      name: 'Compteur Geiger',
      category: 'Radioactivité',
      discipline: 'physique',
      description: 'Détection de radioactivité',
      defaultQty: 1,
    },
    {
      name: 'Chambre à brouillard',
      category: 'Radioactivité',
      discipline: 'physique',
      description: 'Visualisation des particules',
      defaultQty: 1,
    },
  ];
  const communPresets = [
    {
      name: 'Pissette',
      category: 'Lavage et nettoyage',
      discipline: 'commun',
      description: 'Pissette pour rinçage',
      defaultQty: 10,
    },
    {
      name: 'Bac de lavage',
      category: 'Lavage et nettoyage',
      discipline: 'commun',
      description: 'Bac pour nettoyage du matériel',
      defaultQty: 3,
    },
    {
      name: 'Brosse de nettoyage',
      category: 'Lavage et nettoyage',
      discipline: 'commun',
      description: 'Brosses pour nettoyage verrerie',
      defaultQty: 20,
    },
    {
      name: 'Égouttoir',
      category: 'Lavage et nettoyage',
      discipline: 'commun',
      description: 'Séchage du matériel lavé',
      defaultQty: 5,
    },
    {
      name: 'Chiffons de laboratoire',
      category: 'Lavage et nettoyage',
      discipline: 'commun',
      description: 'Chiffons non pelucheux',
      defaultQty: 50,
    },
    {
      name: 'Gants de protection',
      category: 'Sécurité',
      discipline: 'commun',
      description: 'Gants nitrile pour manipulation',
      defaultQty: 50,
    },
    {
      name: 'Lunettes de sécurité',
      category: 'Sécurité',
      discipline: 'commun',
      description: 'Protection oculaire',
      defaultQty: 30,
    },
    {
      name: 'Blouse de laboratoire',
      category: 'Sécurité',
      discipline: 'commun',
      description: 'Protection vestimentaire',
      defaultQty: 30,
    },
    {
      name: 'Masque de protection',
      category: 'Sécurité',
      discipline: 'commun',
      description: 'Protection respiratoire',
      defaultQty: 100,
    },
    {
      name: 'Extincteur',
      category: 'Sécurité',
      discipline: 'commun',
      description: 'Extincteur CO2 pour laboratoire',
      defaultQty: 2,
    },
    {
      name: 'Couverture anti-feu',
      category: 'Sécurité',
      discipline: 'commun',
      description: "Étouffoir en cas d'incendie",
      defaultQty: 2,
    },
    {
      name: 'Trousse de premiers secours',
      category: 'Sécurité',
      discipline: 'commun',
      description: 'Kit de premiers soins',
      defaultQty: 2,
    },
    {
      name: 'Support universel',
      category: 'Supports et fixation',
      discipline: 'commun',
      description: 'Support avec tige et pinces',
      defaultQty: 10,
    },
    {
      name: 'Pince universelle',
      category: 'Supports et fixation',
      discipline: 'commun',
      description: 'Pinces pour fixation',
      defaultQty: 20,
    },
    {
      name: 'Noix de serrage',
      category: 'Supports et fixation',
      discipline: 'commun',
      description: 'Système de serrage universel',
      defaultQty: 30,
    },
    {
      name: 'Anneau en fer',
      category: 'Supports et fixation',
      discipline: 'commun',
      description: "Anneau pour support d'entonnoir",
      defaultQty: 15,
    },
    {
      name: 'Grille métallique',
      category: 'Supports et fixation',
      discipline: 'commun',
      description: 'Grille pour chauffage indirect',
      defaultQty: 10,
    },
    {
      name: 'Triangle de porcelaine',
      category: 'Supports et fixation',
      discipline: 'commun',
      description: 'Support pour creuset',
      defaultQty: 5,
    },
    {
      name: 'Portoir à tubes',
      category: 'Stockage et rangement',
      discipline: 'commun',
      description: 'Rangement des tubes à essai',
      defaultQty: 10,
    },
    {
      name: 'Boîte de Pétri',
      category: 'Stockage et rangement',
      discipline: 'commun',
      description: 'Boîtes en verre ou plastique',
      defaultQty: 50,
    },
    {
      name: 'Flacon de stockage',
      category: 'Stockage et rangement',
      discipline: 'commun',
      description: 'Flacons divers volumes',
      defaultQty: 30,
    },
    {
      name: 'Étiquettes',
      category: 'Stockage et rangement',
      discipline: 'commun',
      description: 'Étiquetage du matériel',
      defaultQty: 500,
    },
    {
      name: 'Spatule',
      category: 'Outils généraux',
      discipline: 'commun',
      description: 'Spatule en acier inoxydable',
      defaultQty: 15,
    },
    {
      name: 'Cuillère à combustion',
      category: 'Outils généraux',
      discipline: 'commun',
      description: 'Cuillère pour manipulation produits',
      defaultQty: 10,
    },
    {
      name: 'Pince à creuset',
      category: 'Outils généraux',
      discipline: 'commun',
      description: 'Manipulation objets chauds',
      defaultQty: 5,
    },
    {
      name: 'Bouchons',
      category: 'Outils généraux',
      discipline: 'commun',
      description: 'Bouchons caoutchouc diverses tailles',
      defaultQty: 100,
    },
    {
      name: 'Tubes en caoutchouc',
      category: 'Outils généraux',
      discipline: 'commun',
      description: 'Tubes flexibles pour connexions',
      defaultQty: 50,
    },
  ];
  const allPresets = [...chimiePresets, ...physiquePresets, ...communPresets];
  for (const preset of allPresets) {
    let cat = await prisma.materielCategorie.findFirst({
      where: { name: preset.category, discipline: preset.discipline },
    });
    if (!cat) continue; // cat seed déjà fait
    const data: any = {
      name: preset.name,
      discipline: preset.discipline,
      description: preset.description,
      defaultQty: preset.defaultQty,
      categoryId: cat.id,
      category: null,
    };
    await prisma.materielPreset.upsert({
      where: { name_discipline: { name: preset.name, discipline: preset.discipline } },
      update: data,
      create: data,
    });
  }
  console.log(`🔬 Presets matériel ok (total: ${allPresets.length})`);
}

async function seedMaterielPerso() {
  console.log('⚙️  Seeding MaterielPerso (global)...');
  const verrerieChimie = await prisma.materielCategorie.findFirst({
    where: { name: 'Verrerie', discipline: 'chimie' },
  });
  const instrumentsPhysique = await prisma.materielCategorie.findFirst({
    where: { name: 'Instruments de mesure électrique', discipline: 'physique' },
  });
  const materielPersons: any[] = [
    {
      name: 'Bécher gradué spécial haute température',
      discipline: 'chimie',
      description: 'Bécher résistant aux hautes températures avec graduation précise',
      categorieId: verrerieChimie?.id,
      volumes: ['50ml', '100ml', '250ml', '500ml', '1L'],
      caracteristiques: {
        'Température max': '500°C',
        Matériau: 'Verre borosilicate',
        Précision: '±2%',
      },
      defaultQty: 3,
    },
    {
      name: 'Multimètre numérique professionnel',
      discipline: 'physique',
      description: 'Multimètre haute précision avec interface USB',
      categorieId: instrumentsPhysique?.id,
      volumes: [],
      caracteristiques: { 'Précision tension': '±0.01%', Interface: 'USB + Bluetooth' },
      defaultQty: 2,
    },
  ];
  for (const m of materielPersons) {
    const existing = await prisma.materielPerso.findFirst({
      where: { name: m.name, discipline: m.discipline },
    });
    if (!existing) {
      await prisma.materielPerso.create({ data: m });
    } else {
      await prisma.materielPerso.update({ where: { id: existing.id }, data: m });
    }
  }
  console.log('⚙️  MaterielPerso ok');
}

async function seedMaterielFromPresets() {
  console.log('🔧 Seeding Materiel (items) depuis presets...');
  const presets = await prisma.materielPreset.findMany({ take: 100 });
  const salles = await prisma.salle.findMany({ take: 5 });
  const locs = await prisma.localisation.findMany({ take: 5 });
  for (const p of presets) {
    const existing = await prisma.materielInventaire.findFirst({
      where: { materielPresetId: p.id },
    });
    if (existing) continue;
    try {
      await prisma.materielInventaire.create({
        data: {
          discipline: p.discipline === 'commun' ? 'chimie' : p.discipline,
          name: p.name,
          quantity: p.defaultQty ?? 1,
          minStock: Math.max(4, Math.floor((p.defaultQty ?? 1) * 0.2)), // 20% de la quantité par défaut
          materielPresetId: p.id,
          categoryId: p.categoryId ?? undefined,
          salleId: salles[0]?.id,
          localisationId: locs[0]?.id,
          notes: 'Seeded from preset',
        },
      });
    } catch {}
  }
  console.log('🔧 Materiel items ok');
}

async function seedReactifInventaires() {
  // ex seed-reactifs.ts
  console.log('🧪 Seeding inventaires (chimie)');
  let presets = await prisma.reactifPreset.findMany({ take: 20 });
  if (presets.length === 0) {
    await seedReactifPresets();
    presets = await prisma.reactifPreset.findMany({ take: 20 });
  }
  const salles = await prisma.salle.findMany({ take: 5 });
  for (const preset of presets) {
    const existing = await prisma.reactifInventaire.findFirst({
      where: { reactifPresetId: preset.id },
    });
    if (existing) continue;
    try {
      await prisma.reactifInventaire.create({
        data: {
          reactifPresetId: preset.id,
          stock: Math.round(Math.random() * 500) / 10,
          unit: 'g',
          salleId: salles[0]?.id,
          notes: 'Seeded item',
        },
      });
    } catch {}
  }
  console.log('🧂 Inventaires réactifs ok');
}

async function seedPhysiqueInventaires() {
  // ex seed-physique-reactifs.ts
  console.log('🧲 Seeding inventaires physique');
  const physicsSalle = await prisma.salle.findFirst({ where: { name: { contains: 'Physique' } } });
  const salle = physicsSalle ?? (await prisma.salle.findFirst());
  const presets = await prisma.reactifPreset.findMany({ take: 10 });
  for (const preset of presets) {
    const exists = await prisma.reactifInventaire.findFirst({
      where: { reactifPresetId: preset.id, salleId: salle?.id },
    });
    if (exists) continue;
    try {
      await prisma.reactifInventaire.create({
        data: {
          reactifPresetId: preset.id,
          stock: Math.round(Math.random() * 50) + 5,
          unit: 'pcs',
          salleId: salle?.id,
          notes: 'Physique seed',
        },
      });
    } catch {}
  }
  console.log('🧲 Inventaires physique ok');
}

// Seed application settings defaults into AppSetting table (idempotent)
async function seedAppSettingsDefaults() {
  console.log('⚙️  Seeding AppSetting defaults...');
  const defaults = {
    maintenanceMode: false,
    maintenanceAllowedUserIds: [1],
    allowRegistrations: true,
    defaultUserRole: 'ENSEIGNANT',
    sessionTimeoutMinutes: 480,
    timezone: 'Europe/Paris',
    brandingName: 'SGIL',
    NOM_ETABLISSEMENT: 'Paul VALÉRY — Paris 12e',
    lockThreshold: 5,
    lockWindowMinutes: 15,
    lockDurationMinutes: 15,
    notificationOwnerEvents: {
      enabled: true,
      includeTimeslots: true,
      includeDocuments: true,
      blockedUserIds: [],
    },
    accountNotifications: {
      loginSuccess: false,
      loginFailed: true,
      passwordChanged: true,
      passwordResetRequested: true,
      passwordResetCompleted: true,
      emailChangeRequested: true,
      emailChanged: true,
    },
    adminAllowedRoles: ['ADMIN'],
    adminAllowedUserIds: [1],
    inspectionAllowedRoles: ['ADMIN'],
    inspectionAllowedUserIds: [1],
  } as const;
  for (const [key, val] of Object.entries(defaults)) {
    try {
      if (typeof val === 'object' && !Array.isArray(val)) {
        await prisma.appSetting.upsert({
          where: { key },
          update: { jsonValue: val as any, value: null },
          create: { key, jsonValue: val as any },
        });
      } else {
        await prisma.appSetting.upsert({
          where: { key },
          update: { value: String(val), jsonValue: undefined },
          create: { key, value: String(val) },
        });
      }
    } catch {}
  }
  console.log('⚙️  AppSetting defaults ok');
}

// Intégration complète de seed-notification-configs.ts (liste complète)
const NOTIFICATION_CONFIGS = [
  {
    module: 'USERS',
    actionType: 'CREATE',
    name: 'Nouvel utilisateur',
    description: "Notification lors de l\'ajout d'un nouvel utilisateur",
    severity: 'medium',
  },
  {
    module: 'USERS',
    actionType: 'UPDATE',
    name: 'Modification utilisateur',
    description: "Notification lors de la modification des informations d'un utilisateur",
    severity: 'low',
  },
  {
    module: 'USERS',
    actionType: 'DELETE',
    name: 'Suppression utilisateur',
    description: "Notification lors de la suppression d'un utilisateur",
    severity: 'high',
  },
  {
    module: 'USERS',
    actionType: 'STATUS',
    name: 'Changement de statut',
    description: "Notification lors du changement de rôle ou statut d'un utilisateur",
    severity: 'medium',
  },
  {
    module: 'CHEMICALS',
    actionType: 'CREATE',
    name: 'Nouveau produit chimique',
    description: "Notification lors de l'ajout d'un nouveau produit chimique",
    severity: 'medium',
  },
  {
    module: 'CHEMICALS',
    actionType: 'UPDATE',
    name: 'Modification produit chimique',
    description: "Notification lors de la modification d'un produit chimique",
    severity: 'low',
  },
  {
    module: 'CHEMICALS',
    actionType: 'DELETE',
    name: 'Suppression produit chimique',
    description: "Notification lors de la suppression d'un produit chimique",
    severity: 'high',
  },
  {
    module: 'CHEMICALS',
    actionType: 'ALERT',
    name: 'Alerte stock faible',
    description: "Alerte lorsque le stock d'un produit chimique est faible",
    severity: 'high',
  },
  {
    module: 'CHEMICALS',
    actionType: 'STATUS',
    name: 'Changement de statut',
    description: "Notification lors du changement de statut d'un produit chimique",
    severity: 'medium',
  },
  {
    module: 'MATERIEL',
    actionType: 'CREATE',
    name: 'Nouvel équipement',
    description: "Notification lors de l'ajout d'un nouvel équipement",
    severity: 'medium',
  },
  {
    module: 'MATERIEL',
    actionType: 'UPDATE',
    name: 'Modification équipement',
    description: "Notification lors de la modification d'un équipement",
    severity: 'low',
  },
  {
    module: 'MATERIEL',
    actionType: 'DELETE',
    name: 'Suppression équipement',
    description: "Notification lors de la suppression d'un équipement",
    severity: 'high',
  },
  {
    module: 'MATERIEL',
    actionType: 'STATUS',
    name: 'Changement de statut',
    description:
      "Notification lors du changement de statut d'un équipement (maintenance, réparation)",
    severity: 'medium',
  },
  {
    module: 'MATERIEL',
    actionType: 'ALERT',
    name: 'Alerte maintenance',
    description: "Alerte pour la maintenance préventive d'un équipement",
    severity: 'medium',
  },
  {
    module: 'ROOMS',
    actionType: 'CREATE',
    name: 'Nouvelle salle',
    description: "Notification lors de l\'ajout d'une nouvelle salle",
    severity: 'low',
  },
  {
    module: 'ROOMS',
    actionType: 'UPDATE',
    name: 'Modification salle',
    description: "Notification lors de la modification d'une salle",
    severity: 'low',
  },
  {
    module: 'ROOMS',
    actionType: 'DELETE',
    name: 'Suppression salle',
    description: "Notification lors de la suppression d'une salle",
    severity: 'medium',
  },
  {
    module: 'ROOMS',
    actionType: 'STATUS',
    name: 'Changement de disponibilité',
    description: "Notification lors du changement de disponibilité d'une salle",
    severity: 'low',
  },
  {
    module: 'EVENTS_GLOBAL',
    actionType: 'CREATE',
    name: 'Nouvel événement',
    description: "Notification lors de l\'ajout d'un nouvel événement",
    severity: 'medium',
  },
  {
    module: 'EVENTS_GLOBAL',
    actionType: 'UPDATE',
    name: 'Modification événement',
    description: "Notification lors de la modification d'un événement",
    severity: 'medium',
  },
  {
    module: 'EVENTS_GLOBAL',
    actionType: 'DELETE',
    name: 'Suppression événement',
    description: "Notification lors de la suppression d'un événement",
    severity: 'medium',
  },
  {
    module: 'EVENTS_GLOBAL',
    actionType: 'ALERT',
    name: 'Rappel événement',
    description: 'Rappel avant un événement programmé',
    severity: 'low',
  },
  {
    module: 'ORDERS',
    actionType: 'CREATE',
    name: 'Nouvelle commande',
    description: "Notification lors de l\'ajout d'une nouvelle commande",
    severity: 'medium',
  },
  {
    module: 'ORDERS',
    actionType: 'UPDATE',
    name: 'Modification commande',
    description: "Notification lors de la modification d'une commande",
    severity: 'low',
  },
  {
    module: 'ORDERS',
    actionType: 'STATUS',
    name: 'Changement de statut',
    description: "Notification lors du changement de statut d'une commande",
    severity: 'medium',
  },
  {
    module: 'ORDERS',
    actionType: 'ALERT',
    name: 'Commande urgente',
    description: 'Alerte pour les commandes urgentes',
    severity: 'high',
  },
  {
    module: 'SECURITY',
    actionType: 'ALERT',
    name: 'Alerte sécurité',
    description: 'Alerte de sécurité importante',
    severity: 'critical',
  },
  {
    module: 'SECURITY',
    actionType: 'STATUS',
    name: 'Changement de sécurité',
    description: 'Notification lors des changements de configuration de sécurité',
    severity: 'high',
  },
  {
    module: 'SECURITY',
    actionType: 'REPORT',
    name: 'Rapport de sécurité',
    description: 'Génération de rapports de sécurité',
    severity: 'medium',
  },
  {
    module: 'SYSTEM',
    actionType: 'ALERT',
    name: 'Alerte système',
    description: 'Alerte système importante',
    severity: 'high',
  },
  {
    module: 'SYSTEM',
    actionType: 'STATUS',
    name: 'Changement de statut système',
    description: 'Notification lors des changements de statut du système',
    severity: 'medium',
  },
  {
    module: 'SYSTEM',
    actionType: 'REPORT',
    name: 'Rapport système',
    description: 'Génération de rapports système',
    severity: 'low',
  },
];
async function seedNotificationConfigs() {
  // Cleanup legacy CALENDAR module entries to align with EVENTS
  await prisma.notificationPreference.deleteMany({ where: { module: 'CALENDAR' } }).catch(() => {});
  await prisma.notificationConfig.deleteMany({ where: { module: 'CALENDAR' } }).catch(() => {});
  // Cleanup legacy EVENTS entries in favor of EVENTS_GLOBAL/EVENTS_OWNER split
  await prisma.notificationConfig.deleteMany({ where: { module: 'EVENTS' } }).catch(() => {});
  await prisma.notificationPreference.deleteMany({ where: { module: 'EVENTS' } }).catch(() => {});
  for (const cfg of NOTIFICATION_CONFIGS) {
    await prisma.notificationConfig.upsert({
      where: { module_actionType: { module: cfg.module, actionType: cfg.actionType } },
      update: {
        name: cfg.name,
        description: cfg.description,
        severity: cfg.severity,
        enabled: true,
      },
      create: {
        module: cfg.module,
        actionType: cfg.actionType,
        name: cfg.name,
        description: cfg.description,
        severity: cfg.severity,
        enabled: true,
      },
    });
  }
  console.log('🔔 Notifications configs ok');
}

// Seed NotificationPreference matrix reproducing the enabled values provided
// Strategy: iterate current NotificationConfig rows and create/upsert a preference per Role with fixed rules
function preferenceEnabled(role: Role, module: string, actionType: string): boolean {
  switch (module) {
    case 'USERS':
      return role === Role.ADMIN; // only ADMIN enabled for all USERS actions
    case 'CHEMICALS':
    case 'MATERIEL':
    case 'ROOMS':
    case 'EVENTS_GLOBAL':
      // ADMIN, ADMINLABO, LABORANTIN_PHYSIQUE, LABORANTIN_CHIMIE enabled; ENSEIGNANT & ELEVE disabled for all actions in these modules
      return (
        role === Role.ADMIN ||
        role === Role.ADMINLABO ||
        role === Role.LABORANTIN_PHYSIQUE ||
        role === Role.LABORANTIN_CHIMIE
      );
    case 'ORDERS':
      return false; // all disabled
    case 'SECURITY':
      return role === Role.ADMIN; // only ADMIN enabled for ALERT/STATUS/REPORT
    case 'SYSTEM':
      if (actionType === 'STATUS') return role === Role.ADMIN; // only ADMIN for STATUS
      // ALERT and REPORT: ADMIN and ELEVE
      return role === Role.ADMIN || role === Role.ELEVE;
    default:
      return false;
  }
}

async function seedNotificationPreferences() {
  const configs = await prisma.notificationConfig.findMany();
  let upserts = 0;
  for (const cfg of configs) {
    for (const role of Object.values(Role)) {
      const enabled = preferenceEnabled(role as Role, cfg.module, cfg.actionType);
      await prisma.notificationPreference.upsert({
        where: {
          role_module_actionType: {
            role: role as any,
            module: cfg.module,
            actionType: cfg.actionType,
          },
        },
        update: { enabled },
        create: { role: role as any, module: cfg.module, actionType: cfg.actionType, enabled },
      });
      upserts++;
    }
  }
  console.log(`🔔 Preferences ok (upserts: ${upserts})`);
}

export async function runUnifiedSeed() {
  console.log('🚀 Seed unifié démarré');
  await seedAdmin();
  await seedExtraEvents();
  await seedReactifPresets();
  await seedTemperatureEnrichment();
  await seedSystemClasses();
  await seedSalles();
  await seedSuppliers();
  await seedMaterielCategories();
  await seedMaterielPresets();
  await seedMaterielPerso();
  await seedMaterielFromPresets();
  await seedReactifInventaires();
  await seedPhysiqueInventaires();
  await seedAppSettingsDefaults();
  await seedNotificationConfigs();
  await seedNotificationPreferences();
  console.log('✅ Seed unifié terminé');
}

if (require.main === module) {
  runUnifiedSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
