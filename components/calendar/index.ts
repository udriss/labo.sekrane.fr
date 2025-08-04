// Export de tous les composants calendrier pour faciliter les imports
export { default as WeeklyView } from './WeeklyView'
export { default as EventsList } from './EventsList'
export { default as EventDetailsDialog } from './EventDetailsDialog'
export { default as DailyCalendarView } from './DailyCalendarView'
export { default as EditEventDialogPhysics } from './EditEventDialogPhysics'
export { default as EventDetailsDialogPhysics } from './EventDetailsDialogPhysics'

// components/calendar/
// ├── index.ts                   # Export centralisé
// ├── WeeklyView.tsx             # Vue hebdomadaire
// ├── EventsList.tsx             # Liste des événements
// └── EventDetailsDialog.tsx     # Dialogue de détails
// └── DailyCalendarView.tsx       # Vue calendrier quotidienne