// lib/api/with-audit.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditLogger } from '@/lib/services/audit-logger';
import { wsNotificationService } from '@/lib/services/websocket-notification-service';
import { AuditAction, AuditUser, AuditContext } from '@/types/audit';
import util from 'util'; // Ajoutez cet import en haut du fichier


type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

interface AuditOptions {
  action?: AuditAction['type'];
  module: AuditAction['module'];
  entity: string;
  extractEntityId?: (req: NextRequest, params?: any) => string | undefined;
  extractEntityIdFromResponse?: (response: any) => string | undefined;
  skipAuth?: boolean;
  customDetails?: (req: NextRequest, response?: any) => any;
  // Nouvelles options pour les notifications
  notifyUsers?: 'all' | 'admins' | 'teachers' | 'custom';
  customNotifyUsers?: string[]; // IDs d'utilisateurs spécifiques
  skipNotifications?: boolean;
}

// Helper pour créer un message de notification amélioré
function createEnhancedNotificationMessage(
  triggeredBy: AuditUser,
  actionType: string,
  module: string,
  entityType?: string,
  details?: any
): { messageToDisplay: string; log_message: string } {
  const logMessage = `Action ${actionType} effectuée sur ${entityType || 'élément'} dans le module ${module}`;
  
  // Messages personnalisés selon le module et l'action
  let displayMessage = logMessage; // Fallback par défaut
  
  if (module === 'CHEMICALS') {
    displayMessage = createChemicalNotificationMessage(triggeredBy, actionType, details);
  } else if (module === 'EQUIPMENT') {
    displayMessage = createEquipmentNotificationMessage(triggeredBy, actionType, details);
  }
  
  return {
    messageToDisplay: displayMessage,
    log_message: logMessage
  };
}

// Messages spécifiques pour les chemicals
function createChemicalNotificationMessage(
  triggeredBy: AuditUser,
  actionType: string,
  details?: any
): string {
  const userName = triggeredBy.name;
  
  if (actionType === 'CREATE') {
    const chemicalName = details?.chemicalName || 'un nouveau réactif';
    const quantity = details?.quantity || 'une quantité';
    const unit = details?.unit || '';
    return `${userName} a ajouté ${chemicalName} (${quantity}${unit}) à l'inventaire`;
  }
  
  if (actionType === 'UPDATE') {
    const chemicalName = details?.chemicalName || 'un réactif';
    
    // Si c'est une mise à jour de quantité uniquement
    if (details?.quantityUpdate && details?.before?.quantity !== undefined && details?.after?.quantity !== undefined) {
      const oldQuantity = details.before.quantity;
      const newQuantity = details.after.quantity;
      const unit = details?.after?.unit || details?.before?.unit || '';
      return `${userName} a modifié la quantité de ${chemicalName} : ${oldQuantity}${unit} → ${newQuantity}${unit}`;
    }
    
    // Changement de localisation (salle et/ou localisation précise)
    if (details?.locationUpdate) {
      const oldRoom = details?.before?.room || '';
      const newRoom = details?.after?.room || '';
      const oldLocation = details?.before?.location || '';
      const newLocation = details?.after?.location || '';
      
      if (oldRoom !== newRoom && oldLocation !== newLocation) {
        return `${userName} a déplacé ${chemicalName} : ${oldRoom}${oldLocation ? ` → ${oldLocation}` : ''} vers ${newRoom}${newLocation ? ` → ${newLocation}` : ''}`;
      } else if (oldRoom !== newRoom) {
        return `${userName} a déplacé ${chemicalName} de ${oldRoom} vers ${newRoom}`;
      } else if (oldLocation !== newLocation) {
        return `${userName} a changé la localisation de ${chemicalName} : ${oldLocation} → ${newLocation}`;
      }
    }
    
    // Changement de date d'expiration
    if (details?.expirationUpdate && details?.before?.expirationDate !== details?.after?.expirationDate) {
      const oldDate = details?.before?.expirationDate ? new Date(details.before.expirationDate).toLocaleDateString('fr-FR') : 'aucune';
      const newDate = details?.after?.expirationDate ? new Date(details.after.expirationDate).toLocaleDateString('fr-FR') : 'aucune';
      return `${userName} a modifié la date d'expiration de ${chemicalName} : ${oldDate} → ${newDate}`;
    }
    
    // Changement de statut
    if (details?.statusUpdate && details?.before?.status !== details?.after?.status) {
      const oldStatus = details?.before?.status || '';
      const newStatus = details?.after?.status || '';
      const statusLabels: { [key: string]: string } = {
        'IN_STOCK': 'En stock',
        'LOW_STOCK': 'Stock faible',
        'OUT_OF_STOCK': 'Rupture de stock',
        'EXPIRED': 'Expiré',
        'EMPTY': 'Vide',
        'OPENED': 'Ouvert',
        'QUARANTINE': 'Quarantaine'
      };
      return `${userName} a changé le statut de ${chemicalName} : ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`;
    }
    
    // Changement de fournisseur
    if (details?.supplierUpdate && details?.before?.supplierName !== details?.after?.supplierName) {
      const oldSupplier = details?.before?.supplierName || 'Aucun fournisseur';
      const newSupplier = details?.after?.supplierName || 'Aucun fournisseur';
      return `${userName} a changé le fournisseur de ${chemicalName} : ${oldSupplier} → ${newSupplier}`;
    }
    
    // Mise à jour générale
    const fieldsUpdated = details?.fields || [];
    if (fieldsUpdated.length > 0) {
      const fieldNames = fieldsUpdated.join(', ');
      return `${userName} a modifié ${chemicalName} (${fieldNames})`;
    }
    
    return `${userName} a modifié les informations de ${chemicalName}`;
  }
  
  if (actionType === 'DELETE') {
    const chemicalName = details?.chemicalName || 'un réactif';
    return `${userName} a supprimé ${chemicalName} de l'inventaire`;
  }
  
  return `${userName} a effectué une action sur un réactif chimique`;
}

// Messages spécifiques pour l'équipement
function createEquipmentNotificationMessage(
  triggeredBy: AuditUser,
  actionType: string,
  details?: any
): string {
  const userName = triggeredBy.name;

  if (actionType === 'CREATE') {
    const equipmentName = details?.equipmentName || 'un nouvel équipement';
    const quantity = details?.quantity || 'une quantité';
    return `${userName} a ajouté ${equipmentName} (${quantity} unité${quantity > 1 ? 's' : ''}) à l'inventaire`;
  }
  
  if (actionType === 'UPDATE') {
    const equipmentName = details?.equipmentName || 'un équipement';
    
    // Si c'est une mise à jour de quantité uniquement
    if (details?.quantityUpdate && details?.before?.quantity !== undefined && details?.after?.quantity !== undefined) {
      const oldQuantity = details.before.quantity;
      const newQuantity = details.after.quantity;
      return `${userName} a modifié la quantité de ${equipmentName} : ${oldQuantity} → ${newQuantity}`;
    }
    
    // Changement de localisation (salle et/ou localisation précise)
    if (details?.locationUpdate) {
      const oldRoom = details?.before?.room || '';
      const newRoom = details?.after?.room || '';
      const oldLocation = details?.before?.location || '';
      const newLocation = details?.after?.location || '';
      
      if (oldRoom !== newRoom && oldLocation !== newLocation) {
        return `${userName} a déplacé ${equipmentName} : ${oldRoom}${oldLocation ? ` → ${oldLocation}` : ''} vers ${newRoom}${newLocation ? ` → ${newLocation}` : ''}`;
      } else if (oldRoom !== newRoom) {
        return `${userName} a déplacé ${equipmentName} de ${oldRoom} vers ${newRoom}`;
      } else if (oldLocation !== newLocation) {
        return `${userName} a changé la localisation de ${equipmentName} : ${oldLocation} → ${newLocation}`;
      }
    }
    
    // Changement de statut
    if (details?.statusUpdate && details?.before?.status !== details?.after?.status) {
      const oldStatus = details?.before?.status || '';
      const newStatus = details?.after?.status || '';
      const statusLabels: { [key: string]: string } = {
        'AVAILABLE': 'Disponible',
        'IN_USE': 'En cours d\'utilisation',
        'MAINTENANCE': 'En maintenance',
        'OUT_OF_ORDER': 'Hors service',
        'RESERVED': 'Réservé'
      };
      return `${userName} a changé le statut de ${equipmentName} : ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`;
    }
    
    // Changement de date d'achat
    if (details?.purchaseDateUpdate && details?.before?.purchase_date !== details?.after?.purchase_date) {
      const oldDate = details?.before?.purchase_date ? new Date(details.before.purchase_date).toLocaleDateString('fr-FR') : 'aucune';
      const newDate = details?.after?.purchase_date ? new Date(details.after.purchase_date).toLocaleDateString('fr-FR') : 'aucune';
      return `${userName} a modifié la date d'achat de ${equipmentName} : ${oldDate} → ${newDate}`;
    }
    
    // Changement de modèle ou numéro de série
    if (details?.modelUpdate && details?.before?.model !== details?.after?.model) {
      const oldModel = details?.before?.model || 'Non spécifié';
      const newModel = details?.after?.model || 'Non spécifié';
      return `${userName} a modifié le modèle de ${equipmentName} : ${oldModel} → ${newModel}`;
    }
    
    if (details?.serialUpdate && details?.before?.serial_number !== details?.after?.serial_number) {
      const oldSerial = details?.before?.serial_number || 'Non spécifié';
      const newSerial = details?.after?.serial_number || 'Non spécifié';
      return `${userName} a modifié le numéro de série de ${equipmentName} : ${oldSerial} → ${newSerial}`;
    }
    
    // Mise à jour générale
    const fieldsUpdated = details?.fields || [];
    if (fieldsUpdated.length > 0) {
      const fieldNames = fieldsUpdated.join(', ');
      return `${userName} a modifié ${equipmentName} (${fieldNames})`;
    }
    
    return `${userName} a modifié les informations de ${equipmentName}`;
  }
  
  if (actionType === 'DELETE') {
    const equipmentName = details?.equipmentName || 'un équipement';
    return `${userName} a supprimé ${equipmentName} de l'inventaire`;
  }
  
  if (actionType === 'POST') {
    console.log("#############################details: ", util.inspect(details, { depth: null, colors: true }));
    const equipmentName = details?.equipmentName || 'un équipement';
    return `${userName} a ajouté ${equipmentName} (${details?.quantity || 1} unité${details?.quantity > 1 ? 's' : ''}) à l'inventaire`;
  }

  return `${userName} a effectué une action sur un équipement`;
}

async function triggerNotifications(
  triggeredBy: AuditUser,
  module: string,
  actionType: string,
  details: any,
  notifyUsers: 'all' | 'admins' | 'teachers' | 'custom' = 'all',
  customNotifyUsers?: string[],
  entityId?: string,
  entityType?: string
) {
  try {
    // Déterminer les rôles cibles selon le type de notification
    let targetRoles: string[] = [];
    
    switch (notifyUsers) {
      case 'admins':
        targetRoles = ['ADMIN'];
        break;
      case 'teachers':
        targetRoles = ['ADMIN', 'ADMINLABO', 'TEACHER'];
        break;
      case 'all':
        targetRoles = ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'];
        break;
      case 'custom':
        // Pour les utilisateurs personnalisés, nous utiliserons customUserIds
        targetRoles = [];
        break;
    }

    // Créer le message de notification avec structure améliorée
    const message = createEnhancedNotificationMessage(
      triggeredBy, 
      actionType, 
      module, 
      entityType, 
      details
    );

    // Déterminer la sévérité selon le type d'action
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (actionType === 'DELETE') {
      severity = 'high';
    } else if (actionType === 'CREATE') {
      severity = 'medium';
    } else if (actionType === 'UPDATE') {
      severity = 'low';
    }

    // Envoyer la notification via WebSocket
    await wsNotificationService.sendNotification(
      targetRoles,
      module,
      actionType,
      message,
      severity,
      entityType,
      entityId,
      triggeredBy.id,
      customNotifyUsers
    );


  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification WebSocket:', error);
  }
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

      // Déclencher les notifications si l'opération a réussi et que les notifications ne sont pas désactivées
      if (status === 'SUCCESS' && !options.skipNotifications) {
        await triggerNotifications(
          user,
          options.module,
          actionType,
          details,
          options.notifyUsers,
          options.customNotifyUsers,
          entityId,
          options.entity
        );
      }

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