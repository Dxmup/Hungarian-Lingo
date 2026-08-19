/* Build the audio catalogue.
 *
 * Every clip is generated, then round-tripped through Deepgram's Hungarian
 * model and only kept if the words come back. Gemini TTS is non-deterministic
 * and will occasionally drop a word — silently, which is the worst failure
 * this app can have, since a learner drills the gap without ever knowing. The
 * QA gate turns that from a risk into a retry.
 *
 *   node scripts/build-audio.js [--force] [--limit N] [--rpm N]
 *
 * Everything whose Hungarian is fixed is generated — questions, variants, and
 * the chunks and model answers that carry no ___ slot. What the utterance list
 * covers is decided in scripts/curriculum.js, shared with the encode step so
 * the two cannot drift.
 *
 * Writes public/audio/<hash>.wav plus public/audio/manifest.json, keyed by a
 * hash of the Hungarian text — change the text and it becomes a new file, so
 * stale audio can never silently attach to an edited question.
 */

const fs = require('node:fs');
const path = require('node:path');
const { wer, loadEnv, pool } = require('./wer');
const { utterances, key, ROOT } = require('./curriculum');

const AUDIO = path.join(ROOT, 'public', 'audio');
loadEnv(ROOT);

const GEMINI = process.env.GEMINI_API_KEY;
const DEEPGRAM = process.env.DEEPGRAM_API_KEY;
if (!GEMINI || !DEEPGRAM) { console.error('GEMINI_API_KEY and DEEPGRAM_API_KEY required in .env.local'); process.exit(1); }

const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE = 'Zephyr';
const MAX_TRIES = 4;
const PASS_WER = 0.25;   // one wrong word in a four-word question

const flag = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};

const force = process.argv.includes('--force');
const LIMIT = flag('--limit', Infinity);
const RPM = flag('--rpm', 5);

/* A clip is already generated if either intermediate is on disk. Checking only
 * the WAV would be wrong on any resumed run: the encode step deletes the WAVs
 * once they are safely in Opus, so every previously finished clip would look
 * missing and be paid for again. */
const done = (hu) =>
  fs.existsSync(path.join(AUDIO, `${key(hu)}.wav`)) || fs.existsSync(path.join(AUDIO, `${key(hu)}.opus`));

function wavHeader(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Stay under the free tier's requests-per-minute ceiling by asking permission
 * before each call rather than apologising after a 429.
 *
 * The gate counts requests, not clips: a clip that fails the WER gate is
 * re-synthesized up to MAX_TRIES times, so pacing per utterance would still
 * burst four requests at a hard question. A sliding window over the last
 * minute is enough given the run is serial.
 *
 * This matters beyond politeness — the free tier also has a *daily* cap, and
 * hammering into per-minute 429s appears to burn it faster than the audio we
 * get back is worth. */
const sent = [];
async function gate() {
  for (;;) {
    const now = Date.now();
    while (sent.length && now - sent[0] >= 60_000) sent.shift();
    if (sent.length < RPM) { sent.push(now); return; }
    await sleep(60_000 - (now - sent[0]) + 250);
  }
}

/* Longest pace-out worth waiting through. A per-minute 429 hints tens of
 * seconds; the daily cap hints the hours until midnight Pacific, and sleeping
 * on that looks identical to a working build that has gone quiet — this run
 * sat on one for an hour before anyone noticed. Fail loudly instead. */
const MAX_BACKOFF_S = 300;

/* Bare text is the default and is what the whole catalogue was calibrated on:
 * a style instruction ("Mondd ki magyarul, ...: Hogy van?") makes the model
 * treat a short utterance as a question to answer rather than text to speak,
 * returning finishReason OTHER with no content parts, which killed all seven
 * of the shortest questions.
 *
 * Some conversational chunks fail the same way without any prefix, because
 * the sentence itself is addressed to a listener — "Elnézést, nem értem." is
 * something to answer, so the API rejects the call outright with a 400. That
 * is deterministic, not flaky: four bare attempts fail four times.
 *
 * "Say:" is enough to put it back in TTS mode, so it is the fallback rather
 * than the default — narrowly applied to the utterances that cannot be
 * rendered otherwise, leaving the calibrated clips untouched. If the model
 * ever speaks the prefix, the WER gate sees the extra word and catches it. */
const ANSWERED_INSTEAD = /should only be used for TTS/;
const SPEAK = (hu) => `Say: ${hu}`;

/* A different, milder version of the same confusion: the call succeeds with
 * 200 but the candidate carries no audio part, finishReason OTHER. It lands on
 * the shortest fragments — bare years, "a lakcímem", two-word questions — that
 * read as prompts rather than as text.
 *
 * Unlike the 400 this one is flaky, so it is worth simply asking again:
 * "a lakcímem" came back silent once and produced 2.0s of audio on the very
 * next identical request. The "Say:" prefix does NOT rescue it — "Say: Hol
 * dolgozik?" returns empty just the same — so retrying the same text is the
 * whole remedy, and the prefix stays reserved for the 400. */
const MAX_BLANKS = 5;

async function synth(hu) {
  let text = hu;
  /* Counted separately. A shared attempt counter would let five blank retries
   * quietly spend the 429 backoff budget, so a clip that stuttered and then
   * met a rate limit would give up while the pacing logic still had room. */
  let blanks = 0;
  let paced = 0;
  for (;;) {
    await gate();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    });

    if (res.status === 429) {
      if (paced >= 6) throw new Error('gemini 429 after 6 backoffs — quota may be daily, try again later');
      const body = await res.text().catch(() => '');
      const hinted = Number((body.match(/"retryDelay"\s*:\s*"(\d+)s"/) || [])[1]);
      if (hinted > MAX_BACKOFF_S)
        throw new Error(`gemini 429 asking for ${Math.round(hinted / 60)} min — that is the daily cap, not per-minute pacing. Resume tomorrow; finished clips are skipped.`);
      const waitMs = (hinted ? hinted + 1 : Math.min(60, 5 * 2 ** paced)) * 1000;
      paced++;
      process.stdout.write('~');
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 400 && ANSWERED_INSTEAD.test(body) && text === hu) {
        text = SPEAK(hu);
        process.stdout.write('s');
        continue;
      }
      throw new Error(`gemini ${res.status} on ${JSON.stringify(hu)} — ${body.slice(0, 120)}`);
    }

    const part = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) {
      if (++blanks < MAX_BLANKS) { process.stdout.write('o'); continue; }
      throw new Error(`no audio after ${MAX_BLANKS} tries — too short to read as speech: ${JSON.stringify(hu)}`);
    }
    const rate = Number((part.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
    return wavHeader(Buffer.from(part.data, 'base64'), rate);
  }
}

async function verify(buf) {
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=hu&punctuate=true', {
    method: 'POST',
    headers: { Authorization: `Token ${DEEPGRAM}`, 'Content-Type': 'audio/wav' },
    body: buf,
  });
  if (!res.ok) throw new Error(`deepgram ${res.status}`);
  return (await res.json()).results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
}

(async () => {
  fs.mkdirSync(AUDIO, { recursive: true });
  const all = utterances();
  const items = all.slice(0, LIMIT);
  const todo = force ? items.length : items.filter((i) => !done(i.hu)).length;
  console.log(`${items.length} renderable utterances, ${todo} to generate · ${MODEL} / ${VOICE}`);
  console.log(`pass if WER <= ${PASS_WER * 100}% · <= ${RPM} requests/min · at least ${Math.ceil(todo / RPM)} min\n`);

  /* Serial. The free TTS tier's per-minute ceiling is low enough that any
   * parallelism just converts into 429s and backoff waiting. */
  const results = await pool(items, 1, async (item) => {
    const file = `${key(item.hu)}.wav`;
    const dest = path.join(AUDIO, file);
    if (!force && done(item.hu)) return { ...item, file, cached: true, tries: 0, wer: 0 };

    let best = null;
    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      const buf = await synth(item.hu);
      const transcript = await verify(buf);
      const score = wer(item.hu, transcript);
      if (!best || score < best.wer) best = { buf, transcript, wer: score, tries: attempt };
      if (score <= PASS_WER) break;
    }
    fs.writeFileSync(dest, best.buf);
    return { ...item, file, bytes: best.buf.length, wer: best.wer, transcript: best.transcript, tries: best.tries };
  });

  console.log('\n');
  const ok = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);
  const suspect = ok.filter((r) => !r.cached && r.wer > PASS_WER);
  const retried = ok.filter((r) => r.tries > 1);

  /* No manifest is written here. The encode step owns it, because the app
   * plays Opus and only that step knows which clips finished encoding — a
   * manifest written now would point at WAVs that are about to be deleted. */
  const fresh = ok.filter((r) => !r.cached);
  const bytes = fresh.reduce((a, r) => a + r.bytes, 0);
  console.log(`generated   ${fresh.length}   (${ok.length - fresh.length} already on disk, skipped)`);
  console.log(`clean pass  ${fresh.filter((r) => r.wer === 0).length}`);
  console.log(`retried     ${retried.length}`);
  if (fresh.length)
    console.log(`new WAV     ${(bytes / 1e6).toFixed(1)} MB  (mean ${(bytes / fresh.length / 1024).toFixed(0)} KB)`);
  console.log('\nnext: node scripts/encode-audio.js');

  if (suspect.length) {
    console.log(`\nSTILL IMPERFECT after ${MAX_TRIES} tries — listen to these before shipping:`);
    for (const r of suspect.sort((a, b) => b.wer - a.wer))
      console.log(`  ${(r.wer * 100).toFixed(0).padStart(3)}%  ${r.file}\n        want: ${r.hu}\n         got: ${r.transcript || '(silence)'}`);
  }
  if (failed.length) {
    console.log('\nERRORS —');
    for (const f of failed) console.log('  ' + f.error);
  }
})();
