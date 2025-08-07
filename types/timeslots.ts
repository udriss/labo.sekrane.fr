// Types pour le système de gestion des créneaux (TimeSlots)
export type TimeslotState = 
  | 'created'      // Créneau créé
  | 'modified'     // Créneau modifié
  | 'deleted'      // Créneau supprimé (logiquement)
  | 'invalidated'  // Créneau invalidé
  | 'approved'     // Créneau approuvé
  | 'rejected'     // Créneau rejeté
  | 'restored';    // Créneau restauré

export type TimeslotAction = 
  | 'create'
  | 'modify'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'restore'
  | 'none';

export type TimeslotType = 'all' | 'active' | 'pending' | 'summary';

export type Discipline = 'chimie' | 'physique';

// Structure de base d'un créneau dans la base de données
export interface TimeslotData {
  id: string;
  event_id: string;
  discipline: Discipline;
  user_id: string;
  event_owner: string;
  timeslot_parent?: string; // ID du créneau parent pour l'historique
  state: TimeslotState;
  start_date: string; // Format MySQL DATETIME
  end_date: string;   // Format MySQL DATETIME
  timeslot_date: string; // Format MySQL DATE
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Structure pour proposer des modifications de créneaux
export interface TimeslotProposal {
  id?: string; // Undefined pour nouveau créneau
  event_id: string;
  discipline: Discipline;
  user_id: string;
  state?: TimeslotState;
  start_date: string;
  end_date: string;
  timeslot_date: string;
  notes?: string;
  action: TimeslotAction;
  timeslot_parent?: string; // Pour lier à un créneau existant
}

// Structure pour la validation des créneaux
export interface TimeslotValidation {
  id: string;
  action: 'approve' | 'reject';
  reason?: string;
  validator_id: string;
}

// Réponse API pour les créneaux
export interface TimeslotApiResponse {
  timeslots: TimeslotData[];
  summary?: {
    total: number;
    active: number;
    pending: number;
    approved: number;
  };
  meta?: {
    event_id: string;
    discipline: Discipline;
    type: TimeslotType;
  };
  errors?: Array<{field: string, message: string}>;
  success?: boolean;
}

// Structure pour l'historique des créneaux
export interface TimeslotHistoryEntry {
  id: string;
  timeslot_id: string;
  action: TimeslotAction;
  previous_state?: TimeslotState;
  new_state: TimeslotState;
  user_id: string;
  reason?: string;
  created_at: string;
  data_changes?: Record<string, any>; // JSON des changements de données
}

// Paramètres pour la requête API GET
export interface GetTimeslotsParams {
  event_id?: string;
  discipline?: Discipline;
  type?: TimeslotType;
  user_id?: string;
  state?: TimeslotState[];
  start_date?: string;
  end_date?: string;
}

// Structure pour les erreurs de validation
export interface TimeslotValidationError {
  field: string;
  message: string;
  code: string;
}

// Réponse d'erreur API
export interface TimeslotErrorResponse {
  error: string;
  code: string;
  details?: TimeslotValidationError[];
  timestamp: string;
}

// Configuration du système de créneaux
export interface TimeslotConfig {
  autoCleanup: boolean;
  validationRequired: boolean;
  maxTimeslotsPerEvent: number;
  allowOverlapping: boolean;
  timezone: string;
}

// Utilitaires pour conversion de dates
export interface DateConversionUtils {
  isoToMysql: (isoDate: string) => string;
  mysqlToIso: (mysqlDate: string) => string;
  getCurrentMysqlDateTime: () => string;
  getCurrentMysqlDate: () => string;
  validateDateRange: (start: string, end: string) => boolean;
}

// Hook useTimeslots - interface
export interface UseTimeslotsReturn {
  timeslots: TimeslotData[];
  loading: boolean;
  error: string | null;
  getTimeslots: (eventId: string, discipline: Discipline, type?: TimeslotType) => Promise<TimeslotData[]>;
  proposeTimeslots: (eventId: string, discipline: Discipline, proposals: TimeslotProposal[]) => Promise<void>;
  approveTimeslots: (validations: TimeslotValidation[]) => Promise<void>;
  rejectTimeslots: (validations: TimeslotValidation[]) => Promise<void>;
  deleteTimeslot: (timeslotId: string, reason?: string) => Promise<void>;
  refreshTimeslots: () => Promise<void>;
  updateTimeslot?: (timeslotId: string, updates: Partial<Pick<TimeslotData, 'start_date' | 'end_date' | 'notes'>>) => Promise<void>;
  getTimeslotsSummary?: (eventId: string, discipline: Discipline) => Promise<TimeslotApiResponse['summary']>;
}

// Composant TimeslotsList - Props
export interface TimeslotsListProps {
  timeslots: TimeslotData[] | TimeslotProposal[];
  onUpdate?: (index: number, updated: TimeslotProposal) => void;
  onDelete?: (index: number) => void;
  editable?: boolean;
  showActions?: boolean;
  groupByDate?: boolean;
  discipline: Discipline;
}

// Composant TimeslotEditor - Props
export interface TimeslotEditorProps {
  eventId: string;
  discipline: Discipline;
  initialData?: Partial<TimeslotProposal>;
  onSave: (timeslot: TimeslotProposal) => void;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

// Composant TimeslotValidation - Props
export interface TimeslotValidationProps {
  pendingTimeslots: TimeslotData[];
  onApprove: (validations: TimeslotValidation[]) => Promise<void>;
  onReject: (validations: TimeslotValidation[]) => Promise<void>;
  loading?: boolean;
}

// États possibles pour l'interface utilisateur
export const TIMESLOT_STATES: Record<TimeslotState, { label: string; color: string; description: string }> = {
  created: { 
    label: 'Créé', 
    color: 'blue', 
    description: 'Créneau nouvellement créé' 
  },
  modified: { 
    label: 'Modifié', 
    color: 'orange', 
    description: 'Créneau modifié en attente de validation' 
  },
  deleted: { 
    label: 'Supprimé', 
    color: 'red', 
    description: 'Créneau supprimé (logiquement)' 
  },
  invalidated: { 
    label: 'Invalidé', 
    color: 'gray', 
    description: 'Créneau invalidé par le système' 
  },
  approved: { 
    label: 'Approuvé', 
    color: 'green', 
    description: 'Créneau approuvé et validé' 
  },
  rejected: { 
    label: 'Rejeté', 
    color: 'red', 
    description: 'Créneau rejeté lors de la validation' 
  },
  restored: { 
    label: 'Restauré', 
    color: 'purple', 
    description: 'Créneau restauré après suppression' 
  }
};

// Actions possibles sur les créneaux
export const TIMESLOT_ACTIONS: Record<TimeslotAction, { label: string; icon: string; description: string }> = {
  create: { 
    label: 'Créer', 
    icon: 'plus', 
    description: 'Créer un nouveau créneau' 
  },
  modify: { 
    label: 'Modifier', 
    icon: 'edit', 
    description: 'Modifier un créneau existant' 
  },
  delete: { 
    label: 'Supprimer', 
    icon: 'trash', 
    description: 'Supprimer un créneau' 
  },
  approve: { 
    label: 'Approuver', 
    icon: 'check', 
    description: 'Approuver le créneau' 
  },
  reject: { 
    label: 'Rejeter', 
    icon: 'x', 
    description: 'Rejeter le créneau' 
  },
  restore: { 
    label: 'Restaurer', 
    icon: 'undo', 
    description: 'Restaurer un créneau supprimé' 
  },
  none: { 
    label: 'Aucune', 
    icon: 'minus', 
    description: 'Aucune action' 
  }
};

// États actifs pour les vues
export const ACTIVE_TIMESLOT_STATES: TimeslotState[] = ['created', 'modified', 'approved', 'restored'];
export const PENDING_TIMESLOT_STATES: TimeslotState[] = ['created', 'modified'];
