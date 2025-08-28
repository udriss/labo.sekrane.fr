import * as React from 'react';
import type { ReactElement } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HelpIcon from '@mui/icons-material/Help';

export type EventStatus =
  | 'created'
  | 'modified'
  | 'approved'
  | 'rejected'
  | 'counter_proposed'
  | string;

export interface StatusVisual {
  icon: ReactElement;
  color: string; // MUI palette key or hex
  label: string;
}

function make(el: any): ReactElement {
  return React.createElement(el, { fontSize: 'small' });
}

export function statusVisual(state: EventStatus): StatusVisual {
  switch (state) {
    case 'approved':
      return { icon: make(CheckCircleIcon), color: 'success.main', label: 'Validé' };
    case 'rejected':
      return { icon: make(CancelIcon), color: 'error.main', label: 'Refusé' };
    case 'counter_proposed':
      return { icon: make(SwapHorizIcon), color: 'warning.main', label: 'Contre-proposition' };
    case 'created':
    case 'modified':
      return { icon: make(HourglassEmptyIcon), color: 'info.main', label: 'En attente' };
    default:
      return { icon: make(HelpIcon), color: 'text.disabled', label: state || 'Inconnu' };
  }
}

export function eventTypeColor(event: {
  type?: string;
  discipline?: string;
  title?: string;
}): string {
  if (event.type) {
    if (
      event.type === 'LABORANTIN' ||
      event.type === 'LABORANTIN_CHIMIE' ||
      event.type === 'LABORANTIN_PHYSIQUE'
    )
      return '#ffe0b2';
    if (event.type === 'TP') return '#c5e1a5';
  }
  const lower = (event.title || '').toLowerCase();
  if (lower.includes('labor')) return '#ffe0b2';
  return event.discipline === 'physique' ? '#bbdefb' : '#c5e1a5';
}
