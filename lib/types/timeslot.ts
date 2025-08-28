export interface Timeslot {
  id: number;
  eventId: number;
  discipline: string;
  state: string;
  startDate: string;
  endDate: string;
  timeslotDate?: string | null;
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
  proposedTimeslotDate?: string | null;
  notes?: string | null;
  salleIds?: number[]; // multi-salles
  classIds?: number[]; // multi-classes
  salle?: { id: number; name: string } | null;
}
