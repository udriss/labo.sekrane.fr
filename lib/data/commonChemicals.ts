// /lib/data/commonChemicals.ts

import data from '@/data/common-chemicals.json';

export interface CommonChemical {
  name: string;
  formula?: string;
  casNumber?: string;
  aliases?: string[];
  category?: string;
  hazardClass?: string;
  molarMass?: number;
  density?: number;
  boilingPointC?: number; // °C
  meltingPointC?: number; // °C
}

interface RawData {
  chemicals: CommonChemical[];
}

const raw = data as RawData;

// Normalize formula to LaTeX inline for UI consistency when data file contains Unicode subs/supers
const subMap: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};
const supMap: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};
const toLatex = (formula?: string) => {
  if (!formula) return formula;
  if (formula.includes('_{') || formula.includes('^{') || formula.includes('\\')) return formula;
  let out = '';
  for (const ch of formula) {
    if (subMap[ch]) out += `_{${subMap[ch]}}`;
    else if (supMap[ch]) out += `^{${supMap[ch]}}`;
    else if (ch === '·' || ch === '⋅') out += ' \\cdot ';
    else out += ch;
  }
  return out;
};

export const commonChemicals: CommonChemical[] = raw.chemicals.map((c) => ({
  ...c,
  formula: toLatex(c.formula),
}));

export function searchCommonChemicals(query: string): CommonChemical[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return commonChemicals
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.formula && c.formula.toLowerCase().includes(q)) ||
        (c.casNumber && c.casNumber.toLowerCase().includes(q)) ||
        (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(q))),
    )
    .slice(0, 25);
}

export function findCommonChemicalByCas(cas: string) {
  const v = cas.trim();
  return commonChemicals.find((c) => c.casNumber === v);
}
