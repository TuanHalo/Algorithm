import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const OPS_Y = 130;
const VARS_Y = 270;
const NOTE_X = 250;
const BITS = 10;
const HASHES = 3;

interface BloomState {
  readonly bits: readonly number[];
  /** Keys to add, then keys to ask about. */
  readonly ops: readonly number[];
  readonly adds: number;
  /** Per query index (`ops` index − adds): `yes` or `no`, once answered. */
  readonly answers?: readonly ('yes' | 'no' | 'false-yes')[];
  readonly at?: number;
  readonly key?: number;
  readonly h1?: number;
  readonly h2?: number;
  readonly positions?: readonly number[];
  /** Position being written or read. */
  readonly pos?: number;
  readonly posTone?: Tone;
  /** Positions already read as 1 in the current query. */
  readonly passed?: readonly number[];
  readonly look?: { readonly label: string; readonly tone: Tone; readonly flow?: boolean };
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
}

const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
const hashPair = (key: number): [number, number] => [key % BITS, 1 + (key % (BITS - 1))];
const positionsOf = (key: number): number[] => {
  const [h1, h2] = hashPair(key);
  return Array.from({ length: HASHES }, (_, i) => (h1 + i * h2) % BITS);
};

/** Scene: the bit array, the keys to add and ask about, and the variables. */
function scene(s: BloomState): Entity[] {
  const tones: Record<number, Tone> = {};
  s.bits.forEach((b, i) => (tones[i] = b === 1 ? 'done' : 'default'));
  for (const p of s.positions ?? []) tones[p] = 'compare';
  for (const p of s.passed ?? []) tones[p] = 'found';
  if (s.pos !== undefined) tones[s.pos] = s.posTone ?? 'active';
  const entities: Entity[] = [arr('bits', 0, 0, [...s.bits], { label: 'bits', tones, codeVar: 'bits' })];
  if (s.pos !== undefined) entities.push(ptr('pos', 'bits', s.pos, 'pos', { side: 'top', tone: s.posTone ?? 'active', codeVar: 'pos' }));
  const oTones: Record<number, Tone> = {};
  s.ops.forEach((_, i) => {
    if (i < s.adds) oTones[i] = s.at !== undefined && i < s.at ? 'done' : s.at === undefined ? 'default' : 'default';
    else {
      const a = s.answers?.[i - s.adds];
      oTones[i] = a === 'yes' ? 'found' : a === 'false-yes' ? 'miss' : a === 'no' ? 'done' : 'default';
    }
  });
  if (s.at !== undefined) oTones[s.at] = oTones[s.at] === 'default' || oTones[s.at] === undefined ? 'active' : (oTones[s.at] as Tone);
  if (s.ops.length > 0) entities.push(arr('keys', 0, OPS_Y, s.ops, { label: `add ${s.adds}, then ask ${s.ops.length - s.adds}`, tones: oTones }));
  if (s.at !== undefined) entities.push(ptr('cursor', 'keys', s.at, 'key', { side: 'bottom', tone: 'active', codeVar: 'key' }));
  if (!s.bare) {
    const rows: VarRow[] = [
      { name: 'key', value: dash(s.key), tone: mute(s.key) },
      { name: 'h1', value: dash(s.h1), tone: mute(s.h1) },
      { name: 'h2', value: dash(s.h2), tone: mute(s.h2) },
      { name: 'pos', value: dash(s.pos), tone: mute(s.pos) },
    ];
    entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));
  }
  if (s.look && s.pos !== undefined) {
    entities.push(link('look', { entity: 'vals', key: 'pos' }, { entity: 'bits', index: s.pos, side: 'bottom' }, { tone: s.look.tone, label: s.look.label, flow: s.look.flow ?? false, dashed: s.look.tone === 'miss' }));
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y + 10, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Adds every key, then asks about every query, one step per decision (chapter "run", final code). */
function traceBloom(adds: readonly number[], queries: readonly number[]): Step[] {
  const steps: Step[] = [];
  const bits: number[] = new Array<number>(BITS).fill(0);
  const ops = [...adds, ...queries];
  const stored = new Set(adds);
  const answers: ('yes' | 'no' | 'false-yes')[] = [];
  let checks = 0;
  const said: string[] = [];
  const metrics = (): Record<string, string | number> => ({ ones: bits.filter((b) => b === 1).length, checks, result: said.length === 0 ? '—' : said.join(' · ') });
  const frame = (extra: Partial<BloomState>): Entity[] => scene({ bits: [...bits], ops, adds: adds.length, answers: [...answers], ...extra });
  const push = (s: Omit<Step, 'chapter' | 'code' | 'metrics' | 'scene'> & { lines: number[]; entities: Entity[] }): void => {
    const { lines, entities, ...rest } = s;
    steps.push({ ...rest, chapter: 'run', code: { view: 'final', lines }, metrics: metrics(), scene: { entities } });
  };

  push({
    short: 'Create',
    title: `BloomFilter(): ${BITS} bits, all 0`,
    body: `Lines 2–4 make an array of ${BITS} bits, all 0, and remember to use ${HASHES} positions per key. There is no list of keys, only bits.`,
    lines: [2, 3, 4],
    values: { 3: `bits = [0] * ${BITS}`, 4: `hashes = ${HASHES}` },
    entities: frame({}),
  });

  /** The two steps shared by `add` and `contains`: `h1, h2` then the positions. */
  const positionSteps = (key: number, at: number, caller: number): number[] => {
    const [h1, h2] = hashPair(key);
    const pos = positionsOf(key);
    push({
      short: 'h1, h2',
      title: `Two hashes of ${key}: h1 = ${h1}, h2 = ${h2}`,
      body: `Line ${caller} asks \`_positions(${key})\`. Line 7: \`m = ${BITS}\`. Line 8: \`h1 = ${key} % ${BITS} = ${h1}\` and \`h2 = 1 + ${key} % ${BITS - 1} = ${h2}\`. \`h2\` is never 0, so every step moves.`,
      lines: [caller, 7, 8],
      values: { 7: `m = ${BITS}`, 8: `h1 = ${h1}, h2 = ${h2}` },
      entities: frame({ at, key, h1, h2 }),
    });
    push({
      short: 'Positions',
      title: `${key} maps to positions ${pos.join(', ')}`,
      body: `Line 10 turns the pair into ${HASHES} positions: \`(h1 + i × h2) % ${BITS}\` for \`i = 0, 1, 2\`, which is ${pos.map((p, i) => `(${h1} + ${i}×${h2}) % ${BITS} = ${p}`).join(', ')}.`,
      lines: [10],
      values: { 10: `[${pos.join(', ')}]` },
      entities: frame({ at, key, h1, h2, positions: pos }),
    });
    return pos;
  };

  adds.forEach((key, at) => {
    const pos = positionSteps(key, at, 13);
    pos.forEach((p) => {
      const was = bits[p] ?? 0;
      bits[p] = 1;
      push({
        short: `set ${p}`,
        title: was === 1 ? `Bit ${p} was already 1` : `Set bit ${p} to 1`,
        body: was === 1 ? `Line 13: \`pos = ${p}\`. Line 14 writes a 1, but bit ${p} was already on (set by another key, or earlier by this one). Bits are shared, which is where false alarms come from.` : `Line 13: \`pos = ${p}\`. Line 14: \`bits[${p}] = 1\`.`,
        lines: [13, 14],
        values: { 13: `pos = ${p}`, 14: `bits[${p}] = 1` },
        changes: [`bits[${p}] = 1`],
        entities: frame({ at, key, positions: pos, pos: p, posTone: was === 1 ? 'miss' : 'active' }),
      });
    });
  });

  queries.forEach((key, qi) => {
    const at = adds.length + qi;
    const pos = positionSteps(key, at, 17);
    const passed: number[] = [];
    let ok = true;
    for (const p of pos) {
      checks += 1;
      const v = bits[p] ?? 0;
      if (v === 1) {
        passed.push(p);
        push({
          short: `bit ${p}`,
          title: `bits[${p}] is 1: keep checking`,
          body: `Line 17: \`bits[${p}]\` is 1, so far consistent with ${key} being in the set. \`all(...)\` goes on to the next position.`,
          lines: [17],
          values: { 17: `bits[${p}] = 1` },
          entities: frame({ at, key, positions: pos, passed: passed.slice(0, -1), pos: p, posTone: 'found', look: { label: `${p} → 1`, tone: 'found', flow: true } }),
        });
      } else {
        ok = false;
        push({
          short: `bit ${p}`,
          title: `bits[${p}] is 0: ${key} is definitely not here`,
          body: `Line 17: \`bits[${p}]\` is 0. If ${key} had been added, this bit would be 1, and bits are never reset. \`all(...)\` stops at once.`,
          lines: [17],
          values: { 17: `bits[${p}] = 0` },
          entities: frame({ at, key, positions: pos, passed: [...passed], pos: p, posTone: 'miss', look: { label: `${p}? no`, tone: 'miss' } }),
        });
        break;
      }
    }
    const truth = stored.has(key);
    const answer: 'yes' | 'no' | 'false-yes' = !ok ? 'no' : truth ? 'yes' : 'false-yes';
    answers.push(answer);
    said.push(`${key}: ${ok ? 'yes' : 'no'}`);
    push({
      short: ok ? 'Return True' : 'Return False',
      title: !ok ? `contains(${key}) returns False: definitely not` : truth ? `contains(${key}) returns True: it was added` : `contains(${key}) returns True: a false positive`,
      body: !ok
        ? `Line 17 returns **False**. A \`False\` answer is always right: there are no false negatives.`
        : truth
          ? `All ${HASHES} bits are 1, so line 17 returns **True**. ${key} really was added, so this answer is right.`
          : `All ${HASHES} bits are 1, so line 17 returns **True**, yet ${key} was **never added**. Other keys happened to set exactly these bits: a **false positive**.`,
      lines: [17],
      values: { 17: ok ? 'return True' : 'return False' },
      changes: [`return ${ok ? 'True' : 'False'}`],
      entities: frame({
        at,
        key,
        positions: pos,
        passed: ok ? [...passed] : [],
        answers: [...answers],
        ...(ok && !truth ? { note: `${key} was never added\nbut all its bits are 1`, noteTone: 'miss' as Tone } : {}),
      }),
    });
  });
  return steps;
}

const ADDS = [7, 12] as const;
const QUERIES = [2, 6, 7] as const;
const RUN = traceBloom(ADDS, QUERIES);
const START = { ones: 0, checks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? START;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BUILD_END = 1 + 3 + 5;
const END_BITS = [1, 0, 1, 1, 0, 1, 1, 1, 0, 0];

export default defineWalkthrough({
  id: 'learn/hashing/bloom-filter',
  title: 'Bloom Filter, a tiny set that may say maybe',
  summary: 'From the problem to the idea to the code: remember keys in a few shared bits, answer "definitely not" or "probably yes", and see why false alarms happen but misses never do.',
  minutes: 11,
  code: {
    lang: 'python',
    source: `class BloomFilter:
    def __init__(self, bits: int = 10, hashes: int = 3) -> None:
        self.bits = [0] * bits
        self.hashes = hashes

    def _positions(self, key: int) -> list[int]:
        m = len(self.bits)
        h1, h2 = key % m, 1 + key % (m - 1)
        # Double hashing: two hashes imitate several hash functions
        return [(h1 + i * h2) % m for i in range(self.hashes)]

    def add(self, key: int) -> None:
        for pos in self._positions(key):
            self.bits[pos] = 1

    def contains(self, key: int) -> bool:
        return all(self.bits[pos] for pos in self._positions(key))`,
  },
  snapshots: {
    hashset: `def contains(keys: set[int], key: int) -> bool:
    return key in keys  # Stores every key: memory grows with n`,
  },
  metrics: [
    { key: 'ones', label: 'Bits set' },
    { key: 'checks', label: 'Bits read' },
    { key: 'result', label: 'Answers' },
  ],
  legend: [
    { tone: 'active', label: 'current key / bit' },
    { tone: 'compare', label: 'positions of the key' },
    { tone: 'done', label: 'bit is 1 / key added' },
    { tone: 'miss', label: 'bit is 0 / false positive' },
    { tone: 'found', label: 'bit read as 1 / true yes' },
  ],
  goals: [
    { text: 'See why storing every key costs memory', step: 2 },
    { text: 'Share a few bits between all keys', step: 3 },
    { text: 'Know why a miss is certain but a hit is not', step: 4 },
    { text: 'Follow every add and every question', step: BUILD_END + 1 },
    { text: 'Know why a False answer can be trusted', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Ask “have I seen this?” with almost no memory',
      body: 'We add keys `7` and `12`, then ask about `2`, `6` and `7`. A normal set would store the keys themselves, which is too much for millions of URLs or rows.\n\nA **Bloom filter** keeps only 10 bits and answers `contains(key)` with **definitely not** or **probably yes**.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ bits: new Array<number>(BITS).fill(0), ops: [...ADDS, ...QUERIES], adds: ADDS.length, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Store keys',
      title: 'The obvious way: remember every key',
      body: 'A hash set answers exactly, but `key in keys` (line 2) needs every key stored.\n\nBillions of keys mean gigabytes. We would rather pay a little accuracy for a lot less memory.',
      code: { view: 'snapshot', id: 'hashset', lines: [2] },
      metrics: START,
      scene: { entities: [arr('keys', 0, 0, [7, 12, 21, 33, 48, 95], { label: 'every key kept', tones: { 0: 'compare', 1: 'compare', 2: 'compare', 3: 'compare', 4: 'compare', 5: 'compare' } }), note('note', 0, VARS_Y - 130, 'memory grows with every key\nn keys → O(n) space', { tone: 'miss' })] },
    },
    {
      chapter: 'idea',
      short: 'Shared bits',
      title: 'Let each key switch on a few shared bits',
      body: 'Hash a key to `k = 3` positions in a bit array (`7 → 7, 5, 3`) and set those bits to 1. To ask about a key, look at **its** 3 bits.\n\nThe positions come from two hashes: `position i = (h1 + i × h2) % m`, so one pair `h1, h2` stands in for 3 hash functions.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ bits: [0, 0, 0, 1, 0, 1, 0, 1, 0, 0], ops: [7], adds: 1, positions: [7, 5, 3], note: '7 → positions 7, 5, 3\nthose three bits become 1', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'False alarms',
      title: 'A 0 is proof; all 1s are only a hint',
      body: 'If any of a key’s bits is **0**, the key was never added (an added key turns all its bits on, and bits never go back to 0). That answer is certain.\n\nIf all its bits are 1, other keys may have switched them on, so the answer is only **probably yes**: a **false positive**. More keys added means more 1s, so more false alarms.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ bits: END_BITS, ops: [...ADDS, ...QUERIES], adds: ADDS.length, positions: [6, 3, 0], note: '6 was never added, but bits\n6, 3 and 0 were set by 7 and 12', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Bits',
      title: 'Lines 1–4: a row of zeros',
      body: 'The constructor makes `bits` zeros and remembers how many positions each key uses (`hashes`).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: START,
      changes: ['self.bits = [0] * bits', 'self.hashes = hashes'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Two hashes',
      title: 'Lines 6–8: h1 and h2',
      body: 'Line 7 reads the array size `m`. Line 8 makes two hashes of the key: `h1` is the home position and `h2` is the step size. Adding 1 to `key % (m − 1)` keeps `h2` from being 0.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [7, 8] },
      metrics: START,
      changes: ['m = len(self.bits)', 'h1, h2 = key % m, 1 + key % (m - 1)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Positions',
      title: 'Lines 9–10: k positions from one pair',
      body: 'Line 10 is the formula from the idea: `(h1 + i * h2) % m` for each `i` below `hashes`. The comment says why one pair is enough.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10], lines: [10] },
      metrics: START,
      changes: ['[(h1 + i * h2) % m for i in range(self.hashes)]'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'add',
      title: 'Lines 12–14: switch the key’s bits on',
      body: '`add` walks the key’s positions and writes a 1 in each. It never writes a 0, so a bit once on stays on.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14], lines: [13, 14] },
      metrics: START,
      changes: ['for pos in self._positions(key)', 'self.bits[pos] = 1'],
      scene: at(find('set 7')),
    },
    {
      chapter: 'build',
      short: 'contains',
      title: 'Lines 16–17: are all its bits on?',
      body: '`all(...)` returns `True` only if **every** position holds a 1, and it stops at the first 0 it meets. One 0 means the key was never added.\n\nThat is the whole class. Now let’s run it.',
      code: { view: 'final', lines: [16, 17] },
      metrics: START,
      changes: ['return all(self.bits[pos] for pos in self._positions(key))'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Constant time, tiny memory',
      body: 'Both `add` and `contains` hash once and touch **k** bits: **`O(k)`** time, independent of how many keys are stored. The filter uses `O(m)` bits, about 10 bits per key for a 1% false-positive rate, far less than the keys themselves.\n\nThe price is false positives. It cannot list keys, and standard filters cannot delete.',
      code: { view: 'final', lines: [10, 13, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ bits: END_BITS, ops: [...ADDS, ...QUERIES], adds: ADDS.length, answers: ['no', 'false-yes', 'yes'], note: 'time   O(k) per key\nspace  O(m) bits\nrisk   false positives', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Never reset',
      title: 'Why a False answer can be trusted',
      body: 'Line 14 only ever writes **1**. An added key turns on all its bits, and nothing turns them off, so every added key will find all its bits on. A key with a **0** bit cannot have been added.\n\nThat is the key decision: the filter may be wrong by saying yes, but it **never** says no to a key that was added.',
      code: { view: 'final', lines: [14, 17] },
      values: { 14: 'only 1s are ever written', 17: 'a single 0 proves absence' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ bits: END_BITS, ops: [...ADDS, ...QUERIES], adds: ADDS.length, answers: ['no', 'false-yes', 'yes'], positions: [2, 5, 8], pos: 8, posTone: 'miss', note: '2 → bits 2, 5, 8: bit 8 is 0\nso 2 was never added', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Add your own keys, then ask the filter',
    inputs: [
      { name: 'adds', label: 'Keys to add', kind: 'numbers', default: '7, 12' },
      { name: 'queries', label: 'Keys to ask about', kind: 'numbers', default: '2, 6, 7' },
    ],
    presets: [
      { label: 'Lesson example', values: { adds: '7, 12', queries: '2, 6, 7' } },
      { label: 'False positive', values: { adds: '7, 12', queries: '6' } },
      { label: 'No false negative', values: { adds: '7, 12', queries: '12, 7' } },
      { label: 'Definitely not', values: { adds: '7, 12', queries: '2, 4' } },
      { label: 'Shared bit', values: { adds: '22', queries: '22' } },
    ],
    maxItems: 4,
    run: (values) => {
      const adds = values['adds'];
      const queries = values['queries'];
      if (!Array.isArray(adds) || !Array.isArray(queries) || adds.length === 0 || queries.length === 0) throw new Error('Enter some keys to add and some to ask about.');
      if ([...adds, ...queries].some((k) => k < 0)) throw new Error('Use keys from 0 upwards.');
      return traceBloom(adds, queries);
    },
  },
});
