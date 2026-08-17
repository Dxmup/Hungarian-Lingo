/* Hungarian Lingo — curriculum for the simplified naturalization interview.
 *
 * The scope is deliberately narrow: not the Hungarian language, just the
 * conversation an applicant has with the official. Two kinds of material:
 *
 *   chunks — whole phrases drilled as units, the way polyglots learn: never
 *            single words, always something you could actually say. Slots
 *            written as ___ get filled from the learner's own profile
 *            (Ultralearning directness: you drill YOUR answer, not a sample).
 *
 *   qa     — interviewer question → model answer pairs. The question side is
 *            comprehension (formal Ön-address, real phrasing variants), the
 *            answer side reuses the drilled chunks. `script` ties each pair
 *            to docs/interview-script.md for coverage audits.
 *
 * Pronunciation respellings: stress is ALWAYS first syllable (marked in CAPS);
 * a="aw", á="ah", é="ay", ö/ő="ur" (no r), ü/ű="ew", s="sh", sz="s", cs="ch",
 * gy=soft "dy", j/ly="y".
 */

const PROFILE_FIELDS = [
  { id: 'name',      label: 'Your full name',                   example: 'Kovács Anna' },
  { id: 'birthYear', label: 'Year you were born',               example: '1985' },
  { id: 'birthPlace',label: 'Town where you were born',         example: 'Cleveland' },
  { id: 'homeTown',  label: 'Town where you live now',          example: 'Denver' },
  { id: 'country',   label: 'Your current citizenship (in Hungarian if you can)', example: 'amerikai' },
  { id: 'job',       label: 'Your job (in Hungarian if you can)', example: 'mérnök' },
  { id: 'age',       label: 'Your age (a number is fine)',      example: '42' },
  { id: 'marital',   label: 'Marital status, in Hungarian: nős (married man), férjnél (married woman → use "férjnél vagyok"), nőtlen / hajadon (single m/f)', example: 'nős' },
  { id: 'spouseName',label: "Your spouse's name (skip if single)", example: 'Anna' },
  { id: 'children',  label: 'Your children\'s names (skip if none)', example: 'Tamás és Emma' },
  { id: 'parentsTown', label: 'Town where your parents live',    example: 'Cleveland' },
  { id: 'ancestor',  label: 'Your Hungarian ancestor (e.g. "a nagymamám")', example: 'a nagymamám' },
  { id: 'ancestorName', label: "That ancestor's full name",      example: 'Kovács Erzsébet' },
  { id: 'ancestorTown', label: "That ancestor's home town",      example: 'Debrecen' },
];

const TOPICS = [
  {
    id: 'tulel',
    title: 'Survival Kit',
    hu: 'Túlélőkészlet',
    icon: '🛟',
    color: '#cd2a3e',
    intro: 'The phrases that keep the interview alive when you get lost. Learn these first — they buy you time on every other question.',
    script: ['1', '7'],
    items: [
      { hu: 'Jó napot kívánok!', en: 'Good day! (formal greeting)', say: 'YOH NAW-pot KEE-vah-nok' },
      { hu: 'Elnézést, nem értem.', en: "Sorry, I don't understand.", say: 'EL-nay-zaysht, nem AYR-tem' },
      { hu: 'Meg tudná ismételni?', en: 'Could you repeat that?', say: 'meg TOOD-nah EESH-may-tel-nee' },
      { hu: 'Kérem, mondja lassabban.', en: 'Please say it more slowly.', say: 'KAY-rem, MOND-yaw LAWSH-shawb-bawn' },
      { hu: 'Egy pillanat, gondolkodom.', en: 'One moment, I’m thinking.', say: 'edy PEEL-law-nawt, GON-dol-ko-dom' },
      { hu: 'Hogy mondják magyarul?', en: 'How do you say it in Hungarian?', say: 'hody MOND-yahk MAW-dyaw-rool' },
      { hu: 'Köszönöm szépen.', en: 'Thank you very much.', say: 'KUR-sur-nurm SAY-pen' },
      { hu: 'Igen, értem.', en: 'Yes, I understand.', say: 'EE-gen, AYR-tem' },
      { hu: 'Sajnos nem tudom.', en: 'Unfortunately I don’t know.', say: 'SHAWY-nosh nem TOO-dom' },
      { hu: 'Viszontlátásra!', en: 'Goodbye! (formal)', say: 'VEE-sont-lah-tahsh-raw' },
    ],
    qa: [
      { script: '1.1', q: { hu: 'Jó napot kívánok! Foglaljon helyet!', en: 'Good day! Please take a seat.', say: 'YOH NAW-pot KEE-vah-nok! FOG-lawl-yon HEY-et' },
        a: { hu: 'Jó napot kívánok! Köszönöm.', en: 'Good day! Thank you.', say: 'YOH NAW-pot KEE-vah-nok! KUR-sur-nurm' } },
      { script: '1.2', q: { hu: 'Hogy van?', en: 'How are you? (formal)', say: 'hody vawn' },
        a: { hu: 'Köszönöm, jól vagyok. Egy kicsit izgulok.', en: 'Thank you, I’m well. I’m a little nervous.', say: 'KUR-sur-nurm, yohl VAW-dyok. edy KEE-cheet EEZ-goo-lok' } },
      { script: '1.3', q: { hu: 'Beszél magyarul?', en: 'Do you speak Hungarian?', say: 'BEH-sayl MAW-dyaw-rool' },
        a: { hu: 'Igen, beszélek magyarul, de még tanulok.', en: 'Yes, I speak Hungarian, but I’m still learning.', say: 'EE-gen, BEH-say-lek MAW-dyaw-rool, deh mayg TAW-noo-lok' } },
      { script: '1.4', q: { hu: 'Érti, amit mondok?', en: 'Do you understand what I’m saying?', say: 'AYR-tee, AW-meet MON-dok' },
        a: { hu: 'Igen, értem. Ha nem értek valamit, szólok.', en: 'Yes, I understand. If I don’t understand something, I’ll say so.', say: 'EE-gen, AYR-tem. haw nem AYR-tek VAW-law-meet, SOH-lok' } },
      { script: '1.5', q: { hu: 'Kérem a személyes iratait.', en: 'Your personal documents, please.', say: 'KAY-rem aw SEH-may-yesh EE-raw-taw-eet' },
        a: { hu: 'Tessék, itt vannak az irataim.', en: 'Here you are, here are my documents.', say: 'TESH-shayk, eet VAWN-nawk awz EE-raw-taw-eem' } },
      { script: '7.1', q: { hu: 'Van kérdése?', en: 'Do you have any questions?', say: 'vawn KAYR-day-sheh' },
        a: { hu: 'Nincs kérdésem, köszönöm.', en: 'I have no questions, thank you.', say: 'neench KAYR-day-shem, KUR-sur-nurm' } },
      { script: '7.2', q: { hu: 'Köszönöm, végeztünk. Minden jót kívánok!', en: 'Thank you, we’re done. All the best!', say: 'KUR-sur-nurm, VAY-gez-tewnk. MEEN-den yoht KEE-vah-nok' },
        a: { hu: 'Köszönöm szépen a türelmét. Viszontlátásra!', en: 'Thank you for your patience. Goodbye!', say: 'KUR-sur-nurm SAY-pen aw TEW-rel-mayt. VEE-sont-lah-tahsh-raw' } },
      { script: '7.3', q: { hu: 'Az eskü szövegét ismeri?', en: 'Do you know the text of the oath?', say: 'awz ESH-kew SUR-veh-gayt EESH-meh-ree' },
        a: { hu: 'Igen, tudom, hogy az eskütétel az ünnepségen lesz.', en: 'Yes, I know the oath-taking will be at the ceremony.', say: 'EE-gen, TOO-dom, hody awz ESH-kew-tay-tel awz EWN-nep-shay-gen les' } },
    ],
  },
  {
    id: 'adatok',
    title: 'About Me',
    hu: 'Személyes adatok',
    icon: '🪪',
    color: '#3f7fbf',
    intro: 'Name, birth, address, work. The interview always starts here — these answers should come out automatic, in your own words.',
    script: ['2'],
    items: [
      { hu: 'A nevem ___.', en: 'My name is ___.', say: 'aw NEH-vem', slot: 'name' },
      { hu: '___-ban születtem.', en: 'I was born in ___ (year/place).', say: 'SEW-let-tem', slot: 'birthYear' },
      { hu: '___ városában lakom.', en: 'I live in the town of ___.', say: 'VAH-ro-shah-bawn LAW-kom', slot: 'homeTown' },
      { hu: '___ állampolgár vagyok.', en: 'I am a ___ citizen.', say: 'AHL-lawm-pol-gahr VAW-dyok', slot: 'country' },
      { hu: '___ vagyok, egy cégnél dolgozom.', en: 'I am a ___, I work at a company.', say: 'VAW-dyok, edy TSAYG-nayl DOL-go-zom', slot: 'job' },
      { hu: '___ éves vagyok.', en: 'I am ___ years old.', say: 'AY-vesh VAW-dyok', slot: 'age' },
      { hu: 'a születési dátumom', en: 'my date of birth', say: 'aw SEW-leh-tay-shee DAH-too-mom' },
      { hu: 'a lakcímem', en: 'my address', say: 'aw LAWK-tsee-mem' },
      { hu: 'ezerkilencszáznyolcvanöt', en: 'nineteen eighty-five (year)', say: 'EH-zer-KEE-lents-sahz-NYOLTS-vawn-urt' },
      { hu: 'kétezer-huszonhat', en: 'twenty twenty-six (year)', say: 'KAY-teh-zer HOO-son-hawt' },
    ],
    qa: [
      { script: '2.1', q: { hu: 'Hogy hívják?', en: 'What is your name?', say: 'hody HEEV-yahk' }, variants: ['Mi a neve?'],
        a: { hu: 'A nevem ___.', en: 'My name is ___.', say: 'aw NEH-vem', slot: 'name' } },
      { script: '2.2', q: { hu: 'Mikor született?', en: 'When were you born?', say: 'MEE-kor SEW-leh-tett' },
        a: { hu: '___-ban születtem.', en: 'I was born in ___ (year).', say: 'SEW-let-tem', slot: 'birthYear' } },
      { script: '2.3', q: { hu: 'Hol született?', en: 'Where were you born?', say: 'hol SEW-leh-tett' },
        a: { hu: '___ városában születtem.', en: 'I was born in the town of ___.', say: 'VAH-ro-shah-bawn SEW-let-tem', slot: 'birthPlace' } },
      { script: '2.4', q: { hu: 'Hol lakik?', en: 'Where do you live?', say: 'hol LAW-keek' }, variants: ['Mi a lakcíme?'],
        a: { hu: '___ városában lakom, a családommal.', en: 'I live in the town of ___, with my family.', say: 'VAH-ro-shah-bawn LAW-kom', slot: 'homeTown' } },
      { script: '2.5', q: { hu: 'Mi az állampolgársága?', en: 'What is your citizenship?', say: 'mee awz AHL-lawm-pol-gahr-shah-gaw' },
        a: { hu: '___ állampolgár vagyok.', en: 'I am a ___ citizen.', say: 'AHL-lawm-pol-gahr VAW-dyok', slot: 'country' } },
      { script: '2.6', q: { hu: 'Mi a foglalkozása?', en: 'What is your occupation?', say: 'mee aw FOG-lawl-ko-zah-shaw' }, variants: ['Hol dolgozik?'],
        a: { hu: '___ vagyok. Szeretem a munkámat.', en: 'I am a ___. I like my work.', say: 'VAW-dyok. SEH-reh-tem aw MOON-kah-mawt', slot: 'job' } },
      { script: '2.7', q: { hu: 'Hány éves?', en: 'How old are you?', say: 'hahny AY-vesh' },
        a: { hu: '___ éves vagyok.', en: 'I am ___ years old.', say: 'AY-vesh VAW-dyok', slot: 'age' } },
    ],
  },
  {
    id: 'csalad',
    title: 'My Family',
    hu: 'Család',
    icon: '👨‍👩‍👧',
    color: '#d9683a',
    intro: 'Spouse, children, parents, siblings. Officials love this section — it is easy, warm conversation, so it is where you can shine.',
    script: ['3'],
    items: [
      { hu: 'Nős vagyok. / Férjnél vagyok.', en: 'I am married. (man / woman)', say: 'nursh VAW-dyok / FAYRY-nayl VAW-dyok' },
      { hu: 'A feleségem neve ___.', en: 'My wife’s name is ___.', say: 'aw FEH-leh-shay-gem NEH-veh' },
      { hu: 'A férjem neve ___.', en: 'My husband’s name is ___.', say: 'aw FAYR-yem NEH-veh' },
      { hu: 'Két gyerekem van.', en: 'I have two children.', say: 'kayt DYEH-reh-kem vawn' },
      { hu: 'egy fiam és egy lányom', en: 'a son and a daughter', say: 'edy FEE-awm aysh edy LAH-nyom' },
      { hu: 'A szüleim ___ városában élnek.', en: 'My parents live in the town of ___.', say: 'aw SEW-leh-eem ... VAH-ro-shah-bawn AYL-nek', slot: 'parentsTown' },
      { hu: 'Van egy bátyám és egy húgom.', en: 'I have an older brother and a younger sister.', say: 'vawn edy BAH-tyahm aysh edy HOO-gom' },
      { hu: 'A gyerekeim is tanulnak magyarul.', en: 'My children are learning Hungarian too.', say: 'aw DYEH-reh-keh-eem eesh TAW-nool-nawk MAW-dyaw-rool' },
      { hu: 'Sajnos édesanyám már nem él.', en: 'Sadly my mother is no longer alive.', say: 'SHAWY-nosh AY-desh-aw-nyahm mahr nem ayl' },
      { hu: 'Nőtlen vagyok. / Hajadon vagyok.', en: 'I am single. (man / woman)', say: 'NURT-len VAW-dyok / HAW-yaw-don VAW-dyok' },
    ],
    qa: [
      { script: '3.1', q: { hu: 'Mi a családi állapota?', en: 'What is your marital status?', say: 'mee aw CHAW-lah-dee AHL-law-po-taw' }, variants: ['Nős Ön?', 'Férjnél van?'],
        a: { hu: '___ vagyok.', en: 'I am ___ (married/single — your own status).', say: 'VAW-dyok', slot: 'marital' } },
      { script: '3.2', q: { hu: 'Mi a házastársa neve?', en: 'What is your spouse’s name?', say: 'mee aw HAH-zawsh-tahr-shaw NEH-veh' },
        a: { hu: 'A házastársam neve ___.', en: 'My spouse’s name is ___.', say: 'aw HAH-zawsh-tahr-shawm NEH-veh', slot: 'spouseName' } },
      { script: '3.3', q: { hu: 'Vannak gyerekei?', en: 'Do you have children?', say: 'VAWN-nawk DYEH-reh-keh-ee' }, variants: ['Hány gyereke van?'],
        a: { hu: 'Igen, két gyerekem van: egy fiam és egy lányom.', en: 'Yes, I have two children: a son and a daughter.', say: 'EE-gen, kayt DYEH-reh-kem vawn' } },
      { script: '3.4', q: { hu: 'Hogy hívják a gyerekeit? Hány évesek?', en: 'What are your children’s names? How old are they?', say: 'hody HEEV-yahk aw DYEH-reh-keh-eet? hahny AY-veh-shek' },
        a: { hu: 'A gyerekeim: ___.', en: 'My children are: ___ (their names — add ages if you can).', say: 'aw DYEH-reh-keh-eem', slot: 'children' } },
      { script: '3.5', q: { hu: 'Élnek a szülei? Hol élnek?', en: 'Are your parents alive? Where do they live?', say: 'AYL-nek aw SEW-leh-ee? hol AYL-nek' },
        a: { hu: 'Igen, a szüleim ___ városában élnek.', en: 'Yes, my parents live in the town of ___.', say: 'EE-gen, aw SEW-leh-eem ... VAH-ro-shah-bawn AYL-nek', slot: 'parentsTown' } },
      { script: '3.6', q: { hu: 'Vannak testvérei?', en: 'Do you have siblings?', say: 'VAWN-nawk TESHT-vay-reh-ee' },
        a: { hu: 'Igen, van egy bátyám és egy húgom.', en: 'Yes, I have an older brother and a younger sister.', say: 'EE-gen, vawn edy BAH-tyahm aysh edy HOO-gom' } },
      { script: '3.7', q: { hu: 'Beszél a családja magyarul?', en: 'Does your family speak Hungarian?', say: 'BEH-sayl aw CHAW-lahd-yaw MAW-dyaw-rool' },
        a: { hu: 'Egy kicsit. A gyerekeim is tanulnak magyarul.', en: 'A little. My children are learning Hungarian too.', say: 'edy KEE-cheet. aw DYEH-reh-keh-eem eesh TAW-nool-nawk' } },
    ],
  },
  {
    id: 'szarmazas',
    title: 'My Hungarian Roots',
    hu: 'Származás',
    icon: '🌳',
    color: '#43714f',
    intro: 'The heart of the simplified procedure: who your Hungarian ancestor was, where they came from, and the family story. Prepare this like a short speech.',
    script: ['4'],
    items: [
      { hu: '___ volt magyar.', en: '___ (my grandmother etc.) was Hungarian.', say: 'volt MAW-dyawr', slot: 'ancestor' },
      { hu: 'A nagymamám ___ városából származik.', en: 'My grandmother comes from the town of ___.', say: 'aw NAWDY-maw-mahm ... VAH-ro-shah-bohl SAHR-maw-zeek', slot: 'ancestorTown' },
      { hu: 'A nagymamám neve ___ volt.', en: 'My grandmother’s name was ___.', say: 'aw NAWDY-maw-mahm NEH-veh ... volt', slot: 'ancestorName' },
      { hu: 'A család a háború után vándorolt ki.', en: 'The family emigrated after the war.', say: 'aw CHAW-lahd aw HAH-bo-roo oo-tahn VAHN-do-rolt kee' },
      { hu: 'jobb életet kerestek', en: 'they were looking for a better life', say: 'yobb AY-leh-tet KEH-resh-tek' },
      { hu: 'Otthon néha beszéltünk magyarul.', en: 'At home we sometimes spoke Hungarian.', say: 'OTT-hon NAY-haw beh-SAYL-tewnk MAW-dyaw-rool' },
      { hu: 'A nagymamám sokat mesélt Magyarországról.', en: 'My grandmother told many stories about Hungary.', say: 'aw NAWDY-maw-mahm SHO-kawt MEH-shaylt MAW-dyawr-or-sahg-rohl' },
      { hu: 'magyar ételeket főzött', en: 'she cooked Hungarian dishes', say: 'MAW-dyawr AY-teh-leh-ket FUR-zurtt' },
      { hu: 'Büszke vagyok a magyar gyökereimre.', en: 'I am proud of my Hungarian roots.', say: 'BEWS-keh VAW-dyok aw MAW-dyawr DYUR-keh-reh-eem-reh' },
      { hu: 'a születési anyakönyvi kivonat', en: 'the birth certificate (the key document)', say: 'aw SEW-leh-tay-shee AW-nyaw-kurny-vee KEE-vo-nawt' },
    ],
    qa: [
      { script: '4.1', q: { hu: 'Ki volt a magyar felmenője?', en: 'Who was your Hungarian ancestor?', say: 'kee volt aw MAW-dyawr FEL-meh-nur-yeh' },
        a: { hu: '___ volt magyar.', en: 'My ___ was Hungarian.', say: 'volt MAW-dyawr', slot: 'ancestor' } },
      { script: '4.2', q: { hu: 'Hogy hívták a nagymamáját?', en: 'What was your grandmother’s name?', say: 'hody HEEV-tahk aw NAWDY-maw-mah-yaht' }, variants: ['Hogy hívták a nagypapáját?'],
        a: { hu: 'A nagymamám neve ___ volt.', en: 'My grandmother’s name was ___.', say: 'aw NAWDY-maw-mahm NEH-veh ... volt', slot: 'ancestorName' } },
      { script: '4.3', q: { hu: 'Hol született a nagymamája?', en: 'Where was your grandmother born?', say: 'hol SEW-leh-tett aw NAWDY-maw-mah-yaw' }, variants: ['Melyik városban?'],
        a: { hu: 'A nagymamám ___ városából származik.', en: 'My grandmother comes from the town of ___.', say: 'VAH-ro-shah-bohl SAHR-maw-zeek', slot: 'ancestorTown' } },
      { script: '4.4', q: { hu: 'Mikor vándorolt ki a családja? Miért?', en: 'When did your family emigrate? Why?', say: 'MEE-kor VAHN-do-rolt kee aw CHAW-lahd-yaw? MEE-ayrt' },
        a: { hu: 'A háború után vándoroltak ki, mert jobb életet kerestek.', en: 'They emigrated after the war, because they were looking for a better life.', say: 'aw HAH-bo-roo oo-tahn VAHN-do-rol-tawk kee' } },
      { script: '4.5', q: { hu: 'Beszéltek otthon magyarul?', en: 'Did you speak Hungarian at home?', say: 'beh-SAYL-tek OTT-hon MAW-dyaw-rool' },
        a: { hu: 'Néha igen. A nagymamám magyarul beszélt velem.', en: 'Sometimes, yes. My grandmother spoke Hungarian with me.', say: 'NAY-haw EE-gen. aw NAWDY-maw-mahm MAW-dyaw-rool BEH-saylt VEH-lem' } },
      { script: '4.6', q: { hu: 'Mit tud a magyar felmenőiről mesélni?', en: 'What can you tell me about your Hungarian ancestors?', say: 'meet tood aw MAW-dyawr FEL-meh-nur-ee-rurl MEH-shayl-nee' },
        a: { hu: 'A nagymamám sokat mesélt Magyarországról, és magyar ételeket főzött.', en: 'My grandmother told many stories about Hungary and cooked Hungarian dishes.', say: 'aw NAWDY-maw-mahm SHO-kawt MEH-shaylt' } },
    ],
  },
  {
    id: 'mindennapok',
    title: 'My Everyday Life',
    hu: 'Mindennapok',
    icon: '☕',
    color: '#c9a227',
    intro: '"Meséljen magáról!" is an invitation, not a trap — have a four-sentence self-introduction ready and the rest of this section follows from it.',
    script: ['5'],
    items: [
      { hu: 'Reggel dolgozni megyek.', en: 'In the morning I go to work.', say: 'REG-gel DOL-goz-nee MEH-dyek' },
      { hu: 'Este a családommal vacsorázom.', en: 'In the evening I have dinner with my family.', say: 'ESH-teh aw CHAW-lah-dom-mawl VAW-cho-rah-zom' },
      { hu: 'Szabadidőmben szeretek olvasni és futni.', en: 'In my free time I like to read and run.', say: 'SAW-bawd-ee-durm-ben SEH-reh-tek OL-vawsh-nee aysh FOOT-nee' },
      { hu: 'Angolul és magyarul beszélek.', en: 'I speak English and Hungarian.', say: 'AWN-go-lool aysh MAW-dyaw-rool BEH-say-lek' },
      { hu: 'Egy éve tanulok magyarul.', en: 'I have been learning Hungarian for a year.', say: 'edy AY-veh TAW-noo-lok MAW-dyaw-rool' },
      { hu: 'tanárral és egy alkalmazással', en: 'with a teacher and an app', say: 'TAW-nahr-rawl aysh edy AWL-kawl-maw-zahsh-shawl' },
      { hu: 'Szeretem a gulyáslevest és a lángost.', en: 'I love goulash soup and lángos.', say: 'SEH-reh-tem aw GOO-yahsh-leh-vesht aysh aw LAHN-gosht' },
      { hu: 'Gyakran főzök otthon.', en: 'I often cook at home.', say: 'DYAWK-rawn FUR-zurk OTT-hon' },
      { hu: 'Hétvégén kirándulunk.', en: 'On weekends we go hiking.', say: 'HAYT-vay-gayn KEE-rahn-doo-loonk' },
      { hu: 'Minden nap gyakorlok egy kicsit.', en: 'I practice a little every day.', say: 'MEEN-den nawp DYAW-kor-lok edy KEE-cheet' },
    ],
    qa: [
      { script: '5.1', q: { hu: 'Meséljen egy kicsit magáról!', en: 'Tell me a little about yourself.', say: 'MEH-shayl-yen edy KEE-cheet MAW-gah-rohl' },
        a: { hu: 'A nevem ___, és a családommal élek.', en: 'My name is ___, and I live with my family. (then add your town and job — you have those chunks)', say: 'aw NEH-vem', slot: 'name' } },
      { script: '5.2', q: { hu: 'Mit csinál egy átlagos napon?', en: 'What do you do on an average day?', say: 'meet CHEE-nahl edy AHT-law-gosh NAW-pon' },
        a: { hu: 'Reggel dolgozni megyek, este a családommal vacsorázom.', en: 'In the morning I go to work, in the evening I dine with my family.', say: 'REG-gel DOL-goz-nee MEH-dyek' } },
      { script: '5.3', q: { hu: 'Mit csinál szabadidejében?', en: 'What do you do in your free time?', say: 'meet CHEE-nahl SAW-bawd-ee-deh-yay-ben' }, variants: ['Mi a hobbija?'],
        a: { hu: 'Szabadidőmben szeretek olvasni, futni és főzni.', en: 'In my free time I like to read, run and cook.', say: 'SAW-bawd-ee-durm-ben SEH-reh-tek OL-vawsh-nee' } },
      { script: '5.4', q: { hu: 'Milyen nyelveken beszél?', en: 'What languages do you speak?', say: 'MEE-yen NYEL-veh-ken BEH-sayl' },
        a: { hu: 'Angolul beszélek, és tanulok magyarul.', en: 'I speak English, and I am learning Hungarian.', say: 'AWN-go-lool BEH-say-lek' } },
      { script: '5.5', q: { hu: 'Hogyan tanult magyarul?', en: 'How did you learn Hungarian?', say: 'HO-dyawn TAW-noolt MAW-dyaw-rool' },
        a: { hu: 'Tanárral és egy alkalmazással tanulok. Minden nap gyakorlok.', en: 'I learn with a teacher and an app. I practice every day.', say: 'TAW-nahr-rawl aysh edy AWL-kawl-maw-zahsh-shawl' } },
      { script: '5.6', q: { hu: 'Szereti a magyar ételeket?', en: 'Do you like Hungarian food?', say: 'SEH-reh-tee aw MAW-dyawr AY-teh-leh-ket' }, variants: ['Mit szeret főzni?'],
        a: { hu: 'Igen, nagyon! Szeretem a gulyáslevest, és gyakran főzök otthon.', en: 'Yes, very much! I love goulash soup, and I often cook at home.', say: 'EE-gen, NAW-dyon' } },
    ],
  },
  {
    id: 'magyarorszag',
    title: 'Hungary & Me',
    hu: 'Magyarország',
    icon: '🇭🇺',
    color: '#8e5bbf',
    intro: 'Why citizenship, your ties to Hungary, holidays and traditions. "Miért szeretne magyar állampolgár lenni?" is the one question you must never fumble.',
    script: ['6'],
    items: [
      { hu: 'Mert a családom magyar származású.', en: 'Because my family is of Hungarian origin.', say: 'mert aw CHAW-lah-dom MAW-dyawr SAHR-maw-zah-shoo' },
      { hu: 'Fontos nekem a magyar kultúra.', en: 'Hungarian culture is important to me.', say: 'FON-tosh NEH-kem aw MAW-dyawr KOOL-too-raw' },
      { hu: 'Kétszer jártam Budapesten.', en: 'I have been to Budapest twice.', say: 'KAYT-ser YAHR-tawm BOO-daw-pesh-ten' },
      { hu: 'Gyönyörű város a Duna partján.', en: 'A beautiful city on the banks of the Danube.', say: 'DYUR-nyur-rew VAH-rosh aw DOO-naw PAWRT-yahn' },
      { hu: 'Vannak rokonaim Magyarországon.', en: 'I have relatives in Hungary.', say: 'VAWN-nawk RO-ko-naw-eem MAW-dyawr-or-sah-gon' },
      { hu: 'Gyakran telefonálunk és írunk egymásnak.', en: 'We often call and write to each other.', say: 'DYAWK-rawn TEH-leh-fo-nah-loonk aysh EE-roonk EDY-mahsh-nawk' },
      { hu: 'Március tizenötödike a forradalom ünnepe.', en: 'March 15 is the holiday of the revolution (1848).', say: 'MAHR-tsee-oosh TEE-zen-ur-tur-dee-keh aw FOR-raw-daw-lom EWN-neh-peh' },
      { hu: 'Augusztus huszadika Szent István ünnepe.', en: 'August 20 is the feast of Saint Stephen.', say: 'OW-goos-toosh HOO-saw-dee-kaw sent EESHT-vahn EWN-neh-peh' },
      { hu: 'Október huszonharmadika az ötvenhatos forradalom ünnepe.', en: 'October 23 commemorates the 1956 revolution.', say: 'OK-toh-ber HOO-son-hawr-maw-dee-kaw' },
      { hu: 'Karácsonykor bejglit sütünk.', en: 'At Christmas we bake bejgli (walnut/poppy roll).', say: 'KAW-rah-chony-kor BEY-gleet SHEW-tewnk' },
    ],
    qa: [
      { script: '6.1', q: { hu: 'Miért szeretne magyar állampolgár lenni?', en: 'Why do you want to be a Hungarian citizen?', say: 'MEE-ayrt SEH-ret-neh MAW-dyawr AHL-lawm-pol-gahr LEN-nee' },
        a: { hu: 'Mert a családom magyar származású, és fontos nekem a magyar kultúra.', en: 'Because my family is of Hungarian origin, and Hungarian culture is important to me.', say: 'mert aw CHAW-lah-dom MAW-dyawr SAHR-maw-zah-shoo' } },
      { script: '6.2', q: { hu: 'Járt már Magyarországon?', en: 'Have you been to Hungary?', say: 'yahrt mahr MAW-dyawr-or-sah-gon' }, variants: ['Hol járt Magyarországon?'],
        a: { hu: 'Igen, kétszer jártam Budapesten és egyszer a Balatonnál.', en: 'Yes, I’ve been to Budapest twice and once to Lake Balaton.', say: 'EE-gen, KAYT-ser YAHR-tawm BOO-daw-pesh-ten' } },
      { script: '6.3', q: { hu: 'Mit szeret Magyarországban?', en: 'What do you like about Hungary?', say: 'meet SEH-ret MAW-dyawr-or-sahg-bawn' },
        a: { hu: 'Szeretem Budapestet, az ételeket és az embereket.', en: 'I love Budapest, the food and the people.', say: 'SEH-reh-tem BOO-daw-pesh-tet' } },
      { script: '6.4', q: { hu: 'Tartja a kapcsolatot a magyarországi rokonaival?', en: 'Are you in touch with your relatives in Hungary?', say: 'TAWRT-yaw aw KAWP-cho-law-tot aw MAW-dyawr-or-sah-gee RO-ko-naw-ee-vawl' },
        a: { hu: 'Igen, vannak rokonaim Magyarországon. Gyakran telefonálunk.', en: 'Yes, I have relatives in Hungary. We often call.', say: 'EE-gen, VAWN-nawk RO-ko-naw-eem' } },
      { script: '6.5', q: { hu: 'Milyen magyar ünnepeket ismer?', en: 'What Hungarian holidays do you know?', say: 'MEE-yen MAW-dyawr EWN-neh-peh-ket EESH-mer' }, variants: ['Hogyan ünnepelnek?'],
        a: { hu: 'Ismerem március tizenötödikét és augusztus huszadikát. Ilyenkor a családdal ünnepelünk.', en: 'I know March 15 and August 20. On those days we celebrate with the family.', say: 'EESH-meh-rem MAHR-tsee-oosht' } },
      { script: '6.6', q: { hu: 'Milyen magyar hagyományokat őriz a családja?', en: 'What Hungarian traditions does your family keep?', say: 'MEE-yen MAW-dyawr HAW-dyo-mah-nyo-kawt UR-reez aw CHAW-lahd-yaw' },
        a: { hu: 'Karácsonykor bejglit sütünk, és magyar ételeket főzünk.', en: 'At Christmas we bake bejgli, and we cook Hungarian dishes.', say: 'KAW-rah-chony-kor BEY-gleet SHEW-tewnk' } },
      { script: '6.7', q: { hu: 'Mikor vannak a magyar nemzeti ünnepek?', en: 'When are the Hungarian national holidays?', say: 'MEE-kor VAWN-nawk aw MAW-dyawr NEM-zeh-tee EWN-neh-pek' },
        a: { hu: 'Március tizenötödikén, augusztus huszadikán és október huszonharmadikán.', en: 'On March 15, August 20 and October 23.', say: 'MAHR-tsee-oosh TEE-zen-ur-tur-dee-kayn' } },
    ],
  },
];

// ---------- flattening ----------
// Stable keys so progress survives reordering: chunks are `${topic}:c${i}`,
// question–answer pairs `${topic}:q${i}`. Never reorder within a topic;
// append instead.

const CHUNKS = [];
const QAS = [];
const BY_KEY = {};

for (const t of TOPICS) {
  t.items = t.items.map((c, i) => {
    const item = { ...c, kind: 'chunk', key: `${t.id}:c${i}`, topic: t.id, topicTitle: t.title };
    CHUNKS.push(item); BY_KEY[item.key] = item; return item;
  });
  t.qa = t.qa.map((p, i) => {
    const item = { ...p, kind: 'qa', key: `${t.id}:q${i}`, topic: t.id, topicTitle: t.title };
    QAS.push(item); BY_KEY[item.key] = item; return item;
  });
}

const ALL_ITEMS = [...CHUNKS, ...QAS];
