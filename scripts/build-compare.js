/* Build samples/compare.html — the A/B page for judging Hungarian TTS.
 *
 * Pairs every generated clip against the device's own hu-HU voice, which is
 * what the app ships today. The baseline is the thing to beat; if nothing
 * beats it, the catalogue idea is dead and that is a useful answer.
 *
 *   node scripts/build-compare.js   (run tts-samples.js first)
 */

const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'samples');
const idx = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));

const clipsFor = (sid) => idx.clips.filter((c) => c.sentence === sid);
const voiceNote = (id) => (idx.voices.find((v) => v.id === id) || {}).note || '';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const sections = idx.sentences.map((s) => {
  const rows = clipsFor(s.id).map((c) => `
      <tr>
        <td class="v">${esc(c.voice)}<span class="note">${esc(voiceNote(c.voice))}</span></td>
        <td class="m">${esc(c.model.replace('inworld-tts-', 'v'))}</td>
        <td><audio controls preload="none" src="${esc(c.file)}"></audio></td>
        <td class="rate" data-clip="${esc(c.file)}">
          <button data-score="2" title="Better than device TTS">👍</button>
          <button data-score="1" title="About the same">≈</button>
          <button data-score="0" title="Worse — wrong sounds">👎</button>
        </td>
      </tr>`).join('');
  return `
    <section>
      <h2>${esc(s.hu)}</h2>
      <p class="why">${esc(s.why)}</p>
      <p class="baseline">
        <button class="say" data-text="${esc(s.hu)}">▶ Device voice (baseline)</button>
        <span class="hint">This is what the app plays today. Beat it or the catalogue is not worth building.</span>
      </p>
      <table>
        <thead><tr><th>Voice</th><th>Model</th><th>Clip</th><th>Verdict</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hungarian TTS comparison</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --fg:#181818; --mut:#666; --line:#e4e4e4; --card:#fafafa; --accent:#2d6a4f; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#151515; --fg:#ececec; --mut:#9a9a9a; --line:#2c2c2c; --card:#1d1d1d; --accent:#74c69d; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:1.5rem; max-width:60rem; margin-inline:auto; background:var(--bg); color:var(--fg);
         font:16px/1.5 system-ui, -apple-system, sans-serif; }
  h1 { font-size:1.4rem; margin:0 0 .25rem; }
  .lede { color:var(--mut); margin:0 0 1.5rem; }
  .warn { background:var(--card); border-left:3px solid var(--accent); padding:.75rem 1rem; margin-bottom:1.5rem; border-radius:0 6px 6px 0; }
  section { border:1px solid var(--line); border-radius:8px; padding:1rem; margin-bottom:1.25rem; background:var(--card); }
  h2 { font-size:1.15rem; margin:0 0 .25rem; }
  .why { color:var(--mut); font-size:.9rem; margin:0 0 .75rem; }
  .baseline { margin:0 0 .75rem; display:flex; gap:.75rem; align-items:center; flex-wrap:wrap; }
  .hint { color:var(--mut); font-size:.82rem; }
  button { font:inherit; cursor:pointer; border:1px solid var(--line); background:var(--bg); color:var(--fg);
           border-radius:6px; padding:.4rem .7rem; }
  button.say { border-color:var(--accent); color:var(--accent); font-weight:600; }
  table { width:100%; border-collapse:collapse; }
  td, th { text-align:left; padding:.4rem .5rem; border-top:1px solid var(--line); vertical-align:middle; }
  th { font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); border-top:0; }
  .v { font-weight:600; white-space:nowrap; }
  .note { display:block; font-weight:400; font-size:.75rem; color:var(--mut); }
  .m { color:var(--mut); font-size:.85rem; white-space:nowrap; }
  audio { height:32px; width:100%; max-width:16rem; }
  .rate { white-space:nowrap; }
  .rate button { padding:.25rem .45rem; }
  .rate button.on { background:var(--accent); color:var(--bg); border-color:var(--accent); }
  #summary { position:sticky; bottom:0; background:var(--bg); border-top:1px solid var(--line); padding:.75rem 0; }
  textarea { width:100%; height:7rem; font:13px/1.4 ui-monospace, monospace; background:var(--card);
             color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:.5rem; }
</style></head><body>
<h1>Hungarian TTS comparison</h1>
<p class="lede">${idx.clips.length} clips · ${idx.voices.length} voices · ${idx.models.length} models</p>

<div class="warn">
  <strong>Inworld has no Hungarian voice.</strong> Its catalogue is 282 voices across 15 languages
  (ar, de, en, es, fr, he, hi, it, ja, ko, nl, pl, pt, ru, zh) — Hungarian is not one of them.
  These clips are non-Hungarian voices reading Hungarian text, which is what Inworld means by
  "experimental" support. Judge them against the device baseline, and listen for
  <em>wrong sounds</em> rather than nice tone: long vs short vowels (á/a, é/e, ő/ö, ű/ü),
  first-syllable stress, and <em>s</em>="sh" vs <em>sz</em>="s".
</div>

${sections}

<div id="summary">
  <button id="copy">Copy ratings</button>
  <textarea id="out" readonly placeholder="Rate some clips and they'll collect here."></textarea>
</div>

<script>
  const KEY = 'tts-ratings';
  const ratings = JSON.parse(localStorage.getItem(KEY) || '{}');

  // Device TTS baseline — same path the app uses in app.js.
  const voices = () => speechSynthesis.getVoices();
  let hu = null;
  const pick = () => { hu = voices().find(v => v.lang && v.lang.toLowerCase().startsWith('hu')) || null; };
  pick(); speechSynthesis.addEventListener('voiceschanged', pick);

  document.querySelectorAll('button.say').forEach(b => b.addEventListener('click', () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(b.dataset.text);
    u.lang = 'hu-HU'; u.rate = 0.8;
    if (hu) u.voice = hu; else b.after(Object.assign(document.createElement('span'),
      { className: 'hint', textContent: ' ⚠ no hu-HU voice on this device — baseline is not valid here' }));
    speechSynthesis.speak(u);
  }));

  function render() {
    document.querySelectorAll('.rate').forEach(cell => {
      const score = ratings[cell.dataset.clip];
      cell.querySelectorAll('button').forEach(b =>
        b.classList.toggle('on', String(score) === b.dataset.score));
    });
    const scored = Object.entries(ratings);
    const tally = {};
    for (const [file, s] of scored) {
      const [, voice, model] = file.replace('.mp3', '').split('__');
      const k = voice + ' / ' + model.replace('inworld-tts-', 'v');
      (tally[k] = tally[k] || []).push(Number(s));
    }
    const lines = Object.entries(tally)
      .map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length, v.length])
      .sort((a, b) => b[1] - a[1])
      .map(([k, avg, n]) => k.padEnd(28) + avg.toFixed(2) + '  (n=' + n + ')');
    document.getElementById('out').value =
      scored.length ? 'avg score, 2=better than device / 1=same / 0=worse\\n\\n' + lines.join('\\n') : '';
  }

  document.querySelectorAll('.rate button').forEach(b => b.addEventListener('click', () => {
    const cell = b.closest('.rate');
    if (String(ratings[cell.dataset.clip]) === b.dataset.score) delete ratings[cell.dataset.clip];
    else ratings[cell.dataset.clip] = Number(b.dataset.score);
    localStorage.setItem(KEY, JSON.stringify(ratings));
    render();
  }));

  document.getElementById('copy').addEventListener('click', () => {
    const t = document.getElementById('out'); t.select(); navigator.clipboard.writeText(t.value);
  });

  render();
</script>
</body></html>`;

fs.writeFileSync(path.join(OUT, 'compare.html'), html);
console.log('samples/compare.html written —', idx.clips.length, 'clips');
