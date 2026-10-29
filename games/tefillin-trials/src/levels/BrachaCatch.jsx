import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import { Billboard, Text } from '@react-three/drei';
import { Player, player } from '../world/Player.jsx';
import { FONT } from '../world/Shul.jsx';
import { useGame } from '../store.js';
import { sfx } from '../audio.js';
import { burst } from '../fx.js';
import { good, bad } from './common.jsx';

export const TOKENS = {
  L: { he: 'לְהָנִיחַ', en: 'lehaniach', color: '#ffd84a' },
  M: { he: 'עַל מִצְוַת', en: 'al mitzvat', color: '#5fb3ff' },
  B: { he: 'בָּרוּךְ שֵׁם', en: 'Baruch Shem', color: '#ffffff' },
};

// What each shita needs, in order. bonus: Baruch Shem may be caught at the end.
export const ROUNDS = [
  { title: 'Rashi · you didn’t talk', need: ['L'], note: 'One lehaniach covers both tefillin. That’s how Sefardim (Shulchan Aruch 25:5) put them on.' },
  { title: 'Rabbeinu Tam · you didn’t talk', need: ['L', 'M'], bonus: true, note: 'Lehaniach on the shel yad, al mitzvat on the shel rosh, every day. Ashkenazim follow this (Rema) and add Baruch Shem.' },
  { title: 'Rashi · you talked in between', need: ['L', 'M'], note: 'Talking cuts the shel rosh off from the first bracha, so it gets al mitzvat (Shulchan Aruch 25:9).' },
  { title: 'Rabbeinu Tam · you talked in between', need: ['L', 'L', 'M'], bonus: true, note: 'Lehaniach on the shel yad; you talked; now the shel rosh needs lehaniach again plus al mitzvat (Rema 25:9).' },
  { title: 'Rabbeinu Tam’s tefillin: no bracha at all', need: [], dodge: 12, note: 'No bracha on Rabbeinu Tam’s pair. Catch nothing; the brachot are chasing you!' },
  { title: 'Rabbi Akiva Eiger’s tenai', need: ['L', 'M'], bonus: true, note: 'Intend that lehaniach won’t cover the shel rosh if Rashi is right. Then al mitzvat works by both. (The Pri Megadim: don’t actually do this.)' },
];

const ARENA = { x: [-13, 13], z: [-20, -4] };

export function BrachaCatch() {
  const g = useGame;
  const s = useRef({ round: 0, progress: 0, lives: 3, t: 0, roundT: 0, score: 0, phase: 'intro', bonusUntil: 0, lessons: [], gotBonus: false }).current;
  const [tokens, setTokens] = useState([]);
  const bodies = useRef(new Map());
  const nextId = useRef(0);
  const lastSpawn = useRef(0);

  const round = () => ROUNDS[s.round];
  const hud = () => g.getState().setHud({
    round: s.round + 1, rounds: ROUNDS.length, title: round()?.title, need: round()?.need, progress: s.progress,
    lives: s.lives, score: s.score, timeLeft: Math.max(0, (round()?.dodge || 25) - s.roundT), dodge: !!round()?.dodge,
    bonus: s.bonusUntil > performance.now(), objective: round()?.note,
  });

  function startRound(i) {
    s.round = i;
    s.progress = 0;
    s.roundT = 0;
    s.phase = 'play';
    s.gotBonus = false;
    s.bonusUntil = 0;
    setTokens([]);
    g.getState().toast(`Round ${i + 1}: ${ROUNDS[i].title}`, 'info');
    hud();
  }

  function finishLevel(won) {
    s.phase = 'done';
    setTokens([]);
    const stars = !won ? 0 : s.lives === 3 ? 3 : s.lives === 2 ? 2 : 1;
    if (won) sfx.great();
    setTimeout(() => g.getState().finish('catch', {
      won, stars,
      title: won ? 'Rashi and Rabbeinu Tam, both caught' : 'Too many brachot she’einan tzrichot',
      stats: [['Score', s.score], ['Lives left', '♥'.repeat(s.lives) || '0'], ['Rounds cleared', `${won ? ROUNDS.length : s.round}/${ROUNDS.length}`]],
      lessons: [
        'Rashi: “lo sach, mevarech achat” means one bracha for both; talking adds al mitzvat (#37).',
        'Rabbeinu Tam: the shel rosh always gets al mitzvat; talking adds lehaniach (#38).',
        'Shulchan Aruch: one bracha. Rema: Ashkenazim make two, plus Baruch Shem.',
        'The Gra, the Steipler, the Chazon Ish and Rav Shlomo Zalman made one bracha (#43, #44).',
        ...s.lessons,
      ].slice(0, 6),
      xp: won ? stars * 70 + s.score : 15,
    }), 1200);
  }

  function roundWon() {
    const r = round();
    s.score += 50 + Math.max(0, Math.round((25 - s.roundT) * 2));
    good(r.note, 25);
    if (s.round + 1 >= ROUNDS.length) finishLevel(true);
    else { s.phase = 'between'; setTimeout(() => startRound(s.round + 1), 1800); }
    hud();
  }

  function lose(msg) {
    s.lives -= 1;
    bad(msg);
    if (!s.lessons.includes(msg)) s.lessons.push(msg);
    hud();
    if (s.lives <= 0) finishLevel(false);
  }

  useEffect(() => {
    hud();
    const id = setTimeout(() => startRound(0), 1200);
    return () => clearTimeout(id);
  }, []);

  function spawn() {
    const r = round();
    const want = r.need[s.progress];
    const roll = Math.random();
    let type = want && roll < 0.45 ? want : ['L', 'M', 'B'][Math.floor(Math.random() * 3)];
    if (r.dodge) type = ['L', 'M', 'B'][Math.floor(Math.random() * 3)];
    const id = nextId.current++;
    // Shot out of the Aron Kodesh in an arc.
    const target = [ARENA.x[0] + Math.random() * (ARENA.x[1] - ARENA.x[0]), ARENA.z[0] + Math.random() * (ARENA.z[1] - ARENA.z[0])];
    const from = [(Math.random() - 0.5) * 3, 6.5, -21.5];
    const v = [(target[0] - from[0]) * 0.75, 7, (target[1] - from[2]) * 0.75];
    setTokens((t) => [...t.slice(-13), { id, type, from, v, born: performance.now() }]);
  }

  useFrame((_, dt) => {
    if (s.phase === 'done') return;
    if (g.getState().reaction) return;
    s.t += dt;
    if (s.phase !== 'play') return;
    s.roundT += dt;
    const r = round();
    const now = performance.now();
    if (now - lastSpawn.current > (r.dodge ? 420 : 650)) { lastSpawn.current = now; spawn(); }

    // Dodge round: brachot home in on you.
    if (r.dodge) {
      for (const b of bodies.current.values()) {
        const p = b.translation();
        const dx = player.pos.x - p.x;
        const dz = player.pos.z - p.z;
        const d = Math.hypot(dx, dz) || 1;
        b.applyImpulse({ x: (dx / d) * 0.06, y: 0, z: (dz / d) * 0.06 }, true);
      }
      if (s.roundT >= r.dodge) { roundWon(); return; }
    } else if (s.roundT > 25 && !s.bonusUntil) {
      lose('Too slow! The shel rosh has to come right after the shel yad (Baal HaMaor, #40).');
      if (s.phase === 'play') { s.roundT = 0; s.progress = 0; }
    }
    if (s.bonusUntil && now > s.bonusUntil) { s.bonusUntil = 0; roundWon(); return; }

    // Catching: walk into a bracha.
    for (const [id, b] of bodies.current) {
      const p = b.translation();
      if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) > 1.05 || p.y > 2.6) continue;
      const tok = tokens.find((x) => x.id === id);
      if (!tok || tok.caught) continue;
      tok.caught = true;
      bodies.current.delete(id);
      setTokens((t) => t.filter((x) => x.id !== id));
      burst('collect', { x: p.x, y: p.y, z: p.z });
      sfx.collect();
      catchToken(tok.type);
      break;
    }
    if (Math.floor(s.roundT * 4) !== Math.floor((s.roundT - dt) * 4)) hud();
  });

  function catchToken(type) {
    const r = round();
    if (r.dodge) return lose('Rabbeinu Tam’s tefillin go on with no bracha. That was a bracha levatala.');
    if (s.bonusUntil) {
      if (type === 'B' && !s.gotBonus) { s.gotBonus = true; s.score += 40; g.getState().toast('+40 · Baruch Shem after it’s all on: “tov lomar” (Rema).', 'good'); }
      else if (type !== 'B') lose(`An extra ${TOKENS[type].en}? That’s a bracha she’eina tzricha (the Ran).`);
      hud();
      return;
    }
    const want = r.need[s.progress];
    if (type === want) {
      s.progress += 1;
      s.score += 20;
      if (s.progress >= r.need.length) {
        if (r.bonus) { s.bonusUntil = performance.now() + 3200; g.getState().toast('All brachot said. Catch a Baruch Shem for a bonus!', 'info'); }
        else roundWon();
      }
    } else if (type === 'B') {
      lose('Baruch Shem now? Not before the shel rosh is on and tight: it’s a hefsek (Mishnah Berurah 25:21).');
    } else {
      lose(`${TOKENS[type].en} isn’t what this shita needs here.`);
    }
    hud();
  }

  // Tokens expire after a while.
  useEffect(() => {
    const id = setInterval(() => setTokens((t) => t.filter((x) => performance.now() - x.born < 9000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Player start={[6, 1, -8]} yad rosh={false} />
      {tokens.map((t) => <Token key={t.id} t={t} bodies={bodies.current} />)}
      <pointLight position={[0, 6, -12]} intensity={30} color="#9fc4ff" distance={20} />
    </>
  );
}

function Token({ t, bodies }) {
  const ref = useRef();
  const info = TOKENS[t.type];
  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    bodies.set(t.id, b);
    b.setLinvel({ x: t.v[0], y: t.v[1], z: t.v[2] }, true);
    return () => bodies.delete(t.id);
  }, []);
  return (
    <RigidBody ref={ref} position={t.from} colliders={false} restitution={0.85} friction={0.2} linearDamping={0.25}>
      <BallCollider args={[0.42]} />
      <mesh castShadow>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={1.4} toneMapped={false} roughness={0.2} />
      </mesh>
      <Billboard position={[0, 0.85, 0]}>
        <Text font={FONT} fontSize={0.38} color={info.color} outlineWidth={0.02} outlineColor="#000" anchorX="center" direction="rtl">{info.he}</Text>
      </Billboard>
    </RigidBody>
  );
}
