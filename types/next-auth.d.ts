// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ADMINLABO' | 'LABORANTIN';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name: string;
      email: string;
      associatedClasses?: string[];
      customClasses?: string[];
      siteConfig?: {
        materialsViewMode?: 'list' | 'cards';
        chemicalsViewMode?: 'list' | 'cards';
        theme?: 'light' | 'dark';
        language?: string;
        notifications?: {
          email: boolean;
          push: boolean;
        };
        dashboard?: {
          defaultView: string;
          widgetsOrder: string[];
        };
        lastUpdated?: string;
      };
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    associatedClasses?: string[];
    customClasses?: string[];
    siteConfig?: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    name?: string;
    email?: string;
    associatedClasses?: string[];
    customClasses?: string[];
    siteConfig?: any;
  }
}