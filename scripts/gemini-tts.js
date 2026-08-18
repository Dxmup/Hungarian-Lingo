/* Generate Hungarian audio with Gemini TTS.
 *
 * Gemini returns raw little-endian 16-bit PCM at 24 kHz, not a container, so
 * every clip gets a WAV header bolted on before it is written.
 *
 *   node scripts/gemini-tts.js [modelKey] [voice]
 *   node scripts/gemini-tts.js 3.1 Zephyr
 *
 * Writes samples/<vendor>__<sentenceId>.wav, the naming score-clips.js reads.
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadEnv, pool } = require('./wer');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'samples');
loadEnv(ROOT);
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY missing from .env.local'); process.exit(1); }

const MODELS = {
  '2.5': { id: 'gemini-2.5-flash-preview-tts', vendor: 'gem25flash' },
  '2.5pro': { id: 'gemini-2.5-pro-preview-tts', vendor: 'gem25pro' },
  '3.1': { id: 'gemini-3.1-flash-tts-preview', vendor: 'gem31flash' },
};

const modelKey = process.argv[2] || '2.5';
const VOICE = process.argv[3] || 'Zephyr';
const model = MODELS[modelKey];
if (!model) { console.error(`Unknown model "${modelKey}" — one of: ${Object.keys(MODELS).join(', ')}`); process.exit(1); }

const idx = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));

/* A style instruction in Hungarian, which nudges the model toward Hungarian
 * phonology rather than reading the text with English habits. The round-trip
 * catches it if the model ever reads the instruction aloud instead of obeying
 * it — those words would surface in the transcript. */
const prompt = (hu) => `Mondd ki magyarul, természetes tempóban, tisztán: ${hu}`;

/* 24 kHz, mono, 16-bit — what audio/L16;codec=pcm;rate=24000 means. */
function wav(pcm, rate = 24000, channels = 1, bits = 16) {
  const head = Buffer.alloc(44);
  const byteRate = (rate * channels * bits) / 8;
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + pcm.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);            // PCM
  head.writeUInt16LE(channels, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(byteRate, 28);
  head.writeUInt16LE((channels * bits) / 8, 32);
  head.writeUInt16LE(bits, 34);
  head.write('data', 36);
  head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
}

async function synth(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt(text) }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const part = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error('no audio in response');
  const rate = Number((part.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
  return wav(Buffer.from(part.data, 'base64'), rate);
}

(async () => {
  const vendor = `${model.vendor}${VOICE === 'Zephyr' ? '' : VOICE}`;
  console.log(`${model.id} / ${VOICE} -> samples/${vendor}__*.wav\n`);

  /* Serial-ish: TTS previews rate-limit hard, and 10 clips is not worth
   * fighting a 429 over. */
  const made = await pool(idx.sentences, 2, async (s) => {
    const file = `${vendor}__${s.id}.wav`;
    fs.writeFileSync(path.join(OUT, file), await synth(s.hu));
    return { file };
  });
  const ok = made.filter((m) => !m.error);
  console.log(`\n${ok.length}/${idx.sentences.length} clips written`);
  for (const m of made.filter((x) => x.error)) console.error(`  ${m.error}`);
  console.log(`\nScore them:  node scripts/score-clips.js ${vendor}`);
})();
