// lib/api/with-audit.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { AuditAction, AuditUser, AuditContext } from '@/types/audit';

type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

interface AuditOptions {
  action?: AuditAction['type'];
  module: AuditAction['module'];
  entity: string;
  extractEntityId?: (req: NextRequest, params?: any) => string | undefined;
  // Nouvelle option pour extraire l'ID depuis la réponse
  extractEntityIdFromResponse?: (response: any) => string | undefined;
  skipAuth?: boolean;
  customDetails?: (req: NextRequest, response?: any) => any;
}

/**
 * Wrapper pour ajouter automatiquement la journalisation d'audit aux API routes
 */
export function withAudit(handler: RouteHandler, options: AuditOptions): RouteHandler {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let response: NextResponse;
    let error: Error | null = null;
    let responseData: any = null;
    
    try {
      // Récupérer la session utilisateur
      const session = options.skipAuth ? null : await getServerSession(authOptions);
      
      // Préparer l'utilisateur pour l'audit
      const user: AuditUser = session?.user ? {
        id: (session.user as any).id,
        email: session.user.email!,
        name: session.user.name || 'Unknown',
        role: (session.user as any).role || 'USER'
      } : {
        id: 'anonymous',
        email: 'anonymous@labolims.com',
        name: 'Anonymous',
        role: 'GUEST'
      };

      // Préparer le contexte
      const auditContext: AuditContext = {
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 
            req.headers.get('x-real-ip') || 
            '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        sessionId: session ? (session as any).sessionId : undefined,
        requestId,
        path: req.nextUrl.pathname,
        method: req.method
      };

      // Déterminer l'action basée sur la méthode HTTP ou l'option fournie
      const actionType = options.action || getActionTypeFromMethod(req.method);


      // Récupérer le body de la requête pour les mutations
      let requestBody: any = null;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        try {
          const clonedRequest = req.clone();
          requestBody = await clonedRequest.json();
        } catch {
          // Pas de body JSON ou erreur de parsing
        }
      }

      // Exécuter le handler
      response = await handler(req, context);

      const entityId = options.extractEntityId ? 
        options.extractEntityId(req, context?.params) : 
        (options.extractEntityIdFromResponse && responseData ? 
          options.extractEntityIdFromResponse(responseData) : 
          getEntityIdFromPath(req.nextUrl.pathname));

      // Préparer l'action
      const action: AuditAction = {
        type: actionType,
        module: options.module,
        entity: options.entity,
        entityId
      };

      // Extraire les données de la réponse si possible
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const clonedResponse = response.clone();
          responseData = await clonedResponse.json();
        } catch {
          // Erreur lors de la lecture de la réponse
        }
      }

      // Préparer les détails de l'audit
      const details = {
        request: {
          method: req.method,
          path: req.nextUrl.pathname,
          query: Object.fromEntries(req.nextUrl.searchParams),
          body: sanitizeData(requestBody)
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data: sanitizeData(responseData)
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        ...(options.customDetails ? options.customDetails(req, responseData) : {})
      };

      // Logger l'audit avec le bon statut
      const finalContext: AuditContext = {
        ...auditContext,
        duration: Date.now() - startTime
      };

      // Déterminer le statut basé sur le code de réponse
      let status: 'SUCCESS' | 'ERROR' | 'WARNING' = 'SUCCESS';
      if (response.status >= 400) {
        status = 'ERROR';
      } else if (response.status >= 300) {
        status = 'WARNING';
      }

      await auditLogger.log(action, user, finalContext, { ...details, status });

      return response;

    } catch (err) {
      error = err as Error;
      
      // Logger l'erreur
      const endTime = Date.now();
      const errorDetails = {
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        request: {
          method: req.method,
          path: req.nextUrl.pathname,
          query: Object.fromEntries(req.nextUrl.searchParams)
        },
        metadata: {
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        }
      };

      const session = options.skipAuth ? null : await getServerSession(authOptions);
      const user: AuditUser = session?.user ? {
        id: (session.user as any).id,
        email: session.user.email!,
        name: session.user.name || 'Unknown',
        role: (session.user as any).role || 'USER'
      } : {
        id: 'anonymous',
        email: 'anonymous@labolims.com',
        name: 'Anonymous',
        role: 'GUEST'
      };

      const auditContext: AuditContext = {
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        sessionId: session ? (session as any).sessionId : undefined,
        requestId,
        path: req.nextUrl.pathname,
        method: req.method,
        duration: endTime - startTime
      };

      const action: AuditAction = {
        type: options.action || getActionTypeFromMethod(req.method),
        module: options.module,
        entity: options.entity,
        entityId: options.extractEntityId ? options.extractEntityId(req, context?.params) : undefined
      };

      await auditLogger.log(action, user, auditContext, { ...errorDetails, status: 'ERROR' });

      // Re-throw l'erreur
      throw error;
    }
  };
}

// Helper pour déterminer le type d'action depuis la méthode HTTP
function getActionTypeFromMethod(method: string): AuditAction['type'] {
  switch (method.toUpperCase()) {
    case 'POST': return 'CREATE';
    case 'GET': return 'READ';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'READ';
  }
}

// Helper pour extraire l'ID depuis le path
function getEntityIdFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  
  // Vérifier si le dernier segment ressemble à un ID
  if (lastSegment && (
    lastSegment.match(/^[0-9a-f-]{36}$/i) || // UUID
    lastSegment.match(/^\d+$/) || // Nombre
    lastSegment.match(/^[a-zA-Z0-9_-]+$/) // ID alphanumérique
  )) {
    return lastSegment;
  }
  
  return undefined;
}

// Helper pour nettoyer les données sensibles
function sanitizeData(data: any): any {
  if (!data) return data;
  
  const sensitiveFields = [
    'password', 
    'token', 
    'secret', 
    'key', 
    'authorization',
    'cookie',
    'session'
  ];
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    if (!Array.isArray(sanitized)) {
      Object.keys(sanitized).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitizeData(sanitized[key]);
        }
      });
    } else {
      return sanitized.map(item => sanitizeData(item));
    }
    
    return sanitized;
  }
  
  return data;
}

// Export des helpers pour utilisation directe
export const auditHelpers = {
  getActionTypeFromMethod,
  getEntityIdFromPath,
  sanitizeData
};

// Types pour faciliter l'utilisation
export type { RouteHandler, AuditOptions };