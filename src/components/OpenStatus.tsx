'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Dominant IANA timezone per US state, so "open now" reflects the venue's local
// time rather than the viewer's. Falls back to the viewer's local time if unknown.
const STATE_TZ: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York',
  DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis', IA: 'America/Chicago',
  KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago',
  NV: 'America/Los_Angeles', NH: 'America/New_York', NJ: 'America/New_York', NM: 'America/Denver',
  NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  UT: 'America/Denver', VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};

/** Parse "1:00PM", "1 pm", "13:00", "9", "9:30am" → minutes from midnight, or null. */
function parseTime(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3].toLowerCase().replace(/\./g, '') : '';
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Parse a day's hours string → [openMin, closeMin] | 'closed' | null (unknown). */
function parseRange(v?: string): [number, number] | 'closed' | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  if (/closed/i.test(t)) return 'closed';
  if (/24\s*h(ou)?rs?|all day|open 24/i.test(t)) return [0, 1440];
  const parts = t.split(/\s*(?:–|—|-|to)\s*/i).filter(Boolean);
  if (parts.length !== 2) return null;
  const o = parseTime(parts[0]);
  const c = parseTime(parts[1]);
  if (o == null || c == null) return null;
  return [o, c];
}

/** Now (weekday index + minutes-of-day) in a given IANA timezone. */
function nowInTz(tz?: string): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  let hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  if (hour === 24) hour = 0; // some environments emit 24 at midnight
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return { day: WEEK.indexOf(wd as (typeof WEEK)[number]) , minutes: hour * 60 + minute };
}

export function OpenStatus({ hoursJson, state }: { hoursJson?: Record<string, string>; state?: string }) {
  const [status, setStatus] = useState<'open' | 'closed' | null>(null);

  useEffect(() => {
    if (!hoursJson || !Object.values(hoursJson).some(Boolean)) { setStatus(null); return; }
    const tz = state ? STATE_TZ[state.trim().toUpperCase()] : undefined;

    function evaluate() {
      const { day, minutes } = nowInTz(tz);
      const todayKey = WEEK[day]; // 'Mon'..'Sun'
      const yesterdayKey = WEEK[(day + 6) % 7];

      // Open if within today's range, OR within yesterday's overnight range that
      // spills past midnight (e.g. Fri 6pm–2am covers early Sat morning).
      const today = parseRange(hoursJson![todayKey]);
      if (today && today !== 'closed') {
        const [o, c] = today;
        if (c > o ? minutes >= o && minutes < c : minutes >= o || minutes < c) { setStatus('open'); return; }
      }
      const yest = parseRange(hoursJson![yesterdayKey]);
      if (yest && yest !== 'closed') {
        const [o, c] = yest;
        if (c <= o && minutes < c) { setStatus('open'); return; } // overnight spill
      }
      // Only assert "closed" when today's entry is parseable (known). Otherwise hide.
      setStatus(today === null ? null : 'closed');
    }

    evaluate();
    const id = setInterval(evaluate, 60_000); // refresh each minute
    return () => clearInterval(id);
  }, [hoursJson, state]);

  if (!status) return null;

  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider ' +
        (status === 'open'
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-red-500/10 text-red-300 ring-1 ring-red-500/25')
      }
    >
      <Clock size={11} strokeWidth={2} /> {status === 'open' ? 'Open now' : 'Closed'}
    </span>
  );
}
