import { prisma } from './db';

export type AppSettings = {
  maintenanceMode: boolean;
  // Liste des utilisateurs autorisés à accéder au site en mode maintenance
  maintenanceAllowedUserIds?: number[];
  allowRegistrations: boolean;
  defaultUserRole: string;
  sessionTimeoutMinutes: number;
  timezone: string;
  brandingName: string;
  // Nom de l'établissement (affiché dans les emails, pied de page, etc.)
  NOM_ETABLISSEMENT?: string;
  NOM_ETABLISSEMENT_COURT?: string;
  lockThreshold: number;
  lockWindowMinutes: number;
  lockDurationMinutes: number;
  // Notifications ciblées propriétaire d'événement
  notificationOwnerEvents: {
    enabled: boolean;
    includeTimeslots: boolean;
    includeDocuments: boolean;
    // Liste d'utilisateurs à exclure des notifications propriétaire (surcouche fine)
    blockedUserIds?: number[];
  };
  // Notifications liées au compte (paramétrables)
  accountNotifications: {
    loginSuccess: boolean;
    loginFailed: boolean;
    passwordChanged: boolean;
    passwordResetRequested: boolean;
    passwordResetCompleted: boolean;
    emailChangeRequested: boolean;
    emailChanged: boolean;
  };
  // RBAC extensions
  adminAllowedRoles?: string[]; // roles allowed to access /admin and /api/admin (in addition to ADMIN)
  adminAllowedUserIds?: number[]; // specific users allowed to access admin
  inspectionAllowedRoles?: string[]; // roles allowed to impersonate
  inspectionAllowedUserIds?: number[]; // specific users allowed to impersonate
};

const DEFAULT_SETTINGS: AppSettings = {
  maintenanceMode: false,
  maintenanceAllowedUserIds: [1],
  allowRegistrations: true,
  defaultUserRole: 'ENSEIGNANT',
  sessionTimeoutMinutes: 480,
  timezone: 'Europe/Paris',
  brandingName: 'SGIL',
  NOM_ETABLISSEMENT: 'Paul VALÉRY — Paris 12e',
  NOM_ETABLISSEMENT_COURT: 'P. VALÉRY — 12e',
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
  // Defaults: keep admin strict, but allow configuration
  adminAllowedRoles: ['ADMIN'],
  adminAllowedUserIds: [1],
  inspectionAllowedRoles: ['ADMIN'],
  inspectionAllowedUserIds: [1],
};

const KEYS: (keyof AppSettings)[] = [
  'maintenanceMode',
  'maintenanceAllowedUserIds',
  'allowRegistrations',
  'defaultUserRole',
  'sessionTimeoutMinutes',
  'timezone',
  'brandingName',
  'NOM_ETABLISSEMENT',
  'NOM_ETABLISSEMENT_COURT',
  'lockThreshold',
  'lockWindowMinutes',
  'lockDurationMinutes',
  'notificationOwnerEvents',
  'accountNotifications',
  'adminAllowedRoles',
  'adminAllowedUserIds',
  'inspectionAllowedRoles',
  'inspectionAllowedUserIds',
];

export async function loadAppSettings(): Promise<AppSettings> {
  let rows: any[] = [];
  try {
    // Access optional model if present in current Prisma client build.
    rows =
      (await (prisma as any).appSetting?.findMany({ where: { key: { in: KEYS as string[] } } })) ||
      [];
  } catch (error) {
    console.error('[loadAppSettings] Erreur Prisma:', error);
    return { ...DEFAULT_SETTINGS }; // fallback entirely
  }
  const map = new Map<string, any>(rows.map((r: any) => [r.key, r]));
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  for (const k of KEYS) {
    const row = map.get(k);
    if (row) {
      if (row.jsonValue !== null && row.jsonValue !== undefined) {
        (settings as any)[k] = row.jsonValue;
      } else if (row.value != null) {
        // basic coercion
        if (typeof DEFAULT_SETTINGS[k] === 'boolean') (settings as any)[k] = row.value === 'true';
        else if (typeof DEFAULT_SETTINGS[k] === 'number') (settings as any)[k] = Number(row.value);
        else (settings as any)[k] = row.value;
      }
    }
  }
  return settings;
}

export async function saveAppSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadAppSettings();
  const next = { ...current, ...partial };
  for (const [k, v] of Object.entries(partial)) {
    if (!KEYS.includes(k as keyof AppSettings)) continue;
    const val = v;
    if (typeof val === 'object') {
      await prisma.appSetting.upsert({
        where: { key: k },
        update: { jsonValue: val as any, value: null },
        create: { key: k, jsonValue: val as any },
      });
    } else {
      await prisma.appSetting.upsert({
        where: { key: k },
        update: { value: String(val), jsonValue: undefined },
        create: { key: k, value: String(val), jsonValue: undefined },
      });
    }
  }
  return next;
}

export function defaultAppSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}
