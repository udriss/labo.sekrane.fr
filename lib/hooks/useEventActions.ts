'use client';

import React, { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import { useTimeslots } from '@/lib/hooks/useTimeslots';

interface Event {
  id: number;
  title: string;
  discipline: string;
  ownerId: number;
  owner: { id: number; name: string; email: string };
  timeslots: any[];
  classes?: Array<{ classe: { id: number; name: string } }>;
  salles?: Array<{ salle: { id: number; name: string } }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseEventActionsProps {
  fetchEvents: () => Promise<void>;
}

export function useEventActions({ fetchEvents }: UseEventActionsProps) {
  const sessionData = useSession();
  const session = sessionData?.data;
  const { showSnackbar } = useSnackbar();
  const { proposeTimeslots, approveTimeslots } = useTimeslots();

  // 1. Détermine si l'utilisateur courant est le créateur d'un événement
  const isCreator = useCallback(
    (event: Event): boolean => {
      if (!session?.user?.email) return false;
      return (
        event.owner.email === session.user.email || event.ownerId === Number(session.user.id || 0)
      );
    },
    [session],
  );

  // 10. Propose de nouveaux créneaux pour un événement
  const handleMoveDate = useCallback(
    async (event: Event, timeSlots: any[], reason: string, state: string) => {
      try {
        // Appel API pour proposer de nouveaux créneaux
        const response = await fetch('/api/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            discipline: event.discipline,
            slots: timeSlots,
            reason,
            state,
          }),
        });

        if (!response.ok) throw new Error('Erreur lors du déplacement');

        // Affichage d'alerte selon le rôle
        const userRole = (session?.user?.role || 'ENSEIGNANT').toUpperCase();
        if (
          userRole === 'ADMIN' ||
          userRole === 'LABORANTIN_PHYSIQUE' ||
          userRole === 'LABORANTIN_CHIMIE' ||
          userRole === 'ADMINLABO'
        ) {
          showSnackbar('Créneaux déplacés avec succès', 'success');
        } else {
          showSnackbar('Demande de déplacement envoyée pour validation', 'info');
        }

        // Recharge les événements
        await fetchEvents();
      } catch (error) {
        console.error('Erreur déplacement:', error);
        showSnackbar('Erreur lors du déplacement', 'error');
      }
    },
    [session, showSnackbar, fetchEvents],
  );

  // 11. Gère le changement d'état d'un événement
  const handleStateChange = useCallback(
    async (updatedEvent: Event, newState: string, reason: string, timeSlots?: any[]) => {
      try {
        const response = await fetch(`/api/events/${updatedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: newState, reason, timeSlots }),
        });

        if (!response.ok) throw new Error("Erreur lors du changement d'état");

        showSnackbar(`État de l'événement mis à jour: ${newState}`, 'success');
        await fetchEvents();
      } catch (error) {
        console.error('Erreur changement état:', error);
        showSnackbar("Erreur lors du changement d'état", 'error');
      }
    },
    [showSnackbar, fetchEvents],
  );

  // 12. Confirme ou rejette une modification d'événement
  const handleConfirmModification = useCallback(
    async (event: Event, modificationId: string, action: 'approve' | 'reject') => {
      try {
        const response = await fetch(`/api/events/${event.id}/modifications/${modificationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        if (!response.ok) throw new Error('Erreur lors de la confirmation');

        const actionText = action === 'approve' ? 'approuvée' : 'rejetée';
        showSnackbar(`Modification ${actionText} avec succès`, 'success');
        await fetchEvents();
      } catch (error) {
        console.error('Erreur confirmation:', error);
        showSnackbar('Erreur lors de la confirmation', 'error');
      }
    },
    [showSnackbar, fetchEvents],
  );

  // 13. Approuve ou rejette les changements de créneaux
  const handleApproveTimeSlotChanges = useCallback(
    async (event: Event) => {
      try {
        // Approve created/modified; if user is the owner, also approve counter_proposed
        const pendingSlots = event.timeslots.filter(
          (slot) =>
            ['created', 'modified'].includes(slot.state) ||
            (slot.state === 'counter_proposed' && isCreator(event)),
        );
        const slotIds = pendingSlots.map((slot) => slot.id);

        const response = await fetch('/api/timeslots', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeslotIds: slotIds, approve: true }),
        });

        if (!response.ok) throw new Error("Erreur lors de l'approbation");

        showSnackbar('Créneaux approuvés avec succès', 'success');
        await fetchEvents();
      } catch (error) {
        console.error('Erreur approbation:', error);
        showSnackbar("Erreur lors de l'approbation", 'error');
      }
    },
    [showSnackbar, fetchEvents, isCreator],
  );

  const handleRejectTimeSlotChanges = useCallback(
    async (event: Event) => {
      try {
        // Reject created/modified; if user is the owner, can also reject counter_proposed
        const pendingSlots = event.timeslots.filter(
          (slot) =>
            ['created', 'modified'].includes(slot.state) ||
            (slot.state === 'counter_proposed' && isCreator(event)),
        );
        const slotIds = pendingSlots.map((slot) => slot.id);

        const response = await fetch('/api/timeslots', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeslotIds: slotIds, approve: false }),
        });

        if (!response.ok) throw new Error('Erreur lors du rejet');

        showSnackbar('Créneaux rejetés', 'warning');
        await fetchEvents();
      } catch (error) {
        console.error('Erreur rejet:', error);
        showSnackbar('Erreur lors du rejet', 'error');
      }
    },
    [showSnackbar, fetchEvents, isCreator],
  );

  // 15. Sauvegarde les modifications d'un événement
  const handleSaveEdit = useCallback(
    async (eventId: number, updatedEventData: Partial<Event>, options?: { silent?: boolean }) => {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEventData),
        });

        if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

        const updatedEvent = await response.json();
        if (!options?.silent) {
          showSnackbar('Événement modifié avec succès', 'success');
          await fetchEvents();
        }
        return updatedEvent.event;
      } catch (error) {
        console.error('Erreur sauvegarde:', error);
        if (!options?.silent) {
          showSnackbar('Erreur lors de la sauvegarde', 'error');
        }
        throw error;
      }
    },
    [showSnackbar, fetchEvents],
  );

  // 16. Supprime un événement après confirmation
  const handleEventDelete = useCallback(
    async (event: Event): Promise<boolean> => {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return false;

      try {
        const response = await fetch(`/api/events/${event.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression');

        showSnackbar('Événement supprimé avec succès', 'success');
        return true;
      } catch (error) {
        console.error('Erreur suppression:', error);
        showSnackbar('Erreur lors de la suppression', 'error');
        return false;
      }
    },
    [showSnackbar],
  );

  // 17. Vérifie si l'utilisateur peut éditer l'événement
  const canEditEvent = useCallback(
    (event: Event): boolean => {
      const userRole = (session?.user?.role || 'ENSEIGNANT').toUpperCase();
      return userRole === 'ADMIN' || userRole === 'ADMINLABO' || isCreator(event);
    },
    [session, isCreator],
  );

  // 18. Vérifie si l'utilisateur peut valider les événements
  const canValidateEvent = useCallback((): boolean => {
    const userRole = (session?.user?.role || 'ENSEIGNANT').toUpperCase();
    return (
      userRole === 'LABORANTIN_PHYSIQUE' ||
      userRole === 'LABORANTIN_CHIMIE' ||
      userRole === 'ADMINLABO'
    );
  }, [session]);

  return {
    isCreator,
    handleMoveDate,
    handleStateChange,
    handleConfirmModification,
    handleApproveTimeSlotChanges,
    handleRejectTimeSlotChanges,
    handleSaveEdit,
    handleEventDelete,
    canEditEvent,
    canValidateEvent,
  };
}
