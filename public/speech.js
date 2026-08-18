/* Hungarian Lingo — speech input: microphone capture and answer scoring.
 *
 * Two halves, both dependency-free:
 *
 *   listen()      wraps the Web Speech API's SpeechRecognition in a promise,
 *                 with the browser quirks (webkit prefix, silent onend,
 *                 permission errors) handled in one place.
 *   scoreSpeech() compares what the recognizer heard against the sentence the
 *                 learner was supposed to say, and returns a percentage plus a
 *                 word-by-word diff for the feedback panel.
 *
 * Recognition is not a pronunciation grader — it reports words, not phonemes —
 * so the score answers "would a Hungarian official have understood that
 * sentence?", which is the question the interview actually asks.
 */

// ---------- capture ----------

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

function speechInputSupported() {
  // A secure context is required for microphone access everywhere but
  // localhost, and there is no point offering the drill if it cannot run.
  return !!SpeechRec && (window.isSecureContext !== false);
}

const MIC_ERRORS = {
  'not-allowed': 'Microphone blocked. Allow mic access for this site in the address bar, then try again.',
  'service-not-allowed': 'This browser blocked speech recognition. Check the site permissions and try again.',
  'audio-capture': 'No microphone found. Plug one in (or check the OS input settings) and try again.',
  network: 'Speech recognition needs a network connection — this browser does the transcription online.',
  'no-speech': "Didn't catch anything. Get closer to the mic and say it a bit louder.",
  aborted: '',
};

// Starts one utterance of recognition. Resolves once the recognizer stops,
// with every alternative it heard (best first). The returned handle can stop
// it early — the learner tapping the button again, or leaving the exercise.
function listen({ lang = 'hu-HU', onPartial, onStart, maxSeconds = 15 } = {}) {
  if (!speechInputSupported()) {
    return { promise: Promise.resolve({ alternatives: [], error: 'unsupported' }), stop() {}, abort() {} };
  }

  const rec = new SpeechRec();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 5;

  let alternatives = [];
  let error = null;
  let done = false;
  let timer = null;

  const promise = new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ alternatives, error });
    };

    rec.onstart = () => {
      timer = setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, maxSeconds * 1000);
      onStart?.();
    };

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          alternatives = [...alternatives, ...Array.from(result).map((alt) => ({
            transcript: alt.transcript, confidence: alt.confidence,
          }))];
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) onPartial?.(interim);
    };

    rec.onerror = (event) => { error = event.error; };
    // onend always fires, error or not, so it is the single resolve point.
    rec.onend = finish;
  });

  try {
    rec.start();
  } catch {
    // start() throws if a previous recognition is still winding down.
    try { rec.abort(); } catch { /* nothing to abort */ }
  }

  return {
    promise,
    stop() { try { rec.stop(); } catch { /* already stopped */ } },
    abort() { try { rec.abort(); } catch { /* already stopped */ } },
  };
}

function micErrorMessage(code) {
  if (code === 'unsupported') {
    return 'This browser has no speech recognition, so speaking exercises are unavailable. Try Chrome, Edge, or Safari.';
  }
  return MIC_ERRORS[code] ?? 'The microphone stopped unexpectedly. Try again.';
}

// ---------- Hungarian numerals ----------
// The curriculum writes years and counts as digits ("1985-ben", "2 gyermekem"),
// but a recognizer transcribes what was *said*, and Hungarian says
// "ezerkilencszáznyolcvanötben". Both sides get expanded to words before
// comparison so a correctly spoken year is never scored as a missing word.

const HU_ONES = ['nulla', 'egy', 'kettő', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc'];
const HU_TENS = ['', 'tíz', 'húsz', 'harminc', 'negyven', 'ötven', 'hatvan', 'hetven', 'nyolcvan', 'kilencven'];
// tíz and húsz change shape inside a compound: tizenhét, huszonegy.
const HU_TENS_IN = { 1: 'tizen', 2: 'huszon' };

function huNumber(n) {
  if (n < 10) return HU_ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    if (!r) return HU_TENS[t];
    return (HU_TENS_IN[t] || HU_TENS[t]) + HU_ONES[r];
  }
  // "két-" replaces "kettő-" as a prefix: kétszáz, kétezer.
  const prefix = (unit, count) => (count === 1 ? unit : (count === 2 ? 'két' : huNumber(count)) + unit);
  if (n < 1000) {
    const h = Math.floor(n / 100);
    return prefix('száz', h) + (n % 100 ? huNumber(n % 100) : '');
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    return prefix('ezer', th) + (n % 1000 ? huNumber(n % 1000) : '');
  }
  return String(n);
}

// "1985-ben" → "ezerkilencszáznyolcvanötben"; a bare "1985" → the same, minus
// the suffix. Anything that is not a plain number is left alone.
function spellNumbers(text) {
  return text.replace(/(\d+)-?([a-záéíóöőúüűA-ZÁÉÍÓÖŐÚÜŰ]*)/g, (whole, digits, suffix) => {
    const n = Number(digits);
    if (!Number.isFinite(n) || n > 999999) return whole;
    return huNumber(n) + suffix.toLowerCase();
  });
}

// ---------- scoring ----------

const stripDiacritics = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Everything the comparison should ignore: case, punctuation, spacing, and the
// filler that recognizers sprinkle in ("hát", "ööö").
const FILLERS = new Set(['hát', 'ööö', 'öö', 'ő', 'hm', 'ja', 'izé', 'na']);

function speechTokens(text) {
  const words = spellNumbers(String(text).toLowerCase())
    .replace(/[.,;:!?„”"'()\-–—]/g, ' ')
    .replace(/_{2,}/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((t) => !FILLERS.has(t));
  // "hát" is filler in a sentence and a word in its own right — dropping it
  // from a drill whose whole target is "hát" would score a perfect answer
  // zero. Strip fillers only while something survives the strip.
  return kept.length ? kept : words;
}

// Word-level edit distance with a backtrace, so the feedback panel can show
// which words landed and which did not. An accent-only difference costs a
// fraction of a full substitution: vowel length matters in Hungarian, but a
// recognizer is not reliable enough about it to fail an answer over.
const NEAR_COST = 0.25;

function alignWords(said, want) {
  const n = said.length;
  const m = want.length;
  const d = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) d[i][0] = i;
  for (let j = 1; j <= m; j++) d[0][j] = j;

  const subCost = (a, b) => {
    if (a === b) return 0;
    if (stripDiacritics(a) === stripDiacritics(b)) return NEAR_COST;
    return 1;
  };

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(
        d[i - 1][j - 1] + subCost(said[i - 1], want[j - 1]),
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
      );
    }
  }

  // Walk the matrix back to label every target word (and every extra word the
  // learner said) with what happened to it.
  const diff = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + subCost(said[i - 1], want[j - 1])) {
      const cost = subCost(said[i - 1], want[j - 1]);
      diff.push({
        status: cost === 0 ? 'ok' : cost === NEAR_COST ? 'near' : 'wrong',
        want: want[j - 1],
        said: said[i - 1],
      });
      i--; j--;
    } else if (j > 0 && (i === 0 || d[i][j] === d[i][j - 1] + 1)) {
      diff.push({ status: 'missing', want: want[j - 1] });
      j--;
    } else {
      diff.push({ status: 'extra', said: said[i - 1] });
      i--;
    }
  }
  diff.reverse();
  return { cost: d[n][m], diff };
}

// Character similarity over the whole utterance, spaces removed. Hungarian
// compounds and the recognizer disagree about word boundaries more often than
// about sounds ("nyugdíjas" vs "nyugdí jas"), and this catches those.
function charSimilarity(a, b) {
  const sa = a.join('');
  const sb = b.join('');
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;
  const n = sa.length;
  const m = sb.length;
  let prev = new Float64Array(m + 1);
  let cur = new Float64Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    for (let j = 1; j <= m; j++) {
      const sub = sa[i - 1] === sb[j - 1] ? 0
        : stripDiacritics(sa[i - 1]) === stripDiacritics(sb[j - 1]) ? NEAR_COST : 1;
      cur[j] = Math.min(prev[j - 1] + sub, prev[j] + 1, cur[j - 1] + 1);
    }
    [prev, cur] = [cur, prev];
  }
  return Math.max(0, 1 - prev[m] / Math.max(n, m));
}

// Understood well enough to pass in the room; production credit and the
// mastery ladder key off this.
const SPEECH_PASS = 0.85;
// Understood, but the official would have had to work at it.
const SPEECH_CLOSE = 0.6;

function scoreOne(transcript, wantTokens) {
  const said = speechTokens(transcript);
  if (!said.length || !wantTokens.length) return { score: 0, said, diff: [] };
  const { cost, diff } = alignWords(said, wantTokens);
  const wordScore = Math.max(0, 1 - cost / Math.max(said.length, wantTokens.length));
  const score = Math.max(wordScore, charSimilarity(said, wantTokens));
  return { score, said, diff };
}

// Scores every alternative the recognizer offered and keeps the best one: the
// top-confidence guess is often a homophone of the right answer, and the
// learner should not lose the point because the recognizer's first pick was
// spelled differently than what they actually said.
function scoreSpeech(target, alternatives) {
  const wantTokens = speechTokens(target);
  const scored = (alternatives || [])
    .filter((a) => a && a.transcript && a.transcript.trim())
    .map((a) => ({ ...scoreOne(a.transcript, wantTokens), transcript: a.transcript.trim(), confidence: a.confidence }));

  if (!scored.length) return { heard: false, score: 0, pct: 0, verdict: 'silent', diff: [], transcript: '' };

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const verdict = best.score >= SPEECH_PASS ? 'pass' : best.score >= SPEECH_CLOSE ? 'close' : 'miss';
  return {
    heard: true,
    score: best.score,
    pct: Math.round(best.score * 100),
    verdict,
    diff: best.diff,
    transcript: best.transcript,
    confidence: best.confidence,
    // The contrast test re-judges these itself; it cannot use the numbers
    // above, for the reasons set out over judgeContrast().
    alternatives: (alternatives || []).filter((a) => a && a.transcript && a.transcript.trim()),
    // A pass whose only blemishes are vowel lengths is worth calling out —
    // it is the single most common way an otherwise fluent answer drifts.
    accentsOnly: verdict === 'pass' && best.diff.some((d) => d.status === 'near'),
  };
}

// ---------- contrast judging ----------
// Everything above answers "would a Hungarian listener have understood that
// sentence?", and is forgiving on purpose: an accent costs a quarter of a
// word, and a character-level pass rescues compounds the recognizer split.
//
// The pronunciation drills ask a different question — "which of these two
// words did you just say?" — and both of those kindnesses are fatal to it.
// An accent IS the whole difference in kor/kór and öt/őt, so discounting it
// makes the two words indistinguishable; and any minimal pair is by
// definition one edit apart, so a character pass scores the wrong word at
// ~92% and calls it a win. Hence a second, stricter comparison used nowhere
// else: full cost for every difference, accents included.

function strictSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const n = a.length;
  const m = b.length;
  let prev = new Float64Array(m + 1);
  let cur = new Float64Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), prev[j] + 1, cur[j - 1] + 1);
    }
    [prev, cur] = [cur, prev];
  }
  return Math.max(0, 1 - prev[m] / Math.max(n, m));
}

const contrastForm = (text) => speechTokens(text).join(' ');

// Heard clearly enough to credit as production, and to name as the loser.
const CONTRAST_CLEAR = 0.8;
const CONTRAST_RIVAL = 0.7;
// Beating the rival is not the same as having said the word: gibberish
// resembles one member of a pair marginally more than the other, and that is
// a miss, not a near miss.
const CONTRAST_FLOOR = 0.5;

// Both words are judged against ONE transcript — the recognizer's own best
// guess. Scoring each word against whichever alternative flatters it would
// answer "is the target somewhere in the five guesses", which is a question
// the recognizer has already answered yes to whenever the learner is close.
function judgeContrast(alternatives, target, rival) {
  const heard = (alternatives || [])
    .filter((a) => a && a.transcript && a.transcript.trim())
    .slice()
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  if (!heard) return { verdict: 'silent', pct: 0, transcript: '' };

  const said = contrastForm(heard.transcript);
  const t = strictSimilarity(said, contrastForm(target));
  const r = strictSimilarity(said, contrastForm(rival));
  const pct = Math.round(t * 100);

  if (r > t && r >= CONTRAST_RIVAL) return { verdict: 'rival', pct, transcript: said };
  if (t >= CONTRAST_CLEAR && t > r) return { verdict: 'pass', pct, transcript: said };
  if (t > r && t >= CONTRAST_FLOOR) return { verdict: 'close', pct, transcript: said };
  return { verdict: 'miss', pct, transcript: said };
}
