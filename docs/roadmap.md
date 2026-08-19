# Roadmap — future versions

## ⏭ Unfinished — pick this up next session

**The audio catalogue is 104 of 111 done** (0.93 MB, mean WER 6.4%). The
remaining 7 are not a quota problem and will not be fixed by rerunning:

```
chunk    a lakcímem
chunk    ezerkilencszáznyolcvanöt
chunk    kétezer-huszonhat
chunk    Nős vagyok. / Férjnél vagyok.
variant  Hol dolgozik?
variant  Ön nős?
variant  Férjnél van?
```

They are too short to read as speech, so the TTS model answers them instead of
speaking them: a 200 with no audio part and `finishReason OTHER`. The generator
now retries five times before giving up, and these still come back empty. A
`Say:` prefix does not rescue them either — that trick works on the sibling
failure (a hard 400, on conversational chunks like `Elnézést, nem értem.`) and
is applied there, but not here.

Three ways out, none tried yet: pad the text with something unspoken to get it
over the length threshold, generate them inside a longer carrier sentence and
trim the audio, or accept the device voice for seven fragments. The middle one
is the only one likely to sound right; the last is what ships today.

**`Nős vagyok. / Férjnél vagyok.` is a curriculum bug, not an audio bug.** The
slash is two alternatives for the learner to choose between — a reader would
speak it as one sentence with a stray "per". Split it into two chunks, gated on
the profile's marital field, and it becomes renderable.

Also worth a look: `wer.js` treats a numeral transcription as an error, so
`Március tizenötödikén` coming back as `Március 15én` scores 43% and lands in
the "worse after encoding" warning. The clip is fine — the metric is not. Two
clips are flagged this way today and both are false positives, which is the
kind of noise that eventually gets a real warning ignored.

**45 utterances cannot be pre-rendered for everyone** — 13 chunks and 32 model
answers carry `___` slots filled from the learner's profile at runtime, so the
audio depends on their town, their year, their grandmother. In the shipped app
those keep the device voice. The gap falls almost entirely on the answer side,
which the learner produces rather than listens to — except in Listening mode,
where 13 chunks genuinely are meant to be heard.

**That number is now much smaller than it looks, and nobody has acted on it.**
Moving the intake to English (`public/profile.js`) turned the open-ended answers
from free text into a fixed list of about 90 vetted Hungarian sentences. A slot
filled from a closed set is not personalized in the way a town name is — there
are only so many possible values, and they are all known at build time. Every
`pick` option could be generated and shipped, so a learner who chooses "Mert a
családom magyar származású…" hears the good voice saying it rather than the
device one.

What genuinely cannot be pre-rendered is much narrower: the free-text values —
name, towns, ancestor name, children's names — and the sentences that embed
them. Worth measuring properly before the next audio run, because it likely
moves most of the answer side into the recorded catalogue and closes the
Listening-mode gap without touching the privacy architecture at all. The cost is
size: ~90 more clips at ~9 KB is under a megabyte.

## Two Hungarian number spellers, and two accent strippers

Noticed when the speaking work and the English intake met in a merge; neither
is a bug today and both are worth collapsing before a third copy appears.

`harmony.js` has `NUM_WORD` / `numWord` / `ageWord` — counting words for
composing answers, where Hungarian wants the short form ("két gyerekem", not
"kettő"). `speech.js` has `HU_ONES` / `HU_TENS` / `huNumber` / `spellNumbers` —
year and numeral spelling, so a spoken "ezerkilencszáznyolcvanötben" matches a
written `1985-ben` when scoring. Genuinely different jobs, which is why they did
not collide, but they will drift on the shared range.

Likewise `stripAccents` in `app.js` and `stripDiacritics` in `speech.js`.

Same reasoning as the harmony extraction: one implementation, in `harmony.js`,
because a disagreement between them would surface as a spoken answer being
marked wrong for a sentence the app itself composed.

## Personalized audio, generated locally

Once a learner has filled in their profile, their 45 slotted utterances become
fixed strings and *can* be rendered — for them, on their machine. Worth doing:
it closes the Listening-mode gap and makes every drill their own sentences in a
real voice.

**Design.** The harmony engine (`harmony`, `SUFFIX_PAIRS`, `withSuffix`, plus
the number words) now lives in `public/harmony.js`, extracted when the intake
moved to English and the profile composer needed the same rules. It is pure and
reads no state, so the build scripts can load it through the same sandbox trick
already used for `data.js`. One implementation, no drift — duplicating the
harmony rules into the build scripts would eventually produce audio that
disagrees with the on-screen text, which is the worst possible bug here because
the learner would trust the voice.

`fill()` is still in `app.js` and still reads `state.profile` directly. It has
to be passed the profile rather than reaching for it before a script can call
it.

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
- **Native-speaker review of every answer option in `public/profile.js`** —
  roughly 90 Hungarian sentences, and they carry more risk than the curriculum
  does. A learner picks these from an English list, so they cannot tell a
  natural answer from a stilted one; whatever the option says is what they will
  say to an official, with no way to notice it is wrong. Register matters
  especially here — several are answers to "Miért szeretne magyar állampolgár
  lenni?", where sounding rehearsed or foreign is the whole risk.
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
