// types/audit.ts
export interface AuditUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuditAction {
  type: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'STATE_CHANGE';
  module: 'USERS' | 'CHEMICALS' | 'EQUIPMENT' | 'ROOMS' | 'CALENDAR' | 'ORDERS' | 'SECURITY' | 'SYSTEM';
  entity: string;
  entityId?: string;
}

export interface AuditDetails {
  before?: Record<string, any>;
  after?: Record<string, any>;
  changes?: string[];
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AuditContext {
  ip: string;
  userAgent: string;
  sessionId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  duration?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  user: AuditUser;
  action: AuditAction;
  details?: AuditDetails;
  context: AuditContext;
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
  error?: string;
  metadata?: Record<string, any>;
}

export interface LogFilters {
  userId?: string;
  module?: string;
  action?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'SUCCESS' | 'ERROR' | 'WARNING';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface LogIndex {
  users: Record<string, string[]>; // userId -> file paths
  modules: Record<string, string[]>; // module -> file paths
  actions: Record<string, string[]>; // action -> file paths
  dates: Record<string, string>; // date -> file path
}

export interface AuditStats {
  totalEntries: number;
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  byStatus: Record<string, number>;
  dateRange: {
    earliest: string;
    latest: string;
  };
}
