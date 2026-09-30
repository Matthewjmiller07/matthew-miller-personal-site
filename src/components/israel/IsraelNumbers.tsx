import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

/* ------------------------------------------------------------------ types */

interface FxData {
  updated: string;
  latest: Record<string, { rate: number; updated: string }>;
  series: Record<string, [string, number][]>;
}

interface KinneretData {
  updated: string;
  upperRedLine: number;
  lowerRedLine: number;
  blackLine: number;
  monthly: [string, number][];
  winters: { winter: string; gain_m: number; low_m: number; high_m: number }[];
}

interface PeopleData {
  updated: string;
  population: [number, number][];
  aliyah: [number, number][];
  byCountry: { country: string; region: string; total: number }[];
}

interface ElectionParty {
  letter: string;
  name: string;
  votes: number;
  pct: number;
}

interface Election {
  knesset: number;
  year: number;
  label: string;
  eligible: number;
  voted: number;
  valid: number;
  turnoutPct: number;
  parties: ElectionParty[];
}

interface ElectionsData {
  updated: string;
  localityEn: string;
  elections: Election[];
}

type Tab = 'shekel' | 'kinneret' | 'people' | 'elections' | 'weather';

const TABS: { key: Tab; label: string }[] = [
  { key: 'shekel', label: 'The shekel' },
  { key: 'kinneret', label: 'Kinneret' },
  { key: 'people', label: 'People' },
  { key: 'elections', label: 'How Raanana voted' },
  { key: 'weather', label: 'Weather now' },
];

const AXIS = '#64748b';
const GRID = '#1e293b';
const SKY = '#38bdf8';

async function fetchJson<T>(name: string): Promise<T | null> {
  try {
    const res = await fetch(`/data/israel-stats/${name}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function ChartTip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        fontSize: '0.82rem',
        color: '#e2e8f0',
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey}>
          <span style={{ color: p.color ?? p.payload?.fill ?? SKY }}>● </span>
          {p.name}: <strong>{format ? format(p.value, p.name, p) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function Tiles({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="il-tiles">
      {items.map((item) => (
        <div className="il-tile" key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ shekel */

const CCYS = [
  { key: 'USD', label: 'Dollar', symbol: '$' },
  { key: 'EUR', label: 'Euro', symbol: '€' },
  { key: 'GBP', label: 'Pound', symbol: '£' },
];

function ShekelTab({ data }: { data: FxData | null }) {
  const [ccy, setCcy] = useState('USD');
  const rows = useMemo(() => {
    const s = data?.series[ccy] ?? [];
    return s.map(([d, v]) => ({ d, v, y: d.slice(0, 4), jan: d.slice(5, 7) === '01' }));
  }, [data, ccy]);
  if (!data) return <p className="il-empty">Exchange-rate data didn’t load.</p>;
  const latest = data.latest[ccy]?.rate ?? rows[rows.length - 1]?.v;
  const first = rows[0]?.v;
  const change = latest && first ? ((latest - first) / first) * 100 : 0;
  const sym = CCYS.find((c) => c.key === ccy)?.symbol ?? '';
  return (
    <div className="iln-pane">
      <div className="iln-row">
        {CCYS.map((c) => (
          <button
            key={c.key}
            className={`il-btn il-btn-sm ${ccy === c.key ? 'is-active' : ''}`}
            onClick={() => setCcy(c.key)}
          >
            {c.symbol} {c.label}
          </button>
        ))}
      </div>
      <Tiles
        items={[
          { value: latest ? `₪${latest.toFixed(3)}` : '—', label: `${sym}1 = ? · Bank of Israel` },
          {
            value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`,
            label: `shekel ${change >= 0 ? 'weaker' : 'stronger'} since 2006`,
          },
        ]}
      />
      <div className="iln-chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="d"
              tick={{ fill: AXIS, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={Math.ceil(rows.length / 8)}
              tickFormatter={(d: string) => d.slice(0, 4)}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
              tickFormatter={(v: number) => `₪${v.toFixed(1)}`}
              width={52}
            />
            <Tooltip content={<ChartTip format={(v: number) => `₪${v.toFixed(3)}`} />} />
            <Line
              type="monotone"
              dataKey="v"
              name={`${ccy}/ILS`}
              stroke={SKY}
              strokeWidth={1.6}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="il-hint">
        Representative rates, Bank of Israel, weekly since January 2006. A falling line means
        the shekel is strengthening — a dollar bought ₪4.62 in 2006 and about ₪
        {latest?.toFixed(2)} now.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- kinneret */

function KinneretTab({ data }: { data: KinneretData | null }) {
  const [mode, setMode] = useState<'level' | 'winter'>('level');
  const rows = useMemo(
    () => (data?.monthly ?? []).map(([d, v]) => ({ d, v })),
    [data]
  );
  const winterRows = useMemo(
    () => (data?.winters ?? []).slice(-30).map((w) => ({ d: w.winter, v: w.gain_m })),
    [data]
  );
  if (!data) return <p className="il-empty">Kinneret data didn’t load.</p>;
  const cur = rows[rows.length - 1]?.v;
  const min = Math.min(...rows.map((r) => r.v));
  const max = Math.max(...rows.map((r) => r.v));
  const belowLower = cur !== undefined && cur < data.lowerRedLine;
  return (
    <div className="iln-pane">
      <div className="iln-row">
        <button
          className={`il-btn il-btn-sm ${mode === 'level' ? 'is-active' : ''}`}
          onClick={() => setMode('level')}
        >
          Water level
        </button>
        <button
          className={`il-btn il-btn-sm ${mode === 'winter' ? 'is-active' : ''}`}
          onClick={() => setMode('winter')}
        >
          Winter gains
        </button>
      </div>
      <Tiles
        items={[
          { value: cur !== undefined ? `${cur.toFixed(2)}m` : '—', label: 'level now (below sea level)' },
          {
            value: belowLower ? 'below it' : 'above it',
            label: `lower red line (${data.lowerRedLine.toFixed(1)}m)`,
          },
          { value: `${min.toFixed(2)}m`, label: 'lowest ever recorded' },
        ]}
      />
      <div className="iln-chart">
        {mode === 'level' ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="d"
                tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                interval={Math.ceil(rows.length / 6)}
                tickFormatter={(d: string) => d.slice(0, 4)}
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 0.3', 'dataMax + 0.3']}
                tickFormatter={(v: number) => `${v.toFixed(0)}m`}
                width={48}
              />
              <Tooltip content={<ChartTip format={(v: number) => `${v.toFixed(2)}m`} />} />
              <ReferenceLine
                y={data.upperRedLine}
                stroke="#f87171"
                strokeDasharray="5 4"
                label={{ value: 'upper red line', fill: '#f87171', fontSize: 11, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={data.lowerRedLine}
                stroke="#ef4444"
                strokeDasharray="5 4"
                label={{ value: 'lower red line', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={data.blackLine}
                stroke="#94a3b8"
                strokeDasharray="2 3"
                label={{ value: 'black line', fill: '#94a3b8', fontSize: 11, position: 'insideBottomRight' }}
              />
              <Line type="monotone" dataKey="v" name="level" stroke="#38bdf8" strokeWidth={1.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={winterRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="d"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                interval={4}
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}m`}
                width={44}
              />
              <Tooltip content={<ChartTip format={(v: number) => `+${v.toFixed(2)}m`} />} />
              <Bar dataKey="v" name="winter gain" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="il-hint">
        Monthly readings since 1966. The red lines are the Water Authority’s operational
        thresholds — between them is the healthy band; below the lower red line,
        pumping and ecology get complicated. Winter gain is the rise from the
        season’s low to its spring high.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ people */

function PeopleTab({ data }: { data: PeopleData | null }) {
  const [mode, setMode] = useState<'growth' | 'countries'>('growth');
  const rows = useMemo(() => {
    const pop = new Map(data?.population ?? []);
    const ali = new Map(data?.aliyah ?? []);
    const years = [...new Set([...pop.keys(), ...ali.keys()])].sort((a, b) => a - b);
    return years.map((y) => ({ y, pop: pop.get(y) ?? null, ali: ali.get(y) ?? null }));
  }, [data]);
  const countryRows = useMemo(
    () => (data?.byCountry ?? []).slice(0, 8).map((c) => ({ name: c.country, v: c.total })),
    [data]
  );
  if (!data) return <p className="il-empty">Population data didn’t load.</p>;
  const popNow = data.population[data.population.length - 1]?.[1];
  const pop1960 = data.population[0]?.[1];
  const aliMax = data.aliyah.reduce((m, [, v]) => Math.max(m, v), 0);
  const aliMaxYear = data.aliyah.find(([, v]) => v === aliMax)?.[0];
  return (
    <div className="iln-pane">
      <div className="iln-row">
        <button
          className={`il-btn il-btn-sm ${mode === 'growth' ? 'is-active' : ''}`}
          onClick={() => setMode('growth')}
        >
          Population & aliyah
        </button>
        <button
          className={`il-btn il-btn-sm ${mode === 'countries' ? 'is-active' : ''}`}
          onClick={() => setMode('countries')}
        >
          Where olim came from
        </button>
      </div>
      <Tiles
        items={[
          { value: popNow ? (popNow / 1e6).toFixed(2) + 'M' : '—', label: 'Israelis today' },
          {
            value: popNow && pop1960 ? `${(popNow / pop1960).toFixed(1)}×` : '—',
            label: 'growth since 1960',
          },
          {
            value: aliMax ? fmtInt(aliMax) : '—',
            label: `biggest aliyah year (${aliMaxYear})`,
          },
        ]}
      />
      <div className="iln-chart">
        {mode === 'growth' ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="y"
                tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                interval={Math.ceil(rows.length / 8)}
              />
              <YAxis
                yAxisId="pop"
                tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)}M`}
                width={40}
                domain={[0, 'dataMax']}
              />
              <YAxis
                yAxisId="ali"
                orientation="right"
                tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                width={40}
              />
              <Tooltip
                content={
                  <ChartTip
                    format={(v: number, name: string) =>
                      name === 'population' ? fmtInt(v) : `${fmtInt(v)} olim`
                    }
                  />
                }
              />
              <Bar yAxisId="ali" dataKey="ali" name="aliyah" fill="#0ea5e9" opacity={0.75} radius={[2, 2, 0, 0]} />
              <Line
                yAxisId="pop"
                type="monotone"
                dataKey="pop"
                name="population"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={countryRows} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip content={<ChartTip format={(v: number) => `${fmtInt(v)} olim`} />} />
              <Bar dataKey="v" name="olim 2015–2025" fill="#38bdf8" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="il-hint">
        Population since 1960, aliyah since 1989. The two great waves are the Soviet
        exodus of the early nineties and the post-2022 wave from Russia and Ukraine.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- elections */

const PARTY_COLORS: Record<string, string> = {
  Likud: '#3b82f6',
  'Likud–Beiteinu': '#3b82f6',
  'Yesh Atid': '#f59e0b',
  'Blue & White': '#e2e8f0',
  'Zionist Union': '#ef4444',
  Labor: '#ef4444',
  'Labor–Gesher': '#ef4444',
  'Labor–Gesher–Meretz': '#ef4444',
  Meretz: '#22c55e',
  'Democratic Union': '#22c55e',
  'National Unity': '#a5b4fc',
  'Religious Zionism': '#a16207',
  'Habayit Hayehudi': '#84cc16',
  Yamina: '#facc15',
  'Union of Right-Wing Parties': '#facc15',
  'New Right': '#f97316',
  'New Hope': '#67e8f9',
  Shas: '#fde047',
  'United Torah Judaism': '#94a3b8',
  'Yisrael Beiteinu': '#c084fc',
  Kulanu: '#f0abfc',
  Hatnuah: '#5eead4',
  Kadima: '#5eead4',
  "Hadash–Ta'al": '#f87171',
  'Joint List': '#f87171',
  Hadash: '#f87171',
  "Ra'am": '#4ade80',
  "Ra'am–Balad": '#4ade80',
  "Ra'am–Ta'al": '#4ade80',
  Yachad: '#fb7185',
  'Otzma Yehudit': '#b45309',
  Zehut: '#e879f9',
};

function ElectionsTab({ data }: { data: ElectionsData | null }) {
  const [idx, setIdx] = useState(0);
  const elections = data?.elections ?? [];
  const e = elections[idx];
  const rows = useMemo(
    () => (e?.parties ?? []).map((p) => ({ name: p.name, pct: p.pct, votes: p.votes })),
    [e]
  );
  if (!data || !e) return <p className="il-empty">Election data didn’t load.</p>;
  const winner = e.parties[0];
  return (
    <div className="iln-pane">
      <div className="iln-row">
        {elections.map((el, i) => (
          <button
            key={el.knesset}
            className={`il-btn il-btn-sm ${i === idx ? 'is-active' : ''}`}
            onClick={() => setIdx(i)}
          >
            {el.label}
          </button>
        ))}
      </div>
      <Tiles
        items={[
          { value: winner ? `${fmtPct(winner.pct)}` : '—', label: `${winner?.name ?? ''} won Raanana` },
          { value: fmtPct(e.turnoutPct), label: `turnout (${fmtInt(e.voted)} voted)` },
          { value: fmtInt(e.valid), label: 'valid votes counted' },
        ]}
      />
      <div className="iln-chart">
        <ResponsiveContainer width="100%" height={Math.max(280, rows.length * 44)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: AXIS, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtPct}
              domain={[0, 'dataMax + 4']}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={150}
            />
            <Tooltip
              content={<ChartTip format={(v: number, name: string, p: any) => `${fmtPct(v)} · ${fmtInt(p?.payload?.votes ?? 0)} votes`} />}
            />
            <Bar dataKey="pct" name="share" radius={[0, 4, 4, 0]}>
              {rows.map((r) => (
                <Cell key={r.name} fill={PARTY_COLORS[r.name] ?? '#475569'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="il-hint">
        Official results for {data.localityEn} from the Central Elections Committee,
        published on data.gov.il — the 19th through 25th Knessets. Raanana has been a
        bellwether for the secular center-left: Yesh Atid, the Zionist Union, Blue
        &amp; White, and Yesh Atid again.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- weather */

interface WeatherNow {
  temp: number;
  humidity: number;
  code: number;
  days: { date: string; max: number; min: number; precip: number; code: number }[];
}

const WEATHER_LABEL: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
};

function WeatherTab() {
  const [wx, setWx] = useState<WeatherNow | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // Raanana: 32.1834, 34.8701
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=32.1834&longitude=34.8701' +
        '&current=temperature_2m,relative_humidity_2m,weather_code' +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
        '&timezone=Asia%2FJerusalem&forecast_days=3'
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((j) => {
        setWx({
          temp: j.current.temperature_2m,
          humidity: j.current.relative_humidity_2m,
          code: j.current.weather_code,
          days: j.daily.time.map((date: string, i: number) => ({
            date,
            max: j.daily.temperature_2m_max[i],
            min: j.daily.temperature_2m_min[i],
            precip: j.daily.precipitation_sum[i],
            code: j.daily.weather_code[i],
          })),
        });
      })
      .catch(() => setFailed(true));
  }, []);
  if (failed) return <p className="il-empty">Couldn’t reach the weather service just now.</p>;
  if (!wx) return <p className="il-empty">Checking the sky over Raanana…</p>;
  const dayName = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  return (
    <div className="iln-pane">
      <Tiles
        items={[
          { value: `${Math.round(wx.temp)}°`, label: `Raanana now · ${WEATHER_LABEL[wx.code] ?? ''}` },
          { value: `${wx.humidity}%`, label: 'humidity' },
          {
            value: wx.days[0] ? `${Math.round(wx.days[0].min)}°–${Math.round(wx.days[0].max)}°` : '—',
            label: 'today’s range',
          },
        ]}
      />
      <div className="iln-row">
        {wx.days.map((d) => (
          <div className="il-tile" key={d.date} style={{ flex: '1 1 0' }}>
            <strong>
              {Math.round(d.min)}°–{Math.round(d.max)}°
            </strong>
            <span>
              {dayName(d.date)} · {WEATHER_LABEL[d.code] ?? ''}
              {d.precip > 0 ? ` · ${d.precip}mm` : ''}
            </span>
          </div>
        ))}
      </div>
      <p className="il-hint">Live from Open-Meteo, no key needed.</p>
    </div>
  );
}

/* -------------------------------------------------------------------- root */

export default function IsraelNumbers() {
  const [tab, setTab] = useState<Tab>('shekel');
  const [fx, setFx] = useState<FxData | null>(null);
  const [kinneret, setKinneret] = useState<KinneretData | null>(null);
  const [people, setPeople] = useState<PeopleData | null>(null);
  const [elections, setElections] = useState<ElectionsData | null>(null);

  useEffect(() => {
    fetchJson<FxData>('fx.json').then(setFx);
    fetchJson<KinneretData>('kinneret.json').then(setKinneret);
    fetchJson<PeopleData>('people.json').then(setPeople);
    fetchJson<ElectionsData>('elections.json').then(setElections);
  }, []);

  return (
    <div>
      <div className="il-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`il-tab ${tab === t.key ? 'is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'shekel' && <ShekelTab data={fx} />}
      {tab === 'kinneret' && <KinneretTab data={kinneret} />}
      {tab === 'people' && <PeopleTab data={people} />}
      {tab === 'elections' && <ElectionsTab data={elections} />}
      {tab === 'weather' && <WeatherTab />}
    </div>
  );
}
