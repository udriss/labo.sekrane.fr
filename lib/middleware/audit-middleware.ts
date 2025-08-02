// lib/middleware/audit-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditLogger } from '@/lib/services/audit-logger';
import { AuditAction, AuditUser, AuditContext } from '@/types/audit';

interface ExtendedNextRequest extends NextRequest {
  user?: AuditUser;
  startTime?: number;
  requestId?: string;
}

// Helper to extract module from path
function getModuleFromPath(pathname: string): AuditAction['module'] {
  if (pathname.includes('/api/utilisateurs') || pathname.includes('/api/user')) return 'USERS';
  if (pathname.includes('/api/chimie/chemicals')) return 'CHEMICALS';
  if (pathname.includes('/api/chimie/equipement') || pathname.includes('/api/equipment')) return 'EQUIPMENT';
  if (pathname.includes('/api/rooms') || pathname.includes('/api/salles')) return 'ROOMS';
  if (pathname.includes('/api/calendrier')) return 'CALENDAR';
  if (pathname.includes('/api/orders')) return 'ORDERS';
  if (pathname.includes('/api/security')) return 'SECURITY';
  return 'SYSTEM';
}

// Helper to extract entity from path
function getEntityFromPath(pathname: string): string {
  const segments = pathname.split('/');
  const apiIndex = segments.indexOf('api');
  return segments[apiIndex + 1] || 'unknown';
}

// Helper to extract entity ID from path
function getEntityIdFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/');
  const lastSegment = segments[segments.length - 1];
  // Check if last segment looks like an ID (UUID, number, etc.)
  if (lastSegment && (lastSegment.match(/^[0-9a-f-]+$/i) || lastSegment.match(/^\d+$/))) {
    return lastSegment;
  }
  return undefined;
}

// Helper to get action type from HTTP method
function getActionType(method: string): AuditAction['type'] {
  switch (method.toUpperCase()) {
    case 'POST': return 'CREATE';
    case 'GET': return 'READ';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'READ';
  }
}

// Helper to sanitize data for logging
function sanitizeData(data: any): any {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  return data;
}

// Helper to extract IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || remoteAddr || 'unknown';
}

export async function auditMiddleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Skip audit for non-API routes or health checks
  if (!request.nextUrl.pathname.startsWith('/api') || 
      request.nextUrl.pathname.includes('/health') ||
      request.nextUrl.pathname.includes('/status')) {
    return NextResponse.next();
  }

  // Get user from token
  const token = await getToken({ req: request });
  if (!token) {
    // Don't audit unauthenticated requests
    return NextResponse.next();
  }

  const user: AuditUser = {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string || 'Unknown',
    role: token.role as string || 'USER'
  };

  // Prepare audit context
  const context: AuditContext = {
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    sessionId: token.jti as string,
    requestId,
    path: request.nextUrl.pathname,
    method: request.method
  };

  // Prepare audit action
  const action: AuditAction = {
    type: getActionType(request.method),
    module: getModuleFromPath(request.nextUrl.pathname),
    entity: getEntityFromPath(request.nextUrl.pathname),
    entityId: getEntityIdFromPath(request.nextUrl.pathname)
  };

  // Get request body for logging (for non-GET requests)
  let requestBody: any = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      // Clone request to read body
      const clonedRequest = request.clone();
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        requestBody = await clonedRequest.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await clonedRequest.formData();
        requestBody = Object.fromEntries(formData.entries());
      }
    } catch (error) {
      console.error('Error reading request body for audit:', error);
    }
  }

  // Continue with the request
  const response = NextResponse.next();
  
  // Log the audit entry (async, don't wait)
  setImmediate(async () => {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const auditDetails = {
        requestBody: sanitizeData(requestBody),
        metadata: {
          duration,
          contentType: request.headers.get('content-type'),
          acceptLanguage: request.headers.get('accept-language'),
          referer: request.headers.get('referer')
        }
      };

      const finalContext: AuditContext = {
        ...context,
        duration
      };

      await auditLogger.log(action, user, finalContext, auditDetails);
    } catch (error) {
      console.error('Error logging audit entry:', error);
    }
  });

  return response;
}

// Middleware wrapper for API routes
export function withAudit<T extends (...args: any[]) => any>(handler: T): T {
  return (async (req: any, res: any, ...args: any[]) => {
    const startTime = Date.now();
    const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get user from session/token
    let user: AuditUser | null = null;
    try {
      // This would be adapted based on your auth setup
      if (req.user) {
        user = {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name || 'Unknown',
          role: req.user.role || 'USER'
        };
      }
    } catch (error) {
      console.error('Error getting user for audit:', error);
    }

    if (!user) {
      // No user, skip audit but continue with request
      return handler(req, res, ...args);
    }

    // Prepare audit data
    const context: AuditContext = {
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId,
      path: req.url,
      method: req.method
    };

    const action: AuditAction = {
      type: getActionType(req.method),
      module: getModuleFromPath(req.url),
      entity: getEntityFromPath(req.url),
      entityId: getEntityIdFromPath(req.url)
    };

    // Intercept response to capture response data
    const originalJson = res.json;
    const originalSend = res.send;
    let responseData: any = null;
    let statusCode = 200;

    res.json = function(data: any) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    res.send = function(data: any) {
      responseData = data;
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    try {
      // Execute the handler
      const result = await handler(req, res, ...args);

      // Log success
      setImmediate(async () => {
        try {
          const endTime = Date.now();
          const auditDetails = {
            requestBody: sanitizeData(req.body),
            responseData: sanitizeData(responseData),
            statusCode,
            metadata: {
              duration: endTime - startTime
            }
          };

          const finalContext: AuditContext = {
            ...context,
            duration: endTime - startTime
          };

          await auditLogger.log(action, user!, finalContext, auditDetails);
        } catch (error) {
          console.error('Error logging audit entry:', error);
        }
      });

      return result;
    } catch (error) {
      // Log error
      setImmediate(async () => {
        try {
          const endTime = Date.now();
          const auditDetails = {
            requestBody: sanitizeData(req.body),
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: res.statusCode || 500,
            metadata: {
              duration: endTime - startTime
            }
          };

          const finalContext: AuditContext = {
            ...context,
            duration: endTime - startTime
          };

          await auditLogger.log(action, user!, finalContext, auditDetails);
        } catch (auditError) {
          console.error('Error logging audit entry:', auditError);
        }
      });

      throw error;
    }
  }) as T;
}
