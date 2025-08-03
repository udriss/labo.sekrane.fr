// lib/hooks/usePhysicsCalendarData.ts

import { useState, useCallback } from 'react';
import { CalendarEvent, EventState } from '@/types/calendar';

export const usePhysicsCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger tous les événements
  const loadEvents = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/calendrier/physique';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      const physicsEvents = await response.json();
      setEvents(physicsEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des événements de physique');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer un événement
  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/calendrier/physique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (!response.ok) throw new Error('Erreur lors de la création');
      const newEvent = await response.json();
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour un événement
  const updateEvent = useCallback(async (eventId: string, updatedFields: Partial<CalendarEvent>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendrier/physique/?id=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!response.ok) throw new Error('Erreur lors de la modification');
      const updatedEvent = await response.json();
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev));
      return updatedEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Supprimer un événement
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendrier/physique/?id=${eventId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Déplacer un événement (proposer nouveaux créneaux)
  const moveEvent = useCallback(async (eventId: string, timeSlots: any[], reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendrier/physique/move-event?id=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSlots, reason })
      });
      if (!response.ok) throw new Error('Erreur lors du déplacement');
      const updatedEvent = await response.json();
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev));
      return updatedEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du déplacement');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Changer l'état d'un événement
  const changeEventState = useCallback(async (eventId: string, newState: EventState, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendrier/physique/state-change?id=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newState: newState, reason })
      });
      if (!response.ok) throw new Error('Erreur lors du changement d\'état');
      const updatedEvent = await response.json();
      setEvents(prev => prev.map(ev => ev.id === eventId ? updatedEvent : ev));
      return updatedEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement d\'état');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    changeEventState,
    setError
  };
};
