import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

// GHS01 - Explosive
export function GHS01Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <circle cx="50" cy="40" r="8" fill="#000" />
      <polygon points="45,55 55,55 52,75 48,75" fill="#000" />
    </SvgIcon>
  );
}

// GHS02 - Flammable
export function GHS02Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <path
        d="M30,60 Q35,45 45,50 Q50,30 55,50 Q65,45 70,60 Q60,70 50,65 Q40,70 30,60"
        fill="#000"
      />
    </SvgIcon>
  );
}

// GHS03 - Oxidizing
export function GHS03Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#000" strokeWidth="6" />
      <path d="M50,30 L50,70 M30,50 L70,50" stroke="#000" strokeWidth="4" />
    </SvgIcon>
  );
}

// GHS04 - Compressed Gas
export function GHS04Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="#000" strokeWidth="6" />
    </SvgIcon>
  );
}

// GHS05 - Corrosive
export function GHS05Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <rect x="25" y="35" width="15" height="8" fill="#000" />
      <rect x="60" y="35" width="15" height="8" fill="#000" />
      <path
        d="M25,55 Q35,65 45,55 Q55,65 65,55 Q70,60 75,55"
        fill="none"
        stroke="#000"
        strokeWidth="4"
      />
    </SvgIcon>
  );
}

// GHS06 - Toxic
export function GHS06Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <circle cx="50" cy="40" r="15" fill="#000" />
      <path d="M35,60 Q42,50 50,55 Q58,50 65,60" fill="none" stroke="#000" strokeWidth="6" />
      <path d="M40,70 L60,70" stroke="#000" strokeWidth="4" />
    </SvgIcon>
  );
}

// GHS07 - Harmful/Irritant
export function GHS07Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <circle cx="50" cy="40" r="8" fill="#000" />
      <rect x="46" y="55" width="8" height="20" fill="#000" />
    </SvgIcon>
  );
}

// GHS08 - Health Hazard
export function GHS08Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <path d="M35,35 Q50,25 65,35 Q70,50 65,65 Q50,75 35,65 Q30,50 35,35" fill="#000" />
      <circle cx="50" cy="50" r="8" fill="#FFF" />
    </SvgIcon>
  );
}

// GHS09 - Environmental Hazard
export function GHS09Icon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 100 100">
      <polygon fill="#E30613" points="50,5 90,85 10,85" stroke="#000" strokeWidth="4" />
      <path d="M50,25 Q40,35 45,45 Q50,40 55,45 Q60,35 50,25" fill="#000" />
      <circle cx="35" cy="55" r="8" fill="#000" />
      <circle cx="65" cy="55" r="8" fill="#000" />
      <path d="M25,70 Q50,60 75,70" fill="none" stroke="#000" strokeWidth="4" />
    </SvgIcon>
  );
}

// Mapping des classes de danger aux icônes
export const GHS_ICONS = {
  Explosif: GHS01Icon,
  Inflammable: GHS02Icon,
  Comburant: GHS03Icon,
  'Gaz sous pression': GHS04Icon,
  Corrosif: GHS05Icon,
  Toxique: GHS06Icon,
  Nocif: GHS07Icon,
  Irritant: GHS07Icon,
  Sensibilisant: GHS07Icon,
  Cancérogène: GHS08Icon,
  Mutagène: GHS08Icon,
  'Toxique pour la reproduction': GHS08Icon,
  'Toxicité spécifique': GHS08Icon,
  "Dangereux pour l'environnement": GHS09Icon,
} as const;

export type HazardClass = keyof typeof GHS_ICONS;

export function getGHSIcon(hazardClass: string): React.ComponentType<SvgIconProps> | null {
  return GHS_ICONS[hazardClass as HazardClass] || null;
}
