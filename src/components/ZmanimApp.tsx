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
  { key: 'alotHaShachar',  label: 'Alot HaShachar',      heLabel: 'עלות השחר',        category: 'dawn' },
  { key: 'misheyakir',     label: 'Misheyakir',           heLabel: 'משיכיר',           category: 'dawn' },
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
  const [tab, setTab] = useState<'today' | 'explore'>('today');
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
          <div className="flex gap-4">
            <button onClick={() => setTab('today')} className={`text-sm font-medium transition-colors ${tab === 'today' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>Zmanim</button>
            <button onClick={() => setTab('explore')} className={`text-sm font-medium transition-colors ${tab === 'explore' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>Explore</button>
          </div>
          <div className="flex items-center gap-3">
            {tab === 'today' && (
              <input
                type="date"
                value={selectedDate}
                onChange={e => onDateChange(e.target.value)}
                className="bg-white/5 border border-white/10 text-white/60 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-white/30 [color-scheme:dark]"
              />
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {tab === 'today' ? (
            <div className="space-y-0.5">
              {sorted.map(z => {
                const isPast = isToday && z.time!.getTime() <= nowMs;
                const isNext = z.key === nextKey;
                const msLeft = z.time!.getTime() - nowMs;
                return (
                  <div
                    key={z.key}
                    className={`flex items-center justify-between py-3 px-3 rounded-xl transition-colors ${
                      isNext ? 'bg-white/5' : ''
                    }`}
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
          ) : (
            <ZmanimExplore location={location} />
          )}
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

  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const [hh, mm, ss] = timeStr.split(':');

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
  });

  // Split zmanim into left (dawn/morning) and right (afternoon/evening/night) columns
  const leftZmanim  = sorted.filter(z => ['dawn','morning'].includes(z.category));
  const rightZmanim = sorted.filter(z => ['afternoon','evening','night'].includes(z.category));

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-5 right-5 text-white/20 hover:text-white/50 transition-colors z-10"
        aria-label="Exit fullscreen"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9L3 3m0 0l6 0M3 3v6M15 9l6-6m0 0l-6 0m6 0v6M9 15l-6 6m0 0l6 0m-6 0v-6M15 15l6 6m0 0l-6 0m6 0v-6" />
        </svg>
      </button>

      {/* Location top-center */}
      <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/15 text-xs tracking-widest uppercase">{location.label}</p>

      {/* Main layout: left zmanim | clock | right zmanim */}
      <div className="flex-1 flex items-center justify-center gap-0">

        {/* Left column — dawn/morning */}
        <div className="flex-1 flex flex-col items-end pr-8 gap-3 max-w-[200px]">
          {leftZmanim.map(z => {
            const isPast = z.time && z.time.getTime() <= nowMs;
            const isNext = z.key === nextZman?.key;
            return (
              <div key={z.key} className={`text-right transition-opacity ${isPast && !isNext ? 'opacity-15' : isNext ? 'opacity-100' : 'opacity-40'}`}>
                <p className={`text-xs font-mono tabular-nums ${isNext ? 'text-white' : 'text-white/60'}`}>{fmt(z.time, tz)}</p>
                <p className={`text-xs mt-0.5 ${isNext ? 'text-white/60' : 'text-white/25'}`}>{z.heLabel}</p>
              </div>
            );
          })}
        </div>

        {/* Center clock */}
        <div className="flex flex-col items-center gap-2 px-4">
          <div className="flex items-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span className="text-[clamp(72px,16vw,160px)] font-thin leading-none tracking-tighter text-white">{hh}</span>
            <span className="text-[clamp(72px,16vw,160px)] font-thin leading-none tracking-tighter text-white/15 mx-1">:</span>
            <span className="text-[clamp(72px,16vw,160px)] font-thin leading-none tracking-tighter text-white">{mm}</span>
            <span className="text-[clamp(22px,4vw,40px)] font-thin leading-none tracking-tighter text-white/15 mb-4 ml-2">:{ss}</span>
          </div>
          <p className="text-white/20 text-sm font-light tracking-wide">{dateStr}</p>
          {hebrewDate && <p className="text-white/15 text-xs">{hebrewDate}{parsha ? ` · ${parsha}` : ''}</p>}
          {nextZman && (
            <div className="mt-3 text-center">
              <p className="text-white/20 text-xs">{nextZman.heLabel} · {fmt(nextZman.time, tz)}</p>
              <p className="text-white/15 text-xs font-mono">{countdown(nextZman.time!.getTime() - nowMs)}</p>
            </div>
          )}
          {/* Day bar */}
          <div className="w-56 mt-4">
            <DayBar zmanim={zmanim} now={now} tz={tz} />
          </div>
        </div>

        {/* Right column — afternoon/evening/night */}
        <div className="flex-1 flex flex-col items-start pl-8 gap-3 max-w-[200px]">
          {rightZmanim.map(z => {
            const isPast = z.time && z.time.getTime() <= nowMs;
            const isNext = z.key === nextZman?.key;
            return (
              <div key={z.key} className={`transition-opacity ${isPast && !isNext ? 'opacity-15' : isNext ? 'opacity-100' : 'opacity-40'}`}>
                <p className={`text-xs font-mono tabular-nums ${isNext ? 'text-white' : 'text-white/60'}`}>{fmt(z.time, tz)}</p>
                <p className={`text-xs mt-0.5 ${isNext ? 'text-white/60' : 'text-white/25'}`}>{z.heLabel}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function ZmanimApp() {
  const [now, setNow]             = useState(new Date());
  const [location, setLocation]   = useState<LocationInfo>(PRESET_LOCATIONS[0]);
  const [zmanim, setZmanim]       = useState<ZmanItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [locating, setLocating]   = useState(false);
  const [hebrewDate, setHebrewDate] = useState('');
  const [parsha, setParsha]       = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const [tzRes, geoRes] = await Promise.all([
          fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`).then(r => r.json()),
        ]);
        const tzid  = tzRes.timeZone || 'UTC';
        const label = geoRes.address?.city || geoRes.address?.town || 'My Location';
        setLocation({ lat, lng, tzid, label });
        setShowLocPicker(false);
      } finally { setLocating(false); }
    }, () => setLocating(false));
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

  if (fullscreen) {
    return (
      <FullscreenClock
        now={now} zmanim={zmanim} tz={location.tzid}
        hebrewDate={hebrewDate} parsha={parsha}
        location={location} onExit={() => setFullscreen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center select-none" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Top bar */}
      <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-5">
        {/* Location pill */}
        <button
          onClick={() => setShowLocPicker(v => !v)}
          className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors text-xs tracking-wide"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {location.label}
        </button>

        {/* Fullscreen button */}
        <button
          onClick={() => setFullscreen(true)}
          className="text-white/20 hover:text-white/50 transition-colors"
          aria-label="Fullscreen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
          </svg>
        </button>
      </div>

      {/* Location picker dropdown */}
      {showLocPicker && (
        <div className="absolute top-14 left-5 z-40 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl p-3 min-w-[220px]">
          {PRESET_LOCATIONS.map(loc => (
            <button
              key={loc.label}
              onClick={() => { setLocation(loc); setShowLocPicker(false); }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                loc.label === location.label ? 'text-white bg-white/8' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {loc.label}
            </button>
          ))}
          <div className="border-t border-white/5 mt-2 pt-2">
            <button
              onClick={handleGeolocate}
              disabled={locating}
              className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              {locating ? 'Locating…' : 'Use my location'}
            </button>
          </div>
        </div>
      )}

      {/* Main clock */}
      <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowPanel(true)}>
        {/* Digital time */}
        <div className="flex items-end gap-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span className="text-[clamp(64px,15vw,120px)] font-thin leading-none tracking-tighter text-white">{hh}</span>
          <span className="text-[clamp(64px,15vw,120px)] font-thin leading-none tracking-tighter text-white/20 mx-0.5">:</span>
          <span className="text-[clamp(64px,15vw,120px)] font-thin leading-none tracking-tighter text-white">{mm}</span>
          <span className="text-[clamp(20px,4vw,36px)] font-thin leading-none tracking-tighter text-white/20 mb-3 ml-2">:{ss}</span>
        </div>

        {/* Date + Hebrew */}
        <div className="text-center mt-1 space-y-0.5">
          <p className="text-white/25 text-sm font-light tracking-wide">{dateStr}</p>
          {hebrewDate && <p className="text-white/20 text-xs">{hebrewDate}{parsha ? ` · ${parsha}` : ''}</p>}
        </div>

        {/* Day progress bar */}
        {!loading && zmanim.length > 0 && (
          <div className="w-64 mt-6">
            <DayBar zmanim={zmanim} now={now} tz={location.tzid} />
          </div>
        )}

        {/* Next / Prev zman */}
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

        {/* Tap hint */}
        <p className="mt-8 text-white/10 text-xs tracking-widest uppercase">tap for all zmanim</p>
      </div>

      {/* Detail panel */}
      {showPanel && (
        <ZmanimPanel
          zmanim={zmanim}
          now={now}
          tz={location.tzid}
          onClose={() => setShowPanel(false)}
          location={location}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}
    </div>
  );
}
