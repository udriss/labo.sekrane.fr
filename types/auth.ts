// types/auth.ts
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ADMINLABO' | 'LABORANTIN' | 'GUEST';
}

export interface AuthSession {
  user: AuthUser;
  sessionId?: string;
}
