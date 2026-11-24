import { arr, defineWalkthrough, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const NUM_Y = 130;
const UNIQUE_Y = 260;
const NOTE_Y = 480;

/** `pick`: line 4 took `num`. `xor`: line 6 folded it into `unique`. `exit`: the loop is over. */
type Stage = 'start' | 'pick' | 'xor' | 'exit';

interface XorState {
  readonly values: readonly number[];
  /** Number of bit columns drawn (4 up to 8, enough for the biggest value). */
  readonly width: number;
  readonly stage?: Stage;
  /** Index in `values` of `num`. */
  readonly i?: number;
  /** `unique` as shown (after the XOR once stage is `xor`). */
  readonly unique: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
}

const widthOf = (values: readonly number[]): number => Math.min(8, Math.max(4, Math.max(...values).toString(2).length));
const places = (width: number): number[] => Array.from({ length: width }, (_, k) => 1 << (width - 1 - k));
const bits = (n: number, width: number): number[] => places(width).map((p) => ((n & p) !== 0 ? 1 : 0));
const binary = (n: number, width: number): string => bits(n, width).join('');

/** Scene for one moment: nums on top, the current value and `unique` as rows of bits, and the variables. */
function scene(s: XorState): Entity[] {
  const { width, values, stage, i } = s;
  const cellTones: Record<number, Tone> = {};
  values.forEach((_, k) => {
    if (stage === 'exit' || (i !== undefined && k < i)) cellTones[k] = 'done';
  });
  if (i !== undefined && (stage === 'pick' || stage === 'xor')) cellTones[i] = 'active';

  const entities: Entity[] = [arr('nums', 0, 0, values, { label: 'nums', tones: cellTones, codeVar: 'nums' })];
  const num = i === undefined ? undefined : values[i];
  if (i !== undefined && num !== undefined && (stage === 'pick' || stage === 'xor')) {
    entities.push(ptr('num', 'nums', i, 'num', { side: 'top', tone: 'active', codeVar: 'num' }));
    const numTones: Record<number, Tone> = {};
    const uniqueTones: Record<number, Tone> = {};
    if (stage === 'xor') {
      bits(num, width).forEach((bit, k) => {
        if (bit === 1) {
          numTones[k] = 'compare';
          uniqueTones[k] = 'compare';
        }
      });
    }
    entities.push(arr('num-bits', 0, NUM_Y, bits(num, width), { label: 'num', tones: numTones, indexLabels: places(width), codeVar: 'num' }));
    entities.push(arr('unique', 0, UNIQUE_Y, bits(s.unique, width), { label: 'unique', tones: uniqueTones, indexLabels: places(width), codeVar: 'unique' }));
  } else {
    const tones: Record<number, Tone> = {};
    if (stage === 'exit') bits(s.unique, width).forEach((_, k) => (tones[k] = 'found'));
    entities.push(arr('unique', 0, UNIQUE_Y, bits(s.unique, width), { label: 'unique', tones, indexLabels: places(width), codeVar: 'unique' }));
  }
  if (!s.bare) {
    entities.push(
      vars(
        'vals',
        tableBesideArray(Math.max(values.length, width), 2),
        0,
        [
          { name: 'num', value: stage === 'pick' || stage === 'xor' ? (num ?? '—') : '—', tone: stage === 'pick' || stage === 'xor' ? 'default' : 'muted' },
          { name: 'unique', value: s.unique, tone: stage === 'exit' ? 'found' : 'default' },
        ],
        { label: 'variables', width: 190 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the XOR fold on any list and records one step per decision (chapter "run", final code). */
function traceXor(values: readonly number[]): Step[] {
  const steps: Step[] = [];
  const width = widthOf(values);
  let unique = 0;
  let xors = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ xors, ones: bits(unique, width).filter((bit) => bit === 1).length, result });
  const base = { values, width } as const;

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `${values.length} number${values.length === 1 ? '' : 's'}: start from 0`,
    body: `Line 2 sets \`unique = 0\`, every switch off (\`${binary(0, width)}\`). Zero is the right start because XOR with 0 changes nothing.`,
    code: { view: 'final', lines: [2] },
    values: { 2: 'unique = 0' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, stage: 'start', unique }) },
  });

  values.forEach((x, i) => {
    steps.push({
      chapter: 'run',
      short: `num = ${x}`,
      title: `Take num = ${x}`,
      body: `Line 4 takes \`nums[${i}] = ${x}\`, which is \`${binary(x, width)}\`.`,
      code: { view: 'final', lines: [4] },
      values: { 4: `num = ${x}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, stage: 'pick', i, unique }) },
    });

    const before = unique;
    unique ^= x;
    xors += 1;
    const twins = values.slice(0, i).filter((v) => v === x).length;
    steps.push({
      chapter: 'run',
      short: `unique ${unique}`,
      title: `${before} ^ ${x} = ${unique}`,
      body: `Line 6 flips the columns of \`unique\` where \`num\` has a 1 (blue): \`${binary(before, width)} ^ ${binary(x, width)} = ${binary(unique, width)}\`. ${twins % 2 === 1 ? `This ${x} has an earlier twin: it flips the same columns back, so the pair cancels.` : `\`unique\` is now ${unique}.`}`,
      code: { view: 'final', lines: [6] },
      values: { 6: `unique = ${before} ^ ${x} = ${unique}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, stage: 'xor', i, unique, note: `${binary(before, width)} ^ ${binary(x, width)}\n= ${binary(unique, width)}` }) },
    });
  });

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${unique}`,
    body: `Line 4 has no values left, so the loop ends. Line 8 returns **${unique}**${unique === 0 ? ': every value found its partner, so nothing is left' : ''}.`,
    code: { view: 'final', lines: [4, 8] },
    values: { 8: `return ${unique}` },
    metrics: metrics(unique),
    scene: { entities: scene({ ...base, stage: 'exit', unique, note: `${values.join(' ^ ')}\n= ${unique}`, noteTone: 'found' }) },
  });
  return steps;
}

const NUMS = [4, 1, 2, 1, 2] as const;
const RUN = traceXor(NUMS);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { xors: 0, ones: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** problem 1 + idea 3 + build 4. */
const BUILD_END = 8;

export default defineWalkthrough({
  id: 'learn/bit-manipulation/xor-properties-applications',
  title: 'XOR: the pairs cancel themselves',
  summary: 'From the idea to the code: find the one number without a partner by XORing everything together, in one pass and with no extra memory.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def single_number(nums: list[int]) -> int:
    unique = 0

    for num in nums:
        # x ^ x = 0 and x ^ 0 = x, so every pair cancels itself
        unique ^= num

    return unique`,
  },
  snapshots: {
    seen: `def single_number_set(nums: list[int]) -> int:
    seen: set[int] = set()
    for num in nums:
        if num in seen:
            seen.remove(num)
        else:
            seen.add(num)
    return seen.pop()`,
  },
  metrics: [
    { key: 'xors', label: 'XORs' },
    { key: 'ones', label: '1s in unique' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'value num' },
    { tone: 'compare', label: 'columns flipped' },
    { tone: 'done', label: 'already XORed' },
    { tone: 'found', label: 'the answer' },
  ],
  goals: [
    { text: 'See what a set-based answer costs', step: 2 },
    { text: 'Learn the two XOR laws and why order is free', step: 3 },
    { text: 'Watch each XOR flip columns of unique', step: BUILD_END + 3 },
    { text: 'Know why one line finds the loner', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find the number without a partner',
      body: 'A hundred people press a light switch, and ninety-nine of them press it twice. Whoever pressed it once decides whether the light ends up on.\n\nLine 1 gets a list `nums` where every number appears **twice except one** and returns that one. Here: `[4, 1, 2, 1, 2]` gives 4.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ values: NUMS, width: 4, unique: 0, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Remember',
      title: 'The obvious way: remember what you saw',
      body: 'Lines 2–8 keep a set: a value that is already in it is removed, a new one is added. What stays is the loner.\n\nThe set can hold half of the values at once, so it needs **`O(n)` extra memory**.',
      code: { view: 'snapshot', id: 'seen', lines: [2, 4, 5, 7] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 0: 'compare', 1: 'compare', 2: 'compare', 3: 'compare' }, codeVar: 'nums' }),
          map('seen', tableBesideArray(5, 2), 0, 'seen', [
            { key: 4, value: 'in set', tone: 'miss' },
            { key: 2, value: 'in set', tone: 'miss' },
          ], { width: 190 }),
          note('note', 0, 150, 'after 4, 1, 2, 1: the set holds {4, 2}\nmemory grows with the input → O(n)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Two laws',
      title: 'XOR has two laws that do the remembering',
      body: 'XOR gives 1 where two bits differ. So `x ^ x = 0` (no column differs) and `x ^ 0 = x` (a 0 flips nothing).\n\nThe 5 below meets itself and every column cancels to `0000`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('law-a', 0, 0, bits(5, 4), { label: 'x = 5', indexLabels: places(4) }),
          arr('law-b', 0, NUM_Y, bits(5, 4), { label: 'x = 5', indexLabels: places(4) }),
          arr('law-r', 0, UNIQUE_Y, bits(0, 4), { label: 'x ^ x', indexLabels: places(4), tones: { 0: 'found', 1: 'found', 2: 'found', 3: 'found' } }),
          note('note', 0, NOTE_Y, 'x ^ x = 0: equal bits cancel\nx ^ 0 = x: zero changes nothing', { tone: 'note' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Any order',
      title: 'Order does not matter, so pairs meet anyway',
      body: 'XOR gives the same answer in any order and grouping. So we can regroup `4 ^ 1 ^ 2 ^ 1 ^ 2` to put each pair together.\n\nEach pair becomes 0, and `4 ^ 0 ^ 0` is just 4. We never need to know where the twins are.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 1: 'compare', 3: 'compare', 2: 'miss', 4: 'miss', 0: 'found' }, codeVar: 'nums' }),
          note('note', 0, 150, '4 ^ 1 ^ 2 ^ 1 ^ 2\n= 4 ^ (1 ^ 1) ^ (2 ^ 2)\n= 4 ^ 0 ^ 0 = 4', { tone: 'found' }),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Start at 0',
      title: 'Line 2: an empty tally',
      body: '`unique` starts at 0, the value that changes nothing when XORed. It will hold the XOR of everything seen so far.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['unique = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Line 4: visit every number',
      body: 'Every value has to be folded in, because we do not know which one is the loner. `num` is the value we hold now.',
      code: { view: 'reveal', reveal: [1, 2, 4], lines: [4] },
      metrics: startMetrics,
      changes: ['for num in nums'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Fold in',
      title: 'Lines 5–6: XOR it in',
      body: 'Line 6 is the whole trick: `unique ^= num` flips the columns where `num` has a 1. The comment on line 5 gives the reason: a repeated value flips the same columns again and undoes itself.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['unique ^= num'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 8: return the loner',
      body: 'After the last value every pair has cancelled, and `unique` holds the number that had no partner.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [8] },
      metrics: startMetrics,
      changes: ['return unique'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One XOR per number: O(n)',
      body: 'Each value costs one XOR, so it is **`O(n)` time**. The only memory is `unique`, **`O(1)` space**, where the set version needed `O(n)`.\n\nSwitch to **🧪 Try your own** to fold any numbers from 0 to 255.',
      code: { view: 'final', lines: [4, 6] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: NUMS, width: 4, stage: 'exit', unique: 4, note: `5 numbers, 5 XORs\nset version: up to 2 values stored\nXOR version: 1 number, 4 bits`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Line 6',
      title: 'Why unique ^= num finds the loner',
      body: 'After 4, 1, 2 the tally is `0111`. The second 1 flips column 1 back, and the second 2 flips column 2 back, which leaves `0100` = 4.\n\nThat is the key decision: fold every value into one number with XOR and let the pairs undo themselves. It only works when each other value appears an **even** number of times.',
      code: { view: 'final', lines: [5, 6] },
      values: { 6: 'unique = 0111 ^ 0001 ^ 0010 = 0100' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: NUMS, width: 4, stage: 'exit', unique: 4, note: '4 ^ 1 ^ 2 = 0111 (7)\n^ 1 → 0110, ^ 2 → 0100\nonly the loner’s bits stay on', noteTone: 'note' }) },
    },
  ],
  trace: {
    title: 'XOR your own numbers together',
    inputs: [{ name: 'nums', label: 'Numbers (0–255)', kind: 'numbers', default: '4, 1, 2, 1, 2' }],
    presets: [
      { label: 'Lesson example', values: { nums: '4, 1, 2, 1, 2' } },
      { label: 'Single value', values: { nums: '7' } },
      { label: 'Loner last', values: { nums: '6, 6, 10, 10, 13' } },
      { label: 'All paired', values: { nums: '3, 3, 5, 5' } },
      { label: 'Bigger numbers', values: { nums: '200, 77, 200, 9, 9' } },
    ],
    maxItems: 9,
    run: (values) => {
      const nums = values['nums'];
      if (!Array.isArray(nums) || nums.length === 0) throw new Error('Enter at least one number.');
      if (nums.some((v) => v < 0 || v > 255)) throw new Error('Use whole numbers from 0 to 255 (eight bits).');
      return traceXor(nums);
    },
  },
});
