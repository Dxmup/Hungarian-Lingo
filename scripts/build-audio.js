/* Build the interviewer-question audio catalogue.
 *
 * Every clip is generated, then round-tripped through Deepgram's Hungarian
 * model and only kept if the words come back. Gemini TTS is non-deterministic
 * and will occasionally drop a word — silently, which is the worst failure
 * this app can have, since a learner drills the gap without ever knowing. The
 * QA gate turns that from a risk into a retry.
 *
 *   node scripts/build-audio.js [--force] [--limit N]
 *
 * Only the fixed interviewer side is generated. Answers carry ___ slots filled
 * from the learner's profile at runtime, so they cannot be pre-rendered and
 * stay on device TTS.
 *
 * Writes public/audio/<hash>.wav plus public/audio/manifest.json, keyed by a
 * hash of the Hungarian text — change the text and it becomes a new file, so
 * stale audio can never silently attach to an edited question.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { wer, loadEnv, pool } = require('./wer');

const ROOT = path.join(__dirname, '..');
const AUDIO = path.join(ROOT, 'public', 'audio');
loadEnv(ROOT);

const GEMINI = process.env.GEMINI_API_KEY;
const DEEPGRAM = process.env.DEEPGRAM_API_KEY;
if (!GEMINI || !DEEPGRAM) { console.error('GEMINI_API_KEY and DEEPGRAM_API_KEY required in .env.local'); process.exit(1); }

const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE = 'Zephyr';
const MAX_TRIES = 4;
const PASS_WER = 0.25;   // one wrong word in a four-word question

const force = process.argv.includes('--force');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

/* Run data.js in a sandbox rather than regex-scraping it — the curriculum is
 * the source of truth and should be read the way the app reads it. */
function curriculum() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'public', 'data.js'), 'utf8') + '\nglobalThis.__T = TOPICS;',
    ctx);
  return ctx.__T;
}

/* The interviewer side only, questions and their phrasing variants. */
function utterances() {
  const seen = new Map();
  for (const topic of curriculum())
    for (const qa of topic.qa || []) {
      const add = (hu, kind) => { if (hu && !seen.has(hu)) seen.set(hu, { hu, kind, topic: topic.id, script: qa.script }); };
      add(qa.q.hu, 'question');
      for (const v of qa.variants || []) add(v, 'variant');
    }
  return [...seen.values()];
}

const key = (hu) => crypto.createHash('sha1').update(hu).digest('hex').slice(0, 10);

function wavHeader(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The free TTS tier rate-limits per minute, so a 429 is routine pacing
 * feedback rather than an error. Honour the server's retryDelay when it sends
 * one, otherwise back off exponentially. */
async function synth(hu) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        /* Bare text, no style instruction. Prefixing one ("Mondd ki magyarul,
       * ...: Hogy van?") makes the model treat a short utterance as a question
       * to answer rather than text to speak: it returns finishReason OTHER
       * with no content parts at all, which killed all seven of the shortest
       * questions. Bare text scores the same on the hard sentences and the
       * Hungarian orthography already selects the language. */
      contents: [{ parts: [{ text: hu }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    });

    if (res.status === 429) {
      if (attempt >= 6) throw new Error('gemini 429 after 6 backoffs — quota may be daily, try again later');
      const body = await res.text().catch(() => '');
      const hinted = Number((body.match(/"retryDelay"\s*:\s*"(\d+)s"/) || [])[1]);
      const waitMs = (hinted ? hinted + 1 : Math.min(60, 5 * 2 ** attempt)) * 1000;
      process.stdout.write('~');
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`gemini ${res.status} ${(await res.text()).slice(0, 120)}`);

    const part = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) throw new Error('gemini returned no audio');
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
  const items = utterances().slice(0, LIMIT);
  console.log(`${items.length} interviewer utterances · ${MODEL} / ${VOICE} · pass if WER <= ${PASS_WER * 100}%\n`);

  /* Serial. The free TTS tier's per-minute ceiling is low enough that any
   * parallelism just converts into 429s and backoff waiting. */
  const results = await pool(items, 1, async (item) => {
    const file = `${key(item.hu)}.wav`;
    const dest = path.join(AUDIO, file);
    if (!force && fs.existsSync(dest)) return { ...item, file, cached: true, tries: 0, wer: 0 };

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

  const manifest = Object.fromEntries(ok.map((r) => [r.hu, {
    file: r.file, kind: r.kind, topic: r.topic, script: r.script,
    ...(r.wer ? { wer: Number(r.wer.toFixed(3)) } : {}),
  }]));
  fs.writeFileSync(path.join(AUDIO, 'manifest.json'),
    JSON.stringify({ model: MODEL, voice: VOICE, clips: manifest }, null, 2));

  const bytes = ok.reduce((a, r) => a + (r.bytes || fs.statSync(path.join(AUDIO, r.file)).size), 0);
  console.log(`kept        ${ok.length}/${items.length}`);
  console.log(`clean pass  ${ok.filter((r) => r.wer === 0).length}`);
  console.log(`retried     ${retried.length}`);
  console.log(`total size  ${(bytes / 1e6).toFixed(1)} MB  (mean ${(bytes / ok.length / 1024).toFixed(0)} KB)`);

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
