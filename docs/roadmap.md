# Roadmap — future versions

## ⏭ Unfinished — pick this up next session

**Finish the audio catalogue: 63 clips outstanding, 48 of 111 done.** The
free-tier Gemini TTS daily quota ran out on 2026-08-18 and was still exhausted
when the scope widened from questions to the whole curriculum. Nothing is
broken and no code change is needed — the generator skips files that already
exist, so once the quota resets:

```bash
node scripts/build-audio.js     # picks up only what is missing
node scripts/encode-audio.js    # folds them into the Opus catalogue + manifest
```

Outstanding: 49 chunks, 9 model answers, and the 5 questions and variants that
the first run never reached (`Hol dolgozik?`, `Hány éves?`, `Ön nős?`,
`Férjnél van?`, `Hogyan ünnepelnek?`). All fall back to device TTS meanwhile,
which works — it is just not the good audio, and the mismatch is audible when
a session mixes the two.

Expect roughly 0.82 MB for the finished catalogue, up from 464 KB.

**45 utterances cannot be pre-rendered for everyone** — 13 chunks and 32 model
answers carry `___` slots filled from the learner's profile at runtime, so the
audio depends on their town, their year, their grandmother. In the shipped app
those keep the device voice. The gap falls almost entirely on the answer side,
which the learner produces rather than listens to — except in Listening mode,
where 13 chunks genuinely are meant to be heard.

## Personalized audio, generated locally

Once a learner has filled in their profile, their 45 slotted utterances become
fixed strings and *can* be rendered — for them, on their machine. Worth doing:
it closes the Listening-mode gap and makes every drill their own sentences in a
real voice.

**Design.** `fill()` and the harmony engine (`SUFFIX_PAIRS`, `withSuffix`,
`harmony`) live in `public/app.js` and read `state.profile` directly. Extract
them to `public/harmony.js`, loaded by `index.html` ahead of `app.js` and read
by the scripts through the same sandbox trick already used for `data.js`, with
the profile passed in rather than reached for. One implementation, no drift —
duplicating the harmony rules into the build scripts would eventually produce
audio that disagrees with the on-screen text, which is the worst possible bug
here because the learner would trust the voice.

Profile values come from a gitignored `profile.local.json`; output goes to
`public/audio/me/`, also gitignored.

**Two things to decide before running it, not after:**

- **It sends personal data to Google.** Today nothing about the learner leaves
  their device — that is the app's strongest privacy claim and the reason the
  on-device architecture was chosen. Generating this audio means transmitting
  their name, address, birth year and family details to a TTS API. Defensible
  for one person deciding for themselves; not something to switch on for anyone
  else by default.
- **These clips can never be committed.** This repo is public and the filenames
  are opaque hashes, so a routine `git add -A` would publish a recording of
  someone's family details with nothing in the diff to catch the eye. Hence the
  separate directory and the `.gitignore` rules — the guard exists before the
  capability does, deliberately.

**Editing the profile invalidates clips.** Content-addressed naming handles it
correctly — new text, new hash, so stale audio can never attach to a changed
answer — but the orphans accumulate. A prune step should drop any file in
`public/audio/me/` that the current profile no longer maps to.

**Then, before this goes anywhere near another learner:**

- **Listen to `b780c1fee8.opus`** (`Mit szeret Magyarországban?`). It came back
  as `Magyarországdan?` after four attempts — the only clip that never scored
  clean. Could be the voice or could be the recogniser mishearing `b` as `d`;
  only an ear can say.
- **Spot-check five or six clips at random.** A low word error rate means a
  machine recognises it, not that a Hungarian speaker would call it natural.
  The catalogue has never been heard by a native speaker.
- **Rotate the API keys** pasted into the working session on 2026-08-18:
  Inworld, Deepgram, Gemini.


Parked ideas, with the research behind them, so none of it has to be
rediscovered. Nothing here is committed to; the current app stays a
single-learner, on-device PWA.

## Public release

The goal that motivates most of the rest: make this available to others
pursuing simplified naturalization (*egyszerűsített honosítás*), where the
conversational screening is the hardest part for most applicants.

**Architecture: stay on-device even when public.** Users enter family names,
addresses, ancestor details, and their reasons for seeking citizenship, then
record themselves saying it. An app that transmits none of that has no breach
to suffer, no GDPR controller obligations, and no per-user cost — and for an
immigrant audience, "your answers never leave your phone" is a reason to
install rather than a footnote. No accounts, no server-stored answers.

The curriculum is already built for this: `PROFILE_FIELDS` plus `___` slots and
the vowel-harmony engine mean every install personalizes to its own learner.
There is no multi-tenancy to add because nothing is shared.

**Prerequisites, none of them code:**

- **Native-speaker review of the whole curriculum** — the 41 questions, the
  model answers, the chunks, and any generated audio. Non-negotiable before
  strangers drill this for a real government interview. A wrong suffix or an
  off-register phrase becomes a mistake in someone else's mouth.
- **Privacy policy** — required by both app stores even when nothing is
  collected.
- **Disclaimer** — not legal advice, not affiliated with the Hungarian
  government, no guarantee of outcome.
- **Scope honesty about consulate variation** — practice differs between
  consulates and officials.

**Sequencing:** ship the PWA publicly first (installs to an Android home screen
today, no review cycle, fix bad phrases the same day), then wrap with Capacitor
once the content has been through native review.

## App store distribution

- **Google Play** — straightforward. Trusted Web Activity via Bubblewrap or
  PWABuilder, generated from the existing `manifest.json`. Needs a $25 one-time
  Play Console account, a signing key, and a Digital Asset Links file to verify
  domain ownership.
- **Apple App Store** — harder. Guideline 4.2 rejects repackaged websites, so a
  bare PWA wrapper gets bounced. Needs a real `WKWebView` shell (Capacitor) and
  an argument that the app is substantively app-like. Genuine offline behavior
  and real local state help the case; budget for a rejection and resubmission.
  $99/year.

**The real payoff of going native** is not distribution — it is
`SFSpeechRecognizer` (iOS) and `SpeechRecognizer` (Android): on-device speech
recognition, free, no API key, no proxy, no audio leaving the phone. That is
the version of voice scoring that is genuinely device-local. Caveat: Hungarian
language-pack availability varies by platform and device, and iOS may fall back
to server-side recognition. Test on a real phone before building around it.

## Multi-user, if it ever happens

Cheap to keep the door open, so keep it open:

1. Keep every read and write behind `load()` / `save()` in `app.js`. New
   features — including voice tracking — get the same treatment rather than
   touching storage directly.
2. Namespace the save key by user id, defaulting to `local`. Multi-user then
   becomes a key change, not a schema migration.

The work itself is roughly a weekend on this codebase: swap the two function
bodies for Supabase reads/writes with localStorage as an offline cache, and add
magic-link auth (no password UI). The one real refactor is that `load()` is
synchronous and runs at module top level, so startup has to become async —
hydrate from cache, render, reconcile with the server.

Sync conflicts are unusually tame for this data shape: per item take the
further-along Leitner box and the later review date, take the max of XP and
streak, last-write-wins on the profile.

The barrier is not the code — it is holding other people's immigration
interview data, plus voice recordings, for a largely EU audience.

## Voice input and scoring — vendor research (Aug 2026)

**No vendor sells off-the-shelf Hungarian pronunciation scoring.** Azure Speech
pronunciation assessment covers 33 locales and Hungarian is not one of them.
What is buyable is accurate Hungarian *transcription*, with scoring built on
top: word match against the target, timing gaps for hesitation, per-word
confidence as a rough articulation proxy.

- **Wispr Flow — rejected.** No developer API; on Android it is a keyboard
  overlay. Smart Formatting cannot be disabled on Android (iOS only), and
  Backtrack strips filler words, false starts, and self-corrections — exactly
  the hesitation signal that indicates whether someone is interview-ready.
  Dictation ASR answers "what did they mean"; scoring needs "what sounds did
  they make."
- **Deepgram Nova-3 — viable.** Dedicated Hungarian monolingual model, called
  out for holding accuracy across long agglutinative suffix chains, which
  matters given the `-ban` / `-ben` harmony work. Returns verbatim transcript
  with per-word confidence and timings, and has no formatting layer guessing at
  intent. Needs an API key behind a serverless proxy, which conflicts with the
  on-device goal — superseded by native ASR if the app goes native.
- **Inworld — weak for capture, interesting for audio.** Its own STT model is
  English-focused; other languages route to third-party models. Voice profiling
  returns emotion, accent, age, and pitch, none of which is pronunciation
  accuracy.

## Generated audio catalogue

Pre-generate the fixed side of the corpus at build time and ship it as static
assets. The interviewer questions (41 plus ~12 phrasing variants) are identical
for every learner and are the audio that actually matters — the failure mode in
the interview is not understanding what was asked. Personalized answers cannot
be pre-generated and stay on device TTS, which is the correct split rather than
a compromise: you *produce* your answers, you do not listen to them.

Size is a non-issue: ~4s per clip in Opus is roughly 10–15KB, so the question
set lands under a megabyte and the whole corpus under three. Cache on first
play rather than precaching everything.

Device TTS stays as the offline fallback — try the cached clip first, fall back
to `speechSynthesis` in the audio layer around `app.js:209`. That also rescues
the no-Hungarian-voice-installed case the app currently just warns about.

**Vendor risk:** Inworld's Hungarian is *experimental*, not GA (its 15 GA
languages do not include it), and their docs say pronunciation and quality vary
more outside GA. Baked-in wrong pronunciation is worse than mediocre-but-correct
because it gets drilled. Azure, Google, and ElevenLabs have GA Hungarian neural
voices as fallbacks; the architecture is unchanged if the vendor swaps.

## Rejected: splicing native FLEURS audio into our sentences

Tempting — real human Hungarian, openly licensed, already downloaded for the
ASR baseline. It does not work, for three reasons in increasing order of how
fundamental they are.

**Coverage, measured.** FLEURS hu dev holds 1,693 distinct word forms across
407 clips. The 41 interview questions need 152 word tokens and only 39% appear
anywhere in the corpus; exactly one question (`Hogy van?`) is fully covered.
Everything domain-specific is absent — `napot`, `kívánok`, `foglaljon`,
`hívják`, `született`, `állampolgársága`, `foglalkozása`, `házastársa`, `eskü`.
FLEURS is encyclopedic prose; this app is conversational bureaucratic register.
A larger sample does not close that gap.

**Coarticulation.** Phones are shaped by their neighbours — the `a` in `napot`
is not the `a` in `lakik`. Cutting and reassembling yields the seamed quality
of early concatenative synthesis. Unit-selection TTS needed hours of
purpose-recorded, phonetically labelled single-speaker audio to sound tolerable,
and the field left it behind for neural models regardless.

**Prosody, which is specific to this app.** Hungarian yes/no questions carry a
distinctive late rise-fall. FLEURS is declarative narration, so questions
assembled from it would land with statement melody. The app exists to train
recognition of a question under pressure; wrong contour teaches a pattern no
official produces. Actively harmful rather than merely worse.

Note the failure is acoustic, not grammatical. The text side is already
correct — that was never the risk.

## On-device deficiency tracking

Store attempt transcripts locally (IndexedDB) and analyze client-side. The
Leitner boxes already track which *items* are weak; transcripts add the one
thing per-item scheduling cannot see — sub-sentence error patterns, e.g.
dropping a `-ban` suffix consistently regardless of which sentence it appears
in. No server needed for this; there is one learner per install and nothing to
aggregate across.
