// components/calendar/PendingModifications.tsx

"use client"

import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Grid,
  Avatar,
  Divider
} from '@mui/material'
import {
  CheckCircle,
  Cancel,
  Schedule,
  SwapHoriz,
  Person,
  CalendarToday
} from '@mui/icons-material'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarEvent } from '@/types/calendar'

interface PendingModificationsProps {
  event: CalendarEvent
  isCreator: boolean
  onConfirmModification: (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => void
  compact?: boolean // Pour l'affichage dans DailyPlanning
}

const PendingModifications: React.FC<PendingModificationsProps> = ({
  event,
  isCreator,
  onConfirmModification,
  compact = false
}) => {
  const pendingModifications = event.eventModifying?.filter(mod => mod.status === 'PENDING') || []
  
  if (!isCreator || pendingModifications.length === 0) {
    return null
  }

  const getActionInfo = (action: string) => {
    switch (action) {
      case 'MOVE':
        return {
          label: 'Déplacement',
          icon: <SwapHoriz fontSize="small" />,
          color: 'primary' as const
        }
      case 'CANCEL':
        return {
          label: 'Annulation',
          icon: <Cancel fontSize="small" />,
          color: 'error' as const
        }
      default:
        return {
          label: 'Modification',
          icon: <Schedule fontSize="small" />,
          color: 'default' as const
        }
    }
  }

  if (compact) {
    // Affichage compact pour DailyPlanning
    return (
      <Box 
        sx={{ 
          mt: 2,
          p: 2,
          bgcolor: 'rgba(25, 118, 210, 0.04)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(25, 118, 210, 0.12)',
          borderRadius: 2,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.02) 0%, rgba(25, 118, 210, 0.08) 100%)',
            borderRadius: 2,
            zIndex: -1
          }
        }}
      >
        <Typography variant="body2" fontWeight="medium" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule fontSize="small" />
          Modifications en attente ({pendingModifications.length})
        </Typography>
        
        <Stack spacing={1}>
          {pendingModifications.map((modification, index) => {
            const modificationId = `${modification.requestDate}_${modification.userId}`
            const actionInfo = getActionInfo(modification.action)
            
            return (
              <Box key={modificationId} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1,
                bgcolor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: 1,
                backdropFilter: 'blur(5px)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    icon={actionInfo.icon}
                    label={actionInfo.label}
                    size="small"
                    color={actionInfo.color}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    par {modification.userId || 'Utilisateur'}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => onConfirmModification(event, modificationId, 'confirm')}
                    startIcon={<CheckCircle fontSize="small" />}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      bgcolor: 'rgba(46, 125, 50, 0.9)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        bgcolor: 'rgba(46, 125, 50, 1)',
                      }
                    }}
                  >
                    Accepter
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => onConfirmModification(event, modificationId, 'reject')}
                    startIcon={<Cancel fontSize="small" />}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      borderColor: 'rgba(211, 47, 47, 0.5)',
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'rgba(211, 47, 47, 0.8)',
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                      }
                    }}
                  >
                    Refuser
                  </Button>
                </Stack>
              </Box>
            )
          })}
        </Stack>
      </Box>
    )
  }

  // Affichage complet pour EventDetailsDialog
  return (
    <Card 
      elevation={0}
      sx={{ 
        mb: 3,
        bgcolor: 'rgba(25, 118, 210, 0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(25, 118, 210, 0.12)',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.02) 0%, rgba(25, 118, 210, 0.08) 100%)',
          zIndex: -1
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule />
          Modifications en attente
        </Typography>
        
        <Stack spacing={2}>
          {pendingModifications.map((modification, index) => {
            const modificationId = `${modification.requestDate}_${modification.userId}`
            const actionInfo = getActionInfo(modification.action)
            
            return (
              <Card 
                key={modificationId}
                elevation={0}
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 2
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            icon={actionInfo.icon}
                            label={actionInfo.label}
                            color={actionInfo.color}
                            variant="outlined"
                          />
                          <Typography variant="body2" color="text.secondary">
                            Demandé le {format(new Date(modification.requestDate), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                            <Person fontSize="small" />
                          </Avatar>
                          <Typography variant="body2">
                            Par {modification.userId || 'Utilisateur inconnu'}
                          </Typography>
                        </Box>
                        
                        {modification.reason && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            "{modification.reason}"
                          </Typography>
                        )}
                        
                        {modification.timeSlots && modification.timeSlots.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <CalendarToday fontSize="small" />
                              Nouveaux créneaux proposés :
                            </Typography>
                            <Stack spacing={0.5}>
                              {modification.timeSlots.map((slot, slotIndex) => (
                                <Chip
                                  key={slotIndex}
                                  label={`${format(new Date(slot.date), 'dd MMM yyyy', { locale: fr })} de ${slot.startTime} à ${slot.endTime}`}
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                    
                    <Box sx={{ minWidth: { md: 300 } }}>
                      <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => onConfirmModification(event, modificationId, 'confirm')}
                          startIcon={<CheckCircle />}
                          sx={{ 
                            bgcolor: 'rgba(46, 125, 50, 0.9)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                              bgcolor: 'rgba(46, 125, 50, 1)',
                            }
                          }}
                        >
                          Accepter {actionInfo.label.toLowerCase()}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => onConfirmModification(event, modificationId, 'reject')}
                          startIcon={<Cancel />}
                          sx={{ 
                            borderColor: 'rgba(211, 47, 47, 0.5)',
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                              borderColor: 'rgba(211, 47, 47, 0.8)',
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                            }
                          }}
                        >
                          Refuser {actionInfo.label.toLowerCase()}
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default PendingModifications
