/* Score arbitrary clips through the same round-trip as the Inworld set.
 *
 * Drop files into samples/ named  <vendor>__<sentenceId>.<wav|mp3>  where
 * sentenceId matches an id in tts-samples.js — e.g. gemini__ismetelni.wav or
 * phone__lassabban.mp3. Everything is scored with the same WER function and
 * the same Deepgram model, so numbers are comparable across vendors and
 * against the native-speech baseline from asr-baseline.js.
 *
 *   node scripts/score-clips.js [vendorPrefix ...]
 */

const fs = require('node:fs');
const path = require('node:path');
const { wer, loadEnv, pool } = require('./wer');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'samples');
loadEnv(ROOT);
const KEY = process.env.DEEPGRAM_API_KEY;
if (!KEY) { console.error('DEEPGRAM_API_KEY missing from .env.local'); process.exit(1); }

const idx = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
const textFor = Object.fromEntries(idx.sentences.map((s) => [s.id, s.hu]));

/* Everything the Inworld run produced is already scored in roundtrip.json;
 * this deliberately skips those so a stray re-run does not double-bill. */
const known = new Set(idx.clips.map((c) => c.file));
const wanted = process.argv.slice(2);

const clips = fs.readdirSync(OUT)
  .filter((f) => /\.(wav|mp3|m4a|ogg|flac)$/i.test(f) && !known.has(f) && f.includes('__'))
  .map((f) => ({ file: f, vendor: f.split('__')[0], sentence: f.split('__')[1].replace(/\.[^.]+$/, '') }))
  .filter((c) => (!wanted.length || wanted.includes(c.vendor)) && textFor[c.sentence]);

const MIME = { wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac' };

async function transcribe(file) {
  const ext = file.split('.').pop().toLowerCase();
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=hu&punctuate=true', {
    method: 'POST',
    headers: { Authorization: `Token ${KEY}`, 'Content-Type': MIME[ext] || 'audio/wav' },
    body: fs.readFileSync(path.join(OUT, file)),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const alt = (await res.json()).results?.channels?.[0]?.alternatives?.[0];
  return { transcript: alt?.transcript ?? '', confidence: alt?.confidence ?? 0 };
}

(async () => {
  if (!clips.length) { console.error('No matching clips in samples/ — expected <vendor>__<sentenceId>.wav'); process.exit(1); }
  console.log(`scoring ${clips.length} clips: ${[...new Set(clips.map((c) => c.vendor))].join(', ')}\n`);

  const results = (await pool(clips, 4, async (c) => {
    const { transcript, confidence } = await transcribe(c.file);
    const ref = textFor[c.sentence];
    return { ...c, ref, transcript, confidence, wer: wer(ref, transcript) };
  })).filter((r) => !r.error);
  console.log('\n');

  for (const r of results.sort((a, b) => a.wer - b.wer)) {
    const flag = r.wer === 0 ? '  ✓' : r.wer > 0.5 ? '  ✗' : '';
    console.log(`${(r.wer * 100).toFixed(0).padStart(4)}%  ${r.vendor}/${r.sentence}${flag}`);
    console.log(`       want: ${r.ref}`);
    console.log(`        got: ${r.transcript || '(silence)'}\n`);
  }

  const byVendor = {};
  for (const r of results) (byVendor[r.vendor] = byVendor[r.vendor] || []).push(r.wer);
  console.log('MEAN WER BY VENDOR  (Deepgram floor on native speech: 13.9%)');
  for (const [v, ws] of Object.entries(byVendor).sort((a, b) =>
    a[1].reduce((x, y) => x + y, 0) / a[1].length - b[1].reduce((x, y) => x + y, 0) / b[1].length))
    console.log(`  ${v.padEnd(12)} ${(ws.reduce((a, b) => a + b, 0) / ws.length * 100).toFixed(1).padStart(6)}%  (n=${ws.length})`);

  fs.writeFileSync(path.join(OUT, 'scored-clips.json'), JSON.stringify(results, null, 2));
})();
