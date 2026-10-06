/* Machine Lab "What next?" function (Netlify).

   Receives the machine state from the browser (piece ids, true/false rules,
   where it last stopped), asks Jev to choose one piece from the pieces
   unlocked this week, and returns { piece, confidence }.

   The API key comes from the TYPESAFE_API_KEY environment variable and never
   goes to the browser. The question and the option list are built here from
   pieces.js, so the browser can't send its own prompt text. */

const { PIECES, CURRENT_WEEK } = require('../../pieces.js');

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const TIMEOUT_MS = 2000;
const MAX_BODY = 4000;
const REASONS = { gap: 'there was an empty gap after it', edge: 'it went off the edge of the board', mismatch: 'the next piece could not be started by it', waiting: 'it was waiting for a second chain to arrive' };
const ENERGY_WORD = { push: 'push', fall: 'falling', roll: 'rolling', lift: 'lifting', spring: 'stretching and snapping' };

const byId = Object.fromEntries(PIECES.map(p => [p.id, p]));
const unlocked = PIECES.filter(p => p.week <= CURRENT_WEEK);

function nameOf(p) {
  let name = p.name;
  if (p.weekNames) Object.keys(p.weekNames).map(Number).sort((a, b) => a - b).forEach(w => { if (w <= CURRENT_WEEK) name = p.weekNames[w]; });
  return name;
}

/* Plain-English description of each option, generated from its behavior. */
function describe(p) {
  if (p.role === 'start') return { name: nameOf(p), what_it_does: 'Kicks the machine off when GO is pressed. A machine needs one START, or two to start two chains.' };
  if (p.role === 'goal') return { name: nameOf(p), what_it_does: 'A goal. The machine is finished and has worked when the energy reaches it.' };
  const ways = { straight: 'passes energy straight ahead to the next piece', turn: 'turns the chain around a corner, and can split one chain into two', spread: 'passes energy on in any direction', all: 'passes energy in every direction' }[p.sends];
  const parts = [`Energy kind: ${ENERGY_WORD[p.energy]}.`, `It ${ways}.`];
  if (p.jump) parts.push(`It can cross ${p.jump} empty square${p.jump > 1 ? 's' : ''} to reach the next piece.`);
  if (p.startsFrom.length === 1) parts.push(`Only something ${ENERGY_WORD[p.startsFrom[0]]} can start it.`);
  if ((p.needs || 1) > 1) parts.push(`It only goes when ${p.needs} chains reach it.`);
  if ((p.slow || 1) > 1) parts.push('It is slow and fun to watch.');
  return { name: nameOf(p), what_it_does: parts.join(' ') };
}

/* Strict check of what the browser sent. Returns a clean copy or null. */
function validate(body) {
  const isId = v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(byId, v);
  const isBool = v => typeof v === 'boolean';
  if (!body || typeof body !== 'object') return null;
  const { steps, not_moved, has_run, worked, rules, broke } = body;
  if (!Array.isArray(steps) || steps.length > 60 || !Array.isArray(not_moved) || not_moved.length > 60) return null;
  if (!steps.every(s => s && isId(s.piece) && Number.isInteger(s.count) && s.count >= 1 && s.count <= 60)) return null;
  if (!not_moved.every(isId) || !isBool(has_run) || !isBool(worked)) return null;
  if (!rules || !['start', 'chain', 'change', 'goal', 'repeat'].every(k => isBool(rules[k]))) return null;
  if (broke !== null && !(broke && isId(broke.at) && REASONS[broke.reason] && (broke.target === null || isId(broke.target)))) return null;
  return {
    steps: steps.map(s => ({ piece: s.piece, count: s.count })),
    not_moved: not_moved.slice(),
    has_run, worked,
    rules: { start: rules.start, chain: rules.chain, change: rules.change, goal: rules.goal, repeat: rules.repeat },
    broke: broke && { at: broke.at, reason: broke.reason, target: broke.target }
  };
}

/* Build the TypeSafe request: one Choice over this week's pieces. */
function buildRequest(m) {
  const label = id => nameOf(byId[id]);
  const kind = id => byId[id].role === 'step' ? ` (${ENERGY_WORD[byId[id].energy]})` : '';
  const onBoard = [...m.steps.map(s => s.piece), ...m.not_moved];
  const met = v => (v ? 'met' : 'not met yet');

  const state = {
    machine: {
      steps_in_order: m.steps.map(s => label(s.piece) + kind(s.piece) + (s.count > 1 ? ` x${s.count}` : '')),
      pieces_that_did_not_move: [...new Set(m.not_moved)].map(label),
      has_been_run: m.has_run
    },
    rules: {
      START: `${met(m.rules.start)} (has a START)`,
      CHAIN: `${met(m.rules.chain)} (3 or more steps pass energy along)`,
      CHANGE: `${met(m.rules.change)} (the energy changes kind, like falling dominos into a rolling marble)`,
      GOAL: `${met(m.rules.goal)} (the machine ends at a goal such as a cup)`,
      REPEAT: `${met(m.rules.repeat)} (worked 3 times in a row)`
    },
    last_run: !m.has_run ? 'The machine has not been run since it was last changed.'
      : m.worked ? 'The machine worked and reached its goal.'
      : m.broke && m.broke.reason === 'mismatch' && m.broke.target
        ? `The machine stopped between the ${label(m.broke.at)} and the ${label(m.broke.target)}: the ${label(m.broke.target)} cannot be started by something ${ENERGY_WORD[byId[m.broke.at].energy]}.`
      : m.broke ? `The machine stopped at the ${label(m.broke.at)} because ${REASONS[m.broke.reason]}.`
      : 'The machine stopped.'
  };

  // Code owns the obvious policy: one START is enough unless there's an AND gate to feed.
  const hasStart = m.rules.start;   // a START that moved isn't listed in steps
  const wantsTwoChains = onBoard.some(id => (byId[id].needs || 1) > 1);
  const options = unlocked.filter(p => !(p.role === 'start' && hasStart && !wantsTwoChains));

  const criteria = Object.fromEntries(options.map(p => [p.id, describe(p)]));
  return {
    model: MODEL,
    state,
    questions: {
      next_piece: {
        type: 'choice',
        instructions: {
          task: 'Young children (ages 5 to 8) are building a Rube Goldberg chain-reaction machine. Choose the ONE piece that would help their machine the most if they added it next.',
          how_to_choose: [
            'If `last_run` says the machine stopped, choose a piece that would fix the spot where it stopped.',
            'Otherwise choose a piece that helps meet a rule in `rules` that is not met yet.',
            'If every rule is met, choose a piece that would make the machine longer or more fun.'
          ]
        },
        criteria
      }
    }
  };
}

async function callJev(payload, apiKey) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(TYPESAFE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      if ((res.status === 429 || res.status === 529) && attempt === 0) { await new Promise(r => setTimeout(r, 400)); continue; }
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.answers && data.answers.next_piece ? { ...data.answers.next_piece, model: data.model } : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const reply = (statusCode, obj) => ({ statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return reply(503, { error: 'not configured' });
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (raw.length > MAX_BODY) return reply(413, { error: 'too large' });
  let body;
  try { body = JSON.parse(raw); } catch (e) { return reply(400, { error: 'bad json' }); }
  const machine = validate(body);
  if (!machine) return reply(400, { error: 'bad state' });

  const payload = buildRequest(machine);
  const answer = await callJev(payload, apiKey);
  if (!answer || !payload.questions.next_piece.criteria[answer.choice]) return reply(502, { error: 'no answer' });
  return reply(200, { piece: answer.choice, confidence: answer.confidence, model: answer.model });
}

module.exports = { handler, validate, buildRequest, describe };
