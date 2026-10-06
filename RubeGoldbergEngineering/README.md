# Machine Lab

A drag-and-drop Rube Goldberg playground for K-2. Pods build a machine on a
grid, press **GO**, debug the spot where it stopped, and print a diagram.

## Run it

- **On one computer:** double-click `index.html`. It opens in the browser and
  works with no internet connection.
- **Hosted:** copy the folder to any static host (school web space, GitHub
  Pages, Netlify drop). There's no build step. The only server code is the
  optional "What next?" function (see below).

Files: `index.html` and `styles.css` are the page, `pieces.js` holds the
pieces and the week setting, `sim.js` decides what happens when you press GO,
`suggest.js` handles "What next?", and `app.js` runs everything else.
`netlify/functions/suggest.js` is the small server piece for Jev (below).

## Change the week

Open `pieces.js` and change the number in this line:

```js
const CURRENT_WEEK = 4;
```

The tray shows every piece from that week and earlier. Pieces that are new
this week get an orange **NEW** badge. Save the file and reload the page.

## Add a piece

Add one entry to the `PIECES` list in `pieces.js`. The comment block at the
top of that file explains each field and includes a full example. In short:

```js
{ id: 'spoon', name: 'Spoon', week: 5, picture: 'pictures/spoon.png',
  role: 'step', energy: 'spring', startsFrom: ANY,
  sends: 'straight', jump: 2, needs: 1, slow: 1 },
```

- `picture` can be an image file next to `index.html` (PNG/JPG/SVG) or an
  inline `<svg>` drawing like the built-in pieces.
- `energy` (fall / roll / lift / spring) is what counts toward **CHANGE**.
- `startsFrom` sets what can make it go. `['roll']` means only something
  rolling will work, so a domino falling onto it is a "debug this spot".
- `jump` is how many empty squares it can cross. Ramps use 1 (low), 2
  (middle) and 3 (tall).
- Don't rename an `id` after kids have used it, because saved machines
  refer to pieces by id.

## How GO and the 5 rules work

The simulation is a fixed set of rules, not physics, so the same machine
gives the same result every time. When nothing reaches a goal, a **Debug this
spot!** marker appears where the energy stopped.

| Rule   | Checked when… |
|--------|---------------|
| START  | there's a START on the board |
| CHAIN  | the last run went through 3+ steps. A row of the same piece is one step (a domino row with curves is one step) and START isn't counted |
| CHANGE | the last run used 2 kinds of energy, e.g. falling dominos into a rolling marble |
| GOAL   | the last run reached a cup |
| REPEAT | 3 successful runs in a row. Any change to the machine resets the stars |

Two chains for an AND gate: place two START pieces (both go on GO), or let a
domino **Curve** split a row when there are pieces on both sides of it.

## Pods and saving

- The first time it opens, the app asks **Who is building?** (6 pods: animal
  plus color). Each pod's machine saves automatically in this browser. Tap
  the animal at the top to switch pods.
- Saves live in this browser on this computer. Clearing browsing data or
  switching browsers loses them, so use the buttons below.
- **Save to file** downloads one `.json` file with every pod's machine.
  **Open file** loads it on any computer and asks first before replacing
  pods.
- No accounts and no analytics. The only network call is the optional
  "What next?" suggestion, which sends the machine's pieces and rules and
  nothing about the kids (see below).

## Printing the diagram

Tap **Make my diagram**, then **Print**. In the print dialog choose **Save as
PDF** (or a printer). Landscape is already set. If the colors look missing,
turn on **Background graphics**.

## "What next?" suggestions (Jev)

The lightbulb button suggests one piece ("Try a Marble next?") and wiggles
it in the tray. It never places anything, so kids can take it or ignore it.

- **Without any setup** (including when you open `index.html` from a file or
  have no internet), suggestions come from built-in rules in `suggest.js`.
  For example: no START → START, a ramp nothing rolled into → marble, no
  goal → cup, only one kind of energy → a piece with a different kind, a
  working machine → the newest piece they haven't tried.
- **Jev is switched off right now** (`SUGGEST_URL = ''` at the top of
  `suggest.js`). To turn it on, set it to `'/.netlify/functions/suggest'` and
  follow the deploy steps below.
- **With Jev**, the app sends the machine to a small serverless function,
  which asks TypeSafe's Jev model to choose from this week's pieces. If Jev
  doesn't answer within 2.5 seconds, or anything goes wrong, the app quietly
  uses the built-in rules.

**What gets sent:** piece ids in run order, which pieces didn't move, which
of the 5 rules are met, and where it last stopped (e.g. `domino` → `ramp`,
"mismatch"). No pod names and nothing typed. The function rejects anything
else, and it builds the question for Jev itself from `pieces.js`.

### Deploy to Netlify (one time, about 10 minutes)

You need a free Netlify account and a TypeSafe API key from
https://console.typesafe.ai/keys.

1. In a terminal, in this folder, run:
   ```
   npx netlify-cli login
   npx netlify-cli deploy --prod
   ```
   When asked, choose **Create & configure a new project**, and press Enter
   to accept `.` as the publish directory. It prints your site's address,
   e.g. `https://machine-lab-xyz.netlify.app`.
2. Add the key as a secret setting (it stays on Netlify, never in the page):
   ```
   npx netlify-cli env:set TYPESAFE_API_KEY your-key-here
   npx netlify-cli deploy --prod
   ```
   (Or use Netlify's website: Project configuration → Environment variables →
   add `TYPESAFE_API_KEY`, then trigger a new deploy.)
3. Open your site's address on the school computers. "What next?" now uses
   Jev. When you change `pieces.js`, run `npx netlify-cli deploy --prod`
   again so the site and the suggestions both see the new pieces.

Notes:
- If you connect Netlify to the KodelyDemos GitHub repo instead of using the
  terminal, set **Base directory** to `RubeGoldbergEngineering`.
- Dragging the folder onto Netlify's "Drop" page publishes the app but **not**
  the function. Everything still works, but suggestions come from the rules.
- To use Jev while opening `index.html` from a file, set `SUGGEST_URL` at the
  top of `suggest.js` to your full function address, e.g.
  `https://machine-lab-xyz.netlify.app/.netlify/functions/suggest`. Set it
  to `''` to turn Jev off.
- To check that the key works, open the site, tap **What next?**, then look in
  Netlify → Logs → Functions → `suggest`. A 503 means the key isn't set and a
  502 means TypeSafe rejected the call. The kids just see a rule-based
  suggestion either way.
- Cost: TypeSafe charges per input token, and each suggestion is a small
  request, so a whole class's clicks for a session should come to pennies.
  Check usage in the TypeSafe console. The function address is public, but
  it only accepts machine states, so it can't be used as a general AI proxy.

## Tests

You need Node.js to run the tests. The app itself doesn't.

- `node tests/sim.test.js` checks the simulation (gaps, ramps, gates, the
  same result every run).
- `node tests/suggest.test.js` checks the rule-based suggestions, what gets
  sent, and the function (input checks, key handling, retries). It uses a
  pretend Jev, so it needs no key.
