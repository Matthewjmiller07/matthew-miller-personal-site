import { useEffect, useRef, useState } from 'react';
import { useGame, rankFor, touch } from './store.js';
import { useAction, fire } from './input.js';
import { RAMBAM, HINENI, WHO_SAID, RANKS } from './content.js';
import { TOKENS } from './levels/BrachaCatch.jsx';
import { sfx } from './audio.js';

const LEVEL_NAMES = { gauntlet: 'The Hefsek Gauntlet', catch: 'Bracha Catch', table: 'Hum or Hush' };

export function UI() {
  const screen = useGame((s) => s.screen);
  return (
    <div className="tt-ui">
      {screen === 'title' && <Title />}
      {screen !== 'title' && <TopBar />}
      {screen === 'hub' && <HubHud />}
      {screen === 'gauntlet' && <GauntletHud />}
      {screen === 'catch' && <CatchHud />}
      {screen === 'table' && <TableHud />}
      {screen === 'results' && <Results />}
      <Reaction />
      <Prompt />
      <Toasts />
      {screen !== 'title' && screen !== 'results' && <TouchControls />}
    </div>
  );
}

function Title() {
  const minhag = useGame((s) => s.minhag);
  const setMinhag = useGame((s) => s.setMinhag);
  const go = useGame((s) => s.go);
  const start = () => { sfx.unlock(); sfx.great(); go('hub'); };
  useAction('action', start);
  return (
    <div className="tt-title">
      <div className="tt-title-card">
        <div className="tt-kicker">Hilchot Tefillin · Siman 25 · a 3D game</div>
        <h1 className="tt-logo"><span lang="he" dir="rtl">הִנֵּנִי</span><small>HINENI · The Tefillin Trials</small></h1>
        <p className="tt-rambam" lang="he" dir="rtl">{RAMBAM.he}</p>
        <p className="tt-rambam-en">{RAMBAM.en} <i>({RAMBAM.ref})</i></p>
        <div className="tt-hinenis">
          {HINENI.map((h) => (
            <div key={h.who} className="tt-hineni"><b>{h.who}</b><span lang="he" dir="rtl">{h.line}</span><em>{h.note}</em></div>
          ))}
        </div>
        <div className="tt-minhag">
          <span>You put on tefillin like:</span>
          <button aria-pressed={minhag === 'ashkenaz'} onClick={() => setMinhag('ashkenaz')}>Ashkenazim · two brachot</button>
          <button aria-pressed={minhag === 'sefard'} onClick={() => setMinhag('sefard')}>Sefardim · one bracha</button>
        </div>
        <button className="tt-play" onClick={start}>Enter the shul ▸</button>
        <p className="tt-controls">WASD / arrows to move · Shift to run · E to talk/act · Space: Do Not Disturb pulse · H to hum · 1–3 to choose. On a phone: joystick and buttons.</p>
      </div>
    </div>
  );
}

function TopBar() {
  const xp = useGame((s) => s.xp);
  const sayings = useGame((s) => s.sayings);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const screen = useGame((s) => s.screen);
  const go = useGame((s) => s.go);
  const minhag = useGame((s) => s.minhag);
  const next = RANKS.find(([min]) => min > xp)?.[0] ?? xp;
  const prev = [...RANKS].reverse().find(([min]) => min <= xp)?.[0] ?? 0;
  const pct = next === prev ? 100 : ((xp - prev) / (next - prev)) * 100;
  return (
    <div className="tt-top">
      <div className="tt-rank">
        <b>{rankFor(xp)}</b>
        <div className="tt-xp"><div style={{ width: `${pct}%` }} /></div>
        <small>{xp} XP · {minhag === 'ashkenaz' ? 'Ashkenazi' : 'Sefardi'}</small>
      </div>
      <div className="tt-sefer" title="Poskim you've talked to">📜 {sayings.length}/{WHO_SAID.length}</div>
      <div className="tt-top-btns">
        {screen !== 'hub' && <button onClick={() => go('hub')}>⟵ Shul</button>}
        <button onClick={toggleMute} aria-label="Toggle sound">{muted ? '🔇' : '🔊'}</button>
      </div>
    </div>
  );
}

function HubHud() {
  const sayings = useGame((s) => s.sayings);
  const stars = useGame((s) => s.stars);
  const total = (stars.gauntlet || 0) + (stars.catch || 0) + (stars.table || 0);
  return (
    <div className="tt-objective">
      <b>The shul</b> · Walk up to the poskim and press E to hear their ruling ({sayings.length}/{WHO_SAID.length}).
      Step into a glowing ring to play: <span style={{ color: '#ff8a7a' }}>The Hefsek Gauntlet</span>, <span style={{ color: '#5fb3ff' }}>Bracha Catch</span>, <span style={{ color: '#7ad1a8' }}>Hum or Hush</span>. ★ {total}/9
    </div>
  );
}

function Hearts({ n, max = 3 }) {
  return <span className="tt-hearts">{Array.from({ length: max }, (_, i) => <span key={i} className={i < n ? 'on' : ''}>♥</span>)}</span>;
}

function GauntletHud() {
  const hud = useGame((s) => s.hud);
  const [now, setNow] = useState(performance.now());
  useEffect(() => { const id = setInterval(() => setNow(performance.now()), 200); return () => clearInterval(id); }, []);
  const cooldown = hud.pulseAt && hud.pulseAt > now ? (hud.pulseAt - now) / 2200 : 0;
  return (
    <>
      <div className="tt-objective">{hud.objective}</div>
      <div className="tt-stats">
        <Hearts n={hud.hearts ?? 3} />
        <div className="tt-meter" title="Hineni: how present you are"><span>Hineni</span><div><div style={{ width: `${hud.hineni ?? 60}%` }} /></div></div>
        <div className="tt-timer" title="Time between the shel yad and the shel rosh. Keep it short: the Baal HaMaor wants one act for both.">⏱ {Math.round(hud.time || 0)}s</div>
        <div className={`tt-pulse ${cooldown ? 'cool' : ''}`}>⚡ DND {cooldown ? '…' : 'ready'}</div>
        {hud.spoke && <div className="tt-flag">you talked: extra brachot</div>}
      </div>
      {hud.kaddish && (
        <div className="tt-kaddish">
          <div className="tt-kaddish-title">KADDISH</div>
          <button className="tt-amen" onClick={() => fire('amen')}>“AMEN, YEHEI SHEMEI RABBA!” <kbd>Q</kbd></button>
          <div className="tt-kaddish-sub">…or stand still, stay silent and listen with kavana · {hud.kavana?.toFixed(1)}s</div>
        </div>
      )}
      {hud.ritual && <Ritual r={hud.ritual} />}
    </>
  );
}

function Ritual({ r }) {
  return (
    <div className="tt-ritual">
      <div className="tt-ritual-title">The shel rosh. Get the order right.</div>
      <div className="tt-ritual-btns">
        <button className={r.shift ? 'done' : ''} onClick={() => fire('shift')}><kbd>F</kbd>Shift the shel yad + <span lang="he">לְהָנִיחַ</span></button>
        <button className={r.mitzvat ? 'done' : ''} onClick={() => fire('mitzvat')}><kbd>M</kbd><span lang="he">עַל מִצְוַת תְּפִלִּין</span></button>
        <button onClick={() => fire('action')} className="tighten">
          <kbd>E</kbd>Tighten (tap!)
          <span className="tt-tight"><span style={{ width: `${r.tight * 100}%` }} /></span>
        </button>
        <button onClick={() => fire('bless')}><kbd>B</kbd><span lang="he">בָּרוּךְ שֵׁם</span></button>
      </div>
    </div>
  );
}

function CatchHud() {
  const hud = useGame((s) => s.hud);
  return (
    <>
      <div className="tt-objective"><b>Round {hud.round}/{hud.rounds}: {hud.title}</b><br />{hud.objective}</div>
      <div className="tt-stats">
        <Hearts n={hud.lives ?? 3} />
        <div className="tt-timer">{hud.dodge ? `Survive ${Math.ceil(hud.timeLeft || 0)}s` : `⏱ ${Math.ceil(hud.timeLeft || 0)}s`}</div>
        <div className="tt-score">{hud.score || 0} pts</div>
      </div>
      {!!hud.need && (
        <div className="tt-slots">
          {hud.need.length === 0 && <div className="tt-slot none">No brachot. Dodge!</div>}
          {hud.need.map((k, i) => (
            <div key={i} className={`tt-slot ${i < hud.progress ? 'got' : i === hud.progress ? 'next' : ''}`} style={{ borderColor: TOKENS[k].color, color: TOKENS[k].color }}>
              <span lang="he" dir="rtl">{TOKENS[k].he}</span><small>{TOKENS[k].en}</small>
            </div>
          ))}
          {hud.bonus && <div className="tt-slot next bonus"><span lang="he" dir="rtl">בָּרוּךְ שֵׁם</span><small>bonus!</small></div>}
        </div>
      )}
    </>
  );
}

function TableHud() {
  const hud = useGame((s) => s.hud);
  return (
    <>
      <div className="tt-objective">{hud.objective}</div>
      <div className="tt-stats">
        <Hearts n={hud.lives ?? 3} />
        <div className={`tt-humok ${hud.humOk ? 'ok' : 'no'}`}>{hud.humOk ? '♪ humming OK' : '🤫 no humming'}</div>
        <div className="tt-score">♪ {hud.notes || 0}</div>
        {hud.eatLeft != null && <div className="tt-timer">Eat! {hud.eatLeft.toFixed(1)}s</div>}
      </div>
    </>
  );
}

function Reaction() {
  const r = useGame((s) => s.reaction);
  useAction('pick', (i) => { const o = r?.options[i]; if (o) r.onPick(o); });
  if (!r) return null;
  return (
    <div className="tt-reaction">
      <div className="tt-reaction-who">{r.who}</div>
      <div className="tt-reaction-line">{r.line}</div>
      <div className="tt-reaction-opts">
        {r.options.map((o, i) => (
          <button key={i} onClick={() => r.onPick(o)}><kbd>{i + 1}</kbd>{o.t}</button>
        ))}
      </div>
    </div>
  );
}

function Prompt() {
  const p = useGame((s) => s.prompt);
  const reaction = useGame((s) => s.reaction);
  if (!p || reaction) return null;
  return <button className="tt-prompt" onClick={() => fire('action')}>{p}</button>;
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="tt-toasts">
      {toasts.map((t) => <div key={t.id} className={`tt-toast ${t.tone}`}>{t.text}</div>)}
    </div>
  );
}

function Results() {
  const r = useGame((s) => s.results);
  const go = useGame((s) => s.go);
  useAction('action', () => go('hub'));
  if (!r) return null;
  return (
    <div className="tt-results">
      <div className="tt-results-card">
        <div className="tt-kicker">{LEVEL_NAMES[r.level]}</div>
        <h2>{r.title}</h2>
        <div className="tt-bigstars">{[0, 1, 2].map((i) => <span key={i} className={i < r.stars ? 'on' : ''}>★</span>)}</div>
        <div className="tt-results-stats">{r.stats.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <div className="tt-xpgain">+{r.xp} XP</div>
        {r.lessons?.length > 0 && (
          <div className="tt-lessons">
            <b>What you learned</b>
            <ul>{r.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
        <div className="tt-results-btns">
          <button onClick={() => go(r.level)}>↻ Play again</button>
          <button className="primary" onClick={() => go('hub')}>Back to the shul ▸</button>
        </div>
      </div>
    </div>
  );
}

function TouchControls() {
  const [isTouch, setIsTouch] = useState(false);
  const base = useRef();
  const knob = useRef();
  const screen = useGame((s) => s.screen);
  const reaction = useGame((s) => s.reaction);
  useEffect(() => { setIsTouch(window.matchMedia('(pointer: coarse)').matches); }, []);
  useEffect(() => { if (reaction) { touch.x = 0; touch.y = 0; } }, [reaction]);
  if (!isTouch || reaction) return null;
  const move = (e) => {
    const r = base.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    let x = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    touch.x = x; touch.y = y;
    knob.current.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
  };
  const stop = () => { touch.x = 0; touch.y = 0; if (knob.current) knob.current.style.transform = ''; };
  return (
    <div className="tt-touch">
      <div ref={base} className="tt-joy" onTouchStart={move} onTouchMove={move} onTouchEnd={stop} onTouchCancel={stop}>
        <div ref={knob} className="tt-knob" />
      </div>
      <div className="tt-touch-btns">
        <button onTouchStart={(e) => { e.preventDefault(); fire('action'); }}>E</button>
        {screen === 'gauntlet' && <button onTouchStart={(e) => { e.preventDefault(); fire('pulse'); }}>⚡</button>}
        {screen === 'table' && (
          <button onTouchStart={(e) => { e.preventDefault(); touch.hum = true; }} onTouchEnd={() => { touch.hum = false; }}>♪</button>
        )}
      </div>
    </div>
  );
}
