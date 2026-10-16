// The "Talk to Noa" conversation, shared by /kolnoa/noa and the Chrome extension
// (extensions/noa, built by scripts/kolnoa/build_noa_extension.mjs). It drives markup with the
// nn-* ids used in both. `base` prefixes image and audio paths; `api` is where answers go.
type Text = string | { m: string; f: string };
type Reply = { pose: string; he: Text; en: string };
type Q = { he: Text; en: string; hints: [string, string][] | { m: [string, string][]; f: [string, string][] }; replies: Record<string, Reply> };
export type NoaData = { questions: Record<string, Q>; generic: Record<string, Reply>; intro: Reply; bye: Reply; openers: string[]; audio: Record<string, string> };

const ROUNDS = 6;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function mountNoa(D: NoaData, opts: { base?: string; api?: string } = {}) {
  const base = opts.base ?? '';
  const api = opts.api ?? '/api/kolnoa-noa';
  const $ = (id: string) => document.getElementById(id)!;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const store = {
    get(k: string, d: string) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} },
  };

  let gender: 'm' | 'f' = 'm';
  const pick = <T,>(v: T | { m: T; f: T }): T => (v && typeof v === 'object' && !Array.isArray(v) && 'm' in (v as any) ? (v as any)[gender] : v) as T;
  let queue: string[] = [];
  let qid = '';
  let misses = 0;
  let hearts = 0, sparkles = 0, answered = 0, step = 0;
  let results: ('yes' | 'no' | '')[] = [];
  let lastSaid = '';
  let run = 0; // bumps on restart/skip so a stale turn stops mid-sequence

  const input = $('nn-answer') as HTMLInputElement;
  const sendBtn = $('nn-send') as HTMLButtonElement;
  const setTurn = (mine: boolean) => {
    sendBtn.disabled = !mine;
    sendBtn.textContent = 'Answer';
    if (mine) input.focus({ preventScroll: true });
  };

  // ---------- voice ----------
  // Every Noa line is pre-recorded (scripts/kolnoa/noa_voice.mjs). Each line plays to the end
  // before the next one starts; muted, she pauses about as long as it takes to read the line.
  let muted = store.get('kolnoa:noa:muted', '0') === '1';
  // One element for every line: Safari only lets an element play sound after a tap has
  // started it once, and the gender buttons do that.
  const voiceEl = new Audio();
  let audio: HTMLAudioElement | null = null;
  const renderMute = () => ($('nn-mute').textContent = muted ? '🔇 Sound off' : '🔊 Sound on');
  renderMute();
  function stopVoice() {
    audio?.pause();
    audio = null;
    $('nn-bubble').classList.remove('talking');
  }
  function play(text: string): Promise<void> {
    stopVoice();
    lastSaid = text;
    const src = D.audio[text];
    const readTime = wait(Math.max(1200, text.length * 70));
    if (muted || !src) return readTime;
    return new Promise((resolve) => {
      const a = voiceEl;
      a.src = base + src;
      audio = a;
      const done = () => { if (audio === a) stopVoice(); resolve(); };
      a.onended = done;
      a.onerror = () => readTime.then(done);
      $('nn-bubble').classList.add('talking');
      a.play().catch(() => readTime.then(done)); // autoplay blocked: fall back to reading time
    });
  }

  // A short rising chime for an answer Noa understood (synthesised, so nothing to download).
  let ctx: AudioContext | null = null;
  function chime(natural: boolean) {
    if (muted) return;
    try {
      ctx ??= new AudioContext();
      const notes = natural ? [784, 988, 1175, 1568] : [784, 988, 1175];
      notes.forEach((f, i) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        const t = ctx!.currentTime + i * 0.09;
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g).connect(ctx!.destination);
        o.start(t);
        o.stop(t + 0.4);
      });
    } catch {}
  }

  // ---------- Noa ----------
  const img = $('nn-img') as HTMLImageElement;
  const stage = img.parentElement!;
  function pose(p: string) {
    img.src = `${base}/images/kolnoa/noa-${p}.webp`;
    img.classList.remove('pop');
    void img.offsetWidth;
    img.classList.add('pop');
  }
  async function noaSays(line: Reply, p = line.pose, log = true) {
    const he = pick(line.he);
    pose(p);
    $('nn-bhe').textContent = he;
    $('nn-ben').textContent = line.en;
    if (log) addLog('noa', he, line.en);
    await play(he);
  }
  function addLog(who: 'noa' | 'me', he: string, en = '', tag = '', cls = '') {
    const li = document.createElement('li');
    li.className = `${who} ${cls}`;
    li.innerHTML = `<div class="he">${esc(he)}</div>${en ? `<div class="en"${who === 'noa' && !showEn() ? ' hidden' : ''}>${esc(en)}</div>` : ''}${tag ? `<div class="tag">${esc(tag)}</div>` : ''}`;
    $('nn-log').appendChild(li);
    $('nn-log').scrollTop = 1e6;
  }
  function renderHearts(bump = false) {
    $('nn-hearts').innerHTML = '♥'.repeat(hearts) + (sparkles ? ` <i>${'✦'.repeat(sparkles)}</i>` : '');
    if (bump) restart($('nn-hearts'), 'bump');
  }
  function renderSteps() {
    $('nn-steps').innerHTML =
      results.map((r, i) => `<span class="${r}${i === step && !r ? ' now' : ''}">${r === 'yes' ? '♥' : i + 1}</span>`).join('') +
      `<b>${Math.min(step + 1, results.length)} / ${results.length}</b>`;
  }
  const restart = (el: HTMLElement, cls: string) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  // The moment an answer lands: a banner over Noa, a burst of hearts, a chime, a green answer.
  function badge(kind: 'yes' | 'no', he: string, en: string) {
    const b = $('nn-badge');
    b.className = `nn-badge ${kind}`;
    b.innerHTML = `${kind === 'yes' ? '✓ ' : ''}<bdi lang="he">${he}</bdi> ${en}`;
    b.hidden = false;
    restart(b, 'show');
  }
  function burst(natural: boolean) {
    const box = document.createElement('div');
    box.className = 'nn-burst';
    const marks = natural ? ['♥', '✦', '♥', '✦', '♥', '★', '♥', '✦', '♥', '✦'] : ['♥', '♥', '✦', '♥', '♥', '♥', '✦', '♥'];
    marks.forEach((m, i) => {
      const s = document.createElement('span');
      const a = (i / marks.length) * Math.PI * 2 + Math.random() * 0.5;
      const d = 90 + Math.random() * 70;
      s.textContent = m;
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * d - 40}px`);
      s.style.animationDelay = `${i * 25}ms`;
      if (m !== '♥') s.className = 'gold';
      box.appendChild(s);
    });
    stage.appendChild(box);
    setTimeout(() => box.remove(), 1400);
  }
  const showEn = () => ($('nn-showen') as HTMLInputElement).checked;
  $('nn-showen').addEventListener('change', () => {
    $('nn-ben').hidden = !showEn();
    $('nn-log').querySelectorAll('.noa .en').forEach((e) => ((e as HTMLElement).hidden = !showEn()));
  });

  // ---------- conversation ----------
  const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  async function start(g: 'm' | 'f') {
    const me = ++run;
    gender = g;
    hearts = sparkles = answered = 0;
    step = -1;
    renderHearts();
    const rest = shuffle(Object.keys(D.questions).filter((k) => !D.openers.includes(k)));
    queue = [...D.openers, ...rest].slice(0, ROUNDS);
    results = queue.map(() => '');
    $('nn-start').hidden = true;
    $('nn-end').hidden = true;
    $('nn-talk').hidden = false;
    $('nn-log').innerHTML = '';
    $('nn-badge').hidden = true;
    setTurn(false);
    // Warm the cache with all her lines (~400 KB) so there's no gap between them.
    if (!(window as any)._nnWarm) {
      (window as any)._nnWarm = true;
      Object.values(D.audio).forEach((src) => fetch(base + src).catch(() => {}));
    }
    await noaSays(D.intro);
    if (me !== run) return;
    await wait(400);
    if (me === run) nextQuestion();
  }

  async function nextQuestion() {
    const me = ++run;
    qid = queue.shift() ?? '';
    misses = 0;
    step++;
    renderSteps();
    $('nn-hints').hidden = true;
    input.value = '';
    if (!qid) return finish();
    setTurn(false);
    const q = D.questions[qid];
    await noaSays({ pose: 'listen', he: q.he, en: q.en });
    if (me === run) setTurn(true);
  }

  async function finish() {
    stopVoice();
    $('nn-talk').hidden = true;
    $('nn-end').hidden = false;
    $('nn-sum').textContent = `${hearts} ♥ for answers Noa understood, ${sparkles} ✦ for natural Hebrew, from ${answered} answers.`;
    await noaSays(D.bye, 'cheer', false);
  }

  async function send(e?: Event) {
    e?.preventDefault();
    const answer = input.value.trim();
    if (!answer || !qid || sendBtn.disabled) return;
    const me = run;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Noa is thinking…';
    stopVoice();
    pose('think');
    let r: any;
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: qid, g: gender, answer }),
      });
      r = await res.json();
      if (!res.ok) throw new Error(r.error || res.statusText);
    } catch (err: any) {
      pose('oops');
      $('nn-bhe').textContent = 'אוי, משהו נתקע.';
      $('nn-ben').textContent = `Oops, something got stuck (${err.message}). Try again?`;
      setTurn(true);
      return;
    }
    if (me !== run) return;

    answered++;
    const q = D.questions[qid];
    const fits = !!q.replies[r.reply];
    const natural = fits && r.natural != null && r.natural >= 0.5;
    const reply: Reply = q.replies[r.reply] ?? D.generic[r.reply] ?? D.generic.offtopic;
    input.value = '';
    sendBtn.textContent = '…';

    if (fits) {
      hearts++;
      if (natural) sparkles++;
      results[step] = 'yes';
      const tag = r.natural == null ? '✓ Noa understood you  +♥' : natural ? '✓ Noa understood you  +♥  ✦ natural Hebrew' : '✓ Noa understood you  +♥  (the Hebrew could be smoother)';
      addLog('me', answer, '', tag, 'yes');
      badge('yes', 'נכון!', natural ? 'Perfect Hebrew ✦' : 'Noa understood you');
      burst(natural);
      chime(natural);
      pose(reply.pose === 'oops' || reply.pose === 'think' ? 'clap' : reply.pose);
      renderHearts(true);
      renderSteps();
      await wait(650);
      if (me !== run) return;
    } else {
      results[step] = 'no';
      const tag = r.reply === 'english' ? '✗ Try it in Hebrew' : "✗ Noa didn't follow — try again";
      addLog('me', answer, '', tag, 'no');
      badge('no', r.reply === 'english' ? 'בעברית!' : 'הממ…', r.reply === 'english' ? 'In Hebrew, please' : 'Try again');
      restart($('nn-form'), 'shake');
      renderSteps();
    }

    // Her reaction plays to the end before anything else happens.
    await noaSays(reply);
    if (me !== run) return;
    await wait(500);
    if (me !== run) return;
    if (fits) return nextQuestion();

    // She didn't follow: ask the same question again, and offer help after two misses.
    misses++;
    results[step] = '';
    renderSteps();
    await noaSays({ pose: 'listen', he: q.he, en: q.en }, 'listen', false);
    if (me !== run) return;
    if (misses >= 2) showHints();
    setTurn(true);
  }

  function showHints() {
    const q = D.questions[qid];
    if (!q) return;
    $('nn-hints').innerHTML = pick(q.hints).map(([he, en]) => `<button type="button" data-he="${esc(he)}"><b>${esc(he)}</b><span>${esc(en)}</span></button>`).join('');
    $('nn-hints').hidden = false;
  }

  document.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => start((b as HTMLElement).dataset.g as 'm' | 'f')));
  $('nn-form').addEventListener('submit', send);
  $('nn-skip').addEventListener('click', () => { stopVoice(); nextQuestion(); });
  $('nn-again').addEventListener('click', () => lastSaid && play(lastSaid));
  $('nn-mute').addEventListener('click', () => {
    muted = !muted;
    store.set('kolnoa:noa:muted', muted ? '1' : '0');
    if (muted) stopVoice();
    renderMute();
  });
  $('nn-restart').addEventListener('click', () => start(gender));
  $('nn-help').addEventListener('click', () => ($('nn-hints').hidden ? showHints() : ($('nn-hints').hidden = true)));
  $('nn-hints').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement | null;
    if (!b) return;
    input.value = b.dataset.he!;
    input.focus();
  });

  // Greeting without sound: browsers block audio until the first click.
  $('nn-bhe').textContent = 'היי! אני נועה.';
  $('nn-ben').textContent = "Hi! I'm Noa.";
}
