export interface NotificationFilter {
  module?: string;
  actionType?: string;
  severity?: string;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
  // Nouveaux champs pour le système basé sur les rôles
  userRole?: string;
  userEmail?: string;
  reason?: 'role' | 'specific';
}


export interface WebSocketNotification {
  id: string;
  message: string | object;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  module?: string;
  entityId?: string;
  createdAt?: string;
  timestamp?: string;
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
  roles: Array<{
    value: string;
    label: string;
    color: string;
    icon: any;
  }>;
  modules: Array<{
    value: string;
    label: string;
    icon: any;
    color: string;
  }>;
  severities: Array<{
    value: string;
    label: string;
    color: string;
  }>;
}

export interface ExtendedNotification {
  id: string;
  userId: string;
  role: string;
  module: string;
  actionType: string;
  message: any;
  details: string;
  createdAt: string;
  isRead: boolean;
  severity: string;
  reason: 'role' | 'specific';
  specificReason?: string;
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
  byReason: Record<string, number>;
}