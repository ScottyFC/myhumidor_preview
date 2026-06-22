/** Shared cigar-aging logic: how long a cigar has rested, when it's best to
 *  smoke, and how to store it. Premium-cigar storage norms (65–70% RH). */

export interface AgingInfo {
  months: number;
  ageLabel: string;     // "1y 2mo"
  status: string;       // short status label
  tone: string;         // tailwind text color for the status
  whenToSmoke: string;  // guidance on timing
  ready: boolean;       // in or past its prime window
  humidity: string;
  temperature: string;
  tip: string;
}

export function monthsSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44));
}

export function ageLabel(months: number): string {
  if (months < 1) return 'under a month';
  if (months < 12) return `${Math.round(months)} mo`;
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  return `${y}y${m ? ` ${m}mo` : ''}`;
}

// Standard premium-cigar storage. Kept brand-agnostic and conservative.
const HUMIDITY = '65–70% RH (aim for ~69%)';
const TEMPERATURE = '65–70°F (18–21°C)';

export function agingInfo(addedAtIso: string): AgingInfo {
  const months = monthsSince(addedAtIso);
  let status: string, tone: string, whenToSmoke: string, ready = false, tip: string;

  if (months < 1) {
    status = 'Just added';
    tone = 'text-smoke-400';
    whenToSmoke = 'Let it rest 2–3 months to settle after shipping before you judge it.';
    tip = 'Fresh arrivals can taste “off” for a few weeks — give it time to acclimate.';
  } else if (months < 3) {
    const left = Math.max(1, Math.round(3 - months));
    status = 'Resting';
    tone = 'text-smoke-300';
    whenToSmoke = `Best from about ${left} more month${left > 1 ? 's' : ''} on.`;
    tip = 'Rotate cigars occasionally so they age evenly.';
  } else if (months < 6) {
    status = 'Settling in';
    tone = 'text-ember-100';
    whenToSmoke = 'Ready to smoke now — flavors will keep rounding out.';
    ready = true;
    tip = 'Hold steady humidity; swings are harder on a cigar than a slightly-off set point.';
  } else if (months < 24) {
    status = 'In its prime window';
    tone = 'text-ember-200';
    whenToSmoke = 'Ready now — a great time to smoke it.';
    ready = true;
    tip = 'Keep it here and it’ll stay excellent for months.';
  } else if (months < 48) {
    status = 'Well-aged';
    tone = 'text-amber-300';
    whenToSmoke = 'Smoke within the next year or so to enjoy it at its peak.';
    ready = true;
    tip = 'Long-aged sticks are delicate — avoid humidity above ~70%.';
  } else {
    status = 'Past peak for most blends';
    tone = 'text-smoke-400';
    whenToSmoke = 'Most blends have peaked — enjoy it soon.';
    ready = true;
    tip = 'Some full-bodied, ligero-heavy cigars age longer; lighter blends fade first.';
  }

  return { months, ageLabel: ageLabel(months), status, tone, whenToSmoke, ready, humidity: HUMIDITY, temperature: TEMPERATURE, tip };
}
