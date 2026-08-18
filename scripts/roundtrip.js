/* Round-trip test: does a generated clip transcribe back as the Hungarian
 * that produced it?
 *
 * Synthesize -> Deepgram Nova-3 (hu) -> compare to the source text. This is
 * an objective floor test: if a Hungarian ASR model cannot recover the words,
 * the voice is producing the wrong sounds and no amount of pleasant tone
 * saves it. It does NOT certify nativeness — ASR is tolerant of accent and
 * will snap toward plausible words — so surviving clips still need ears.
 *
 *   node scripts/roundtrip.js   (run tts-samples.js first)
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'samples');

for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.DEEPGRAM_API_KEY;
if (!KEY) { console.error('DEEPGRAM_API_KEY missing from .env.local'); process.exit(1); }

const idx = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
const textFor = Object.fromEntries(idx.sentences.map((s) => [s.id, s.hu]));

/* Compare on words, ignoring case and punctuation — but NOT stripping
 * accents. Vowel length is the thing under test; folding á into a would
 * hide exactly the errors we are hunting for. */
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

async function transcribe(file) {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=hu&punctuate=true', {
    method: 'POST',
    headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'audio/mpeg' },
    body: fs.readFileSync(path.join(OUT, file)),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const alt = (await res.json()).results?.channels?.[0]?.alternatives?.[0];
  return { transcript: alt?.transcript ?? '', confidence: alt?.confidence ?? 0 };
}

/* Small pool — enough to finish quickly, polite enough not to get throttled. */
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

(async () => {
  const results = await pool(idx.clips, 5, async (c) => {
    const { transcript, confidence } = await transcribe(c.file);
    const ref = textFor[c.sentence];
    return { ...c, ref, transcript, confidence, wer: wer(ref, transcript) };
  });
  console.log('');

  const ok = results.filter((r) => !r.error);
  fs.writeFileSync(path.join(OUT, 'roundtrip.json'), JSON.stringify(ok, null, 2));

  const by = (keyFn) => {
    const g = {};
    for (const r of ok) (g[keyFn(r)] = g[keyFn(r)] || []).push(r);
    return Object.entries(g)
      .map(([k, v]) => [k, v.reduce((a, b) => a + b.wer, 0) / v.length,
        v.reduce((a, b) => a + b.confidence, 0) / v.length, v.length])
      .sort((a, b) => a[1] - b[1]);
  };

  const table = (title, rows) => {
    console.log(`\n${title}`);
    console.log('  ' + 'key'.padEnd(30) + 'WER'.padStart(7) + 'conf'.padStart(8) + 'n'.padStart(5));
    for (const [k, w, c, n] of rows)
      console.log('  ' + k.padEnd(30) + (w * 100).toFixed(1).padStart(6) + '%' + c.toFixed(3).padStart(8) + String(n).padStart(5));
  };

  table('BY VOICE + MODEL (lower WER = closer to real Hungarian)', by((r) => `${r.voice} / ${r.model.replace('inworld-tts-', 'v')}`));
  table('BY VOICE', by((r) => r.voice));
  table('BY MODEL', by((r) => r.model));
  table('BY SENTENCE (which lines break every voice)', by((r) => r.sentence));

  console.log('\nWORST 8 —');
  for (const r of [...ok].sort((a, b) => b.wer - a.wer).slice(0, 8))
    console.log(`  ${(r.wer * 100).toFixed(0)}%  ${r.voice}/${r.model.replace('inworld-tts-', 'v')}\n     want: ${r.ref}\n      got: ${r.transcript || '(silence)'}`);

  console.log('\nBEST 8 —');
  for (const r of [...ok].sort((a, b) => a.wer - b.wer).slice(0, 8))
    console.log(`  ${(r.wer * 100).toFixed(0)}%  ${r.voice}/${r.model.replace('inworld-tts-', 'v')}\n     want: ${r.ref}\n      got: ${r.transcript || '(silence)'}`);
})();
