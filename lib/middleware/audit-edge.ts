// lib/middleware/audit-edge.ts
// Version Edge Runtime compatible pour le middleware
import { NextRequest } from 'next/server';
import { AuditAction } from '@/types/audit';

// Simple in-memory buffer for edge runtime
const auditBuffer: any[] = [];

export async function logAuditEvent(
  request: NextRequest,
  actionType: string,
  module: string,
  details: any = {},
  userId?: string
) {
  try {
    
    const timestamp = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') ||
              '127.0.0.1';
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const method = request.method;
    const path = request.nextUrl.pathname;
    
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp,
      action: {
        type: actionType,
        module: module,
        entity: 'api',
        entityId: undefined
      },
      user: userId ? {
        id: userId,
        email: 'unknown@labolims.com', // Ces infos seront complétées par l'API
        name: 'Unknown',
        role: 'USER'
      } : {
        id: 'anonymous',
        email: 'anonymous@labolims.com',
        name: 'Anonymous',
        role: 'GUEST'
      },
      context: {
        ip,
        userAgent,
        path,
        method,
        requestId: crypto.randomUUID()
      },
      details,
      status: 'SUCCESS'
    };


    // Store in memory buffer (will be lost on restart, but that's ok for edge)
    auditBuffer.push(logEntry);
    
    // Keep only last 1000 entries in memory
    if (auditBuffer.length > 1000) {
      auditBuffer.splice(0, auditBuffer.length - 1000);
    }

    // Send to API route for persistent storage (fire and forget)
    if (typeof globalThis.fetch !== 'undefined') {
      // Utiliser l'URL complète avec le host de la requête
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      
      // Fire and forget - ne pas attendre la réponse
      globalThis.fetch(`${baseUrl}/api/audit/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Ajouter un header spécial pour identifier les requêtes du middleware
          'X-Audit-Source': 'middleware'
        },
        body: JSON.stringify(logEntry)
      }).then(() => {

      }).catch((error) => {
        console.error('Failed to send audit log:', error);
      });
    }

  } catch (error) {
    // Silent fail in middleware to avoid breaking requests
    console.error('Audit logging error:', error);
  }
}

export async function auditMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
    
  // Déterminer le module depuis le chemin
  let module = 'SYSTEM';
  if (path.includes('/api/auth')) module = 'SECURITY';
  else if (path.includes('/api/equipment') || path.includes('/api/equipement')) module = 'EQUIPMENT';
  else if (path.includes('/api/chemicals')) module = 'CHEMICALS';
  else if (path.includes('/api/orders')) module = 'ORDERS';
  else if (path.includes('/api/notebook')) module = 'SYSTEM';
  else if (path.includes('/api/calendrier')) module = 'CALENDAR';
  else if (path.includes('/api/user') || path.includes('/api/utilisateurs')) module = 'USERS';
  else if (path.includes('/api/audit')) module = 'SECURITY';
  else if (path.includes('/api/rooms') || path.includes('/api/salles')) module = 'ROOMS';
  else if (path.includes('/api/classes')) module = 'USERS';
  else if (path.includes('/api/security')) module = 'SECURITY';
  else if (path.includes('/api/stats')) module = 'SYSTEM';
  else if (path.includes('/api/system-status')) module = 'SYSTEM';
  else if (path.includes('/api/')) module = 'SYSTEM';


  // Déterminer le type d'action basé sur la méthode HTTP
  let actionType = 'READ';
  switch (request.method.toUpperCase()) {
    case 'POST':
      actionType = 'CREATE';
      break;
    case 'PUT':
    case 'PATCH':
      actionType = 'UPDATE';
      break;
    case 'DELETE':
      actionType = 'DELETE';
      break;
    case 'GET':
    default:
      actionType = 'READ';
      break;
  }

  // Extraire l'ID utilisateur du token si possible
  let userId: string | undefined;
  try {
    // Essayer de récupérer l'ID utilisateur depuis les cookies
    const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                        request.cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (sessionToken) {
      // Pour l'instant, on ne peut pas décoder le JWT dans le edge runtime sans la secret
      // On passera undefined et l'API récupérera la session
      userId = undefined;
    }
  } catch (error) {
    console.error('Error getting user ID:', error);
  }

  // Logger l'accès API
  await logAuditEvent(
    request,
    actionType,
    module,
    {
      endpoint: path,
      query: Object.fromEntries(request.nextUrl.searchParams),
      timestamp: new Date().toISOString(),
      source: 'middleware'
    },
    userId
  );
}

// Fonction pour récupérer les logs du buffer (utile pour debug)
export function getAuditBuffer() {
  return [...auditBuffer];
}

// Fonction pour vider le buffer (utile pour les tests)
export function clearAuditBuffer() {
  auditBuffer.length = 0;
}