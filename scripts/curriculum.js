/* Read the curriculum the way the app reads it, and name its audio.
 *
 * Shared so the generate and encode steps cannot drift apart. Deriving the
 * utterance list here rather than from a written manifest also means a partial
 * build stays usable: filenames are a hash of the text, so whatever clips
 * exist on disk can always be matched back to their sentence without trusting
 * a manifest that an interrupted run never got around to writing.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');

/* Run data.js in a sandbox rather than regex-scraping it — the curriculum is
 * the source of truth and should be parsed, not pattern-matched. */
function topics() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'public', 'data.js'), 'utf8') + '\nglobalThis.__T = TOPICS;',
    ctx);
  return ctx.__T;
}

/* Anything whose Hungarian is fixed can be pre-rendered. Anything carrying a
 * ___ slot cannot: it is filled from the learner's profile at runtime, so the
 * audio would differ per learner and per edit. Those keep the device voice.
 *
 * Questions and variants are always fixed. Chunks and model answers are mixed,
 * because the curriculum deliberately personalizes most answers — the app
 * drills YOUR sentences, not sample ones. That leaves roughly half the chunks
 * and a quarter of the answers renderable.
 *
 * Deduplicated by text, so a survival phrase that appears both as a chunk and
 * as an interviewer question is one clip, not two. */
const personalized = (hu) => /_{2,}/.test(hu);

function utterances() {
  const seen = new Map();
  for (const topic of topics()) {
    const add = (hu, kind, script) => {
      if (hu && !personalized(hu) && !seen.has(hu)) seen.set(hu, { hu, kind, topic: topic.id, script });
    };
    for (const item of topic.items || []) add(item.hu, 'chunk');
    for (const qa of topic.qa || []) {
      add(qa.q.hu, 'question', qa.script);
      for (const v of qa.variants || []) add(v, 'variant', qa.script);
      if (qa.a) add(qa.a.hu, 'answer', qa.script);
    }
  }
  return [...seen.values()];
}

/* Content-addressed: edit a question and it becomes a new file, so stale audio
 * can never silently attach to changed text. */
const key = (hu) => crypto.createHash('sha1').update(hu).digest('hex').slice(0, 10);

module.exports = { topics, utterances, key, ROOT };
