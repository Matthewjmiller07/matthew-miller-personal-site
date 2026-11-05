# Hineni: The Tefillin Trials

3D game for Hilchot Tefillin, simanim 25–27, served at `/tefillin-trials`. It's a standalone Vite app
so it can use current three/R3F without touching the site's pinned three@0.155 and React 19 setup.

- `src/content.js`: every ruling, line and source (SCP chabura #3, sheet #36-57, and the shiur).
- `src/levels/`: Hub (poskim to talk to), Gauntlet, BrachaCatch, ShabbosTable, and World 2's
  TefillinStand (out on `src/world/Street.jsx`: which arm, where on the muscle, when to bless;
  SCP chabura #4, sheet #52-75).
- Stack: @react-three/fiber, drei (KeyboardControls, Text, Html, Trail, Float, Sparkles, Outlines,
  MeshReflectorMaterial, Environment/Lightformer, Instances, PerformanceMonitor), @react-three/rapier
  (player, kinematic NPCs, sensors, flying phones and brachot), yuka (pursuit/flee/wander/arrive,
  obstacle avoidance, state machines), three.quarks (bursts and emitters), @react-three/postprocessing.

Build (writes to `public/games/tefillin-trials/`, which is committed; the Astro page reads its manifest):

    npm install
    npm run build

Deep links: `?level=stand` (or `gauntlet`, `catch`, `table`; aliases like `hefsek`, `hum`, `yad-keha`),
`?shiur=4` / `?world=2` for a shiur's world, `?leaderboard` to open the leaderboard. The address bar
follows you as you move between levels (`src/nav.js`, worlds listed in `SHIURIM` in `src/content.js`).

Leaderboard: `/api/tefillin-trials` (site API route) over Supabase `tefillin_trials_scores`
(`tefillin-trials-supabase-setup.sql`). Each finished run can post its XP.

`?nopost`, `?nofx`, `?noreflect`, `?noenv` switch features off for debugging.
