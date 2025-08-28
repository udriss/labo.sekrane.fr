export type WebSocketNotification = {
  id: string;
  ts: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  module?: string;
  entityId?: string | number;
  actionType?: string;
  severity?: string;
  data?: any; // raw data payload (quantities, user, etc.)
  triggeredBy?: string;
  quantityPrev?: number; // for materiel quantity diff
  quantityNew?: number;
  stockPrev?: number; // for reactif stock diff
  stockNew?: number;
  createdAt?: string;
  // convenience extracted fields when available
  eventId?: number;
  timeslotIds?: number[];
};

export interface Notification {
  id: number;
  module: string;
  actionType: string;
  severity: string;
  message: string;
  title?: string | null;
  data?: any;
  targetRoles?: string[];
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  role: string;
  module: string;
  actionType: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationConfig {
  id: string;
  module: string;
  actionType: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  targetRoles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PreferencesByRole {
  [role: string]: {
    [key: string]: NotificationPreference;
  };
}
