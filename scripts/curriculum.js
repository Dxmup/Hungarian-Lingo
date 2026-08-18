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

/* The interviewer side only: questions and their phrasing variants. Answers
 * carry ___ slots filled from the learner's profile at runtime, so they cannot
 * be pre-rendered and stay on device TTS. */
function utterances() {
  const seen = new Map();
  for (const topic of topics())
    for (const qa of topic.qa || []) {
      const add = (hu, kind) => {
        if (hu && !seen.has(hu)) seen.set(hu, { hu, kind, topic: topic.id, script: qa.script });
      };
      add(qa.q.hu, 'question');
      for (const v of qa.variants || []) add(v, 'variant');
    }
  return [...seen.values()];
}

/* Content-addressed: edit a question and it becomes a new file, so stale audio
 * can never silently attach to changed text. */
const key = (hu) => crypto.createHash('sha1').update(hu).digest('hex').slice(0, 10);

module.exports = { topics, utterances, key, ROOT };
