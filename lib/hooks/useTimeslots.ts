import { useState, useCallback } from 'react';
import { TimeslotData, TimeslotProposal, TimeslotValidation } from '@/lib/types/timeslots';

export function useTimeslots() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localTimeslots, setLocalTimeslots] = useState<TimeslotData[] | null>(null);

  const getTimeslots = useCallback(
    async (
      eventId?: number,
      discipline?: string,
      type: 'all' | 'active' | 'pending' = 'active',
    ): Promise<TimeslotData[]> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (eventId) params.set('event_id', eventId.toString());
        if (discipline) params.set('discipline', discipline);
        params.set('type', type);

        const response = await fetch(`/api/timeslots?${params}`);
        if (!response.ok) throw new Error('Failed to fetch timeslots');

        const data = await response.json();
        setLocalTimeslots(data.timeslots);
        return data.timeslots;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const proposeTimeslots = useCallback(
    async (proposal: TimeslotProposal): Promise<TimeslotData[]> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal),
        });

        if (!response.ok) throw new Error('Failed to propose timeslots');

        const data = await response.json();
        // Merge new timeslots optimistically
        setLocalTimeslots((prev) => (prev ? [...prev, ...data.timeslots] : data.timeslots));
        return data.timeslots as TimeslotData[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const approveTimeslots = useCallback(
    async (validation: TimeslotValidation): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // Optimistic mutation
        if (localTimeslots) {
          if (validation.approve) {
            setLocalTimeslots(
              (prev) =>
                prev?.map((t) =>
                  validation.timeslotIds.includes(t.id) ? { ...t, state: 'approved' } : t,
                ) || prev,
            );
          } else if (validation.counterProposal) {
            setLocalTimeslots(
              (prev) =>
                prev?.map((t) =>
                  validation.timeslotIds.includes(t.id)
                    ? {
                        ...t,
                        state: 'counter_proposed',
                        ...(validation.counterProposal?.salleIds
                          ? { salleIds: validation.counterProposal.salleIds }
                          : {}),
                        ...(validation.counterProposal?.classIds
                          ? { classIds: validation.counterProposal.classIds }
                          : {}),
                        ...(validation.counterProposal?.startDate
                          ? { proposedStartDate: validation.counterProposal.startDate }
                          : {}),
                        ...(validation.counterProposal?.endDate
                          ? { proposedEndDate: validation.counterProposal.endDate }
                          : {}),
                        ...(validation.counterProposal?.timeslotDate
                          ? { proposedTimeslotDate: validation.counterProposal.timeslotDate }
                          : {}),
                        ...(validation.counterProposal?.notes
                          ? { proposedNotes: validation.counterProposal.notes }
                          : {}),
                      }
                    : t,
                ) || prev,
            );
          } else {
            // plain reject
            setLocalTimeslots(
              (prev) =>
                prev?.map((t) =>
                  validation.timeslotIds.includes(t.id) ? { ...t, state: 'rejected' } : t,
                ) || prev,
            );
          }
        }

        const response = await fetch('/api/timeslots', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validation),
        });

        if (!response.ok) throw new Error('Failed to validate timeslots');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [localTimeslots],
  );

  return {
    loading,
    error,
    localTimeslots,
    getTimeslots,
    proposeTimeslots,
    approveTimeslots,
  };
}
