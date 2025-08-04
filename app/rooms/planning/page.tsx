// app/rooms/planning/page.tsx
// Page pour le planning des salles

import { Metadata } from 'next'
import RoomPlanningView from '@/components/rooms/RoomPlanningView'

export const metadata: Metadata = {
  title: 'Planning des Salles - Laboratoire',
  description: 'Planification et gestion des salles de laboratoire',
}

export default function RoomPlanningPage() {
  return <RoomPlanningView />
}
