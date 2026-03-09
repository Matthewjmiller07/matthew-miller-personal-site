import { useState, useEffect, useCallback, useRef } from 'react';
import ZmanimExplore from './ZmanimExplore';

// ── Types ────────────────────────────────────────────────────────────────────

interface ZmanItem {
  key: string;
  label: string;
  heLabel: string;
  time: Date | null;
  category: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
}

interface LocationInfo {
  lat: number;
  lng: number;
  tzid: string;
  label: string;
}

interface HebcalResponse {
  times: Record<string, string>;
  date: string;
  location: { latitude: number; longitude: number; tzid: string };
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ZMAN_DEFS: { key: string; label: string; heLabel: string; category: ZmanItem['category'] }[] = [
  { key: 'alotHaShachar',       label: 'Alot HaShachar',        heLabel: 'עלות השחר',       category: 'dawn' },
  { key: 'misheyakir',           label: 'Misheyakir',            heLabel: 'משיכיר',          category: 'dawn' },
  { key: 'misheyakirMachmir',    label: 'Misheyakir Machmir',    heLabel: 'משיכיר מחמיר',    category: 'dawn' },
  { key: 'sunrise',        label: 'Sunrise',              heLabel: 'הנץ החמה',         category: 'morning' },
  { key: 'sofZmanShmaMGA', label: "Shema (MG\"A)",        heLabel: 'שמע מג"א',         category: 'morning' },
  { key: 'sofZmanShma',    label: "Shema (GR\"A)",        heLabel: 'שמע גר"א',         category: 'morning' },
  { key: 'sofZmanTfilaMGA',label: "Tefila (MG\"A)",       heLabel: 'תפילה מג"א',       category: 'morning' },
  { key: 'sofZmanTfila',   label: "Tefila (GR\"A)",       heLabel: 'תפילה גר"א',       category: 'morning' },
  { key: 'chatzot',        label: 'Chatzot',              heLabel: 'חצות',             category: 'afternoon' },
  { key: 'minchaGedola',   label: 'Mincha Gedola',        heLabel: 'מנחה גדולה',       category: 'afternoon' },
  { key: 'minchaKetana',   label: 'Mincha Ketana',        heLabel: 'מנחה קטנה',        category: 'afternoon' },
  { key: 'plagHaMincha',   label: 'Plag HaMincha',        heLabel: 'פלג המנחה',        category: 'afternoon' },
  { key: 'sunset',         label: 'Sunset',               heLabel: 'שקיעה',            category: 'evening' },
  { key: 'beinHaShmashos', label: 'Bein HaShmashot',      heLabel: 'בין השמשות',       category: 'evening' },
  { key: 'tzeit7083deg',   label: 'Tzeit',                heLabel: 'צאת הכוכבים',      category: 'night' },
  { key: 'chatzotNight',   label: 'Chatzot HaLayla',      heLabel: 'חצות הלילה',       category: 'night' },
];

const PRESET_LOCATIONS: LocationInfo[] = [
  { lat: 41.8781, lng: -87.6298,  tzid: 'America/Chicago',    label: 'Chicago, IL' },
  { lat: 40.7128, lng: -74.0060,  tzid: 'America/New_York',   label: 'New York, NY' },
  { lat: 31.7683, lng: 35.2137,   tzid: 'Asia/Jerusalem',     label: 'Jerusalem' },
  { lat: 34.0522, lng: -118.2437, tzid: 'America/Los_Angeles',label: 'Los Angeles, CA' },
  { lat: 51.5074, lng: -0.1278,   tzid: 'Europe/London',      label: 'London' },
  { lat: 25.7617, lng: -80.1918,  tzid: 'America/New_York',   label: 'Miami, FL' },
  { lat: 43.6532, lng: -79.3832,  tzid: 'America/Toronto',    label: 'Toronto' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date | null, tz: string, seconds = false): string {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    timeZone: tz,
    hour12: true,
  });
}

function countdown(ms: number): string {
  if (ms <= 0) return '';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sc}s`;
  return `${sc}s`;
}

function parseHebcalTimes(data: HebcalResponse): Record<string, Date | null> {
  const out: Record<string, Date | null> = {};
  if (!data?.times) return out;
  for (const [k, v] of Object.entries(data.times)) {
    try { out[k] = v ? new Date(v) : null; } catch { out[k] = null; }
  }
  return out;
}

// ── Day progress bar ─────────────────────────────────────────────────────────

function DayBar({ zmanim, now, tz }: { zmanim: ZmanItem[]; now: Date; tz: string }) {
  const [active, setActive] = useState<string | null>(null);
  const dawn  = zmanim.find(z => z.key === 'alotHaShachar')?.time;
  const night = zmanim.find(z => z.key === 'tzeit7083deg')?.time;
  if (!dawn || !night) return null;

  const total   = night.getTime() - dawn.getTime();
  const elapsed = Math.min(Math.max(now.getTime() - dawn.getTime(), 0), total);
  const pct     = (elapsed / total) * 100;
  const nowMs   = now.getTime();

  const markers = ZMAN_DEFS.map(z => {
    const item = zmanim.find(i => i.key === z.key);
    if (!item?.time) return null;
    const p = ((item.time.getTime() - dawn.getTime()) / total) * 100;
    if (p < 0 || p > 100) return null;
    const isKey = ['sunrise', 'chatzot', 'sunset'].includes(z.key);
    return { key: z.key, label: z.label, heLabel: z.heLabel, p, isKey, item };
  }).filter(Boolean) as { key: string; label: string; heLabel: string; p: number; isKey: boolean; item: ZmanItem }[];

  const activeMarker = markers.find(m => m.key === active);

  return (
    <div className="relative w-full" onClick={e => e.stopPropagation()}>
      {/* Tooltip */}
      {activeMarker && (
        <div
          className="absolute bottom-6 z-10 pointer-events-none"
          style={{
            left: `${activeMarker.p}%`,
            transform: `translateX(${activeMarker.p > 75 ? '-90%' : activeMarker.p < 25 ? '-10%' : '-50%'})`,
          }}
        >
          <div className="bg-[#111] border border-white/15 rounded-xl px-3 py-2 shadow-2xl text-center whitespace-nowrap">
            <p className="text-white text-xs font-medium">{activeMarker.label}</p>
            <p className="text-white/40 text-xs">{activeMarker.heLabel}</p>
            <p className="text-white/80 text-sm font-mono mt-1">{fmt(activeMarker.item.time, tz)}</p>
            {activeMarker.item.time && activeMarker.item.time.getTime() > nowMs ? (
              <p className="text-white/40 text-xs font-mono">in {countdown(activeMarker.item.time.getTime() - nowMs)}</p>
            ) : activeMarker.item.time ? (
              <p className="text-white/30 text-xs font-mono">{countdown(nowMs - activeMarker.item.time.getTime())} ago</p>
            ) : null}
          </div>
          {/* Arrow */}
          <div
            className="w-2 h-2 bg-[#111] border-r border-b border-white/15 rotate-45 mx-auto -mt-1"
            style={{ marginLeft: activeMarker.p > 75 ? 'calc(90% - 4px)' : activeMarker.p < 25 ? 'calc(10% - 4px)' : 'calc(50% - 4px)' }}
          />
        </div>
      )}

      {/* Track */}
      <div className="h-0.5 bg-white/5 rounded-full relative" style={{ overflow: 'visible' }}>
        {/* Elapsed fill */}
        <div
          className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />

        {/* Zman markers */}
        {markers.map(m => {
          const isPast = m.item.time && m.item.time.getTime() <= nowMs;
          const isActive = m.key === active;
          return (
            <button
              key={m.key}
              onClick={() => setActive(isActive ? null : m.key)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group focus:outline-none"
              style={{ left: `${m.p}%` }}
              aria-label={m.label}
            >
              {/* Hit area */}
              <span className="absolute inset-0 -m-3" />
              <span className={`block rounded-full transition-all duration-150 ${
                isActive
                  ? 'w-3 h-3 bg-white shadow-lg shadow-white/40'
                  : m.isKey
                    ? `w-2 h-2 ${isPast ? 'bg-white/30' : 'bg-white/60'} group-hover:bg-white/90 group-hover:scale-125`
                    : `w-1 h-1 ${isPast ? 'bg-white/10' : 'bg-white/25'} group-hover:bg-white/60 group-hover:scale-150`
              }`} />
            </button>
          );
        })}

        {/* Current time cursor */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-1000 pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}


// ── Zmanim Detail Panel ──────────────────────────────────────────────────────

function ZmanimPanel({
  zmanim, now, tz, onClose, location, selectedDate, onDateChange
}: {
  zmanim: ZmanItem[]; now: Date; tz: string; onClose: () => void; location: LocationInfo;
  selectedDate: string; onDateChange: (d: string) => void;
}) {
  const nowMs = now.getTime();
  const isToday = selectedDate === now.toLocaleDateString('en-CA', { timeZone: tz });
  const sorted = [...zmanim].filter(z => z.time).sort((a, b) => a.time!.getTime() - b.time!.getTime());
  const nextKey = isToday ? sorted.find(z => z.time!.getTime() > nowMs)?.key : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#0a0a0a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
          <p className="text-white text-sm font-medium">Zmanim</p>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-white/5 border border-white/10 text-white/60 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-white/30 [color-scheme:dark]"
            />
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-0.5">
            {sorted.map(z => {
              const isPast = isToday && z.time!.getTime() <= nowMs;
              const isNext = z.key === nextKey;
              const msLeft = z.time!.getTime() - nowMs;
              return (
                <div
                  key={z.key}
                  className={`flex items-center justify-between py-3 px-3 rounded-xl transition-colors ${isNext ? 'bg-white/5' : ''}`}
                >
                  <div>
                    <div className={`text-sm ${isPast && !isNext ? 'text-white/25' : 'text-white/80'}`}>{z.label}</div>
                    <div className={`text-xs mt-0.5 ${isPast && !isNext ? 'text-white/15' : 'text-white/30'}`}>{z.heLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono tabular-nums ${isNext ? 'text-white' : isPast ? 'text-white/25' : 'text-white/60'}`}>
                      {fmt(z.time, tz)}
                    </div>
                    {isNext && msLeft > 0 && (
                      <div className="text-xs text-white/40 font-mono">{countdown(msLeft)}</div>
                    )}
                    {isPast && !isNext && (
                      <div className="text-xs text-white/15 font-mono">{countdown(nowMs - z.time!.getTime())} ago</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fullscreen Zmanim Overlay ─────────────────────────────────────────────────

function FullscreenClock({
  now, zmanim, tz, hebrewDate, parsha, location, onExit
}: {
  now: Date; zmanim: ZmanItem[]; tz: string;
  hebrewDate: string; parsha: string; location: LocationInfo; onExit: () => void;
}) {
  const nowMs = now.getTime();
  const sorted = [...zmanim].filter(z => z.time).sort((a, b) => a.time!.getTime() - b.time!.getTime());
  const nextZman = sorted.find(z => z.time!.getTime() > nowMs);
  const prevZman = [...sorted].reverse().find(z => z.time!.getTime() <= nowMs);

  // Only show the key zmanim for a clean board display
  const BOARD_KEYS = [
    'alotHaShachar', 'misheyakir', 'sunrise',
    'sofZmanShmaMGA', 'sofZmanShma', 'sofZmanTfilla',
    'chatzot', 'minchaGedola', 'minchaKetana',
    'plagHaMincha', 'sunset', 'tzeit7083deg',
  ];
  const boardZmanim = BOARD_KEYS.map(k => sorted.find(z => z.key === k)).filter(Boolean) as ZmanItem[];

  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const [hh, mm, ss] = timeStr.split(':');

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
  });

  // Progress bar: dawn to nightfall
  const dawn  = zmanim.find(z => z.key === 'alotHaShachar')?.time;
  const night = zmanim.find(z => z.key === 'tzeit7083deg')?.time;
  const dayPct = dawn && night
    ? Math.min(100, Math.max(0, ((nowMs - dawn.getTime()) / (night.getTime() - dawn.getTime())) * 100))
    : null;

  return (
    <div
      className="flex flex-col select-none"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100dvh',
        zIndex: 9999,
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        background: 'radial-gradient(ellipse at 50% 0%, #0d0d14 0%, #080808 60%, #000 100%)',
        color: '#fff',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}
    >
      {/* Invisible exit zone — tap anywhere in top-right corner */}
      <button
        onClick={onExit}
        className="absolute top-0 right-0 w-16 h-16 z-20 opacity-0"
        aria-label="Exit fullscreen"
      />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-8 pb-0">
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {location.label}
        </p>
        {parsha && (
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.65rem', letterSpacing: '0.1em', maxWidth: '45%', textAlign: 'right' }}>
            {parsha}
          </p>
        )}
      </div>

      {/* ── CLOCK ── */}
      <div className="flex flex-col items-center justify-center pt-3 sm:pt-6 pb-1 sm:pb-2">
        <div className="flex items-end" style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          <span style={{ fontSize: 'clamp(64px, 20vw, 180px)', fontWeight: 100, letterSpacing: '-0.04em', color: '#fff' }}>{hh}</span>
          <span style={{ fontSize: 'clamp(64px, 20vw, 180px)', fontWeight: 100, color: 'rgba(255,255,255,0.12)', margin: '0 3px' }}>:</span>
          <span style={{ fontSize: 'clamp(64px, 20vw, 180px)', fontWeight: 100, letterSpacing: '-0.04em', color: '#fff' }}>{mm}</span>
          <span style={{ fontSize: 'clamp(20px, 4vw, 44px)', fontWeight: 100, color: 'rgba(255,255,255,0.18)', marginBottom: '10px', marginLeft: '6px' }}>:{ss}</span>
        </div>

        {/* Date + Hebrew date */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-1 sm:mt-2 px-4 text-center">
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 300, letterSpacing: '0.04em' }}>{dateStr}</p>
          {hebrewDate && (
            <>
              <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.8rem' }}>{hebrewDate}</p>
            </>
          )}
        </div>
      </div>

      {/* ── NEXT ZMAN HIGHLIGHT ── */}
      {nextZman && (
        <div className="flex flex-col items-center py-2 sm:py-4 px-4">
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '480px',
          }}>
            <div className="text-center">
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2px' }}>Next</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{nextZman.label}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>{nextZman.heLabel}</p>
            </div>
            <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
            <div className="text-center">
              <p style={{ color: '#fff', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', fontFamily: 'monospace', fontWeight: 300, letterSpacing: '0.05em' }}>{fmt(nextZman.time, tz)}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontFamily: 'monospace', marginTop: '2px' }}>
                in {countdown(nextZman.time!.getTime() - nowMs)}
              </p>
            </div>
            {prevZman && (
              <>
                <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                <div className="text-center">
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>Prev</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>{prevZman.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', fontFamily: 'monospace' }}>{fmt(prevZman.time, tz)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── DAY PROGRESS BAR ── */}
      {dayPct !== null && (
        <div className="px-12 py-1">
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'visible', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${dayPct}%`, background: 'rgba(255,255,255,0.25)', borderRadius: '2px', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      {/* ── ZMANIM GRID ── */}
      <div className="flex-1 grid px-4 sm:px-10 py-2 sm:py-4" style={{
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '2px 0',
        alignContent: 'start',
      }} data-grid-responsive>
        {boardZmanim.map(z => {
          const isPast = z.time && z.time.getTime() <= nowMs;
          const isNext = z.key === nextZman?.key;
          return (
            <div
              key={z.key}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                background: isNext ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: isNext ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                opacity: isPast && !isNext ? 0.2 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              <p style={{
                color: isNext ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
                fontSize: '0.65rem',
                letterSpacing: '0.08em',
                marginBottom: '3px',
                textTransform: 'uppercase',
              }}>{z.label}</p>
              <p style={{
                color: isNext ? '#fff' : isPast ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                fontSize: '1rem',
                fontFamily: 'monospace',
                fontWeight: isNext ? 400 : 300,
                letterSpacing: '0.04em',
              }}>{fmt(z.time, tz)}</p>
              <p style={{
                color: 'rgba(255,255,255,0.15)',
                fontSize: '0.6rem',
                marginTop: '1px',
              }}>{z.heLabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

function getInitialStateFromParams(): { location: LocationInfo; date: string; view: 'clock' | 'explore' } {
  if (typeof window === 'undefined') return { location: PRESET_LOCATIONS[0], date: '', view: 'clock' };
  const p = new URLSearchParams(window.location.search);
  const lat  = parseFloat(p.get('lat') ?? '');
  const lng  = parseFloat(p.get('lng') ?? '');
  const tzid = p.get('tzid') ?? '';
  const label = p.get('label') ?? '';
  const date  = p.get('date') ?? '';
  const view  = (p.get('view') === 'explore' ? 'explore' : 'clock') as 'clock' | 'explore';
  const location = (!isNaN(lat) && !isNaN(lng) && tzid)
    ? { lat, lng, tzid, label: label || `${lat.toFixed(3)}°, ${lng.toFixed(3)}°` }
    : PRESET_LOCATIONS[0];
  return { location, date, view };
}

export default function ZmanimApp() {
  const initParams = getInitialStateFromParams();
  const [now, setNow]             = useState(new Date());
  const [location, setLocation]   = useState<LocationInfo>(initParams.location);
  const [zmanim, setZmanim]       = useState<ZmanItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [locating, setLocating]   = useState(false);
  const [locSearch, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState<LocationInfo[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const [latInput, setLatInput]   = useState('');
  const [lngInput, setLngInput]   = useState('');
  const [locTab, setLocTab]       = useState<'search' | 'coords'>('search');
  const [locError, setLocError]   = useState('');
  const locSearchRef = useRef<HTMLDivElement>(null);
  const [hebrewDate, setHebrewDate] = useState('');
  const [parsha, setParsha]       = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initParams.date);
  const [view, setView] = useState<'clock' | 'explore'>(initParams.view);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync state → URL so the current view/location/date is always shareable
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams();
    p.set('lat',   location.lat.toString());
    p.set('lng',   location.lng.toString());
    p.set('tzid',  location.tzid);
    p.set('label', location.label);
    if (selectedDate) p.set('date', selectedDate);
    if (view !== 'clock') p.set('view', view);
    const newUrl = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [location, selectedDate, view]);

  const runLocSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setLocResults([]); return; }
    setLocSearching(true);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
      ).then(r => r.json());
      const results: LocationInfo[] = await Promise.all(
        (geoRes as any[]).slice(0, 5).map(async (r: any) => {
          const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
          let tzid = 'UTC';
          try {
            const tz = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`).then(r => r.json());
            tzid = tz.timeZone || 'UTC';
          } catch {}
          const city = r.address?.city || r.address?.town || r.address?.village;
          const state = r.address?.state;
          const country = r.address?.country;
          const label = city && state ? `${city}, ${state}` : city && country ? `${city}, ${country}` : r.display_name.split(',')[0];
          return { lat, lng, tzid, label };
        })
      );
      setLocResults(results);
    } catch { setLocResults([]); }
    finally { setLocSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runLocSearch(locSearch), 400);
    return () => clearTimeout(t);
  }, [locSearch, runLocSearch]);

  const applyLocation = (loc: LocationInfo) => {
    setLocation(loc);
    setShowLocPicker(false);
    setLocSearch('');
    setLocResults([]);
    setLatInput('');
    setLngInput('');
  };

  const applyCoords = async () => {
    const lat = parseFloat(latInput), lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    setLocating(true);
    try {
      const [tzRes, geoRes] = await Promise.all([
        fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`).then(r => r.json()),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`).then(r => r.json()),
      ]);
      const tzid = tzRes.timeZone || 'UTC';
      const city = geoRes.address?.city || geoRes.address?.town || geoRes.address?.village;
      const state = geoRes.address?.state;
      const country = geoRes.address?.country;
      const label = city && state ? `${city}, ${state}` : city && country ? `${city}, ${country}` : `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
      applyLocation({ lat, lng, tzid, label });
    } catch { applyLocation({ lat, lng, tzid: 'UTC', label: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°` }); }
    finally { setLocating(false); }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sync React state with actual browser fullscreen changes (e.g. Esc key)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Lock body scroll when in fullscreen (needed for iOS fallback)
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const enterFullscreen = () => {
    const el = rootRef.current;
    if (!el) { setFullscreen(true); return; }
    // Try native fullscreen API (desktop + Android Chrome)
    const reqFs = (el as any).requestFullscreen ||
                  (el as any).webkitRequestFullscreen ||
                  (el as any).mozRequestFullScreen;
    if (reqFs) {
      reqFs.call(el).catch(() => setFullscreen(true));
    } else {
      // iOS Safari fallback — pure React state
      setFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    const exitFs = (document as any).exitFullscreen ||
                   (document as any).webkitExitFullscreen ||
                   (document as any).mozCancelFullScreen;
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      exitFs?.call(document);
    }
    setFullscreen(false);
  };

  // Init selectedDate to today in location's tz once location is set
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: location.tzid });
    setSelectedDate(today);
  }, [location.tzid]);

  const fetchZmanim = useCallback(async (loc: LocationInfo, date: string) => {
    if (!date) return;
    setLoading(true);
    try {
      const [zmRes, hdRes] = await Promise.all([
        fetch(`/api/zmanim?lat=${loc.lat}&lng=${loc.lng}&tzid=${encodeURIComponent(loc.tzid)}&date=${date}`).then(r => r.json()),
        fetch(`https://www.hebcal.com/converter?cfg=json&date=${date}&g2h=1&strict=1`).then(r => r.json()),
      ]);
      const parsed = parseHebcalTimes(zmRes);
      setZmanim(ZMAN_DEFS.map(def => ({ ...def, time: parsed[def.key] ?? null })));
      if (hdRes.hebrew) setHebrewDate(hdRes.hebrew);
      if (hdRes.events?.length) setParsha(hdRes.events[0]);
      else setParsha('');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedDate) fetchZmanim(location, selectedDate);
  }, [location, selectedDate, fetchZmanim]);

  const handleGeolocate = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const [tzRes, geoRes] = await Promise.all([
            fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`).then(r => r.json()),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`).then(r => r.json()),
          ]);
          const tzid  = tzRes.timeZone || 'UTC';
          const city = geoRes.address?.city || geoRes.address?.town || geoRes.address?.village;
          const state = geoRes.address?.state || geoRes.address?.region;
          const country = geoRes.address?.country;
          let label = 'My Location';
          if (city && state) label = `${city}, ${state}`;
          else if (city && country) label = `${city}, ${country}`;
          else if (city) label = city;
          else if (country) label = country;
          applyLocation({ lat, lng, tzid, label });
        } catch {
          setLocError('Could not resolve location details.');
        } finally {
          setLocating(false);
        }
      },
      err => {
        const msgs: Record<number, string> = {
          1: 'Permission denied — enable location access in your browser.',
          2: 'Position unavailable.',
          3: 'Request timed out.',
        };
        setLocError(msgs[err.code] || 'Could not get your location.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const nowMs = now.getTime();
  const sorted = [...zmanim].filter(z => z.time).sort((a, b) => a.time!.getTime() - b.time!.getTime());
  const nextZman = sorted.find(z => z.time!.getTime() > nowMs);
  const prevZman = [...sorted].reverse().find(z => z.time!.getTime() <= nowMs);

  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: location.tzid, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const [hh, mm, ss] = timeStr.split(':');

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: location.tzid, weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div ref={rootRef} className="min-h-screen bg-black text-white flex flex-col items-center justify-center select-none" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Fullscreen clock overlay — rendered inside rootRef so requestFullscreen captures it */}
      {fullscreen && (
        <FullscreenClock
          now={now} zmanim={zmanim} tz={location.tzid}
          hebrewDate={hebrewDate} parsha={parsha}
          location={location} onExit={exitFullscreen}
        />
      )}

      {!fullscreen && (<>

      {/* Clock / Explore toggle — fixed bottom-center, clear of navbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur border border-white/10 rounded-full px-1 py-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setView('clock')}
          className={`text-xs px-4 py-1.5 rounded-full transition-all ${view === 'clock' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
        >Clock</button>
        <button
          onClick={() => setView('explore')}
          className={`text-xs px-4 py-1.5 rounded-full transition-all ${view === 'explore' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
        >Explore</button>
      </div>

      {/* ── LOCATION BAR (inline above clock) ── */}
      {view === 'clock' && (
        <div className="relative flex items-center justify-between w-full max-w-sm px-2 mb-2" onClick={e => e.stopPropagation()}>
          {/* Location pill */}
          <button
            onClick={() => setShowLocPicker(v => !v)}
            className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-xs tracking-wide px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-white/5 cursor-pointer"
          >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{location.label}</span>
          </button>

          {/* Dropdown */}
          {showLocPicker && (
          <div
            ref={locSearchRef}
            className="absolute top-full mt-2 left-0 z-[60] bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl p-4 w-[300px]"
            onClick={e => e.stopPropagation()}
          >
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setLocTab('search')}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                locTab === 'search' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >City Search</button>
            <button
              onClick={() => setLocTab('coords')}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                locTab === 'coords' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >Lat / Lng</button>
          </div>

          {locTab === 'search' && (
            <div className="space-y-2">
              {/* Search input */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-white/25 transition-colors">
                <svg className="w-3.5 h-3.5 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={locSearch}
                  onChange={e => setLocSearch(e.target.value)}
                  placeholder="Search any city…"
                  className="bg-transparent text-white text-xs flex-1 outline-none placeholder-white/20"
                />
                {locSearching && (
                  <svg className="w-3 h-3 text-white/30 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                )}
              </div>

              {/* Search results */}
              {locResults.length > 0 && (
                <div className="border border-white/8 rounded-xl overflow-hidden">
                  {locResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => applyLocation(r)}
                      className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between gap-2 border-b border-white/5 last:border-0"
                    >
                      <span>{r.label}</span>
                      <span className="text-white/20 font-mono shrink-0">{r.lat.toFixed(1)}°, {r.lng.toFixed(1)}°</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Presets */}
              {locResults.length === 0 && (
                <div className="space-y-0.5">
                  {PRESET_LOCATIONS.map(loc => (
                    <button
                      key={loc.label}
                      onClick={() => applyLocation(loc)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        loc.label === location.label ? 'text-white bg-white/8' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <span>{loc.label}</span>
                      {loc.label === location.label && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {locTab === 'coords' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/30 text-xs block mb-1">Latitude</label>
                  <input
                    type="number"
                    value={latInput}
                    onChange={e => setLatInput(e.target.value)}
                    placeholder="40.7128"
                    min="-90" max="90" step="0.0001"
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-white/30 placeholder-white/20 [appearance:textfield]"
                  />
                </div>
                <div>
                  <label className="text-white/30 text-xs block mb-1">Longitude</label>
                  <input
                    type="number"
                    value={lngInput}
                    onChange={e => setLngInput(e.target.value)}
                    placeholder="-74.0060"
                    min="-180" max="180" step="0.0001"
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-white/30 placeholder-white/20 [appearance:textfield]"
                  />
                </div>
              </div>
              <button
                onClick={applyCoords}
                disabled={locating || !latInput || !lngInput}
                className="w-full py-2 rounded-xl text-xs bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {locating ? 'Looking up…' : 'Set Location'}
              </button>
            </div>
          )}

          {/* GPS */}
          <div className="border-t border-white/5 mt-3 pt-3 space-y-1">
            <button
              onClick={handleGeolocate}
              disabled={locating}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              {locating ? 'Locating…' : 'Use my location'}
            </button>
            {locError && (
              <p className="text-red-400/70 text-xs px-3 leading-snug">{locError}</p>
            )}
          </div>
          </div>
          )}
        </div>
      )}

      {/* ── CLOCK VIEW ── */}
      {view === 'clock' && (<>
        {/* Fullscreen button */}
        <button
          onClick={e => { e.stopPropagation(); enterFullscreen(); }}
          className="fixed bottom-20 right-6 z-10 text-white/20 hover:text-white/50 transition-colors"
          aria-label="Fullscreen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
          </svg>
        </button>

        {/* Main clock */}
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowPanel(true)}>
          <div className="flex items-end gap-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span className="text-[clamp(64px,15vw,120px)] font-thin leading-none tracking-tighter text-white">{hh}</span>
            <span className="text-[clamp(64px,15vw,120px)] font-thin leading-none tracking-tighter text-white/20 mx-0.5">:</span>
            <span className="text-[clamp(64px,15vw,120px)] font-thin leading-none tracking-tighter text-white">{mm}</span>
            <span className="text-[clamp(20px,4vw,36px)] font-thin leading-none tracking-tighter text-white/20 mb-3 ml-2">:{ss}</span>
          </div>
          <div className="text-center mt-1 space-y-0.5">
            <p className="text-white/25 text-sm font-light tracking-wide">{dateStr}</p>
            {hebrewDate && <p className="text-white/20 text-xs">{hebrewDate}{parsha ? ` · ${parsha}` : ''}</p>}
          </div>
          {!loading && zmanim.length > 0 && (
            <div className="w-64 mt-6">
              <DayBar zmanim={zmanim} now={now} tz={location.tzid} />
            </div>
          )}
          {!loading && (
            <div className="mt-6 flex items-center gap-8 text-center">
              {prevZman && (
                <div className="opacity-40">
                  <p className="text-xs text-white/40 mb-0.5">{prevZman.heLabel}</p>
                  <p className="text-sm font-mono text-white/50">{fmt(prevZman.time, location.tzid)}</p>
                </div>
              )}
              {nextZman && (
                <div>
                  <p className="text-xs text-white/40 mb-0.5">{nextZman.heLabel}</p>
                  <p className="text-lg font-mono text-white/90">{fmt(nextZman.time, location.tzid)}</p>
                  <p className="text-xs text-white/30 font-mono mt-0.5">{countdown(nextZman.time!.getTime() - nowMs)}</p>
                </div>
              )}
            </div>
          )}
          <p className="mt-8 text-white/10 text-xs tracking-widest uppercase">tap for all zmanim</p>
        </div>

        {showPanel && (
          <ZmanimPanel
            zmanim={zmanim} now={now} tz={location.tzid}
            onClose={() => setShowPanel(false)}
            location={location}
            selectedDate={selectedDate} onDateChange={setSelectedDate}
          />
        )}
      </>)}

      {/* ── EXPLORE VIEW — full page ── */}
      {view === 'explore' && (
        <div className="w-full min-h-screen pt-16 pb-8 px-4 sm:px-8 overflow-y-auto" onClick={e => e.stopPropagation()}>
          <ZmanimExplore location={location} allLocations={PRESET_LOCATIONS} onLocationChange={setLocation} />
        </div>
      )}

      </>)}
    </div>
  );
}
