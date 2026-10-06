/* Machine Lab simulation.
   Deterministic and grid-based: no physics, no randomness. Energy leaves a
   piece, travels to a neighbor (crossing up to `jump` empty squares), and
   sets that neighbor off if the neighbor accepts that kind of energy.
   The same board always gives the same result. */

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const sameDir = (a, b) => a[0] === b[0] && a[1] === b[1];
const back = d => [-d[0], -d[1]];
const keyOf = (c, r) => c + ',' + r;
const parseKey = k => k.split(',').map(Number);

function outDirs(sends, dir, arrivalSides) {
  if (sends === 'all' || !dir) return DIRS;
  if (sends === 'straight') return [dir];
  if (sends === 'turn') return DIRS.filter(d => d[0] * dir[0] + d[1] * dir[1] === 0);
  // 'spread': everywhere except the sides energy arrived from
  return DIRS.filter(d => !arrivalSides.some(s => sameDir(s, d)));
}

/* board: { "col,row": pieceId }
   returns everything the animation, the checklist and the diagram need */
function simulate(board, pieceById, cols, rows) {
  const at = k => pieceById[board[k]];
  const fired = new Map();     // key -> { t, from }
  const arrivals = new Map();  // key -> [{ from, side, t }]
  const queue = [];
  let seq = 0;
  const schedule = ev => { ev.seq = seq++; queue.push(ev); };

  const fires = [];      // in order: { key, t, from }
  const links = [];      // energy that successfully passed: { from, to, t }
  const deadEnds = [];   // { key, dir, reason, target, t }
  const goals = [];

  const keys = Object.keys(board).filter(k => at(k))
    .sort((a, b) => { const [ac, ar] = parseKey(a), [bc, br] = parseKey(b); return ar - br || ac - bc; });
  const starts = keys.filter(k => at(k).role === 'start');
  starts.forEach(k => schedule({ t: 0, type: 'fire', key: k, dir: null, from: null }));

  while (queue.length) {
    queue.sort((a, b) => a.t - b.t || a.seq - b.seq);
    const ev = queue.shift();
    const piece = at(ev.key);

    if (ev.type === 'fire') {
      if (fired.has(ev.key)) continue;
      fired.set(ev.key, { t: ev.t, from: ev.from });
      fires.push({ key: ev.key, t: ev.t, from: ev.from });
      if (piece.role === 'goal') { goals.push(ev.key); continue; }

      const sides = (arrivals.get(ev.key) || []).map(a => a.side);
      const dirs = outDirs(piece.sends, ev.dir, sides);
      const [c0, r0] = parseKey(ev.key);
      const leaveT = ev.t + (piece.slow || 1);
      const misses = [];
      let reachedSomething = false;

      for (const d of dirs) {
        let c = c0, r = r0, miss = null;
        for (let i = 1; i <= 1 + (piece.jump || 0); i++) {
          c += d[0]; r += d[1];
          if (c < 0 || r < 0 || c >= cols || r >= rows) { miss = 'edge'; break; }
          const k = keyOf(c, r);
          if (at(k)) {
            reachedSomething = true;
            if (!fired.has(k)) {
              schedule({ t: leaveT + i - 1, type: 'arrive', key: k, dir: d, from: ev.key, energy: piece.energy });
            }
            break;
          }
          if (i === 1 + (piece.jump || 0)) miss = 'gap';
        }
        if (miss) misses.push({ dir: d, reason: miss });
      }

      // A straight piece that misses is a broken spot. Pieces that pick a
      // way (turn/spread/all) only count as broken if they reached nothing.
      if (piece.sends === 'straight' || (dirs.length === 1 && ev.dir)) {
        misses.forEach(m => deadEnds.push({ key: ev.key, dir: m.dir, reason: m.reason, t: leaveT }));
      } else if (!reachedSomething) {
        const one = misses.length === 1 ? misses[0] : null;
        deadEnds.push({ key: ev.key, dir: one ? one.dir : null, reason: one ? one.reason : 'gap', t: leaveT });
      }
      continue;
    }

    // ev.type === 'arrive'
    if (fired.has(ev.key) || piece.role === 'start') continue;
    if (!piece.startsFrom.includes(ev.energy)) {
      deadEnds.push({ key: ev.from, dir: ev.dir, reason: 'mismatch', target: ev.key, energy: ev.energy, t: ev.t });
      continue;
    }
    const list = arrivals.get(ev.key) || [];
    if (!list.some(a => a.from === ev.from)) list.push({ from: ev.from, side: back(ev.dir), t: ev.t });
    arrivals.set(ev.key, list);
    links.push({ from: ev.from, to: ev.key, t: ev.t });
    if (list.length >= (piece.needs || 1)) {
      schedule({ t: ev.t, type: 'fire', key: ev.key, dir: ev.dir, from: ev.from });
    }
  }

  // Gates still waiting for another chain
  for (const [k, list] of arrivals) {
    if (!fired.has(k)) deadEnds.push({ key: k, dir: null, reason: 'waiting', t: list[list.length - 1].t + 1 });
  }

  // Steps: a row of the same kind of piece is one step. START is not a step.
  const group = new Map();
  const findRoot = k => { while (group.get(k) !== k) k = group.get(k); return k; };
  fires.forEach(f => group.set(f.key, f.key));
  const stepKind = k => at(k).stepWith || at(k).id;
  links.forEach(l => {
    if (!fired.has(l.to)) return;
    if (at(l.from).role === 'start') return;
    if (stepKind(l.from) === stepKind(l.to)) group.set(findRoot(l.to), findRoot(l.from));
  });
  const stepNumOfRoot = new Map();
  const steps = [];
  const stepOf = {};
  fires.forEach(f => {
    if (at(f.key).role === 'start') return;
    const root = findRoot(f.key);
    if (!stepNumOfRoot.has(root)) {
      stepNumOfRoot.set(root, steps.length + 1);
      steps.push({ num: steps.length + 1, pieceId: board[f.key], keys: [] });
    }
    const n = stepNumOfRoot.get(root);
    steps[n - 1].keys.push(f.key);
    stepOf[f.key] = n;
  });

  const energies = new Set(fires.map(f => at(f.key)).filter(p => p.role === 'step').map(p => p.energy));
  const success = goals.length > 0;

  let breakSpot = null;
  if (!success) {
    if (!starts.length) breakSpot = { reason: 'nostart' };
    else if (deadEnds.length) breakSpot = deadEnds.reduce((best, d) => (d.t > best.t ? d : best));
    else { const last = fires[fires.length - 1]; breakSpot = { key: last.key, dir: null, reason: 'gap', t: last.t }; }
  }

  return {
    success, fires, links, deadEnds, goals, breakSpot, steps, stepOf,
    hasStart: starts.length > 0,
    rules: {
      start: starts.length > 0,
      chain: steps.length >= 3,
      change: energies.size >= 2,
      goal: success
    },
    duration: fires.length ? Math.max(...fires.map(f => f.t)) : 0
  };
}

if (typeof module !== 'undefined') module.exports = { simulate, DIRS, keyOf, parseKey };
