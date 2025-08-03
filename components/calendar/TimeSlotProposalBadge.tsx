// components/calendar/TimeSlotProposalBadge.tsx
// Composant pour afficher les propositions de créneaux en attente

"use client"

import React, { useState } from 'react'
import {
  Box,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  TextField,
  CircularProgress
} from '@mui/material'
import {
  Schedule,
  SwapHoriz,
  CheckCircle,
  Cancel,
  AccessTime,
  Person
} from '@mui/icons-material'
import { CalendarEvent } from '@/types/calendar'
import { 
  hasPendingTimeSlotProposals, 
  getTimeSlotProposalSummary, 
  formatTimeSlotForDisplay,
  handleTimeSlotProposal,
  isEventOwner
} from '@/lib/calendar-move-utils'
import { useSession } from 'next-auth/react'

interface TimeSlotProposalBadgeProps {
  event: CalendarEvent
  discipline: 'chimie' | 'physique'
  onEventUpdate?: (updatedEvent: CalendarEvent) => void
  compact?: boolean
}

export function TimeSlotProposalBadge({ 
  event, 
  discipline,
  onEventUpdate,
  compact = false 
}: TimeSlotProposalBadgeProps) {
  const { data: session } = useSession()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')

  const proposalSummary = getTimeSlotProposalSummary(event)
  const isOwner = isEventOwner(event, session?.user?.id, session?.user?.email)

  // Ne rien afficher s'il n'y a pas de propositions en attente
  if (!proposalSummary.hasPending) {
    return null
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      const result = await handleTimeSlotProposal(
        event.id,
        discipline,
        'approve',
        reason || 'Créneaux approuvés'
      )

      if (result.success && result.event) {
        onEventUpdate?.(result.event)
        setDialogOpen(false)
        setReason('')
      } else {
        console.error('Erreur lors de l\'approbation:', result.error)
      }
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const result = await handleTimeSlotProposal(
        event.id,
        discipline,
        'reject',
        reason || 'Créneaux rejetés'
      )

      if (result.success && result.event) {
        onEventUpdate?.(result.event)
        setDialogOpen(false)
        setReason('')
      } else {
        console.error('Erreur lors du rejet:', result.error)
      }
    } catch (error) {
      console.error('Erreur lors du rejet:', error)
    } finally {
      setLoading(false)
    }
  }

  const badgeContent = (
    <Chip
      icon={<SwapHoriz />}
      label={compact ? proposalSummary.pendingCount : `${proposalSummary.pendingCount} proposition${proposalSummary.pendingCount > 1 ? 's' : ''}`}
      color="warning"
      variant={isOwner ? "filled" : "outlined"}
      size={compact ? "small" : "medium"}
      onClick={() => setDialogOpen(true)}
      sx={{
        cursor: 'pointer',
        animation: 'pulse 2s infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 }
        }
      }}
    />
  )

  return (
    <>
      <Tooltip 
        title={
          isOwner 
            ? `${proposalSummary.pendingCount} proposition(s) de déplacement en attente de votre validation`
            : `${proposalSummary.pendingCount} proposition(s) de déplacement en attente de validation`
        }
      >
        {badgeContent}
      </Tooltip>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SwapHoriz color="warning" />
            Propositions de créneaux - {event.title}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Alert 
            severity={isOwner ? "info" : "warning"} 
            sx={{ mb: 2 }}
          >
            {isOwner 
              ? "En tant que propriétaire de cet événement, vous pouvez approuver ou rejeter ces propositions."
              : "Ces propositions sont en attente de validation par le propriétaire de l'événement."
            }
          </Alert>

          <Typography variant="h6" gutterBottom>
            Créneaux actuels
          </Typography>
          <List dense>
            {proposalSummary.currentSlots.map((slot, index) => {
              const formatted = formatTimeSlotForDisplay(slot)
              return (
                <ListItem key={`current-${index}`}>
                  <ListItemText
                    primary={formatted.timeRange}
                    secondary={formatted.dateFormatted}
                  />
                </ListItem>
              )
            })}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom color="warning.main">
            Créneaux proposés
          </Typography>
          <List dense>
            {proposalSummary.proposedSlots.map((slot, index) => {
              const formatted = formatTimeSlotForDisplay(slot)
              const proposedBy = slot.createdBy || 'Utilisateur inconnu'
              return (
                <ListItem key={`proposed-${index}`}>
                  <ListItemText
                    primary={formatted.timeRange}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatted.dateFormatted}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                          <Person fontSize="small" />
                          <Typography variant="caption">
                            Proposé par {proposedBy}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
          </List>

          {isOwner && (
            <>
              <Divider sx={{ my: 2 }} />
              <TextField
                fullWidth
                label="Raison (optionnel)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Commentaire sur votre décision..."
                multiline
                rows={2}
              />
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
            disabled={loading}
          >
            Fermer
          </Button>
          
          {isOwner && (
            <>
              <Button
                onClick={handleReject}
                disabled={loading}
                color="error"
                startIcon={loading ? <CircularProgress size={16} /> : <Cancel />}
              >
                Rejeter
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading}
                color="success"
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
              >
                Approuver
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}
