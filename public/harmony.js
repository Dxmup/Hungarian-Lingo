/* Vowel harmony and Hungarian number words.
 *
 * Extracted from app.js so the profile composer can reach the same rules the
 * drills use. One implementation, no drift — a second copy would eventually
 * produce a sentence that disagrees with what the app teaches, which is the
 * worst bug available here because the learner would trust it.
 *
 * Pure: nothing in this file reads state. Callers pass values in.
 */

// Hungarian suffixes obey vowel harmony, so a template written "___-ban" must
// become "1985-ben" when the filled year is read with front vowels. harmony()
// classifies digit strings by how the year is read aloud (…öt → front,
// …nyolc → back). Written-letter classification is a fallback only — foreign
// names can be spelled back but pronounced front (Cleveland), which is why
// every town slot uses the fixed "___ városában/városából" frame instead of
// a bare suffix.

const BACK_V = 'aáoóuú';
const FRONT_V = 'eéiíöőüű';
// Reading of a year's final element: ones digit, or the decade for …X0.
const DIGIT_H = { 1: 'f', 2: 'f', 3: 'b', 4: 'f', 5: 'f', 6: 'b', 7: 'f', 8: 'b', 9: 'f' };
const DECADE_H = { 1: 'f', 2: 'b', 3: 'b', 4: 'f', 5: 'f', 6: 'b', 7: 'f', 8: 'b', 9: 'f' };

function harmony(value) {
  const v = value.trim();
  const digits = v.match(/(\d+)\s*$/);
  if (digits) {
    const d = digits[1];
    const ones = Number(d[d.length - 1]);
    if (ones) return DIGIT_H[ones];
    const tens = Number(d[d.length - 2] || 0);
    if (tens) return DECADE_H[tens];
    // …00: kilencszáz (back) below 2000, kétezer (front) from 2000 up.
    return Number(d) >= 2000 ? 'f' : 'b';
  }
  for (let i = v.length - 1; i >= 0; i--) {
    const c = v[i].toLowerCase();
    if (BACK_V.includes(c)) return 'b';
    if (FRONT_V.includes(c)) return 'f';
  }
  return 'b';
}

const SUFFIX_PAIRS = { ban: 'ben', ból: 'ből', ba: 'be' };

function withSuffix(value, backForm) {
  // Only digit values take the suffix (1985-ben). A text value in a year slot
  // is an era phrase that carries its own grammar ("a háború után").
  if (!/\d\s*$/.test(value)) return value;
  const form = harmony(value) === 'b' ? backForm : SUFFIX_PAIRS[backForm];
  return `${value}-${form}`;
}

/* Counting words. Hungarian uses the short "két" rather than "kettő" before a
 * noun ("két gyerekem van"), and the noun stays singular after any numeral —
 * "két bátyám", never a plural. */
const NUM_WORD = [
  'nulla', 'egy', 'két', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc', 'tíz',
  'tizenegy', 'tizenkét', 'tizenhárom', 'tizennégy', 'tizenöt',
  'tizenhat', 'tizenhét', 'tizennyolc', 'tizenkilenc', 'húsz',
];

function numWord(n) { return NUM_WORD[n] ?? String(n); }

/* Ages are written as one word up to ten ("tízéves") and as two from eleven
 * ("tizenkét éves"). Getting this wrong is not a grammar error a learner would
 * hear, but it is one an official would see if they read the form. */
function ageWord(n) {
  const w = numWord(n);
  return n >= 1 && n <= 10 ? `${w}éves` : `${w} éves`;
}

/* "a" before a consonant, "az" before a vowel — needed when a composed
 * sentence puts an article in front of a value the learner chose. */
function article(word) {
  return /^[aáeéiíoóöőuúüű]/i.test(word.trim()) ? 'az' : 'a';
}

/* Join a list the Hungarian way: commas, then "és" before the last item. */
function joinHu(parts) {
  const xs = parts.filter(Boolean);
  if (xs.length <= 1) return xs[0] || '';
  return `${xs.slice(0, -1).join(', ')} és ${xs[xs.length - 1]}`;
}
