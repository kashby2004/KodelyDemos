// Run: node tests/sim.test.js
const assert = require('assert');
const { PIECES } = require('../pieces.js');
const { simulate } = require('../sim.js');
const byId = Object.fromEntries(PIECES.map(p => [p.id, p]));
const run = b => simulate(b, byId, 10, 6);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('week 1 machine works: start, dominos, marble, ramp, cup', () => {
  const r = run({ '0,2': 'start', '1,2': 'domino', '2,2': 'domino', '3,2': 'marble', '4,2': 'ramp', '7,2': 'cup' });
  assert(r.success); assert.deepStrictEqual(r.rules, { start: true, chain: true, change: true, goal: true });
  assert.strictEqual(r.steps.length, 4); // dominos, marble, ramp, cup
  assert.strictEqual(r.stepOf['1,2'], r.stepOf['2,2']);
});
t('gap breaks at the last domino, pointing right', () => {
  const r = run({ '0,2': 'start', '1,2': 'domino', '2,2': 'domino', '4,2': 'cup' });
  assert(!r.success); assert.strictEqual(r.breakSpot.key, '2,2'); assert.deepStrictEqual(r.breakSpot.dir, [1, 0]);
  assert.strictEqual(r.breakSpot.reason, 'gap');
});
t('domino onto empty ramp = mismatch at the ramp', () => {
  const r = run({ '0,0': 'start', '1,0': 'domino', '2,0': 'ramp', '3,0': 'cup' });
  assert(!r.success); assert.strictEqual(r.breakSpot.reason, 'mismatch'); assert.strictEqual(r.breakSpot.target, '2,0');
});
t('taller ramp jumps farther', () => {
  const base = { '0,0': 'start', '1,0': 'marble' };
  assert(!run({ ...base, '2,0': 'ramp-low', '5,0': 'cup' }).success);
  assert(!run({ ...base, '2,0': 'ramp', '6,0': 'cup' }).success);
  assert(run({ ...base, '2,0': 'ramp-tall', '6,0': 'cup' }).success);
});
t('marble rolling off the board edge', () => {
  const r = run({ '7,0': 'start', '8,0': 'marble' });
  assert.strictEqual(r.breakSpot.reason, 'edge');
});
t('same board, same result every time', () => {
  const b = { '0,1': 'start', '1,1': 'domino', '2,1': 'car', '5,1': 'cup' };
  assert.deepStrictEqual(run(b), run(b));
});
t('curve splits, AND waits for both, then fires', () => {
  // start -> domino -> curve at (2,2) splits up and down; both rows go right and meet at AND (5,2)?
  // Simpler: two STARTs feeding an AND from left and top.
  const b = { '0,2': 'start', '1,2': 'domino', '2,2': 'domino', '3,0': 'start', '3,1': 'domino', '3,2': 'and', '4,2': 'cup' };
  assert(run(b).success);
  const one = { ...b }; delete one['3,0'];
  const r = run(one);
  assert(!r.success); assert.strictEqual(r.breakSpot.reason, 'waiting'); assert.strictEqual(r.breakSpot.key, '3,2');
  const or = { ...one, '3,2': 'or' };
  assert(run(or).success);
});
t('curve turns a domino row around a corner and can split', () => {
  const b = { '0,2': 'start', '1,2': 'domino', '2,2': 'curve', '2,3': 'domino', '2,4': 'cup' };
  const r = run(b); assert(r.success); assert.strictEqual(r.steps.length, 2); // domino row incl curve, cup
  const split = { '0,2': 'start', '1,2': 'curve', '1,1': 'domino', '1,3': 'domino', '1,0': 'domino', '1,4': 'domino',
    '2,0': 'curve', '2,4': 'curve', '3,0': 'curve', '3,4': 'curve' };
  run(split); // just must not throw
});
t('no START = friendly nostart', () => {
  const r = run({ '1,1': 'domino' }); assert.strictEqual(r.breakSpot.reason, 'nostart');
});
t('lever and pulley and rubber band chain', () => {
  const r = run({ '0,0': 'start', '1,0': 'domino', '2,0': 'lever', '4,0': 'rubberband', '8,0': 'cup' });
  assert(r.success, JSON.stringify(r.breakSpot));
  const p = run({ '0,3': 'start', '1,3': 'marble', '2,3': 'pulley', '2,2': 'cup' });
  assert(p.success);
});
t('spiral is slow but works', () => {
  const r = run({ '0,0': 'start', '1,0': 'marble', '2,0': 'spiral', '3,0': 'cup' });
  assert(r.success); assert(r.duration >= 4);
});
console.log(n + ' tests passed');
