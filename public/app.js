/* Hungarian Lingo — a single-page, offline-first vocabulary trainer.
 *
 * No build step and no backend: progress lives in localStorage and audio comes
 * from the browser's own speech synthesis, so the whole thing works on a plane.
 */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const main = $('#main');

// ---------- persistent state ----------

const SAVE_KEY = 'hl_v1';

// Leitner boxes: a word climbs one box per correct answer and slips one per
// miss. Box 5+ counts as mastered for the unit progress bars.
const BOX_DAYS = [0, 1, 2, 4, 8, 16, 32];
const MASTER_BOX = 5;

const defaults = () => ({
  xp: 0,
  streak: { count: 0, last: null },
  progress: {},                       // key -> { box, due, right, wrong }
  settings: { rate: 0.85, autoplay: true, showSay: true, hearts: true },
});

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved) return defaults();
    // Merge onto defaults so a save written by an older version keeps working.
    return { ...defaults(), ...saved, settings: { ...defaults().settings, ...(saved.settings || {}) } };
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

function grade(key, correct) {
  const e = entry(key);
  if (correct) { e.box = Math.min(e.box + 1, BOX_DAYS.length - 1); e.right++; }
  else { e.box = Math.max(e.box - 1, 0); e.wrong++; }
  e.due = Date.now() + BOX_DAYS[e.box] * 86400000;
}

function dueWords() {
  const now = Date.now();
  return WORDS.filter((w) => state.progress[w.key] && state.progress[w.key].due <= now);
}

function seenWords() {
  return WORDS.filter((w) => state.progress[w.key]);
}

function unitStats(unit) {
  let mastered = 0, seen = 0;
  for (const w of unit.words) {
    const e = state.progress[w.key];
    if (!e) continue;
    seen++;
    if (e.box >= MASTER_BOX) mastered++;
  }
  const pct = Math.round(unit.words.reduce((sum, w) => {
    const box = state.progress[w.key]?.box || 0;
    return sum + Math.min(box, MASTER_BOX) / MASTER_BOX;
  }, 0) / unit.words.length * 100);
  return { mastered, seen, pct };
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
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hu-HU';
  if (huVoice) u.voice = huVoice;
  u.rate = state.settings.rate;
  speechSynthesis.speak(u);
}

// A device with no Hungarian voice still speaks, just with an English accent —
// worth saying out loud before someone trains their ear on it.
function voiceWarning() {
  if (!('speechSynthesis' in window)) {
    return '<div class="note">This browser has no speech synthesis, so listening and dictation have no audio. Try Chrome, Edge, or Safari.</div>';
  }
  if (!huVoice) {
    return '<div class="note">No Hungarian voice found on this device, so playback uses your default voice and will sound off. Add a Hungarian text-to-speech voice in your system settings for accurate audio.</div>';
  }
  return '';
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

const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,]/g, '');

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

// ---------- routing ----------

let view = 'learn';
let session = null;

function go(next, opts) {
  view = next;
  session = null;
  render(opts);
}

function render(opts = {}) {
  const inSession = view === 'session';
  $('#back-btn').classList.toggle('hidden', view === 'learn' || view === 'review' || view === 'stats' || view === 'settings');
  $$('#tabbar .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  updateHeader();
  main.scrollTop = 0;

  if (inSession) return renderSession();
  ({
    learn: renderLearn,
    unit: renderUnit,
    review: renderReview,
    stats: renderStats,
    settings: renderSettings,
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
  go(currentUnit && view === 'session' ? 'unit' : 'learn', { unitId: currentUnit?.id });
});

function confirmQuit() {
  return confirm('Leave this session? Progress on answered words is already saved.');
}

// ---------- Learn (unit list) ----------

function renderLearn() {
  $('#topbar-title').textContent = 'Hungarian Lingo';
  const due = dueWords().length;
  main.innerHTML = `<div class="wrap">
    <h2>Szia! 👋</h2>
    <p class="sub">${WORDS.length} core Hungarian words across ${UNITS.length} units. Pick a unit to drill.</p>
    ${due ? `<button class="btn primary" id="quick-review">🔁 Review ${due} word${due === 1 ? '' : 's'} due now</button>` : ''}
    <div class="section-label">Units</div>
    ${UNITS.map((u) => {
      const s = unitStats(u);
      return `<button class="unit-card" data-unit="${u.id}">
        <span class="unit-icon" style="background:${u.color}22">${u.icon}</span>
        <span class="unit-body">
          <span class="unit-title">${esc(u.title)}</span>
          <span class="unit-sub">${esc(u.hu)} · ${u.words.length} words · ${s.mastered} mastered</span>
          <span class="bar"><i style="width:${s.pct}%;background:${u.color}"></i></span>
        </span>
        <span class="unit-pct">${s.pct}%</span>
      </button>`;
    }).join('')}
  </div>`;

  $('#quick-review')?.addEventListener('click', () => startSession(dueWords(), 'mix', 'Review'));
  $$('.unit-card').forEach((c) => c.addEventListener('click', () => go('unit', { unitId: c.dataset.unit })));
}

// ---------- Unit detail ----------

let currentUnit = null;

const MODES = [
  { id: 'mix', icon: '🎯', name: 'Lesson', desc: 'A mix of everything' },
  { id: 'flash', icon: '🃏', name: 'Drill', desc: 'Flashcards, self-graded' },
  { id: 'quiz', icon: '❓', name: 'Quiz', desc: 'Multiple choice, both ways' },
  { id: 'listen', icon: '🎧', name: 'Listening', desc: 'Hear it, pick it' },
  { id: 'match', icon: '🔗', name: 'Matching', desc: 'Pair up 5 at a time' },
  { id: 'dictate', icon: '⌨️', name: 'Dictation', desc: 'Hear it, spell it' },
];

function renderUnit({ unitId } = {}) {
  currentUnit = UNITS.find((u) => u.id === (unitId || currentUnit?.id)) || UNITS[0];
  const u = currentUnit;
  const s = unitStats(u);
  $('#topbar-title').textContent = u.title;

  main.innerHTML = `<div class="wrap">
    <h2>${u.icon} ${esc(u.title)}</h2>
    <p class="sub">${esc(u.hu)} · ${s.mastered}/${u.words.length} mastered</p>
    <div class="bar" style="margin-bottom:18px"><i style="width:${s.pct}%;background:${u.color}"></i></div>
    ${voiceWarning()}
    <div class="mode-grid">
      ${MODES.map((m) => `<button class="mode-btn" data-mode="${m.id}">
        <div class="m-icon">${m.icon}</div>
        <div class="m-name">${m.name}</div>
        <div class="m-desc">${m.desc}</div>
      </button>`).join('')}
    </div>
    <div class="section-label">Word list</div>
    ${u.words.map((w) => wordRow(w)).join('')}
  </div>`;

  $$('.mode-btn').forEach((b) => b.addEventListener('click', () => startSession(u.words, b.dataset.mode, u.title)));
  bindWordRows();
}

function wordRow(w) {
  const box = state.progress[w.key]?.box || 0;
  return `<div class="word-row">
    <button class="speak-mini" data-say="${esc(w.hu)}" aria-label="Play ${esc(w.hu)}">🔊</button>
    <div>
      <div class="w-hu">${esc(w.hu)}</div>
      <div class="w-en">${esc(w.en)}${state.settings.showSay ? ` · ${esc(w.say)}` : ''}</div>
    </div>
    <div class="w-box">${pips(box)}</div>
  </div>`;
}

function bindWordRows() {
  $$('.speak-mini').forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
}

// ---------- Review ----------

function renderReview() {
  $('#topbar-title').textContent = 'Review';
  const due = dueWords();
  const seen = seenWords();
  const sorted = [...seen].sort((a, b) => (state.progress[a.key].due) - (state.progress[b.key].due));

  main.innerHTML = `<div class="wrap">
    <h2>Spaced review</h2>
    <p class="sub">Words come back on a widening schedule: 1, 2, 4, 8, 16, then 32 days after each correct answer.</p>
    ${due.length
      ? `<button class="btn primary" id="start-review">Review ${due.length} due word${due.length === 1 ? '' : 's'}</button>
         <button class="btn ghost" id="review-listen">🎧 Listening review</button>
         <button class="btn ghost" id="review-dictate">⌨️ Dictation review</button>`
      : seen.length
        ? `<div class="card">Nothing due right now — nice. Come back later, or start a new unit.</div>`
        : `<div class="card">No words practiced yet. Start a unit on the Learn tab and they'll show up here.</div>`}
    ${seen.length ? `<div class="section-label">Your words (${seen.length})</div>${sorted.map(wordRow).join('')}` : ''}
  </div>`;

  $('#start-review')?.addEventListener('click', () => startSession(dueWords(), 'mix', 'Review'));
  $('#review-listen')?.addEventListener('click', () => startSession(dueWords(), 'listen', 'Review'));
  $('#review-dictate')?.addEventListener('click', () => startSession(dueWords(), 'dictate', 'Review'));
  bindWordRows();
}

// ---------- Stats ----------

function renderStats() {
  $('#topbar-title').textContent = 'Progress';
  const seen = seenWords();
  const mastered = seen.filter((w) => state.progress[w.key].box >= MASTER_BOX).length;
  const right = seen.reduce((n, w) => n + state.progress[w.key].right, 0);
  const wrong = seen.reduce((n, w) => n + state.progress[w.key].wrong, 0);
  const acc = right + wrong ? Math.round(right / (right + wrong) * 100) : 0;

  main.innerHTML = `<div class="wrap">
    <div class="stat-grid">
      <div class="stat-box"><b>${state.xp}</b><span>XP</span></div>
      <div class="stat-box"><b>${state.streak.count}</b><span>day streak</span></div>
      <div class="stat-box"><b>${acc}%</b><span>accuracy</span></div>
      <div class="stat-box"><b>${seen.length}</b><span>words seen</span></div>
      <div class="stat-box"><b>${mastered}</b><span>mastered</span></div>
      <div class="stat-box"><b>${right + wrong}</b><span>answers</span></div>
    </div>
    <div class="section-label">By unit</div>
    ${UNITS.map((u) => {
      const s = unitStats(u);
      return `<div class="card" style="padding:12px 14px">
        <div class="row" style="padding:0;border:none">
          <div><b>${u.icon} ${esc(u.title)}</b><div class="hint">${s.mastered}/${u.words.length} mastered</div></div>
          <div class="unit-pct">${s.pct}%</div>
        </div>
        <div class="bar"><i style="width:${s.pct}%;background:${u.color}"></i></div>
      </div>`;
    }).join('')}
  </div>`;
}

// ---------- Settings ----------

function renderSettings() {
  $('#topbar-title').textContent = 'Settings';
  const st = state.settings;
  main.innerHTML = `<div class="wrap">
    ${voiceWarning()}
    <div class="card">
      <div class="row">
        <div><label for="rate">Speech speed</label><div class="hint">Slower helps with long vowels</div></div>
        <input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${st.rate}">
      </div>
      <div class="row">
        <div><label for="autoplay">Autoplay audio</label><div class="hint">Speak the word when a listening question appears</div></div>
        <input type="checkbox" id="autoplay" ${st.autoplay ? 'checked' : ''}>
      </div>
      <div class="row">
        <div><label for="showSay">Pronunciation hints</label><div class="hint">Show the English respelling</div></div>
        <input type="checkbox" id="showSay" ${st.showSay ? 'checked' : ''}>
      </div>
      <div class="row">
        <div><label for="hearts">Hearts</label><div class="hint">End a session after 5 mistakes</div></div>
        <input type="checkbox" id="hearts" ${st.hearts ? 'checked' : ''}>
      </div>
    </div>
    <button class="btn ghost" id="test-voice">🔊 Test the Hungarian voice</button>
    <button class="btn ghost" id="reset" style="color:var(--accent)">Reset all progress</button>
    <p class="sub" style="margin-top:18px">Everything is stored on this device only. Installing the app (Add to Home Screen) keeps it working offline.</p>
  </div>`;

  $('#rate').addEventListener('input', (e) => { st.rate = Number(e.target.value); save(); });
  $('#rate').addEventListener('change', () => speak('Jó napot kívánok'));
  ['autoplay', 'showSay', 'hearts'].forEach((id) => {
    $(`#${id}`).addEventListener('change', (e) => { st[id] = e.target.checked; save(); });
  });
  $('#test-voice').addEventListener('click', () => speak('Szia! Beszélsz magyarul?'));
  $('#reset').addEventListener('click', () => {
    if (!confirm('Delete all XP, streak, and word progress on this device?')) return;
    state = defaults();
    save();
    go('learn');
    toast('Progress reset');
  });
}

// ---------- session building ----------

// Weakest first: words that are due, then never-seen, then whatever has the
// lowest box. Ties are shuffled so a session never repeats in the same order.
function pickWords(pool, n) {
  const now = Date.now();
  const scored = shuffle(pool).map((w) => {
    const e = state.progress[w.key];
    let score;
    if (!e) score = 1;                        // new words first after overdue ones
    else if (e.due <= now) score = 0;
    else score = 2 + e.box;
    return { w, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, n).map((s) => s.w);
}

function distractors(word, pool, field, n) {
  const others = shuffle(WORDS.filter((w) => w.key !== word.key && w[field] !== word[field]));
  // Same-unit distractors are harder and more useful; top up from anywhere.
  const sameUnit = others.filter((w) => w.unit === word.unit);
  return [...sameUnit, ...others.filter((w) => w.unit !== word.unit)].slice(0, n);
}

function makeExercise(type, word, pool) {
  if (type === 'choice-hu-en' || type === 'choice-en-hu' || type === 'listen') {
    const field = type === 'choice-hu-en' ? 'en' : 'hu';
    const options = shuffle([word, ...distractors(word, pool, field, 3)]);
    return { type, word, field, options };
  }
  return { type, word };
}

const MIX_TYPES = ['choice-hu-en', 'choice-en-hu', 'listen', 'dictate'];

function buildQueue(pool, mode) {
  if (mode === 'match') {
    // Matching works in rounds of five pairs, not one word at a time.
    const words = pickWords(pool, Math.min(15, pool.length));
    const rounds = [];
    for (let i = 0; i < words.length; i += 5) {
      const chunk = words.slice(i, i + 5);
      if (chunk.length >= 2) rounds.push({ type: 'match', words: chunk });
    }
    return rounds;
  }

  const words = pickWords(pool, Math.min(10, pool.length));
  if (mode === 'flash') return words.map((w) => ({ type: 'flash', word: w }));
  if (mode === 'quiz') {
    return shuffle(words.map((w, i) =>
      makeExercise(i % 2 ? 'choice-en-hu' : 'choice-hu-en', w, pool)));
  }
  if (mode === 'listen' || mode === 'dictate') {
    const type = mode === 'listen' ? 'listen' : 'dictate';
    return words.map((w) => makeExercise(type, w, pool));
  }
  // mix: rotate the four single-word types, then finish with a matching round.
  const queue = words.map((w, i) => makeExercise(MIX_TYPES[i % MIX_TYPES.length], w, pool));
  if (words.length >= 3) queue.push({ type: 'match', words: shuffle(words).slice(0, 5) });
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

// ---------- session rendering ----------

function renderSession() {
  const s = session;
  const ex = s.queue[s.idx];
  if (!ex) return finishSession();

  $('#topbar-title').textContent = s.label;
  $('#back-btn').classList.remove('hidden');

  const pct = Math.round(s.idx / s.total * 100);
  const head = `<div id="session-head">
    <div class="bar"><i style="width:${Math.min(pct, 100)}%"></i></div>
    ${state.settings.hearts ? `<div class="hearts">${'❤️'.repeat(s.hearts)}${'🖤'.repeat(Math.max(0, 5 - s.hearts))}</div>` : ''}
  </div>`;

  main.innerHTML = `<div class="wrap">${head}<div id="ex"></div></div>`;
  ({
    'choice-hu-en': renderChoice,
    'choice-en-hu': renderChoice,
    listen: renderListen,
    dictate: renderDictate,
    match: renderMatch,
    flash: renderFlash,
  })[ex.type](ex);
}

function exBox() { return $('#ex'); }

function renderChoice(ex) {
  const askHu = ex.type === 'choice-hu-en';
  const w = ex.word;
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">${askHu ? 'What does this mean?' : 'How do you say this?'}</div>
      <div class="prompt-word">${esc(askHu ? w.hu : w.en)}</div>
      ${askHu && state.settings.showSay ? `<div class="prompt-say">${esc(w.say)}</div>` : ''}
      ${askHu ? `<button class="speak-btn" id="say">🔊 Play</button>` : ''}
    </div>
    <div class="options">
      ${ex.options.map((o) => `<button class="opt" data-key="${o.key}">${esc(askHu ? o.en : o.hu)}</button>`).join('')}
    </div>`;

  $('#say')?.addEventListener('click', () => speak(w.hu));
  $$('.opt').forEach((btn) => btn.addEventListener('click', () => {
    const correct = btn.dataset.key === w.key;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key === w.key) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    if (askHu || correct) speak(w.hu);
    answered(correct, ex, correct ? '' : `${w.hu} — ${w.en}`);
  }));
}

function renderListen(ex) {
  const w = ex.word;
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">Which word do you hear?</div>
      <button class="speak-btn speak-big" id="say" aria-label="Play audio">🔊</button>
    </div>
    <div class="options">
      ${ex.options.map((o) => `<button class="opt" data-key="${o.key}">${esc(o.hu)}</button>`).join('')}
    </div>`;

  $('#say').addEventListener('click', () => speak(w.hu));
  if (state.settings.autoplay) setTimeout(() => speak(w.hu), 250);

  $$('.opt').forEach((btn) => btn.addEventListener('click', () => {
    const correct = btn.dataset.key === w.key;
    $$('.opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.key === w.key) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    answered(correct, ex, `${w.hu} — ${w.en}`);
  }));
}

const ACCENTS = ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű'];

function renderDictate(ex) {
  const w = ex.word;
  exBox().innerHTML = `
    <div class="prompt-card">
      <div class="prompt-kind">Type what you hear</div>
      <button class="speak-btn speak-big" id="say" aria-label="Play audio">🔊</button>
      <div class="prompt-say">${esc(w.en)}</div>
    </div>
    <input class="type-input" id="typed" autocapitalize="off" autocomplete="off" autocorrect="off"
           spellcheck="false" placeholder="magyarul…">
    <div class="accent-row">${ACCENTS.map((a) => `<button class="accent-key" data-a="${a}">${a}</button>`).join('')}</div>
    <button class="btn primary" id="check">Check</button>`;

  const input = $('#typed');
  input.focus();
  $('#say').addEventListener('click', () => speak(w.hu));
  if (state.settings.autoplay) setTimeout(() => speak(w.hu), 250);

  $$('.accent-key').forEach((k) => k.addEventListener('click', () => {
    // Insert at the caret so accents can be fixed mid-word, not just appended.
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + k.dataset.a + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.focus();
  }));

  const submit = () => {
    const typed = normalize(input.value);
    if (!typed) { input.focus(); return; }
    const target = normalize(w.hu);
    const exact = typed === target;
    // Accent-blind matches count, because a phone keyboard often can't produce
    // ő or ű — but say so, since vowel length changes meaning in Hungarian.
    const close = !exact && stripAccents(typed) === stripAccents(target);
    input.disabled = true;
    $('#check').disabled = true;
    speak(w.hu);
    answered(exact || close, ex,
      exact ? '' : close ? `Watch the accents: <b>${esc(w.hu)}</b>` : `${w.hu} — ${w.en}`,
      close ? 'Almost!' : null);
  };

  $('#check').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

function renderMatch(ex) {
  const left = shuffle(ex.words);
  const right = shuffle(ex.words);
  let picked = null;
  let solved = 0;
  let missed = false;

  exBox().innerHTML = `
    <div class="prompt-card" style="padding:16px">
      <div class="prompt-kind">Tap the pairs</div>
    </div>
    <div class="match-grid">
      <div id="col-hu">${left.map((w) => `<button class="match-tile" data-key="${w.key}" data-side="hu">${esc(w.hu)}</button>`).join('')}</div>
      <div id="col-en">${right.map((w) => `<button class="match-tile" data-key="${w.key}" data-side="en">${esc(w.en)}</button>`).join('')}</div>
    </div>`;

  $$('.match-tile').forEach((tile) => tile.addEventListener('click', () => {
    if (tile.dataset.side === 'hu') speak(BY_KEY[tile.dataset.key].hu);
    if (!picked) { picked = tile; tile.classList.add('picked'); return; }
    if (picked === tile) { picked.classList.remove('picked'); picked = null; return; }
    if (picked.dataset.side === tile.dataset.side) {
      picked.classList.remove('picked');
      picked = tile;
      tile.classList.add('picked');
      return;
    }
    if (picked.dataset.key === tile.dataset.key) {
      grade(tile.dataset.key, true);
      picked.classList.add('done');
      tile.classList.add('done');
      picked.classList.remove('picked');
      picked = null;
      solved++;
      if (solved === ex.words.length) {
        save();
        answered(!missed, ex, missed ? 'All matched, with a few misses.' : '', 'All matched!', true);
      }
    } else {
      grade(tile.dataset.key, false);
      grade(picked.dataset.key, false);
      missed = true;
      const a = picked;
      a.classList.add('miss');
      tile.classList.add('miss');
      setTimeout(() => { a.classList.remove('miss', 'picked'); tile.classList.remove('miss'); }, 320);
      picked = null;
    }
  }));
}

function renderFlash(ex) {
  const w = ex.word;
  exBox().innerHTML = `
    <button class="flash-card" id="card">
      <div class="prompt-word">${esc(w.hu)}</div>
      ${state.settings.showSay ? `<div class="prompt-say">${esc(w.say)}</div>` : ''}
      <div class="flash-hint" id="hint">Tap to reveal</div>
    </button>
    <div id="flash-actions" style="margin-top:14px"></div>`;

  speak(w.hu);
  $('#card').addEventListener('click', reveal, { once: true });

  function reveal() {
    $('#hint').innerHTML = `<b style="font-size:22px;color:var(--ink)">${esc(w.en)}</b>`;
    $('#flash-actions').innerHTML = `
      <button class="btn" id="miss">😕 Still learning</button>
      <button class="btn green" id="got">😃 I knew it</button>`;
    $('#got').addEventListener('click', () => answered(true, ex, '', 'Nice'));
    $('#miss').addEventListener('click', () => answered(false, ex, `${w.hu} — ${w.en}`, 'Keep at it'));
  }
}

// ---------- answering / feedback ----------

function answered(correct, ex, detail, titleOverride, alreadyGraded) {
  const s = session;
  if (!alreadyGraded && ex.word) grade(ex.word.key, correct);
  if (correct) { s.right++; s.xp += 10; } else { s.wrong++; if (state.settings.hearts) s.hearts--; }
  save();

  // Missed items come back once at the end of the session.
  if (!correct && !ex.repeat && ex.type !== 'match') s.queue.push({ ...ex, repeat: true });

  const outOfHearts = state.settings.hearts && s.hearts <= 0;
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

const PRAISE = ['Szuper!', 'Nice!', 'Ez az!', 'Correct', 'Remek!', 'Jól van!'];
const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

// ---------- results ----------

let lastResult = null;

function finishSession() {
  const s = session;
  const answers = s.right + s.wrong;
  const bonus = s.outOfHearts || !answers ? 0 : 15;
  state.xp += s.xp + bonus;
  if (answers) touchStreak();
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

  main.innerHTML = `<div class="wrap">
    <div class="result-hero">
      <div class="big">${r.outOfHearts ? '💔' : acc >= 90 ? '🏆' : acc >= 60 ? '🎉' : '💪'}</div>
      <h2>${r.outOfHearts ? 'Out of hearts' : acc >= 90 ? 'Kiváló! (Excellent)' : 'Session complete'}</h2>
      <p class="sub">${esc(r.label)} · ${MODES.find((m) => m.id === r.mode)?.name || 'Practice'}</p>
    </div>
    <div class="stat-grid">
      <div class="stat-box"><b>${r.xp + r.bonus}</b><span>XP earned</span></div>
      <div class="stat-box"><b>${acc}%</b><span>accuracy</span></div>
      <div class="stat-box"><b>${state.streak.count}</b><span>day streak</span></div>
    </div>
    <button class="btn primary" id="again">Practice again</button>
    <button class="btn ghost" id="home">Back to units</button>
  </div>`;

  $('#again').addEventListener('click', () => {
    const pool = r.label === 'Review' ? (dueWords().length > 1 ? dueWords() : seenWords()) : currentUnit.words;
    startSession(pool, r.mode, r.label);
  });
  $('#home').addEventListener('click', () => go('learn'));
}

// ---------- boot ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
