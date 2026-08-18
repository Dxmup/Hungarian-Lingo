/* Hungarian Lingo — phonetics drills for English native speakers.
 *
 * Same narrow scope as the curriculum: not "Hungarian pronunciation" in
 * general, just the sounds that make an English speaker hard to follow in
 * the interview room, plus the two habits (stress and length) that mark an
 * accent instantly even when every consonant is right.
 *
 * Each entry names the English habit that misfires, gives one physical
 * instruction, and drills it on words the learner already meets in data.js
 * — the phonetics section is meant to reinforce the interview material, not
 * to teach a separate word list. Where a word had to come from outside the
 * curriculum (minimal pairs mostly do), it is a common, dictionary-attested
 * word, never an invented one.
 *
 * `pairs` are contrasts, not always strict minimal pairs; the `note` says
 * which, and two flags tell the drills what a pair can be used for:
 * `minimal: false` marks a near pair — it teaches the error but differs in
 * more than the target feature, so the ear may sort it while the
 * which-word-did-the-recognizer-hear test may not. `drill: false` marks a
 * pair that is display-only: homophones cannot be told apart by any ear or
 * any recognizer, and exist here to make a spelling point. Practice `say` respellings follow data.js: stress is ALWAYS first
 * syllable (marked in CAPS); a="aw", á="ah", é="ay", ö/ő="ur" (no r),
 * ü/ű="ew", s="sh", sz="s", cs="ch", zs="zh", gy=soft "dy", j/ly="y".
 *
 * IDs are progress keys. Never reorder this array — append only.
 */

const SOUNDS = [
  {
    id: 'gy',
    letter: 'gy',
    ipa: 'ɟ',
    name: 'gy',
    group: 'consonant',
    hard: 'English has no palatal stop, so the ear files gy under the nearest English thing — the "j" of "judge" — and that is what comes out. Hungarian gy is a single stop, not the affricate "d + zh" that English "j" really is.',
    english: 'Nothing exact. The "d" in a fast British "duke" or the "d + y" run in "did you" is as close as English gets.',
    mouth: 'Press the whole blade of your tongue flat against the roof of the mouth just behind the teeth, then release it in one go — no "zh" hiss after the release.',
    pairs: [
      { a: 'hagy', aEn: 'leaves, lets', b: 'had', bEn: 'army, host', note: 'true minimal pair: gy vs d, the substitution English speakers actually make' },
      { a: 'ágy', aEn: 'bed', b: 'ág', bEn: 'branch', note: 'true minimal pair: gy vs g' },
      { a: 'gyár', aEn: 'factory', b: 'jár', bEn: 'goes, walks (regularly)', note: 'true minimal pair: gy vs j — worth drilling, since an over-soft gy lands on j' },
    ],
    words: [
      { hu: 'magyar', en: 'Hungarian', say: 'MAW-dyawr' },
      { hu: 'gyerekem', en: 'my child', say: 'DYEH-reh-kem' },
      { hu: 'egy', en: 'one; a', say: 'edy' },
      { hu: 'nagymamám', en: 'my grandmother', say: 'NAWDY-maw-mahm' },
      { hu: 'gyakran', en: 'often', say: 'DYAWK-rawn' },
    ],
    phrase: { hu: 'A gyerekeim is tanulnak magyarul.', en: 'My children are learning Hungarian too.' },
  },
  {
    id: 'ty',
    letter: 'ty',
    ipa: 'c',
    name: 'ty',
    group: 'consonant',
    hard: 'The voiceless twin of gy, and English speakers reach for "ch" the same way they reach for "j" for gy. "Ch" has a long hiss after it; ty does not.',
    english: 'No true equivalent. The "t" in "tune" as some British speakers say it, or the "t + y" of "hit you", is the nearest.',
    mouth: 'Same tongue position as gy — blade flat on the hard palate — but with no voice; release cleanly and stop, do not let it slide into "sh".',
    pairs: [
      { a: 'ponty', aEn: 'carp', b: 'pont', bEn: 'point', note: 'true minimal pair: ty vs t' },
      { a: 'atya', aEn: 'father (formal, religious)', b: 'anya', bEn: 'mother', note: 'true minimal pair: ty vs ny — both palatals, easy to blur' },
    ],
    words: [
      { hu: 'bátyám', en: 'my older brother', say: 'BAH-tyahm' },
      { hu: 'kutya', en: 'dog', say: 'KOO-tyaw' },
      { hu: 'tyúk', en: 'hen', say: 'tyook' },
      { hu: 'atya', en: 'father (formal)', say: 'AW-tyaw' },
    ],
    phrase: { hu: 'Van egy bátyám és egy húgom.', en: 'I have an older brother and a younger sister.' },
  },
  {
    id: 'ny',
    letter: 'ny',
    ipa: 'ɲ',
    name: 'ny',
    group: 'consonant',
    hard: 'English speakers pronounce this as two sounds, "n" then "y", the way "canyon" works. Hungarian ny is one sound made in one tongue position, and the seam shows if you split it.',
    english: 'The "ny" of "canyon" or "onion" — close, but English makes it a sequence; Hungarian makes it a single consonant.',
    mouth: 'Put your tongue where you would say "y" in "yes", then hum through the nose from that position without touching the ridge behind your teeth first.',
    pairs: [
      { a: 'nyár', aEn: 'summer', b: 'jár', bEn: 'goes, walks (regularly)', note: 'true minimal pair: ny vs j' },
      { a: 'anya', aEn: 'mother', b: 'atya', bEn: 'father (formal)', note: 'true minimal pair: ny vs ty' },
      { a: 'lány', aEn: 'girl, daughter', b: 'láng', bEn: 'flame', minimal: false, note: 'near pair only — ny vs ng, not a single-feature contrast, but it catches the English habit of backing ny into "ng"' },
    ],
    words: [
      { hu: 'anya', en: 'mother', say: 'AW-nyaw' },
      { hu: 'lányom', en: 'my daughter', say: 'LAH-nyom' },
      { hu: 'hány', en: 'how many', say: 'hahny' },
      { hu: 'asszony', en: 'woman, wife', say: 'AWS-sony' },
      { hu: 'nyolc', en: 'eight', say: 'nyolts' },
    ],
    phrase: { hu: 'Hány gyereke van?', en: 'How many children do you have?' },
  },
  {
    id: 's',
    letter: 's',
    ipa: 'ʃ',
    name: 's (the "sh" letter)',
    group: 'consonant',
    hard: 'The written trap, not the sound trap: s is "sh" and sz is "s", the reverse of what an English reader expects, so the eye keeps overriding the ear. English "sh" is close enough that nobody will misunderstand you; the giveaway is rounding your lips, which Hungarian does not do.',
    english: 'The "sh" of "shop" — a real equivalent, minus the lip rounding.',
    mouth: 'Say "sh" with your lips relaxed and flat, as if smiling slightly, not pushed forward.',
    pairs: [
      { a: 'sár', aEn: 'mud', b: 'szár', bEn: 'stem, stalk', note: 'true minimal pair: s vs sz' },
      { a: 'só', aEn: 'salt', b: 'szó', bEn: 'word', note: 'true minimal pair: s vs sz' },
    ],
    words: [
      { hu: 'sajnos', en: 'unfortunately', say: 'SHAWY-nosh' },
      { hu: 'és', en: 'and', say: 'aysh' },
      { hu: 'tessék', en: 'here you are; please', say: 'TESH-shayk' },
      { hu: 'iskola', en: 'school', say: 'EESH-ko-law' },
      { hu: 'Budapest', en: 'Budapest', say: 'BOO-daw-pesht' },
    ],
    phrase: { hu: 'Sajnos nem tudom.', en: "Unfortunately I don't know." },
  },
  {
    id: 'sz',
    letter: 'sz',
    ipa: 's',
    name: 'sz',
    group: 'consonant',
    hard: 'The sound itself is easy — it is plain English "s". The error is reading: English speakers see sz and say "sh", or hesitate mid-word, which is worse than a wrong consonant in an interview.',
    english: 'The "s" of "see". A true equivalent.',
    mouth: 'Nothing to change in the mouth — train the eye: sz on the page, "s" in the mouth.',
    pairs: [
      { a: 'szó', aEn: 'word', b: 'só', bEn: 'salt', note: 'true minimal pair: sz vs s' },
      { a: 'szél', aEn: 'wind; edge', b: 'cél', bEn: 'goal, aim', note: 'true minimal pair: sz vs c — sz must not pick up a "t" onset' },
    ],
    words: [
      { hu: 'köszönöm', en: 'thank you', say: 'KUR-sur-nurm' },
      { hu: 'születtem', en: 'I was born', say: 'SEW-let-tem' },
      { hu: 'származás', en: 'descent, origin', say: 'SAHR-maw-zahsh' },
      { hu: 'szeretem', en: 'I like it, I love it', say: 'SEH-reh-tem' },
      { hu: 'húsz', en: 'twenty', say: 'hoos' },
    ],
    phrase: { hu: 'Köszönöm szépen.', en: 'Thank you very much.' },
    twister: 'Mit sütsz, kis szűcs? Sós húst sütsz, kis szűcs?',
  },
  {
    id: 'zs',
    letter: 'zs',
    ipa: 'ʒ',
    name: 'zs',
    group: 'consonant',
    hard: 'The sound exists in English but almost never at the start of a word, so English speakers reflexively harden an initial zs into "j" — "zseb" comes out as "jeb".',
    english: 'The "s" in "measure" or "vision". A real equivalent — the problem is only using it word-initially.',
    mouth: 'Start the buzz before you open anything: hold a continuous "zh" hum, then add the vowel, so there is no "d" click at the front.',
    pairs: [
      { a: 'zsír', aEn: 'fat, grease', b: 'sír', bEn: 'grave; (he/she) cries', note: 'true minimal pair: zs vs s (voicing)' },
      { a: 'zseb', aEn: 'pocket', b: 'seb', bEn: 'wound', note: 'true minimal pair: zs vs s (voicing)' },
    ],
    words: [
      { hu: 'zseb', en: 'pocket', say: 'zheb' },
      { hu: 'zsír', en: 'fat, grease', say: 'zheer' },
      { hu: 'rózsa', en: 'rose', say: 'ROH-zhaw' },
    ],
    phrase: { hu: 'A rózsa nagyon szép.', en: 'The rose is very beautiful.' },
  },
  {
    id: 'cs',
    letter: 'cs',
    ipa: 't͡ʃ',
    name: 'cs',
    group: 'consonant',
    hard: 'This one is genuinely easy — it is English "ch". The mistakes are visual: cs read as "k" or "s", and cs confused with plain c, which is a completely different sound.',
    english: 'The "ch" of "church". A true equivalent.',
    mouth: 'Nothing new to learn; just keep the lips unrounded, and keep cs distinct from c ("ts").',
    pairs: [
      { a: 'csík', aEn: 'stripe', b: 'sík', bEn: 'plane, flat surface', note: 'true minimal pair: cs vs s' },
      { a: 'csikk', aEn: 'cigarette butt', b: 'cikk', bEn: 'article (in a paper)', note: 'true minimal pair: cs vs c' },
    ],
    words: [
      { hu: 'család', en: 'family', say: 'CHAW-lahd' },
      { hu: 'kicsit', en: 'a little', say: 'KEE-cheet' },
      { hu: 'csak', en: 'only', say: 'chawk' },
      { hu: 'csinál', en: '(he/she) does, makes', say: 'CHEE-nahl' },
    ],
    phrase: { hu: 'Egy kicsit izgulok.', en: 'I am a little nervous.' },
  },
  {
    id: 'c',
    letter: 'c',
    ipa: 't͡s',
    name: 'c',
    group: 'consonant',
    hard: 'English only has "ts" at the end of words ("cats"), never at the start, so word-initial c gets simplified to "s" — "cél" becomes "sale". The letter shape also pulls English readers toward "k".',
    english: 'The "ts" of "cats" — the same sound, but English never puts it first.',
    mouth: 'Say "cats", then chop off the front: keep the tongue tip on the ridge and start the word from the "ts" itself.',
    pairs: [
      { a: 'cél', aEn: 'goal, aim', b: 'szél', bEn: 'wind; edge', note: 'true minimal pair: c vs sz — exactly the simplification English speakers make' },
      { a: 'cikk', aEn: 'article (in a paper)', b: 'csikk', bEn: 'cigarette butt', note: 'true minimal pair: c vs cs' },
    ],
    words: [
      { hu: 'város', en: 'town, city', say: 'VAH-rosh' },
      { hu: 'lakcímem', en: 'my address', say: 'LAWK-tsee-mem' },
      { hu: 'cégnél', en: 'at a company', say: 'TSAYG-nayl' },
      { hu: 'utca', en: 'street', say: 'OOT-tsaw' },
    ],
    phrase: { hu: 'Mi a lakcíme?', en: 'What is your address?' },
  },
  {
    id: 'r',
    letter: 'r',
    ipa: 'r ~ ɾ',
    name: 'r',
    group: 'consonant',
    hard: 'The English r is made with the tongue bunched and not touching anything, and it colours the vowel before it. Hungarian r touches: it is a tap or a short trill, and an English r is the single loudest marker of an American accent in Hungarian.',
    english: 'No equivalent in most English. The closest thing is the quick "d"-like tap in American "better" or "city".',
    mouth: 'Say "butter" fast and feel the tongue tip flick the ridge behind your teeth — that flick, repeated once or twice, is Hungarian r.',
    pairs: [
      { a: 'orom', aEn: 'peak, crest', b: 'orrom', bEn: 'my nose', note: 'true minimal pair: single tap vs held (long) r — the long one is a real trill' },
    ],
    words: [
      { hu: 'kérem', en: 'please; I ask for it', say: 'KAY-rem' },
      { hu: 'reggel', en: 'morning, in the morning', say: 'REG-gel' },
      { hu: 'három', en: 'three', say: 'HAH-rom' },
      { hu: 'rokonaim', en: 'my relatives', say: 'RO-ko-naw-eem' },
      { hu: 'magyarul', en: 'in Hungarian', say: 'MAW-dyaw-rool' },
    ],
    phrase: { hu: 'Kérem, mondja lassabban.', en: 'Please say it more slowly.' },
    twister: 'Sárga bögre, görbe bögre.',
  },
  {
    id: 'l',
    letter: 'l',
    ipa: 'l',
    name: 'l',
    group: 'consonant',
    hard: 'English has two l sounds and uses the dark one at the end of a syllable — "full", "milk" — with the back of the tongue humped up. Hungarian only has the clear one, so a dark l at the end of "jól" or "él" sounds swallowed.',
    english: 'The "l" of "leaf" (clear), never the "l" of "full" (dark).',
    mouth: 'Keep the tongue tip on the ridge and the back of the tongue flat and low, the same shape at the end of a word as at the start.',
    pairs: [
      { a: 'tél', aEn: 'winter', b: 'tér', bEn: 'square, space', note: 'true minimal pair: l vs r, both word-final — the position where English darkens l' },
    ],
    words: [
      { hu: 'lakom', en: 'I live (somewhere)', say: 'LAW-kom' },
      { hu: 'jól', en: 'well', say: 'yohl' },
      { hu: 'élnek', en: 'they live', say: 'AYL-nek' },
      { hu: 'olvasni', en: 'to read', say: 'OL-vawsh-nee' },
    ],
    phrase: { hu: 'Köszönöm, jól vagyok.', en: 'Thank you, I am well.' },
  },
  {
    id: 'h',
    letter: 'h',
    ipa: 'h',
    name: 'h',
    group: 'consonant',
    hard: 'The sound is English "h"; the trap is where it is and is not pronounced. English speakers drop h in fast speech ("tell him") and pronounce every written one elsewhere — Hungarian does the opposite in a few words, where a final h is silent but comes back when a vowel-initial suffix follows.',
    english: 'The "h" of "house". A true equivalent when it is pronounced at all.',
    mouth: 'Sound every written h at the start of a syllable, even inside a phrase; leave the small set of word-final h words (düh, cseh, méh) unsounded.',
    pairs: [
      { a: 'düh', aEn: 'rage, fury (final h silent)', b: 'dühös', bEn: 'angry (h now pronounced)', minimal: false, note: 'not a minimal pair — a demonstration pair for the silent-h rule' },
    ],
    words: [
      { hu: 'hogy', en: 'how; that', say: 'hody' },
      { hu: 'hívják', en: 'they call (him/her)', say: 'HEEV-yahk' },
      { hu: 'hol', en: 'where', say: 'hol' },
      { hu: 'három', en: 'three', say: 'HAH-rom' },
    ],
    phrase: { hu: 'Hogy hívják?', en: 'What is your name? (lit. how do they call you)' },
  },
  {
    id: 'ptk',
    letter: 'p, t, k',
    ipa: 'p t k',
    name: 'p / t / k (unaspirated)',
    group: 'consonant',
    hard: 'English puffs air after p, t, k at the start of a word — hold a hand in front of your mouth on "Peter" and you feel it. Hungarian does not, so an aspirated "khérem" is instantly foreign even though it is still understood.',
    english: 'The p, t, k of "spy", "sty", "sky" — after "s" English drops the puff, which is exactly the Hungarian sound.',
    mouth: 'Say "spy", then say the same word without the "s": the p you keep is the Hungarian p. Also put the t on the back of the upper teeth, not on the ridge behind them.',
    pairs: [
      { a: 'pár', aEn: 'pair, couple', b: 'bár', bEn: 'although; bar', note: 'true minimal pair: p vs b — with the puff gone, voicing is the only cue left, so it has to be clean' },
      { a: 'tél', aEn: 'winter', b: 'dél', bEn: 'noon; south', note: 'true minimal pair: t vs d' },
      { a: 'kép', aEn: 'picture', b: 'gép', bEn: 'machine', note: 'true minimal pair: k vs g' },
    ],
    words: [
      { hu: 'kérem', en: 'please; I ask for it', say: 'KAY-rem' },
      { hu: 'pillanat', en: 'moment', say: 'PEEL-law-nawt' },
      { hu: 'tanulok', en: 'I am learning', say: 'TAW-noo-lok' },
      { hu: 'tudom', en: 'I know it', say: 'TOO-dom' },
    ],
    phrase: { hu: 'Egy pillanat, gondolkodom.', en: 'One moment, I am thinking.' },
    twister: 'Az ipafai papnak fapipája van.',
  },
  {
    id: 'j',
    letter: 'j / ly',
    ipa: 'j',
    name: 'j and ly',
    group: 'consonant',
    hard: 'Two spellings, one sound: ly is pronounced exactly like j in standard Hungarian. English speakers read j as the "j" of "jam" and ly as an English "l" plus "y", and both come out wrong.',
    english: 'The "y" of "yes". A true equivalent.',
    mouth: 'Say "yes" — that is both letters. Nothing touches; keep the tongue off the ridge behind the teeth.',
    pairs: [
      { a: 'folyt', aEn: 'flowed', b: 'fojt', bEn: 'chokes, stifles', drill: false, note: 'not a minimal pair — homophones. Same pronunciation, different spelling: proof that ly = j' },
      { a: 'jár', aEn: 'goes, walks (regularly)', b: 'gyár', bEn: 'factory', note: 'true minimal pair: j vs gy — keeps a too-soft gy from collapsing into j' },
    ],
    words: [
      { hu: 'jó', en: 'good', say: 'yoh' },
      { hu: 'jártam', en: 'I have been (somewhere)', say: 'YAHR-tawm' },
      { hu: 'milyen', en: 'what kind of', say: 'MEE-yen' },
      { hu: 'helyet', en: 'seat, place (object form)', say: 'HEY-et' },
    ],
    phrase: { hu: 'Jó napot kívánok!', en: 'Good day! (formal greeting)' },
  },
  {
    id: 'a-aa',
    letter: 'a / á',
    ipa: 'ɒ / aː',
    name: 'a vs á',
    group: 'vowel',
    hard: 'These are not one vowel long and short — they are different vowels. English speakers hear both as the "a" of "father" and merge them, which turns hat into hát and magyar into something with two identical vowels.',
    english: 'a ≈ the rounded "o" of British "hot"; á ≈ the "a" of "father", held longer.',
    mouth: 'For a, round your lips slightly and keep it short; for á, open the jaw wide, unround the lips, and hold it about twice as long.',
    pairs: [
      { a: 'hat', aEn: 'six', b: 'hát', bEn: 'back; well… (filler)', note: 'true minimal pair: a vs á' },
      { a: 'agy', aEn: 'brain', b: 'ágy', bEn: 'bed', note: 'true minimal pair: a vs á' },
      { a: 'kar', aEn: 'arm', b: 'kár', bEn: 'damage; what a pity', note: 'true minimal pair: a vs á' },
    ],
    words: [
      { hu: 'magyar', en: 'Hungarian', say: 'MAW-dyawr' },
      { hu: 'vagyok', en: 'I am', say: 'VAW-dyok' },
      { hu: 'lakom', en: 'I live (somewhere)', say: 'LAW-kom' },
      { hu: 'három', en: 'three', say: 'HAH-rom' },
      { hu: 'hány', en: 'how many', say: 'hahny' },
    ],
    phrase: { hu: 'Egy éve tanulok magyarul.', en: 'I have been learning Hungarian for a year.' },
  },
  {
    id: 'e-ee',
    letter: 'e / é',
    ipa: 'ɛ / eː',
    name: 'e vs é',
    group: 'vowel',
    hard: 'English speakers make é a diphthong — the "ay" of "day" glides up into a "y" at the end. Hungarian é holds one steady position from start to finish, and the glide is audible to every Hungarian listener.',
    english: 'e ≈ the "e" of "bed"; é ≈ the "ay" of "day" but with the tail cut off — closer to Scottish "day" or French "été".',
    mouth: 'Set the tongue for "ay" and freeze it: no upward glide, no jaw movement, just hold the one sound.',
    pairs: [
      { a: 'kerek', aEn: 'round', b: 'kérek', bEn: 'I ask for, I would like', note: 'true minimal pair: e vs é in the first syllable — and kérek is a word you will actually use' },
      { a: 'kerek', aEn: 'round', b: 'kerék', bEn: 'wheel', note: 'true minimal pair: e vs é in the second syllable' },
    ],
    words: [
      { hu: 'nevem', en: 'my name', say: 'NEH-vem' },
      { hu: 'értem', en: 'I understand', say: 'AYR-tem' },
      { hu: 'éves', en: 'years old', say: 'AY-vesh' },
      { hu: 'feleségem', en: 'my wife', say: 'FEH-leh-shay-gem' },
      { hu: 'kérem', en: 'please; I ask for it', say: 'KAY-rem' },
    ],
    phrase: { hu: 'Elnézést, nem értem.', en: "Sorry, I don't understand." },
  },
  {
    id: 'o-umlaut',
    letter: 'ö / ő',
    ipa: 'ø / øː',
    name: 'ö and ő',
    group: 'vowel',
    hard: 'English has no front rounded vowel at all, so ö gets replaced by the "u" of "fur" — with an r-colouring that Hungarian never has. The long ő is the same vowel simply held; English speakers often make it a different vowel instead.',
    english: 'No equivalent. The "u" of "fur" or "her" is the usual anchor, but only if you delete all trace of the r.',
    mouth: 'Say the "e" of "bed", hold the tongue exactly there, then round your lips as if to whistle — do not let the tongue move back.',
    pairs: [
      { a: 'öt', aEn: 'five', b: 'őt', bEn: 'him, her (object)', note: 'true minimal pair: short ö vs long ő' },
      { a: 'öt', aEn: 'five', b: 'üt', bEn: '(he/she) hits', note: 'true minimal pair: ö vs ü — the two front rounded vowels English speakers merge with each other' },
    ],
    words: [
      { hu: 'köszönöm', en: 'thank you', say: 'KUR-sur-nurm' },
      { hu: 'öt', en: 'five', say: 'urt' },
      { hu: 'nős', en: 'married (of a man)', say: 'nursh' },
      { hu: 'gyökereim', en: 'my roots', say: 'DYUR-keh-reh-eem' },
    ],
    phrase: { hu: 'Köszönöm szépen a türelmét.', en: 'Thank you very much for your patience.' },
  },
  {
    id: 'u-umlaut',
    letter: 'ü / ű',
    ipa: 'y / yː',
    name: 'ü and ű',
    group: 'vowel',
    hard: 'Also absent from English. The usual substitutes are "oo" (tongue too far back) or "ee" (lips unrounded) — ü needs the tongue of "ee" and the lips of "oo" at the same time.',
    english: 'No equivalent. If you know French "tu" or German "über", it is that vowel.',
    mouth: 'Say "ee" and hold it, then push your lips into a tight circle without letting the tongue slide back.',
    pairs: [
      { a: 'tűz', aEn: 'fire', b: 'tíz', bEn: 'ten', note: 'true minimal pair: ű vs í — same tongue position, rounding is the only difference' },
      { a: 'üt', aEn: '(he/she) hits', b: 'őt', bEn: 'him, her (object)', note: 'true minimal pair: ü vs ő' },
      { a: 'fut', aEn: 'runs', b: 'fűt', bEn: 'heats', minimal: false, note: 'near pair only — differs in both backness and length, but it is the exact error (ü pulled back to "oo")' },
    ],
    words: [
      { hu: 'szüleim', en: 'my parents', say: 'SEW-leh-eem' },
      { hu: 'született', en: '(he/she) was born', say: 'SEW-leh-tett' },
      { hu: 'ünnep', en: 'holiday, feast day', say: 'EWN-nep' },
      { hu: 'türelmét', en: 'your patience (object)', say: 'TEW-rel-mayt' },
      { hu: 'tűz', en: 'fire', say: 'tewz' },
    ],
    phrase: { hu: 'Mikor született?', en: 'When were you born?' },
  },
  {
    id: 'vowel-length',
    letter: 'i/í, o/ó, u/ú',
    ipa: 'i iː · o oː · u uː',
    name: 'short vs long vowels',
    group: 'length',
    hard: 'English vowel length is automatic — it depends on the following consonant and never changes meaning. In Hungarian the accent mark is the meaning, and English speakers either ignore it or overshoot it into a different vowel.',
    english: 'The nearest English analogy is "bit" vs "beet", but even that changes vowel quality; Hungarian changes duration and keeps the vowel.',
    mouth: 'Hold the accented vowel roughly twice as long as the unaccented one, without changing the shape of your mouth while you hold it.',
    pairs: [
      { a: 'kor', aEn: 'age, era', b: 'kór', bEn: 'disease', note: 'true minimal pair: o vs ó' },
      { a: 'irt', aEn: 'exterminates', b: 'írt', bEn: '(he/she) wrote', note: 'true minimal pair: i vs í' },
    ],
    words: [
      { hu: 'jó', en: 'good', say: 'yoh' },
      { hu: 'tíz', en: 'ten', say: 'teez' },
      { hu: 'húsz', en: 'twenty', say: 'hoos' },
      { hu: 'tudom', en: 'I know it', say: 'TOO-dom' },
    ],
    phrase: { hu: 'Igen, tudom.', en: 'Yes, I know.' },
  },
  {
    id: 'long-consonants',
    letter: 'doubled consonants (ll, tt, ssz, ggy…)',
    ipa: 'Cː',
    name: 'long consonants',
    group: 'length',
    hard: 'English writes double letters but does not pronounce them long — "hotter" has one t. Hungarian holds the consonant, and the difference carries meaning, so a short one turns meggy into megy. Note that in two-letter consonants only the first letter doubles: ssz, ggy, nny.',
    english: 'No equivalent inside a word. The nearest is a phrase boundary: "big gun" vs "bigun".',
    mouth: 'Stop on the consonant and hold it for a beat before releasing — for ll and ss just keep it running; for tt and pp keep the closure shut longer.',
    pairs: [
      { a: 'megy', aEn: '(he/she) goes', b: 'meggy', bEn: 'sour cherry', note: 'true minimal pair: short vs long gy' },
      { a: 'hal', aEn: 'fish', b: 'hall', bEn: '(he/she) hears', note: 'true minimal pair: short vs long l' },
      { a: 'tol', aEn: 'pushes', b: 'toll', bEn: 'pen; feather', note: 'true minimal pair: short vs long l' },
    ],
    words: [
      { hu: 'tessék', en: 'here you are; please', say: 'TESH-shayk' },
      { hu: 'vannak', en: 'there are', say: 'VAWN-nawk' },
      { hu: 'lassabban', en: 'more slowly', say: 'LAWSH-shawb-bawn' },
      { hu: 'kettő', en: 'two', say: 'KET-tur' },
      { hu: 'asszony', en: 'woman, wife', say: 'AWS-sony' },
    ],
    phrase: { hu: 'Tessék, itt vannak az irataim.', en: 'Here you are, here are my documents.' },
  },
  {
    id: 'stress',
    letter: 'first syllable',
    ipa: 'ˈ',
    name: 'stress',
    group: 'stress',
    hard: 'Hungarian stress is fixed on the first syllable of every word, with no exceptions, and it never moves for emphasis or for suffixes. English speakers stress by rhythm and by guessing from word shape — and a long vowel later in the word pulls them off the first syllable every time.',
    english: 'English does this in words like "HAPpiness" or "PHOtograph", but only sometimes; Hungarian does it always.',
    mouth: 'Put the beat on syllable one and let everything after it stay level — a long vowel later in the word is longer, not louder.',
    pairs: [
      { a: 'kerek', aEn: 'round', b: 'kerék', bEn: 'wheel', note: 'true minimal pair for vowel length, used here for stress: both are KEH-rek / KEH-rayk — the long é does not take the stress' },
    ],
    words: [
      { hu: 'köszönöm', en: 'thank you', say: 'KUR-sur-nurm' },
      { hu: 'Magyarország', en: 'Hungary', say: 'MAW-dyawr-or-sahg' },
      { hu: 'állampolgár', en: 'citizen', say: 'AHL-lawm-pol-gahr' },
      { hu: 'viszontlátásra', en: 'goodbye (formal)', say: 'VEE-sont-lah-tahsh-raw' },
      { hu: 'Budapest', en: 'Budapest', say: 'BOO-daw-pesht' },
    ],
    phrase: { hu: 'Viszontlátásra!', en: 'Goodbye! (formal)' },
  },
];

// ---------- flattening ----------
// Progress keys come from the `id`, never from the array position, so a sound
// can be inserted or moved without wiping anyone's boxes. A sound carries the
// same shape as a curriculum item — kind and key — because it goes through the
// same scheduler and the same session engine.

const SOUND_BY_ID = {};

for (const s of SOUNDS) {
  s.kind = 'sound';
  s.key = `snd:${s.id}`;
  SOUND_BY_ID[s.id] = s;
}
