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
  name: string;
  description: string;
  module: string;
  actionType: string;
  defaultEnabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExtendedNotification {
  id: string;
  userId: string;
  role: string;
  module: string;
  actionType: string;
  message: string;
  details: any;
  createdAt: string;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityId?: string;
  entityType?: string;
  triggeredBy?: {
    userId: string;
    userName: string;
    userEmail: string;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface WebSocketMessage {
  type: 'notification' | 'notification_read' | 'notification_bulk_read';
  data: ExtendedNotification | { notificationIds: string[] } | { userId: string };
}

export interface NotificationFilter {
  module?: string;
  actionType?: string;
  severity?: string;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}