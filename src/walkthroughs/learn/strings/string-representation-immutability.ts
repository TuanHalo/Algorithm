import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** Rows: the characters we are given, the list buffer, then the finished string. */
const BUFFER_Y = 130;
const RESULT_Y = 260;

/** Letters travel as numbers so the trace can take them: 1 = a, 2 = b, …, 26 = z. */
const letter = (code: number): string => String.fromCharCode(96 + code);

interface BuildState {
  /** The characters of `chars`. */
  readonly chars: readonly string[];
  /** Index in `chars` that `ch` holds right now. */
  readonly at?: number;
  /** What `buffer` holds right now; `undefined` before line 2 runs. */
  readonly buffer?: readonly string[];
  /** True when the last buffer cell was just appended. */
  readonly fresh?: boolean;
  /** The string `"".join(buffer)` produced, once it exists. */
  readonly result?: readonly string[];
  /** The join's cells are being copied right now. */
  readonly copying?: boolean;
  readonly showVars?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: `chars` on top, `buffer` below it, the joined `result` at the bottom, variables on the right. */
function scene(s: BuildState): Entity[] {
  const n = s.chars.length;
  const entities: Entity[] = [];
  const charTones: Record<number, Tone> = {};
  if (s.at !== undefined) {
    for (let k = 0; k < s.at; k += 1) charTones[k] = 'done';
    charTones[s.at] = 'active';
  } else if (s.buffer && s.buffer.length === n) {
    for (let k = 0; k < n; k += 1) charTones[k] = 'done';
  }
  entities.push(arr('chars', 0, 0, s.chars, { label: 'chars', tones: charTones, codeVar: 'chars' }));
  if (s.at !== undefined) entities.push(ptr('ch', 'chars', s.at, 'ch', { side: 'top', tone: 'active', codeVar: 'ch' }));

  if (s.buffer && s.buffer.length > 0) {
    const bufTones: Record<number, Tone> = {};
    s.buffer.forEach((_, k) => {
      bufTones[k] = 'done';
    });
    if (s.fresh) bufTones[s.buffer.length - 1] = 'active';
    if (s.copying) s.buffer.forEach((_, k) => (bufTones[k] = 'compare'));
    entities.push(arr('buffer', 0, BUFFER_Y, s.buffer, { label: 'buffer', tones: bufTones, codeVar: 'buffer' }));
  }
  if (s.result) {
    const resTones: Record<number, Tone> = {};
    s.result.forEach((_, k) => (resTones[k] = s.copying ? 'compare' : 'found'));
    entities.push(arr('result', 0, RESULT_Y, s.result, { label: 'one string', tones: resTones }));
    if (s.copying) {
      entities.push(link('look', { entity: 'buffer', index: 0, side: 'bottom' }, { entity: 'result', index: 0, side: 'top' }, { label: 'copy each once', tone: 'compare', flow: true }));
    }
  }
  if (s.showVars) {
    entities.push(
      vars(
        'vals',
        tableBesideArray(n, 3),
        0,
        [
          { name: 'ch', value: s.at === undefined ? '—' : `'${s.chars[s.at]}'`, tone: s.at === undefined ? 'muted' : 'default' },
          { name: 'len(buffer)', value: s.buffer?.length ?? 0, tone: s.buffer ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 200 },
      ),
    );
  }
  if (s.note) {
    const y = s.result ? 380 : s.buffer && s.buffer.length > 0 ? 260 : 130;
    entities.push(note('note', 0, y, s.note, { tone: s.noteTone ?? 'note' }));
  }
  return entities;
}

const quote = (cells: readonly string[]): string => `"${cells.join('')}"`;

/** Runs build_string on any letters and records one step per decision (chapter "run", final code). */
function traceBuild(codes: readonly number[]): Step[] {
  const chars = codes.map(letter);
  const n = chars.length;
  const steps: Step[] = [];
  let appends = 0;
  let copied = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ appends, copied, result });

  steps.push({
    chapter: 'run',
    short: 'Empty buffer',
    title: `Start with an empty list for ${quote(chars)}`,
    body: `Line 2: \`buffer = []\`, an empty list we can change freely. Line 3 will hand us the ${n} characters one by one.`,
    code: { view: 'final', lines: [2] },
    values: { 2: 'buffer = []' },
    metrics: metrics(),
    scene: { entities: scene({ chars, showVars: true, buffer: [], note: 'buffer = []\nnothing copied yet' }) },
  });

  const buffer: string[] = [];
  chars.forEach((ch, i) => {
    steps.push({
      chapter: 'run',
      short: `ch = ${ch}`,
      title: `Read '${ch}' (index ${i})`,
      body: `Line 3: \`ch = '${ch}'\`, character ${i + 1} of ${n}.`,
      code: { view: 'final', lines: [3] },
      values: { 3: `ch = '${ch}'` },
      metrics: metrics(),
      scene: { entities: scene({ chars, at: i, showVars: true, buffer: [...buffer] }) },
    });
    buffer.push(ch);
    appends += 1;
    steps.push({
      chapter: 'run',
      short: `Append ${ch}`,
      title: `Append '${ch}': the list grows in place`,
      body: `Line 4: \`buffer.append('${ch}')\` writes into the next free slot. The characters already in \`buffer\` are not copied, so this costs the same however long the list is.`,
      code: { view: 'final', lines: [4] },
      values: { 4: `buffer = ${JSON.stringify(buffer).replaceAll('"', "'")}` },
      metrics: metrics(),
      scene: { entities: scene({ chars, at: i, showVars: true, buffer: [...buffer], fresh: true }) },
    });
  });

  steps.push({
    chapter: 'run',
    short: 'Loop done',
    title: `All ${n} characters are in the buffer`,
    body: `Line 3 has no characters left, so the loop ends after ${appends} appends. \`buffer\` is a list, not a string yet.`,
    code: { view: 'final', lines: [3] },
    values: { 3: 'loop done' },
    metrics: metrics(),
    scene: { entities: scene({ chars, showVars: true, buffer: [...buffer] }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Measure',
    title: `join measures first: ${n} characters in total`,
    body: `Line 5: \`"".join(buffer)\` adds up the lengths of all pieces before it copies anything. It then asks for **one** block of exactly ${n} characters.`,
    code: { view: 'final', lines: [5] },
    values: { 5: `total length = ${n}` },
    metrics: metrics(),
    scene: { entities: scene({ chars, showVars: true, buffer: [...buffer], note: `total length = ${n}\none allocation, no resizing` }) },
  });
  copied = n;
  steps.push({
    chapter: 'run',
    short: 'Copy once',
    title: `Copy each character once into the new string`,
    body: `Still line 5: join walks \`buffer\` a single time and copies each of the ${n} characters into the block. That is ${n} copies in total, where \`+=\` would have made ${(n * (n + 1)) / 2}.`,
    code: { view: 'final', lines: [5] },
    values: { 5: `${n} characters copied` },
    metrics: metrics(),
    scene: { entities: scene({ chars, showVars: true, buffer: [...buffer], result: [...chars], copying: true }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${quote(chars)}`,
    body: `Line 5 hands back the finished string. Strings are immutable, so from now on it can never change: that is what makes it safe as a dictionary key.`,
    code: { view: 'final', lines: [5] },
    values: { 5: `return ${quote(chars)}` },
    metrics: metrics(quote(chars)),
    scene: { entities: scene({ chars, showVars: true, buffer: [...buffer], result: [...chars], note: `${appends} appends + ${n} copies\n→ about 2n work, O(n)`, noteTone: 'found' }) },
  });
  return steps;
}

const WORD = [8, 5, 12, 12, 15] as const;
const STORY = WORD.map(letter);
const RUN = traceBuild(WORD);
const startMetrics = { appends: 0, copied: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;

export default defineWalkthrough({
  id: 'learn/strings/string-representation-immutability',
  title: 'Strings are immutable: collect in a list, join once',
  summary: 'From the idea to the code: why changing a string means copying it, why `+=` in a loop is quadratic, and how a list buffer plus one join makes it linear.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def build_string(chars: list[str]) -> str:
    buffer: list[str] = []
    for ch in chars:
        buffer.append(ch)  # Amortized O(1): the list changes in place
    return "".join(buffer)  # One allocation, one linear pass`,
  },
  snapshots: {
    brute: `def build_string(chars: list[str]) -> str:
    result = ""
    for ch in chars:
        result += ch  # Immutable: builds a brand-new string each time
    return result`,
  },
  metrics: [
    { key: 'appends', label: 'List appends' },
    { key: 'copied', label: 'Chars copied' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'character being handled' },
    { tone: 'done', label: 'already in the buffer' },
    { tone: 'compare', label: 'being copied' },
    { tone: 'found', label: 'finished string' },
  ],
  goals: [
    { text: 'See why `+=` on a string is quadratic', step: 2 },
    { text: 'Collect pieces in a list instead', step: 3 },
    { text: 'Follow every append and the single join', step: 7 },
    { text: 'Know why join happens once, at the end', step: 22 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Build "hello" from its five characters',
      body: 'A Python string is a **stone tablet**: `s[0] = "j"` raises a `TypeError`. To "change" a letter you carve a whole new tablet and copy everything onto it.\n\nLine 1 takes a list of characters and returns them as one string. The question is how many copies that costs.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ chars: STORY }) },
    },
    {
      chapter: 'idea',
      short: 'Plus-equals',
      title: 'The obvious way: result += ch',
      body: 'Line 4 of the naive version looks like an edit, but `result` is immutable. Each `+=` allocates a new string and copies every earlier character into it.\n\nCopies grow as 1 + 2 + … + n, which is **`O(n²)`**. At n = 100,000 that is about five billion character copies.',
      code: { view: 'snapshot', id: 'brute', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ chars: STORY, note: 'result += ch copies the whole string\n1 + 2 + 3 + 4 + 5 = 15 copies\n→ O(n²) for n characters', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'List + join',
      title: 'Change a list instead, convert once',
      body: 'A list **is** mutable, and `append` writes into a spare slot without touching the rest. So collect the pieces in a list and let `"".join` build the string a single time at the end.\n\nThat copies each character once: **`O(n)`**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ chars: STORY, note: 'append in place → no copying\njoin once at the end → n copies' }) },
    },
    {
      chapter: 'build',
      short: 'Buffer',
      title: 'Line 2: an empty list to collect into',
      body: 'Line 2 creates `buffer`, the mutable workspace. The type hint says it holds strings.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['buffer = []'],
      scene: { entities: scene({ chars: STORY, showVars: true, buffer: [], note: 'buffer = []' }) },
    },
    {
      chapter: 'build',
      short: 'Append',
      title: 'Lines 3–4: append every character',
      body: 'Line 3 visits each character and line 4 appends it. Python over-allocates spare slots, so an append is **amortized `O(1)`**: the list is changed in place and nothing already stored is copied.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['for ch in chars', 'buffer.append(ch)'],
      scene: { entities: scene({ chars: STORY, showVars: true, buffer: [...STORY] }) },
    },
    {
      chapter: 'build',
      short: 'Join',
      title: 'Line 5: one join builds the string',
      body: '`"".join(buffer)` adds up the lengths, allocates **one** block of exactly that size and copies each piece once. Then line 5 returns the string.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [5] },
      metrics: startMetrics,
      changes: ['return "".join(buffer)'],
      scene: { entities: scene({ chars: STORY, showVars: true, buffer: [...STORY], result: [...STORY], note: 'join: measure, allocate once,\ncopy each character once' }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Linear time, linear space',
      body: 'Each of the n characters is appended once and copied once by `join`: **`O(n)` time**. The buffer and the finished string each hold n characters: **`O(n)` space**.\n\nReading `s[i]` stays `O(1)`, while a slice `s[i:j]` copies its `k = j − i` characters.',
      code: { view: 'final', lines: [3, 4, 5] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ chars: STORY, showVars: true, buffer: [...STORY], result: [...STORY], note: 'n appends + n copies → O(n) time\nbuffer + string → O(n) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Join once',
      title: 'Why join comes after the loop',
      body: 'Strings can’t change, so every string you make costs a full copy. Joining **inside** the loop would rebuild the string n times, the same `O(n²)` trap as `+=`.\n\nThat is the key decision: keep mutating the cheap list on line 4 and convert to a string exactly once, on line 5.',
      code: { view: 'final', lines: [4, 5] },
      values: { 4: 'cheap: list changes in place', 5: 'once: one full copy' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ chars: STORY, showVars: true, buffer: [...STORY], result: [...STORY], note: 'mutate the list as often as you like\nconvert to str once, at the end', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Build a string from your own letters',
    inputs: [{ name: 'letters', label: 'Letters as numbers (1 = a, 2 = b, … 26 = z)', kind: 'numbers', default: '8, 5, 12, 12, 15' }],
    presets: [
      { label: 'One letter', values: { letters: '3' } },
      { label: 'Repeated letter', values: { letters: '24, 24, 24, 24, 24, 24' } },
      { label: 'A to J', values: { letters: '1, 2, 3, 4, 5, 6, 7, 8, 9, 10' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['letters'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one letter.');
      if (input.some((v) => !Number.isInteger(v) || v < 1 || v > 26)) throw new Error('Use whole numbers from 1 (a) to 26 (z).');
      return traceBuild(input);
    },
  },
});
