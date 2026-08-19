/* Encode the generated WAVs to Opus and prove the encoding cost nothing.
 *
 * Gemini returns 24 kHz 16-bit PCM, which is ~92 KB per short question — 4.4 MB
 * for the catalogue, on a phone, for audio nobody needs at CD fidelity. Opus at
 * 32 kbps mono takes the same clip to ~10 KB.
 *
 * Compression is only free if it stays intelligible, so every encoded clip is
 * round-tripped through the same Hungarian ASR as the source WAV and the two
 * scores are compared. A codec that smeared vowel length would show up here as
 * a WER that got worse after encoding.
 *
 *   node scripts/encode-audio.js [--bitrate 32] [--keep-wav]
 *
 * Writes public/audio/<hash>.opus and rewrites manifest.json to point at them.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const { wer, loadEnv, pool } = require('./wer');
const { utterances, key, ROOT } = require('./curriculum');

const AUDIO = path.join(ROOT, 'public', 'audio');
loadEnv(ROOT);
const DEEPGRAM = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM) { console.error('DEEPGRAM_API_KEY missing from .env.local'); process.exit(1); }

const brArg = process.argv.indexOf('--bitrate');
const BITRATE = brArg > -1 ? Number(process.argv[brArg + 1]) : 32;
const KEEP_WAV = process.argv.includes('--keep-wav');

/* Derived from the curriculum, not from manifest.json — a build interrupted
 * before it wrote the manifest still leaves encodable clips on disk, and the
 * hash makes the mapping recoverable either way. */
const manifestPath = path.join(AUDIO, 'manifest.json');
const byFile = Object.fromEntries(utterances().map((u) => [`${key(u.hu)}.wav`, u]));

async function transcribe(file, mime) {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=hu&punctuate=true', {
    method: 'POST',
    headers: { Authorization: `Token ${DEEPGRAM}`, 'Content-Type': mime },
    body: fs.readFileSync(file),
  });
  if (!res.ok) throw new Error(`deepgram ${res.status}`);
  return (await res.json()).results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
}

(async () => {
  const wavs = fs.readdirSync(AUDIO).filter((f) => f.endsWith('.wav') && byFile[f]);
  if (!wavs.length) { console.error('No WAVs with manifest entries in public/audio'); process.exit(1); }
  console.log(`encoding ${wavs.length} clips to Opus @ ${BITRATE} kbps mono, then verifying each\n`);

  const results = await pool(wavs, 4, async (wavName) => {
    const wavPath = path.join(AUDIO, wavName);
    const opusName = wavName.replace(/\.wav$/, '.opus');
    const opusPath = path.join(AUDIO, opusName);
    const { hu } = byFile[wavName];

    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath,
      '-c:a', 'libopus', '-b:a', `${BITRATE}k`, '-ac', '1',
      '-application', 'voip', opusPath]);

    const [wavText, opusText] = await Promise.all([
      transcribe(wavPath, 'audio/wav'),
      transcribe(opusPath, 'audio/ogg'),
    ]);

    return {
      hu, wavName, opusName,
      wavBytes: fs.statSync(wavPath).size,
      opusBytes: fs.statSync(opusPath).size,
      wavWer: wer(hu, wavText), opusWer: wer(hu, opusText), opusText,
    };
  });

  console.log('\n');
  const ok = results.filter((r) => !r.error);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const wavTotal = ok.reduce((a, r) => a + r.wavBytes, 0);
  const opusTotal = ok.reduce((a, r) => a + r.opusBytes, 0);

  console.log(`clips          ${ok.length}`);
  console.log(`WAV total      ${(wavTotal / 1e6).toFixed(2)} MB  (mean ${(wavTotal / ok.length / 1024).toFixed(0)} KB)`);
  console.log(`Opus total     ${(opusTotal / 1e6).toFixed(2)} MB  (mean ${(opusTotal / ok.length / 1024).toFixed(1)} KB)`);
  console.log(`saving         ${(100 - (opusTotal / wavTotal) * 100).toFixed(1)}%  (${(wavTotal / opusTotal).toFixed(1)}x smaller)`);
  console.log(`\nmean WER before ${(mean(ok.map((r) => r.wavWer)) * 100).toFixed(1)}%   after ${(mean(ok.map((r) => r.opusWer)) * 100).toFixed(1)}%`);

  const worse = ok.filter((r) => r.opusWer > r.wavWer);
  if (worse.length) {
    console.log(`\n${worse.length} clip(s) transcribed WORSE after encoding — the codec is the suspect:`);
    for (const r of worse.sort((a, b) => (b.opusWer - b.wavWer) - (a.opusWer - a.wavWer)))
      console.log(`  ${(r.wavWer * 100).toFixed(0)}% -> ${(r.opusWer * 100).toFixed(0)}%  ${r.opusName}\n        want: ${r.hu}\n         got: ${r.opusText || '(silence)'}`);
  } else {
    console.log('\nNo clip got worse after encoding.');
  }

  /* Rewritten from scratch each run against the Opus files actually on disk,
   * so it never carries a leftover entry pointing at a clip that a partial
   * build never produced.
   *
   * Enumerating the .opus files rather than this run's WAVs is what makes the
   * build resumable. The WAVs are deleted once encoded, so a second run sees
   * only the newly generated ones — listing those alone would silently drop
   * every previously finished clip from the manifest and send the app back to
   * device TTS for audio that is sitting right there. Clips encoded earlier
   * keep their recorded WER from the previous manifest; re-verifying them
   * would spend Deepgram calls to re-learn a number we already have. */
  const encodedNow = Object.fromEntries(ok.map((r) => [r.opusName, r]));
  const prior = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).clips || {}
    : {};

  const clips = {};
  for (const u of utterances().sort((a, b) => a.hu.localeCompare(b.hu, 'hu'))) {
    const opusName = `${key(u.hu)}.opus`;
    if (!fs.existsSync(path.join(AUDIO, opusName))) continue;
    const r = encodedNow[opusName];
    const score = r ? Number(r.opusWer.toFixed(3)) : prior[u.hu]?.wer;
    clips[u.hu] = {
      file: opusName, kind: u.kind, topic: u.topic, script: u.script,
      ...(score === undefined ? {} : { wer: score }),
    };
  }
  const total = utterances().length;
  fs.writeFileSync(manifestPath, JSON.stringify({
    format: { codec: 'opus', container: 'ogg', bitrateKbps: BITRATE, channels: 1 },
    coverage: { generated: Object.keys(clips).length, total },
    clips,
  }, null, 2));
  const missing = total - Object.keys(clips).length;
  if (missing) console.log(`\nNote: ${missing} utterance(s) still have no audio — the app falls back to device TTS for those.`);

  if (!KEEP_WAV) {
    for (const r of ok) fs.unlinkSync(path.join(AUDIO, r.wavName));
    console.log(`\nRemoved ${ok.length} WAV intermediates (--keep-wav to retain).`);
  }
})();
