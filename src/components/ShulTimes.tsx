import { useState, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PrayerTime {
  time: string;
  service: string;
}

interface DaySchedule {
  day: string; // 0=Sun...6=Sat
  prayers: PrayerTime[];
}

// ── Weekly schedule scraped from adasyeshurun.com/calendar ───────────────────
// Weekday pattern (Mon-Thu), with Friday/Shabbos/Sunday variants
// Times reflect current season — update periodically as shkiya shifts

const WEEKDAY_SCHEDULE: PrayerTime[] = [
  { time: '6:15am', service: 'Shacharis' },
  { time: '6:45am', service: 'Shacharis' },
  { time: '7:15am', service: 'Shacharis' },
  { time: '8:00am', service: 'Shacharis' },
  { time: '12:32pm', service: 'Mincha Gedola' },
  { time: '1:30pm',  service: 'Mincha' },
  { time: '3:15pm',  service: 'Mincha' },
  { time: '~Shkiya', service: 'Mincha/Maariv (Shkiya)' },
  { time: '8:15pm',  service: 'Maariv' },
  { time: '9:30pm',  service: 'Maariv' },
  { time: '10:00pm', service: 'Maariv' },
];

const SUNDAY_SCHEDULE: PrayerTime[] = [
  { time: '6:45am', service: 'Shacharis' },
  { time: '7:15am', service: 'Shacharis' },
  { time: '8:00am', service: 'Shacharis' },
  { time: '9:00am', service: 'Shacharis' },
  { time: '12:33pm', service: 'Mincha Gedola' },
  { time: '1:30pm',  service: 'Mincha' },
  { time: '3:15pm',  service: 'Mincha' },
  { time: '~Shkiya', service: 'Mincha/Maariv (Shkiya)' },
  { time: '8:15pm',  service: 'Maariv' },
  { time: '9:30pm',  service: 'Maariv' },
];

const FRIDAY_SCHEDULE: PrayerTime[] = [
  { time: '6:15am', service: 'Shacharis' },
  { time: '6:45am', service: 'Shacharis' },
  { time: '7:15am', service: 'Shacharis' },
  { time: '8:00am', service: 'Shacharis' },
  { time: '12:32pm', service: 'Mincha Gedola' },
  { time: '~40m before sunset', service: 'Mincha / Kabbalas Shabbos' },
];

const SHABBOS_SCHEDULE: PrayerTime[] = [
  { time: '7:25am', service: 'Shacharis (Vasikin)' },
  { time: '8:30am', service: 'Shacharis' },
  { time: '8:45am', service: 'Shacharis' },
  { time: '2:00pm', service: 'Mincha' },
  { time: '~45m before sunset', service: 'Mincha' },
  { time: '~45m after sunset', service: 'Maariv / Havdalah' },
];

const DAY_SCHEDULES: Record<number, PrayerTime[]> = {
  0: SUNDAY_SCHEDULE,
  1: WEEKDAY_SCHEDULE,
  2: WEEKDAY_SCHEDULE,
  3: WEEKDAY_SCHEDULE,
  4: WEEKDAY_SCHEDULE,
  5: FRIDAY_SCHEDULE,
  6: SHABBOS_SCHEDULE,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbos'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeToDate(timeStr: string, tz: string): Date | null {
  if (timeStr.startsWith('~')) return null;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: tz });
  const match = timeStr.match(/^(\d+):(\d+)(am|pm)$/i);
  if (!match) return null;
  let [, h, m, ampm] = match;
  let hour = parseInt(h);
  const min = parseInt(m);
  if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
  if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
  const d = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
  // treat as local tz
  const local = new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const offset = d.getTime() - local.getTime();
  return new Date(d.getTime() + offset);
}

function fmt12(timeStr: string): string {
  if (timeStr.startsWith('~')) return timeStr;
  return timeStr;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ShulTimes({ tz, now }: { tz: string; now: Date }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(-1); // -1 = today

  const todayDow = new Date(
    now.toLocaleString('en-US', { timeZone: tz })
  ).getDay();

  const displayDow = selectedDay === -1 ? todayDow : selectedDay;
  const schedule = DAY_SCHEDULES[displayDow] ?? WEEKDAY_SCHEDULE;
  const nowMs = now.getTime();

  // Find next upcoming davening
  const withDates = schedule.map(p => ({
    ...p,
    date: parseTimeToDate(p.time, tz),
  }));
  const nextIdx = selectedDay === -1
    ? withDates.findIndex(p => p.date && p.date.getTime() > nowMs)
    : -1;

  const displayed = showAll ? schedule : schedule.slice(0, 6);

  // Service type → category for color
  const category = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes('shacharis') || l.includes('vasikin')) return 'morning';
    if (l.includes('mincha') || l.includes('kabbala')) return 'afternoon';
    if (l.includes('maariv') || l.includes('havdal')) return 'evening';
    return 'other';
  };

  const catColor = (cat: string) => {
    if (cat === 'morning')   return 'text-amber-300/80';
    if (cat === 'afternoon') return 'text-orange-300/80';
    if (cat === 'evening')   return 'text-violet-300/80';
    return 'text-white/50';
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/60 text-xs font-medium tracking-wide uppercase">Adas Yeshurun</p>
          <p className="text-white/20 text-xs">Davening Schedule</p>
        </div>
        <a
          href="https://www.adasyeshurun.com/calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/20 hover:text-white/50 transition-colors"
          title="View full calendar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Day selector pills */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {DAY_NAMES.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(i === todayDow && selectedDay === -1 ? -1 : i === todayDow ? -1 : i)}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all ${
              displayDow === i
                ? 'border-white/30 text-white bg-white/8'
                : 'border-white/8 text-white/25 hover:text-white/50 hover:border-white/15'
            } ${i === todayDow ? 'font-medium' : ''}`}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Prayer list */}
      <div className="space-y-0.5">
        {(showAll ? schedule : schedule.slice(0, 7)).map((p, i) => {
          const isNext = i === nextIdx;
          const isPast = selectedDay === -1 && withDates[i].date && withDates[i].date!.getTime() <= nowMs;
          const cat = category(p.service);

          return (
            <div
              key={i}
              className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors ${
                isNext ? 'bg-white/6' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  cat === 'morning' ? 'bg-amber-400/60' :
                  cat === 'afternoon' ? 'bg-orange-400/60' :
                  cat === 'evening' ? 'bg-violet-400/60' :
                  'bg-white/20'
                } ${isPast && !isNext ? 'opacity-30' : ''}`} />
                <span className={`text-xs ${isPast && !isNext ? 'text-white/20' : isNext ? 'text-white/90' : 'text-white/55'}`}>
                  {p.service}
                </span>
              </div>
              <span className={`text-xs font-mono tabular-nums ${
                isPast && !isNext ? 'text-white/15' : isNext ? 'text-white font-medium' : 'text-white/35'
              }`}>
                {p.time}
              </span>
            </div>
          );
        })}
      </div>

      {schedule.length > 7 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-2 w-full text-center text-white/20 hover:text-white/40 text-xs py-1 transition-colors"
        >
          {showAll ? 'Show less' : `+${schedule.length - 7} more`}
        </button>
      )}

      <p className="mt-3 text-white/10 text-xs text-center">
        Times approximate · verify at{' '}
        <a href="https://www.adasyeshurun.com/calendar" target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/30 transition-colors">
          adasyeshurun.com
        </a>
      </p>
    </div>
  );
}
