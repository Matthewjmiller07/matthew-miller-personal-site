import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface LocationInfo {
  lat: number;
  lng: number;
  tzid: string;
  label: string;
}

interface MonthPoint {
  month: string;
  monthIdx: number;
  [key: string]: number | string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EXPLORE_ZMANIM = [
  { key: 'sunrise',      label: 'Sunrise',        heLabel: 'הנץ החמה' },
  { key: 'sofZmanShma',  label: 'Latest Shema',   heLabel: 'סוף זמן שמע' },
  { key: 'sofZmanTfila', label: 'Latest Tefila',  heLabel: 'סוף זמן תפילה' },
  { key: 'chatzot',      label: 'Chatzot',        heLabel: 'חצות' },
  { key: 'minchaKetana', label: 'Mincha Ketana',  heLabel: 'מנחה קטנה' },
  { key: 'plagHaMincha', label: 'Plag HaMincha',  heLabel: 'פלג המנחה' },
  { key: 'sunset',       label: 'Sunset',         heLabel: 'שקיעה' },
  { key: 'tzeit7083deg', label: 'Tzeit',          heLabel: 'צאת הכוכבים' },
];

const ALL_CITIES: LocationInfo[] = [
  { lat: 41.8781, lng: -87.6298,  tzid: 'America/Chicago',    label: 'Chicago' },
  { lat: 40.7128, lng: -74.0060,  tzid: 'America/New_York',   label: 'New York' },
  { lat: 31.7683, lng: 35.2137,   tzid: 'Asia/Jerusalem',     label: 'Jerusalem' },
  { lat: 34.0522, lng: -118.2437, tzid: 'America/Los_Angeles',label: 'Los Angeles' },
  { lat: 51.5074, lng: -0.1278,   tzid: 'Europe/London',      label: 'London' },
  { lat: 25.7617, lng: -80.1918,  tzid: 'America/New_York',   label: 'Miami' },
  { lat: 43.6532, lng: -79.3832,  tzid: 'America/Toronto',    label: 'Toronto' },
  { lat: 32.0853, lng: 34.7818,   tzid: 'Asia/Jerusalem',     label: 'Tel Aviv' },
  { lat: 48.8566, lng: 2.3522,    tzid: 'Europe/Paris',       label: 'Paris' },
  { lat: -33.8688,lng: 151.2093,  tzid: 'Australia/Sydney',   label: 'Sydney' },
];

const CITY_COLORS = [
  '#ffffff', '#a78bfa', '#34d399', '#f59e0b',
  '#60a5fa', '#f87171', '#fb923c', '#4ade80',
  '#e879f9', '#38bdf8',
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function minsToTimeStr(mins: number): string {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? 'am' : 'pm';
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

async function fetchZmanForDate(loc: LocationInfo, date: string, key: string): Promise<number> {
  const res = await fetch(`/api/zmanim?lat=${loc.lat}&lng=${loc.lng}&tzid=${encodeURIComponent(loc.tzid)}&date=${date}`);
  const data = await res.json();
  const t = data?.times?.[key];
  if (!t) return 0;
  const local = new Date(new Date(t).toLocaleString('en-US', { timeZone: loc.tzid }));
  return local.getHours() * 60 + local.getMinutes();
}

async function fetchDaylightForDate(loc: LocationInfo, date: string): Promise<number> {
  const res = await fetch(`/api/zmanim?lat=${loc.lat}&lng=${loc.lng}&tzid=${encodeURIComponent(loc.tzid)}&date=${date}`);
  const data = await res.json();
  const sr = data?.times?.sunrise, ss = data?.times?.sunset;
  if (!sr || !ss) return 0;
  return Math.round((new Date(ss).getTime() - new Date(sr).getTime()) / 60000);
}

function monthDates(year: number): string[] {
  return Array.from({ length: 12 }, (_, m) => new Date(year, m, 15).toISOString().slice(0, 10));
}

// ── Tooltip styles ───────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: '#111',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
};

function TimeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2 shadow-2xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="text-white font-mono">{minsToTimeStr(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DurTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2 shadow-2xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="text-white font-mono">{Math.floor(p.value / 60)}h {p.value % 60}m</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Year View ────────────────────────────────────────────────────────────

function YearView({ location }: { location: LocationInfo }) {
  const [zmanKey, setZmanKey] = useState('sunrise');
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(new Date().getFullYear());
    try {
      const mins = await Promise.all(dates.map(d => fetchZmanForDate(location, d, zmanKey)));
      setData(dates.map((_, i) => ({ month: MONTHS[i], monthIdx: i, value: mins[i] })));
    } finally { setLoading(false); }
  }, [location, zmanKey]);

  useEffect(() => { load(); }, [load]);

  const zdef = EXPLORE_ZMANIM.find(z => z.key === zmanKey);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white text-sm font-medium">{zdef?.label}</p>
          <p className="text-white/30 text-xs">{zdef?.heLabel} · {location.label} · {new Date().getFullYear()}</p>
        </div>
        <select
          value={zmanKey}
          onChange={e => setZmanKey(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {EXPLORE_ZMANIM.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="zmanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={minsToTimeStr}
              width={52}
            />
            <Tooltip content={<TimeTooltip />} />
            <Area
              type="monotone" dataKey="value" name={zdef?.label}
              stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}
              fill="url(#zmanGrad)" dot={{ r: 3, fill: '#fff', fillOpacity: 0.6 }}
              activeDot={{ r: 5, fill: '#fff', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {!loading && data.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['earliest', 'latest', 'range'] as const).map(stat => {
            const vals = data.map(d => d.value as number).filter(Boolean);
            const min = Math.min(...vals), max = Math.max(...vals);
            const minM = data.find(d => d.value === min), maxM = data.find(d => d.value === max);
            return (
              <div key={stat} className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
                <p className="text-white/30 text-xs mb-1 capitalize">{stat}</p>
                {stat === 'earliest' && <><p className="text-white text-sm font-mono">{minsToTimeStr(min)}</p><p className="text-white/30 text-xs">{minM?.month}</p></>}
                {stat === 'latest'   && <><p className="text-white text-sm font-mono">{minsToTimeStr(max)}</p><p className="text-white/30 text-xs">{maxM?.month}</p></>}
                {stat === 'range'    && <><p className="text-white text-sm font-mono">{Math.floor((max - min) / 60)}h {(max - min) % 60}m</p><p className="text-white/30 text-xs">variation</p></>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: City Compare ─────────────────────────────────────────────────────────

function CityCompare({ currentLocation }: { currentLocation: LocationInfo }) {
  const [zmanKey, setZmanKey]     = useState('sunrise');
  const [selected, setSelected]   = useState<string[]>([currentLocation.label, 'New York', 'Jerusalem']);
  const [data, setData]           = useState<MonthPoint[]>([]);
  const [loading, setLoading]     = useState(false);

  const toggleCity = (label: string) => {
    setSelected(prev =>
      prev.includes(label) ? (prev.length > 1 ? prev.filter(l => l !== label) : prev) : [...prev, label]
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(new Date().getFullYear());
    const cities = ALL_CITIES.filter(c => selected.includes(c.label));
    try {
      const results = await Promise.all(
        cities.map(city => Promise.all(dates.map(d => fetchZmanForDate(city, d, zmanKey))))
      );
      setData(dates.map((_, i) => {
        const pt: MonthPoint = { month: MONTHS[i], monthIdx: i };
        cities.forEach((city, ci) => { pt[city.label] = results[ci][i]; });
        return pt;
      }));
    } finally { setLoading(false); }
  }, [selected, zmanKey]);

  useEffect(() => { load(); }, [load]);

  const cities = ALL_CITIES.filter(c => selected.includes(c.label));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-white/40 text-xs uppercase tracking-widest">Compare cities</p>
        <select
          value={zmanKey}
          onChange={e => setZmanKey(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {EXPLORE_ZMANIM.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
        </select>
      </div>
      {/* City toggles */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ALL_CITIES.map((city, i) => (
          <button
            key={city.label}
            onClick={() => toggleCity(city.label)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              selected.includes(city.label)
                ? 'border-transparent text-black font-medium'
                : 'border-white/10 text-white/30 hover:text-white/60 bg-transparent'
            }`}
            style={selected.includes(city.label) ? { background: CITY_COLORS[i % CITY_COLORS.length] } : {}}
          >
            {city.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={minsToTimeStr}
              width={52}
            />
            <Tooltip content={<TimeTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', paddingTop: '8px' }}
            />
            {cities.map((city, i) => (
              <Line
                key={city.label}
                type="monotone"
                dataKey={city.label}
                stroke={CITY_COLORS[ALL_CITIES.findIndex(c => c.label === city.label) % CITY_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Tab: Daylight ─────────────────────────────────────────────────────────────

function DaylightView({ location }: { location: LocationInfo }) {
  const [compareCity, setCompareCity] = useState<string | null>(null);
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(new Date().getFullYear());
    const compare = compareCity ? ALL_CITIES.find(c => c.label === compareCity) : null;
    try {
      const [primary, secondary] = await Promise.all([
        Promise.all(dates.map(d => fetchDaylightForDate(location, d))),
        compare ? Promise.all(dates.map(d => fetchDaylightForDate(compare, d))) : Promise.resolve(null),
      ]);
      setData(dates.map((_, i) => {
        const pt: MonthPoint = { month: MONTHS[i], monthIdx: i, [location.label]: primary[i] };
        if (secondary && compare) pt[compare.label] = secondary[i];
        return pt;
      }));
    } finally { setLoading(false); }
  }, [location, compareCity]);

  useEffect(() => { load(); }, [load]);

  const compare = compareCity ? ALL_CITIES.find(c => c.label === compareCity) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white text-sm font-medium">Daylight Hours</p>
          <p className="text-white/30 text-xs">Sunrise to sunset across the year</p>
        </div>
        <select
          value={compareCity || ''}
          onChange={e => setCompareCity(e.target.value || null)}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
        >
          <option value="">No comparison</option>
          {ALL_CITIES.filter(c => c.label !== location.label).map(c => (
            <option key={c.label} value={c.label}>{c.label}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${Math.floor(v / 60)}h`}
              width={32}
            />
            <Tooltip content={<DurTooltip />} />
            <ReferenceLine y={720} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" label={{ value: '12h', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
            <Bar dataKey={location.label} fill="rgba(255,255,255,0.5)" radius={[3, 3, 0, 0]} />
            {compare && <Bar dataKey={compare.label} fill="rgba(167,139,250,0.5)" radius={[3, 3, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      )}
      {/* Equinox note */}
      <p className="text-white/15 text-xs text-center mt-3">Equinox ≈ 12h · Summer solstice is the peak · Winter solstice the trough</p>
    </div>
  );
}

// ── Tab: Map ──────────────────────────────────────────────────────────────────

function MapView() {
  const [zmanKey, setZmanKey] = useState('sunrise');
  const [cityData, setCityData] = useState<{ city: LocationInfo; mins: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const results = await Promise.all(
        ALL_CITIES.map(async city => ({
          city,
          mins: await fetchZmanForDate(city, today, zmanKey),
        }))
      );
      setCityData(results.filter(r => r.mins > 0));
    } finally { setLoading(false); }
  }, [zmanKey]);

  useEffect(() => { load(); }, [load]);

  // Simple world map using SVG — project lat/lng to SVG coords
  // Mercator-ish: x = (lng + 180) / 360 * W, y = (90 - lat) / 180 * H
  const W = 500, H = 280;
  const toSvg = (lat: number, lng: number) => ({
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  });

  const allMins = cityData.map(d => d.mins);
  const minM = Math.min(...allMins), maxM = Math.max(...allMins);
  const pct = (m: number) => maxM === minM ? 0.5 : (m - minM) / (maxM - minM);

  // Color interpolation: early = violet, late = amber
  const dotColor = (p: number) => {
    const r = Math.round(167 + (251 - 167) * p);
    const g = Math.round(139 + (191 - 139) * p);
    const b = Math.round(250 + (36 - 250) * p);
    return `rgb(${r},${g},${b})`;
  };

  const zdef = EXPLORE_ZMANIM.find(z => z.key === zmanKey);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white text-sm font-medium">Today: {zdef?.label}</p>
          <p className="text-white/30 text-xs">Across cities worldwide · color = earlier → later</p>
        </div>
        <select
          value={zmanKey}
          onChange={e => setZmanKey(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {EXPLORE_ZMANIM.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="h-48 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-white/5">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white/3">
            {/* Simple world outline using a rough polygon — decorative only */}
            <rect width={W} height={H} fill="transparent" />
            {/* Grid lines */}
            {[-60,-30,0,30,60].map(lat => {
              const y = toSvg(lat, 0).y;
              return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
            })}
            {[-120,-60,0,60,120].map(lng => {
              const x = toSvg(0, lng).x;
              return <line key={lng} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
            })}
            {/* Equator */}
            <line x1={0} y1={toSvg(0,0).y} x2={W} y2={toSvg(0,0).y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            {/* City dots */}
            {cityData.map(({ city, mins }) => {
              const { x, y } = toSvg(city.lat, city.lng);
              const p = pct(mins);
              const color = dotColor(p);
              return (
                <g key={city.label}>
                  <circle cx={x} cy={y} r={14} fill={color} fillOpacity={0.08} />
                  <circle cx={x} cy={y} r={5} fill={color} fillOpacity={0.85} />
                  <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">{city.label}</text>
                  <text x={x} y={y + 18} textAnchor="middle" fontSize={8} fill={color} fillOpacity={0.8}>{minsToTimeStr(mins)}</text>
                </g>
              );
            })}
          </svg>
          {/* Legend */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
            <span className="text-xs text-white/30">Earlier</span>
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, rgb(167,139,250), rgb(251,191,36))' }} />
            <span className="text-xs text-white/30">Later</span>
          </div>
        </div>
      )}
      {/* City table */}
      {!loading && (
        <div className="mt-3 space-y-0.5 max-h-40 overflow-y-auto">
          {[...cityData].sort((a, b) => a.mins - b.mins).map(({ city, mins }, i) => (
            <div key={city.label} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/3 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/20 w-4 tabular-nums">{i + 1}</span>
                <span className="text-xs text-white/60">{city.label}</span>
              </div>
              <span className="text-xs font-mono" style={{ color: dotColor(pct(mins)) }}>{minsToTimeStr(mins)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Seasonal Wheel ───────────────────────────────────────────────────────

function SeasonalWheel({ location }: { location: LocationInfo }) {
  const [data, setData] = useState<{ month: string; sunrise: number; sunset: number; daylight: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(new Date().getFullYear());
    try {
      const results = await Promise.all(dates.map(async d => {
        const res = await fetch(`/api/zmanim?lat=${location.lat}&lng=${location.lng}&tzid=${encodeURIComponent(location.tzid)}&date=${d}`);
        const json = await res.json();
        const sr = json?.times?.sunrise, ss = json?.times?.sunset;
        const srM = sr ? (() => { const l = new Date(new Date(sr).toLocaleString('en-US', { timeZone: location.tzid })); return l.getHours() * 60 + l.getMinutes(); })() : 0;
        const ssM = ss ? (() => { const l = new Date(new Date(ss).toLocaleString('en-US', { timeZone: location.tzid })); return l.getHours() * 60 + l.getMinutes(); })() : 0;
        return { sunrise: srM, sunset: ssM, daylight: ssM - srM };
      }));
      setData(results.map((r, i) => ({ month: MONTHS[i], ...r })));
    } finally { setLoading(false); }
  }, [location]);

  useEffect(() => { load(); }, [load]);

  // Polar chart using SVG: 12 months around a circle
  const size = 260, cx = size / 2, cy = size / 2, maxR = 100, minR = 20;
  const allDaylight = data.map(d => d.daylight).filter(Boolean);
  const maxDaylight = allDaylight.length ? Math.max(...allDaylight) : 800;
  const minDaylight = allDaylight.length ? Math.min(...allDaylight) : 600;

  const toXY = (monthIdx: number, r: number) => {
    const angle = (monthIdx / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const labelPos = (i: number) => toXY(i, maxR + 18);

  const srPath = data.map((d, i) => {
    const r = minR + ((d.sunrise / (24 * 60)) * (maxR - minR));
    const { x, y } = toXY(i, r);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ' Z';

  const ssPath = data.map((d, i) => {
    const r = minR + ((d.sunset / (24 * 60)) * (maxR - minR));
    const { x, y } = toXY(i, r);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ' Z';

  const daylightPath = data.map((d, i) => {
    const range = maxDaylight - minDaylight || 1;
    const r = minR + (((d.daylight - minDaylight) / range) * (maxR - minR));
    const { x, y } = toXY(i, r);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ' Z';

  return (
    <div>
      <div className="mb-3">
        <p className="text-white text-sm font-medium">Seasonal Wheel</p>
        <p className="text-white/30 text-xs">{location.label} · sunrise / sunset / daylight across months</p>
      </div>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <div className="flex justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Rings */}
            {[0.25, 0.5, 0.75, 1].map(f => (
              <circle key={f} cx={cx} cy={cy} r={minR + f * (maxR - minR)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            ))}
            {/* Spokes */}
            {MONTHS.map((_, i) => {
              const outer = toXY(i, maxR);
              return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />;
            })}
            {/* Daylight fill */}
            {data.length === 12 && <path d={daylightPath} fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.4)" strokeWidth={1.5} strokeLinejoin="round" />}
            {/* Sunrise */}
            {data.length === 12 && <path d={srPath} fill="rgba(167,139,250,0.06)" stroke="rgba(167,139,250,0.5)" strokeWidth={1} strokeLinejoin="round" />}
            {/* Sunset */}
            {data.length === 12 && <path d={ssPath} fill="rgba(249,115,22,0.06)" stroke="rgba(249,115,22,0.5)" strokeWidth={1} strokeLinejoin="round" />}
            {/* Month labels */}
            {MONTHS.map((m, i) => {
              const { x, y } = labelPos(i);
              return <text key={m} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.35)">{m}</text>;
            })}
          </svg>
        </div>
      )}
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2">
        {[
          { color: 'rgba(167,139,250,0.7)', label: 'Sunrise' },
          { color: 'rgba(251,191,36,0.7)',  label: 'Daylight' },
          { color: 'rgba(249,115,22,0.7)',  label: 'Sunset' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
            <span className="text-white/30 text-xs">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

type ExplorTab = 'year' | 'compare' | 'daylight' | 'map' | 'wheel';

const TABS: { id: ExplorTab; label: string }[] = [
  { id: 'year',    label: 'Year' },
  { id: 'compare', label: 'Compare' },
  { id: 'daylight',label: 'Daylight' },
  { id: 'map',     label: 'Map' },
  { id: 'wheel',   label: 'Wheel' },
];

export default function ZmanimExplore({ location }: { location: LocationInfo }) {
  const [tab, setTab] = useState<ExplorTab>('year');

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 bg-white/3 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'year'     && <YearView location={location} />}
      {tab === 'compare'  && <CityCompare currentLocation={location} />}
      {tab === 'daylight' && <DaylightView location={location} />}
      {tab === 'map'      && <MapView />}
      {tab === 'wheel'    && <SeasonalWheel location={location} />}
    </div>
  );
}
