/* Calibrate Deepgram's Hungarian on real native speech.
 *
 * The round-trip test measures TTS and ASR together — a bad score could mean
 * either. This isolates the ASR half: native Hungarian speakers reading
 * sentences whose transcripts were verified by humans, through the same
 * Deepgram model and the same WER function.
 *
 * The resulting number is the floor. Nothing we synthesize can score better
 * than Deepgram's own error rate on real speech, so it is the yardstick every
 * round-trip figure has to be read against.
 *
 * Corpus: google/fleurs hu_hu dev split (CC-BY-4.0), fetched to /tmp:
 *   curl -sL https://huggingface.co/datasets/google/fleurs/resolve/main/data/hu_hu/audio/dev.tar.gz -o /tmp/fleurs-hu-dev.tar.gz
 *   curl -sL https://huggingface.co/datasets/google/fleurs/resolve/main/data/hu_hu/dev.tsv -o /tmp/fleurs-hu-dev.tsv
 *   mkdir -p /tmp/fleurs-hu && tar xzf /tmp/fleurs-hu-dev.tar.gz -C /tmp/fleurs-hu
 *
 *   node scripts/asr-baseline.js [count]
 */

const fs = require('node:fs');
const path = require('node:path');
const { wer, loadEnv, pool } = require('./wer');

const ROOT = path.join(__dirname, '..');
loadEnv(ROOT);
const KEY = process.env.DEEPGRAM_API_KEY;
if (!KEY) { console.error('DEEPGRAM_API_KEY missing from .env.local'); process.exit(1); }

const CORPUS = '/tmp/fleurs-hu/dev';
const TSV = '/tmp/fleurs-hu-dev.tsv';
const COUNT = Number(process.argv[2] || 40);

if (!fs.existsSync(TSV)) { console.error(`Corpus missing — see the header of this file for the fetch commands.`); process.exit(1); }

/* FLEURS TSV: id, filename, raw transcript, normalized transcript, chars, samples, gender */
const rows = fs.readFileSync(TSV, 'utf8').split('\n').filter(Boolean).map((l) => {
  const c = l.split('\t');
  return { file: c[1], ref: c[2], gender: c[6] };
}).filter((r) => r.file && r.ref && fs.existsSync(path.join(CORPUS, r.file)));

/* Deterministic spread across the corpus rather than the first N, which would
 * over-sample whichever speaker happens to lead the file. */
const step = Math.max(1, Math.floor(rows.length / COUNT));
const sample = rows.filter((_, i) => i % step === 0).slice(0, COUNT);

async function transcribe(file) {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=hu&punctuate=true', {
    method: 'POST',
    headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'audio/wav' },
    body: fs.readFileSync(path.join(CORPUS, file)),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const alt = (await res.json()).results?.channels?.[0]?.alternatives?.[0];
  return { transcript: alt?.transcript ?? '', confidence: alt?.confidence ?? 0 };
}

(async () => {
  console.log(`${rows.length} clips available, testing ${sample.length} native-speaker recordings\n`);
  const results = (await pool(sample, 5, async (r) => {
    const { transcript, confidence } = await transcribe(r.file);
    return { ...r, transcript, confidence, wer: wer(r.ref, transcript) };
  })).filter((r) => !r.error);
  console.log('\n');

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const wers = results.map((r) => r.wer).sort((a, b) => a - b);
  const median = wers[Math.floor(wers.length / 2)];

  console.log('DEEPGRAM NOVA-3 HUNGARIAN — native speech baseline');
  console.log(`  clips        ${results.length}`);
  console.log(`  mean WER     ${(mean(wers) * 100).toFixed(1)}%`);
  console.log(`  median WER   ${(median * 100).toFixed(1)}%`);
  console.log(`  mean conf    ${mean(results.map((r) => r.confidence)).toFixed(3)}`);
  console.log(`  perfect      ${results.filter((r) => r.wer === 0).length}/${results.length}`);

  /* Reported for completeness, but note the FLEURS hu_hu dev split is
   * entirely male — all 407 clips. There is no female-voice validation here,
   * which matters since the official on the day could be either. */
  for (const g of ['MALE', 'FEMALE']) {
    const s = results.filter((r) => r.gender === g);
    if (s.length) console.log(`  ${g.toLowerCase().padEnd(12)} ${(mean(s.map((r) => r.wer)) * 100).toFixed(1)}%  (n=${s.length})`);
  }

  console.log('\nWORST 5 —');
  for (const r of [...results].sort((a, b) => b.wer - a.wer).slice(0, 5))
    console.log(`  ${(r.wer * 100).toFixed(0)}%\n     want: ${r.ref}\n      got: ${r.transcript || '(silence)'}`);

  fs.writeFileSync(path.join(ROOT, 'samples', 'asr-baseline.json'), JSON.stringify(results, null, 2));
})();
