import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
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
  { lat: 41.8781,  lng: -87.6298,  tzid: 'America/Chicago',       label: 'Chicago' },
  { lat: 40.7128,  lng: -74.0060,  tzid: 'America/New_York',      label: 'New York' },
  { lat: 31.7683,  lng: 35.2137,   tzid: 'Asia/Jerusalem',        label: 'Jerusalem' },
  { lat: 34.0522,  lng: -118.2437, tzid: 'America/Los_Angeles',   label: 'Los Angeles' },
  { lat: 51.5074,  lng: -0.1278,   tzid: 'Europe/London',         label: 'London' },
  { lat: 25.7617,  lng: -80.1918,  tzid: 'America/New_York',      label: 'Miami' },
  { lat: 43.6532,  lng: -79.3832,  tzid: 'America/Toronto',       label: 'Toronto' },
  { lat: 32.0853,  lng: 34.7818,   tzid: 'Asia/Jerusalem',        label: 'Tel Aviv' },
  { lat: 48.8566,  lng: 2.3522,    tzid: 'Europe/Paris',          label: 'Paris' },
  { lat: -33.8688, lng: 151.2093,  tzid: 'Australia/Sydney',      label: 'Sydney' },
  { lat: 37.7749,  lng: -122.4194, tzid: 'America/Los_Angeles',   label: 'San Francisco' },
  { lat: 29.7604,  lng: -95.3698,  tzid: 'America/Chicago',       label: 'Houston' },
  { lat: 33.4484,  lng: -112.0740, tzid: 'America/Phoenix',       label: 'Phoenix' },
  { lat: 52.5200,  lng: 13.4050,   tzid: 'Europe/Berlin',         label: 'Berlin' },
  { lat: 55.7558,  lng: 37.6173,   tzid: 'Europe/Moscow',         label: 'Moscow' },
  { lat: 35.6762,  lng: 139.6503,  tzid: 'Asia/Tokyo',            label: 'Tokyo' },
  { lat: 1.3521,   lng: 103.8198,  tzid: 'Asia/Singapore',        label: 'Singapore' },
  { lat: 19.0760,  lng: 72.8777,   tzid: 'Asia/Kolkata',          label: 'Mumbai' },
  { lat: -34.6037, lng: -58.3816,  tzid: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { lat: 59.9311,  lng: 10.7579,   tzid: 'Europe/Oslo',           label: 'Oslo' },
  { lat: 64.1355,  lng: -21.8954,  tzid: 'Atlantic/Reykjavik',    label: 'Reykjavik' },
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

function daysInMonth(year: number, month: number): string[] {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, d) => {
    const dt = new Date(year, month, d + 1);
    return dt.toISOString().slice(0, 10);
  });
}

function allDaysOfYear(year: number): string[] {
  const days: string[] = [];
  for (let m = 0; m < 12; m++) {
    const count = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= count; d++) {
      days.push(new Date(year, m, d).toISOString().slice(0, 10));
    }
  }
  return days;
}

// Fetch zman + daylight for a batch of dates (chunked to avoid overwhelming the API)
async function fetchBatchZman(loc: LocationInfo, dates: string[], key: string, chunkSize = 8): Promise<number[]> {
  const results: number[] = [];
  for (let i = 0; i < dates.length; i += chunkSize) {
    const chunk = dates.slice(i, i + chunkSize);
    const vals = await Promise.all(chunk.map(d => fetchZmanForDate(loc, d, key)));
    results.push(...vals);
  }
  return results;
}

async function fetchBatchDaylight(loc: LocationInfo, dates: string[], chunkSize = 8): Promise<number[]> {
  const results: number[] = [];
  for (let i = 0; i < dates.length; i += chunkSize) {
    const chunk = dates.slice(i, i + chunkSize);
    const vals = await Promise.all(chunk.map(d => fetchDaylightForDate(loc, d)));
    results.push(...vals);
  }
  return results;
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

// ── Tab: Year View (with day-level drill-down) ────────────────────────────────

function YearView({ location }: { location: LocationInfo }) {
  const [zmanKey, setZmanKey]         = useState('sunrise');
  const [monthData, setMonthData]     = useState<MonthPoint[]>([]);
  const [dayData, setDayData]         = useState<{ day: string; dayNum: number; value: number }[]>([]);
  const [drillMonth, setDrillMonth]   = useState<number | null>(null); // 0-based month index
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay]   = useState(false);
  const year = new Date().getFullYear();
  const zdef = EXPLORE_ZMANIM.find(z => z.key === zmanKey);

  const loadMonths = useCallback(async () => {
    setLoadingMonth(true);
    const dates = monthDates(year);
    try {
      const mins = await Promise.all(dates.map(d => fetchZmanForDate(location, d, zmanKey)));
      setMonthData(dates.map((_, i) => ({ month: MONTHS[i], monthIdx: i, value: mins[i] })));
    } finally { setLoadingMonth(false); }
  }, [location, zmanKey, year]);

  const loadDays = useCallback(async (monthIdx: number) => {
    setLoadingDay(true);
    const dates = daysInMonth(year, monthIdx);
    try {
      const mins = await Promise.all(dates.map(d => fetchZmanForDate(location, d, zmanKey)));
      setDayData(dates.map((d, i) => ({ day: d, dayNum: i + 1, value: mins[i] })));
    } finally { setLoadingDay(false); }
  }, [location, zmanKey, year]);

  useEffect(() => { loadMonths(); setDrillMonth(null); }, [loadMonths]);
  useEffect(() => { if (drillMonth !== null) loadDays(drillMonth); }, [drillMonth, loadDays]);

  const statsFor = (vals: number[]) => {
    const v = vals.filter(Boolean);
    const min = Math.min(...v), max = Math.max(...v);
    return { min, max, range: max - min };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {drillMonth !== null && (
            <button
              onClick={() => setDrillMonth(null)}
              className="text-white/30 hover:text-white/70 transition-colors text-xs flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All months
            </button>
          )}
          <div>
            <p className="text-white text-sm font-medium">
              {drillMonth !== null ? `${MONTHS[drillMonth]} ${year} · ${zdef?.label}` : zdef?.label}
            </p>
            <p className="text-white/30 text-xs">
              {drillMonth !== null ? 'Daily view · click month to zoom out' : `${location.label} · ${year} · click a point to drill into days`}
            </p>
          </div>
        </div>
        <select
          value={zmanKey}
          onChange={e => { setZmanKey(e.target.value); setDrillMonth(null); }}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {EXPLORE_ZMANIM.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
        </select>
      </div>

      {/* Monthly chart */}
      {drillMonth === null && (
        <>
          {loadingMonth ? (
            <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={monthData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                onClick={e => { if (e?.activePayload?.[0]) setDrillMonth((e.activePayload[0].payload as MonthPoint).monthIdx as number); }}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id="zmanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto','auto']} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={minsToTimeStr} width={52} />
                <Tooltip content={<TimeTooltip />} />
                <Area type="monotone" dataKey="value" name={zdef?.label}
                  stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}
                  fill="url(#zmanGrad)"
                  dot={{ r: 4, fill: '#fff', fillOpacity: 0.6, cursor: 'pointer' }}
                  activeDot={{ r: 6, fill: '#fff', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {!loadingMonth && monthData.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['earliest','latest','range'] as const).map(stat => {
                const vals = monthData.map(d => d.value as number).filter(Boolean);
                const { min, max } = statsFor(vals);
                const minM = monthData.find(d => d.value === min), maxM = monthData.find(d => d.value === max);
                return (
                  <div key={stat} className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
                    <p className="text-white/30 text-xs mb-1 capitalize">{stat}</p>
                    {stat === 'earliest' && <><p className="text-white text-sm font-mono">{minsToTimeStr(min)}</p><p className="text-white/30 text-xs">{minM?.month}</p></>}
                    {stat === 'latest'   && <><p className="text-white text-sm font-mono">{minsToTimeStr(max)}</p><p className="text-white/30 text-xs">{maxM?.month}</p></>}
                    {stat === 'range'    && <><p className="text-white text-sm font-mono">{Math.floor((max-min)/60)}h {(max-min)%60}m</p><p className="text-white/30 text-xs">variation</p></>}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-white/15 text-xs text-center mt-3">Tap any point to see daily breakdown</p>
        </>
      )}

      {/* Daily drill-down chart */}
      {drillMonth !== null && (
        <>
          {loadingDay ? (
            <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading daily data…</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="dayNum" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v % 5 === 0 || v === 1 ? String(v) : ''} />
                <YAxis domain={['auto','auto']} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={minsToTimeStr} width={52} />
                <Tooltip content={<TimeTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area type="monotone" dataKey="value" name={zdef?.label}
                  stroke="rgba(167,139,250,0.9)" strokeWidth={1.5}
                  fill="url(#dayGrad)"
                  dot={{ r: 2, fill: '#a78bfa', fillOpacity: 0.7 }}
                  activeDot={{ r: 5, fill: '#a78bfa', stroke: 'rgba(167,139,250,0.3)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {!loadingDay && dayData.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['earliest','latest','range'] as const).map(stat => {
                const vals = dayData.map(d => d.value).filter(Boolean);
                const { min, max } = statsFor(vals);
                const minD = dayData.find(d => d.value === min), maxD = dayData.find(d => d.value === max);
                return (
                  <div key={stat} className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
                    <p className="text-white/30 text-xs mb-1 capitalize">{stat}</p>
                    {stat === 'earliest' && <><p className="text-white text-sm font-mono">{minsToTimeStr(min)}</p><p className="text-white/30 text-xs">Day {minD?.dayNum}</p></>}
                    {stat === 'latest'   && <><p className="text-white text-sm font-mono">{minsToTimeStr(max)}</p><p className="text-white/30 text-xs">Day {maxD?.dayNum}</p></>}
                    {stat === 'range'    && <><p className="text-white text-sm font-mono">{max - min}m</p><p className="text-white/30 text-xs">variation</p></>}
                  </div>
                );
              })}
            </div>
          )}
        </>
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

// Color interpolation: early = violet, late = amber
function dotColor(p: number): string {
  const r = Math.round(167 + (251 - 167) * p);
  const g = Math.round(139 + (191 - 139) * p);
  const b = Math.round(250 + (36 - 250) * p);
  return `rgb(${r},${g},${b})`;
}

function LeafletMap({ cityData }: { cityData: { city: LocationInfo; mins: number }[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);

  const allMins = cityData.map(d => d.mins);
  const minM = Math.min(...allMins), maxM = Math.max(...allMins);
  const pct = (m: number) => maxM === minM ? 0.5 : (m - minM) / (maxM - minM);

  useEffect(() => {
    if (!mapRef.current || cityData.length === 0) return;

    // Lazy-load leaflet only on client
    import('leaflet').then(L => {
      // Inject dark tile CSS override once
      if (!document.getElementById('leaflet-dark-style')) {
        const link = document.createElement('link');
        link.id = 'leaflet-dark-style';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Destroy existing map
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const map = L.map(mapRef.current!, {
        center: [20, 15],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      });
      leafletRef.current = map;

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      cityData.forEach(({ city, mins }) => {
        const p = pct(mins);
        const color = dotColor(p);
        const circle = L.circleMarker([city.lat, city.lng], {
          radius: 10,
          fillColor: color,
          fillOpacity: 0.85,
          color: color,
          weight: 1,
          opacity: 0.4,
        }).addTo(map);

        circle.bindTooltip(
          `<div style="background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:6px 10px;color:#fff;font-size:12px;white-space:nowrap">
            <strong>${city.label}</strong><br/>
            <span style="font-family:monospace;color:${color}">${minsToTimeStr(mins)}</span>
          </div>`,
          { className: 'leaflet-tooltip-clean', sticky: true, opacity: 1 }
        );
      });
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [cityData]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-white/5"
      style={{ height: '260px', background: '#111' }}
    />
  );
}

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

  const allMins = cityData.map(d => d.mins);
  const minM = Math.min(...allMins), maxM = Math.max(...allMins);
  const pct = (m: number) => maxM === minM ? 0.5 : (m - minM) / (maxM - minM);
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
        <div className="h-64 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <LeafletMap cityData={cityData} />
      )}
      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 mb-3">
        <span className="text-xs text-white/30">Earlier</span>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, rgb(167,139,250), rgb(251,191,36))' }} />
        <span className="text-xs text-white/30">Later</span>
      </div>
      {/* City table */}
      {!loading && (
        <div className="space-y-0.5 max-h-36 overflow-y-auto">
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

// ── Tab: Heatmap ──────────────────────────────────────────────────────────────

function HeatmapView({ location }: { location: LocationInfo }) {
  const [zmanKey, setZmanKey] = useState('sunrise');
  const [cells, setCells] = useState<{ date: string; month: number; day: number; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<{ date: string; value: number } | null>(null);
  const year = new Date().getFullYear();
  const zdef = EXPLORE_ZMANIM.find(z => z.key === zmanKey);

  const load = useCallback(async () => {
    setLoading(true);
    // Sample every 3rd day to keep API calls manageable (~120 calls)
    const allDays = allDaysOfYear(year);
    const sampled = allDays.filter((_, i) => i % 3 === 0);
    try {
      const vals = await fetchBatchZman(location, sampled, zmanKey, 10);
      setCells(sampled.map((d, i) => {
        const dt = new Date(d + 'T12:00:00');
        return { date: d, month: dt.getMonth(), day: dt.getDate(), value: vals[i] };
      }));
    } finally { setLoading(false); }
  }, [location, zmanKey, year]);

  useEffect(() => { load(); }, [load]);

  const vals = cells.map(c => c.value).filter(Boolean);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const pct = (v: number) => maxV === minV ? 0.5 : (v - minV) / (maxV - minV);

  // Color: dark blue (early) → gold (late)
  const cellColor = (v: number) => {
    if (!v) return 'rgba(255,255,255,0.03)';
    const p = pct(v);
    const r = Math.round(30  + (251 - 30)  * p);
    const g = Math.round(80  + (191 - 80)  * p);
    const b = Math.round(200 + (36  - 200) * p);
    return `rgb(${r},${g},${b})`;
  };

  // Group by month for rendering
  const byMonth = MONTHS.map((m, mi) => ({
    month: m,
    cells: cells.filter(c => c.month === mi).sort((a, b) => a.day - b.day),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white text-sm font-medium">Year Heatmap · {zdef?.label}</p>
          <p className="text-white/30 text-xs">{location.label} · {year} · every 3rd day sampled</p>
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
        <div className="h-48 flex items-center justify-center text-white/20 text-sm">Loading heatmap…</div>
      ) : (
        <div className="space-y-1.5 overflow-x-auto">
          {byMonth.map(({ month, cells: mCells }) => (
            <div key={month} className="flex items-center gap-1.5">
              <span className="text-white/20 text-xs w-6 shrink-0">{month}</span>
              <div className="flex gap-0.5 flex-wrap">
                {mCells.map(c => (
                  <div
                    key={c.date}
                    className="rounded-sm cursor-default transition-transform hover:scale-150"
                    style={{ width: 8, height: 8, background: cellColor(c.value) }}
                    onMouseEnter={() => setHovered({ date: c.date, value: c.value })}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hovered cell info */}
      <div className="h-6 mt-2 flex items-center justify-center">
        {hovered ? (
          <p className="text-white/50 text-xs font-mono">
            {hovered.date} → {minsToTimeStr(hovered.value)}
          </p>
        ) : (
          <p className="text-white/15 text-xs">Hover a cell to see the time</p>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-white/25">Earlier</span>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, rgb(30,80,200), rgb(251,191,36))' }} />
        <span className="text-xs text-white/25">Later</span>
      </div>
    </div>
  );
}

// ── Tab: Shaot Zmaniot ────────────────────────────────────────────────────────

function ShaotZmaniotView({ location }: { location: LocationInfo }) {
  const [data, setData] = useState<{ month: string; shaahMins: number; chatzotMins: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(year);
    try {
      const rows = await Promise.all(dates.map(async (d, i) => {
        const [sunrise, sunset, chatzot] = await Promise.all([
          fetchZmanForDate(location, d, 'sunrise'),
          fetchZmanForDate(location, d, 'sunset'),
          fetchZmanForDate(location, d, 'chatzot'),
        ]);
        // Halachic hour = (sunset - sunrise) / 12
        const shaahMins = sunrise && sunset ? Math.round((sunset - sunrise) / 12) : 0;
        return { month: MONTHS[i], shaahMins, chatzotMins: chatzot };
      }));
      setData(rows);
    } finally { setLoading(false); }
  }, [location, year]);

  useEffect(() => { load(); }, [load]);

  const ShaahTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const shaah = payload.find((p: any) => p.dataKey === 'shaahMins');
    return (
      <div style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
        <p className="text-white/50 text-xs mb-1">{label}</p>
        {shaah && <p className="text-white font-mono">{shaah.value}m per halachic hour</p>}
        <p className="text-white/40 text-xs">{shaah ? `= ${(shaah.value / 60).toFixed(2)}h` : ''}</p>
      </div>
    );
  };

  // Equinox reference: 60 min shaah
  return (
    <div>
      <div className="mb-4">
        <p className="text-white text-sm font-medium">Halachic Hour Length</p>
        <p className="text-white/30 text-xs">{location.label} · {year} · shaah zmanit = 1/12 of daylight</p>
      </div>
      {loading ? (
        <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="shaahGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}m`}
              width={36}
            />
            <Tooltip content={<ShaahTooltip />} />
            <ReferenceLine y={60} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4"
              label={{ value: '60m (equinox)', fill: 'rgba(255,255,255,0.2)', fontSize: 9, position: 'insideTopRight' }} />
            <Area type="monotone" dataKey="shaahMins" name="Shaah Zmanit"
              stroke="rgba(245,158,11,0.9)" strokeWidth={1.5}
              fill="url(#shaahGrad)"
              dot={{ r: 3, fill: '#f59e0b', fillOpacity: 0.7 }}
              activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {!loading && data.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Longest hour', val: Math.max(...data.map(d => d.shaahMins)), sub: data.find(d => d.shaahMins === Math.max(...data.map(d => d.shaahMins)))?.month },
            { label: 'Shortest hour', val: Math.min(...data.filter(d => d.shaahMins > 0).map(d => d.shaahMins)), sub: data.find(d => d.shaahMins === Math.min(...data.filter(d => d.shaahMins > 0).map(d => d.shaahMins)))?.month },
            { label: 'Range', val: Math.max(...data.map(d => d.shaahMins)) - Math.min(...data.filter(d => d.shaahMins > 0).map(d => d.shaahMins)), sub: 'minutes difference' },
          ].map(s => (
            <div key={s.label} className="bg-white/3 rounded-xl p-2.5 text-center border border-white/5">
              <p className="text-white/30 text-xs mb-1">{s.label}</p>
              <p className="text-white text-sm font-mono">{s.val}m</p>
              <p className="text-white/30 text-xs">{s.sub}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-white/15 text-xs text-center mt-3">At the equinox each halachic hour = exactly 60 minutes</p>
    </div>
  );
}

// ── Tab: Multi Zman Overlay ───────────────────────────────────────────────────

function MultiZmanView({ location }: { location: LocationInfo }) {
  const DEFAULT_KEYS = ['sunrise', 'sofZmanShma', 'chatzot', 'minchaKetana', 'sunset'];
  const [selected, setSelected] = useState<string[]>(DEFAULT_KEYS);
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();

  const toggle = (key: string) =>
    setSelected(prev => prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(year);
    try {
      const results = await Promise.all(selected.map(k =>
        Promise.all(dates.map(d => fetchZmanForDate(location, d, k)))
      ));
      setData(dates.map((_, i) => {
        const pt: MonthPoint = { month: MONTHS[i], monthIdx: i };
        selected.forEach((k, ki) => { pt[k] = results[ki][i]; });
        return pt;
      }));
    } finally { setLoading(false); }
  }, [location, selected, year]);

  useEffect(() => { load(); }, [load]);

  const ZMAN_COLORS = ['#a78bfa','#34d399','#f59e0b','#60a5fa','#f87171','#fb923c','#4ade80','#e879f9'];

  return (
    <div>
      <div className="mb-5">
        <p className="text-white text-sm font-medium mb-1">Multi-Zman Overlay</p>
        <p className="text-white/30 text-xs mb-3">{location.label} · {year} · compare multiple zmanim on one chart</p>
        <div className="flex flex-wrap gap-1.5">
          {EXPLORE_ZMANIM.map((z, i) => (
            <button
              key={z.key}
              onClick={() => toggle(z.key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                selected.includes(z.key)
                  ? 'border-transparent text-black font-medium'
                  : 'border-white/10 text-white/30 hover:text-white/60'
              }`}
              style={selected.includes(z.key) ? { background: ZMAN_COLORS[i % ZMAN_COLORS.length] } : {}}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto','auto']} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={minsToTimeStr} width={52} />
            <Tooltip content={<TimeTooltip />} />
            {selected.map((k, i) => {
              const zdef = EXPLORE_ZMANIM.find(z => z.key === k);
              return (
                <Line key={k} type="monotone" dataKey={k} name={zdef?.label}
                  stroke={ZMAN_COLORS[EXPLORE_ZMANIM.findIndex(z => z.key === k) % ZMAN_COLORS.length]}
                  strokeWidth={1.5} dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Tab: Latitude Effect ──────────────────────────────────────────────────────
// Pick a date and see how a zman varies across latitudes

function LatitudeEffectView() {
  const [zmanKey, setZmanKey] = useState('sunrise');
  const [date, setDate] = useState(() => monthDates(new Date().getFullYear())[5]); // mid-June default
  const [data, setData] = useState<{ city: string; lat: number; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const zdef = EXPLORE_ZMANIM.find(z => z.key === zmanKey);

  const load = useCallback(async () => {
    setLoading(true);
    // Sort cities by latitude for clean chart
    const sorted = [...ALL_CITIES].sort((a, b) => b.lat - a.lat);
    try {
      const vals = await Promise.all(sorted.map(c => fetchZmanForDate(c, date, zmanKey)));
      setData(sorted.map((c, i) => ({ city: c.label, lat: c.lat, value: vals[i] })));
    } finally { setLoading(false); }
  }, [zmanKey, date]);

  useEffect(() => { load(); }, [load]);

  const LatTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = data.find(d => d.city === label);
    return (
      <div style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
        <p className="text-white font-medium text-xs">{label}</p>
        <p className="text-white/50 text-xs">lat {item?.lat.toFixed(1)}°</p>
        <p className="text-white font-mono mt-1">{minsToTimeStr(payload[0]?.value)}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="text-white text-sm font-medium">Latitude Effect</p>
          <p className="text-white/30 text-xs">How {zdef?.label} varies across latitudes on the same date</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={zmanKey}
            onChange={e => setZmanKey(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {EXPLORE_ZMANIM.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/60 text-xs rounded-lg px-2 py-1.5 focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 80, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" domain={['auto','auto']} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={minsToTimeStr} />
            <YAxis type="category" dataKey="city" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={76} />
            <Tooltip content={<LatTooltip />} />
            <Bar dataKey="value" name={zdef?.label} radius={[0,3,3,0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={`hsl(${220 + i * 12}, 70%, ${45 + i * 2}%)`} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <p className="text-white/15 text-xs text-center mt-3">Cities sorted north → south · try the June solstice vs December solstice</p>
    </div>
  );
}

// ── Tab: Day Timeline ─────────────────────────────────────────────────────────
// Horizontal stacked bar: shows the halachic day segments for each month

function DayTimelineView({ location }: { location: LocationInfo }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    const dates = monthDates(year);
    try {
      const rows = await Promise.all(dates.map(async (d, i) => {
        const res = await fetch(`/api/zmanim?lat=${location.lat}&lng=${location.lng}&tzid=${encodeURIComponent(location.tzid)}&date=${d}`);
        const json = await res.json();
        const t = json?.times ?? {};
        const toMins = (key: string) => {
          const v = t[key]; if (!v) return null;
          const local = new Date(new Date(v).toLocaleString('en-US', { timeZone: location.tzid }));
          return local.getHours() * 60 + local.getMinutes();
        };
        const alot     = toMins('alotHaShachar') ?? 0;
        const sunrise  = toMins('sunrise') ?? 0;
        const chatzot  = toMins('chatzot') ?? 0;
        const sunset   = toMins('sunset') ?? 0;
        const tzeit    = toMins('tzeit7083deg') ?? 0;
        const midnight = 1440;
        return {
          month: MONTHS[i],
          night1:   alot,
          dawn:     sunrise - alot,
          morning:  chatzot - sunrise,
          afternoon: sunset - chatzot,
          evening:  tzeit - sunset,
          night2:   midnight - tzeit,
        };
      }));
      setData(rows);
    } finally { setLoading(false); }
  }, [location, year]);

  useEffect(() => { load(); }, [load]);

  const segments = [
    { key: 'night1',    label: 'Night (pre-dawn)', color: 'rgba(30,30,80,0.9)' },
    { key: 'dawn',      label: 'Dawn',             color: 'rgba(167,139,250,0.7)' },
    { key: 'morning',   label: 'Morning',           color: 'rgba(251,191,36,0.55)' },
    { key: 'afternoon', label: 'Afternoon',         color: 'rgba(245,158,11,0.45)' },
    { key: 'evening',   label: 'Evening',           color: 'rgba(249,115,22,0.6)' },
    { key: 'night2',    label: 'Night',             color: 'rgba(30,30,80,0.9)' },
  ];

  const SegTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
        <p className="text-white/50 text-xs mb-1">{label}</p>
        {payload.map((p: any) => p.value > 0 && (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.fill }} />
            <span className="text-white/70">{p.name}:</span>
            <span className="text-white font-mono">{p.value}m</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-white text-sm font-medium">Day Segments Timeline</p>
        <p className="text-white/30 text-xs">{location.label} · {year} · halachic periods across the year</p>
      </div>
      {loading ? (
        <div className="h-52 flex items-center justify-center text-white/20 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${Math.floor(v/60)}h`} width={28} />
            <Tooltip content={<SegTooltip />} />
            {segments.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="day" fill={s.color} radius={[0,0,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-white/30 text-xs">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Zman Drift ───────────────────────────────────────────────────────────
// How many minutes does each zman shift day-to-day through the year?

function ZmanDriftView({ location }: { location: LocationInfo }) {
  const [zmanKey, setZmanKey] = useState('sunrise');
  const [data, setData] = useState<{ month: string; drift: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();
  const zdef = EXPLORE_ZMANIM.find(z => z.key === zmanKey);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch the 1st and last day of each month, compute daily drift rate
    const pairs = MONTHS.map((_, m) => {
      const first = new Date(year, m, 1).toISOString().slice(0, 10);
      const last  = new Date(year, m + 1, 0).toISOString().slice(0, 10);
      return [first, last];
    });
    try {
      const rows = await Promise.all(pairs.map(async ([first, last], i) => {
        const [v1, v2] = await Promise.all([
          fetchZmanForDate(location, first, zmanKey),
          fetchZmanForDate(location, last,  zmanKey),
        ]);
        const days = new Date(year, i + 1, 0).getDate();
        const drift = v1 && v2 ? parseFloat(((v2 - v1) / days).toFixed(2)) : 0;
        return { month: MONTHS[i], drift };
      }));
      setData(rows);
    } finally { setLoading(false); }
  }, [location, zmanKey, year]);

  useEffect(() => { load(); }, [load]);

  const DriftTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const v = payload[0]?.value;
    return (
      <div style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
        <p className="text-white/50 text-xs mb-1">{label}</p>
        <p className="text-white font-mono">{v > 0 ? '+' : ''}{v} min/day</p>
        <p className="text-white/40 text-xs">{v > 0 ? 'Getting later' : v < 0 ? 'Getting earlier' : 'Stable'}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-white text-sm font-medium">Daily Drift Rate</p>
          <p className="text-white/30 text-xs">{location.label} · {year} · minutes shifted per day</p>
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
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}m`} width={32} />
            <Tooltip content={<DriftTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Bar dataKey="drift" name={`${zdef?.label} drift`} radius={[3,3,0,0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.drift >= 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <p className="text-white/15 text-xs text-center mt-3">
        Green = zman getting later · Red = getting earlier · Near zero = near solstice/equinox
      </p>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

type ExplorTab = 'year' | 'compare' | 'daylight' | 'map' | 'wheel' | 'heatmap' | 'shaot' | 'timeline' | 'drift' | 'multi' | 'latitude';

const TABS: { id: ExplorTab; label: string; desc: string }[] = [
  { id: 'year',     label: 'Year',       desc: 'Zman across 12 months, drill into days' },
  { id: 'multi',    label: 'Overlay',    desc: 'Multiple zmanim on one chart' },
  { id: 'compare',  label: 'Cities',     desc: 'Compare cities side by side' },
  { id: 'daylight', label: 'Daylight',   desc: 'Daylight hours throughout the year' },
  { id: 'timeline', label: 'Timeline',   desc: 'Halachic day segments stacked' },
  { id: 'drift',    label: 'Drift',      desc: 'How fast each zman shifts day to day' },
  { id: 'shaot',    label: 'Shaot',      desc: 'Halachic hour length across the year' },
  { id: 'heatmap',  label: 'Heatmap',    desc: 'Calendar heat map colored by time' },
  { id: 'latitude', label: 'Latitude',   desc: 'How zmanim vary by latitude' },
  { id: 'wheel',    label: 'Wheel',      desc: 'Polar seasonal sunrise/sunset wheel' },
  { id: 'map',      label: 'Map',        desc: 'World map of zmanim times' },
];

export default function ZmanimExplore({
  location,
  allLocations,
  onLocationChange,
}: {
  location: LocationInfo;
  allLocations?: LocationInfo[];
  onLocationChange?: (loc: LocationInfo) => void;
}) {
  const [tab, setTab] = useState<ExplorTab>('year');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const cities = allLocations ?? ALL_CITIES;

  // Geocode search via Nominatim + timeapi.io
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
      ).then(r => r.json());
      const results: LocationInfo[] = await Promise.all(
        geoRes.slice(0, 5).map(async (r: any) => {
          const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
          let tzid = 'UTC';
          try {
            const tzRes = await fetch(
              `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`
            ).then(r => r.json());
            tzid = tzRes.timeZone || 'UTC';
          } catch {}
          const label = r.address?.city || r.address?.town || r.address?.village || r.display_name.split(',')[0];
          return { lat, lng, tzid, label };
        })
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectLocation = (loc: LocationInfo) => {
    onLocationChange?.(loc);
    setSearchQuery('');
    setSearchResults([]);
  };

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="pt-2">
        <h2 className="text-white text-2xl font-light tracking-tight mb-1">Explore Zmanim</h2>
        <p className="text-white/30 text-sm">Visualize halachic times across dates, locations, and seasons</p>
      </div>

      {/* ── Location section ── */}
      {onLocationChange && (
        <div className="bg-white/3 rounded-2xl border border-white/5 p-6">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Active location display */}
            <div className="min-w-[140px]">
              <p className="text-white/20 text-xs uppercase tracking-widest mb-1">Viewing</p>
              <p className="text-white text-lg font-light">{location.label}</p>
              <p className="text-white/25 text-xs font-mono mt-0.5">{location.lat.toFixed(2)}° {location.lng.toFixed(2)}°</p>
            </div>

            <div className="flex-1 min-w-[200px] space-y-3">
              {/* Search box */}
              <div ref={searchRef} className="relative">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-white/25 transition-colors">
                  <svg className="w-3.5 h-3.5 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search any city…"
                    className="bg-transparent text-white text-xs flex-1 outline-none placeholder-white/20"
                  />
                  {searching && (
                    <svg className="w-3 h-3 text-white/30 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => selectLocation(r)}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between gap-2"
                      >
                        <span>{r.label}</span>
                        <span className="text-white/20 text-xs font-mono">{r.lat.toFixed(1)}°, {r.lng.toFixed(1)}°</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preset city pills */}
              <div className="flex flex-wrap gap-1.5">
                {cities.map(loc => {
                  const active = loc.label === location.label;
                  return (
                    <button
                      key={loc.label}
                      onClick={() => selectLocation(loc)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        active
                          ? 'bg-white text-black border-white font-medium'
                          : 'border-white/10 text-white/35 hover:text-white/65 hover:border-white/25'
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab grid ── */}
      <div>
        <p className="text-white/20 text-xs uppercase tracking-widest mb-3">Visualizations</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                tab === t.id
                  ? 'bg-white/8 border-white/20 text-white'
                  : 'border-white/5 text-white/40 hover:text-white/70 hover:border-white/12 hover:bg-white/3'
              }`}
            >
              <p className={`text-xs font-medium mb-0.5 ${tab === t.id ? 'text-white' : 'text-white/50'}`}>{t.label}</p>
              <p className="text-white/25 text-xs leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Active tab content ── */}
      <div className="bg-white/3 rounded-2xl border border-white/5 p-6 md:p-8">
        <div className="mb-6 pb-5 border-b border-white/5">
          <p className="text-white/20 text-xs uppercase tracking-widest">{activeTab?.label}</p>
        </div>
        {tab === 'year'     && <YearView location={location} />}
        {tab === 'multi'    && <MultiZmanView location={location} />}
        {tab === 'compare'  && <CityCompare currentLocation={location} />}
        {tab === 'daylight' && <DaylightView location={location} />}
        {tab === 'timeline' && <DayTimelineView location={location} />}
        {tab === 'drift'    && <ZmanDriftView location={location} />}
        {tab === 'shaot'    && <ShaotZmaniotView location={location} />}
        {tab === 'heatmap'  && <HeatmapView location={location} />}
        {tab === 'latitude' && <LatitudeEffectView />}
        {tab === 'wheel'    && <SeasonalWheel location={location} />}
        {tab === 'map'      && <MapView />}
      </div>

    </div>
  );
}
