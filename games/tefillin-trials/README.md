# Hineni: The Tefillin Trials

3D game for Hilchot Tefillin, simanim 25–27, one level per shiur of the SCP chabura, served at
`/tefillin-trials`. It's a standalone Vite app so it can use current three/R3F without touching the
site's pinned three@0.155 and React 19 setup.

The same build makes two games from one source tree:

- `index.html` → the full game (`/tefillin-trials`): React Three Fiber, physics, post-processing.
- `lite.html` → **Hineni Lite** (`/tefillin-trials/lite`): every level again on plain three.js
  (`src/lite/`), about a sixth of the download, and playable in VR (WebXR, `src/lite/vr.js`). It shares
  `content.js`, `nav.js`, `layout.js`, `ward-rules.js`, the stylesheet and the save data with the full game.
- `knots.html` → **the Knot Explorer** (`/tefillin-trials/knots`, `src/knots/`): a 3D shel yad on an arm and
  every way to tie it and keep the yud by the bayit (Shiur 6, sheet #81-94, and the video from the shiur).
  Methods live in `src/knots/data.js`; `?m=chabad` links straight to one.

Levels by shiur (`SHIURIM` in `src/content.js`):

| Shiur | Level id | Where | Sheet |
|---|---|---|---|
| 3 | `gauntlet`, `catch`, `table` | the shul | #36-51 |
| 4 | `stand` | the street corner | #52-75 |
| 5 | `ward` | the rehab ward | #71-91 |
| 6 | `check` | the scanner at the shul door | #86-111 |

To add a shiur: its content in `content.js` and an entry in `SHIURIM`, a level in `src/levels/` (wired in
`App.jsx`, `UI.jsx`, a portal in `Hub.jsx`) and one in `src/lite/` (wired in `lite/main.js` and the hub
portals in `lite/levels-shul.js`), the id in `nav.js`, the API's `LEVELS`, and the Supabase level check.

- `src/content.js`: every ruling, line and source (SCP chaburot #3-#6, their sheets, and the shiurim).
- `src/levels/`: Hub (poskim to talk to), Gauntlet, BrachaCatch, ShabbosTable (Shiur 3);
  TefillinStand (Shiur 4, on `src/world/Street.jsx`: which arm, where on the muscle, when to bless);
  WardRounds (Shiur 5, on `src/world/Ward.jsx`: amputees, which arm and whether to bless, the yud);
  Checkpoint (Shiur 6, in the shul: chatzitzah and keeping the yud by the bayit).
- Stack: @react-three/fiber, drei (KeyboardControls, Text, Html, Trail, Float, Sparkles, Outlines,
  MeshReflectorMaterial, Environment/Lightformer, Instances, PerformanceMonitor), @react-three/rapier
  (player, kinematic NPCs, sensors, flying phones and brachot), yuka (pursuit/flee/wander/arrive,
  obstacle avoidance, state machines), three.quarks (bursts and emitters), @react-three/postprocessing.

Build (writes to `public/games/tefillin-trials/`, which is committed; the Astro page reads its manifest):

    npm install
    npm run build

Deep links (both versions): `?shiur=6` or `?level=6` for a shiur, `?level=stand` (or `gauntlet`, `catch`,
`table`, `ward`, `check`; aliases like `hefsek`, `hum`, `yad-keha`, `gidem`, `chatzitzah`), `?leaderboard`
to open the leaderboard.

VR (Lite only): the Enter VR button appears when a headset can start a session. Left stick walks where
you look, right stick snap-turns, right trigger points at the floating panel and picks (or acts), right
grip = B, A = Do Not Disturb pulse, left trigger hums, left grip = F, X = M, Y/B = Amen. Tested with
Meta's IWER emulator in Playwright. The address bar
follows you as you move between levels (`src/nav.js`, worlds listed in `SHIURIM` in `src/content.js`).

Leaderboard: `/api/tefillin-trials` (site API route) over Supabase `tefillin_trials_scores`
(`tefillin-trials-supabase-setup.sql`). Each finished run can post its XP.

`?nopost`, `?nofx`, `?noreflect`, `?noenv` switch features off for debugging.
