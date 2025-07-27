import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Peuplement de la base de données LIMS...');
  try {
    await prisma.materiel.deleteMany({});
  } catch (error) {
    console.error('Erreur lors de la suppression des équipements :', error);
  }
  // Créer un utilisateur admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@labo.fr' },
    update: {
      password: '$2b$12$o3lC78MSpC3e0EBri4U0BeU.xIA8Zz1HB0hDgAqlNv7lw88cEWcVC', // "password123"
    },
    create: {
      email: 'admin@labo.fr',
      password: '$2b$12$o3lC78MSpC3e0EBri4U0BeU.xIA8Zz1HB0hDgAqlNv7lw88cEWcVC', // "password123"
      name: 'Administrateur Labo',
      role: 'ADMIN',
    },
  });

  // Créer un enseignant
  const teacher = await prisma.user.upsert({
    where: { email: 'prof@labo.fr' },
    update: {
      password: '$2b$12$o3lC78MSpC3e0EBri4U0BeU.xIA8Zz1HB0hDgAqlNv7lw88cEWcVC', // "password123"
    },
    create: {
      email: 'prof@labo.fr',
      password: '$2b$12$o3lC78MSpC3e0EBri4U0BeU.xIA8Zz1HB0hDgAqlNv7lw88cEWcVC', // "password123"
      name: 'Professeur Chimie',
      role: 'TEACHER',
    },
  });

  // Créer des fournisseurs
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'VWR',
        email: 'commandes@vwr.fr',
        phone: '01 23 45 67 89',
        website: 'https://fr.vwr.com',
        isActive: true,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Sigma-Aldrich',
        email: 'orders@sigmaaldrich.fr',
        phone: '01 98 76 54 32',
        website: 'https://www.sigmaaldrich.com',
        isActive: true,
      },
    }),
  ]);

  // Ajout de fournisseurs supplémentaires
  const additionalSuppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Fisher Scientific',
        email: 'contact@fisher.com',
        phone: '01 45 67 89 10',
        website: 'https://www.fishersci.com',
        isActive: true,
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Carlo Erba',
        email: 'info@carloerba.com',
        phone: '01 23 45 67 89',
        website: 'https://www.carloerba.com',
        isActive: true,
      },
    }),
  ]);

  // Créer des produits chimiques de test
  const chemicals = await Promise.all([
    prisma.chemical.create({
      data: {
        name: 'Acide chlorhydrique',
        formula: 'HCl',
        casNumber: '7647-01-0',
        quantity: 500,
        unit: 'mL',
        minQuantity: 100,
        concentration: 37,
        storage: 'Armoire acides',
        room: 'Labo 1',
        hazardClass: 'CORROSIVE',
        status: 'IN_STOCK',
        supplierId: suppliers[0].id,
        purchaseDate: new Date('2024-01-15'),
        expirationDate: new Date('2026-01-15'),
      },
    }),
    prisma.chemical.create({
      data: {
        name: 'Hydroxyde de sodium',
        formula: 'NaOH',
        casNumber: '1310-73-2',
        quantity: 250,
        unit: 'g',
        minQuantity: 50,
        concentration: 99,
        storage: 'Armoire bases',
        room: 'Labo 1',
        hazardClass: 'CORROSIVE',
        status: 'IN_STOCK',
        supplierId: suppliers[1].id,
        purchaseDate: new Date('2024-02-10'),
        expirationDate: new Date('2027-02-10'),
      },
    }),
  ]);

  // Ajout de produits chimiques supplémentaires
  const additionalChemicals = await Promise.all([
    prisma.chemical.create({
      data: {
        name: 'Ethanol',
        formula: 'C2H5OH',
        casNumber: '64-17-5',
        quantity: 1000,
        unit: 'mL',
        minQuantity: 200,
        concentration: 96,
        storage: 'Armoire solvants',
        room: 'Labo 2',
        hazardClass: 'FLAMMABLE',
        status: 'IN_STOCK',
        supplierId: additionalSuppliers[0].id,
        purchaseDate: new Date('2024-05-01'),
        expirationDate: new Date('2026-05-01'),
      },
    }),
    prisma.chemical.create({
      data: {
        name: 'Acétone',
        formula: 'C3H6O',
        casNumber: '67-64-1',
        quantity: 500,
        unit: 'mL',
        minQuantity: 100,
        concentration: 99,
        storage: 'Armoire solvants',
        room: 'Labo 2',
        hazardClass: 'FLAMMABLE',
        status: 'IN_STOCK',
        supplierId: additionalSuppliers[1].id,
        purchaseDate: new Date('2024-06-15'),
        expirationDate: new Date('2026-06-15'),
      },
    }),
  ]);

  // Créer du matériel de test
  const materiel = await Promise.all([
    prisma.materiel.create({
      data: {
        name: 'Bécher 100ml',
        type: 'GLASSWARE',
        quantity: 25,
        status: 'AVAILABLE',
        location: 'Étagère A1',
        room: 'Labo 1',
        supplierId: suppliers[0].id,
        purchaseDate: new Date('2024-01-10'),
      },
    }),
    prisma.materiel.create({
      data: {
        name: 'Erlenmeyer 250ml',
        type: 'GLASSWARE',
        quantity: 15,
        status: 'AVAILABLE',
        location: 'Étagère A2',
        room: 'Labo 1',
        supplierId: suppliers[0].id,
        purchaseDate: new Date('2024-01-10'),
      },
    }),
    prisma.materiel.create({
      data: {
        name: 'Balance de précision',
        type: 'MEASURING',
        model: 'Sartorius BP210S',
        serialNumber: 'BP210S-2024-001',
        quantity: 2,
        status: 'AVAILABLE',
        location: 'Paillasse centrale',
        room: 'Labo 1',
        supplierId: suppliers[1].id,
        purchaseDate: new Date('2024-03-01'),
        warrantyEnd: new Date('2027-03-01'),
      },
    }),
    prisma.materiel.create({
      data: {
        name: 'Plaque chauffante',
        type: 'HEATING',
        model: 'IKA C-MAG HS 7',
        quantity: 5,
        status: 'AVAILABLE',
        location: 'Armoire matériel',
        room: 'Labo 1',
        supplierId: suppliers[1].id,
        purchaseDate: new Date('2024-02-15'),
      },
    }),
  ]);

  // Ajout d'équipements supplémentaires
  const additionalEquipment = await Promise.all([
    prisma.materiel.create({
      data: {
        name: 'Pipette automatique',
        type: 'MEASURING',
        quantity: 10,
        status: 'AVAILABLE',
        location: 'Étagère B1',
        room: 'Labo 2',
        supplierId: additionalSuppliers[0].id,
        purchaseDate: new Date('2024-07-01'),
      },
    }),
    prisma.materiel.create({
      data: {
        name: 'Hotte aspirante',
        type: 'SAFETY',
        quantity: 1,
        status: 'AVAILABLE',
        location: 'Mur Est',
        room: 'Labo 2',
        supplierId: additionalSuppliers[1].id,
        purchaseDate: new Date('2024-08-01'),
      },
    }),
  ]);

  // Créer un TP d'exemple
  const notebookEntry = await prisma.notebookEntry.create({
    data: {
      title: 'Dosage acide-base',
      description: 'Dosage de l\'acide chlorhydrique par la soude',
      scheduledDate: new Date('2024-12-15T14:00:00'),
      duration: 120,
      class: 'TS1',
      groups: ['Groupe A', 'Groupe B'],
      createdById: teacher.id,
      objectives: 'Déterminer la concentration d\'une solution d\'acide chlorhydrique',
      procedure: '1. Préparer les solutions\n2. Effectuer le dosage\n3. Calculer la concentration',
      status: 'SCHEDULED',
    },
  });

  // Associer des produits chimiques au TP
  await Promise.all([
    prisma.notebookChemical.create({
      data: {
        notebookId: notebookEntry.id,
        chemicalId: chemicals[0].id,
        quantityUsed: 25,
        unit: 'mL',
        notes: 'Solution à doser',
      },
    }),
    prisma.notebookChemical.create({
      data: {
        notebookId: notebookEntry.id,
        chemicalId: chemicals[1].id,
        quantityUsed: 0.1,
        unit: 'MOL',
        notes: 'Solution titrante 0.1M',
      },
    }),
  ]);

  // Associer du matériel au TP
  await Promise.all([
    prisma.notebookEquipment.create({
      data: {
        notebookId: notebookEntry.id,
        equipmentId: materiel[0].id,
        quantity: 2,
        notes: 'Pour les solutions',
      },
    }),
    prisma.notebookEquipment.create({
      data: {
        notebookId: notebookEntry.id,
        equipmentId: materiel[1].id,
        quantity: 1,
        notes: 'Pour le dosage',
      },
    }),
  ]);

  // Ajout de TP supplémentaires
  const additionalNotebookEntries = await Promise.all([
    prisma.notebookEntry.create({
      data: {
        title: 'Synthèse de l\'aspirine',
        description: 'Synthèse de l\'acide acétylsalicylique à partir de l\'acide salicylique',
        scheduledDate: new Date('2024-11-20T10:00:00'),
        duration: 180,
        class: 'TS2',
        groups: ['Groupe C'],
        createdById: teacher.id,
        objectives: 'Apprendre les bases de la synthèse organique',
        procedure: '1. Mélanger les réactifs\n2. Chauffer sous reflux\n3. Purifier le réactif',
        status: 'SCHEDULED',
      },
    }),
    prisma.notebookEntry.create({
      data: {
        title: 'Analyse spectroscopique',
        description: 'Utilisation de la spectroscopie IR pour identifier des composés organiques',
        scheduledDate: new Date('2024-12-10T14:00:00'),
        duration: 120,
        class: 'TS3',
        groups: ['Groupe D'],
        createdById: teacher.id,
        objectives: 'Comprendre l\'utilisation de la spectroscopie IR',
        procedure: '1. Préparer les échantillons\n2. Effectuer les mesures\n3. Analyser les spectres',
        status: 'SCHEDULED',
      },
    }),
  ]);

  console.log('✅ Base de données peuplée avec succès!');
  console.log(`👤 Admin créé: ${admin.email}`);
  console.log(`👨‍🏫 Enseignant créé: ${teacher.email}`);
  console.log(`🏭 ${suppliers.length} fournisseurs créés`);
  console.log(`🧪 ${chemicals.length} produits chimiques créés`);
  console.log(`🔬 ${materiel.length} équipements créés`);
  console.log(`📓 1 TP d'exemple créé`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
