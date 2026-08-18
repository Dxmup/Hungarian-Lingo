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
  profile: {},                        // PROFILE_FIELDS id -> learner's value
  bestInterview: null,                // best full mock-interview score
  settings: { rate: 0.8, autoplay: true, showSay: true, hearts: true, mic: true },
});

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved) return defaults();
    // Merge onto defaults so a save written by an older version keeps working.
    return {
      ...defaults(),
      ...saved,
      settings: { ...defaults().settings, ...(saved.settings || {}) },
      profile: { ...(saved.profile || {}) },
    };
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

function grade(key, correct, production) {
  const e = entry(key);
  if (correct) {
    const cap = production ? BOX_DAYS.length - 1 : RECOGNITION_CAP;
    e.box = Math.min(e.box + 1, Math.max(cap, e.box));
    e.right++;
  } else {
    e.box = Math.max(e.box - 1, 0);
    e.wrong++;
  }
  e.due = Date.now() + BOX_DAYS[e.box] * 86400000;
}

function dueItems() {
  const now = Date.now();
  return ALL_ITEMS.filter((w) => state.progress[w.key] && state.progress[w.key].due <= now);
}

function seenItems() {
  return ALL_ITEMS.filter((w) => state.progress[w.key]);
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
// Hungarian suffixes obey vowel harmony, so a template written "___-ban" must
// become "1985-ben" when the filled year is read with front vowels. harmony()
// classifies digit strings by how the year is read aloud (…öt → front,
// …nyolc → back). Written-letter classification is a fallback only — foreign
// names can be spelled back but pronounced front (Cleveland), which is why
// every town slot uses the fixed "___ városában/városából" frame instead of
// a bare suffix.

const BACK_V = 'aáoóuú';
const FRONT_V = 'eéiíöőüű';
// Reading of a year's final element: ones digit, or the decade for …X0.
const DIGIT_H = { 1: 'f', 2: 'f', 3: 'b', 4: 'f', 5: 'f', 6: 'b', 7: 'f', 8: 'b', 9: 'f' };
const DECADE_H = { 1: 'f', 2: 'b', 3: 'b', 4: 'f', 5: 'f', 6: 'b', 7: 'f', 8: 'b', 9: 'f' };

function harmony(value) {
  const v = value.trim();
  const digits = v.match(/(\d+)\s*$/);
  if (digits) {
    const d = digits[1];
    const ones = Number(d[d.length - 1]);
    if (ones) return DIGIT_H[ones];
    const tens = Number(d[d.length - 2] || 0);
    if (tens) return DECADE_H[tens];
    // …00: kilencszáz (back) below 2000, kétezer (front) from 2000 up.
    return Number(d) >= 2000 ? 'f' : 'b';
  }
  for (let i = v.length - 1; i >= 0; i--) {
    const c = v[i].toLowerCase();
    if (BACK_V.includes(c)) return 'b';
    if (FRONT_V.includes(c)) return 'f';
  }
  return 'b';
}

const SUFFIX_PAIRS = { ban: 'ben', ból: 'ből', ba: 'be' };

function withSuffix(value, backForm) {
  // Only digit values take the suffix (1985-ben). A text value in a year slot
  // is an era phrase that carries its own grammar ("a háború után").
  if (!/\d\s*$/.test(value)) return value;
  const form = harmony(value) === 'b' ? backForm : SUFFIX_PAIRS[backForm];
  return `${value}-${form}`;
}

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

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
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
    return '<div class="note">No Hungarian voice found on this device, so playback uses your default voice and will sound off. Add a Hungarian text-to-speech voice in your system settings for accurate listening practice.</div>';
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
  main.innerHTML = `<div class="wrap">
    <h2>Szia! 👋</h2>
    <p class="sub">Conversational Hungarian for the simplified naturalization interview — whole phrases, in your own words. Nothing you won't need in that room.</p>
    ${noProfile ? `<button class="btn primary" id="setup-profile">👤 Set up your answers first (2 min)</button>
      <p class="sub" style="margin-top:8px">The app drills <b>your</b> name, town, and family story — not a stranger's.</p>` : ''}
    ${due ? `<button class="btn ${noProfile ? '' : 'primary'}" id="quick-review">🔁 Review ${due} item${due === 1 ? '' : 's'} due now</button>` : ''}
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
  $$('.unit-card').forEach((c) => c.addEventListener('click', () => go('topic', { topicId: c.dataset.topic })));
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
    ${seen.length ? `<div class="section-label">Your items (${seen.length})</div>${sorted.map((w) => w.kind === 'qa' ? qaRow(w) : chunkRow(w)).join('')}` : ''}
  </div>`;

  $('#start-review')?.addEventListener('click', () => startSession(dueItems(), 'mix', 'Review'));
  $('#review-listen')?.addEventListener('click', () => startSession(dueItems(), 'listen', 'Review'));
  $('#review-build')?.addEventListener('click', () => startSession(dueItems(), 'build', 'Review'));
  bindRows();
}

// ---------- Me (profile + settings + stats) ----------

function renderMe() {
  $('#topbar-title').textContent = 'My Answers';
  const st = state.settings;
  const seen = seenItems();
  const mastered = seen.filter((w) => state.progress[w.key].box >= MASTER_BOX).length;
  const right = seen.reduce((n, w) => n + state.progress[w.key].right, 0);
  const wrong = seen.reduce((n, w) => n + state.progress[w.key].wrong, 0);
  const acc = right + wrong ? Math.round(right / (right + wrong) * 100) : 0;

  main.innerHTML = `<div class="wrap">
    <h2>👤 Your answers</h2>
    <p class="sub">Ultralearning rule one: practice the real thing. Fill these in and every drill uses <b>your</b> sentences — the exact ones you'll say to the official.</p>
    <div class="card">
      ${PROFILE_FIELDS.map((f) => `
        <div class="field">
          <label for="pf-${f.id}">${esc(f.label)}</label>
          <input type="text" id="pf-${f.id}" class="profile-input" data-field="${f.id}"
                 value="${esc(state.profile[f.id] || '')}" placeholder="${esc(f.example)}"
                 autocapitalize="off" autocomplete="off">
        </div>`).join('')}
    </div>
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

  $$('.profile-input').forEach((input) => input.addEventListener('input', () => {
    state.profile[input.dataset.field] = input.value;
    save();
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

function exerciseFor(item, mode, i) {
  const chunks = chunkTypes();
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
    return pickItems(pool, 10).map((w) => ({ type: w.kind === 'chunk' ? 'speak' : 'qa-speak', item: w }));
  }
  if (mode === 'flash') {
    return pickItems(pool.filter((w) => w.kind === 'chunk'), 10).map((w) => ({ type: 'flash', item: w }));
  }
  if (mode === 'qa') {
    return pickItems(pool.filter((w) => w.kind === 'qa'), 9).map((w, i) => exerciseFor(w, 'qa', i));
  }

  const chosen = pickItems(pool, 10);
  const queue = chosen.map((w, i) => exerciseFor(w, mode, i));
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
const XP_FOR = { 'qa-recall': 20, 'qa-speak': 20, speak: 15 };

function answered(correct, ex, detail, titleOverride, alreadyGraded, productionOverride) {
  const s = session;
  const production = productionOverride ?? PRODUCTION_TYPES.has(ex.type);
  if (!alreadyGraded && ex.item) grade(ex.item.key, correct, production);
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
