import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Player, player } from '../world/Player.jsx';
import { Agent, useYukaWorld, makeAgent, machine, FnState, only , STILL } from '../world/Crowd.jsx';
import { LOOKS } from '../world/Person.jsx';
import { Portal } from './common.jsx';
import { useGame } from '../store.js';
import { useAction } from '../input.js';
import { POSKIM, WHO_SAID } from '../content.js';
import { sfx } from '../audio.js';
import { burst } from '../fx.js';

const ROBES = ['#101218', '#1d2433', '#2a2a2a', '#3a2e22', '#1b2a3a', '#26202e'];

function freeSpot(obstacles) {
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() * 2 - 1) * 15;
    const z = (Math.random() * 2 - 1) * 19;
    if (obstacles.every((o) => Math.hypot(o.position.x - x, o.position.z - z) > o.boundingRadius + 0.6)) return [x, z];
  }
  return [0, 10];
}

export function Hub() {
  const world = useYukaWorld();
  const stars = useGame((s) => s.stars);
  const go = useGame((s) => s.go);
  const [near, setNear] = useState(null);
  const promptOwned = useRef(false);

  const poskim = useMemo(() => WHO_SAID.map((w, i) => {
    const p = POSKIM[w.who];
    const [x, z] = freeSpot(world.obstacles);
    const old = /Rav|Rabbi|Chaim|Steipler|Chafetz|Moshe|Elyashiv|Yosef|Mahari|Akiva|Maor|Ran|Megadim|Magen/.test(p.name);
    const v = makeAgent(world, {
      x, z, maxSpeed: 1.1, id: w.who, name: p.name,
      look: { robe: ROBES[i % ROBES.length], hat: old ? 'fedora' : 'kippah', kippah: p.color, beard: old ? (i % 3 ? '#e2e2e2' : '#3b2a1a') : null, tallit: i % 4 === 0 },
    });
    v.saying = w.t;
    v.color = p.color;
    v.fsm = machine(v, {
      wander: new FnState((o) => { o.faceTarget = null; o.maxSpeed = o.baseSpeed; only(o, 'wander'); o.motion.daven = Math.random() < 0.4; }),
      talk: new FnState(
        (o) => { o.maxSpeed = STILL; o.velocity.set(0, 0, 0); o.faceTarget = player.pos; o.motion.talk = true; o.motion.daven = false; o.until = performance.now() + 7000; },
        (o) => { if (performance.now() > o.until) o.fsm.changeTo('wander'); },
        (o) => { o.motion.talk = false; o.setSay?.(null); },
      ),
    }, 'wander');
    return v;
  }), [world]);

  const extras = useMemo(() => {
    const kid = makeAgent(world, { x: 3, z: 6, maxSpeed: 4.5, look: LOOKS.kid });
    kid.behaviors.wander.jitter = 12;
    const chazan = makeAgent(world, { x: 0, z: -0.8, maxSpeed: 0, wander: false, look: LOOKS.chazan });
    chazan.motion.daven = true;
    chazan.faceTarget = { x: 0, z: -24 };
    return { kid, chazan };
  }, [world]);

  useFrame(() => {
    for (const v of poskim) v.fsm.update();
    let best = null;
    let bestD = 2.2;
    for (const v of poskim) {
      const d = Math.hypot(v.position.x - player.pos.x, v.position.z - player.pos.z);
      if (d < bestD) { best = v; bestD = d; }
    }
    if (best !== near) setNear(best);
    const g = useGame.getState();
    if (best) {
      promptOwned.current = true;
      g.setPrompt(`E · ask ${best.name}`);
    } else if (promptOwned.current) {
      promptOwned.current = false;
      g.setPrompt(null);
    }
  });

  useAction('action', () => {
    const v = near;
    if (!v || useGame.getState().reaction) return;
    v.fsm.changeTo('talk');
    v.setSay?.({ who: v.name, text: v.saying });
    sfx.talk();
    const fresh = useGame.getState().learn(v.uid);
    if (fresh) {
      sfx.collect();
      burst('collect', { x: v.position.x, y: 2, z: v.position.z });
      useGame.getState().toast(`+20 XP · ${v.name} joins your sefer (${useGame.getState().sayings.length}/${WHO_SAID.length})`);
    }
  });

  return (
    <>
      <Player start={[0, 1, 19]} yad rosh />
      {poskim.map((v) => (
        <Agent key={v.uid} v={v} label={v === near ? v.name : null} labelColor={v.color} highlight={v === near} />
      ))}
      <Agent v={extras.kid} />
      <group position={[0, 1.2, 0]}><Agent v={extras.chazan} height={2.1} /></group>
      <Portal position={[-12, 0, 20.5]} color="#ff5a4a" title="The Hefsek Gauntlet" he="הֶפְסֵק" stars={stars.gauntlet || 0} onEnter={() => go('gauntlet')} />
      <Portal position={[12, 0, 20.5]} color="#5fb3ff" title="Bracha Catch" he="רַשִׁ״י · רַבֵּנוּ תָּם" stars={stars.catch || 0} onEnter={() => go('catch')} />
      <Portal position={[-12, 0, -20]} color="#7ad1a8" title="Hum or Hush" he="נִגּוּן" stars={stars.table || 0} onEnter={() => go('table')} />
    </>
  );
}
