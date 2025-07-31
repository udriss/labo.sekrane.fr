import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Person,
  Group,
  Schedule,
  Warning,
  Error as ErrorIcon,
  Info,
  ExpandMore,
  PriorityHigh
} from '@mui/icons-material';
import { ExtendedNotification } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationItemProps {
  notification: ExtendedNotification | null | undefined;
  onMarkAsRead?: (notificationId: string) => void;
  onError?: (error: string) => void;
  onClick?: (notificationId: string) => void;
}

// Fonction utilitaire pour valider une notification
const validateNotification = (notification: any): notification is ExtendedNotification => {
  if (!notification || typeof notification !== 'object') {
    console.warn('Notification invalide: pas un objet', notification);
    return false;
  }

  // Champs essentiels - si ils manquent, la notification ne peut pas être affichée
  const essentialFields = ['id'];
  const missingEssential = essentialFields.filter(field => 
    notification[field] === undefined || notification[field] === null || notification[field] === ''
  );
  
  if (missingEssential.length > 0) {
    console.warn('Notification invalide: champs essentiels manquants:', missingEssential, notification);
    return false;
  }

  return true;
};

// Fonction pour obtenir l'icône de sévérité
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <ErrorIcon color="error" />;
    case 'high':
      return <PriorityHigh color="warning" />;
    case 'medium':
      return <Warning color="info" />;
    case 'low':
    default:
      return <Info color="action" />;
  }
};

// Fonction pour obtenir la couleur de sévérité
const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
    default:
      return 'default';
  }
};

// Fonction pour formater le message
const formatMessage = (message: any): string => {
  if (!message) {
    return 'Message non disponible';
  }

  if (typeof message === 'string') {
    return message;
  }

  if (typeof message === 'object') {
    // Essayer d'abord le français, puis l'anglais, puis la première propriété disponible
    return message.fr || message.en || Object.values(message)[0] || 'Message non disponible';
  }

  return String(message);
};

// Fonction pour formater la date
const formatDate = (dateString: string | undefined | null): string => {
  try {
    if (!dateString) {
      return 'Date non disponible';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Date invalide reçue:', dateString);
      return 'Date invalide';
    }
    
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } catch (error) {
    console.warn('Erreur lors du formatage de la date:', error, 'Date reçue:', dateString);
    return 'Date invalide';
  }
};

export default function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onError,
  onClick
}: NotificationItemProps) {
  // Vérifier si la notification est valide
  if (!validateNotification(notification)) {
    console.warn('NotificationItem: notification invalide reçue:', notification);
    
    if (onError) {
      onError('Notification invalide reçue');
    }

    return (
      <Alert severity="warning" sx={{ mb: 1 }}>
        <Typography variant="body2">
          Notification invalide ou corrompue
        </Typography>
      </Alert>
    );
  }
  // Gestion du clic sur la notification
  const handleNotificationClick = () => {
    if (onClick && safeNotification.id) {
      onClick(safeNotification.id);
    }
  };
  // À ce point, notification est garantie d'être valide
  const safeNotification = notification as any; // Utiliser any pour permettre l'accès aux champs DB

  // Valeurs par défaut pour les propriétés optionnelles avec protection robuste
  const isRead = safeNotification.isRead === true;
  const message = formatMessage(safeNotification.message);
  const details = safeNotification.details || '';
  const severity = safeNotification.severity || 'medium';
  const reason = safeNotification.reason || 'role';
  const specificReason = safeNotification.specificReason || '';
  const createdAt = formatDate(safeNotification.createdAt || safeNotification.created_at || null);
  const userId = safeNotification.userId || safeNotification.user_id || '';
  const role = safeNotification.role || safeNotification.user_role || 'UNKNOWN';
  const module = safeNotification.module || 'UNKNOWN';
  const actionType = safeNotification.actionType || safeNotification.action_type || 'UNKNOWN';

  const handleMarkAsRead = () => {
    if (!isRead && onMarkAsRead && safeNotification.id) {
      try {
        onMarkAsRead(safeNotification.id);
      } catch (error) {
        console.error('Erreur lors du marquage comme lu:', error);
        if (onError) {
          onError('Erreur lors du marquage comme lu');
        }
      }
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 1,
        opacity: isRead ? 0.7 : 1,
        borderLeft: `4px solid ${getSeverityColor(severity) === 'error' ? '#f44336' : 
                                  getSeverityColor(severity) === 'warning' ? '#ff9800' :
                                  getSeverityColor(severity) === 'info' ? '#2196f3' : '#4caf50'}`,
        '&:hover': {
          boxShadow: 2
        }
      }}
      onClick={handleNotificationClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          {/* Contenu principal */}
          <Box flex={1} mr={2}>
            {/* En-tête avec module et sévérité */}
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip 
                label={safeNotification.module || 'UNKNOWN'} 
                size="small" 
                variant="outlined" 
                color="primary"
              />
              <Chip 
                label={severity.toUpperCase()} 
                size="small" 
                color={getSeverityColor(severity)}
                icon={getSeverityIcon(severity)}
              />
              {reason === 'specific' && (
                <Tooltip title={`Raison spécifique: ${specificReason}`}>
                  <Chip 
                    label="Personnel" 
                    size="small" 
                    color="secondary"
                    icon={<Person />}
                  />
                </Tooltip>
              )}
              {reason === 'role' && (
                <Tooltip title={`Basé sur le rôle: ${safeNotification.role}`}>
                  <Chip 
                    label="Rôle" 
                    size="small" 
                    color="default"
                    icon={<Group />}
                  />
                </Tooltip>
              )}
            </Box>

            {/* Message principal */}
            <Typography 
              variant="body1" 
              fontWeight={isRead ? 'normal' : 'medium'}
              sx={{ mb: 1 }}
            >
              {message}
            </Typography>

            {/* Détails sous forme d'accordéon */}
            {details && (
              <Box sx={{ mb: 1 }}>
              <Accordion
                sx={{ boxShadow: 'none', bgcolor: 'transparent' }}
                disableGutters
              >
                <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  minHeight: 0,
                  '& .MuiAccordionSummary-content': {
                  m: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  p: 0,
                  }
                }}
                >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  p: 0,
                  }}
                >
                  {details}
                </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  {details}
                </Typography>
                </AccordionDetails>
              </Accordion>
              </Box>
            )}

            {/* Métadonnées */}
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {createdAt}
                </Typography>
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                Action: {safeNotification.actionType || 'UNKNOWN'}
              </Typography>

              {safeNotification.entityType && (
                <Typography variant="caption" color="text.secondary">
                  Type: {safeNotification.entityType}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            {/* Avatar de statut */}
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32,
                bgcolor: isRead ? 'success.light' : 'grey.300'
              }}
            >
              {getSeverityIcon(severity)}
            </Avatar>

            {/* Bouton de lecture */}
            {!isRead && (
              <Tooltip title="Marquer comme lu">
                <IconButton 
                  size="small" 
                  onClick={handleMarkAsRead}
                  color="primary"
                >
                  <RadioButtonUnchecked />
                </IconButton>
              </Tooltip>
            )}

            {isRead && (
              <Tooltip title="Lu">
                <IconButton size="small" disabled>
                  <CheckCircle color="success" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}