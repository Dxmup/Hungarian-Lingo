/* The learner's answers: asked in English, composed into Hungarian.
 *
 * The interview trainer drills the learner's own sentences, which used to mean
 * the setup form asked a beginner to write 21 Hungarian sentences before they
 * had learned any Hungarian — including the hardest question in the interview,
 * "Miért szeretne magyar állampolgár lenni?". That is backwards. Everything is
 * asked in English here and the Hungarian is built from vetted pieces.
 *
 * There is no translator involved, deliberately. The app is offline and
 * on-device, so machine translation is not available — and would be the wrong
 * tool anyway: these sentences go into a real government interview, so every
 * one of them has to be reviewable by a native speaker before it ships. A
 * fixed set of options can be reviewed. Arbitrary MT output cannot.
 *
 * Shape of the data:
 *   state.intake   what the learner picked or typed, in English   (the source)
 *   state.profile  id -> Hungarian string                         (the output)
 *
 * app.js only ever reads state.profile, so the drills, the audio and the
 * ___ slots are untouched by all of this.
 *
 * EVERY Hungarian string in this file is pending native-speaker review.
 */

/* ---------- option sets ---------- */

const CITIZENSHIPS = [
  { k: 'us', en: 'American', hu: 'amerikai' },
  { k: 'ca', en: 'Canadian', hu: 'kanadai' },
  { k: 'gb', en: 'British', hu: 'brit' },
  { k: 'au', en: 'Australian', hu: 'ausztrál' },
  { k: 'de', en: 'German', hu: 'német' },
  { k: 'at', en: 'Austrian', hu: 'osztrák' },
  { k: 'il', en: 'Israeli', hu: 'izraeli' },
  { k: 'br', en: 'Brazilian', hu: 'brazil' },
  { k: 'ar', en: 'Argentine', hu: 'argentin' },
];

const JOBS = [
  { k: 'eng', en: 'Engineer', hu: 'mérnök' },
  { k: 'tea', en: 'Teacher', hu: 'tanár' },
  { k: 'doc', en: 'Doctor', hu: 'orvos' },
  { k: 'nur', en: 'Nurse', hu: 'ápoló' },
  { k: 'law', en: 'Lawyer', hu: 'ügyvéd' },
  { k: 'acc', en: 'Accountant', hu: 'könyvelő' },
  { k: 'dev', en: 'Software developer', hu: 'programozó' },
  { k: 'man', en: 'Manager', hu: 'menedzser' },
  { k: 'sal', en: 'Salesperson', hu: 'eladó' },
  { k: 'drv', en: 'Driver', hu: 'sofőr' },
  { k: 'chf', en: 'Cook / chef', hu: 'szakács' },
  { k: 'stu', en: 'Student', hu: 'diák' },
  { k: 'ret', en: 'Retired', hu: 'nyugdíjas' },
  { k: 'hom', en: 'At home with the family', hu: 'háztartásbeli' },
];

const LANGUAGES = [
  { k: 'en', en: 'English', hu: 'angolul' },
  { k: 'es', en: 'Spanish', hu: 'spanyolul' },
  { k: 'de', en: 'German', hu: 'németül' },
  { k: 'fr', en: 'French', hu: 'franciául' },
  { k: 'it', en: 'Italian', hu: 'olaszul' },
  { k: 'pt', en: 'Portuguese', hu: 'portugálul' },
  { k: 'ru', en: 'Russian', hu: 'oroszul' },
  { k: 'he', en: 'Hebrew', hu: 'héberül' },
];

/* Marital status is a single word in Hungarian and it is gendered, so the
 * English side has to name the gender rather than leave the learner to guess
 * which of nős/férjnél applies to them. */
const MARITAL = [
  { k: 'm_m', en: 'Married (man)', hu: 'nős' },
  { k: 'm_f', en: 'Married (woman)', hu: 'férjnél' },
  { k: 's_m', en: 'Single (man)', hu: 'nőtlen' },
  { k: 's_f', en: 'Single (woman)', hu: 'hajadon' },
  { k: 'div', en: 'Divorced', hu: 'elvált' },
  { k: 'wid', en: 'Widowed', hu: 'özvegy' },
];

const ANCESTORS = [
  { k: 'gm', en: 'My grandmother', hu: 'a nagymamám' },
  { k: 'gf', en: 'My grandfather', hu: 'a nagyapám' },
  { k: 'ggm', en: 'My great-grandmother', hu: 'a dédnagymamám' },
  { k: 'ggf', en: 'My great-grandfather', hu: 'a dédnagyapám' },
  { k: 'mo', en: 'My mother', hu: 'az édesanyám' },
  { k: 'fa', en: 'My father', hu: 'az édesapám' },
];

/* ---------- the intake form ----------
 *
 * type: text    a proper noun — a name or a town. Needs no translation, so it
 *               goes through as typed.
 *       number  a year, an age, a count.
 *       choice  one option; the Hungarian is the option's word.
 *       multi   several options, joined with "és".
 *       pick    one option, and the option IS the whole answer sentence.
 *       special hand-built controls (children, siblings) where the Hungarian
 *               depends on counts and names together.
 *       derived not asked at all — assembled from the answers above.
 *
 * A `hu` string may reference another field as {id}; those are resolved after
 * the word-level fields are composed. `when` hides a field that does not apply.
 */
const INTAKE = [
  { id: 'name', type: 'text', label: 'Your full name', placeholder: 'Anna Kovács',
    help: 'Exactly as it appears on your documents.' },

  { id: 'birthYear', type: 'number', label: 'Year you were born', placeholder: '1985', min: 1900, max: 2020 },

  { id: 'birthPlace', type: 'text', label: 'Town where you were born', placeholder: 'Cleveland' },

  { id: 'homeTown', type: 'text', label: 'Town where you live now', placeholder: 'Denver' },

  { id: 'age', type: 'number', label: 'Your age', placeholder: '42', min: 14, max: 110 },

  { id: 'country', type: 'choice', label: 'Your current citizenship', options: CITIZENSHIPS,
    other: 'Another country', otherHelp: 'The Hungarian adjective if you know it — e.g. "svéd" for Swedish.' },

  { id: 'job', type: 'choice', label: 'Your job', options: JOBS,
    other: 'Something else', otherHelp: 'In Hungarian if you can — otherwise write it in English and have it checked.' },

  { id: 'marital', type: 'choice', label: 'Your marital status', options: MARITAL },

  { id: 'spouseName', type: 'text', label: "Your spouse's first name", placeholder: 'Anna',
    when: (v) => ['m_m', 'm_f'].includes(v.marital?.k) },

  { id: 'kidCount', type: 'number', label: 'How many children do you have?', placeholder: '0', min: 0, max: 12,
    help: 'Put 0 if none — the app will say so in Hungarian for you.' },

  { id: 'children', type: 'children', label: 'Their names and ages',
    when: (v) => Number(v.kidCount?.value) > 0 },

  { id: 'siblings', type: 'siblings', label: 'Your brothers and sisters',
    help: 'Hungarian uses a different word depending on older or younger, so the counts matter.' },

  { id: 'languages', type: 'multi', label: 'Languages you speak', options: LANGUAGES,
    help: 'Besides Hungarian, which you are learning.' },

  { id: 'parents', type: 'pick', label: 'Are your parents alive, and where do they live?', options: [
    { k: 'both', en: 'Yes, both — they live in the town below', hu: 'Igen, a szüleim {parentsTown} városában élnek.' },
    { k: 'mo', en: 'Only my mother', hu: 'Csak az édesanyám él, {parentsTown} városában.' },
    { k: 'fa', en: 'Only my father', hu: 'Csak az édesapám él, {parentsTown} városában.' },
    { k: 'no', en: 'They have passed away', hu: 'Sajnos már nem élnek.' },
  ] },

  { id: 'parentsTown', type: 'text', label: 'Town where your parents live', placeholder: 'Cleveland',
    when: (v) => ['both', 'mo', 'fa'].includes(v.parents?.k) },

  { id: 'famHu', type: 'pick', label: 'Does your family speak Hungarian?', options: [
    { k: 'little', en: 'A little — we sometimes speak it at home', hu: 'Egy kicsit, otthon néha magyarul beszélünk.' },
    { k: 'only', en: "No, I'm the only one learning", hu: 'Nem, csak én tanulok magyarul.' },
    { k: 'parents', en: 'Yes, my parents speak it', hu: 'Igen, a szüleim beszélnek magyarul.' },
    { k: 'grand', en: 'My grandparents spoke it', hu: 'Igen, a nagyszüleim beszéltek magyarul.' },
  ] },

  { id: 'homeHu', type: 'pick', label: 'Did you speak Hungarian at home growing up?', options: [
    { k: 'gm', en: 'Sometimes — my grandmother spoke it with me', hu: 'Néha igen, a nagymamám magyarul beszélt velem.' },
    { k: 'yes', en: 'Yes, we spoke Hungarian at home', hu: 'Igen, otthon magyarul beszéltünk.' },
    { k: 'words', en: 'Only a few words and songs', hu: 'Csak néhány szót és dalt tanultam.' },
    { k: 'no', en: 'No, unfortunately', hu: 'Sajnos nem.' },
  ] },

  { id: 'day', type: 'pick', label: 'What does an average day look like?', options: [
    { k: 'work', en: 'I go to work in the morning, dinner at home in the evening', hu: 'Reggel dolgozni megyek, este otthon vacsorázom.' },
    { k: 'school', en: 'I take the children to school, then I work', hu: 'Reggel iskolába viszem a gyerekeket, aztán dolgozom.' },
    { k: 'home', en: 'I work from home and walk in the evening', hu: 'Otthonról dolgozom, este sétálok egyet.' },
    { k: 'study', en: 'I study in the morning and work in the afternoon', hu: 'Délelőtt tanulok, délután dolgozom.' },
    { k: 'ret', en: 'I am retired — I read and walk a lot', hu: 'Nyugdíjas vagyok, sokat olvasok és sétálok.' },
  ] },

  { id: 'relatives', type: 'pick', label: 'Do you have relatives in Hungary?', options: [
    { k: 'yes', en: 'Yes, and we phone often', hu: 'Igen, vannak rokonaim Magyarországon, gyakran telefonálunk.' },
    { k: 'lost', en: "Yes, but we're not in touch", hu: 'Igen, vannak, de nem tartjuk a kapcsolatot.' },
    { k: 'look', en: 'I am trying to find them', hu: 'Keresem a magyar rokonaimat.' },
    { k: 'no', en: 'Not any more', hu: 'Sajnos már nincsenek rokonaim Magyarországon.' },
  ] },

  { id: 'ancestor', type: 'choice', label: 'Which relative was Hungarian?', options: ANCESTORS },

  { id: 'ancestorName', type: 'text', label: "That relative's full name", placeholder: 'Erzsébet Kovács' },

  { id: 'ancestorTown', type: 'text', label: "The town they came from", placeholder: 'Debrecen' },

  { id: 'emigYear', type: 'number', label: 'Year your family left Hungary', placeholder: '1956', min: 1850, max: 2020,
    help: 'A rough year is fine. Leave it blank if you do not know.' },

  { id: 'emigStory', type: 'pick', label: 'Why did they leave?', options: [
    { k: 'better', en: 'They were looking for a better life', hu: '{emigYear}-ban vándoroltak ki, mert jobb életet kerestek.' },
    { k: 'rev', en: 'After the 1956 revolution', hu: '1956-ban vándoroltak ki a forradalom után.' },
    { k: 'war', en: 'Because of the war', hu: 'A háború miatt vándoroltak ki.' },
    { k: 'work', en: 'They were looking for work', hu: '{emigYear}-ban vándoroltak ki, mert munkát kerestek.' },
    { k: 'idk', en: 'I do not know exactly', hu: 'Sajnos nem tudom pontosan, mikor vándoroltak ki.' },
  ] },

  { id: 'ancestorStory', type: 'pick', label: 'One thing about that relative', options: [
    { k: 'told', en: 'They told me a lot about Hungary and cooked Hungarian food', hu: '{ancestor} sokat mesélt Magyarországról, és magyar ételeket főzött.' },
    { k: 'town', en: 'They talked about their home town', hu: '{ancestor} sokat mesélt a szülővárosáról.' },
    { k: 'sang', en: 'They sang Hungarian songs to me', hu: '{ancestor} magyar dalokat énekelt nekem.' },
    { k: 'never', en: 'I never met them', hu: 'Sajnos nem ismertem személyesen.' },
  ] },

  { id: 'hungaryTrip', type: 'pick', label: 'Have you been to Hungary?', options: [
    { k: 'twice', en: 'Yes, twice — in Budapest', hu: 'Igen, kétszer jártam Budapesten.' },
    { k: 'once', en: 'Yes, once', hu: 'Igen, egyszer jártam Magyarországon.' },
    { k: 'many', en: 'Yes, many times', hu: 'Igen, sokszor jártam Magyarországon.' },
    { k: 'fam', en: 'Yes, I visited my relatives', hu: 'Igen, meglátogattam a rokonaimat Magyarországon.' },
    { k: 'not', en: 'Not yet', hu: 'Még nem jártam Magyarországon.' },
  ] },

  { id: 'hobbies', type: 'pick', label: 'What do you do in your free time?', options: [
    { k: 'read', en: 'Reading and running', hu: 'Szabadidőmben szeretek olvasni és futni.' },
    { k: 'fam', en: 'Spending time with the family', hu: 'Szabadidőmben a családommal vagyok.' },
    { k: 'cook', en: 'Cooking', hu: 'Szabadidőmben szeretek főzni.' },
    { k: 'music', en: 'Listening to music', hu: 'Szabadidőmben zenét hallgatok.' },
    { k: 'sport', en: 'Sport', hu: 'Szabadidőmben sportolok.' },
    { k: 'garden', en: 'Gardening', hu: 'Szabadidőmben szeretek kertészkedni.' },
  ] },

  { id: 'howLearn', type: 'pick', label: 'How are you learning Hungarian?', options: [
    { k: 'app', en: 'With an app, every day', hu: 'Egy alkalmazással tanulok, és mindennap gyakorlok.' },
    { k: 'teacher', en: 'With a teacher, once a week', hu: 'Tanárral tanulok hetente egyszer.' },
    { k: 'online', en: 'On an online course', hu: 'Online tanfolyamon tanulok.' },
    { k: 'family', en: 'With my family at home', hu: 'A családommal gyakorlok otthon.' },
    { k: 'books', en: 'From books and videos', hu: 'Könyvekből és videókból tanulok.' },
  ] },

  { id: 'food', type: 'pick', label: 'Do you like Hungarian food?', options: [
    { k: 'gul', en: 'Yes! I love goulash soup', hu: 'Igen, nagyon! Szeretem a gulyáslevest.' },
    { k: 'lan', en: 'I like lángos', hu: 'Szeretem a lángost.' },
    { k: 'kap', en: 'I cook stuffed cabbage at home', hu: 'Otthon főzök töltött káposztát.' },
    { k: 'bej', en: 'I bake bejgli at Christmas', hu: 'Karácsonykor bejglit sütök.' },
    { k: 'pap', en: 'I like paprika chicken', hu: 'Szeretem a paprikás csirkét.' },
    { k: 'not', en: 'Not much yet, but I want to try it', hu: 'Még nem sokat, de szeretném megkóstolni.' },
  ] },

  { id: 'why', type: 'pick', label: 'Why do you want Hungarian citizenship?',
    help: 'The most important question in the interview. Pick the one that is true for you — you will drill it until it is automatic.',
    options: [
      { k: 'family', en: 'My family is Hungarian and the culture matters to me', hu: 'Mert a családom magyar származású, és fontos nekem a magyar kultúra.' },
      { k: 'live', en: 'I want to live and work in Hungary', hu: 'Mert Magyarországon szeretnék élni és dolgozni.' },
      { k: 'heritage', en: 'To keep my family’s heritage alive', hu: 'Mert szeretném megőrizni a családom örökségét.' },
      { k: 'kids', en: 'My children should have this connection too', hu: 'Mert szeretném, hogy a gyerekeimnek is legyen ez a kapcsolatuk.' },
      { k: 'feel', en: 'I feel Hungarian and want it to be official', hu: 'Mert magyarnak érzem magam, és szeretném, hogy hivatalos is legyen.' },
      { k: 'nation', en: 'I want to be part of the Hungarian nation', hu: 'Mert szeretnék a magyar nemzet része lenni.' },
    ] },

  { id: 'likeHu', type: 'pick', label: 'What do you like about Hungary?', options: [
    { k: 'bp', en: 'Budapest, the food and the people', hu: 'Szeretem Budapestet, az ételeket és az embereket.' },
    { k: 'lang', en: 'The language and the culture', hu: 'Szeretem a magyar nyelvet és a kultúrát.' },
    { k: 'hist', en: 'The history', hu: 'Érdekel a magyar történelem.' },
    { k: 'bal', en: 'The countryside and Lake Balaton', hu: 'Szeretem a vidéket és a Balatont.' },
    { k: 'music', en: 'The music', hu: 'Szeretem a magyar zenét.' },
  ] },

  /* The frame around this one already names the two national holidays, so the
   * answer is a continuation rather than a sentence of its own. */
  { id: 'celebrate', type: 'pick', label: 'Do you mark the Hungarian national holidays?', options: [
    { k: 'fam', en: 'We celebrate with the family', hu: 'Ilyenkor a családdal ünnepelünk' },
    { k: 'food', en: 'We cook Hungarian food', hu: 'Ilyenkor magyar ételeket főzünk' },
    { k: 'club', en: 'We go to the Hungarian club', hu: 'Ilyenkor elmegyünk a magyar klubba' },
    { k: 'not', en: 'Not yet', hu: 'Még nem ünnepeljük őket' },
  ] },

  { id: 'traditions', type: 'pick', label: 'Any Hungarian traditions your family keeps?', options: [
    { k: 'bej', en: 'We bake bejgli at Christmas', hu: 'Karácsonykor bejglit sütünk.' },
    { k: 'loc', en: 'We keep the Easter sprinkling custom', hu: 'Húsvétkor tartjuk a locsolkodást.' },
    { k: 'food', en: 'We cook Hungarian food on holidays', hu: 'Ünnepekkor magyar ételeket főzünk.' },
    { k: 'not', en: 'Not yet', hu: 'Sajnos még nem őrzünk magyar hagyományokat.' },
  ] },

  /* Never asked. The self-introduction is exactly the three facts above, and
   * asking a beginner to "build it from your other answers" was the single
   * most impossible field on the old form. */
  { id: 'intro', type: 'derived', label: 'Your self-introduction',
    needs: ['name', 'homeTown', 'job'],
    build: (p) => `A nevem ${p.name}. ${p.homeTown} városában lakom, és ${p.job} vagyok.` },
];

const INTAKE_BY_ID = Object.fromEntries(INTAKE.map((f) => [f.id, f]));

/* A couple of curriculum slots are not asked under their own name — "kids" is
 * a sentence built from a count. Label them by the question that produces
 * them, so the review screen never shows a learner an id. */
const SLOT_LABELS = { kids: 'How many children do you have?' };
const slotLabel = (id) => SLOT_LABELS[id] || INTAKE_BY_ID[id]?.label || id;

/* ---------- composing the Hungarian ---------- */

/* Sibling words are four different nouns, not one noun plus an adjective:
 * older brother and younger brother share no root. This is the clearest case
 * for asking in English — "how many older brothers" is answerable by someone
 * who has never seen the word "bátyám". */
const SIBLING_WORDS = [
  { id: 'olderB', en: 'Older brothers', hu: 'bátyám' },
  { id: 'youngerB', en: 'Younger brothers', hu: 'öcsém' },
  { id: 'olderS', en: 'Older sisters', hu: 'nővérem' },
  { id: 'youngerS', en: 'Younger sisters', hu: 'húgom' },
];

function composeSiblings(counts = {}) {
  const parts = SIBLING_WORDS
    .filter((w) => Number(counts[w.id]) > 0)
    .map((w) => `${numWord(Number(counts[w.id]))} ${w.hu}`);
  return parts.length ? `Van ${joinHu(parts)}.` : 'Nincs testvérem.';
}

function composeKids(n) {
  if (!Number.isFinite(n) || n <= 0) return 'Nincs gyerekem.';
  return `Igen, ${numWord(n)} gyerekem van.`;
}

function composeChildren(rows = []) {
  return joinHu(rows
    .filter((r) => r && r.name && r.age !== '' && r.age != null)
    .map((r) => `${r.name} ${ageWord(Number(r.age))}`));
}

/* Word-level fields first: the sentence options refer to them by {id}. */
function composeWords(intake) {
  const out = {};
  for (const f of INTAKE) {
    const v = intake[f.id];
    if (!v) continue;
    if (f.type === 'text' || f.type === 'number') {
      if (String(v.value ?? '').trim()) out[f.id] = String(v.value).trim();
    } else if (f.type === 'choice') {
      const opt = f.options.find((o) => o.k === v.k);
      if (opt) out[f.id] = opt.hu;
      else if (v.k === '_other' && v.other?.trim()) out[f.id] = v.other.trim();
    } else if (f.type === 'multi') {
      const hu = (v.keys || []).map((k) => f.options.find((o) => o.k === k)?.hu).filter(Boolean);
      if (hu.length) out[f.id] = joinHu(hu);
    }
  }
  return out;
}

/* {id} references resolve against the word-level values. An option that needs
 * a value the learner has not given yet resolves to nothing, so the sentence
 * is dropped rather than shipped with a literal "{parentsTown}" in it — a
 * half-filled profile should fall back to the device voice, not teach a
 * placeholder. */
function resolve(template, words) {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, id) => {
    const val = words[id];
    if (!val) { missing = true; return ''; }
    return val;
  });
  if (missing) return '';
  /* A year that lands in front of a case suffix has to harmonize with how the
   * year is *read*: the template writes "{emigYear}-ban" and 1956 comes out
   * "1956-ban" while 1985 has to become "1985-ben". Written suffixes in the
   * option text are corrected the same way, so an option author cannot get it
   * wrong by hand. */
  return out.replace(/(\d+)-(ban|ben|ból|ből|ba|be)/g, (m, digits, suffix) => {
    const back = SUFFIX_PAIRS[suffix] ? suffix : Object.keys(SUFFIX_PAIRS).find((b) => SUFFIX_PAIRS[b] === suffix);
    return withSuffix(digits, back);
  });
}

/* intake (English) -> profile (Hungarian). Pure: give it the same answers and
 * it gives back the same sentences. */
function composeProfile(intake = {}) {
  const profile = composeWords(intake);

  for (const f of INTAKE) {
    const v = intake[f.id];
    if (f.type === 'pick') {
      const opt = v && f.options.find((o) => o.k === v.k);
      if (!opt) continue;
      const text = resolve(opt.hu, profile);
      if (text) profile[f.id] = text;
    } else if (f.type === 'siblings') {
      if (v && Object.values(v).some((n) => n !== '' && n != null)) profile[f.id] = composeSiblings(v);
    } else if (f.type === 'children') {
      const text = composeChildren(v?.rows);
      if (text) profile[f.id] = text;
    }
  }

  // kidCount is asked as a number but answers a question ("Vannak gyerekei?"),
  // so it becomes a sentence under the id the curriculum expects.
  const kc = intake.kidCount?.value;
  if (kc !== '' && kc != null) profile.kids = composeKids(Number(kc));

  for (const f of INTAKE) {
    if (f.type !== 'derived') continue;
    if (f.needs.every((id) => profile[id])) profile[f.id] = f.build(profile);
  }

  return profile;
}

/* Which fields are answerable right now — `when` hides the ones that do not
 * apply, and a hidden field must not count against completeness or the
 * learner can never reach 100%. */
function visibleFields(intake = {}) {
  return INTAKE.filter((f) => f.type !== 'derived' && (!f.when || f.when(intake)));
}

function intakeAnswered(intake = {}, f) {
  const v = intake[f.id];
  if (!v) return false;
  if (f.type === 'text' || f.type === 'number') return String(v.value ?? '').trim() !== '';
  if (f.type === 'choice' || f.type === 'pick') return !!(v.k && (v.k !== '_other' || v.other?.trim()));
  if (f.type === 'multi') return (v.keys || []).length > 0;
  if (f.type === 'siblings') return Object.values(v).some((n) => n !== '' && n != null);
  if (f.type === 'children') return (v.rows || []).some((r) => r?.name);
  return false;
}
