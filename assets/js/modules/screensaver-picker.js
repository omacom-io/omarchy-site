// Inverse-frequency shuffle for the screensaver. Each pick increments that
// effect's count so it is less likely next time, and the last effect is
// never chosen again until another one has run.

export function createEffectPicker(names, random = Math.random) {
  const catalog = names.filter((name) => typeof name === 'string' && name.length > 0);
  const counts = new Map(catalog.map((name) => [name, 0]));
  let last = null;

  function pick() {
    if (catalog.length === 0) {
      throw new Error('effect catalog is empty');
    }

    const pool = catalog.length === 1 ? catalog : catalog.filter((name) => name !== last);
    let total = 0;
    const weights = pool.map((name) => {
      const weight = 1 / ((counts.get(name) ?? 0) + 1);
      total += weight;
      return weight;
    });

    let ticket = random() * total;
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      ticket -= weights[i];
      if (ticket <= 0) {
        chosen = pool[i];
        break;
      }
    }

    counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
    last = chosen;
    return chosen;
  }

  return { pick, counts, get last() { return last; } };
}
