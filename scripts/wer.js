/* Word error rate, shared by the round-trip and ASR-baseline tests.
 *
 * Accents are deliberately NOT folded. Vowel length (á/a, é/e, ő/ö, ű/ü) is
 * exactly what we are measuring, and normalizing it away would hide the only
 * errors worth finding.
 */

const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').split(/\s+/).filter(Boolean);

function wer(ref, hyp) {
  const r = words(ref), h = words(hyp);
  if (!r.length) return h.length ? 1 : 0;
  const d = Array.from({ length: r.length + 1 }, (_, i) =>
    Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / r.length;
}

/* Load KEY=value pairs from .env.local into process.env. */
function loadEnv(root) {
  const fs = require('node:fs');
  const path = require('node:path');
  for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

/* Bounded-concurrency map that never rejects — failures come back as {error}. */
async function pool(items, size, fn) {
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]).catch((e) => ({ error: e.message }));
      process.stdout.write(out[i].error ? 'x' : '.');
    }
  }));
  return out;
}

module.exports = { words, wer, loadEnv, pool };
