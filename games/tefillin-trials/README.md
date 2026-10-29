# Hineni: The Tefillin Trials

3D game for Hilchot Tefillin, siman 25, served at `/tefillin-trials`. It's a standalone Vite app
so it can use current three/R3F without touching the site's pinned three@0.155 and React 19 setup.

- `src/content.js`: every ruling, line and source (SCP chabura #3, sheet #36-57, and the shiur).
- `src/levels/`: Hub (poskim to talk to), Gauntlet, BrachaCatch, ShabbosTable.
- Stack: @react-three/fiber, drei (KeyboardControls, Text, Html, Trail, Float, Sparkles, Outlines,
  MeshReflectorMaterial, Environment/Lightformer, Instances, PerformanceMonitor), @react-three/rapier
  (player, kinematic NPCs, sensors, flying phones and brachot), yuka (pursuit/flee/wander/arrive,
  obstacle avoidance, state machines), three.quarks (bursts and emitters), @react-three/postprocessing.

Build (writes to `public/games/tefillin-trials/`, which is committed; the Astro page reads its manifest):

    npm install
    npm run build

`?nopost`, `?nofx`, `?noreflect`, `?noenv` switch features off for debugging.
