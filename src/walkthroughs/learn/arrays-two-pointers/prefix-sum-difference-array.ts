import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const ROW2_Y = 130;
const NOTE_Y = 240;

// ---------------------------------------------------------------- prefix sums

/**
 * `zeros`: line 3 made the list. `fill`: line 5 wrote prefix[i + 1].
 * `probe`: line 8 read its two values. `answer`: line 8 returned. `bare`: before the code exists.
 */
type PrefixPhase = 'bare' | 'zeros' | 'fill' | 'filled' | 'probe' | 'answer';

interface PrefixState {
  readonly nums: readonly number[];
  readonly prefix?: readonly number[];
  readonly phase: PrefixPhase;
  /** Loop index while filling: prefix[i + 1] is being written from nums[i]. */
  readonly i?: number;
  readonly left?: number;
  readonly right?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for the PrefixSum half: nums on top, prefix below, the variables to the right. */
function prefixScene(s: PrefixState): Entity[] {
  const { nums, prefix, phase, i, left, right } = s;
  const n = nums.length;
  const numTones: Record<number, Tone> = {};
  const preTones: Record<number, Tone> = {};
  const entities: Entity[] = [];

  if (phase === 'fill' && i !== undefined) {
    for (let k = 0; k <= i; k += 1) preTones[k] = 'done';
    preTones[i] = 'compare';
    preTones[i + 1] = 'active';
    numTones[i] = 'compare';
  }
  if (phase === 'filled' && prefix) prefix.forEach((_, k) => (preTones[k] = 'done'));
  const querying = (phase === 'probe' || phase === 'answer') && left !== undefined && right !== undefined;
  if (querying) {
    const tone: Tone = phase === 'answer' ? 'found' : 'compare';
    preTones[right + 1] = tone;
    preTones[left] = tone;
  }

  entities.push(arr('nums', 0, 0, nums, { label: 'nums', tones: numTones, codeVar: 'nums' }));
  if (querying) {
    if (phase === 'probe') {
      // prefix[right + 1] covers nums[0..right]; prefix[left] covers nums[0..left - 1]. Their difference is the range.
      entities.push(range('upto', 'nums', 0, right, 'compare'));
      if (left > 0) entities.push(range('minus', 'nums', 0, left - 1, 'muted'));
    } else entities.push(range('upto', 'nums', left, right, 'found'));
  }
  if (prefix) entities.push(arr('prefix', 0, ROW2_Y, prefix, { label: 'prefix', tones: preTones, codeVar: 'prefix' }));
  if (phase === 'fill' && i !== undefined) {
    entities.push(link('add', { entity: 'nums', index: i, side: 'bottom' }, { entity: 'prefix', index: i + 1, side: 'top' }, { label: `+ ${nums[i]}`, tone: 'active', flow: true }));
  }

  const rows: VarRow[] = [];
  if (phase === 'fill' && i !== undefined) rows.push({ name: 'i', value: i }, { name: 'val', value: nums[i] ?? '—' });
  if (querying && prefix) {
    const hi = prefix[right + 1] ?? 0;
    const lo = prefix[left] ?? 0;
    rows.push(
      { name: 'left', value: left },
      { name: 'right', value: right },
      { name: 'prefix[right + 1]', value: hi },
      { name: 'prefix[left]', value: lo },
      { name: 'returns', value: phase === 'answer' ? hi - lo : '—', tone: phase === 'answer' ? 'found' : 'muted' },
    );
  }
  if (rows.length > 0) entities.push(vars('vals', tableBesideArray(n + 1, rows.length), 0, rows, { label: 'variables', width: 210 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Builds PrefixSum(nums) and runs query(left, right), one step per decision (chapter "run", final code). */
function tracePrefix(nums: readonly number[], left: number, right: number): Step[] {
  const steps: Step[] = [];
  let adds = 0;
  let calls = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ adds, calls, result });
  const n = nums.length;
  const prefix = new Array<number>(n + 1).fill(0);

  steps.push({
    chapter: 'run',
    short: 'Zeros',
    title: `PrefixSum(${show(nums)}): ${n + 1} zeros`,
    body: `Line 3 makes \`prefix\` one slot longer than \`nums\`: ${n + 1} zeros. \`prefix[0] = 0\` already holds the sum of the first 0 values.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 3: `prefix = [0] * ${n + 1}` },
    metrics: metrics(),
    scene: { entities: prefixScene({ nums, prefix: [...prefix], phase: 'zeros', note: 'prefix[i] = sum of the first i values' }) },
  });

  for (let i = 0; i < n; i += 1) {
    const val = nums[i] ?? 0;
    const before = prefix[i] ?? 0;
    prefix[i + 1] = before + val;
    adds += 1;
    steps.push({
      chapter: 'run',
      short: `i = ${i}`,
      title: `prefix[${i + 1}] = ${before} + ${val} = ${prefix[i + 1]}`,
      body: `Line 4: \`i = ${i}\`, \`val = ${val}\`. Line 5 adds it to the total so far: \`prefix[${i + 1}] = prefix[${i}] + ${val} = ${prefix[i + 1]}\`, the sum of the first ${i + 1} value${i === 0 ? '' : 's'}.`,
      code: { view: 'final', lines: [4, 5] },
      values: { 4: `i = ${i}, val = ${val}`, 5: `prefix[${i + 1}] = ${before} + ${val} = ${prefix[i + 1]}` },
      metrics: metrics(),
      scene: { entities: prefixScene({ nums, prefix: [...prefix], phase: 'fill', i }) },
    });
  }

  const hi = prefix[right + 1] ?? 0;
  const lo = prefix[left] ?? 0;
  calls += 1;
  steps.push({
    chapter: 'run',
    short: 'Two reads',
    title: `query(${left}, ${right}): read prefix[${right + 1}] and prefix[${left}]`,
    body: `Line 8 reads \`prefix[${right + 1}] = ${hi}\`, the sum of \`nums[0..${right}]\`, and \`prefix[${left}] = ${lo}\`, the sum of ${left === 0 ? 'no values at all' : `\`nums[0..${left - 1}]\``}.\n\nThe first covers the range plus everything before it; the second is exactly that "everything before".`,
    code: { view: 'final', lines: [7, 8] },
    values: { 8: `prefix[${right + 1}] = ${hi}, prefix[${left}] = ${lo}` },
    metrics: metrics(),
    scene: { entities: prefixScene({ nums, prefix: [...prefix], phase: 'probe', left, right }) },
  });
  adds += 1;
  steps.push({
    chapter: 'run',
    short: `Return ${hi - lo}`,
    title: `Sum of nums[${left}..${right}] = ${hi} − ${lo} = ${hi - lo}`,
    body: `Line 8 returns \`${hi} − ${lo} = ${hi - lo}\`: ${show(nums.slice(left, right + 1))} adds up to **${hi - lo}**. One subtraction, however long the range is.`,
    code: { view: 'final', lines: [8] },
    values: { 8: `return ${hi} - ${lo} = ${hi - lo}` },
    metrics: metrics(hi - lo),
    scene: { entities: prefixScene({ nums, prefix: [...prefix], phase: 'answer', left, right }) },
  });
  return steps;
}

// ---------------------------------------------------------- difference array

type DiffPhase = 'zeros' | 'mark-left' | 'mark-right' | 'build-start' | 'build' | 'done';

interface DiffState {
  readonly diff: readonly number[];
  readonly result: readonly number[];
  readonly phase: DiffPhase;
  readonly left?: number;
  readonly right?: number;
  readonly val?: number;
  /** Build loop position: the mark being added to the running total. */
  readonly i?: number;
  readonly current?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for the DifferenceArray half: diff on top, the rebuilt result below, the variables to the right. */
function diffScene(s: DiffState): Entity[] {
  const { diff, result, phase, left, right, val, i } = s;
  const n = diff.length - 1;
  const dTones: Record<number, Tone> = {};
  const rTones: Record<number, Tone> = {};
  const entities: Entity[] = [];

  if (phase === 'mark-left' && left !== undefined) dTones[left] = 'active';
  if (phase === 'mark-right' && left !== undefined && right !== undefined) {
    dTones[left] = 'done';
    dTones[right + 1] = 'active';
  }
  if ((phase === 'build-start' || phase === 'build' || phase === 'done') && n >= 0) dTones[n] = 'muted';
  if (phase === 'build' && i !== undefined) {
    for (let k = 0; k < i; k += 1) dTones[k] = 'done';
    dTones[i] = 'active';
  }
  if (phase === 'done') for (let k = 0; k < n; k += 1) dTones[k] = 'done';
  result.forEach((_, k) => (rTones[k] = phase === 'done' ? 'found' : 'done'));

  entities.push(arr('diff', 0, 0, diff, { label: 'diff', tones: dTones, codeVar: 'diff' }));
  if ((phase === 'mark-left' || phase === 'mark-right') && left !== undefined && right !== undefined) {
    entities.push(range('span', 'diff', left, right, 'compare'));
  }
  if (phase === 'build' && i !== undefined) entities.push(ptr('mark', 'diff', i, 'mark', { side: 'top', tone: 'active', codeVar: 'mark' }));
  if (result.length > 0) entities.push(arr('result', 0, ROW2_Y, result, { label: 'result', tones: rTones, codeVar: 'result' }));
  if (phase === 'build' && i !== undefined && result.length === i + 1) {
    entities.push(link('carry', { entity: 'diff', index: i, side: 'bottom' }, { entity: 'result', index: i, side: 'top' }, { label: `current = ${s.current}`, tone: 'active', flow: true }));
  }

  const rows: VarRow[] = [];
  if (phase === 'mark-left' || phase === 'mark-right') rows.push({ name: 'left', value: left ?? '—' }, { name: 'right', value: right ?? '—' }, { name: 'val', value: val ?? '—' });
  if (phase === 'build-start' || phase === 'build' || phase === 'done') {
    rows.push({ name: 'mark', value: phase === 'build' && i !== undefined ? (diff[i] ?? '—') : '—', tone: phase === 'build' ? 'default' : 'muted' }, { name: 'current', value: s.current ?? 0 });
  }
  if (rows.length > 0) entities.push(vars('vals', tableBesideArray(n + 1, rows.length), 0, rows, { label: 'variables', width: 210 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

interface Update {
  readonly left: number;
  readonly right: number;
  readonly val: number;
}

/** Runs DifferenceArray(n), every add_range call, then build(), one step per decision (chapter "run", final code). */
function traceDiff(n: number, updates: readonly Update[]): Step[] {
  const steps: Step[] = [];
  let adds = 0;
  let calls = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ adds, calls, result });
  const diff = new Array<number>(n + 1).fill(0);

  steps.push({
    chapter: 'run',
    short: 'Zeros',
    title: `DifferenceArray(${n}): ${n + 1} zero marks`,
    body: `Line 13 makes \`diff\` with ${n + 1} zeros: one mark per position, plus a spare slot at index ${n} (the comment says why).`,
    code: { view: 'final', lines: [12, 13] },
    values: { 13: `diff = [0] * ${n + 1}` },
    metrics: metrics(),
    scene: { entities: diffScene({ diff: [...diff], result: [], phase: 'zeros' }) },
  });

  for (const { left, right, val } of updates) {
    calls += 1;
    diff[left] = (diff[left] ?? 0) + val;
    adds += 1;
    steps.push({
      chapter: 'run',
      short: `+${val} at ${left}`,
      title: `add_range(${left}, ${right}, ${val}): start at ${left}`,
      body: `Line 16: \`diff[${left}] += ${val}\`, so \`diff[${left}] = ${diff[left]}\`. From index ${left} on, the running total will be ${val} higher.`,
      code: { view: 'final', lines: [15, 16] },
      values: { 15: `left = ${left}, right = ${right}, val = ${val}`, 16: `diff[${left}] = ${diff[left]}` },
      metrics: metrics(),
      scene: { entities: diffScene({ diff: [...diff], result: [], phase: 'mark-left', left, right, val }) },
    });
    diff[right + 1] = (diff[right + 1] ?? 0) - val;
    adds += 1;
    steps.push({
      chapter: 'run',
      short: `−${val} at ${right + 1}`,
      title: `Stop after ${right}: diff[${right + 1}] −= ${val}`,
      body: `Line 17: \`diff[${right + 1}] -= ${val}\`, so \`diff[${right + 1}] = ${diff[right + 1]}\`. From index ${right + 1} on, the ${val} is taken away again, so only indexes ${left}–${right} keep it. Two writes, however wide the range.`,
      code: { view: 'final', lines: [17] },
      values: { 17: `diff[${right + 1}] = ${diff[right + 1]}` },
      metrics: metrics(),
      scene: { entities: diffScene({ diff: [...diff], result: [], phase: 'mark-right', left, right, val }) },
    });
  }

  const result: number[] = [];
  let current = 0;
  steps.push({
    chapter: 'run',
    short: 'build()',
    title: 'build(): an empty result and a running total of 0',
    body: 'Lines 20–21 start an empty `result` and `current = 0`. Line 22 will walk the marks, skipping the spare slot at the end.',
    code: { view: 'final', lines: [20, 21, 22] },
    values: { 20: 'result = []', 21: 'current = 0', 22: `marks: ${show(diff.slice(0, -1))}` },
    metrics: metrics(),
    scene: { entities: diffScene({ diff: [...diff], result: [], phase: 'build-start', current }) },
  });
  for (let i = 0; i < n; i += 1) {
    const mark = diff[i] ?? 0;
    const before = current;
    current += mark;
    adds += 1;
    result.push(current);
    steps.push({
      chapter: 'run',
      short: `mark = ${mark}`,
      title: `Position ${i}: ${before} + ${mark < 0 ? `(${mark})` : mark} = ${current}`,
      body: `Line 23: \`current = ${before} + ${mark < 0 ? `(${mark})` : mark} = ${current}\`. Line 24 appends it, so \`result[${i}] = ${current}\`.${mark > 0 ? ' A range starts here.' : mark < 0 ? ' A range ended just before here.' : ''}`,
      code: { view: 'final', lines: [22, 23, 24] },
      values: { 22: `mark = diff[${i}] = ${mark}`, 23: `current = ${current}`, 24: `result = ${show(result)}` },
      metrics: metrics(),
      scene: { entities: diffScene({ diff: [...diff], result: [...result], phase: 'build', i, current }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `The final values: ${show(result)}`,
    body: `Line 25 returns **${show(result)}**: ${calls} range update${calls === 1 ? '' : 's'} cost ${calls * 2} writes, and one pass rebuilt every value.`,
    code: { view: 'final', lines: [25] },
    values: { 25: `return ${show(result)}` },
    metrics: metrics(show(result)),
    scene: { entities: diffScene({ diff: [...diff], result: [...result], phase: 'done', current }) },
  });
  return steps;
}

// ---------------------------------------------------------------- the story

const NUMS = [3, 1, 4, 1, 5] as const;
const PREFIX = [0, 3, 4, 8, 9, 14] as const;
const UPDATES: readonly Update[] = [
  { left: 1, right: 3, val: 3 },
  { left: 2, right: 4, val: 2 },
];
const RUN_PREFIX = tracePrefix(NUMS, 1, 3);
const RUN_DIFF = traceDiff(5, UPDATES);
const RUN = [...RUN_PREFIX, ...RUN_DIFF];
const startMetrics = { adds: 0, calls: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 13;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const DIFF_AT = RUN_PREFIX.length;

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/prefix-sum-difference-array',
  title: 'Prefix Sums & Difference Arrays, pay once and answer fast',
  summary: 'From the idea to the code: running totals answer any range sum with one subtraction, and two marks per update add a value to a whole range.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `class PrefixSum:
    def __init__(self, nums: list[int]) -> None:
        self.prefix = [0] * (len(nums) + 1)  # prefix[i] = sum of first i values
        for i, val in enumerate(nums):
            self.prefix[i + 1] = self.prefix[i] + val

    def query(self, left: int, right: int) -> int:
        return self.prefix[right + 1] - self.prefix[left]


class DifferenceArray:
    def __init__(self, n: int) -> None:
        self.diff = [0] * (n + 1)  # Spare slot, so right + 1 always fits

    def add_range(self, left: int, right: int, val: int) -> None:
        self.diff[left] += val  # From left on, every value gains val...
        self.diff[right + 1] -= val  # ...and from right + 1 on, loses it

    def build(self) -> list[int]:
        result: list[int] = []
        current = 0
        for mark in self.diff[:-1]:  # The spare slot is not a position
            current += mark  # Running total of the marks so far
            result.append(current)
        return result`,
  },
  snapshots: {
    brute: `def range_sum(nums: list[int], left: int, right: int) -> int:
    total = 0
    for i in range(left, right + 1):  # Re-adds the range on every query
        total += nums[i]
    return total`,
  },
  metrics: [
    { key: 'adds', label: 'Adds + subtracts' },
    { key: 'calls', label: 'Queries / updates' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'being written' },
    { tone: 'compare', label: 'being read / range' },
    { tone: 'done', label: 'filled' },
    { tone: 'muted', label: 'subtracted / spare slot' },
    { tone: 'found', label: 'answer' },
  ],
  goals: [
    { text: 'See why summing each range again is slow', step: 3 },
    { text: 'Turn any range sum into one subtraction', step: 4 },
    { text: 'Add to a whole range with two marks', step: 5 },
    { text: 'Follow every prefix, mark and running total', step: BUILD_END + 1 },
    { text: 'Know why prefix starts with an extra 0', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'Range sums',
      title: 'Sum any range of [3, 1, 4, 1, 5], many times',
      body: 'Like a bank balance: the money spent between day 10 and day 20 is one subtraction of two balances, not a pile of receipts.\n\n`PrefixSum` gets `nums` once, then `query(left, right)` must return the sum of `nums[left..right]`, over and over. Here `query(1, 3)` is `1 + 4 + 1 = 6`.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: [arr('nums', 0, 0, NUMS, { label: 'nums', codeVar: 'nums' }), range('upto', 'nums', 1, 3, 'compare'), note('note', 0, NOTE_Y, 'query(1, 3) = 1 + 4 + 1 = 6\nthousands of queries like it')] },
    },
    {
      chapter: 'problem',
      short: 'Range adds',
      title: 'And the mirror: add to whole ranges',
      body: 'Like a bonus for everyone with an ID from 100 to 500: a note at door 100 that says "+5" and one at door 501 that says "−5".\n\n`DifferenceArray` starts with `n` zeros, takes many `add_range(left, right, val)` calls, and only then gives the final values. Here: `+3` on 1–3 and `+2` on 2–4 give `[0, 3, 5, 5, 2]`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: [arr('result', 0, ROW2_Y, [0, 3, 5, 5, 2], { label: 'result', codeVar: 'result' }), range('span', 'result', 1, 3, 'compare'), note('note', 0, NOTE_Y, '+3 on [1, 3], then +2 on [2, 4]\n[0, 0, 0, 0, 0] → [0, 3, 5, 5, 2]')] },
    },
    {
      chapter: 'idea',
      short: 'Re-add',
      title: 'The obvious way: add up the range every time',
      body: 'Lines 3–4 walk the range and add each value. One query costs up to `n` additions, so `Q` queries cost **`O(Q·n)`**.\n\nRange updates have the same problem: writing `+val` into every slot of the range is `O(n)` per update.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 4] },
      metrics: startMetrics,
      scene: { entities: [arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 1: 'compare', 2: 'compare', 3: 'compare' }, codeVar: 'nums' }), range('upto', 'nums', 1, 3, 'compare'), note('note', 0, NOTE_Y, 'every query re-adds its range\nQ queries × up to n adds → O(Q·n)', { tone: 'miss' })] },
    },
    {
      chapter: 'idea',
      short: 'Totals',
      title: 'Running totals: a range sum is one subtraction',
      body: 'Store `prefix[i]`, the sum of the **first `i`** values. Then `prefix[4] = 3 + 1 + 4 + 1` covers `nums[0..3]`, and `prefix[1] = 3` covers `nums[0..0]`.\n\nTake the second away from the first and only `nums[1..3]` is left: **`sum(left..right) = prefix[right + 1] − prefix[left]`**. Here `9 − 3 = 6`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: prefixScene({ nums: NUMS, prefix: PREFIX, phase: 'probe', left: 1, right: 3, note: 'prefix[4] = 3 + 1 + 4 + 1 = 9\nprefix[1] = 3\n9 − 3 = 1 + 4 + 1 = 6' }) },
    },
    {
      chapter: 'idea',
      short: 'Two marks',
      title: 'Marks: a range update is two writes',
      body: 'Run it backwards. Instead of writing `+3` into slots 1–3, write `+3` at 1 and `−3` at 4. A running total over those marks is `0, 3, 3, 3, 0`: the `+3` covers exactly 1–3.\n\nEvery update is two writes; one pass of running totals at the end gives the final values.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: diffScene({ diff: [0, 3, 0, 0, -3, 0], result: [0, 3, 3, 3, 0], phase: 'mark-right', left: 1, right: 3, val: 3, note: 'marks:         0, +3, 0, 0, −3\nrunning total: 0,  3, 3, 3,  0' }) },
    },
    {
      chapter: 'build',
      short: 'Prefix list',
      title: 'Lines 1–3: one slot more than nums',
      body: '`prefix` gets `len(nums) + 1` zeros. `prefix[0]` stays 0: the sum of the first 0 values (the comment on line 3).',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: startMetrics,
      changes: ['self.prefix = [0] * (len(nums) + 1)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Fill',
      title: 'Lines 4–5: each total is the previous one plus a value',
      body: '`prefix[i + 1]` is the first `i + 1` values, which is the first `i` values plus `nums[i]`. So line 5 needs one addition per slot.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['for i, val in enumerate(nums)', 'self.prefix[i + 1] = self.prefix[i] + val'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Query',
      title: 'Lines 7–8: one subtraction per query',
      body: 'Line 8 is the formula from the idea: everything up to `right`, minus everything before `left`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['return self.prefix[right + 1] - self.prefix[left]'],
      scene: at(RUN_PREFIX.length - 2),
    },
    {
      chapter: 'build',
      short: 'Marks list',
      title: 'Lines 11–13: n + 1 marks, all zero',
      body: 'A fresh `DifferenceArray` has no updates, so every mark is 0. The spare slot at index `n` is for an update that ends at the last position: its `right + 1` is `n`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 11, 12, 13], lines: [13] },
      metrics: startMetrics,
      changes: ['self.diff = [0] * (n + 1)'],
      scene: at(DIFF_AT),
    },
    {
      chapter: 'build',
      short: 'add_range',
      title: 'Lines 15–17: mark where the range starts and stops',
      body: 'Line 16 adds `val` at `left`, so the running total gains it from there on. Line 17 subtracts it at `right + 1`, so it’s gone again after `right`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 11, 12, 13, 15, 16, 17], lines: [16, 17] },
      metrics: startMetrics,
      changes: ['self.diff[left] += val', 'self.diff[right + 1] -= val'],
      scene: at(DIFF_AT + 2),
    },
    {
      chapter: 'build',
      short: 'build()',
      title: 'Lines 19–21: an empty result and a running total',
      body: '`build()` rebuilds the final values: `result` collects them, and `current` is the running total of the marks, starting at 0.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 11, 12, 13, 15, 16, 17, 19, 20, 21], lines: [20, 21] },
      metrics: startMetrics,
      changes: ['result = []', 'current = 0'],
      scene: at(DIFF_AT + 5),
    },
    {
      chapter: 'build',
      short: 'Total',
      title: 'Lines 22–24: each value is the total of the marks so far',
      body: 'Line 22 walks every mark except the spare slot. Line 23 adds it to the running total, and line 24 appends that total: the sum of every update that has started and not yet stopped.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 11, 12, 13, 15, 16, 17, 19, 20, 21, 22, 23, 24], lines: [22, 23, 24] },
      metrics: startMetrics,
      changes: ['for mark in self.diff[:-1]', 'current += mark', 'result.append(current)'],
      scene: at(DIFF_AT + 7),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 25: return the rebuilt values',
      body: 'After the last mark, `result` holds every final value, and line 25 returns it.\n\nThat’s both classes. Now let’s run them.',
      code: { view: 'final', lines: [25] },
      metrics: startMetrics,
      changes: ['return result'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Pay O(n) once, then O(1) per call',
      body: '`PrefixSum` costs `n` additions once, then every query is **`O(1)`**: `Q` queries in `O(n + Q)` instead of `O(Q·n)`. `DifferenceArray` is the mirror: **`O(1)`** per update, then one **`O(n)`** build. Both keep `n + 1` numbers: `O(n)` space.\n\nSwitch to **🧪 Try your own** to run prefix sums on any numbers you like.',
      code: { view: 'final', lines: [5, 8, 16, 17, 23] },
      metrics: FINAL_METRICS,
      scene: { entities: diffScene({ diff: [0, 3, 2, 0, -3, -2], result: [0, 3, 5, 5, 2], phase: 'done', current: 2, note: 'prefix: n adds once, then 1 subtraction per query\ndiff: 2 writes per update, then n adds once\nQ calls: O(n + Q) instead of O(Q·n)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Extra zero',
      title: 'Why prefix has an extra 0 at the front',
      body: '`query(0, 2)` needs "everything before index 0", which is nothing. Because `prefix[0] = 0`, line 8 still works: `prefix[3] − prefix[0] = 8 − 0 = 8`, no special case.\n\nThat is the key decision: `prefix[i]` counts the first `i` values, so the list has `n + 1` slots. The spare slot in `diff` is the same idea at the other end.',
      code: { view: 'final', lines: [3, 8] },
      values: { 3: 'prefix[0] = 0: the sum of no values', 8: 'query(0, 2) = 8 - 0 = 8' },
      metrics: { adds: 6, calls: 1, result: 8 },
      scene: { entities: prefixScene({ nums: NUMS, prefix: PREFIX, phase: 'answer', left: 0, right: 2, note: 'query(0, 2) = prefix[3] − prefix[0]\n= 8 − 0 = 3 + 1 + 4' }) },
    },
  ],
  trace: {
    title: 'Build prefix sums and query your own range',
    inputs: [
      { name: 'nums', label: 'Numbers', kind: 'numbers', default: '2, -1, 3, 5, -2, 4' },
      { name: 'left', label: 'left (first index)', kind: 'number', default: '1' },
      { name: 'right', label: 'right (last index)', kind: 'number', default: '4' },
    ],
    presets: [
      { label: 'Lesson example', values: { nums: '3, 1, 4, 1, 5', left: '1', right: '3' } },
      { label: 'From index 0', values: { nums: '3, 1, 4, 1, 5', left: '0', right: '2' } },
      { label: 'One value', values: { nums: '7, 2, 9', left: '2', right: '2' } },
      { label: 'Negatives', values: { nums: '-2, 5, -1, 3', left: '0', right: '3' } },
    ],
    maxItems: 9,
    run: (values) => {
      const nums = values['nums'];
      const left = values['left'];
      const right = values['right'];
      if (!Array.isArray(nums) || typeof left !== 'number' || typeof right !== 'number') throw new Error('Enter some numbers, left and right.');
      if (left < 0 || right >= nums.length || left > right) throw new Error(`Pick 0 ≤ left ≤ right ≤ ${nums.length - 1}.`);
      return tracePrefix(nums, left, right);
    },
  },
});
