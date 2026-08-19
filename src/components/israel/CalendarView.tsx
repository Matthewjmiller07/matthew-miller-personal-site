import { useMemo, useState } from 'react';
import type { Minyan, Person, Place, Shabbat, Shul, Tefillah, Visit } from './types';
import { MEAL_LABEL, TEFILLAH_LABEL, describeAttendees, todayISO } from './lib';

interface Props {
  minyanim: Minyan[];
  shabbatot: Shabbat[];
  visits: Visit[];
  shuls: Shul[];
  places: Place[];
  people: Person[];
  canEdit: boolean;
  onAddMinyan: (date: string, tefillah: Tefillah) => void;
  onEditMinyan: (minyan: Minyan) => void;
  onAddShabbat: (date: string) => void;
  onEditShabbat: (shabbat: Shabbat) => void;
  onAddVisit: (date: string) => void;
  onEditVisit: (visit: Visit) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The three tefillot every day could plausibly have, in the order they happen. */
const DAY_SLOTS: { tefillah: Tefillah; short: string }[] = [
  { tefillah: 'shacharit', short: 'שח' },
  { tefillah: 'mincha', short: 'מנ' },
  { tefillah: 'arvit', short: 'ער' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const isSaturday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 6;
};

function formatDayHeading(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Whether a mincha/arvit slot is satisfied — a combined "mincha_arvit" entry covers both. */
function slotLogged(dayMinyanim: Minyan[], tefillah: Tefillah): boolean {
  if (tefillah === 'mincha') return dayMinyanim.some((m) => m.tefillah === 'mincha' || m.tefillah === 'mincha_arvit');
  if (tefillah === 'arvit') return dayMinyanim.some((m) => m.tefillah === 'arvit' || m.tefillah === 'mincha_arvit');
  return dayMinyanim.some((m) => m.tefillah === tefillah);
}

export default function CalendarView({
  minyanim,
  shabbatot,
  visits,
  shuls,
  places,
  people,
  canEdit,
  onAddMinyan,
  onEditMinyan,
  onAddShabbat,
  onEditShabbat,
  onAddVisit,
  onEditVisit,
}: Props) {
  const today = todayISO();
  const [todayY, todayM] = today.split('-').map(Number);
  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM - 1); // 0-indexed
  const [selected, setSelected] = useState(today);

  // Flagging a day as a "gap" only makes sense once there's something to gap
  // against — otherwise the whole calendar before this ever got used shows up as
  // a wall of red, which isn't a missing entry, it's just history that predates
  // tracking. Only dates on or after the earliest logged date count as trackable.
  const trackedSince = useMemo(() => {
    const dates = [
      ...minyanim.map((m) => m.date),
      ...shabbatot.map((s) => s.shabbat_date),
      ...visits.map((v) => v.date),
    ];
    // On a brand-new tracker with nothing logged yet, today is the earliest day
    // that could plausibly be "missing" — nothing before it should look like a gap.
    return dates.length ? dates.reduce((min, d) => (d < min ? d : min)) : today;
  }, [minyanim, shabbatot, visits, today]);
  const isTrackable = (iso: string) => iso >= trackedSince && iso <= today;

  const shulById = useMemo(() => new Map(shuls.map((s) => [s.id, s])), [shuls]);
  const placeByCode = useMemo(() => new Map(places.map((p) => [p.code, p])), [places]);
  const placeLabelFor = (code: string | null, fallback: string | null) => {
    if (code) {
      const place = placeByCode.get(code);
      if (place) return place.name_he;
    }
    return fallback ?? '—';
  };

  const minyanimByDate = useMemo(() => {
    const map = new Map<string, Minyan[]>();
    for (const m of minyanim) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    return map;
  }, [minyanim]);

  const shabbatByDate = useMemo(() => new Map(shabbatot.map((s) => [s.shabbat_date, s])), [shabbatot]);

  const visitsByDate = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const v of visits) map.set(v.date, [...(map.get(v.date) ?? []), v]);
    return map;
  }, [visits]);

  const changeMonth = (delta: number) => {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  };

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = firstOfMonth.getDay(); // 0=Sun
    const out: { iso: string | null; day: number | null; isSaturday: boolean }[] = [];
    for (let i = 0; i < leading; i++) out.push({ iso: null, day: null, isSaturday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toISO(viewYear, viewMonth, d);
      out.push({ iso, day: d, isSaturday: isSaturday(iso) });
    }
    while (out.length % 7 !== 0) out.push({ iso: null, day: null, isSaturday: false });
    return out;
  }, [viewYear, viewMonth]);

  const selectedMinyanim = (minyanimByDate.get(selected) ?? [])
    .slice()
    .sort((a, b) => (a.minyan_time ?? '99').localeCompare(b.minyan_time ?? '99'));
  const selectedShabbat = shabbatByDate.get(selected) ?? null;
  const selectedVisits = visitsByDate.get(selected) ?? [];
  const selectedIsSaturday = isSaturday(selected);
  const selectedIsPastOrToday = selected <= today;

  return (
    <div className="il-cal">
      <div className="il-cal-nav">
        <button type="button" className="il-btn il-btn-sm" onClick={() => changeMonth(-1)}>
          ‹
        </button>
        <span className="il-cal-title">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button type="button" className="il-btn il-btn-sm" onClick={() => changeMonth(1)}>
          ›
        </button>
        <button
          type="button"
          className="il-btn il-btn-sm"
          onClick={() => {
            setViewYear(todayY);
            setViewMonth(todayM - 1);
            setSelected(today);
          }}
        >
          Today
        </button>
      </div>

      <div className="il-cal-grid il-cal-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="il-cal-weekday">
            {w}
          </div>
        ))}
      </div>

      <div className="il-cal-grid">
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={i} className="il-cal-cell il-cal-cell-empty" />;
          const dayMinyanim = minyanimByDate.get(cell.iso) ?? [];
          const dayShabbat = cell.isSaturday ? shabbatByDate.get(cell.iso) : null;
          const dayVisits = visitsByDate.get(cell.iso) ?? [];
          const trackable = isTrackable(cell.iso);
          const isToday = cell.iso === today;

          const missingCount = trackable
            ? DAY_SLOTS.filter((s) => !slotLogged(dayMinyanim, s.tefillah)).length +
              (cell.isSaturday && !dayShabbat ? 1 : 0)
            : 0;
          const fullyEmpty =
            trackable && dayMinyanim.length === 0 && !dayShabbat && dayVisits.length === 0;

          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'il-cal-cell',
                cell.iso === selected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
                fullyEmpty ? 'is-gap' : '',
              ].join(' ').trim()}
              onClick={() => setSelected(cell.iso!)}
            >
              <span className="il-cal-daynum">{cell.day}</span>
              <span className="il-cal-slots">
                {DAY_SLOTS.map((s) => (
                  <span
                    key={s.tefillah}
                    className={`il-cal-dot ${
                      slotLogged(dayMinyanim, s.tefillah)
                        ? 'is-logged'
                        : trackable
                          ? 'is-missing'
                          : 'is-future'
                    }`}
                    title={`${TEFILLAH_LABEL[s.tefillah]}${slotLogged(dayMinyanim, s.tefillah) ? ' logged' : ' not logged'}`}
                  />
                ))}
                {cell.isSaturday && (
                  <span
                    className={`il-cal-shabbat-dot ${dayShabbat ? 'is-logged' : trackable ? 'is-missing' : 'is-future'}`}
                    title={dayShabbat ? 'Shabbat logged' : 'Shabbat not logged'}
                  >
                    ✡
                  </span>
                )}
              </span>
              {dayVisits.length > 0 && <span className="il-cal-visit-dot" title="Trip logged" />}
              {missingCount > 0 && <span className="il-cal-gap-badge">{missingCount}</span>}
            </button>
          );
        })}
      </div>

      <ul className="il-legend il-cal-legend">
        <li>
          <span className="il-cal-dot is-logged" /> logged
        </li>
        <li>
          <span className="il-cal-dot is-missing" /> missing — click the day to add it
        </li>
        <li>
          <span className="il-key il-key-gap" /> whole day empty
        </li>
      </ul>

      <div className="il-cal-detail">
        <h3 className="il-cal-detail-title">{formatDayHeading(selected)}</h3>

        <div className="il-cal-detail-slots">
          {DAY_SLOTS.map((s) => {
            const entries = dayMinyanimFor(selectedMinyanim, s.tefillah);
            if (entries.length > 0) {
              return (
                <div key={s.tefillah} className="il-cal-entry">
                  <span className="il-badge il-cal-entry-tag">{TEFILLAH_LABEL[s.tefillah]}</span>
                  {entries.map((m) => (
                    <span key={m.id} className="il-cal-entry-body">
                      <span dir="auto">
                        {m.shul_id ? (shulById.get(m.shul_id)?.name_he ?? 'Unknown shul') : m.shul_name}
                      </span>
                      {m.minyan_time && <span className="il-log-time"> {m.minyan_time.slice(0, 5)}</span>}
                      <span className="il-log-notes"> · {describeAttendees(m.attendees, people)}</span>
                      {canEdit && (
                        <button type="button" className="il-link" onClick={() => onEditMinyan(m)}>
                          Edit
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              );
            }
            return (
              <div key={s.tefillah} className="il-cal-entry il-cal-entry-empty">
                <span className="il-badge il-badge-muted">{TEFILLAH_LABEL[s.tefillah]}</span>
                {canEdit ? (
                  <button
                    type="button"
                    className="il-link"
                    onClick={() => onAddMinyan(selected, s.tefillah)}
                  >
                    + Log {TEFILLAH_LABEL[s.tefillah].toLowerCase()}
                  </button>
                ) : (
                  <span className="il-log-notes">not logged</span>
                )}
              </div>
            );
          })}
        </div>

        {selectedIsSaturday && (
          <div className="il-cal-entry">
            <span className="il-badge il-cal-entry-tag">Shabbat</span>
            {selectedShabbat ? (
              <span className="il-cal-entry-body">
                <span dir="auto">
                  {placeLabelFor(selectedShabbat.place_code, selectedShabbat.place_name)}
                </span>
                {selectedShabbat.away && <span className="il-log-tag"> away</span>}
                {selectedShabbat.meals.length > 0 && (
                  <span className="il-log-notes">
                    {' '}
                    · {selectedShabbat.meals.map((meal) => MEAL_LABEL[meal.meal]).join(', ')}
                  </span>
                )}
                {canEdit && (
                  <button type="button" className="il-link" onClick={() => onEditShabbat(selectedShabbat)}>
                    Edit
                  </button>
                )}
              </span>
            ) : canEdit ? (
              <button type="button" className="il-link" onClick={() => onAddShabbat(selected)}>
                + Log this Shabbat
              </button>
            ) : (
              <span className="il-log-notes">not logged</span>
            )}
          </div>
        )}

        {selectedVisits.length > 0 && (
          <div className="il-cal-entry">
            <span className="il-badge il-cal-entry-tag">Trips</span>
            {selectedVisits.map((v) => (
              <span key={v.id} className="il-cal-entry-body">
                <span dir="auto">{placeLabelFor(v.place_code, v.place_name)}</span>
                {v.title && <span className="il-log-notes" dir="auto"> · {v.title}</span>}
                {canEdit && (
                  <button type="button" className="il-link" onClick={() => onEditVisit(v)}>
                    Edit
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {canEdit && (
          <button type="button" className="il-btn il-btn-sm" onClick={() => onAddVisit(selected)}>
            + Log a trip on this day
          </button>
        )}

        {!selectedIsPastOrToday && (
          <p className="il-hint">This day hasn't happened yet — nothing counts as missing.</p>
        )}
      </div>
    </div>
  );
}

function dayMinyanimFor(dayMinyanim: Minyan[], tefillah: Tefillah): Minyan[] {
  if (tefillah === 'mincha') {
    return dayMinyanim.filter((m) => m.tefillah === 'mincha' || m.tefillah === 'mincha_arvit');
  }
  if (tefillah === 'arvit') {
    return dayMinyanim.filter((m) => m.tefillah === 'arvit' || m.tefillah === 'mincha_arvit');
  }
  return dayMinyanim.filter((m) => m.tefillah === tefillah);
}
