# Hungarian Lingo 🇭🇺

A Duolingo-style progressive web app with one job: getting you through the
**simplified naturalization interview** (*egyszerűsített honosítás*) in
conversational Hungarian. Not the whole language — just that conversation,
drilled until it's automatic.

No build step, no framework, no backend — plain HTML/CSS/JS in `public/`, all
progress in `localStorage`, all audio from the browser's speech synthesis and
all speech scoring from its recognizer. It installs to a phone home screen and
works offline.

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
  require building, typing, recalling, or *saying* the sentence
- **Speech that gets checked** — the microphone drills score what you actually
  said against the sentence you meant to say, so the one skill the interview
  really tests stops running on the honour system
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
| **Speaking** | Say the phrase or answer out loud — scored word by word |
| **Sounds** | Pronunciation drills: hear a contrast, say a contrast, say it in a sentence |
| **Mock Interview** | The real thing, question by question |

## Audio

Playback uses the Web Speech API with a `hu-HU` voice. If the device has no
Hungarian voice installed the app says so up front — install one in the OS
for real listening practice. Speech speed is adjustable (0.8× default;
officials talk faster, train up over time). Listening quality depends on the
device's TTS voice.

## Sounds — the phonetics section

Twenty sounds English speakers get wrong, reachable from the Learn tab: the
consonants English lacks (gy, ty, ny, s/sz, zs, cs, c, tapped r, clear l,
unaspirated p/t/k), the vowels it merges (a/á, e/é, ö/ő, ü/ű), and the two
habits that mark an accent even when every segment is right — consonant length
and first-syllable stress. Each sound names the English habit that misfires,
gives one physical instruction, and drills on words from the interview
curriculum, so phonetics practice reinforces the material rather than adding a
separate word list.

Three drills per sound:

- **Ear training** — hear one member of a contrast pair, pick which it was.
  Recognition, so it caps at Leitner box 3 like the other recognition drills.
- **The contrast test** — say one member of a pair; the transcript is scored
  against *both* words and the verdict is which one came out. Saying `hagy`
  when asked for `had` is not a near miss, it is the exact error the sound
  exists to fix, and the feedback says so.
- **In context** — say the sound inside a sentence, where it has to survive
  running speech.

The contrast test uses a stricter comparison than the sentence scorer above:
full cost for every difference, accents included. The sentence scorer forgives
an accent on purpose, which is right for "would an official have understood
that?" and useless for `kor` vs `kór`, where the accent *is* the whole word.
It also judges both candidates against a single transcript — the recognizer's
own best guess — because scoring each word against whichever of the five
alternatives flatters it answers a question the recognizer has already said
yes to.

Pairs carry flags for what they may be used for. Homophones (`folyt`/`fojt`,
which exist to prove `ly` = `j`) are display-only: no ear and no recognizer can
separate them, so no drill is built on one. Near pairs are fair for the ear but
not for the contrast test, whose logic assumes genuine confusability.

Sounds ride the same Leitner schedule as everything else and show up in the
Review tab. A sound is drilled repeatedly within one session but moves at most
one box per session, the same as any other item.

## Speaking and how it is scored

Speaking drills use the same Web Speech API in the other direction:
`SpeechRecognition` with `lang="hu-HU"` transcribes what you say, and
`public/speech.js` scores that transcript against the sentence you were
supposed to produce.

The score is a similarity, not a pass/fail string match:

- digits are spelled out on both sides first, so a correctly spoken
  "ezerkilencszáznyolcvanötben" matches a curriculum written `1985-ben`
- word-level edit distance drives the score and the word-by-word colouring;
  an accent-only difference costs a quarter of a wrong word, because vowel
  length matters in Hungarian but recognizers are unreliable about it
- a character-level pass runs alongside it, so a compound the recognizer
  split in two ("nyugdí jas") is not punished as two wrong words
- all five recognizer alternatives are scored and the best one wins — you
  should not lose the point to the recognizer's spelling preference

**85%+** counts as understood and earns full production credit toward Leitner
boxes 4–5. **60–84%** counts correct but not as production — an official would
have got there, with effort. Below that it is a miss. Every attempt can be
retried before it is graded, and the best attempt is the one that counts.

In the mock interview, any question at box 2 or higher offers **🎤 Answer out
loud instead**, which scores the spoken answer for the same unaided credit as
typing it from memory.

Honest limits: recognition reports *words, not phonemes*, so this checks that
a Hungarian listener would have understood your sentence — it is not a
pronunciation coach and cannot grade your accent. Chrome and Edge transcribe
server-side, so the speaking drills need a network connection even though the
rest of the app works offline. Firefox has no recognizer at all; there the
speaking mode is hidden and the rest of the app is unchanged.

## Running it

```bash
npm start          # zero-dependency static server on http://localhost:3000
```

or any static file server: `npx http-server public`.

## Deploying

`public/` is the entire app. On Vercel: import the repo, framework preset
**Other**, output directory **`public`** — the included `vercel.json` handles
service-worker cache headers. GitHub Pages, Netlify, or Cloudflare Pages work
the same way. Serve over HTTPS so the service worker, the install prompt,
and microphone access are enabled.

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
public/speech.js          microphone capture + spoken-answer scoring
public/data.js            profile fields + curriculum
public/style.css          light + dark themes
public/sw.js              offline cache
public/manifest.json
docs/interview-script.md  the 41-question mock interview (the quality bar)
server.js                 zero-dependency dev server
vercel.json               service-worker cache headers
```
