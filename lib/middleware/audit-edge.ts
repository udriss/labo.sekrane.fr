// lib/middleware/audit-edge.ts
import { NextRequest } from 'next/server';

export async function auditMiddleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';
    
    // Récupération du token de session pour identifier l'utilisateur
    const sessionToken = request.cookies.get('next-auth.session-token') || 
                        request.cookies.get('__Secure-next-auth.session-token');
    
    let userId = 'anonymous';
    
    // Tentative d'extraction de l'ID utilisateur des cookies
    const activeUserId = request.cookies.get('active-user-id');
    if (activeUserId?.value) {
      userId = activeUserId.value;
    } else if (sessionToken) {
      userId = 'authenticated';
    }

    const auditData = {
      timestamp: new Date().toISOString(),
      userId,
      action: `${method} ${path}`,
      ip,
      userAgent: userAgent.substring(0, 200), // Limiter la taille
      sessionPresent: !!sessionToken
    };

    // Log pour audit en mode asynchrone
    // Ne pas attendre la réponse pour ne pas ralentir la requête
    fetch(`${request.nextUrl.origin}/api/audit/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(auditData)
    }).catch(() => {
      // Ignorer silencieusement les erreurs d'audit pour ne pas impacter l'utilisateur
    });

  } catch (error) {
    // Ignorer silencieusement les erreurs d'audit
    console.warn('Audit middleware error:', error);
  }
}
