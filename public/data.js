/* Hungarian Lingo — vocabulary data
 *
 * Every word carries a rough English respelling (`say`) because Hungarian
 * spelling is phonetic but unfamiliar: stress is ALWAYS on the first
 * syllable, and the accents mark vowel length/quality, never stress.
 *
 * Field notes for the respellings:
 *   a = "aw" (rounded, short)   á = "ah" (long)
 *   e = "eh"                    é = "ay"
 *   ö/ő = "ur" without the r    ü/ű = French "u" / German "ü"  (written EU/UE)
 *   s = "sh"   sz = "s"   c = "ts"   cs = "ch"   zs = "zh"   gy = soft "dy"
 *   j / ly = "y"                r = tapped
 */

const UNITS = [
  {
    id: 'greetings',
    title: 'Greetings & Basics',
    hu: 'Alapok',
    icon: '👋',
    color: '#4a9d5f',
    words: [
      { hu: 'szia', en: 'hi / bye', say: 'SEE-yaw' },
      { hu: 'jó reggelt', en: 'good morning', say: 'YOH REG-gelt' },
      { hu: 'jó napot', en: 'good day (formal hello)', say: 'YOH NAW-pot' },
      { hu: 'jó estét', en: 'good evening', say: 'YOH ESH-tayt' },
      { hu: 'viszontlátásra', en: 'goodbye (formal)', say: 'VEE-sont-lah-tahsh-raw' },
      { hu: 'köszönöm', en: 'thank you', say: 'KUR-sur-nurm' },
      { hu: 'szívesen', en: "you're welcome", say: 'SEE-veh-shen' },
      { hu: 'kérem', en: 'please', say: 'KAY-rem' },
      { hu: 'igen', en: 'yes', say: 'EE-gen' },
      { hu: 'nem', en: 'no / not', say: 'nem' },
      { hu: 'bocsánat', en: 'sorry / excuse me', say: 'BO-chah-nawt' },
      { hu: 'hogy vagy', en: 'how are you', say: 'HODY vawdy' },
    ],
  },
  {
    id: 'people',
    title: 'People & Family',
    hu: 'Család',
    icon: '👨‍👩‍👧',
    color: '#d9683a',
    words: [
      { hu: 'család', en: 'family', say: 'CHAW-lahd' },
      { hu: 'anya', en: 'mother', say: 'AW-nyaw' },
      { hu: 'apa', en: 'father', say: 'AW-paw' },
      { hu: 'nagymama', en: 'grandmother', say: 'NAWDY-maw-maw' },
      { hu: 'nagypapa', en: 'grandfather', say: 'NAWDY-paw-paw' },
      { hu: 'testvér', en: 'sibling', say: 'TESHT-vayr' },
      { hu: 'fiú', en: 'boy / son', say: 'FEE-oo' },
      { hu: 'lány', en: 'girl / daughter', say: 'lahny' },
      { hu: 'gyerek', en: 'child', say: 'DYE-rek' },
      { hu: 'barát', en: 'friend', say: 'BAW-raht' },
      { hu: 'nő', en: 'woman', say: 'nur' },
      { hu: 'férfi', en: 'man', say: 'FAYR-fee' },
    ],
  },
  {
    id: 'numbers',
    title: 'Numbers',
    hu: 'Számok',
    icon: '🔢',
    color: '#3f7fbf',
    words: [
      { hu: 'egy', en: 'one', say: 'edy' },
      { hu: 'kettő', en: 'two', say: 'KET-tur' },
      { hu: 'három', en: 'three', say: 'HAH-rom' },
      { hu: 'négy', en: 'four', say: 'naydy' },
      { hu: 'öt', en: 'five', say: 'urt' },
      { hu: 'hat', en: 'six', say: 'hawt' },
      { hu: 'hét', en: 'seven', say: 'hayt' },
      { hu: 'nyolc', en: 'eight', say: 'nyolts' },
      { hu: 'kilenc', en: 'nine', say: 'KEE-lents' },
      { hu: 'tíz', en: 'ten', say: 'teez' },
      { hu: 'húsz', en: 'twenty', say: 'hoos' },
      { hu: 'száz', en: 'hundred', say: 'sahz' },
    ],
  },
  {
    id: 'food',
    title: 'Food & Drink',
    hu: 'Étel és ital',
    icon: '🍞',
    color: '#c9a227',
    words: [
      { hu: 'kenyér', en: 'bread', say: 'KEN-yayr' },
      { hu: 'víz', en: 'water', say: 'veez' },
      { hu: 'tej', en: 'milk', say: 'tay' },
      { hu: 'alma', en: 'apple', say: 'AWL-maw' },
      { hu: 'sajt', en: 'cheese', say: 'shoyt' },
      { hu: 'hús', en: 'meat', say: 'hoosh' },
      { hu: 'leves', en: 'soup', say: 'LEH-vesh' },
      { hu: 'kávé', en: 'coffee', say: 'KAH-vay' },
      { hu: 'tea', en: 'tea', say: 'TEH-aw' },
      { hu: 'bor', en: 'wine', say: 'bor' },
      { hu: 'sör', en: 'beer', say: 'shur' },
      { hu: 'cukor', en: 'sugar', say: 'TSOO-kor' },
    ],
  },
  {
    id: 'colors',
    title: 'Colors & Describing',
    hu: 'Színek',
    icon: '🎨',
    color: '#8e5bbf',
    words: [
      { hu: 'piros', en: 'red', say: 'PEE-rosh' },
      { hu: 'kék', en: 'blue', say: 'kayk' },
      { hu: 'zöld', en: 'green', say: 'zurld' },
      { hu: 'sárga', en: 'yellow', say: 'SHAHR-gaw' },
      { hu: 'fekete', en: 'black', say: 'FEH-keh-teh' },
      { hu: 'fehér', en: 'white', say: 'FEH-hayr' },
      { hu: 'nagy', en: 'big', say: 'nawdy' },
      { hu: 'kicsi', en: 'small', say: 'KEE-chee' },
      { hu: 'szép', en: 'beautiful', say: 'sayp' },
      { hu: 'jó', en: 'good', say: 'yoh' },
      { hu: 'rossz', en: 'bad', say: 'ross' },
      { hu: 'új', en: 'new', say: 'ooy' },
    ],
  },
  {
    id: 'animals',
    title: 'Animals',
    hu: 'Állatok',
    icon: '🦊',
    color: '#b8563f',
    words: [
      { hu: 'kutya', en: 'dog', say: 'KOO-tyaw' },
      { hu: 'macska', en: 'cat', say: 'MAWCH-kaw' },
      { hu: 'ló', en: 'horse', say: 'loh' },
      { hu: 'madár', en: 'bird', say: 'MAW-dahr' },
      { hu: 'hal', en: 'fish', say: 'hawl' },
      { hu: 'tehén', en: 'cow', say: 'TEH-hayn' },
      { hu: 'disznó', en: 'pig', say: 'DEES-noh' },
      { hu: 'egér', en: 'mouse', say: 'EH-gayr' },
      { hu: 'medve', en: 'bear', say: 'MED-veh' },
      { hu: 'róka', en: 'fox', say: 'ROH-kaw' },
      { hu: 'nyúl', en: 'rabbit', say: 'nyool' },
      { hu: 'farkas', en: 'wolf', say: 'FAWR-kawsh' },
    ],
  },
  {
    id: 'home',
    title: 'Home & Things',
    hu: 'Otthon',
    icon: '🏠',
    color: '#4f8a8b',
    words: [
      { hu: 'ház', en: 'house', say: 'hahz' },
      { hu: 'lakás', en: 'apartment', say: 'LAW-kahsh' },
      { hu: 'ajtó', en: 'door', say: 'OY-toh' },
      { hu: 'ablak', en: 'window', say: 'AWB-lawk' },
      { hu: 'asztal', en: 'table', say: 'AWS-tawl' },
      { hu: 'szék', en: 'chair', say: 'sayk' },
      { hu: 'ágy', en: 'bed', say: 'ahdy' },
      { hu: 'konyha', en: 'kitchen', say: 'KOHN-yhaw' },
      { hu: 'szoba', en: 'room', say: 'SO-baw' },
      { hu: 'könyv', en: 'book', say: 'kurnyv' },
      { hu: 'telefon', en: 'phone', say: 'TEH-leh-fon' },
      { hu: 'kulcs', en: 'key', say: 'koolch' },
    ],
  },
  {
    id: 'time',
    title: 'Time & Days',
    hu: 'Idő',
    icon: '🕒',
    color: '#5a6fbf',
    words: [
      { hu: 'ma', en: 'today', say: 'maw' },
      { hu: 'holnap', en: 'tomorrow', say: 'HOL-nawp' },
      { hu: 'tegnap', en: 'yesterday', say: 'TEG-nawp' },
      { hu: 'most', en: 'now', say: 'mosht' },
      { hu: 'nap', en: 'day / sun', say: 'nawp' },
      { hu: 'hét', en: 'week / seven', say: 'hayt' },
      { hu: 'hónap', en: 'month', say: 'HOH-nawp' },
      { hu: 'év', en: 'year', say: 'ayv' },
      { hu: 'reggel', en: 'morning', say: 'REG-gel' },
      { hu: 'este', en: 'evening', say: 'ESH-teh' },
      { hu: 'éjszaka', en: 'night', say: 'AYY-saw-kaw' },
      { hu: 'óra', en: 'hour / clock', say: 'OH-raw' },
    ],
  },
  {
    id: 'places',
    title: 'Places & Travel',
    hu: 'Helyek',
    icon: '🚋',
    color: '#bf5f82',
    words: [
      { hu: 'város', en: 'city', say: 'VAH-rosh' },
      { hu: 'falu', en: 'village', say: 'FAW-loo' },
      { hu: 'utca', en: 'street', say: 'OOT-tsaw' },
      { hu: 'bolt', en: 'shop', say: 'bolt' },
      { hu: 'iskola', en: 'school', say: 'EESH-ko-law' },
      { hu: 'kórház', en: 'hospital', say: 'KOHR-hahz' },
      { hu: 'vonat', en: 'train', say: 'VO-nawt' },
      { hu: 'busz', en: 'bus', say: 'boos' },
      { hu: 'autó', en: 'car', say: 'OW-toh' },
      { hu: 'repülőtér', en: 'airport', say: 'REH-pue-lur-tayr' },
      { hu: 'állomás', en: 'station', say: 'AHL-lo-mahsh' },
      { hu: 'piac', en: 'market', say: 'PEE-awts' },
    ],
  },
  {
    id: 'verbs',
    title: 'Everyday Verbs',
    hu: 'Igék',
    icon: '🏃',
    color: '#7a8b3f',
    words: [
      { hu: 'lenni', en: 'to be', say: 'LEN-nee' },
      { hu: 'menni', en: 'to go', say: 'MEN-nee' },
      { hu: 'jönni', en: 'to come', say: 'YURN-nee' },
      { hu: 'enni', en: 'to eat', say: 'EN-nee' },
      { hu: 'inni', en: 'to drink', say: 'EEN-nee' },
      { hu: 'beszélni', en: 'to speak', say: 'BEH-sayl-nee' },
      { hu: 'érteni', en: 'to understand', say: 'AYR-teh-nee' },
      { hu: 'tudni', en: 'to know', say: 'TOOD-nee' },
      { hu: 'akarni', en: 'to want', say: 'AW-kawr-nee' },
      { hu: 'szeretni', en: 'to love / to like', say: 'SEH-ret-nee' },
      { hu: 'látni', en: 'to see', say: 'LAHT-nee' },
      { hu: 'dolgozni', en: 'to work', say: 'DOL-goz-nee' },
    ],
  },
];

// Flat lookup: every word gets a stable key so progress survives reordering.
const WORDS = [];
const BY_KEY = {};
for (const unit of UNITS) {
  unit.words.forEach((w, i) => {
    const word = { ...w, key: `${unit.id}:${i}`, unit: unit.id, unitTitle: unit.title };
    WORDS.push(word);
    BY_KEY[word.key] = word;
    unit.words[i] = word;
  });
}
