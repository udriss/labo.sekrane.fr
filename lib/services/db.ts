import { PrismaClient } from '@prisma/client';

// Factory to build an extended Prisma client with query hooks (Prisma 6+)
function createPrisma() {
  const base = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });

  // Models that have createdAt / updatedAt in schema
  const MODELS_WITH_CREATED_AT = new Set([
    'Utilisateur',
    'Classe',
    'Evenement',
    'Creneau',
    'Salle',
    'Localisation',
    'MaterielInventaire',
    'ReactifInventaire',
    'Consommable',
    'Notification',
    'NotificationPreference',
    'NotificationConfig',
    'ReactifPreset',
    'Supplier',
    'MaterielPreset',
    'MaterielCategorie',
    'MaterielPerso',
    'EvenementMateriel',
    'EvenementReactif',
    'EvenementPreset',
    'EvenementPresetCreneau',
    'EvenementPresetMateriel',
    'EvenementPresetReactif',
    'MaterielEventRequest',
    'ReactifEventRequest',
    'AppSetting',
    'AuthLog',
    'PasswordResetToken',
    'ActivationToken',
    'EmailChangeRequest',
  ]);
  const MODELS_WITH_UPDATED_AT = new Set([
    'Utilisateur',
    'Classe',
    'Evenement',
    'Creneau',
    'Salle',
    'Localisation',
    'MaterielInventaire',
    'ReactifInventaire',
    'Consommable',
    'NotificationPreference',
    'NotificationConfig',
    'ReactifPreset',
    'Supplier',
    'MaterielPreset',
    'MaterielCategorie',
    'MaterielPerso',
    'EvenementMateriel',
    'EvenementReactif',
    'EvenementPreset',
    'EvenementPresetCreneau',
    'EvenementPresetMateriel',
    'EvenementPresetReactif',
    'MaterielEventRequest',
    'ReactifEventRequest',
    'AppSetting',
  ]);
  // Models with uploadedAt (no createdAt/updatedAt) that must also follow local wall time
  const MODELS_WITH_UPLOADED_AT = new Set(['EvenementDocument', 'EvenementPresetDocument']);

  // Skip join tables and target mapping (no createdAt/updatedAt)
  const SKIP_MODELS = new Set(['NotificationTarget', 'ClasseUtilisateur']);

  const extended = base.$extends({
    query: {
      $allModels: {
        create({ model, args, query }: any) {
          if (!SKIP_MODELS.has(model as string) && args?.data) {
            const now = getLocalNow();
            if (MODELS_WITH_CREATED_AT.has(model as string)) args.data.createdAt = now;
            if (MODELS_WITH_UPDATED_AT.has(model as string)) args.data.updatedAt = now;
            if (MODELS_WITH_UPLOADED_AT.has(model as string)) args.data.uploadedAt = now;
          }
          return query(args);
        },
        createMany({ model, args, query }: any) {
          if (!SKIP_MODELS.has(model as string) && args?.data) {
            const now = getLocalNow();
            const apply = (row: any) => {
              if (MODELS_WITH_CREATED_AT.has(model as string)) row.createdAt = now;
              if (MODELS_WITH_UPDATED_AT.has(model as string)) row.updatedAt = now;
              if (MODELS_WITH_UPLOADED_AT.has(model as string)) row.uploadedAt = now;
              return row;
            };
            if (Array.isArray(args.data)) {
              args.data = args.data.map((row: any) => apply({ ...row }));
            } else if (args.data && Array.isArray(args.data.data)) {
              // Support for potential driver variations
              args.data.data = args.data.data.map((row: any) => apply({ ...row }));
            }
          }
          return query(args);
        },
        update({ model, args, query }: any) {
          if (!SKIP_MODELS.has(model as string) && args?.data) {
            const now = getLocalNow();
            if (MODELS_WITH_UPDATED_AT.has(model as string)) args.data.updatedAt = now;
          }
          return query(args);
        },
        updateMany({ model, args, query }: any) {
          if (!SKIP_MODELS.has(model as string) && args?.data) {
            const now = getLocalNow();
            if (MODELS_WITH_UPDATED_AT.has(model as string)) args.data.updatedAt = now;
          }
          return query(args);
        },
      },
    },
  });

  return extended;
}

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

// Helper pour obtenir l'heure CEST comme MySQL la stocke
export function getLocalNow(): Date {
  // Horodatage à l'heure de Paris, indépendamment du fuseau de l'hôte
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
  const ms = now.getMilliseconds();
  // Crée une Date UTC dont les composantes valent l'heure de Paris
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
}


// Test de connexion
prisma.$connect().then(async () => {
  //  console.log('🔌 Prisma connected with CEST timestamp handling');

  try {
    const result = await prisma.$queryRawUnsafe(`SELECT NOW() as db_time`);
    const dbTime = (result as any[])[0]?.db_time;
    //  console.log('📊 DB server time:', result);

    const ourTime = getLocalNow();
    //  console.log('🇫🇷 Our CEST time:', ourTime.toISOString().slice(0, 19));

    if (dbTime) {
      //  console.log(`⏰ DB UTC format: ${dbTime.toISOString().slice(0, 19)}`);
      //  console.log(`⏰ We generate: ${ourTime.toISOString().slice(0, 19)}`);
      //  console.log(`✅ Times match: ${dbTime.toISOString().slice(0, 19) === ourTime.toISOString().slice(0, 19)}`);
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
