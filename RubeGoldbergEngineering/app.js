/* Machine Lab app: board, tray, running, saving, diagram.
   Pieces live in pieces.js; the simulation lives in sim.js. */
(() => {
  'use strict';

  const COLS = 10, ROWS = 6;
  const TICK_MS = 380;
  const STORE_KEY = 'machineLab.v1';

  const PODS = [
    { id: 'fox', name: 'Red Fox', animal: '🦊', color: '#f5b7b1' },
    { id: 'whale', name: 'Blue Whale', animal: '🐳', color: '#aed6f1' },
    { id: 'frog', name: 'Green Frog', animal: '🐸', color: '#abebc6' },
    { id: 'bee', name: 'Yellow Bee', animal: '🐝', color: '#f9e79f' },
    { id: 'octopus', name: 'Purple Octopus', animal: '🐙', color: '#d7bde2' },
    { id: 'lion', name: 'Orange Lion', animal: '🦁', color: '#f8c471' }
  ];

  const $ = id => document.getElementById(id);
  const pieceById = Object.fromEntries(PIECES.map(p => [p.id, p]));
  const unlocked = PIECES.filter(p => p.week <= CURRENT_WEEK);

  /* ---------------- Icons ---------------- */
  const s = inner => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ICONS = {
    undo: s('<path d="M14 14 L6 22 L14 30"/><path d="M6 22 H30 A10 10 0 0 1 30 42 H20"/>'),
    trash: s('<path d="M8 12 H40"/><path d="M18 12 V7 H30 V12"/><path d="M11 12 L14 42 H34 L37 12"/><path d="M20 19 V35 M28 19 V35"/>'),
    broom: s('<path d="M34 5 L22 25"/><path d="M14 22 L30 30 L24 44 Q12 42 6 34 Z" fill="#f9e79f"/><path d="M12 34 L18 37 M16 28 L22 31"/>'),
    paper: s('<path d="M12 4 H30 L38 12 V44 H12 Z" fill="#fff"/><path d="M30 4 V12 H38"/><circle cx="19" cy="21" r="2.5" fill="currentColor"/><path d="M25 21 H32"/><circle cx="19" cy="30" r="2.5" fill="currentColor"/><path d="M25 30 H32"/><circle cx="19" cy="38" r="2.5" fill="currentColor"/><path d="M25 38 H32"/>'),
    printer: s('<path d="M13 18 V5 H35 V18"/><rect x="5" y="18" width="38" height="16" rx="4"/><path d="M13 28 H35 V43 H13 Z" fill="#fff"/>'),
    back: s('<path d="M20 12 L8 24 L20 36"/><path d="M8 24 H40"/>'),
    check: s('<path d="M9 25 L20 36 L40 12"/>'),
    cross: s('<path d="M12 12 L36 36 M36 12 L12 36"/>'),
    speaker: s('<path d="M6 18 H14 L24 9 V39 L14 30 H6 Z" fill="currentColor"/><path d="M31 17 Q36 24 31 31"/><path d="M36 11 Q46 24 36 37"/>'),
    mute: s('<path d="M6 18 H14 L24 9 V39 L14 30 H6 Z" fill="currentColor"/><path d="M32 18 L42 30 M42 18 L32 30"/>'),
    download: s('<path d="M24 6 V30"/><path d="M14 21 L24 31 L34 21"/><path d="M8 34 V42 H40 V34"/>'),
    folder: s('<path d="M5 12 H19 L23 17 H43 V40 H5 Z"/>'),
    bulb: s('<path d="M17 30 Q10 24 10 18 A14 14 0 0 1 38 18 Q38 24 31 30 V35 H17 Z" fill="currentColor" stroke="#2c3e50"/><path d="M18 40 H30 M20 45 H28" stroke="#2c3e50"/>'),
    link: s('<rect x="4" y="17" width="20" height="14" rx="7"/><rect x="24" y="17" width="20" height="14" rx="7"/><path d="M18 24 H30"/>'),
    star: '<svg viewBox="0 0 24 24"><path d="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill="currentColor" stroke="#b7950b" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    glass: `<svg viewBox="0 0 64 64"><circle cx="26" cy="26" r="17" fill="#fff" fill-opacity=".85" stroke="#e74c3c" stroke-width="6"/><path d="M38 38 L56 56" stroke="#2c3e50" stroke-width="9" stroke-linecap="round"/><circle cx="20" cy="20" r="4" fill="#aed6f1"/></svg>`,
    logo: `<svg viewBox="0 0 48 48"><rect x="4" y="30" width="40" height="6" rx="3" fill="#c8925a"/><rect x="8" y="12" width="7" height="18" rx="2" fill="#fdf6e3" stroke="#2c3e50" stroke-width="2.5"/><rect x="19" y="12" width="7" height="18" rx="2" fill="#fdf6e3" stroke="#2c3e50" stroke-width="2.5" transform="rotate(20 22 30)"/><circle cx="36" cy="24" r="6" fill="#3498db" stroke="#2c3e50" stroke-width="2.5"/></svg>`
  };
  const arrowSvg = `<svg viewBox="0 0 40 40"><path d="M6 20 H30 M22 10 L32 20 L22 30" stroke="#e74c3c" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // Rule pictures reuse piece pictures where possible.
  const pic = id => pieceById[id] ? pieceById[id].picture : '';
  const RULES = [
    { id: 'start', name: 'START', pic: () => pic('start') },
    { id: 'chain', name: 'CHAIN', pic: () => ICONS.link.replace('currentColor', '#e67e22') },
    { id: 'change', name: 'CHANGE', pic: () => `<svg viewBox="0 0 100 100"><g transform="translate(-2 6) scale(.55)">${inner(pic('domino'))}</g><path d="M50 50 H64 M58 43 L66 50 L58 57" stroke="#2c3e50" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(52 22) scale(.5)">${inner(pic('marble'))}</g></svg>` },
    { id: 'goal', name: 'GOAL', pic: () => pic('cup') },
    { id: 'repeat', name: 'REPEAT', pic: () => s('<path d="M38 18 A16 16 0 1 0 40 30"/><path d="M40 8 V19 H29"/>').replace('currentColor', '#3498db') }
  ];
  function inner(svgText) { return svgText.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }

  function pictureHTML(p) {
    if (!p) return '';
    const pc = p.picture || '';
    if (pc.trim().startsWith('<svg')) return pc;
    const img = document.createElement('img');
    img.src = pc; img.alt = ''; img.draggable = false;
    return img.outerHTML;
  }

  function nameOf(p) {
    let name = p.name;
    if (p.weekNames) {
      Object.keys(p.weekNames).map(Number).sort((a, b) => a - b)
        .forEach(w => { if (w <= CURRENT_WEEK) name = p.weekNames[w]; });
    }
    return name;
  }

  /* ---------------- Saved state ---------------- */
  const store = {
    load() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
    },
    save(data) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: keep working in memory */ }
    }
  };

  let saved = store.load();
  saved.pods = saved.pods || {};
  const emptyPod = () => ({ board: {}, streak: 0, lastRules: null });

  const state = {
    pod: null,           // pod id
    board: {},           // "c,r" -> piece id
    streak: 0,           // successful runs in a row since last change
    lastRules: null,     // rules from last GO
    lastRun: null,       // { board, result } from last GO, for "What next?"
    history: [],
    selected: null,      // { from: 'tray', id } | { from: 'board', key }
    running: false,
    sound: saved.sound !== false
  };

  function cleanBoard(board) {
    const out = {};
    Object.entries(board || {}).forEach(([k, id]) => {
      const [c, r] = k.split(',').map(Number);
      if (pieceById[id] && c >= 0 && r >= 0 && c < COLS && r < ROWS) out[c + ',' + r] = id;
    });
    return out;
  }

  function persist() {
    if (!state.pod) return;
    saved.active = state.pod;
    saved.sound = state.sound;
    saved.pods[state.pod] = { board: state.board, streak: state.streak, lastRules: state.lastRules, updated: Date.now() };
    store.save(saved);
  }

  function switchPod(id) {
    if (state.pod) persist();
    const p = saved.pods[id] || emptyPod();
    state.pod = id;
    state.board = cleanBoard(p.board);
    state.streak = p.streak || 0;
    state.lastRules = p.lastRules || null;
    state.history = [];
    state.selected = null;
    state.lastRun = null;
    persist();
    renderPodBadge();
    resetRunVisuals();
    renderBoard();
    renderRules();
    renderTools();
    say('Pick a piece, then tap a square. Or drag it!');
  }

  /* ---------------- Sound (tiny, offline) ---------------- */
  let audio = null;
  function beep(freq, dur = 0.08, type = 'triangle', vol = 0.08, when = 0) {
    if (!state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + when;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no sound available */ }
  }
  const sounds = {
    place: () => beep(520, 0.06),
    remove: () => beep(260, 0.08),
    tick: n => beep(330 + (n % 8) * 40, 0.07, 'square', 0.04),
    win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.09, i * 0.12)),
    stop: () => { beep(392, 0.15, 'sine', 0.07); beep(330, 0.22, 'sine', 0.07, 0.15); }
  };

  /* ---------------- Message line ---------------- */
  let lastSpoken = '';
  function say(text, tone = '', picHTML = '') {
    $('msgText').textContent = text;
    $('msgPic').innerHTML = picHTML;
    $('message').className = 'message ' + tone;
    lastSpoken = text;
  }
  function speakMessage() {
    try {
      const u = new SpeechSynthesisUtterance(lastSpoken.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ''));
      u.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* no voice available */ }
  }

  /* ---------------- Tray ---------------- */
  function renderTray() {
    const tray = $('tray');
    tray.innerHTML = '';
    unlocked.forEach(p => {
      const b = document.createElement('button');
      b.className = 'tray-piece';
      b.dataset.id = p.id;
      b.innerHTML = `<span class="pic">${pictureHTML(p)}</span><span class="label">${nameOf(p)}</span>` +
        (p.week === CURRENT_WEEK && CURRENT_WEEK > 1 ? '<span class="new-badge">NEW</span>' : '');
      tray.appendChild(b);
    });
  }

  function markSelection() {
    document.querySelectorAll('.tray-piece').forEach(el =>
      el.classList.toggle('selected', !!state.selected && state.selected.from === 'tray' && state.selected.id === el.dataset.id));
    document.querySelectorAll('.board .piece').forEach(el =>
      el.classList.toggle('selected', !!state.selected && state.selected.from === 'board' && state.selected.key === el.parentNode.dataset.key));
    $('board').classList.toggle('placing', !!state.selected);
    $('trashBtn').classList.toggle('armed', !!state.selected && state.selected.from === 'board');
  }

  /* ---------------- Board ---------------- */
  function buildCells() {
    const board = $('board');
    board.querySelectorAll('.cell').forEach(c => c.remove());
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.key = c + ',' + r;
        board.insertBefore(cell, $('links'));
      }
    }
    $('links').setAttribute('viewBox', `0 0 ${COLS} ${ROWS}`);
    $('links').setAttribute('preserveAspectRatio', 'none');
  }

  function renderBoard() {
    document.querySelectorAll('.board .cell').forEach(cell => {
      const id = state.board[cell.dataset.key];
      const existing = cell.querySelector('.piece');
      if (existing && existing.dataset.id === id) return;
      if (existing) existing.remove();
      cell.classList.toggle('has', !!id);
      if (id) {
        const el = document.createElement('div');
        el.className = 'piece';
        el.dataset.id = id;
        el.innerHTML = pictureHTML(pieceById[id]);
        el.title = nameOf(pieceById[id]);
        cell.appendChild(el);
      }
    });
    markSelection();
  }

  function fitBoard() {
    const wrap = $('boardWrap');
    const stacked = window.matchMedia('(max-width: 860px)').matches;
    const availW = wrap.clientWidth - 24 - 6;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const availH = stacked ? window.innerHeight * 0.62 : window.innerHeight - top - 58 - 24 - 30;
    let cell = Math.floor(Math.min(availW / COLS, Math.max(availH, 240) / ROWS));
    cell = Math.max(30, Math.min(cell, 110));
    document.documentElement.style.setProperty('--cell', cell + 'px');
  }

  /* ---------------- Editing ---------------- */
  function snapshot() { return JSON.stringify(state.board); }

  function change(mutator, sound) {
    if (state.running) return;
    const before = snapshot();
    mutator(state.board);
    if (snapshot() === before) return;
    state.history.push(before);
    if (state.history.length > 60) state.history.shift();
    afterChange();
    if (sound) sounds[sound]();
  }

  function afterChange() {
    state.streak = 0;
    state.lastRun = null;
    resetRunVisuals();
    renderBoard();
    renderRules();
    renderTools();
    persist();
  }

  function place(key, id) {
    change(b => { b[key] = id; }, 'place');
  }
  function move(fromKey, toKey) {
    change(b => {
      const a = b[fromKey], other = b[toKey];
      delete b[fromKey];
      if (other) b[fromKey] = other;   // swap
      b[toKey] = a;
    }, 'place');
  }
  function removeAt(key) {
    change(b => { delete b[key]; }, 'remove');
  }

  function undo() {
    if (state.running || !state.history.length) return;
    state.board = JSON.parse(state.history.pop());
    state.selected = null;
    afterChange();
    sounds.remove();
    say('Undo! Back one step.');
  }

  function startOver() {
    if (state.running) return;
    if (!Object.keys(state.board).length) { say('The board is already empty. Pick a piece!'); return; }
    confirmBox({
      text: 'Start over with an empty board?',
      pic: ICONS.broom,
      yes: 'Yes, clear it',
      no: 'No, keep it',
      onYes: () => {
        change(b => { Object.keys(b).forEach(k => delete b[k]); }, 'remove');
        state.lastRules = null;
        state.selected = null;
        renderRules();
        persist();
        say('Fresh board! You can still tap Undo to bring it back.');
      }
    });
  }

  /* ---------------- Tap and drag ---------------- */
  const DRAG_START_PX = 8;
  let gesture = null;   // { kind: 'tray'|'board', id, key, x, y, dragging, el }

  function targetUnder(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest('.board .cell');
    if (cell) return { type: 'cell', key: cell.dataset.key, el: cell };
    if (el.closest('#trashBtn')) return { type: 'trash', el: $('trashBtn') };
    return null;
  }

  function clearDropHighlights() {
    document.querySelectorAll('.cell.drop').forEach(c => c.classList.remove('drop'));
    $('trashBtn').classList.remove('drop');
  }

  function onPointerDown(e) {
    if (e.button > 0 || state.running) return;
    const trayEl = e.target.closest('.tray-piece');
    const cellEl = e.target.closest('.board .cell');
    if (trayEl) gesture = { kind: 'tray', id: trayEl.dataset.id, el: trayEl };
    else if (cellEl && state.board[cellEl.dataset.key]) gesture = { kind: 'board', key: cellEl.dataset.key, id: state.board[cellEl.dataset.key], el: cellEl.querySelector('.piece') };
    else if (cellEl) gesture = { kind: 'empty', key: cellEl.dataset.key };
    else return;
    gesture.x = e.clientX; gesture.y = e.clientY; gesture.dragging = false;
    gesture.pointerId = e.pointerId;
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    if (!gesture.dragging) {
      if (gesture.kind === 'empty') return;
      if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) < DRAG_START_PX) return;
      gesture.dragging = true;
      const ghost = $('ghost');
      ghost.innerHTML = pictureHTML(pieceById[gesture.id]);
      ghost.classList.remove('hidden');
      if (gesture.kind === 'board' && gesture.el) gesture.el.classList.add('dragging');
      if (gesture.kind === 'board') $('trashBtn').classList.add('armed');
    }
    const ghost = $('ghost');
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    clearDropHighlights();
    const t = targetUnder(e.clientX, e.clientY);
    if (t) t.el.classList.add('drop');
  }

  function onPointerUp(e) {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const g = gesture;
    gesture = null;
    $('ghost').classList.add('hidden');
    clearDropHighlights();
    if (g.el) g.el.classList.remove('dragging');
    $('trashBtn').classList.remove('armed');

    if (g.dragging) {
      const t = targetUnder(e.clientX, e.clientY);
      state.selected = null;
      if (g.kind === 'tray') {
        if (t && t.type === 'cell') { place(t.key, g.id); say(placedMsg(g.id), '', ''); }
      } else if (g.kind === 'board') {
        if (t && t.type === 'cell' && t.key !== g.key) move(g.key, t.key);
        else if (t && t.type === 'trash') { removeAt(g.key); say('Into the trash! Tap Undo if you want it back.'); }
      }
      markSelection();
      return;
    }
    // A tap
    if (g.kind === 'tray') tapTray(g.id);
    else tapCell(g.key);
  }

  function placedMsg(id) {
    return `${nameOf(pieceById[id])}! Add more, or press GO.`;
  }

  function tapTray(id) {
    if (state.selected && state.selected.from === 'tray' && state.selected.id === id) {
      state.selected = null;
      say('Pick a piece, then tap a square.');
    } else {
      state.selected = { from: 'tray', id };
      say(`Now tap a square for the ${nameOf(pieceById[id])}.`, '', pictureHTML(pieceById[id]));
      sounds.tick(2);
    }
    markSelection();
  }

  function tapCell(key) {
    const here = state.board[key];
    const sel = state.selected;
    if (sel && sel.from === 'tray') {
      if (here !== sel.id) place(key, sel.id);
      // keep the tray piece selected so a row of dominos is quick to lay down
      markSelection();
      return;
    }
    if (sel && sel.from === 'board') {
      if (sel.key === key) { state.selected = null; markSelection(); say('Pick a piece, then tap a square.'); return; }
      if (!here) { move(sel.key, key); state.selected = null; markSelection(); return; }
      state.selected = { from: 'board', key };
      markSelection();
      return;
    }
    if (here) {
      state.selected = { from: 'board', key };
      markSelection();
      say('Tap a square to move it, or tap the Trash.', '', pictureHTML(pieceById[here]));
    } else {
      say('First pick a piece from the top!');
      nudgeTray();
    }
  }

  function tapTrash() {
    if (state.running) return;
    const sel = state.selected;
    if (sel && sel.from === 'board') {
      state.selected = null;
      removeAt(sel.key);
      say('Into the trash! Tap Undo if you want it back.');
    } else {
      state.selected = null;
      say('Drag a piece here to throw it away.', '', ICONS.trash);
    }
    markSelection();
  }

  function nudge(el) {
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    el.addEventListener('animationend', () => el.classList.remove('nudge'), { once: true });
  }

  function nudgeTray() {
    document.querySelectorAll('.tray-piece').forEach((el, i) => {
      if (i > 2) return;
      nudge(el);
    });
  }

  /* ---------------- Running the machine ---------------- */
  let timers = [];

  function resetRunVisuals() {
    timers.forEach(clearTimeout); timers = [];
    state.running = false;
    $('goBtn').disabled = false;
    document.querySelectorAll('.board .piece').forEach(el => {
      el.className = 'piece';
      el.style.removeProperty('--dx'); el.style.removeProperty('--dy');
    });
    document.querySelectorAll('.board .cell').forEach(c => c.classList.remove('lit', 'broke'));
    const links = $('links');
    while (links.firstChild) links.removeChild(links.firstChild);
    document.querySelectorAll('.board .marker').forEach(m => m.remove());
  }

  function go() {
    if (state.running) return;
    state.selected = null;
    markSelection();
    resetRunVisuals();
    const result = simulate(state.board, pieceById, COLS, ROWS);

    if (!result.hasStart) {
      say('Every machine needs a START! Put one on the board.', 'debug', pic('start'));
      const startTray = document.querySelector('.tray-piece[data-id="start"]');
      if (startTray) nudge(startTray);
      return;
    }

    state.running = true;
    $('goBtn').disabled = true;
    say('3, 2, 1... GO!', '', '');

    const fireTime = {};
    result.fires.forEach(f => { fireTime[f.key] = f.t; });

    result.fires.forEach((f, i) => {
      timers.push(setTimeout(() => {
        const cell = document.querySelector(`.board .cell[data-key="${f.key}"]`);
        const el = cell && cell.querySelector('.piece');
        if (!el) return;
        const p = pieceById[state.board[f.key]];
        cell.classList.add('lit');
        if (f.from) {
          const [c1, r1] = f.from.split(',').map(Number), [c2, r2] = f.key.split(',').map(Number);
          el.style.setProperty('--dx', Math.sign(c2 - c1));
          el.style.setProperty('--dy', Math.sign(r2 - r1));
        }
        // gates pulse instead of tipping over
        const anim = p.role === 'goal' ? 'fall' : (p.sends === 'spread' && p.energy === 'fall' ? 'push' : p.energy);
        el.classList.add('go', 'e-' + anim);
        sounds.tick(i);
      }, f.t * TICK_MS));
    });

    result.links.forEach(l => {
      const startT = fireTime[l.from] || 0;
      timers.push(setTimeout(() => drawLink($('links'), l.from, l.to, (l.t - startT) * TICK_MS), startT * TICK_MS));
    });

    const endT = (result.success ? result.duration : Math.max(result.duration, result.breakSpot ? result.breakSpot.t : 0)) + 1;
    timers.push(setTimeout(() => finishRun(result), endT * TICK_MS));
  }

  function drawLink(svgEl, fromKey, toKey, ms) {
    const [c1, r1] = fromKey.split(',').map(Number), [c2, r2] = toKey.split(',').map(Number);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', c1 + 0.5); line.setAttribute('y1', r1 + 0.5);
    line.setAttribute('x2', c2 + 0.5); line.setAttribute('y2', r2 + 0.5);
    if (ms) {
      const len = Math.hypot(c2 - c1, r2 - r1);
      line.style.strokeDasharray = len;
      line.style.setProperty('--len', len);
      line.style.setProperty('--d', ms + 'ms');
      line.classList.add('draw');
    }
    svgEl.appendChild(line);
  }

  function finishRun(result) {
    state.running = false;
    $('goBtn').disabled = false;
    state.lastRules = result.rules;
    state.lastRun = { board: snapshot(), result };

    if (result.success) {
      state.streak = Math.min(state.streak + 1, 99);
      result.goals.forEach(k => {
        const el = document.querySelector(`.board .cell[data-key="${k}"] .piece`);
        if (el) el.classList.add('win');
      });
      sounds.win();
      confetti(state.streak >= 3 ? 90 : 50);
      if (state.streak === 3) say('3 times in a row! You did REPEAT!', 'happy', ICONS.star.replace('currentColor', '#f1c40f'));
      else if (state.streak > 3) say(`It worked again! ${state.streak} times in a row!`, 'happy');
      else say(`Hooray! It worked! Run it ${3 - state.streak} more time${state.streak === 2 ? '' : 's'} for REPEAT.`, 'happy');
    } else {
      state.streak = 0;
      sounds.stop();
      showBreak(result);
    }
    renderRules();
    persist();
  }

  function showBreak(result) {
    const b = result.breakSpot;
    if (!b || !b.key) return;
    const hasGoal = Object.values(state.board).some(id => pieceById[id].role === 'goal');
    const p = pieceById[state.board[b.key]];
    let text;
    if (b.reason === 'mismatch') {
      const t = pieceById[state.board[b.target]];
      const needs = t.startsFrom.length === 1 ? { roll: 'something rolling', fall: 'something falling', lift: 'a lift', spring: 'a snap', push: 'a push' }[t.startsFrom[0]] : null;
      text = needs ? `The ${nameOf(t)} needs ${needs} to make it go.` : `The ${nameOf(t)} didn't move. Try a different piece before it.`;
    } else if (b.reason === 'waiting') {
      text = `The ${nameOf(p)} is waiting for energy from ${p.needs} sides!`;
    } else if (b.reason === 'edge') {
      text = `Whoosh! The ${nameOf(p)} went right off the board!`;
    } else if (!hasGoal && result.fires.length > 1) {
      text = 'Nice chain! Now add a GOAL at the end, like a cup.';
    } else {
      text = `The energy stopped after the ${nameOf(p)}. Is there a gap?`;
    }
    say(text, 'debug', ICONS.glass);

    const cell = document.querySelector(`.board .cell[data-key="${b.key}"]`);
    if (cell) cell.classList.add('broke');
    const [c, r] = b.key.split(',').map(Number);
    let x = c + 0.5, y = r + 0.5;
    if (b.dir) { x += b.dir[0] * 0.5; y += b.dir[1] * 0.5; }
    const m = document.createElement('div');
    m.className = 'marker';
    m.style.left = (x / COLS * 100) + '%';
    m.style.top = (y / ROWS * 100) + '%';
    m.innerHTML = `<div class="glass">${ICONS.glass}</div><div class="tag">Debug this spot!</div>`;
    $('board').appendChild(m);
    // keep the bubble on the board near the edges
    const bw = $('board').getBoundingClientRect(), mr = m.getBoundingClientRect();
    if (mr.left < bw.left) m.style.transform = `translate(calc(-50% + ${bw.left - mr.left + 4}px), -50%)`;
    else if (mr.right > bw.right) m.style.transform = `translate(calc(-50% - ${mr.right - bw.right + 4}px), -50%)`;
  }

  function confetti(n) {
    const box = $('confetti');
    const colors = ['#3498db', '#2ecc71', '#e67e22', '#e74c3c', '#f1c40f', '#9b59b6'];
    for (let i = 0; i < n; i++) {
      const bit = document.createElement('i');
      bit.style.left = (i * 37 % 100) + 'vw';
      bit.style.background = colors[i % colors.length];
      bit.style.setProperty('--x', ((i * 53 % 21) - 10) + 'vw');
      bit.style.setProperty('--r', (180 + i * 47 % 540) + 'deg');
      bit.style.setProperty('--t', (1.6 + (i % 7) * 0.2) + 's');
      bit.style.animationDelay = (i % 10) * 0.05 + 's';
      box.appendChild(bit);
    }
    setTimeout(() => { box.innerHTML = ''; }, 3600);
  }

  /* ---------------- What next? ---------------- */
  let asking = false;
  async function whatNext() {
    if (state.running || asking) return;
    asking = true;
    $('nextBtn').disabled = true;
    state.selected = null;
    markSelection();
    say('Hmm, let me think...', 'idea', ICONS.bulb.replace('currentColor', '#f1c40f'));
    const ran = !!state.lastRun && state.lastRun.board === snapshot();
    const result = ran ? state.lastRun.result : simulate(state.board, pieceById, COLS, ROWS);
    const machine = MachineSuggest.buildState(result, { board: state.board, pieceById, ran, streak: state.streak });
    const ids = unlocked.map(p => p.id);
    const started = Date.now();
    const answer = await MachineSuggest.suggest(machine, ids, pieceById);
    // a short pause so the "thinking" moment doesn't flicker
    await new Promise(r => setTimeout(r, Math.max(0, 500 - (Date.now() - started))));
    asking = false;
    $('nextBtn').disabled = false;
    if (state.running) return;
    const p = pieceById[answer.piece];
    say(`Try a ${nameOf(p)} next?`, 'idea', pictureHTML(p));
    $('message').dataset.source = answer.source;   // 'jev' or 'rules', for the teacher/tests
    const el = document.querySelector(`.tray-piece[data-id="${p.id}"]`);
    if (el) nudge(el);
  }

  /* ---------------- Rules checklist ---------------- */
  function currentRules() {
    const last = state.lastRules || {};
    return {
      start: Object.values(state.board).some(id => pieceById[id].role === 'start'),
      chain: !!last.chain,
      change: !!last.change,
      goal: !!last.goal,
      repeat: state.streak >= 3
    };
  }

  function renderRules() {
    const done = currentRules();
    $('rules').innerHTML = RULES.map(r => {
      const stars = r.id === 'repeat'
        ? `<span class="stars">${[0, 1, 2].map(i => `<span class="star" style="color:${i < Math.min(state.streak, 3) ? '#f1c40f' : '#e5e8e8'}">${ICONS.star}</span>`).join('')}</span>`
        : '';
      return `<div class="rule ${done[r.id] ? 'done' : ''}" data-rule="${r.id}">
        <span class="rpic">${r.pic()}</span><span class="rname">${r.name}</span>${stars}
        <span class="check">${done[r.id] ? ICONS.check.replace('currentColor', '#fff') : ''}</span></div>`;
    }).join('');
  }

  function renderTools() {
    $('undoBtn').disabled = !state.history.length;
  }

  /* ---------------- Pods ---------------- */
  const podById = id => PODS.find(p => p.id === id);
  const podDot = p => `<span class="pod-dot" style="background:${p.color}">${p.animal}</span>`;

  function renderPodBadge() {
    const p = podById(state.pod);
    $('podBtn').innerHTML = p ? podDot(p) + `<span>${p.name}</span>` : 'Pick your pod';
  }

  function openPodPicker() {
    if (state.running) return;
    if (state.pod) persist();
    $('podGrid').innerHTML = PODS.map(p => {
      const n = Object.keys((saved.pods[p.id] || {}).board || {}).length;
      return `<button class="pod-choice ${p.id === state.pod ? 'current' : ''}" data-pod="${p.id}">
        ${podDot(p)}<span>${p.name}</span><span class="count">${n ? n + ' pieces' : ''}</span></button>`;
    }).join('');
    $('podPicker').classList.remove('hidden');
  }

  /* ---------------- Confirm box ---------------- */
  let confirmHandler = null;
  function confirmBox({ text, pic: picHTML, yes, no, onYes }) {
    $('confirmText').textContent = text;
    $('confirmPic').innerHTML = picHTML || '';
    $('confirmYesText').textContent = yes || 'Yes';
    $('confirmNoText').textContent = no || 'No';
    confirmHandler = onYes;
    $('confirm').classList.remove('hidden');
  }
  function closeConfirm(ok) {
    $('confirm').classList.add('hidden');
    const h = confirmHandler; confirmHandler = null;
    if (ok && h) h();
  }

  /* ---------------- Save to file / open file ---------------- */
  function saveToFile() {
    persist();
    const data = { app: 'machine-lab', version: 1, savedAt: new Date().toISOString(), week: CURRENT_WEEK, pods: saved.pods };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `machine-lab-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    say('Saved a copy of every pod\'s machine to a file.', 'happy', ICONS.download);
  }

  function openFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data = null;
      try { data = JSON.parse(reader.result); } catch (e) { data = null; }
      const pods = data && data.app === 'machine-lab' && data.pods && typeof data.pods === 'object' ? data.pods : null;
      const ids = pods ? Object.keys(pods).filter(id => podById(id)) : [];
      if (!ids.length) { say('Hmm, that file doesn\'t have any Machine Lab machines in it.', 'debug'); return; }
      confirmBox({
        text: 'Open the machines from this file? They replace these pods on this computer:',
        pic: ids.map(id => podById(id).animal).join(''),
        yes: 'Yes, open them',
        no: 'No',
        onYes: () => {
          ids.forEach(id => {
            const p = pods[id] || {};
            saved.pods[id] = { board: cleanBoard(p.board), streak: 0, lastRules: null, updated: Date.now() };
          });
          store.save(saved);
          const keep = state.pod;
          state.pod = null;           // don't overwrite what we just loaded
          switchPod(keep && saved.pods[keep] ? keep : ids[0]);
          say('Machines opened!', 'happy');
        }
      });
    };
    reader.readAsText(file);
  }

  /* ---------------- Diagram ---------------- */
  function buildDiagram() {
    const board = state.board;
    const keys = Object.keys(board);
    const result = simulate(board, pieceById, COLS, ROWS);
    const rules = { ...result.rules, start: result.hasStart, repeat: state.streak >= 3 };
    const pod = podById(state.pod);

    // Crop the board to the pieces used
    let minC = COLS, minR = ROWS, maxC = -1, maxR = -1;
    keys.forEach(k => { const [c, r] = k.split(',').map(Number); minC = Math.min(minC, c); maxC = Math.max(maxC, c); minR = Math.min(minR, r); maxR = Math.max(maxR, r); });
    if (!keys.length) { minC = 0; minR = 0; maxC = COLS - 1; maxR = ROWS - 1; }
    const w = maxC - minC + 1, h = maxR - minR + 1;
    const cellMM = Math.min(250 / w, 95 / h, 34);

    let cells = '';
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const k = c + ',' + r, id = board[k];
        if (!id) { cells += '<div class="pcell"></div>'; continue; }
        const p = pieceById[id];
        const n = result.stepOf[k];
        const step = result.steps[n - 1];
        const isFirstOfStep = step && step.keys[0] === k;
        const isStart = p.role === 'start';
        const badge = isStart ? '<span class="step-badge go">GO</span>' : (isFirstOfStep ? `<span class="step-badge">${n}</span>` : '');
        const used = isStart || n;
        cells += `<div class="pcell ${used ? '' : 'unused'}">${badge}<div class="piece">${pictureHTML(p)}</div></div>`;
      }
    }

    // Steps in order
    const stepItems = [];
    if (result.hasStart) stepItems.push(`<li><span class="num go">GO</span><span class="lpic">${pic('start')}</span>START push</li>`);
    result.steps.forEach(st => {
      const p = pieceById[st.pieceId];
      const kinds = [...new Set(st.keys.map(k => board[k]))];
      const label = kinds.map(id => nameOf(pieceById[id])).join(' + ') + (st.keys.length > 1 ? ` (×${st.keys.length})` : '');
      stepItems.push(`<li><span class="num">${st.num}</span><span class="lpic">${pictureHTML(p)}</span>${label}</li>`);
    });

    // Legend: every kind of piece on the board
    const counts = {};
    Object.values(board).forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const legend = PIECES.filter(p => counts[p.id]).map(p =>
      `<li><span class="lpic">${pictureHTML(p)}</span>${nameOf(p)}${counts[p.id] > 1 ? ' ×' + counts[p.id] : ''}</li>`).join('');

    const ruleItems = RULES.map(r =>
      `<li><span class="box">${rules[r.id] ? ICONS.check.replace('currentColor', '#27ae60') : ''}</span><span class="lpic">${r.pic()}</span>${r.name}</li>`).join('');

    $('paper').innerHTML = `
      <div class="paper-head"><h1>Our Rube Goldberg Machine</h1>${pod ? podDot(pod) : ''}</div>
      <div class="fill-lines"><span>Team name:</span><span class="line"></span><span>Date:</span><span class="line short"></span></div>
      <div class="paper-board-wrap">
        <div class="paper-board" style="--pcols:${w};--prows:${h};--pcell:${cellMM}mm">
          ${cells}
          <svg class="links" viewBox="${minC} ${minR} ${w} ${h}" preserveAspectRatio="none"></svg>
        </div>
      </div>
      <div class="paper-bottom">
        <div><h2>Our steps</h2><ul class="paper-list">${stepItems.join('') || '<li>Press GO to find the steps!</li>'}</ul>
          ${!result.success && keys.length ? '<p class="paper-note">Pieces that are pale did not move yet.</p>' : ''}</div>
        <div><h2>Pieces we used</h2><ul class="paper-list">${legend || '<li>No pieces yet</li>'}</ul></div>
        <div><h2>The 5 rules</h2><ul class="paper-list">${ruleItems}</ul></div>
      </div>`;
    const linksEl = $('paper').querySelector('.links');
    result.links.forEach(l => drawLink(linksEl, l.from, l.to, 0));
  }

  function openDiagram() {
    if (state.running) return;
    buildDiagram();
    $('diagram').classList.remove('hidden');
    $('diagram').scrollTop = 0;
  }

  /* ---------------- Wire it up ---------------- */
  function init() {
    document.querySelectorAll('.ico[data-icon]').forEach(el => { el.innerHTML = ICONS[el.dataset.icon] || ''; });
    document.querySelector('.brand-icon').innerHTML = ICONS.logo;

    renderTray();
    buildCells();
    fitBoard();

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', () => {
      if (gesture && gesture.el) gesture.el.classList.remove('dragging');
      gesture = null; $('ghost').classList.add('hidden'); clearDropHighlights();
    });
    document.addEventListener('contextmenu', e => e.preventDefault());

    $('goBtn').addEventListener('click', go);
    $('undoBtn').addEventListener('click', undo);
    $('trashBtn').addEventListener('click', tapTrash);
    $('clearBtn').addEventListener('click', startOver);
    $('diagramBtn').addEventListener('click', openDiagram);
    $('nextBtn').addEventListener('click', whatNext);
    $('printBtn').addEventListener('click', () => window.print());
    $('closeDiagramBtn').addEventListener('click', () => $('diagram').classList.add('hidden'));
    window.addEventListener('beforeprint', buildDiagram);

    $('confirmYes').addEventListener('click', () => closeConfirm(true));
    $('confirmNo').addEventListener('click', () => closeConfirm(false));

    $('podBtn').addEventListener('click', openPodPicker);
    $('podGrid').addEventListener('click', e => {
      const b = e.target.closest('.pod-choice');
      if (!b) return;
      $('podPicker').classList.add('hidden');
      switchPod(b.dataset.pod);
    });

    const renderSound = () => { $('soundBtn').innerHTML = `<span class="ico">${state.sound ? ICONS.speaker : ICONS.mute}</span>`; };
    renderSound();
    $('soundBtn').addEventListener('click', () => { state.sound = !state.sound; renderSound(); persist(); store.save({ ...saved, sound: state.sound }); });

    if (!('speechSynthesis' in window)) $('sayBtn').classList.add('hidden');
    $('sayBtn').addEventListener('click', speakMessage);

    $('saveFileBtn').addEventListener('click', saveToFile);
    $('openFileBtn').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) openFile(f);
      e.target.value = '';
    });

    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitBoard, 100); });

    if (saved.active && podById(saved.active)) switchPod(saved.active);
    else { renderPodBadge(); renderRules(); renderTools(); openPodPicker(); say('Pick a piece, then tap a square. Or drag it!'); }
  }

  // For automated tests only.
  window.MachineLab = { state, simulateNow: () => simulate(state.board, pieceById, COLS, ROWS) };

  init();
})();
