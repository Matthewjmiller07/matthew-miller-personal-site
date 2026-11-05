import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { useGame } from './store.js';
import { player } from './world/Player.jsx';
import { fxRef } from './fx.js';
import './styles.css';
import { sfx } from './audio.js';

// Deep links can start in a level with no click on the title screen, so wake the audio on the
// first gesture.
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => sfx.unlock(), { once: true, capture: true });

// Handy for poking at the game from the console.
window.__tt = useGame;
window.__player = player;
window.__fx = fxRef;

const el = document.getElementById('tefillin-trials-root');
if (el) createRoot(el).render(<App />);
