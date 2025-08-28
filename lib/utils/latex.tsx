import React from 'react';

// Parse a minimal LaTeX-like string handling _{...} and ^{...} markers to React nodes
export function parseLatexToReact(latex?: string): React.ReactNode[] {
  if (!latex) return [];
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < latex.length) {
    if ((latex[i] === '_' || latex[i] === '^') && latex[i + 1] === '{') {
      const isSub = latex[i] === '_';
      let j = i + 2;
      let depth = 1;
      while (j < latex.length && depth > 0) {
        if (latex[j] === '{') depth++;
        else if (latex[j] === '}') depth--;
        j++;
      }
      const content = latex.slice(i + 2, j - 1);
      out.push(
        isSub ? <sub key={out.length}>{content}</sub> : <sup key={out.length}>{content}</sup>,
      );
      i = j;
    } else {
      // If current char is a lone '_' or '^' (not followed by '{'), treat it literally and advance
      if (latex[i] === '_' || latex[i] === '^') {
        out.push(<span key={out.length}>{latex[i]}</span>);
        i += 1;
        continue;
      }
      // consume until next marker
      let j = i;
      while (j < latex.length && latex[j] !== '_' && latex[j] !== '^') j++;
      const text = latex.slice(i, j);
      if (text) out.push(<span key={out.length}>{text}</span>);
      i = j;
    }
  }
  return out;
}
