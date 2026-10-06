/* =====================================================================
   MACHINE LAB · PIECES
   =====================================================================

   1) WHICH WEEK IS IT?
      Change CURRENT_WEEK below. The tray shows every piece whose `week`
      is this number or lower. Pieces from the current week get a "NEW"
      badge. (Pieces already on a saved board stay there even if you set
      the week back.)

   2) HOW TO ADD A PIECE
      Copy one entry in the PIECES list, paste it at the end, and change it:

        id         a short unique word, no spaces (saved machines use it,
                   so don't rename an id once kids have used it)
        name       the label kids see under the picture (keep it 1-2 words)
        week       the week it unlocks
        picture    an <svg> drawing (viewBox 0 0 100 100), OR the path to
                   an image file next to index.html, e.g. 'pictures/spoon.png'
        role       'start'  = kicks the machine off when GO is pressed
                   'step'   = a normal piece that passes energy on
                   'goal'   = the machine wins when energy reaches it
        energy     the kind of motion it makes. Using two different kinds
                   in one run is what fills in the CHANGE rule:
                     'push'   (START only)
                     'fall'   tips or falls over (dominos)
                     'roll'   rolls (marbles, cars)
                     'lift'   lifts, swings or flips (levers, pulleys)
                     'spring' stretches and snaps (rubber bands)
        startsFrom which kinds of energy can set it off. ANY = all of them.
                   e.g. ['roll'] means "only something rolling makes it go".
        sends      which way it passes energy to the next square:
                     'straight' keeps going the same way
                     'turn'     turns left and/or right (toward neighbors)
                     'spread'   any way except back where it came from
                     'all'      every way (START)
        jump       how many EMPTY squares it can cross to reach the next
                   piece (0 = must touch). Taller ramp = bigger jump.
        needs      how many different sides must deliver energy before it
                   goes (1 for almost everything, 2 for an AND gate)
        slow       how many ticks it takes (1 normal, bigger = slower)
        stepWith   (optional) count it as the same step as another piece
                   when they touch, e.g. a domino curve is part of a domino
                   row. Leave it out to make the piece its own step.

      Example: a spoon catapult for week 5 would be

        { id: 'spoon', name: 'Spoon', week: 5, picture: 'pictures/spoon.png',
          role: 'step', energy: 'spring', startsFrom: ANY,
          sends: 'straight', jump: 2, needs: 1, slow: 1 },

      Save the file and reload the page. That's it.
   ===================================================================== */

const CURRENT_WEEK = 4;

const ANY = ['push', 'fall', 'roll', 'lift', 'spring'];

/* Drawings share these colors so the tray looks like one set. */
const C = {
  ink: '#2c3e50', blue: '#3498db', green: '#2ecc71', orange: '#e67e22',
  red: '#e74c3c', yellow: '#f1c40f', wood: '#c8925a', woodDark: '#9a6a3a',
  cream: '#fdf6e3', grey: '#95a5a6', purple: '#9b59b6'
};

const svg = inner =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">${inner}</svg>`;

const domino = (x, y, rot) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})">
     <rect x="-8" y="-22" width="16" height="44" rx="3" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
     <line x1="-6" y1="0" x2="6" y2="0" stroke="${C.ink}" stroke-width="2"/>
     <circle cx="0" cy="-11" r="2.6" fill="${C.ink}"/><circle cx="0" cy="11" r="2.6" fill="${C.ink}"/>
   </g>`;

const marble = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.blue}" stroke="${C.ink}" stroke-width="3"/>
   <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".8"/>`;

const ramp = (h, withMarble = true) => {
  const top = 86 - h;
  return `<path d="M10 86 L90 86 L90 ${top} Z" fill="${C.wood}" stroke="${C.ink}" stroke-width="3"/>
          <path d="M14 84 L88 ${top + 4}" stroke="${C.woodDark}" stroke-width="3"/>
          ${withMarble ? marble(80, top - 4, 7) : ''}`;
};

const gate = (label, color) => svg(`
  <path d="M6 30 H34 M6 70 H34 M66 50 H94" stroke="${color}" stroke-width="7"/>
  <rect x="30" y="24" width="40" height="52" rx="8" fill="${color}" stroke="${C.ink}" stroke-width="3"/>
  <text x="50" y="57" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="17" fill="#fff">${label}</text>`);

const PIECES = [
  /* ---------------- WEEK 1 ---------------- */
  {
    id: 'start', name: 'START', week: 1,
    picture: svg(`
      <rect x="18" y="62" width="64" height="22" rx="6" fill="${C.grey}" stroke="${C.ink}" stroke-width="3"/>
      <ellipse cx="50" cy="60" rx="26" ry="12" fill="#c0392b" stroke="${C.ink}" stroke-width="3"/>
      <ellipse cx="50" cy="52" rx="26" ry="12" fill="${C.red}" stroke="${C.ink}" stroke-width="3"/>
      <path d="M50 8 V32 M40 22 L50 33 L60 22" stroke="${C.ink}" stroke-width="6" fill="none"/>`),
    role: 'start', energy: 'push', startsFrom: [],
    sends: 'all', jump: 0, needs: 1, slow: 1
  },
  {
    id: 'domino', name: 'Domino', week: 1,
    picture: svg(domino(30, 54, 0) + domino(52, 54, 0) + domino(76, 56, 22)),
    role: 'step', energy: 'fall', startsFrom: ANY,
    sends: 'straight', jump: 0, needs: 1, slow: 1
  },
  {
    id: 'marble', name: 'Marble', week: 1,
    picture: svg(marble(50, 52, 26)),
    role: 'step', energy: 'roll', startsFrom: ANY,
    sends: 'straight', jump: 1, needs: 1, slow: 1
  },
  {
    id: 'ramp', name: 'Ramp', week: 1,
    weekNames: { 4: 'Middle ramp' },  // label changes once the 3 heights unlock
    picture: svg(ramp(46)),
    role: 'step', energy: 'roll', startsFrom: ['roll'],
    sends: 'straight', jump: 2, needs: 1, slow: 1, stepWith: 'ramp'
  },
  {
    id: 'cup', name: 'Cup', week: 1,
    picture: svg(`
      <path d="M24 22 H76 L68 88 H32 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="3"/>
      <ellipse cx="50" cy="22" rx="26" ry="6" fill="#c0392b" stroke="${C.ink}" stroke-width="3"/>
      <circle cx="50" cy="56" r="15" fill="#fff" stroke="${C.ink}" stroke-width="2"/>
      <circle cx="50" cy="56" r="9" fill="${C.red}"/><circle cx="50" cy="56" r="3.5" fill="#fff"/>`),
    role: 'goal', energy: 'fall', startsFrom: ANY,
    sends: 'straight', jump: 0, needs: 1, slow: 1
  },

  /* ---------------- WEEK 2 ---------------- */
  {
    id: 'lever', name: 'Lever', week: 2,
    picture: svg(`
      <path d="M50 58 L36 86 H64 Z" fill="${C.grey}" stroke="${C.ink}" stroke-width="3"/>
      <rect x="8" y="48" width="84" height="11" rx="5" fill="${C.wood}" stroke="${C.ink}" stroke-width="3" transform="rotate(-16 50 54)"/>
      ${marble(22, 52, 8)}`),
    role: 'step', energy: 'lift', startsFrom: ['push', 'fall', 'roll', 'spring'],
    sends: 'straight', jump: 1, needs: 1, slow: 1
  },
  {
    id: 'car', name: 'Toy car', week: 2,
    picture: svg(`
      <path d="M10 66 V52 Q12 46 20 46 L32 46 L42 30 H66 L78 46 Q90 47 90 56 V66 Z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/>
      <path d="M45 34 H63 L72 46 H38 Z" fill="#d6eaf8" stroke="${C.ink}" stroke-width="2.5"/>
      <circle cx="28" cy="68" r="10" fill="${C.ink}"/><circle cx="28" cy="68" r="4" fill="${C.grey}"/>
      <circle cx="72" cy="68" r="10" fill="${C.ink}"/><circle cx="72" cy="68" r="4" fill="${C.grey}"/>`),
    role: 'step', energy: 'roll', startsFrom: ANY,
    sends: 'straight', jump: 2, needs: 1, slow: 1
  },
  {
    id: 'pulley', name: 'Pulley', week: 2,
    picture: svg(`
      <rect x="12" y="8" width="76" height="9" rx="4" fill="${C.woodDark}" stroke="${C.ink}" stroke-width="3"/>
      <path d="M50 17 V24" stroke="${C.ink}" stroke-width="3"/>
      <circle cx="50" cy="36" r="14" fill="${C.grey}" stroke="${C.ink}" stroke-width="3"/>
      <circle cx="50" cy="36" r="4" fill="${C.ink}"/>
      <path d="M36 36 V70 M64 36 V54" stroke="${C.ink}" stroke-width="2.5"/>
      <path d="M26 70 H46 L43 88 H29 Z" fill="${C.orange}" stroke="${C.ink}" stroke-width="3"/>
      <rect x="57" y="54" width="14" height="14" rx="2" fill="${C.purple}" stroke="${C.ink}" stroke-width="3"/>`),
    role: 'step', energy: 'lift', startsFrom: ['push', 'fall', 'roll', 'spring'],
    sends: 'spread', jump: 0, needs: 1, slow: 1
  },
  {
    id: 'rubberband', name: 'Rubber band', week: 2,
    picture: svg(`
      <path d="M30 88 V58 L16 22 M30 58 L44 22" stroke="${C.woodDark}" stroke-width="9" fill="none"/>
      <path d="M70 88 V58 L56 22 M70 58 L84 22" stroke="${C.woodDark}" stroke-width="9" fill="none"/>
      <path d="M16 24 Q50 62 84 24" stroke="${C.green}" stroke-width="6" fill="none"/>
      <path d="M44 24 Q50 34 56 24" stroke="${C.green}" stroke-width="4" fill="none"/>`),
    role: 'step', energy: 'spring', startsFrom: ['push', 'fall', 'roll', 'lift'],
    sends: 'straight', jump: 3, needs: 1, slow: 1
  },

  /* ---------------- WEEK 3 ---------------- */
  {
    id: 'curve', name: 'Curve', week: 3,
    picture: svg(domino(22, 72, 90) + domino(38, 50, 60) + domino(60, 34, 30) + domino(84, 28, 6)),
    role: 'step', energy: 'fall', startsFrom: ANY,
    sends: 'turn', jump: 0, needs: 1, slow: 1, stepWith: 'domino'
  },
  {
    id: 'and', name: 'AND gate', week: 3,
    picture: gate('AND', C.blue),
    role: 'step', energy: 'fall', startsFrom: ANY,
    sends: 'spread', jump: 0, needs: 2, slow: 1
  },
  {
    id: 'or', name: 'OR gate', week: 3,
    picture: gate('OR', C.green),
    role: 'step', energy: 'fall', startsFrom: ANY,
    sends: 'spread', jump: 0, needs: 1, slow: 1
  },

  /* ---------------- WEEK 4 ---------------- */
  {
    id: 'ramp-low', name: 'Low ramp', week: 4,
    picture: svg(ramp(22)),
    role: 'step', energy: 'roll', startsFrom: ['roll'],
    sends: 'straight', jump: 1, needs: 1, slow: 1, stepWith: 'ramp'
  },
  {
    id: 'ramp-tall', name: 'Tall ramp', week: 4,
    picture: svg(ramp(72)),
    role: 'step', energy: 'roll', startsFrom: ['roll'],
    sends: 'straight', jump: 3, needs: 1, slow: 1, stepWith: 'ramp'
  },
  {
    id: 'spiral', name: 'Spiral', week: 4,
    picture: svg(`
      <path d="M50 8 V92" stroke="${C.grey}" stroke-width="5"/>
      <path d="M24 16 Q50 30 76 22 Q90 32 76 40 Q50 50 24 42 Q10 52 24 60 Q50 70 76 62 Q90 72 76 80 Q50 90 30 86"
            stroke="${C.orange}" stroke-width="7" fill="none"/>
      ${marble(28, 12, 7)}`),
    role: 'step', energy: 'roll', startsFrom: ['roll'],
    sends: 'straight', jump: 1, needs: 1, slow: 3
  }
];

if (typeof module !== 'undefined') module.exports = { PIECES, CURRENT_WEEK, ANY };
