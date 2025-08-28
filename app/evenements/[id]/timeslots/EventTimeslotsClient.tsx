'use client';
import React, { useEffect, useState } from 'react';
import { Box, Chip } from '@mui/material';
import SlotDisplay, { SlotDisplaySlot } from '@/components/calendar/SlotDisplay';
import { useEntityNames } from '@/components/providers/EntityNamesProvider';
import { useSession } from 'next-auth/react';

export default function EventTimeslotsClient({
  slots: initialSlots,
  focusIds,
  eventId,
  canValidate,
  isOwner,
  ownerId,
}: {
  slots: SlotDisplaySlot[];
  focusIds: number[];
  eventId: number;
  canValidate?: boolean;
  isOwner?: boolean;
  ownerId?: number;
}) {
  // Use shared provider to map salle/class names like EventList
  const { salles: salleMap, classes: classMap } = useEntityNames();
  const { data: session } = useSession();

  // Local state for slots that can be updated dynamically
  const [slots, setSlots] = useState<SlotDisplaySlot[]>(initialSlots);
  const [loading, setLoading] = useState(false);

  // Update local state when initialSlots change (server-side updates)
  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  // Listen for event updates and refresh timeslots data
  useEffect(() => {
    const handleEventUpdate = async (event: CustomEvent) => {
      const { eventId: updatedEventId } = event.detail || {};
      if (updatedEventId !== eventId) return;

      try {
        setLoading(true);
        // Fetch updated timeslots for this event
        const response = await fetch(`/api/timeslots?event_id=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.timeslots) {
            setSlots(data.timeslots);
          }
        }
      } catch (error) {
        console.error('Failed to refresh timeslots:', error);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('event-update:end', handleEventUpdate as any);
    return () => {
      window.removeEventListener('event-update:end', handleEventUpdate as any);
    };
  }, [eventId]);

  // Callback to refresh data when slots are updated
  const handleSlotUpdate = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/timeslots?event_id=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.timeslots) {
          setSlots(data.timeslots);
        }
      }
    } catch (error) {
      console.error('Failed to refresh timeslots after slot update:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Callback for event updates
  const handleEventUpdate = React.useCallback(
    (updatedEventId: number) => {
      if (updatedEventId === eventId) {
        // Dispatch event to trigger other components updates
        window.dispatchEvent(
          new CustomEvent('event-update:end', { detail: { eventId: updatedEventId } }),
        );
      }
    },
    [eventId],
  );

  const focusSet = React.useMemo(() => new Set(focusIds || []), [focusIds]);

  const derivedIsOwner = React.useMemo(() => {
    if (typeof isOwner === 'boolean') return isOwner;
    const uid = Number(session?.user?.id || 0);
    return ownerId ? uid === Number(ownerId) : false;
  }, [isOwner, session?.user?.id, ownerId]);

  const derivedCanValidate = React.useMemo(() => {
    if (typeof canValidate === 'boolean') return canValidate;
    const role = String(session?.user?.role || '').toUpperCase();
    return role === 'LABORANTIN_PHYSIQUE' || role === 'LABORANTIN_CHIMIE' || role === 'ADMINLABO';
  }, [canValidate, session?.user?.role]);

  return (
    <Box sx={{ position: 'relative' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Chip label="Mise à jour..." color="primary" />
        </Box>
      )}
      <SlotDisplay
        slots={slots as any}
        groupByDate
        salleMap={salleMap as any}
        classMap={classMap as any}
        showAssignButtons={true}
        eventId={eventId}
        canValidate={derivedCanValidate}
        isOwner={derivedIsOwner}
        onSlotUpdate={handleSlotUpdate}
        onEventUpdate={handleEventUpdate}
        renderSlotExtras={(slot) => (
          <>
            {/* Anchor to allow scroll into view when needed */}
            <span id={`slot-${slot.id}`} style={{ display: 'none' }} />
            {focusSet.has(Number(slot.id)) && <Chip size="small" color="primary" label="Focus" />}
          </>
        )}
      />
    </Box>
  );
}
