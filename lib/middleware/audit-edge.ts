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
      actionType,
      module,
      user: userId ? {
        id: userId,
        ip,
        userAgent
      } : null,
      request: {
        method,
        path,
        ip,
        userAgent
      },
      details,
      session: null // Will be filled by API routes
    };

    // Store in memory buffer (will be lost on restart, but that's ok for edge)
    auditBuffer.push(logEntry);
    
    // Keep only last 1000 entries in memory
    if (auditBuffer.length > 1000) {
      auditBuffer.splice(0, auditBuffer.length - 1000);
    }

    // Send to API route for persistent storage (fire and forget)
    if (typeof fetch !== 'undefined') {
      fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      }).catch(() => {}); // Ignore errors in middleware
    }

  } catch (error) {
    // Silent fail in middleware to avoid breaking requests
    console.error('Audit logging error:', error);
  }
}

export async function auditMiddleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Determine module from path
  let module = 'unknown';
  if (path.includes('/api/auth')) module = 'auth';
  else if (path.includes('/api/equipment')) module = 'equipment';
  else if (path.includes('/api/chemicals')) module = 'chemicals';
  else if (path.includes('/api/orders')) module = 'orders';
  else if (path.includes('/api/notebook')) module = 'notebook';
  else if (path.includes('/api/calendrier')) module = 'calendar';
  else if (path.includes('/api/user')) module = 'user';
  else if (path.includes('/api/audit')) module = 'audit';
  else if (path.includes('/api/')) module = 'api';

  // Log API access
  await logAuditEvent(
    request,
    'API_ACCESS',
    module,
    {
      endpoint: path,
      query: Object.fromEntries(request.nextUrl.searchParams)
    }
  );
}
