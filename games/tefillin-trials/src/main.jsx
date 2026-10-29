import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { useGame } from './store.js';
import { player } from './world/Player.jsx';
import { fxRef } from './fx.js';
import './styles.css';

// Handy for poking at the game from the console.
window.__tt = useGame;
window.__player = player;
window.__fx = fxRef;

const el = document.getElementById('tefillin-trials-root');
if (el) createRoot(el).render(<App />);
