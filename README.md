# Hungarian Lingo 🇭🇺

A Duolingo-style progressive web app for one job: building **Hungarian vocabulary**.
120 core words across 10 units, practiced six different ways, with spaced
repetition tracking every word.

No build step, no framework, no backend — plain HTML/CSS/JS in `public/`, all
progress in `localStorage`, all audio from the browser's speech synthesis. It
installs to a phone home screen and works offline.

## Practice modes

| Mode | What it does |
| --- | --- |
| **Lesson** | Mixed session: meaning both directions, listening, dictation, then a matching round |
| **Drill** | Self-graded flashcards — tap to reveal, "I knew it" / "still learning" |
| **Quiz** | Multiple choice, Hungarian→English and English→Hungarian |
| **Listening** | Hear a word, pick it out of four |
| **Matching** | Pair five Hungarian words to their meanings |
| **Dictation** | Hear a word, type it — with an accent key row (á é í ó ö ő ú ü ű) |

Distractors are drawn from the same unit first, so the wrong answers are
plausible rather than free points.

## How progress works

Each word sits in a Leitner box. A correct answer moves it up a box, a miss
moves it down, and the box sets when the word comes back: **now, 1, 2, 4, 8, 16,
32 days**. Box 5 counts as mastered and fills the unit's progress bar. The
Review tab collects everything that has come due across all units.

Missed words are re-queued once at the end of the session. Sessions run on five
hearts (switchable off in Settings), award 10 XP per correct answer plus a
completion bonus, and bump the day streak.

Dictation accepts an accent-blind answer as correct but says so — vowel length
is meaningful in Hungarian (`kerek` "round" vs `kérek` "I ask for"), so the app
grades gently but never silently.

## Audio

Playback uses the Web Speech API with a `hu-HU` voice. If the device has no
Hungarian voice installed the app says so up front and falls back to the default
voice, which will sound wrong — install a Hungarian TTS voice in the OS for real
listening practice. Speech speed is adjustable in Settings (0.85× default,
because Hungarian long vowels get swallowed at full speed).

## Running it

```bash
npm start          # zero-dependency static server on http://localhost:3000
```

Anything that serves static files works just as well:

```bash
npx http-server public
```

## Deploying

`public/` is the entire app. On Vercel, import the repo and set the output
directory to `public` (the included `vercel.json` handles service-worker cache
headers). GitHub Pages, Netlify, Cloudflare Pages, or an S3 bucket all work the
same way. Serve over HTTPS so the service worker and install prompt are enabled.

## Adding vocabulary

`public/data.js` holds everything. A unit is:

```js
{
  id: 'food',                    // stable — progress keys are `${id}:${index}`
  title: 'Food & Drink',
  hu: 'Étel és ital',
  icon: '🍞',
  color: '#c9a227',
  words: [
    { hu: 'kenyér', en: 'bread', say: 'KEN-yayr' },
  ],
}
```

`say` is a rough English respelling. Hungarian stress is always on the first
syllable, so the respellings mark it in caps and use `ur` for ö/ő and `EU`/`ue`
for ü/ű.

Append words to the end of a unit rather than reordering them — indexes are part
of the saved progress key. Bump `CACHE_VERSION` in `public/sw.js` when shipping
changes so installed copies pick them up.

## Files

```
public/index.html   app shell
public/app.js       router, session engine, exercise renderers, SRS
public/data.js      the vocabulary
public/style.css    light + dark theme
public/sw.js        offline cache
public/manifest.json
server.js           local dev server
```
