// components/notifications/NotificationItem.tsx
'use client';

import React, { useState } from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip,
  Collapse,
  IconButton,
  Card,
  CardContent,
  Divider,
  Stack
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Circle,
  AccessTime,
  Person,
  Category,
  Timeline,
  DoneAll,
  Delete
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  parseNotificationMessage,
  getDetailedDescription,
  getNotificationIcon,
  getSeverityColor,
  formatRelativeTime
} from '@/lib/utils/notification-messages';
import type { WebSocketNotification } from '@/types/notifications';

interface NotificationItemProps {
  notification: WebSocketNotification;
  onClick?: () => void;
  compact?: boolean;
  showActions?: boolean;
  onMarkRead?: () => void;
  onDelete?: () => void;
}

export default function NotificationItem({ 
  notification, 
  onClick, 
  compact = false,
  showActions = false,
  onMarkRead,
  onDelete
}: NotificationItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  const displayData = parseNotificationMessage(notification.message);
  const detailedDescription = getDetailedDescription(notification, displayData);
  const icon = getNotificationIcon(notification.module || 'SYSTEM', notification.actionType || 'INFO');
  const severityColor = getSeverityColor(notification.severity);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const timestamp = notification.createdAt || notification.timestamp || new Date().toISOString();
  const relativeTime = formatRelativeTime(timestamp);

  if (compact) {
    return (
      <ListItem
        disablePadding
        sx={{
          bgcolor: notification.isRead ? 'transparent' : 'action.hover',
          borderLeft: notification.isRead ? 'none' : '4px solid',
          borderLeftColor: severityColor.color === 'error' ? 'error.main' : 
                          severityColor.color === 'warning' ? 'warning.main' :
                          severityColor.color === 'info' ? 'info.main' : 'primary.main'
        }}
      >
        <ListItemButton onClick={handleClick}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: `${severityColor.color}.main`, fontSize: '1.2rem' }}>
              {icon}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: notification.isRead ? 400 : 600, 
                    flex: 1 
                  }}
                >
                  {displayData.displayMessage}
                </Typography>
                {!notification.isRead && (
                  <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                )}
              </Box>
            }
            secondary={
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip 
                  component="span" 
                  label={notification.module} 
                  size="small" 
                  variant="outlined" 
                  sx={{ fontSize: '0.7rem' }} 
                />
                <Typography component="span" variant="caption" color="text.secondary">
                  <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                  {relativeTime}
                </Typography>
              </Box>
            }
          />
        </ListItemButton>
      </ListItem>
    );
  }

  // Affichage étendu pour la page complète des notifications
  return (
    <Card 
      sx={{ 
        mb: 1,
        border: notification.isRead ? 'none' : '2px solid',
        borderColor: notification.isRead ? 'divider' : 'primary.main',
        bgcolor: notification.isRead ? 'background.paper' : 'action.hover'
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar sx={{ bgcolor: `${severityColor.color}.main`, fontSize: '1.2rem' }}>
            {icon}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: notification.isRead ? 500 : 600,
                  color: notification.isRead ? 'text.primary' : 'primary.main'
                }}
              >
                {displayData.displayMessage}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {!notification.isRead && (
                  <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                )}
                <IconButton 
                  size="small" 
                  onClick={handleExpandClick}
                  sx={{ ml: 1 }}
                >
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip 
                label={notification.module} 
                size="small" 
                color={severityColor.color}
                variant="outlined"
              />
              <Chip 
                label={notification.actionType} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={notification.severity.toUpperCase()} 
                size="small" 
                color={severityColor.color}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime sx={{ fontSize: 12 }} />
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr })}
              {timestamp && (
                <> • {new Date(timestamp).toLocaleString('fr-FR')}</>
              )}
            </Typography>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Description complète:</strong>
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-line',
                    bgcolor: 'action.hover',
                    p: 1,
                    borderRadius: 1,
                    fontFamily: 'monospace'
                  }}
                >
                  {detailedDescription}
                </Typography>

                <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
                  {notification.entityType && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Category sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption">
                        <strong>Type:</strong> {notification.entityType}
                      </Typography>
                    </Box>
                  )}
                  
                  {notification.entityId && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Timeline sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption">
                        <strong>ID:</strong> {notification.entityId}
                      </Typography>
                    </Box>
                  )}
                  
                  {notification.triggeredBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption">
                        <strong>Par:</strong> {notification.triggeredBy}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  <strong>Message technique:</strong> {displayData.logMessage}
                </Typography>
              </Box>
            </Collapse>

            {/* Actions */}
            {showActions && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                {!notification.isRead && onMarkRead && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead();
                    }}
                    title="Marquer comme lue"
                    color="primary"
                  >
                    <DoneAll />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    title="Supprimer"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
