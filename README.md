# Hungarian Lingo 🇭🇺

A Duolingo-style progressive web app with one job: getting you through the
**simplified naturalization interview** (*egyszerűsített honosítás*) in
conversational Hungarian. Not the whole language — just that conversation,
drilled until it's automatic.

No build step, no framework, no backend — plain HTML/CSS/JS in `public/`, all
progress in `localStorage`, all audio from the browser's speech synthesis. It
installs to a phone home screen and works offline.

## What it teaches

6 interview topics · 60 whole-sentence chunks · 41 interviewer
question→answer pairs, each pinned to a line of the mock interview script in
[`docs/interview-script.md`](docs/interview-script.md):

1. **Survival Kit** — "Meg tudná ismételni?", "Kérem, mondja lassabban" — the
   phrases that keep the interview alive when you get lost
2. **About Me** — name, birth, address, citizenship, work
3. **My Family** — spouse, children, parents, siblings
4. **My Hungarian Roots** — the ancestor, the town, the emigration story
5. **My Everyday Life** — routine, hobbies, languages, food
6. **Hungary & Me** — why citizenship, visits, holidays, traditions

Interviewer questions use formal (Ön) register and carry the real phrasing
variants ("Hogy hívják?" / "Mi a neve?"), so you're robust to how a
particular official words things.

## The learning method

Rapid-language-learning techniques live in the mechanics, not a manifesto:

- **Chunking** — nothing is drilled below sentence level; tiles, dictation
  and recall all operate on whole utterances you could actually say
- **Directness (Ultralearning)** — the "My Answers" profile (29 fields)
  fills slots so every drill rehearses *your* sentences: your name, your
  town, your grandmother, your reason for applying. A vowel-harmony engine
  keeps the personalized Hungarian grammatical (1985**-ben**, 2003**-ban**,
  `___ városában` frames for towns)
- **Fading scaffolds** — the question ladder ends in unscaffolded recall:
  hear the question, produce the answer from nothing (double XP). It enters
  rotation once an item has practice behind it
- **Production-gated mastery** — recognition exercises (multiple choice,
  matching, flashcards) can only carry an item to Leitner box 3; boxes 4–5
  require building, typing, or recalling the sentence
- **The transfer task** — Mock Interview mode: all 41 questions, section
  order preserved but shuffled within sections, variant phrasings on, no
  hearts. The headline score counts only unaided recall; the tile fallback
  is there but costs the credit, and results end with a one-tap "drill my
  weak questions" loop
- **Spaced repetition** — Leitner scheduling (1 / 2 / 4 / 8 / 16 / 32 days)
  across all 101 items, surfaced in the Review tab

## Exercise types

| Mode | What it does |
| --- | --- |
| **Lesson** | Chunks and questions, mixed |
| **Chunks** | Flashcards — hear it, say it out loud, self-grade |
| **Listening** | Hear a phrase, pick it out of four |
| **Builder** | Assemble the sentence from word tiles (with distractors) |
| **Dictation** | Hear it, type it — accent key row (á é í ó ö ő ú ü ű) |
| **Matching** | Pair five phrases to their meanings |
| **Q & A** | Understand the official's question, pick and build your answer |
| **Mock Interview** | The real thing, question by question |

## Audio

Playback uses the Web Speech API with a `hu-HU` voice. If the device has no
Hungarian voice installed the app says so up front — install one in the OS
for real listening practice. Speech speed is adjustable (0.8× default;
officials talk faster, train up over time). Two honest limits: the app never
verifies *speech* (recall is typed; saying it aloud first is on you), and
listening quality depends on the device's TTS voice.

## Running it

```bash
npm start          # zero-dependency static server on http://localhost:3000
```

or any static file server: `npx http-server public`.

## Deploying

`public/` is the entire app. On Vercel: import the repo, framework preset
**Other**, output directory **`public`** — the included `vercel.json` handles
service-worker cache headers. GitHub Pages, Netlify, or Cloudflare Pages work
the same way. Serve over HTTPS so the service worker and install prompt are
enabled.

## Extending the curriculum

`public/data.js` holds everything: `PROFILE_FIELDS` (the learner's answers),
and `TOPICS` with `items` (chunks) and `qa` (question→answer pairs tagged
with `script` line numbers). Append new material to the end of a topic —
indexes are part of the saved progress keys. Blanks written `___` fill from
the profile; `___-ban`-style templates get vowel-harmony suffixes for digit
values. Bump `CACHE_VERSION` in `public/sw.js` when shipping changes.

## Files

```
public/index.html         app shell
public/app.js             router, session engine, exercises, SRS, harmony engine
public/data.js            profile fields + curriculum
public/style.css          light + dark themes
public/sw.js              offline cache
public/manifest.json
docs/interview-script.md  the 41-question mock interview (the quality bar)
server.js                 zero-dependency dev server
vercel.json               service-worker cache headers
```
