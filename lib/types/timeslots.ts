export type TimeslotState =
  | 'created'
  | 'modified'
  | 'deleted'
  | 'invalidated'
  | 'approved'
  | 'rejected'
  | 'restored'
  | 'counter_proposed';

export interface TimeslotData {
  id: number;
  eventId: number;
  discipline: string;
  userId?: number | null;
  eventOwner?: number | null;
  timeslotParent?: number | null;
  state: TimeslotState;
  startDate: string;
  endDate: string;
  timeslotDate?: string | null;
  // Proposed alternative schedule kept while state=counter_proposed
  proposedStartDate?: string | null;
  proposedEndDate?: string | null;
  proposedTimeslotDate?: string | null;
  proposedNotes?: string | null;
  salleIds?: number[]; // multi-salles
  classIds?: number[]; // multi-classes
}

export interface TimeslotProposal {
  eventId: number;
  discipline: string;
  slots: Array<
    Pick<
      TimeslotData,
      'startDate' | 'endDate' | 'timeslotDate' | 'proposedNotes' | 'salleIds' | 'classIds'
    >
  >;
}

export interface TimeslotValidation {
  timeslotIds: number[];
  approve: boolean;
  notes?: string;
  counterProposal?: {
    startDate?: string;
    endDate?: string;
    timeslotDate?: string;
    salleIds?: number[];
    classIds?: number[];
    notes?: string;
  };
}
