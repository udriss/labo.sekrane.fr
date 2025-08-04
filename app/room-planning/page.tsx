import { Metadata } from 'next'
import RoomPlanningView from '@/components/rooms/RoomPlanningView'

export const metadata: Metadata = {
  title: 'Planification des Salles | Laboratoire',
  description: 'Interface de planification et de gestion des salles du laboratoire',
}

export default function RoomPlanningPage() {
  return <RoomPlanningView />
}
