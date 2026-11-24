import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const WIDTH = 8;
/** Place value under each bit cell, left (most significant) to right. */
const PLACES = [128, 64, 32, 16, 8, 4, 2, 1] as const;
const M_Y = 130;
const NOTE_Y = 350;

/** `check`: line 4 tested n. `minus`: n − 1 was computed. `and`: n took the AND. `count`: line 7 counted. */
type Stage = 'start' | 'check' | 'minus' | 'and' | 'count' | 'exit';

interface PopState {
  /** What the `n` row shows (after the AND, once stage is `and`). */
  readonly n: number;
  readonly stage?: Stage;
  /** n before the AND; its lowest 1 is the bit being wiped. */
  readonly before?: number;
  /** n − 1, drawn as a second row from `minus` on. */
  readonly m?: number;
  readonly count?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
}

/** The 8 bits of n (0–255) as 0 / 1 cells, most significant first. */
const bits = (n: number): number[] => PLACES.map((p) => ((n & p) !== 0 ? 1 : 0));
const binary = (n: number): string => bits(n).join('');
const ones = (n: number): number => bits(n).filter((bit) => bit === 1).length;
/** Value of the lowest 1 bit, e.g. 12 → 4. */
const lowest = (n: number): number => n & -n;

/** Scene for one moment: n as a row of bits, n − 1 under it, and the variables on the right. */
function scene(s: PopState): Entity[] {
  const nTones: Record<number, Tone> = {};
  const mTones: Record<number, Tone> = {};
  const base = s.stage === 'and' ? (s.before ?? s.n) : s.n;
  const low = base > 0 ? lowest(base) : 0;
  if (low > 0 && (s.stage === 'minus' || s.stage === 'and')) {
    PLACES.forEach((p, k) => {
      if (p === low) nTones[k] = s.stage === 'minus' ? 'active' : 'muted';
      else if (p < low) {
        if (s.stage === 'minus') nTones[k] = 'compare';
      }
      if (p <= low) mTones[k] = 'compare';
    });
  }

  const entities: Entity[] = [arr('n', 0, 0, bits(s.n), { label: 'n', tones: nTones, indexLabels: PLACES, codeVar: 'n' })];
  if (s.m !== undefined) entities.push(arr('minus', 0, M_Y, bits(s.m), { label: 'n - 1', tones: mTones, indexLabels: PLACES }));
  if (!s.bare) {
    entities.push(
      vars(
        'vals',
        tableBesideArray(WIDTH, 2),
        0,
        [
          { name: 'n', value: s.n },
          { name: 'count', value: s.count ?? '—', tone: s.stage === 'count' || s.stage === 'exit' ? 'found' : 'default' },
        ],
        { label: 'variables', width: 190 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs Kernighan's bit count on any 8-bit number and records one step per decision (chapter "run", final code). */
function traceCount(input: number): Step[] {
  const steps: Step[] = [];
  let n = input;
  let count = 0;
  let loops = 0;
  const total = ones(input);
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ loops, left: ones(n), result });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `n = ${n} has ${total} bit${total === 1 ? '' : 's'} set`,
    body: `The call brings \`n = ${n}\`, which is \`${binary(n)}\`. Line 2 starts \`count = 0\`.`,
    code: { view: 'final', lines: [2] },
    values: { 2: 'count = 0' },
    metrics: metrics(),
    scene: { entities: scene({ n, stage: 'start', count }) },
  });

  let first = true;
  while (n > 0) {
    const m = n - 1;
    const low = lowest(n);
    if (first) {
      steps.push({
        chapter: 'run',
        short: `${n} > 0`,
        title: `${n} > 0: there is a 1 left`,
        body: `Line 4: \`${n} > 0\` is true, so \`n\` still has at least one bit set and the loop runs.`,
        code: { view: 'final', lines: [4] },
        values: { 4: `${n} > 0 → True` },
        metrics: metrics(),
        scene: { entities: scene({ n, stage: 'check', count }) },
      });
    }
    steps.push({
      chapter: 'run',
      short: `n − 1 = ${m}`,
      title: `n − 1 = ${m}: the lowest 1 flips${low > 1 ? ' with the zeros below' : ''}`,
      body: `${first ? '' : `Line 4: \`${n} > 0\` is true. `}Line 6 first computes \`n - 1 = ${m}\`, which is \`${binary(m)}\`. ${low > 1 ? `The lowest 1 (place ${low}) becomes 0 and the ${Math.log2(low)} zero${low > 2 ? 's' : ''} below it become 1s (a borrow)` : 'The lowest 1 (place 1) becomes 0, with no zeros below it to flip'}. Every column above stays the same.`,
      code: { view: 'final', lines: first ? [6] : [4, 6] },
      values: first ? { 6: `n - 1 = ${m}` } : { 4: `${n} > 0 → True`, 6: `n - 1 = ${m}` },
      metrics: metrics(),
      scene: { entities: scene({ n, stage: 'minus', m, count }) },
    });
    first = false;

    const before = n;
    n = n & m;
    steps.push({
      chapter: 'run',
      short: `n = ${n}`,
      title: `${before} & ${m} = ${n}: the lowest 1 is gone`,
      body: `Line 6 then ANDs the two rows into \`n\`. The columns above the lowest 1 are equal in both rows, so they stay. The lowest 1 meets a 0, and the zeros below it meet 1s, so all of those end up 0: \`n = ${n}\`.`,
      code: { view: 'final', lines: [6] },
      values: { 6: `n = ${before} & ${m} = ${n}` },
      metrics: metrics(),
      scene: { entities: scene({ n, stage: 'and', before, m, count, note: `${binary(before)} & ${binary(m)}\n= ${binary(n)}\none 1 less: ${ones(before)} → ${ones(n)}` }) },
    });

    count += 1;
    loops += 1;
    steps.push({
      chapter: 'run',
      short: `count = ${count}`,
      title: `Counted: count = ${count}`,
      body: `Line 7 adds the 1 that was just wiped, so \`count = ${count}\`. ${n === 0 ? 'No 1s are left in `n`.' : `${ones(n)} more to go.`}`,
      code: { view: 'final', lines: [7] },
      values: { 7: `count = ${count}` },
      metrics: metrics(),
      scene: { entities: scene({ n, stage: 'count', count }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${count}`,
    body: `Line 4: \`${n} > 0\` is false, so the loop ends after ${loops} turn${loops === 1 ? '' : 's'}, one per set bit. Line 9 returns **${count}**.`,
    code: { view: 'final', lines: [4, 9] },
    values: { 4: `${n} > 0 → False`, 9: `return ${count}` },
    metrics: metrics(count),
    scene: { entities: scene({ n, stage: 'exit', count }) },
  });
  return steps;
}

const N = 13;
const RUN = traceCount(N);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (i: number): Step['scene'] => RUN[i]?.scene ?? { entities: [] };
const startMetrics = { loops: 0, left: ones(N), result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;

export default defineWalkthrough({
  id: 'learn/bit-manipulation/bit-hacks-properties',
  title: 'Counting set bits with n & (n − 1)',
  summary: 'From the idea to the code: count the 1 bits of a number by wiping the lowest one each turn, so the loop runs once per set bit and not once per column.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def count_set_bits(n: int) -> int:
    count = 0

    while n > 0:
        # n - 1 flips the lowest 1 and the zeros below it; & wipes them all
        n &= n - 1
        count += 1

    return count`,
  },
  snapshots: {
    slow: `def count_slow(n: int) -> int:
    count = 0
    for k in range(32):
        if (n >> k) & 1:
            count += 1
    return count`,
  },
  metrics: [
    { key: 'loops', label: 'Loop turns' },
    { key: 'left', label: '1s left in n' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'lowest 1' },
    { tone: 'compare', label: 'flipped by n - 1' },
    { tone: 'muted', label: 'wiped' },
    { tone: 'found', label: 'counted' },
  ],
  goals: [
    { text: 'See why testing every column is wasteful', step: 2 },
    { text: 'Learn what n - 1 does to the bits', step: 3 },
    { text: 'Watch n & (n - 1) wipe one 1 per turn', step: BUILD_END + 4 },
    { text: 'Know why one line gives the count', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'How many bits are set?',
      body: 'Think of eight light switches on a panel. How many are on? Counting them one by one is easy but slow for 32 or 64 switches.\n\nLine 1 gets a number `n` and returns how many of its bits are 1. Here `n = 13 = 00001101`, so the answer is 3.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Every column',
      title: 'The obvious way: test every column',
      body: 'Lines 3–5 test each of the 32 columns and add 1 when it is on. That is **32 tests for every number**, even `n = 128`, which has a single 1.\n\nThe work depends on the width of the number, not on how many bits are actually set.',
      code: { view: 'snapshot', id: 'slow', lines: [3, 4, 5] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, bare: true, note: 'n = 13: 3 ones, 29 tests wasted\nn = 128: 1 one, 31 tests wasted' }) },
    },
    {
      chapter: 'idea',
      short: 'n − 1',
      title: 'Subtract 1 and watch the row',
      body: 'Take `n = 12 = 00001100`. Subtracting 1 gives `11 = 00001011`: the lowest 1 turned into 0, and the zeros below it turned into 1s, just like a borrow in decimal subtraction.\n\nEvery column **above** the lowest 1 did not change.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: 12, stage: 'minus', m: 11, bare: true, note: '12 = 00001100\n11 = 00001011\nlowest 1 and zeros below flipped' }) },
    },
    {
      chapter: 'idea',
      short: 'Then AND',
      title: 'AND the two rows: one 1 disappears',
      body: 'Above the lowest 1 the two rows match, so AND keeps those bits. At and below it the rows are opposites, so AND gives 0.\n\nSo `n & (n - 1)` wipes **exactly the lowest 1** and leaves the rest: `12 & 11 = 8`. Repeat until `n` is 0, and the number of turns is the number of 1s.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: 8, stage: 'and', before: 12, m: 11, bare: true, note: '12 & 11 = 8\n00001100 & 00001011 = 00001000\none turn = one 1 wiped' }) },
    },
    {
      chapter: 'build',
      short: 'Counter',
      title: 'Line 2: a counter',
      body: '`count` records how many 1s we have wiped so far. It starts at 0, because nothing is wiped yet.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['count = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Line 4: stop when n is 0',
      body: 'A number with no 1s left is 0, so `while n > 0` keeps going exactly as long as there is a bit to wipe.',
      code: { view: 'reveal', reveal: [1, 2, 4], lines: [4] },
      metrics: startMetrics,
      changes: ['while n > 0:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Wipe',
      title: 'Lines 5–6: wipe the lowest 1',
      body: 'Line 6 is the idea from before: `n &= n - 1` replaces `n` with `n & (n - 1)`. The comment on line 5 says why it works.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['n &= n - 1'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Count it',
      title: 'Line 7: count the wiped bit',
      body: 'Each turn wiped exactly one 1, so `count` goes up by one per turn.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7], lines: [7] },
      metrics: startMetrics,
      changes: ['count += 1'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 9: return the count',
      body: 'When `n` reaches 0 the loop ends and `count` holds the number of 1s that `n` started with.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [9] },
      metrics: startMetrics,
      changes: ['return count'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One turn per set bit: O(k)',
      body: 'Each turn does one subtraction, one AND and one add, and there is one turn per **set bit**: `O(k)` time, where `k ≤` the word width. The loop uses two numbers: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to count the bits of any number from 0 to 255.',
      code: { view: 'final', lines: [4, 6, 7] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: 0, stage: 'exit', count: 3, note: 'n = 13: 3 turns\nn = 128: 1 turn, n = 255: 8 turns\nnever more than the 1s in n', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Line 6',
      title: 'Why n & (n − 1) is the whole trick',
      body: 'Line 6 removes the lowest 1 and touches nothing else, with no loop over columns. That is the key decision: use the borrow that `n - 1` creates, and let AND cancel it.\n\nThe same line tests a power of two: such a number has one 1, so `n & (n - 1)` is 0 after a single turn (`8 & 7 = 0`).',
      code: { view: 'final', lines: [5, 6] },
      values: { 6: 'n = 8 & 7 = 0' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: 0, stage: 'and', before: 8, m: 7, count: 0, note: '8 = 00001000 has one 1\n8 & 7 = 0 after one turn\nn & (n - 1) == 0 → power of two' }) },
    },
  ],
  trace: {
    title: 'Count the set bits of your own number',
    inputs: [{ name: 'n', label: 'n (0–255)', kind: 'number', default: '13' }],
    presets: [
      { label: 'Lesson example', values: { n: '13' } },
      { label: 'Zero', values: { n: '0' } },
      { label: 'Power of two', values: { n: '64' } },
      { label: 'All ones', values: { n: '255' } },
      { label: 'Trailing zeros', values: { n: '96' } },
    ],
    run: (values) => {
      const n = values['n'];
      if (typeof n !== 'number') throw new Error('Enter a number.');
      if (n < 0 || n > 255) throw new Error('Use a whole number from 0 to 255 (eight bits).');
      return traceCount(n);
    },
  },
});
