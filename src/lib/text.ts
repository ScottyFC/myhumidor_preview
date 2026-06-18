const MOJIBAKE: [string, string][] = [
  ['‚Äô', '’'], ['‚Äì', '–'], ['‚Äî', '—'], ['‚Äú', '“'], ['‚Äù', '”'], ['‚Ä¶', '…'],
  [',Äô', '’'], [',Äì', '–'], [',Äî', '—'], [',Äú', '“'], [',Äù', '”'], [',Ä¶', '…'],
  ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€\u009d', '”'], ['â€”', '—'], ['â€“', '–'], ['â€¦', '…'],
  ['Ã©', 'é'], ['Ã±', 'ñ'], ['Ã¡', 'á'], ['Ã³', 'ó'], ['Ã­', 'í'], ['Ã¼', 'ü'], ['Ã¶', 'ö'], ['Ã‘', 'Ñ'], ['Ã¨', 'è'],
];

/** Repair common UTF-8 / Mac-Roman mojibake (e.g. "Brian,Äôs" → "Brian’s"). */
export function fixMojibake(input?: string | null): string {
  let o = input ?? '';
  for (const [a, b] of MOJIBAKE) if (o.includes(a)) o = o.split(a).join(b);
  return o;
}
