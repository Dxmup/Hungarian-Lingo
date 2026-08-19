# Hungarian Lingo 🇭🇺

A Duolingo-style progressive web app with one job: getting you through the
**simplified naturalization interview** (*egyszerűsített honosítás*) in
conversational Hungarian. Not the whole language — just that conversation,
drilled until it's automatic.

No framework, no backend — plain HTML/CSS/JS in `public/`, all progress in
`localStorage`. The interviewer's questions play from pre-generated Hungarian
audio; everything personalized falls back to the browser's speech synthesis. It
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
- **Directness (Ultralearning)** — the "My Answers" profile fills slots so
  every drill rehearses *your* sentences: your name, your town, your
  grandmother, your reason for applying. The questions are asked **in
  English** and the Hungarian is composed from vetted options, because a
  beginner cannot write the sentences the app needs before learning them. A
  vowel-harmony engine keeps the result grammatical (1985**-ben**,
  2003**-ban**, `___ városában` frames for towns)
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

Two sources, and the split is deliberate.

**Anything with fixed Hungarian plays from recorded audio** — every interviewer
question and phrasing variant, every chunk, and the model answers that are not
personalized. 111 such utterances, of which 104 are recorded and shipped in
`public/audio/` as Opus (0.93 MB, ~8.8 KB each). Every clip was checked by
transcribing it back with a Hungarian speech recogniser and keeping only the
ones that came back intact; the catalogue's mean word error rate is 6.4%,
against 13.9% for that same recogniser on recordings of native speakers.

The 7 without audio are the shortest fragments — bare years, `a lakcímem`, two-word
questions like `Ön nős?`. Too short to read as speech, the TTS model answers them
instead of speaking them and returns nothing. They fall back to the device voice.

**Anything with a `___` slot uses the Web Speech API** with a `hu-HU` voice —
13 chunks and 32 model answers, assembled from your profile at runtime. Your
town, your grandmother, your year cannot be pre-rendered, so they keep the
device voice. That the gap falls almost entirely on the answer side is
convenient rather than accidental: you *produce* your answers and only ever
*listen* to the questions.

Clips are cached on first play rather than downloaded up front, so the app
stays light on a phone and each question is offline once heard. Speech speed is
adjustable (0.8× default; officials talk faster, train up over time) and
applies to both paths, holding pitch so a slowed voice keeps its vowels.

Three honest limits: the app never verifies *speech* (recall is typed; saying
it aloud first is on you), the personalized half still depends on the device's
own TTS voice, and the recorded questions are synthetic — good enough to fool a
recogniser, not yet signed off by a native speaker.

## Running it

```bash
npm start          # static server on http://localhost:3000, node builtins only
```

or any static file server: `npx http-server public`.

## Deploying

`public/` is the entire app. On Vercel: import the repo, framework preset
**Other**, output directory **`public`** — the included `vercel.json` handles
service-worker cache headers. GitHub Pages, Netlify, or Cloudflare Pages work
the same way. Serve over HTTPS so the service worker and install prompt are
enabled.

## Extending the curriculum

`public/data.js` holds the curriculum: `PROFILE_FIELDS` (the slots a
sentence can fill) and `TOPICS` with `items` (chunks) and `qa`
(question→answer pairs tagged with `script` line numbers). Append new
material to the end of a topic — indexes are part of the saved progress
keys. Blanks written `___` fill from the profile; `___-ban`-style templates
get vowel-harmony suffixes for digit values.

`public/profile.js` holds the intake: the English questions, the vetted
Hungarian each option produces, and `composeProfile()`. To add an answer
option, add it to that field's `options` with an `en` and a `hu` — every
`hu` string in the file is a sentence a learner will say to an official, so
it belongs in the native-speaker review before it ships. Bump
`CACHE_VERSION` in `public/sw.js` when shipping changes.

## Files

```
public/index.html         app shell
public/app.js             router, session engine, exercises, SRS
public/data.js            curriculum + the slots it can fill
public/harmony.js         vowel harmony, suffixes, Hungarian number words
public/profile.js         English intake questions → composed Hungarian
public/style.css          light + dark themes
public/sw.js              offline cache
public/manifest.json
public/audio/             generated question audio + manifest.json
docs/interview-script.md  the 41-question mock interview (the quality bar)
docs/roadmap.md           parked work, and why some ideas were rejected
scripts/                  build-time only — audio generation and evaluation
server.js                 dev server
vercel.json               service-worker cache headers
```

## Regenerating the audio

Build-time only; the shipped app has no dependencies. Needs `.env.local` with
`GEMINI_API_KEY` and `DEEPGRAM_API_KEY`.

```bash
node scripts/build-audio.js     # generate, verify, retry — skips what exists
node scripts/encode-audio.js    # WAV -> Opus, verifying nothing degraded
```

Clip filenames are a SHA-1 of the Hungarian text, so editing a question
produces a new file and stale audio can never silently attach to changed text.
Delete a clip and rerun to replace it; `--force` regenerates everything.

The generator paces itself at 5 requests a minute (`--rpm`) and skips any clip
that already has a `.wav` or `.opus`, so an interrupted build resumes for free.
The free TTS tier also has a **daily** cap, and the whole catalogue does not fit
inside one day's allowance — expect to run this across two or three sessions.
When the daily cap is what you have hit, the run stops and says so rather than
sleeping on the API's retry hint, which points at midnight Pacific.

`scripts/roundtrip.js`, `asr-baseline.js` and `score-clips.js` are the
evaluation harness — they measure a voice by transcribing it back and scoring
word error rate against the source text. `asr-baseline.js` calibrates that
number against native speech so the others mean something.
