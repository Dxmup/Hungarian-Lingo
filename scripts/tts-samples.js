/* Generate Hungarian TTS samples for vendor comparison.
 *
 * Inworld has no Hungarian voice — its GA set is 15 languages and Hungarian
 * is not among them, so this asks non-Hungarian voices to read Hungarian
 * ("experimental" support). Whether that beats the device's own hu-HU voice
 * is an ear question, which is what samples/compare.html is for.
 *
 *   node scripts/tts-samples.js
 *
 * Reads INWORLD_API_KEY from .env.local. Writes samples/ (gitignored).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'samples');

// Loaded from .env.local so keys never reach the repo.
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.INWORLD_API_KEY;
if (!KEY) { console.error('INWORLD_API_KEY missing from .env.local'); process.exit(1); }

/* The hard cases, drawn from the real curriculum. Each one is chosen to break
 * a voice in a specific way — if a vendor fails these it fails the app. */
const SENTENCES = [
  { id: 'ismetelni', hu: 'Meg tudná ismételni?',
    why: 'The survival phrase — the one you need to recognize instantly. Long ú, á.' },
  { id: 'lassabban', hu: 'Kérem, mondja lassabban.',
    why: 'é vs e length, doubled bb.' },
  { id: 'foglaljon', hu: 'Jó napot kívánok! Foglaljon helyet!',
    why: 'The interview opener. Long ó/í, the gy-adjacent lj cluster.' },
  { id: 'szabadido', hu: 'Szabadidőmben szeretek olvasni és futni.',
    why: 'ő under stress, then a long unstressed tail.' },
  { id: 'szuletTem', hu: 'Ezerkilencszáznyolcvanöt-ben születtem.',
    why: 'Vowel harmony on a spelled-out year, plus ö and ü in one breath.' },
  { id: 'szuletTemNum', hu: '1985-ben születtem.',
    why: 'Same sentence with the digits left in — does it read the number in Hungarian at all?' },
  { id: 'batyam', hu: 'Van egy bátyám és egy húgom.',
    why: 'á and ú length contrasts side by side.' },
  { id: 'felmeno', hu: 'A felmenőm neve Kovács Erzsébet volt.',
    why: 'ő plus a proper noun it has never seen — the personalization case.' },
  { id: 'allampolgar', hu: 'Miért szeretne magyar állampolgár lenni?',
    why: 'THE question. Long á three times, é, gy.' },
  { id: 'felmenoirol', hu: 'Mit tud a magyar felmenőiről mesélni?',
    why: 'ő followed by a long suffix chain — the agglutination stress test.' },
];

/* No Hungarian voices exist, so these are the plausible stand-ins: languages
 * whose phonology overlaps Hungarian somewhere. Polish for the consonant
 * clusters and front vowels, Italian and Spanish for clean open vowels and
 * first-syllable-ish stress, German for ö/ü, English as the control. */
const VOICES = [
  { id: 'Szymon',   lang: 'pl', note: 'Polish male — closest consonant inventory' },
  { id: 'Wojciech', lang: 'pl', note: 'Polish male, second opinion' },
  { id: 'Orietta',  lang: 'it', note: 'Italian female — clean open vowels' },
  { id: 'Annika',   lang: 'de', note: 'German female — has ö/ü natively' },
  { id: 'Lauren',   lang: 'en', note: 'English female — the control' },
];

const MODELS = ['inworld-tts-1', 'inworld-tts-2', 'inworld-tts-1-max'];

async function synth(text, voiceId, modelId) {
  const res = await fetch('https://api.inworld.ai/tts/v1/voice', {
    method: 'POST',
    headers: { Authorization: `Basic ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, modelId }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (!json.audioContent) throw new Error('no audioContent');
  return Buffer.from(json.audioContent, 'base64');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const made = [];
  for (const s of SENTENCES) {
    for (const v of VOICES) {
      for (const m of MODELS) {
        const name = `${s.id}__${v.id}__${m}.mp3`;
        try {
          fs.writeFileSync(path.join(OUT, name), await synth(s.hu, v.id, m));
          made.push({ sentence: s.id, voice: v.id, model: m, file: name });
          process.stdout.write('.');
        } catch (err) {
          process.stdout.write('x');
          console.error(`\n  ${name}: ${err.message}`);
        }
      }
    }
  }
  console.log(`\n${made.length} clips written to samples/`);
  fs.writeFileSync(path.join(OUT, 'index.json'),
    JSON.stringify({ sentences: SENTENCES, voices: VOICES, models: MODELS, clips: made }, null, 2));
})();
