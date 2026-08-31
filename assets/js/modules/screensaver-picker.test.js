import assert from 'node:assert/strict';
import { createEffectPicker } from './screensaver-picker.js';

function sequence(names, randoms) {
  let i = 0;
  const picker = createEffectPicker(names, () => {
    const value = randoms[Math.min(i, randoms.length - 1)];
    i += 1;
    return value;
  });
  const picked = randoms.map(() => picker.pick());
  return { picked, picker };
}

{
  const { picked, picker } = sequence(['beams', 'matrix'], [0, 0, 0]);
  assert.deepEqual(picked, ['beams', 'matrix', 'beams']);
  assert.equal(picker.counts.get('beams'), 2);
  assert.equal(picker.counts.get('matrix'), 1);
}

{
  const { picked } = sequence(['beams', 'matrix'], [0.999, 0.999, 0.999]);
  assert.deepEqual(picked, ['matrix', 'beams', 'matrix']);
}

{
  // beams at count 9 weighs 0.1, matrix at 0 weighs 1. A mid ticket hits matrix.
  const biased = createEffectPicker(['beams', 'matrix'], () => 0.5);
  biased.counts.set('beams', 9);
  biased.counts.set('matrix', 0);
  assert.equal(biased.pick(), 'matrix');
}

{
  const picker = createEffectPicker(['decrypt']);
  assert.equal(picker.pick(), 'decrypt');
  assert.equal(picker.pick(), 'decrypt');
}

{
  assert.throws(() => createEffectPicker([]).pick(), /empty/);
}

console.log('screensaver-picker: ok');
