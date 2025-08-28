'use client';
import React from 'react';
import { SvgIcon, SvgIconProps, Box } from '@mui/material';

const base = (path: string, name: string) => {
  const Comp = (props: SvgIconProps) => (
    <SvgIcon viewBox="0 0 64 64" {...props} sx={{ fontSize: 28, ...props.sx }}>
      <path d="M32 2 2 32l30 30 30-30L32 2Z" fill="none" stroke="currentColor" strokeWidth={4} />
      <path d={path} fill="currentColor" />
    </SvgIcon>
  );
  Comp.displayName = name;
  return Comp;
};

export const GHS01 = base('M26 44h12L32 20l-6 24Z', 'GHS01');
export const GHS02 = base('M32 18c6 6 10 10 10 16s-4 10-10 10-10-4-10-10 4-10 10-16Z', 'GHS02');
export const GHS03 = base('M24 40h16l-8-20-8 20Z', 'GHS03');
export const GHS04 = base('M20 36c8-8 16-8 24 0l-12 12-12-12Z', 'GHS04');
export const GHS05 = base('M22 42h8l-4-16 8 16h8l-8-28-12 28Z', 'GHS05');
export const GHS06 = base('M24 40h16L40 24 32 18l-8 6 0 16Z', 'GHS06');
export const GHS07 = base('M32 18 20 40h24L32 18Z', 'GHS07');
export const GHS08 = base('M32 16 20 44h24L32 16Zm0 10 6 14H26l6-14Z', 'GHS08');
export const GHS09 = base('M24 42h16l-8-18-8 18Z', 'GHS09');

const map: Record<string, React.ComponentType<SvgIconProps>> = {
  explosive: GHS01,
  ghs01: GHS01,
  flammable: GHS02,
  inflammable: GHS02,
  ghs02: GHS02,
  oxidizer: GHS03,
  oxidising: GHS03,
  ghs03: GHS03,
  gas: GHS04,
  pressure: GHS04,
  ghs04: GHS04,
  corrosive: GHS05,
  ghs05: GHS05,
  toxic: GHS06,
  acute: GHS06,
  ghs06: GHS06,
  harmful: GHS07,
  irritant: GHS07,
  ghs07: GHS07,
  health: GHS08,
  carcinogen: GHS08,
  ghs08: GHS08,
  environmental: GHS09,
  environment: GHS09,
  ghs09: GHS09,
};

export function GhsIcon({ hazard, ...props }: { hazard?: string } & SvgIconProps) {
  if (!hazard) return null;
  const key = hazard.toLowerCase();
  const found = Object.keys(map).find((k) => key.includes(k));
  if (!found) return null;
  const Comp = map[found];
  return <Comp color="error" {...props} />;
}

export function GhsIconStack({ hazardClasses }: { hazardClasses?: string | string[] }) {
  if (!hazardClasses) return null;
  const arr = Array.isArray(hazardClasses) ? hazardClasses : [hazardClasses];
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {arr.map((h, i) => (
        <GhsIcon key={h + i} hazard={h} sx={{ fontSize: 26 }} />
      ))}
    </Box>
  );
}

export default GhsIcon;
