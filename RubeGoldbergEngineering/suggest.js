/* Machine Lab: "What next?" suggestions.

   1) A rule-based suggester that always works, even offline.
   2) Jev (TypeSafe), called through a small serverless function so the API
      key never reaches the browser. If it can't be reached quickly, the
      rule-based answer is used instead.

   Only the machine is sent: which pieces, in what order, which rules are met
   and where it last stopped. No pod names, nothing typed. */

/* Where the serverless function lives. On Netlify this default just works.
   Set to '' to turn Jev off and always use the built-in rules. If you open
   index.html from a file but host the function online, put its full URL here,
   e.g. 'https://your-site.netlify.app/.netlify/functions/suggest'. */
const SUGGEST_URL = '';   // Jev off for now. To turn on: '/.netlify/functions/suggest'
const SUGGEST_TIMEOUT_MS = 2500;   // kids shouldn't wait longer than this

const MachineSuggest = (() => {
  const REASONS = ['gap', 'edge', 'mismatch', 'waiting'];

  /* The state sent to the function: ids, numbers and true/false only. */
  function buildState(result, opts) {
    const { board, pieceById, ran, streak } = opts;
    const stepPieces = result.steps.map(st => ({ piece: board[st.keys[0]], count: st.keys.length }));
    const moved = new Set(result.fires.map(f => f.key));
    const notMoved = Object.keys(board).filter(k => !moved.has(k)).map(k => board[k]);
    const b = ran && !result.success ? result.breakSpot : null;
    return {
      steps: stepPieces,
      not_moved: notMoved,
      has_run: !!ran,
      worked: !!ran && result.success,
      rules: {
        start: result.hasStart,
        chain: !!ran && result.rules.chain,
        change: !!ran && result.rules.change,
        goal: !!ran && result.rules.goal,
        repeat: streak >= 3
      },
      broke: b && b.key && REASONS.includes(b.reason)
        ? { at: board[b.key], reason: b.reason, target: b.target ? board[b.target] : null }
        : null
    };
  }

  /* Plain rules, checked in order. Returns a piece id from `unlocked`. */
  function ruleSuggest(st, unlocked, pieceById) {
    const has = id => unlocked.includes(id);
    const pick = (...ids) => ids.find(has);
    const onBoard = [...st.steps.map(s => s.piece), ...st.not_moved];
    const roles = onBoard.map(id => pieceById[id] && pieceById[id].role);
    const energies = new Set(onBoard.map(id => pieceById[id]).filter(p => p && p.role === 'step').map(p => p.energy));

    // No START yet
    if (!st.rules.start) return pick('start', unlocked[0]);
    // Fix the spot where it stopped
    if (st.broke) {
      const t = st.broke.target && pieceById[st.broke.target];
      if (st.broke.reason === 'mismatch' && t && t.startsFrom.length === 1) {
        const fix = unlocked.find(id => pieceById[id].role === 'step' && pieceById[id].energy === t.startsFrom[0] && !pieceById[id].startsFrom.every(e => e === t.startsFrom[0]));
        if (fix) return fix;
      }
      if (st.broke.reason === 'waiting') return pick('start', 'curve', 'domino');
      if (st.broke.reason === 'gap' || st.broke.reason === 'edge') {
        const stuck = pieceById[st.broke.at];
        // a rolling piece that ran out of room wants a taller ramp; otherwise fill the gap
        if (stuck && stuck.energy === 'roll') { const r = pick('ramp-tall', 'ramp', 'car'); if (r) return r; }
        const fill = pick('domino', 'marble');
        if (fill) return fill;
      }
    }
    // No goal yet
    if (!roles.includes('goal')) return pick('cup', ...unlocked.filter(id => pieceById[id].role === 'goal'));
    // Only one kind of energy: suggest a different kind
    if (energies.size < 2) {
      const only = [...energies][0];
      const other = only === 'roll' ? pick('domino', 'lever') : pick('marble', 'car', 'domino');
      if (other) return other;
    }
    // Newest piece they haven't tried yet
    const unused = unlocked.filter(id => pieceById[id].role === 'step' && !onBoard.includes(id))
      .sort((a, b) => pieceById[b].week - pieceById[a].week);
    if (unused.length) return unused[0];
    return pick('domino', unlocked[0]);
  }

  async function askJev(st) {
    if (!SUGGEST_URL) return null;
    if (location.protocol === 'file:' && !/^https?:/.test(SUGGEST_URL)) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SUGGEST_TIMEOUT_MS);
    try {
      const res = await fetch(SUGGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(st),
        signal: ctrl.signal
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data.piece === 'string' ? data : null;
    } catch (e) {
      return null;   // offline, blocked, slow: fall back quietly
    } finally {
      clearTimeout(timer);
    }
  }

  /* Always resolves to { piece, source } with a piece from `unlocked`. */
  async function suggest(st, unlocked, pieceById) {
    const jev = await askJev(st);
    if (jev && unlocked.includes(jev.piece)) return { piece: jev.piece, source: 'jev', confidence: jev.confidence };
    return { piece: ruleSuggest(st, unlocked, pieceById), source: 'rules' };
  }

  return { buildState, ruleSuggest, suggest };
})();

if (typeof module !== 'undefined') module.exports = { MachineSuggest };
