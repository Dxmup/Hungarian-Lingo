/* Hungarian Lingo — interview trainer for the simplified naturalization
 * conversation.
 *
 * Offline-first, no build step, no backend: progress and the learner's
 * profile live in localStorage, audio comes from the browser's speech
 * synthesis and answers can be spoken back through its recognizer. The
 * pedagogy is chunk-based — whole sentences, drilled in your own words via
 * profile slots — with Leitner spaced repetition underneath.
 */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const main = $('#main');

// ---------- persistent state ----------

const SAVE_KEY = 'hl_v2';

// Leitner boxes: an item climbs one box per correct answer and slips one per
// miss. Box 5+ counts as mastered for the topic progress bars.
const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32];
const MASTER_BOX = 5;

const defaults = () => ({
  xp: 0,
  streak: { count: 0, last: null },
  progress: {},                       // key -> { box, due, right, wrong }
  intake: {},                         // INTAKE id -> what the learner answered, in English
  profile: {},                        // PROFILE_FIELDS id -> Hungarian, composed from intake
  bestInterview: null,                // best full mock-interview score
  settings: { rate: 0.8, autoplay: true, showSay: true, hearts: true, mic: true },
});

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved) return defaults();
    // Merge onto defaults so a save written by an older version keeps working.
    const s = {
      ...defaults(),
      ...saved,
      settings: { ...defaults().settings, ...(saved.settings || {}) },
      intake: { ...(saved.intake || {}) },
      profile: { ...(saved.profile || {}) },
    };
    /* Before the intake was asked in English, the profile WAS the input — the
     * learner typed Hungarian into it directly. Such a save has answers but no
     * intake to recompose them from, so the old values are kept aside and used
     * for any slot the new form has not answered yet. Answers are replaced one
     * question at a time as the learner works through the form, rather than 33
     * hand-written sentences vanishing on the first tap. */
    if (!Object.keys(s.intake).length && Object.keys(s.profile).length) s.legacyProfile = { ...s.profile };
    return s;
  } catch {
    return defaults();
  }
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

function entry(key) {
  return state.progress[key] || (state.progress[key] = { box: 0, due: 0, right: 0, wrong: 0 });
}

// Recognition (multiple choice, matching, self-graded cards) can only carry an
// item to box 3. Mastery beyond that has to be earned in production — building,
// typing, or recalling the sentence — so the scheduler keeps demanding the
// hard thing until the learner can actually produce it.
const RECOGNITION_CAP = 3;

// `boxLocked` records the answer without moving the item: used when one item
// is drilled repeatedly inside a single session, where the schedule should
// reflect the session, not each repetition of it.
function grade(key, correct, production, boxLocked) {
  const e = entry(key);
  if (correct) {
    if (!boxLocked) {
      const cap = production ? BOX_DAYS.length - 1 : RECOGNITION_CAP;
      e.box = Math.min(e.box + 1, Math.max(cap, e.box));
    }
    e.right++;
  } else {
    if (!boxLocked) e.box = Math.max(e.box - 1, 0);
    e.wrong++;
  }
  e.due = Date.now() + BOX_DAYS[e.box] * 86400000;
}

// Everything the scheduler can hand back. ALL_ITEMS stays the interview
// curriculum alone — the topic progress bars are a percentage of it, and a
// sound is not part of any topic — but review and the streak treat a sound
// exactly like a chunk, so the due list is drawn from both.
const ALL_DRILLABLE = [...ALL_ITEMS, ...SOUNDS];

function dueItems() {
  const now = Date.now();
  return ALL_DRILLABLE.filter((w) => state.progress[w.key] && state.progress[w.key].due <= now);
}

function seenItems() {
  return ALL_DRILLABLE.filter((w) => state.progress[w.key]);
}

function topicItems(t) { return [...t.items, ...t.qa]; }

function topicStats(t) {
  const items = topicItems(t);
  let mastered = 0;
  let sum = 0;
  for (const w of items) {
    const box = state.progress[w.key]?.box || 0;
    if (box >= MASTER_BOX) mastered++;
    sum += Math.min(box, MASTER_BOX) / MASTER_BOX;
  }
  return { mastered, total: items.length, pct: Math.round(sum / items.length * 100) };
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function touchStreak() {
  const today = todayKey();
  if (state.streak.last === today) return;
  const y = new Date(Date.now() - 86400000);
  const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
  state.streak.count = state.streak.last === yesterday ? state.streak.count + 1 : 1;
  state.streak.last = today;
}

// ---------- profile slots ----------
// Chunks written with ___ get the learner's own detail dropped in, so every
// drill rehearses the sentence they will actually say in the interview.
//
// The values themselves are composed in profile.js from the learner's English
// answers; harmony(), withSuffix() and SUFFIX_PAIRS live in harmony.js so both
// sides use one set of rules.

function fill(text, holder) {
  if (!text.includes('___')) return text;
  const raw = holder?.slot
    ? ((state.profile[holder.slot] || '').trim() || EXAMPLE_BY_ID[holder.slot] || '')
    : '';
  if (!raw) return text;
  // Suffixes must attach to a clean stem ("1985." → 1985-ben), but a plain
  // blank keeps the value as written so a multi-sentence answer keeps its
  // final full stop.
  const stem = raw.replace(/[.,;!?]+$/, '');
  let out = text;
  for (const back of Object.keys(SUFFIX_PAIRS).sort((a, b) => b.length - a.length)) {
    const pat = new RegExp(`___-(?:${back}|${SUFFIX_PAIRS[back]})`, 'g');
    out = out.replace(pat, withSuffix(stem, back));
  }
  out = out.replaceAll('___.', /[.!?]$/.test(raw) ? raw : raw + '.').replaceAll('___', raw);
  // Every sentence start gets its capital, including slots after a full stop.
  return out.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, pre, c) => pre + c.toUpperCase());
}

function chunkText(item) { return fill(item.hu, item); }
function answerTextOf(item) { return fill(item.a.hu, item.a); }

// Speech should never read "___" aloud; an unset slot just goes quiet there.
function speakable(text) { return text.replace(/_{2,}/g, '').replace(/\s+/g, ' ').trim(); }

function profileComplete() {
  return PROFILE_FIELDS.filter((f) => (state.profile[f.id] || '').trim()).length;
}

// ---------- speech ----------

let huVoice = null;

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  huVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('hu')) || null;
}

if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

/* Recorded audio for the interviewer's side, keyed by the Hungarian text.
 * Generated ahead of time and checked by a Hungarian recogniser, so these are
 * the lines the learner most needs to hear correctly. Answers are personalized
 * from the profile at runtime and cannot be pre-rendered, so they fall through
 * to the device voice — which is the right split anyway: you produce your
 * answers, you only ever listen to the questions. */
let clips = null;
let playing = null;

fetch('audio/manifest.json')
  .then((res) => (res.ok ? res.json() : null))
  .then((m) => { clips = (m && m.clips) || null; })
  .catch(() => { /* offline before the manifest was ever cached — device voice covers it */ });

function stopAudio() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (playing) { playing.pause(); playing = null; }
}

function speak(text) {
  stopAudio();
  const clip = clips && clips[text];
  if (clip) {
    const audio = new Audio(`audio/${clip.file}`);
    /* Same speed control as the synthesized path; pitch is held so slowing a
     * voice down does not turn the vowels into something else. */
    audio.playbackRate = state.settings.rate;
    if ('preservesPitch' in audio) audio.preservesPitch = true;
    playing = audio;
    audio.play().catch(() => {
      /* Autoplay blocked, or the browser cannot decode Ogg Opus (older
       * Safari). Either way the device voice still works. */
      playing = null;
      synthesize(text);
    });
    return;
  }
  synthesize(text);
}

function synthesize(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.lang = 'hu-HU';
  if (huVoice) u.voice = huVoice;
  u.rate = state.settings.rate;
  speechSynthesis.speak(u);
}

function voiceWarning() {
  if (!('speechSynthesis' in window)) {
    return '<div class="note">This browser has no speech synthesis, so listening exercises have no audio. Try Chrome, Edge, or Safari.</div>';
  }
  if (!huVoice) {
    return '<div class="note">The interviewer\'s questions use recorded Hungarian audio, so those sound right. Your own answers fall back to this device\'s default voice, which has no Hungarian installed and will sound off — add a Hungarian text-to-speech voice in your system settings to fix that.</div>';
  }
  return '';
}

// ---------- microphone ----------
// Speaking drills only appear where the browser can actually hear: the
// recognizer has to exist, and the learner has to have left the setting on.

function micAvailable() {
  return speechInputSupported() && state.settings.mic;
}

function micWarning() {
  if (speechInputSupported()) return '';
  return '<div class="note">This browser has no speech recognition, so the speaking drills are hidden. Chrome, Edge, and Safari can score what you say out loud.</div>';
}

// ---------- small helpers ----------

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,:;„”"]/g, '');

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 1800);
}

function pips(box) {
  return `<span class="pips">${Array.from({ length: MASTER_BOX }, (_, i) =>
    `<i class="pip ${i < Math.min(box, MASTER_BOX) ? 'on' : ''}"></i>`).join('')}</span>`;
}

function updateHeader() {
  $('#streak-chip').innerHTML = `🔥 <b>${state.streak.count}</b>`;
  $('#xp-chip').innerHTML = `⭐ <b>${state.xp}</b>`;
}

// A question sometimes shows up in a variant phrasing so the learner is
// robust to how a particular official words it.
function askForm(item) {
  if (item.variants?.length && Math.random() < 0.4) {
    return { hu: item.variants[Math.floor(Math.random() * item.variants.length)], variant: true };
  }
  return { hu: item.q.hu, variant: false };
}

// ---------- routing ----------

let view = 'learn';
let session = null;
let currentTopic = null;
let currentSound = null;
// Sound rows appear in two places — the sounds list and the Review tab — so
// the way back has to be remembered rather than assumed.
let soundCameFrom = null;

function go(next, opts) {
  view = next;
  session = null;
  render(opts);
}

function render(opts = {}) {
  // Leaving a screen must close the microphone — a recognizer left running
  // keeps the browser's recording indicator on.
  stopMic();
  const tabs = ['learn', 'interview', 'review', 'me'];
  $('#back-btn').classList.toggle('hidden', tabs.includes(view));
  $$('#tabbar .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  updateHeader();
  main.scrollTop = 0;

  if (view === 'session') return renderSession();
  ({
    learn: renderLearn,
    topic: renderTopic,
    sounds: renderSounds,
    sound: renderSound,
    interview: renderInterviewTab,
    review: renderReview,
    me: renderMe,
    results: renderResults,
  }[view] || renderLearn)(opts);
}

$$('#tabbar .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (session && !confirmQuit()) return;
    go(btn.dataset.view);
  });
});

$('#back-btn').addEventListener('click', () => {
  if (session && !confirmQuit()) return;
  // Back retraces the way in: a drill returns to the thing being drilled, and
  // a sound to wherever it was opened from — the sounds list, or the Review
  // tab, which is a route out of the section rather than deeper into it.
  if (session?.sound) return go('sound', { soundId: session.sound.id });
  if (view === 'sound') return go(soundCameFrom || 'sounds');
  if (view === 'sounds') return go('learn');
  go(currentTopic && view === 'session' ? 'topic' : 'learn', { topicId: currentTopic?.id });
});

function confirmQuit() {
  return confirm('Leave this session? Progress on answered items is already saved.');
}

// ---------- Learn (topic list) ----------

function renderLearn() {
  $('#topbar-title').textContent = 'Hungarian Lingo';
  const due = dueItems().length;
  const noProfile = profileComplete() === 0;
  const sounds = soundStats();
  main.innerHTML = `<div class="wrap">
    <h2>Szia! 👋</h2>
    <p class="sub">Conversational Hungarian for the simplified naturalization interview — whole phrases, in your own words. Nothing you won't need in that room.</p>
    ${noProfile ? `<button class="btn primary" id="setup-profile">👤 Set up your answers first (2 min)</button>
      <p class="sub" style="margin-top:8px">The app drills <b>your</b> name, town, and family story — not a stranger's.</p>` : ''}
    ${due ? `<button class="btn ${noProfile ? '' : 'primary'}" id="quick-review">🔁 Review ${due} item${due === 1 ? '' : 's'} due now</button>` : ''}
    <div class="section-label">Sounds</div>
    <button class="unit-card" id="sounds-card">
      <span class="unit-icon" style="background:${SOUND_COLOR}22">👄</span>
      <span class="unit-body">
        <span class="unit-title">Sounds &amp; pronunciation</span>
        <span class="unit-sub">${SOUNDS.length} sounds · minimal pairs, ear and mic drills</span>
        <span class="bar"><i style="width:${sounds.pct}%;background:${SOUND_COLOR}"></i></span>
      </span>
      <span class="unit-pct">${sounds.pct}%</span>
    </button>
    <div class="section-label">Interview topics</div>
    ${TOPICS.map((t) => {
      const s = topicStats(t);
      return `<button class="unit-card" data-topic="${t.id}">
        <span class="unit-icon" style="background:${t.color}22">${t.icon}</span>
        <span class="unit-body">
          <span class="unit-title">${esc(t.title)}</span>
          <span class="unit-sub">${esc(t.hu)} · ${t.items.length} chunks · ${t.qa.length} questions</span>
          <span class="bar"><i style="width:${s.pct}%;background:${t.color}"></i></span>
        </span>
        <span class="unit-pct">${s.pct}%</span>
      </button>`;
    }).join('')}
  </div>`;

  $('#setup-profile')?.addEventListener('click', () => go('me'));
  $('#quick-review')?.addEventListener('click', () => startSession(dueItems(), 'mix', 'Review'));
  $('#sounds-card').addEventListener('click', () => go('sounds'));
  $$('.unit-card[data-topic]').forEach((c) => c.addEventListener('click', () => go('topic', { topicId: c.dataset.topic })));
}

// ---------- Topic detail ----------

const MODES = [
  { id: 'mix', icon: '🎯', name: 'Lesson', desc: 'Chunks and questions, mixed' },
  { id: 'flash', icon: '🃏', name: 'Chunks', desc: 'Meet the phrases' },
  { id: 'listen', icon: '🎧', name: 'Listening', desc: 'Hear it, pick it' },
  { id: 'build', icon: '🧱', name: 'Builder', desc: 'Assemble the sentence' },
  { id: 'dictate', icon: '⌨️', name: 'Dictation', desc: 'Hear it, spell it' },
  { id: 'match', icon: '🔗', name: 'Matching', desc: 'Pair 5 at a time' },
  { id: 'qa', icon: '🗣️', name: 'Q & A', desc: 'Understand and answer' },
  { id: 'speak', icon: '🎤', name: 'Speaking', desc: 'Say it, get scored', mic: true },
  { id: 'mock', icon: '🎙️', name: 'Mock Interview', desc: 'This topic, in order' },
];

function renderTopic({ topicId } = {}) {
  currentTopic = TOPICS.find((t) => t.id === (topicId || currentTopic?.id)) || TOPICS[0];
  const t = currentTopic;
  const s = topicStats(t);
  $('#topbar-title').textContent = t.title;

  main.innerHTML = `<div class="wrap">
    <h2>${t.icon} ${esc(t.title)}</h2>
    <p class="sub">${esc(t.intro)}</p>
    <div class="bar" style="margin-bottom:18px"><i style="width:${s.pct}%;background:${t.color}"></i></div>
    ${voiceWarning()}
    ${micWarning()}
    <div class="mode-grid">
      ${MODES.filter((m) => !m.mic || micAvailable()).map((m) => `<button class="mode-btn" data-mode="${m.id}">
        <div class="m-icon">${m.icon}</div>
        <div class="m-name">${m.name}</div>
        <div class="m-desc">${m.desc}</div>
      </button>`).join('')}
    </div>
    <div class="section-label">Chunks — say these whole</div>
    ${t.items.map((w) => chunkRow(w)).join('')}
    <div class="section-label">Interview questions</div>
    ${t.qa.map((w) => qaRow(w)).join('')}
  </div>`;

  $$('.mode-btn').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mode === 'mock') return startInterview([t]);
    startSession(topicItems(t), b.dataset.mode, t.title);
  }));
  bindRows();
}

function chunkRow(w) {
  const box = state.progress[w.key]?.box || 0;
  const shown = chunkText(w);
  return `<div class="word-row">
    <button class="speak-mini" data-say="${esc(shown)}" aria-label="Play">🔊</button>
    <div>
      <div class="w-hu">${esc(shown)}</div>
      <div class="w-en">${esc(w.en)}${state.settings.showSay ? ` · ${esc(w.say)}` : ''}</div>
    </div>
    <div class="w-box">${pips(box)}</div>
  </div>`;
}

function qaRow(w) {
  const box = state.progress[w.key]?.box || 0;
  return `<div class="word-row">
    <button class="speak-mini" data-say="${esc(w.q.hu)}" aria-label="Play">🔊</button>
    <div>
      <div class="w-hu">${esc(w.q.hu)}</div>
      <div class="w-en">${esc(w.q.en)}${w.variants?.length ? ` · also: ${esc(w.variants.join(' / '))}` : ''}</div>
      <div class="w-en">↳ ${esc(answerTextOf(w))}</div>
    </div>
    <div class="w-box">${pips(box)}</div>
  </div>`;
}

function bindRows() {
  $$('.speak-mini').forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
  $$('.sound-open').forEach((b) => b.addEventListener('click', () => {
    soundCameFrom = view === 'sound' ? soundCameFrom : view;
    go('sound', { soundId: b.dataset.sound });
  }));
}

// ---------- Sounds (phonetics) ----------
// The pronunciation section is its own small curriculum: sounds instead of
// chunks, contrasts instead of sentences. It rides the same scheduler, so a
// sound shows up in Review beside the phrases, but it lives off the Learn tab
// rather than in the tab bar — the bar is full, and this is a phone.

const SOUND_COLOR = '#2f6fed';

const SOUND_GROUP_LABEL = {
  consonant: 'Consonants',
  vowel: 'Vowels',
  length: 'Length — the accent marks',
  stress: 'Stress',
};

function soundStats() {
  let mastered = 0;
  let sum = 0;
  for (const s of SOUNDS) {
    const box = state.progress[s.key]?.box || 0;
    if (box >= MASTER_BOX) mastered++;
    sum += Math.min(box, MASTER_BOX) / MASTER_BOX;
  }
  return { mastered, total: SOUNDS.length, pct: Math.round(sum / SOUNDS.length * 100) };
}

function soundRow(s) {
  const box = state.progress[s.key]?.box || 0;
  return `<div class="word-row">
    <button class="speak-mini" data-say="${esc(s.words[0].hu)}" aria-label="Play">🔊</button>
    <button class="sound-open" data-sound="${esc(s.id)}">
      <span class="w-hu">${esc(s.name)}</span>
      <span class="w-en">/${esc(s.ipa)}/ · ${esc(s.words.slice(0, 2).map((w) => w.hu).join(', '))}</span>
    </button>
    <div class="w-box">${pips(box)}</div>
  </div>`;
}

function renderSounds() {
  $('#topbar-title').textContent = 'Sounds';
  const groups = [...new Set(SOUNDS.map((s) => s.group))];
  const st = soundStats();
  main.innerHTML = `<div class="wrap">
    <h2>👄 Sounds &amp; pronunciation</h2>
    <p class="sub">The sounds an English mouth gets wrong, on the words you will actually say. An official forgives a fumbled ending; a merged vowel gives them a word they cannot place at all.</p>
    <div class="bar" style="margin-bottom:18px"><i style="width:${st.pct}%;background:${SOUND_COLOR}"></i></div>
    ${voiceWarning()}
    ${micWarning()}
    ${groups.map((g) => `<div class="section-label">${esc(SOUND_GROUP_LABEL[g] || g)}</div>
      ${SOUNDS.filter((s) => s.group === g).map(soundRow).join('')}`).join('')}
  </div>`;
  bindRows();
}

function pairRow(p) {
  return `<div class="pair-row">
    <div class="pair-word">
      <button class="speak-mini" data-say="${esc(p.a)}" aria-label="Play">🔊</button>
      <div><b>${esc(p.a)}</b><span>${esc(p.aEn)}</span></div>
    </div>
    <div class="pair-word">
      <button class="speak-mini" data-say="${esc(p.b)}" aria-label="Play">🔊</button>
      <div><b>${esc(p.b)}</b><span>${esc(p.bEn)}</span></div>
    </div>
    <div class="pair-note">${esc(p.note)}</div>
  </div>`;
}

function renderSound({ soundId } = {}) {
  currentSound = SOUND_BY_ID[soundId] || currentSound || SOUNDS[0];
  const s = currentSound;
  const box = state.progress[s.key]?.box || 0;
  $('#topbar-title').textContent = s.name;

  main.innerHTML = `<div class="wrap">
    <h2>${esc(s.name)}</h2>
    <p class="sub">${esc(s.letter)} · /${esc(s.ipa)}/ · ${pips(box)}</p>
    ${voiceWarning()}
    ${micWarning()}
    <div class="card sound-card">
      <div class="sound-head">Why English speakers get it wrong</div>
      <p>${esc(s.hard)}</p>
      <div class="sound-head">Nearest English sound</div>
      <p>${esc(s.english)}</p>
      <div class="sound-head">What your mouth does</div>
      <p>${esc(s.mouth)}</p>
    </div>
    <button class="btn primary" id="drill-sound">🎯 Drill this sound</button>
    <div class="section-label">In words you will use</div>
    ${s.words.map((w) => `<div class="word-row">
      <button class="speak-mini" data-say="${esc(w.hu)}" aria-label="Play">🔊</button>
      <div>
        <div class="w-hu">${esc(w.hu)}</div>
        <div class="w-en">${esc(w.en)}${state.settings.showSay ? ` · ${esc(w.say)}` : ''}</div>
      </div>
    </div>`).join('')}
    <div class="section-label">Hear the difference</div>
    ${s.pairs.map(pairRow).join('')}
    <div class="section-label">In a sentence</div>
    <div class="word-row">
      <button class="speak-mini" data-say="${esc(s.phrase.hu)}" aria-label="Play">🔊</button>
      <div>
        <div class="w-hu">${esc(s.phrase.hu)}</div>
        <div class="w-en">${esc(s.phrase.en)}</div>
      </div>
    </div>
    ${s.twister ? `<div class="section-label">Tongue twister</div>
      <div class="word-row">
        <button class="speak-mini" data-say="${esc(s.twister)}" aria-label="Play">🔊</button>
        <div class="w-hu">${esc(s.twister)}</div>
      </div>` : ''}
  </div>`;

  $('#drill-sound').addEventListener('click', () => startSoundSession(s));
  bindRows();
}

// ---------- Interview tab ----------

function scriptOrder(a, b) {
  const pa = a.script.split('.').map(Number);
  const pb = b.script.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1];
}

function renderInterviewTab() {
  $('#topbar-title').textContent = 'The Interview';
  const all = QAS.slice().sort(scriptOrder);
  const ready = all.filter((q) => (state.progress[q.key]?.box || 0) >= 2).length;
  main.innerHTML = `<div class="wrap">
    <h2>🎙️ The mock interview</h2>
    <p class="sub">The real conversation runs through these ${all.length} questions. The official speaks formally, you answer in your own words${micAvailable() ? ' — out loud into the mic, or typed' : ''}. Practice topic by topic, then run the full interview here.</p>
    ${voiceWarning()}
    ${micWarning()}
    <button class="btn primary" id="start-full">🎙️ Start the full mock interview</button>
    <p class="sub" style="margin-top:8px">${state.bestInterview !== null
      ? `Best run: <b>${state.bestInterview.right}/${state.bestInterview.total}</b> answered on the first try.`
      : `No full run yet. ${ready}/${all.length} questions have some practice behind them.`}</p>
    <div class="section-label">Every question, in interview order</div>
    ${all.map((w) => qaRow(w)).join('')}
  </div>`;

  $('#start-full').addEventListener('click', () => startInterview(TOPICS));
  bindRows();
}

// ---------- Review ----------

function renderReview() {
  $('#topbar-title').textContent = 'Review';
  const due = dueItems();
  const seen = seenItems();
  const sorted = [...seen].sort((a, b) => (state.progress[a.key].due) - (state.progress[b.key].due));

  main.innerHTML = `<div class="wrap">
    <h2>Spaced review</h2>
    <p class="sub">Items come back on a widening schedule: 1, 2, 4, 8, 16, then 32 days after each correct answer. Keep the streak and the interview stays fresh.</p>
    ${due.length
      ? `<button class="btn primary" id="start-review">Review ${due.length} due item${due.length === 1 ? '' : 's'}</button>
         <button class="btn ghost" id="review-listen">🎧 Listening only</button>
         <button class="btn ghost" id="review-build">🧱 Builder only</button>`
      : seen.length
        ? `<div class="card">Nothing due right now — nice. Come back later, or push a new topic on the Learn tab.</div>`
        : `<div class="card">Nothing practiced yet. Start a topic on the Learn tab and it shows up here.</div>`}
    ${seen.length ? `<div class="section-label">Your items (${seen.length})</div>${sorted.map((w) => (w.kind === 'qa' ? qaRow(w) : w.kind === 'sound' ? soundRow(w) : chunkRow(w))).join('')}` : ''}
  </div>`;

  $('#start-review')?.addEventListener('click', () => startSession(dueItems(), 'mix', 'Review'));
  $('#review-listen')?.addEventListener('click', () => startSession(dueItems(), 'listen', 'Review'));
  $('#review-build')?.addEventListener('click', () => startSession(dueItems(), 'build', 'Review'));
  bindRows();
}

// ---------- Me (profile + settings + stats) ----------

/* Two views over the same data: the questions, asked in English, and the
 * Hungarian they produce. The learner answers in a language they have, then
 * sees exactly what they will be drilled on and what they will say out loud —
 * nothing is generated behind their back. */
let meView = 'answers';

/* The learner's own value goes in as typed. Everything else is a fixed option
 * from profile.js, so the only untrusted text is a name or a town. */
function intakeControl(f) {
  const v = state.intake[f.id] || {};
  const label = `<label for="in-${f.id}">${esc(f.label)}</label>
    ${f.help ? `<div class="hint">${esc(f.help)}</div>` : ''}`;

  if (f.type === 'text' || f.type === 'number') {
    return `<div class="field">${label}
      <input type="${f.type === 'number' ? 'number' : 'text'}" id="in-${f.id}"
             class="intake-input" data-field="${f.id}"
             ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}
             value="${esc(v.value ?? '')}" placeholder="${esc(f.placeholder || '')}"
             autocomplete="off"></div>`;
  }

  if (f.type === 'choice' || f.type === 'pick') {
    const opts = f.options.map((o) => `
      <label class="pick${v.k === o.k ? ' on' : ''}">
        <input type="radio" name="in-${f.id}" class="intake-opt" data-field="${f.id}" data-key="${o.k}"
               ${v.k === o.k ? 'checked' : ''}>
        <span>${esc(o.en)}</span>
      </label>`).join('');
    const other = f.other ? `
      <label class="pick${v.k === '_other' ? ' on' : ''}">
        <input type="radio" name="in-${f.id}" class="intake-opt" data-field="${f.id}" data-key="_other"
               ${v.k === '_other' ? 'checked' : ''}>
        <span>${esc(f.other)}</span>
      </label>
      ${v.k === '_other' ? `<input type="text" class="intake-other" data-field="${f.id}"
             value="${esc(v.other || '')}" placeholder="${esc(f.otherHelp || '')}" autocomplete="off">` : ''}` : '';
    return `<div class="field">${label}<div class="picks">${opts}${other}</div></div>`;
  }

  if (f.type === 'multi') {
    const keys = v.keys || [];
    return `<div class="field">${label}<div class="picks">${f.options.map((o) => `
      <label class="pick${keys.includes(o.k) ? ' on' : ''}">
        <input type="checkbox" class="intake-multi" data-field="${f.id}" data-key="${o.k}"
               ${keys.includes(o.k) ? 'checked' : ''}>
        <span>${esc(o.en)}</span>
      </label>`).join('')}</div></div>`;
  }

  if (f.type === 'siblings') {
    return `<div class="field">${label}<div class="counts">${SIBLING_WORDS.map((w) => `
      <div class="count">
        <span>${esc(w.en)}</span>
        <input type="number" min="0" max="9" class="intake-sib" data-field="${f.id}" data-key="${w.id}"
               value="${esc(v[w.id] ?? '')}" placeholder="0">
      </div>`).join('')}</div></div>`;
  }

  if (f.type === 'children') {
    const n = Number(state.intake.kidCount?.value) || 0;
    const rows = v.rows || [];
    return `<div class="field">${label}${Array.from({ length: n }, (_, i) => `
      <div class="count">
        <input type="text" class="intake-kid" data-field="${f.id}" data-row="${i}" data-key="name"
               value="${esc(rows[i]?.name || '')}" placeholder="Name" autocomplete="off">
        <input type="number" min="0" max="60" class="intake-kid" data-field="${f.id}" data-row="${i}" data-key="age"
               value="${esc(rows[i]?.age ?? '')}" placeholder="Age">
      </div>`).join('')}</div>`;
  }

  return '';
}

/* The sentence each slot actually lives in, taken from the curriculum so the
 * review screen shows what the learner will SAY rather than the fragment they
 * chose — "Denver" is not the useful thing to check, "Denver városában lakom"
 * is. Model answers override chunks: the answer is what the official hears. */
const SENTENCE_FOR_SLOT = (() => {
  const m = {};
  for (const t of TOPICS) for (const it of t.items || []) if (it.slot && !m[it.slot]) m[it.slot] = it.hu;
  for (const t of TOPICS) for (const qa of t.qa || []) if (qa.a?.slot) m[qa.a.slot] = qa.a.hu;
  return m;
})();

function reviewSentence(id) {
  return fill(SENTENCE_FOR_SLOT[id] || '___.', { slot: id });
}

/* Recompose after every edit. The profile is derived data — never edited
 * directly — so there is exactly one way for a Hungarian sentence to get into
 * a drill, and it went through the vetted option list to get there. */
function syncProfile() {
  state.profile = { ...(state.legacyProfile || {}), ...composeProfile(state.intake) };
  save();
}

function renderMe() {
  $('#topbar-title').textContent = 'My Answers';
  const st = state.settings;
  const seen = seenItems();
  const mastered = seen.filter((w) => state.progress[w.key].box >= MASTER_BOX).length;
  const right = seen.reduce((n, w) => n + state.progress[w.key].right, 0);
  const wrong = seen.reduce((n, w) => n + state.progress[w.key].wrong, 0);
  const acc = right + wrong ? Math.round(right / (right + wrong) * 100) : 0;

  const fields = visibleFields(state.intake);
  const answered = fields.filter((f) => intakeAnswered(state.intake, f)).length;

  main.innerHTML = `<div class="wrap">
    <h2>👤 Your answers</h2>
    <p class="sub">Ultralearning rule one: practice the real thing. Answer these in English and every drill uses <b>your</b> sentences — the exact ones you'll say to the official.</p>

    <div class="tabs">
      <button class="tab${meView === 'answers' ? ' on' : ''}" data-view="answers">Questions</button>
      <button class="tab${meView === 'hungarian' ? ' on' : ''}" data-view="hungarian">My Hungarian (${PROFILE_FIELDS.filter((f) => state.profile[f.id]).length})</button>
    </div>

    ${state.legacyProfile ? `<div class="card note">
      <b>Your old answers are kept.</b> You wrote these in Hungarian yourself, before
      the app started asking in English. Each one is replaced only when you answer the
      matching question below, so you can work through the form at your own pace and
      nothing disappears in the meantime.
    </div>` : ''}

    ${meView === 'answers' ? `
    <div class="card">
      <div class="hint" style="margin-bottom:14px">${answered} of ${fields.length} answered — you can change any of them later.</div>
      ${fields.map(intakeControl).join('')}
    </div>
    <button class="btn primary" id="see-hungarian">See my Hungarian answers →</button>
    ` : `
    <p class="sub">These are built from your answers, and these are the sentences the
    app will drill. Tap any one to hear it. If something is wrong, go back and change
    the answer that made it.</p>
    <div class="card">
      ${PROFILE_FIELDS.filter((f) => state.profile[f.id]).map((f) => {
        const hu = reviewSentence(f.id);
        return `<div class="review" data-hu="${esc(hu)}">
          <div class="review-q">${esc(slotLabel(f.id))}</div>
          <div class="review-hu">${esc(hu)} <span class="spk">🔊</span></div>
        </div>`;
      }).join('') || '<div class="hint">Nothing yet — answer a few questions first.</div>'}
    </div>
    <button class="btn ghost" id="edit-answers">← Change my answers</button>
    `}
    <div class="stat-grid">
      <div class="stat-box"><b>${state.xp}</b><span>XP</span></div>
      <div class="stat-box"><b>${state.streak.count}</b><span>day streak</span></div>
      <div class="stat-box"><b>${acc}%</b><span>accuracy</span></div>
      <div class="stat-box"><b>${seen.length}</b><span>items seen</span></div>
      <div class="stat-box"><b>${mastered}</b><span>mastered</span></div>
      <div class="stat-box"><b>${state.bestInterview ? `${state.bestInterview.right}/${state.bestInterview.total}` : '—'}</b><span>best interview</span></div>
    </div>
    <div class="section-label">Settings</div>
    <div class="card">
      <div class="row">
        <div><label for="rate">Speech speed</label><div class="hint">Officials talk faster than this — train up over time</div></div>
        <input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${st.rate}">
      </div>
      <div class="row">
        <div><label for="autoplay">Autoplay audio</label><div class="hint">Speak questions when they appear</div></div>
        <input type="checkbox" id="autoplay" ${st.autoplay ? 'checked' : ''}>
      </div>
      <div class="row">
        <div><label for="showSay">Pronunciation hints</label><div class="hint">Show the English respelling</div></div>
        <input type="checkbox" id="showSay" ${st.showSay ? 'checked' : ''}>
      </div>
      <div class="row">
        <div><label for="hearts">Hearts</label><div class="hint">End a lesson after 5 mistakes (never in mock interviews)</div></div>
        <input type="checkbox" id="hearts" ${st.hearts ? 'checked' : ''}>
      </div>
      ${speechInputSupported() ? `<div class="row">
        <div><label for="mic">Speaking exercises</label><div class="hint">Say answers out loud and have them scored — needs mic access</div></div>
        <input type="checkbox" id="mic" ${st.mic ? 'checked' : ''}>
      </div>` : ''}
    </div>
    ${micWarning()}
    <button class="btn ghost" id="test-voice">🔊 Test the Hungarian voice</button>
    ${speechInputSupported() ? '<button class="btn ghost" id="test-mic">🎤 Test the microphone</button><div id="mic-test"></div>' : ''}
    <button class="btn ghost" id="reset" style="color:var(--accent)">Reset all progress</button>
    <p class="sub" style="margin-top:18px">Everything stays on this device. Install the app (Add to Home Screen) and it works offline.</p>
  </div>`;

  /* An intake edit can change which questions apply — picking "married" adds
   * the spouse field, "0 children" removes the names — so every write
   * recomposes and re-renders rather than trying to patch the DOM in place. */
  const edit = (id, patch, rerender = false) => {
    state.intake[id] = { ...(state.intake[id] || {}), ...patch };
    syncProfile();
    if (rerender) renderMe();
  };

  $$('.tab').forEach((b) => b.addEventListener('click', () => { meView = b.dataset.view; renderMe(); }));
  $('#see-hungarian')?.addEventListener('click', () => { meView = 'hungarian'; renderMe(); });
  $('#edit-answers')?.addEventListener('click', () => { meView = 'answers'; renderMe(); });
  $$('.review').forEach((r) => r.addEventListener('click', () => speak(r.dataset.hu)));

  // Typing must not re-render — that would drop focus on every keystroke.
  $$('.intake-input').forEach((i) => i.addEventListener('input', () => {
    edit(i.dataset.field, { value: i.value }, false);
    // The child-name rows are generated from the count, so that one field does
    // need the form rebuilt — but only once the learner has stopped typing.
    if (i.dataset.field === 'kidCount') clearTimeout(i._t), i._t = setTimeout(renderMe, 600);
  }));

  $$('.intake-opt').forEach((i) => i.addEventListener('change', () =>
    edit(i.dataset.field, { k: i.dataset.key }, true)));

  $$('.intake-other').forEach((i) => i.addEventListener('input', () =>
    edit(i.dataset.field, { other: i.value }, false)));

  $$('.intake-multi').forEach((i) => i.addEventListener('change', () => {
    const cur = new Set(state.intake[i.dataset.field]?.keys || []);
    i.checked ? cur.add(i.dataset.key) : cur.delete(i.dataset.key);
    edit(i.dataset.field, { keys: [...cur] }, true);
  }));

  $$('.intake-sib').forEach((i) => i.addEventListener('input', () =>
    edit(i.dataset.field, { [i.dataset.key]: i.value }, false)));

  $$('.intake-kid').forEach((i) => i.addEventListener('input', () => {
    const rows = [...(state.intake.children?.rows || [])];
    const n = Number(i.dataset.row);
    rows[n] = { ...(rows[n] || {}), [i.dataset.key]: i.value };
    edit('children', { rows }, false);
  }));
  $('#rate').addEventListener('input', (e) => { st.rate = Number(e.target.value); save(); });
  $('#rate').addEventListener('change', () => speak('Jó napot kívánok! Foglaljon helyet!'));
  ['autoplay', 'showSay', 'hearts', 'mic'].forEach((id) => {
    $(`#${id}`)?.addEventListener('change', (e) => { st[id] = e.target.checked; save(); });
  });
  $('#test-voice').addEventListener('click', () => speak('Miért szeretne magyar állampolgár lenni?'));

  // A dry run of the whole speaking path: permission prompt, recognizer,
  // scorer — on a sentence nobody has to have learned yet.
  $('#test-mic')?.addEventListener('click', () => {
    const target = 'Jó napot kívánok!';
    $('#mic-test').innerHTML = `<p class="sub" style="margin-top:12px">Say: <b>${esc(target)}</b> (\u201Cyoh nah-pot kee-vah-nok\u201D)</p><div id="mic-test-pad"></div>`;
    micPad($('#mic-test-pad'), {
      target,
      onSettle: (res) => {
        $('#mic-test').innerHTML = `<div class="note">Microphone works — that one scored ${res.pct}%.</div>`;
      },
    });
  });
  $('#reset').addEventListener('click', () => {
    if (!confirm('Delete all XP, streak, profile and progress on this device?')) return;
    state = defaults();
    save();
    go('learn');
    toast('Progress reset');
  });
}

// ---------- session building ----------

// Weakest first: overdue, then never-seen, then lowest box.
function pickItems(pool, n) {
  const now = Date.now();
  const scored = shuffle(pool).map((w) => {
    const e = state.progress[w.key];
    let score;
    if (!e) score = 1;
    else if (e.due <= now) score = 0;
    else score = 2 + e.box;
    return { w, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, n).map((s) => s.w);
}

function chunkDistractors(item, n) {
  const pool = CHUNKS.filter((w) => w.key !== item.key && w.en !== item.en);
  const near = shuffle(pool.filter((w) => w.topic === item.topic));
  const far = shuffle(pool.filter((w) => w.topic !== item.topic));
  return [...near, ...far].slice(0, n);
}

function answerDistractors(item, n) {
  const pool = QAS.filter((w) => w.key !== item.key && w.a.hu !== item.a.hu);
  const near = shuffle(pool.filter((w) => w.topic === item.topic));
  const far = shuffle(pool.filter((w) => w.topic !== item.topic));
  return [...near, ...far].slice(0, n);
}

// Saying it out loud joins the rotation only where the browser can hear it,
// so a Firefox session still gets a complete lesson, just a silent one.
const chunkTypes = () => (micAvailable() ? ['flash', 'listen', 'build', 'dictate', 'speak'] : ['flash', 'listen', 'build', 'dictate']);
// The qa ladder ends unscaffolded: hear the question, produce the answer from
// nothing — typed, or spoken into the mic. Those last rungs only appear once
// an item has some practice behind it (box >= 2), so the scaffold fades
// instead of staying forever.
const qaTypes = () => (micAvailable()
  ? ['qa-listen', 'qa-respond', 'qa-build', 'qa-recall', 'qa-speak']
  : ['qa-listen', 'qa-respond', 'qa-build', 'qa-recall']);

const UNSCAFFOLDED = new Set(['qa-recall', 'qa-speak']);

// ----- sound drills -----
// Pair eligibility is correctness, not taste. `drill: false` marks a homophone
// pair — it proves a spelling point on the detail card, but no ear and no
// recognizer can tell two identical-sounding words apart, so a drill built on
// one is unanswerable. `minimal: false` marks a near pair: audible, so the ear
// drill can use it, but the say drill asks which of the two words the
// recognizer heard, and that question only means something when the words
// differ in the one feature being trained.
const earPairs = (s) => s.pairs.filter((p) => p.drill !== false);
const sayPairs = (s) => s.pairs.filter((p) => p.drill !== false && p.minimal !== false);

// Which of the three drills a sound can actually support. `h` has a single
// near pair and no minimal one, so it gets ear training and its phrase and is
// never asked to separate two words the recognizer cannot separate either.
function soundTypes(s) {
  const types = [];
  if (earPairs(s).length) types.push('sound-ear');
  if (micAvailable() && sayPairs(s).length) types.push('sound-say');
  if (micAvailable() && s.phrase) types.push('sound-phrase');
  return types;
}

// The pair is fixed when the exercise is built, so a missed contrast comes
// back at the end of the session as the same contrast.
function soundExercise(s, i) {
  const types = soundTypes(s);
  if (!types.length) return null;
  const type = types[i % types.length];
  if (type === 'sound-phrase') return { type, item: s };
  const pair = shuffle(type === 'sound-ear' ? earPairs(s) : sayPairs(s))[0];
  return { type, item: s, pair, side: Math.random() < 0.5 ? 'a' : 'b' };
}

function exerciseFor(item, mode, i) {
  const chunks = chunkTypes();
  // A sound has nothing to build out of tiles and nothing to type, so it
  // ignores the session mode and runs its own three drills wherever it turns
  // up — including inside a mixed review.
  if (item.kind === 'sound') return soundExercise(item, i);
  if (item.kind === 'chunk') {
    if (chunks.includes(mode)) return { type: mode, item };
    return { type: chunks[i % chunks.length], item };
  }
  let type;
  if (mode === 'listen') type = 'qa-listen';
  else if (mode === 'build' || mode === 'dictate') type = 'qa-build';
  else if (mode === 'speak') type = 'qa-speak';
  else type = qaTypes()[i % qaTypes().length];
  if (UNSCAFFOLDED.has(type) && (state.progress[item.key]?.box || 0) < 2) type = 'qa-build';
  return { type, item };
}

function buildQueue(pool, mode) {
  if (mode === 'match') {
    const chunks = pickItems(pool.filter((w) => w.kind === 'chunk'), 15);
    const rounds = [];
    for (let i = 0; i < chunks.length; i += 5) {
      const part = chunks.slice(i, i + 5);
      if (part.length >= 2) rounds.push({ type: 'match', items: part });
    }
    return rounds;
  }
  if (mode === 'speak') {
    // Speaking practice is worth having from the first meeting of a phrase, so
    // unlike the recall rungs it never falls back to tiles.
    return pickItems(pool.filter((w) => w.kind !== 'sound'), 10)
      .map((w) => ({ type: w.kind === 'chunk' ? 'speak' : 'qa-speak', item: w }));
  }
  if (mode === 'flash') {
    return pickItems(pool.filter((w) => w.kind === 'chunk'), 10).map((w) => ({ type: 'flash', item: w }));
  }
  if (mode === 'qa') {
    return pickItems(pool.filter((w) => w.kind === 'qa'), 9).map((w, i) => exerciseFor(w, 'qa', i));
  }

  // "Listening only" and "Builder only" are promises about what the session
  // will ask for. A sound can only offer its own three drills, two of which
  // want a microphone, so it sits out the modes it cannot honour rather than
  // smuggling a mic exercise into a listening review.
  const soundSafe = mode === 'mix' || mode === 'sound';
  const chosen = pickItems(soundSafe ? pool : pool.filter((w) => w.kind !== 'sound'), 10);
  // A sound with no eligible pair and no microphone yields no exercise at all
  // rather than an empty one, so the queue can come back shorter than asked.
  const queue = chosen.map((w, i) => exerciseFor(w, mode, i)).filter(Boolean);
  if (mode === 'mix') {
    const chunks = chosen.filter((w) => w.kind === 'chunk');
    if (chunks.length >= 3) queue.push({ type: 'match', items: shuffle(chunks).slice(0, 5) });
  }
  return queue;
}

function startSession(pool, mode, label) {
  if (!pool || !pool.length) { toast('Nothing to practice yet'); return; }
  const queue = buildQueue(pool, mode);
  if (!queue.length) { toast('Nothing to practice here'); return; }
  session = { queue, idx: 0, mode, label, right: 0, wrong: 0, xp: 0, hearts: 5, total: queue.length };
  view = 'session';
  render();
}

// One sound, drilled from three angles in the order the ear needs them: hear
// the contrast, produce the contrast, then say the sound inside a sentence
// where it has to survive running speech. Both members of every say-pair get
// produced — a contrast is only fixed when the learner can hit either side of
// it on demand.
function startSoundSession(sound) {
  const queue = shuffle(earPairs(sound)).map((pair) => ({
    type: 'sound-ear', item: sound, pair, side: Math.random() < 0.5 ? 'a' : 'b',
  }));
  if (micAvailable()) {
    for (const pair of shuffle(sayPairs(sound))) {
      queue.push({ type: 'sound-say', item: sound, pair, side: 'a' });
      queue.push({ type: 'sound-say', item: sound, pair, side: 'b' });
    }
    if (sound.phrase) queue.push({ type: 'sound-phrase', item: sound });
  }
  if (!queue.length) { toast('Nothing to drill for this sound on this device'); return; }
  // A sound with one eligible pair would otherwise be a two-question session,
  // so its contrasts come round a second time — but only a second time. There
  // is no honest way to pad a session out to ten with material the sound does
  // not have.
  const base = queue.length;
  const wanted = Math.min(8, base * 2);
  // Coming round again only teaches something if the question changed, so the
  // repeat asks for the other member of the pair.
  for (let i = 0; queue.length < wanted; i++) {
    const again = { ...queue[i % base] };
    if (again.pair) again.side = again.side === 'a' ? 'b' : 'a';
    queue.push(again);
  }

  const drills = queue.slice(0, 10);
  session = {
    queue: drills, idx: 0, mode: 'sound', label: sound.name,
    right: 0, wrong: 0, xp: 0, hearts: 5, total: drills.length, sound,
  };
  view = 'session';
  render();
}

// A mock interview walks the questions section by section like the real one,
// but shuffled within each section and free to use variant phrasings, so the
// learner can't ride the script order. No hearts — the real interview doesn't
// stop either. Questions with some practice behind them demand unscaffolded
// recall; the tile fallback stays available but costs the first-try credit.
function startInterview(topics) {
  const qs = topics.flatMap((t) => t.qa).sort(scriptOrder);
  if (!qs.length) { toast('No questions here'); return; }
  const bySection = {};
  for (const q of qs) {
    const sec = q.script.split('.')[0];
    (bySection[sec] = bySection[sec] || []).push(q);
  }
  const ordered = Object.keys(bySection).sort((a, b) => a - b).flatMap((sec) => shuffle(bySection[sec]));
  session = {
    queue: ordered.map((w) => ({
      type: (state.progress[w.key]?.box || 0) >= 2 ? 'qa-recall' : 'qa-build',
      item: w, interview: true,
    })),
    idx: 0, mode: 'interview',
    label: topics.length > 1 ? 'Full Mock Interview' : `${topics[0].title} — Mock`,
    right: 0, wrong: 0, xp: 0, hearts: 5, total: ordered.length,
    interview: true, firstTry: 0, missed: [],
  };
  view = 'session';
  render();
}

// ---------- session rendering ----------

function renderSession() {
  const s = session;
  const ex = s.queue[s.idx];
  if (!ex) return finishSession();

  $('#topbar-title').textContent = s.label;
  $('#back-btn').classList.remove('hidden');

  const pct = Math.round(s.idx / s.total * 100);
  const showHearts = state.settings.hearts && !s.interview;
  main.innerHTML = `<div class="wrap">
    <div id="session-head">
      <div class="bar"><i style="width:${Math.min(pct, 100)}%"></i></div>
      ${showHearts ? `<div class="hearts">${'❤️'.repeat(s.hearts)}${'🖤'.repeat(Math.max(0, 5 - s.hearts))}</div>`
        : s.interview ? `<div class="hearts">${Math.min(s.idx + 1, s.total)}/${s.total}</div>` : ''}
    </div>
    <div id="ex"></div>
  </div>`;

  ({
    flash: renderFlash,
    listen: renderListen,
    build: renderBuild,
    dictate: renderDictate,
    match: renderMatch,
    speak: renderSpeak,
    'sound-ear': renderSoundEar,
    'sound-say': renderSoundSay,
    'sound-phrase': renderSoundPhrase,
    'qa-speak': renderQaSpeak,
    'qa-listen': renderQaListen,
    'qa-respond': renderQaRespond,
    'qa-build': renderQaBuild,
    'qa-recall': renderQaRecall,
  })[ex.type](ex);
}

function exBox() { return $('#ex'); }

// ----- chunk exercises -----

function renderFlash(ex) {
  const w = ex.item;
  const shown = chunkText(w);
  exBox().innerHTML = `
    <button class="flash-card" id="card">
      <div class="prompt-word">${esc(shown)}</div>
      ${state.settings.showSay ? `<div class="prompt-say">${esc(w.say)}</div>` : ''}
      <div class="flash-hint" id="hint">Tap to reveal</div>
    </button>
    <div id="flash-actions" style="margin-top:14px"></div>`;

  speak(shown);
  $('#card').addEventListener('click', reveal, { once: true });

  function reveal() {
    $('#hint').innerHTML = `<b style="font-size:20px;color:var(--ink)">${esc(w.en)}</b>`;
    $('#flash-actions').innerHTML = `
      <button class="btn" id="say-again">🔊 Hear it again — then say it out loud</button>
      <button class="btn" id="miss">😕 Still learning</button>
      <button class="btn green" id="got">😃 I can say this</button>`;
    $('#say-again').addEventListener('click', () => speak(shown));
    $('#got').addEventListener('click', () => answered(true, ex, '', 'Ez az!'));
    $('#miss').addEventListener('click', () => answered(false, ex, `${esc(shown)} — ${esc(w.en)}`, 'It will come'));
  }
}

function renderListen(ex) {
  const w = ex.item;
  const shown = chunkText(w);
  const options = shuffle([w, ...chunkDistractors(w, 3)]);
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">Which phrase do you hear?</div>
      <button class="speak-btn speak-big" id="say" aria-label="Play audio">🔊</button>
    </div>
    <div class="options">
      ${options.map((o) => `<button class="opt" data-key="${o.key}">${esc(o.key === w.key ? shown : chunkText(o))}</button>`).join('')}
    </div>`;

  $('#say').addEventListener('click', () => speak(shown));
  if (state.settings.autoplay) setTimeout(() => speak(shown), 250);

  $$('.opt').forEach((btn) => btn.addEventListener('click', () => {
    const correct = btn.dataset.key === w.key;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key === w.key) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    answered(correct, ex, `${esc(shown)} — ${esc(w.en)}`);
  }));
}

// Tile builder — the Duolingo word bank, but for whole interview answers.
function tileBank(target, topic) {
  const words = target.split(/\s+/);
  const extras = shuffle([...new Set(
    CHUNKS.filter((c) => c.topic === topic)
      .flatMap((c) => chunkText(c).split(/\s+/))
      .filter((t) => !words.includes(t) && t.length > 1 && !t.includes('___')),
  )]).slice(0, Math.min(3, Math.max(2, Math.floor(words.length / 2))));
  return { words, bank: shuffle([...words, ...extras]) };
}

function renderTiles(container, targetWords, bank, onCheck) {
  const picked = [];
  container.innerHTML = `
    <div class="answer-line" id="answer-line"><span class="answer-hint">Tap the tiles in order</span></div>
    <div class="tile-bank" id="tile-bank">
      ${bank.map((t, i) => `<button class="tile" data-i="${i}">${esc(t)}</button>`).join('')}
    </div>
    <button class="btn primary" id="check" disabled>Check</button>`;

  const line = $('#answer-line', container);
  const check = $('#check', container);

  function redraw() {
    line.innerHTML = picked.length
      ? picked.map((p, j) => `<button class="tile picked-tile" data-j="${j}">${esc(p.text)}</button>`).join('')
      : '<span class="answer-hint">Tap the tiles in order</span>';
    check.disabled = !picked.length;
    $$('.picked-tile', line).forEach((b) => b.addEventListener('click', () => {
      const removed = picked.splice(Number(b.dataset.j), 1)[0];
      $(`.tile[data-i="${removed.i}"]`, container).classList.remove('used');
      redraw();
    }));
  }

  $$('#tile-bank .tile', container).forEach((b) => b.addEventListener('click', () => {
    if (b.classList.contains('used')) return;
    b.classList.add('used');
    picked.push({ text: b.textContent, i: Number(b.dataset.i) });
    redraw();
  }));

  check.addEventListener('click', () => {
    check.disabled = true;
    $$('#tile-bank .tile', container).forEach((b) => { b.disabled = true; });
    $$('.picked-tile', line).forEach((b) => { b.disabled = true; });
    onCheck(picked.map((p) => p.text).join(' '), targetWords.join(' '));
  });
  redraw();
}

function renderBuild(ex) {
  const w = ex.item;
  const target = chunkText(w);
  const { words, bank } = tileBank(target, w.topic);
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">Build the Hungarian</div>
      <div class="prompt-word" style="font-size:22px">${esc(w.en)}</div>
      <button class="speak-btn" id="say">🔊 Hear it</button>
    </div>
    <div id="tiles"></div>`;
  $('#say').addEventListener('click', () => speak(target));
  renderTiles($('#tiles'), words, bank, (got, want) => {
    const correct = normalize(got) === normalize(want);
    speak(target);
    answered(correct, ex, correct ? '' : `${esc(target)} — ${esc(w.en)}`);
  });
}

function renderDictate(ex) {
  const w = ex.item;
  const target = chunkText(w);
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">Type what you hear</div>
      <button class="speak-btn speak-big" id="say" aria-label="Play audio">🔊</button>
      <div class="prompt-say">${esc(w.en)}</div>
    </div>
    <input class="type-input" id="typed" autocapitalize="off" autocomplete="off" autocorrect="off"
           spellcheck="false" placeholder="magyarul…">
    <div class="accent-row">${['á','é','í','ó','ö','ő','ú','ü','ű'].map((a) => `<button class="accent-key" data-a="${a}">${a}</button>`).join('')}</div>
    <button class="btn primary" id="check">Check</button>`;

  const input = $('#typed');
  input.focus();
  $('#say').addEventListener('click', () => speak(target));
  if (state.settings.autoplay) setTimeout(() => speak(target), 250);

  $$('.accent-key').forEach((k) => k.addEventListener('click', () => {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + k.dataset.a + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.focus();
  }));

  const submit = () => {
    const typed = normalize(input.value);
    if (!typed) { input.focus(); return; }
    const want = normalize(target);
    const exact = typed === want;
    // Accent-blind counts, with a warning — vowel length changes meaning.
    const close = !exact && stripAccents(typed) === stripAccents(want);
    input.disabled = true;
    $('#check').disabled = true;
    speak(target);
    answered(exact || close, ex,
      exact ? '' : close ? `Watch the accents: <b>${esc(target)}</b>` : `${esc(target)} — ${esc(w.en)}`,
      close ? 'Almost!' : null, false, exact);
  };

  $('#check').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

function renderMatch(ex) {
  const left = shuffle(ex.items);
  const right = shuffle(ex.items);
  let picked = null;
  let solved = 0;
  let missed = false;

  exBox().innerHTML = `
    <div class="prompt-card" style="padding:16px">
      <div class="prompt-kind">Tap the pairs</div>
    </div>
    <div class="match-grid">
      <div>${left.map((w) => `<button class="match-tile" data-key="${w.key}" data-side="hu">${esc(chunkText(w))}</button>`).join('')}</div>
      <div>${right.map((w) => `<button class="match-tile" data-key="${w.key}" data-side="en">${esc(w.en)}</button>`).join('')}</div>
    </div>`;

  $$('.match-tile').forEach((tile) => tile.addEventListener('click', () => {
    if (tile.dataset.side === 'hu') speak(chunkText(BY_KEY[tile.dataset.key]));
    if (!picked) { picked = tile; tile.classList.add('picked'); return; }
    if (picked === tile) { picked.classList.remove('picked'); picked = null; return; }
    if (picked.dataset.side === tile.dataset.side) {
      picked.classList.remove('picked');
      picked = tile;
      tile.classList.add('picked');
      return;
    }
    if (picked.dataset.key === tile.dataset.key) {
      grade(tile.dataset.key, true, false);
      picked.classList.add('done');
      tile.classList.add('done');
      picked.classList.remove('picked');
      picked = null;
      solved++;
      if (solved === ex.items.length) {
        save();
        answered(!missed, ex, missed ? 'All matched, with a few misses.' : '', 'All matched!', true);
      }
    } else {
      grade(tile.dataset.key, false, false);
      grade(picked.dataset.key, false, false);
      missed = true;
      const a = picked;
      a.classList.add('miss');
      tile.classList.add('miss');
      setTimeout(() => { a.classList.remove('miss', 'picked'); tile.classList.remove('miss'); }, 320);
      picked = null;
    }
  }));
}

// ----- speaking exercises -----

// The microphone pad: tap, say the sentence, see it scored word by word.
// Nothing is graded until the learner taps Continue, so a fumbled first take
// can be re-recorded — the score that counts is their best of the attempts.
let activeMicPad = null;

function stopMic() {
  activeMicPad?.stop();
  activeMicPad = null;
}

function micPad(host, { target, onSettle }) {
  let listener = null;
  let best = null;

  host.innerHTML = `
    <div class="mic-pad">
      <button class="mic-btn" id="mic-btn" aria-label="Record what you say">🎤</button>
      <div class="mic-state" id="mic-state">Tap the mic, then say it out loud</div>
      <div class="mic-heard hidden" id="mic-heard"></div>
    </div>
    <div id="mic-result"></div>`;

  const btn = $('#mic-btn', host);
  const stateLine = $('#mic-state', host);
  const heard = $('#mic-heard', host);
  const result = $('#mic-result', host);

  function idle(msg) {
    listener = null;
    btn.classList.remove('listening');
    btn.textContent = '🎤';
    btn.disabled = false;
    stateLine.textContent = msg;
  }

  function start() {
    result.innerHTML = '';
    heard.classList.add('hidden');
    heard.textContent = '';
    btn.classList.add('listening');
    btn.textContent = '⏹';
    stateLine.textContent = 'Starting…';

    listener = listen({
      lang: 'hu-HU',
      onStart: () => { stateLine.textContent = 'Listening — tap again when you finish'; },
      onPartial: (text) => {
        heard.classList.remove('hidden');
        heard.textContent = text;
      },
    });

    listener.promise.then(({ alternatives, error }) => {
      if (!host.isConnected) return;
      const res = scoreSpeech(target, alternatives);
      if (!res.heard) {
        idle(micErrorMessage(error) || "Didn't catch that — try again.");
        return;
      }
      idle('Tap the mic to say it again');
      heard.classList.add('hidden');
      if (!best || res.score > best.score) best = res;
      showResult(res);
    });
  }

  function showResult(res) {
    const verdictTitle = { pass: '🟢 Understood', close: '🟡 Understandable, barely', miss: '🔴 Not there yet' }[res.verdict];
    const bestLine = best && best.score > res.score
      ? `<div class="mic-best">Best attempt so far: <b>${best.pct}%</b> — that is the one that counts.</div>` : '';
    result.innerHTML = `
      <div class="mic-score ${res.verdict}">
        <div class="mic-score-head">
          <span class="mic-verdict">${verdictTitle}</span>
          <span class="mic-pct">${res.pct}%</span>
        </div>
        <div class="bar"><i style="width:${res.pct}%"></i></div>
        <div class="mic-diff">${diffHtml(res.diff)}</div>
        <div class="mic-transcript">Heard: „${esc(res.transcript)}”</div>
        ${res.accentsOnly ? '<div class="mic-transcript">Vowel length drifted on the marked words — in Hungarian that changes meaning.</div>' : ''}
        ${bestLine}
      </div>
      <button class="btn" id="mic-retry">🔁 Say it again</button>
      <button class="btn primary" id="mic-continue">Continue</button>`;

    $('#mic-retry', result).addEventListener('click', start);
    $('#mic-continue', result).addEventListener('click', () => {
      $('#mic-continue', result).disabled = true;
      $('#mic-retry', result).disabled = true;
      btn.disabled = true;
      onSettle(best);
    });
    result.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  btn.addEventListener('click', () => {
    if (listener) { listener.stop(); return; }
    start();
  });

  activeMicPad = { stop() { listener?.abort(); listener = null; } };
  return activeMicPad;
}

// The target sentence, word by word, coloured by what the recognizer heard.
function diffHtml(diff) {
  const words = diff.filter((d) => d.status !== 'extra').map((d) => {
    const label = esc(d.want);
    if (d.status === 'ok') return `<span class="dw ok">${label}</span>`;
    if (d.status === 'near') return `<span class="dw near" title="heard: ${esc(d.said)}">${label}</span>`;
    if (d.status === 'missing') return `<span class="dw missing">${label}</span>`;
    return `<span class="dw wrong" title="heard: ${esc(d.said)}">${label}</span>`;
  }).join(' ');
  const extra = diff.filter((d) => d.status === 'extra').map((d) => esc(d.said));
  return words + (extra.length ? `<div class="mic-extra">Extra words heard: ${extra.join(', ')}</div>` : '');
}

// A spoken answer that the recognizer understood cleanly is the strongest
// evidence of production the app can gather, so it earns full mastery credit.
// A merely understandable one still counts correct, but not as production —
// same rule the accent-blind dictation answers live under.
function speechAnswered(ex, res, target, model) {
  // Once the attempt is graded the scaffold buttons have nothing left to
  // offer — the model answer is in the feedback panel below.
  $('#reveal')?.classList.add('hidden');
  const pass = res.verdict === 'pass';
  const correct = pass || res.verdict === 'close';
  speak(target);
  const detail = pass
    ? `${esc(target)} — ${esc(model)}`
    : `Say it like this: <b>${esc(target)}</b> — ${esc(model)}`;
  const title = pass
    ? (ex.assisted ? 'Understood — now try it without the model.' : `Understood — ${res.pct}%.`)
    : correct ? `An official would have got it, just — ${res.pct}%.` : `Not close enough — ${res.pct}%.`;
  answered(correct, ex, detail, title, false, pass && !ex.assisted);
}

function renderSpeak(ex) {
  const w = ex.item;
  const target = chunkText(w);
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">🎤 Say it in Hungarian</div>
      <div class="prompt-word" style="font-size:22px" id="speak-prompt">${esc(w.en)}</div>
      ${state.settings.showSay ? '<div class="prompt-say" id="speak-say"></div>' : ''}
    </div>
    <div id="mic-host"></div>
    <button class="btn ghost" id="reveal">👀 Show and play it first (costs the production credit)</button>`;

  $('#reveal').addEventListener('click', () => {
    ex.assisted = true;
    $('#reveal').classList.add('hidden');
    $('#speak-prompt').innerHTML = `${esc(target)}<div class="prompt-say">${esc(w.en)}</div>`;
    const say = $('#speak-say');
    if (say) say.textContent = w.say;
    speak(target);
  });

  micPad($('#mic-host'), { target, onSettle: (res) => speechAnswered(ex, res, target, w.en) });
}

// Answering the official out loud: the drill the app used to leave to the
// learner's honour system. Question in, spoken answer out, scored.
function renderQaSpeak(ex) {
  const w = ex.item;
  const ask = askForm(w);
  const target = answerTextOf(w);
  exBox().innerHTML = `
    <div class="prompt-card interviewer">
      <div class="prompt-kind">🎙️ ${ex.interview ? 'The official asks — answer out loud' : 'Answer out loud'}</div>
      <div class="prompt-word" style="font-size:22px">„${esc(ask.hu)}”</div>
      ${state.settings.showSay ? `<div class="prompt-say">${esc(w.q.en)}</div>` : ''}
      <button class="speak-btn" id="say">🔊 Play the question</button>
    </div>
    <div id="mic-host"></div>
    <button class="btn ghost" id="reveal">👀 Show me my answer${ex.interview ? ' (costs the first-try credit)' : ''}</button>`;

  $('#say').addEventListener('click', () => speak(ask.hu));
  if (state.settings.autoplay) setTimeout(() => speak(ask.hu), 250);

  $('#reveal').addEventListener('click', () => {
    ex.assisted = true;
    $('#reveal').classList.add('hidden');
    $('#mic-host').insertAdjacentHTML('beforebegin', `<div class="note">${esc(target)} — ${esc(w.a.en)}</div>`);
  });

  micPad($('#mic-host'), { target, onSettle: (res) => speechAnswered(ex, res, target, w.a.en) });
}

// ----- sound exercises -----

// Discrimination first: a contrast you cannot hear is one you cannot fix.
// Recognition only, so it caps at box 3 like every other picking drill.
function renderSoundEar(ex) {
  const p = ex.pair;
  const target = p[ex.side];
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">Which word do you hear?</div>
      <button class="speak-btn speak-big" id="say" aria-label="Play audio">🔊</button>
      <div class="prompt-say">${esc(ex.item.name)}</div>
    </div>
    <div class="options">
      ${['a', 'b'].map((side) => `<button class="opt sound-opt" data-side="${side}">
        <b>${esc(p[side])}</b><span>${esc(p[`${side}En`])}</span>
      </button>`).join('')}
    </div>`;

  $('#say').addEventListener('click', () => speak(target));
  if (state.settings.autoplay) setTimeout(() => speak(target), 250);

  $$('.opt').forEach((btn) => btn.addEventListener('click', () => {
    const correct = btn.dataset.side === ex.side;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.side === ex.side) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    answered(correct, ex, `${esc(target)} — ${esc(p[`${ex.side}En`])}. ${esc(p.note)}`);
  }));
}

// The contrast test, and the reason the section exists. The learner says one
// member of a minimal pair; the transcript is then scored against BOTH words.
// Scoring it against the target alone would call a clean "had" a passable
// "hagy" whenever the recognizer's spelling happened to be close — and would
// never tell the learner the one thing worth knowing, which is that the
// machine heard the other word.
// judgeContrast() in speech.js does the deciding, and deliberately ignores the
// sentence score micPad shows: that score forgives accents and compares
// loosely, which is right for a sentence and blind for a minimal pair whose
// entire difference is an accent.

function renderSoundSay(ex) {
  const p = ex.pair;
  const other = ex.side === 'a' ? 'b' : 'a';
  const target = p[ex.side];
  const rival = p[other];
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">🎤 Say this one — not the other</div>
      <div class="prompt-word">${esc(target)}</div>
      <div class="prompt-say">${esc(p[`${ex.side}En`])}</div>
      <div class="contrast-rival">not <b>${esc(rival)}</b> — ${esc(p[`${other}En`])}</div>
      <button class="speak-btn" id="say">🔊 Hear the pair</button>
    </div>
    <div id="mic-host"></div>`;

  // Playing the model costs nothing here, unlike the speaking drills: the word
  // is on screen either way, and what is being tested is the contrast, not
  // whether the learner could recall the word.
  $('#say').addEventListener('click', () => { speak(target); setTimeout(() => speak(rival), 900); });

  micPad($('#mic-host'), {
    target,
    onSettle: (res) => {
      const judged = judgeContrast(res.alternatives, target, rival);
      const verdict = judged.verdict;
      speak(target);
      if (verdict === 'rival') {
        answered(false, ex,
          `You said <b>${esc(target)}</b> (${esc(p[`${ex.side}En`])}), the recognizer heard <b>${esc(rival)}</b> (${esc(p[`${other}En`])}) — that is the contrast to fix.<br>${esc(ex.item.mouth)}`,
          'The other word came out');
        return;
      }
      if (verdict === 'miss' || verdict === 'silent') {
        answered(false, ex, `Say it like this: <b>${esc(target)}</b> — ${esc(p[`${ex.side}En`])}.<br>${esc(ex.item.mouth)}`,
          verdict === 'silent' ? "Didn't catch that one." : `Not close enough — ${judged.pct}%.`);
        return;
      }
      answered(true, ex, `${esc(target)} — ${esc(p[`${ex.side}En`])}. ${esc(p.note)}`,
        verdict === 'pass'
          ? `Clearly ${esc(target)}, not ${esc(rival)} — ${judged.pct}%.`
          : `Closer to ${esc(target)} than to ${esc(rival)}, but not cleanly — ${judged.pct}%.`,
        false, verdict === 'pass');
    },
  });
}

// The sound in running speech, where it has to survive a whole sentence.
// Same scoring path as the speaking drills.
function renderSoundPhrase(ex) {
  const s = ex.item;
  const target = s.phrase.hu;
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">🎤 Say the whole sentence</div>
      <div class="prompt-word" style="font-size:24px">${esc(target)}</div>
      <div class="prompt-say">${esc(s.phrase.en)}</div>
      <button class="speak-btn" id="say">🔊 Hear it</button>
    </div>
    <p class="sub" style="text-align:center">Watch the ${esc(s.letter)}: ${esc(s.mouth)}</p>
    <div id="mic-host"></div>`;

  $('#say').addEventListener('click', () => speak(target));
  micPad($('#mic-host'), { target, onSettle: (res) => speechAnswered(ex, res, target, s.phrase.en) });
}

// ----- interview-question exercises -----

function renderQaListen(ex) {
  const w = ex.item;
  const ask = askForm(w);
  const options = shuffle([w, ...answerDistractors(w, 3)]);
  exBox().innerHTML = `
    <div class="prompt-card interviewer">
      <div class="prompt-kind">🎙️ The official asks — what do they want to know?</div>
      <button class="speak-btn speak-big" id="say" aria-label="Play audio">🔊</button>
      ${ask.variant ? '<div class="prompt-say">another common phrasing of a question you know</div>' : ''}
    </div>
    <div class="options">
      ${options.map((o) => `<button class="opt" data-key="${o.key}">${esc(o.q.en)}</button>`).join('')}
    </div>`;

  $('#say').addEventListener('click', () => speak(ask.hu));
  if (state.settings.autoplay) setTimeout(() => speak(ask.hu), 250);

  $$('.opt').forEach((btn) => btn.addEventListener('click', () => {
    const correct = btn.dataset.key === w.key;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key === w.key) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    answered(correct, ex, `„${esc(ask.hu)}” — ${esc(w.q.en)}`);
  }));
}

function renderQaRespond(ex) {
  const w = ex.item;
  const ask = askForm(w);
  const options = shuffle([w, ...answerDistractors(w, 3)]);
  exBox().innerHTML = `
    <div class="prompt-card interviewer">
      <div class="prompt-kind">🎙️ Pick your answer</div>
      <div class="prompt-word" style="font-size:22px">„${esc(ask.hu)}”</div>
      ${state.settings.showSay ? `<div class="prompt-say">${esc(w.q.en)}</div>` : ''}
      <button class="speak-btn" id="say">🔊 Play</button>
    </div>
    <div class="options">
      ${options.map((o) => `<button class="opt" data-key="${o.key}">${esc(answerTextOf(o))}</button>`).join('')}
    </div>`;

  $('#say').addEventListener('click', () => speak(ask.hu));
  if (state.settings.autoplay) setTimeout(() => speak(ask.hu), 250);

  $$('.opt').forEach((btn) => btn.addEventListener('click', () => {
    const correct = btn.dataset.key === w.key;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key === w.key) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    if (correct) speak(answerTextOf(w));
    answered(correct, ex, `${esc(answerTextOf(w))} — ${esc(w.a.en)}`);
  }));
}

function renderQaBuild(ex) {
  const w = ex.item;
  const ask = askForm(w);
  const target = answerTextOf(w);
  const { words, bank } = tileBank(target, w.topic);
  exBox().innerHTML = `
    <div class="prompt-card interviewer">
      <div class="prompt-kind">🎙️ ${ex.interview ? 'The official asks' : 'Build your answer'}</div>
      <div class="prompt-word" style="font-size:22px">„${esc(ask.hu)}”</div>
      ${state.settings.showSay ? `<div class="prompt-say">${esc(w.q.en)}</div>` : ''}
      <button class="speak-btn" id="say">🔊 Play the question</button>
    </div>
    <div id="tiles"></div>`;

  $('#say').addEventListener('click', () => speak(ask.hu));
  if (state.settings.autoplay) setTimeout(() => speak(ask.hu), 250);

  renderTiles($('#tiles'), words, bank, (got, want) => {
    const correct = normalize(got) === normalize(want);
    speak(target);
    answered(correct, ex,
      correct ? `${esc(target)} — ${esc(w.a.en)}` : `Model answer: <b>${esc(target)}</b> — ${esc(w.a.en)}`,
      correct ? null : 'Not quite');
  });
}

// Unscaffolded recall: the question arrives, the answer has to come from
// nothing — no tiles, no options. This is the closest drill to the real room.
// In the mock interview, "Show me the tiles" stays available as an escape
// hatch, but taking it forfeits the first-try credit.
function renderQaRecall(ex) {
  const w = ex.item;
  const ask = askForm(w);
  const target = answerTextOf(w);
  exBox().innerHTML = `
    <div class="prompt-card interviewer">
      <div class="prompt-kind">🎙️ ${ex.interview ? 'The official asks' : 'Answer from memory'}</div>
      <div class="prompt-word" style="font-size:22px">„${esc(ask.hu)}”</div>
      ${state.settings.showSay ? `<div class="prompt-say">${esc(w.q.en)}</div>` : ''}
      <button class="speak-btn" id="say">🔊 Play the question</button>
    </div>
    <p class="sub" style="text-align:center">Say your answer out loud, then type it — no help this time.</p>
    <input class="type-input" id="typed" autocapitalize="off" autocomplete="off" autocorrect="off"
           spellcheck="false" placeholder="a válaszom…">
    <div class="accent-row">${['á','é','í','ó','ö','ő','ú','ü','ű'].map((a) => `<button class="accent-key" data-a="${a}">${a}</button>`).join('')}</div>
    <button class="btn primary" id="check">Check</button>
    ${micAvailable() ? '<button class="btn ghost" id="speak-instead">🎤 Answer out loud instead</button>' : ''}
    <button class="btn ghost" id="tiles-fallback">🧱 I need the tiles${ex.interview ? ' (costs the first-try credit)' : ''}</button>`;

  const input = $('#typed');
  input.focus();
  $('#say').addEventListener('click', () => speak(ask.hu));
  if (state.settings.autoplay) setTimeout(() => speak(ask.hu), 250);

  $$('.accent-key').forEach((k) => k.addEventListener('click', () => {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + k.dataset.a + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.focus();
  }));

  // Speaking the answer is the same unscaffolded rung, so it costs nothing —
  // it just gets judged by the mic instead of the keyboard.
  $('#speak-instead')?.addEventListener('click', () => {
    ex.type = 'qa-speak';
    renderQaSpeak(ex);
  });

  $('#tiles-fallback').addEventListener('click', () => {
    ex.assisted = true;
    ex.type = 'qa-build';
    renderQaBuild(ex);
  });

  const submit = () => {
    const typed = normalize(input.value);
    if (!typed) { input.focus(); return; }
    const want = normalize(target);
    const exact = typed === want;
    const close = !exact && stripAccents(typed) === stripAccents(want);
    input.disabled = true;
    $('#check').disabled = true;
    $('#tiles-fallback').disabled = true;
    speak(target);
    answered(exact || close, ex,
      exact ? `${esc(target)} — ${esc(w.a.en)}`
        : close ? `Watch the accents: <b>${esc(target)}</b>`
        : `Model answer: <b>${esc(target)}</b> — ${esc(w.a.en)}`,
      exact ? 'From memory — that counts double.' : close ? 'Almost!' : 'Not yet', false, exact);
  };

  $('#check').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

// ---------- answering / feedback ----------

const PRAISE = ['Szuper!', 'Nagyon jó!', 'Ez az!', 'Remek!', 'Jól van!', 'Kiváló!'];
const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

// Which exercise types count as production for the mastery cap. Dictation,
// recall and the spoken drills pass an explicit flag instead, because their
// tolerant "close enough" answers count as correct without counting as
// production.
const PRODUCTION_TYPES = new Set(['build', 'qa-build']);

// Producing a whole sentence from nothing is worth more than recognising one;
// doing it out loud is worth the same as doing it from memory in writing.
const XP_FOR = { 'qa-recall': 20, 'qa-speak': 20, speak: 15, 'sound-phrase': 15 };

function answered(correct, ex, detail, titleOverride, alreadyGraded, productionOverride) {
  const s = session;
  const production = productionOverride ?? PRODUCTION_TYPES.has(ex.type);
  // A curriculum item gets one exercise per session and so moves one box. A
  // sound gets eight or ten, all keyed to the same item, and would otherwise
  // ride from box 0 to mastered in a single sitting — or crash to 0 on a bad
  // one. The first answer of the session moves the box, exactly like every
  // other item; the rest still count towards the accuracy record.
  if (!alreadyGraded && ex.item) {
    const locked = ex.item.kind === 'sound' && s.movedBoxes?.has(ex.item.key);
    grade(ex.item.key, correct, production, locked);
    if (ex.item.kind === 'sound') (s.movedBoxes = s.movedBoxes || new Set()).add(ex.item.key);
  }
  if (correct) {
    s.right++;
    s.xp += XP_FOR[ex.type] || 10;
    if (s.interview && !ex.repeat && !ex.assisted && UNSCAFFOLDED.has(ex.type)) s.firstTry++;
  } else {
    s.wrong++;
    if (state.settings.hearts && !s.interview) s.hearts--;
  }
  if (s.interview && ex.item && (!correct || ex.assisted || !UNSCAFFOLDED.has(ex.type))) s.missed.push(ex.item.key);
  save();

  // Missed items come back once at the end — except in the mock interview,
  // which flows on like the real one.
  if (!correct && !ex.repeat && !s.interview && ex.type !== 'match') s.queue.push({ ...ex, repeat: true });

  const outOfHearts = state.settings.hearts && !s.interview && s.hearts <= 0;
  const title = titleOverride || (correct ? pickPraise() : 'Not quite');

  const fb = document.createElement('div');
  fb.id = 'feedback';
  fb.className = correct ? 'ok' : 'no';
  fb.innerHTML = `
    <div class="fb-title">${correct ? '✅' : '❌'} ${esc(title)}</div>
    ${detail ? `<div class="fb-body">${detail}</div>` : ''}
    <button class="btn ${correct ? 'green' : 'primary'}" id="next">${outOfHearts ? 'See results' : 'Continue'}</button>`;
  $('.wrap').appendChild(fb);
  fb.scrollIntoView({ behavior: 'smooth', block: 'end' });

  $('#next').addEventListener('click', () => {
    if (outOfHearts) { s.outOfHearts = true; return finishSession(); }
    s.idx++;
    render();
  });
}

// ---------- results ----------

let lastResult = null;

function finishSession() {
  const s = session;
  const answers = s.right + s.wrong;
  const bonus = s.outOfHearts || !answers ? 0 : (s.interview ? 30 : 15);
  state.xp += s.xp + bonus;
  if (answers) touchStreak();
  if (s.interview && s.label === 'Full Mock Interview') {
    const run = { right: s.firstTry, total: s.total };
    if (!state.bestInterview || run.right > state.bestInterview.right) state.bestInterview = run;
  }
  save();
  lastResult = { ...s, bonus, answers };
  session = null;
  view = 'results';
  render();
}

function renderResults() {
  const r = lastResult;
  if (!r) return go('learn');
  const acc = r.answers ? Math.round(r.right / r.answers * 100) : 0;
  $('#topbar-title').textContent = 'Results';
  $('#back-btn').classList.add('hidden');

  const missedItems = r.interview ? [...new Set(r.missed)].map((k) => BY_KEY[k]).filter(Boolean) : [];
  const interviewLine = r.interview
    ? `<p class="sub">${r.firstTry}/${r.total} recalled unaided from memory. ${r.firstTry === r.total
        ? 'You would walk out of that office smiling.' : 'Drill the misses below, then run it again.'}</p>`
    : '';

  main.innerHTML = `<div class="wrap">
    <div class="result-hero">
      <div class="big">${r.outOfHearts ? '💔' : acc >= 90 ? '🏆' : acc >= 60 ? '🎉' : '💪'}</div>
      <h2>${r.outOfHearts ? 'Out of hearts' : acc >= 90 ? 'Kiváló! (Excellent)' : r.interview ? 'Interview finished' : 'Session complete'}</h2>
      <p class="sub">${esc(r.label)}</p>
      ${interviewLine}
    </div>
    <div class="stat-grid">
      <div class="stat-box"><b>${r.xp + r.bonus}</b><span>XP earned</span></div>
      <div class="stat-box"><b>${acc}%</b><span>accuracy</span></div>
      <div class="stat-box"><b>${state.streak.count}</b><span>day streak</span></div>
    </div>
    ${missedItems.length ? `<button class="btn green" id="drill-misses">🎯 Drill my ${missedItems.length} weak question${missedItems.length === 1 ? '' : 's'}</button>` : ''}
    <button class="btn primary" id="again">${r.interview ? 'Run it again' : 'Practice again'}</button>
    <button class="btn ghost" id="home">Back to topics</button>
  </div>`;

  $('#drill-misses')?.addEventListener('click', () => startSession(missedItems, 'mix', 'Weak questions'));

  $('#again').addEventListener('click', () => {
    if (r.sound) return startSoundSession(r.sound);
    if (r.interview) return r.label === 'Full Mock Interview' ? startInterview(TOPICS) : startInterview([currentTopic]);
    const pool = r.label === 'Review' ? (dueItems().length ? dueItems() : seenItems()) : topicItems(currentTopic || TOPICS[0]);
    startSession(pool, r.mode, r.label);
  });
  $('#home').addEventListener('click', () => go('learn'));
}

// ---------- boot ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
