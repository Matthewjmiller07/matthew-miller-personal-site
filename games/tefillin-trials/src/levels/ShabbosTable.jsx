import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sparkles } from '@react-three/drei';
import { Player, player } from '../world/Player.jsx';
import { Agent, useYukaWorld, makeAgent, addBehavior, only, ArriveBehavior, YV3 } from '../world/Crowd.jsx';
import { LOOKS } from '../world/Person.jsx';
import { useGame, touch } from '../store.js';
import { useAction, held } from '../input.js';
import { sfx, humNote } from '../audio.js';
import { burst } from '../fx.js';
import { good, bad, shuffle } from './common.jsx';

const TABLE_Z = 20.5;
const SINK = [-14.5, 21];
const SEATS = [[-3, 19.3], [0, 19.3], [3, 19.3], [-3, 21.7], [0, 21.7], [3, 21.7]];

export function ShabbosTable() {
  const world = useYukaWorld();
  const g = useGame;
  const s = useRef({ t: 0, phase: 'intro', notes: 0, lives: 3, lastNote: 0, lastPenalty: 0, ate: false, eatBy: 0, lessons: [], queue: [] }).current;
  const [challot, setChallot] = useState([]);
  const loaves = useRef(new Map());

  const cast = useMemo(() => {
    const host = makeAgent(world, { x: 5.6, z: TABLE_Z, maxSpeed: 0, wander: false, look: LOOKS.host, name: 'Host' });
    host.faceTarget = { x: 0, z: TABLE_Z };
    const guests = SEATS.map(([x, z], i) => {
      const v = makeAgent(world, {
        x, z, maxSpeed: 3, wander: false,
        look: i === 4 ? LOOKS.kid : { robe: ['#3a2e5a', '#1d2433', '#5a2e2e', '#2e5a4b', '#2a2a2a', '#4a3a1a'][i], kippah: ['#fff', '#111', '#2c5aa0', '#e0b54a', '#111', '#c0392b'][i], beard: i % 2 ? '#3a2a1a' : null },
      });
      v.seat = new YV3(x, 0, z);
      v.sink = new YV3(SINK[0] + 1.2, 0, SINK[1] - 1 + (i % 3) * 0.8);
      addBehavior(v, 'go', new ArriveBehavior(v.seat, 1.5, 0.2), 1);
      v.faceTarget = { x, z: TABLE_Z };
      return v;
    });
    return { host, guests, kid: guests[4] };
  }, [world]);

  const hud = () => g.getState().setHud({
    phase: s.phase, notes: s.notes, lives: s.lives,
    eatLeft: s.phase === 'hamotzi' ? Math.max(0, (s.eatBy - s.t)) : null,
    humOk: s.phase === 'washing' || s.phase === 'zemirot',
    objective: {
      intro: 'You washed first. Take your seat…',
      washing: 'Hold H (or ♪) to hum while the others wash',
      hamotzi: 'Hamotzi! No humming. Grab a piece of challah (E) and eat',
      zemirot: 'Zemirot! Sing it out',
      done: '',
    }[s.phase],
  });

  const lesson = (t) => { if (!s.lessons.includes(t)) s.lessons.push(t); };

  useEffect(() => {
    hud();
    g.getState().toast('Shabbat night. You washed first and sat down. 20 guests still to wash…', 'info');
    return () => g.getState().setReaction(null);
  }, []);

  function sendNextToWash() {
    const v = s.queue.shift();
    if (!v) return;
    v.faceTarget = null;
    v.behaviors.go.target = v.sink;
    v.washing = true;
    setTimeout(() => { v.behaviors.go.target = v.seat; setTimeout(() => { v.faceTarget = { x: v.seat.x, z: TABLE_Z }; v.washing = false; }, 3500); }, 3800);
  }

  async function hostShh() {
    cast.host.setSay?.({ who: 'Host', text: 'Shh! You can’t sing now, we’re between washing and Hamotzi!' });
    sfx.talk();
    await new Promise((resolve) => g.getState().setReaction({
      who: 'The host', line: '“Shh! No singing between netilat yadayim and Hamotzi!”',
      options: shuffle([
        { t: 'Keep humming softly. The washing is done, and Rav Chaim Kanievsky hummed here', ok: true },
        { t: 'Panic: go wash again', why: 'Even if you had spoken, you wouldn’t wash again. The netilah was already complete.' },
        { t: 'Stop and never sing at a Shabbat meal again', why: 'Too strict! Before Hamotzi a wordless niggun is fine (Ela Dalet Amot, #48).' },
      ]),
      onPick: (o) => {
        g.getState().setReaction(null);
        const why = 'Between netilah and Hamotzi the mitzvah of washing is done. The Rambam allows talking if your mind stays on the meal; Shulchan Aruch: “טוב ליזהר”. Rav Chaim wasn’t makpid on “nu nu” and hummed niggunim (#48). Rav Elyashiv was makpid.';
        if (o.ok) good(why, 20); else { bad(o.why); s.lives -= 1; }
        lesson(why);
        resolve();
      },
    }));
    cast.host.setSay?.(null);
  }

  function hamotzi() {
    s.phase = 'hamotzi';
    s.eatBy = s.t + 9;
    cast.host.setSay?.({ who: 'Host', text: 'Baruch Atah… hamotzi lechem min ha’aretz!' });
    cast.kid.setSay?.({ who: 'Kid', text: 'LAI LAI LAI!! 🎵' });
    cast.kid.motion.wave = true;
    sfx.good();
    // Toss challah pieces down the table, Rapier style.
    const pieces = Array.from({ length: 7 }, (_, i) => ({
      id: i, from: [5.2, 1.6, TABLE_Z], v: [-3 - Math.random() * 9, 4 + Math.random() * 2, (Math.random() - 0.5) * 6],
    }));
    setChallot(pieces);
    hud();
  }

  useAction('action', () => {
    if (s.phase !== 'hamotzi' || s.ate || g.getState().reaction) return;
    for (const [id, b] of loaves.current) {
      const p = b.translation();
      if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 1.6) {
        s.ate = true;
        setChallot((c) => c.filter((x) => x.id !== id));
        burst('hineni', { x: p.x, y: p.y + 0.5, z: p.z });
        const fast = s.eatBy - s.t;
        good(`Ate the challah, ${fast > 5 ? 'fast!' : 'just in time.'} After Hamotzi, eat right away and don’t hum first (Beit Yehudi, #49).`, Math.round(fast * 6));
        lesson('After Hamotzi: no niggun until you eat (Beit Yehudi, #49). Between the shel yad and the shel rosh works like this, not like before Hamotzi.');
        cast.host.setSay?.(null);
        cast.kid.setSay?.(null);
        cast.kid.motion.wave = false;
        s.phase = 'zemirot';
        s.zemirotEnd = s.t + 12;
        g.getState().toast('Zemirot! Now sing your heart out.', 'good');
        hud();
        return;
      }
    }
    g.getState().toast('Get closer to a piece of challah.', 'info');
  });

  function end() {
    s.phase = 'done';
    const clean = s.lives === 3;
    const stars = s.lives <= 0 ? 0 : clean && s.notes >= 30 ? 3 : s.lives >= 2 ? 2 : 1;
    sfx.great();
    for (let i = 0; i < 4; i++) setTimeout(() => burst('firework', { x: (Math.random() - 0.5) * 8, y: 5, z: TABLE_Z - 2 }), i * 250);
    lesson('So between the shel yad and the shel rosh: no humming. The lehaniach is already waiting on the shel rosh, like Hamotzi waiting on the bread.');
    setTimeout(() => g.getState().finish('table', {
      won: s.lives > 0, stars,
      title: s.lives > 0 ? 'Gut Shabbos!' : 'The challah got cold',
      stats: [['Notes hummed (when allowed)', s.notes], ['Lives left', '♥'.repeat(Math.max(0, s.lives)) || '0']],
      lessons: s.lessons.slice(0, 5),
      xp: stars * 60 + s.notes,
    }), 1400);
  }

  useFrame((_, dt) => {
    if (s.phase === 'done' || g.getState().reaction) return;
    s.t += dt;
    if (s.phase === 'intro' && s.t > 2.5) {
      s.phase = 'washing';
      s.queue = shuffle([...cast.guests]);
      hud();
    }
    if (s.phase === 'washing') {
      if (!s.nextWash || s.t > s.nextWash) { s.nextWash = s.t + 3.2; sendNextToWash(); }
      if (!s.shhDone && s.t > 10) { s.shhDone = true; hostShh(); }
      if (s.t > 24 && cast.guests.every((v) => !v.washing)) hamotzi();
    }
    if (s.phase === 'hamotzi' && s.t > s.eatBy) {
      s.lives -= 1;
      bad('The bracha was waiting on the bread! Eat right after Hamotzi.');
      s.eatBy = s.t + 6;
      if (s.lives <= 0) return end();
      hud();
    }
    if (s.phase === 'zemirot' && s.t > s.zemirotEnd) return end();

    // Humming
    const humming = held.hum || touch.hum;
    if (humming && s.t - s.lastNote > 0.3) {
      s.lastNote = s.t;
      humNote();
      burst('hum', { x: player.pos.x, y: player.pos.y + 1.4, z: player.pos.z });
      if (s.phase === 'washing' || s.phase === 'zemirot') s.notes += s.phase === 'zemirot' ? 2 : 1;
      if (s.phase === 'hamotzi' && s.t - s.lastPenalty > 2) {
        s.lastPenalty = s.t;
        s.lives -= 1;
        bad('After Hamotzi, no niggun before you eat (Beit Yehudi, #49).');
        lesson('After Hamotzi, no niggun before you eat (Beit Yehudi, #49).');
        if (s.lives <= 0) return end();
      }
    }
    if (Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) hud();
  });

  return (
    <>
      <Player start={[-6.4, 1, TABLE_Z]} yad={false} rosh={false} />
      <Agent v={cast.host} />
      {cast.guests.map((v, i) => <Agent key={i} v={v} />)}
      {/* table */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4.8, 0.45, 0.85]} position={[0, 0.45, TABLE_Z]} />
      </RigidBody>
      <mesh position={[0, 0.88, TABLE_Z]} castShadow receiveShadow><boxGeometry args={[9.6, 0.08, 1.7]} /><meshStandardMaterial color="#f5f1e6" roughness={0.9} /></mesh>
      {[[-4.5, -0.7], [4.5, -0.7], [-4.5, 0.7], [4.5, 0.7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.42, TABLE_Z + z]}><boxGeometry args={[0.1, 0.84, 0.1]} /><meshStandardMaterial color="#4a2e18" /></mesh>
      ))}
      {/* candles */}
      {[-0.4, 0.4].map((x) => (
        <group key={x} position={[x, 0.92, TABLE_Z]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.4]} /><meshStandardMaterial color="#fff8e8" /></mesh>
          <mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.05]} /><meshStandardMaterial color="#ffb347" emissive="#ff9a2a" emissiveIntensity={6} toneMapped={false} /></mesh>
          <pointLight position={[0, 0.5, 0]} intensity={2.5} distance={5} color="#ffb347" />
        </group>
      ))}
      {/* challot under their cover */}
      <mesh position={[4.6, 1.02, TABLE_Z]}><boxGeometry args={[0.9, 0.18, 0.5]} /><meshStandardMaterial color="#6d0f1c" /></mesh>
      {/* the sink and the washing cup */}
      <group position={[SINK[0], 0, SINK[1]]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.4, 1, 1]} /><meshStandardMaterial color="#d8d8de" metalness={0.3} roughness={0.3} /></mesh>
        <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.13, 0.11, 0.25, 16]} /><meshStandardMaterial color="#c9a24a" metalness={1} roughness={0.25} /></mesh>
        <Sparkles count={20} scale={[1.5, 1.2, 1.2]} position={[0, 1.2, 0]} size={3} color="#9fd7ff" speed={1} />
      </group>
      {challot.map((c) => <Challah key={c.id} c={c} loaves={loaves.current} />)}
    </>
  );
}

function Challah({ c, loaves }) {
  const ref = useRef();
  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    loaves.set(c.id, b);
    b.setLinvel({ x: c.v[0], y: c.v[1], z: c.v[2] }, true);
    b.setAngvel({ x: Math.random() * 4, y: Math.random() * 4, z: Math.random() * 4 }, true);
    return () => loaves.delete(c.id);
  }, []);
  return (
    <RigidBody ref={ref} position={c.from} colliders={false} restitution={0.3} friction={0.8}>
      <CuboidCollider args={[0.22, 0.1, 0.13]} />
      <mesh castShadow>
        <capsuleGeometry args={[0.11, 0.25, 6, 12]} />
        <meshStandardMaterial color="#c8873a" roughness={0.6} emissive="#5a3510" emissiveIntensity={0.4} />
      </mesh>
    </RigidBody>
  );
}
