// lib/timeslots/index.ts
// Barrel file pour centraliser les exports timeslots

// Hook React pour l'API
export { useTimeslots, useEventTimeslots } from '@/hooks/useTimeslots'

// Fonctions utilitaires pures
export {
  createNewTimeSlot,
  updateTimeSlotWithTracking,
  checkAndSwapTimes,
  isEventOwner,
  convertApiTimeslotsToLocalSlots,
  convertLocalSlotsToProposals,
  validateTimeSlots,
  getActiveTimeSlots,
  hasPendingChanges,
  getDisplayTimeSlots,
  processEventEdition,
  type LocalTimeSlot
} from '@/lib/timeslots-utils'

// Types
export type {
  TimeslotData,
  TimeslotProposal,
  TimeslotValidation,
  TimeslotApiResponse,
  TimeslotType,
  Discipline,
  UseTimeslotsReturn
} from '@/types/timeslots'
