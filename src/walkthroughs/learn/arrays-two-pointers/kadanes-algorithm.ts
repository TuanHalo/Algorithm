import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 240;

/**
 * `choose`: line 10 just extended or restarted the streak. `better` / `worse`: line 11's verdict.
 * `record`: line 12 stored a new best. `done`: the best streak is returned.
 */
type Phase = 'start' | 'choose' | 'better' | 'worse' | 'record' | 'done';

interface KadaneState {
  readonly values: readonly number[];
  readonly phase?: Phase;
  /** Index of x, the value being handled. */
  readonly i?: number;
  /** Where the current streak starts. */
  readonly start?: number;
  readonly current?: number;
  readonly best?: number;
  /** The best streak so far, as [from, to]. */
  readonly bestRange?: readonly [number, number];
  /** What line 10 chose for x: extend the streak or restart at x. */
  readonly choice?: 'extend' | 'restart';
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
  readonly arrayId?: string;
}

/** Scene for one moment: the current streak band, the value x, and the variables. */
function scene(s: KadaneState): Entity[] {
  const id = s.arrayId ?? 'nums';
  const { i, start, phase } = s;
  const tones: Record<number, Tone> = {};
  if (start !== undefined && phase !== 'done') for (let k = 0; k < start; k += 1) tones[k] = 'muted';
  if (i !== undefined && phase !== 'done') tones[i] = 'active';

  const entities: Entity[] = [arr(id, 0, 0, s.values, { label: 'nums', tones, codeVar: 'nums' })];
  if (phase === 'done' && s.bestRange) entities.push(range('streak', id, s.bestRange[0], s.bestRange[1], 'found'));
  else if (start !== undefined && i !== undefined) entities.push(range('streak', id, start, i, phase === 'better' || phase === 'record' ? 'found' : 'compare'));
  if (i !== undefined && phase !== 'done' && phase !== 'start') entities.push(ptr('x', id, i, 'x', { side: 'top', tone: 'active', codeVar: 'x' }));

  if (!s.bare) {
    const x = i === undefined || phase === 'start' || phase === 'done' ? undefined : s.values[i];
    const rows: VarRow[] = [
      { name: 'x', value: x ?? '—', tone: x === undefined ? 'muted' : 'default' },
      { name: 'current_sum', value: s.current ?? '—', tone: phase === 'better' || phase === 'record' ? 'found' : phase === 'worse' ? 'miss' : 'default' },
      { name: 'max_sum', value: s.best ?? '—', tone: phase === 'record' || phase === 'done' ? 'found' : 'default' },
    ];
    entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 190 }));
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;
const plus = (a: number, b: number): string => `${a} + ${b < 0 ? `(${b})` : b}`;

/** Runs Kadane's algorithm on any input and records one step per decision (chapter "run", final code). */
function traceKadane(values: readonly number[]): Step[] {
  const steps: Step[] = [];
  let extends_ = 0;
  let restarts = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ extends: extends_, restarts, result });
  const first = values[0] ?? 0;

  steps.push({
    chapter: 'run',
    short: 'Not empty',
    title: `${values.length} value${values.length === 1 ? '' : 's'} to scan`,
    body: 'Line 2: `nums` isn’t empty, so we skip line 3.',
    code: { view: 'final', lines: [2] },
    values: { 2: 'not nums → False' },
    metrics: metrics(),
    scene: { entities: scene({ values, bare: true }) },
  });

  let current = first;
  let best = first;
  let start = 0;
  let bestRange: [number, number] = [0, 0];
  steps.push({
    chapter: 'run',
    short: 'First value',
    title: `Start the streak at ${first}`,
    body: `Lines 5–6: the streak is just \`nums[0]\`, so \`current_sum = ${first}\`, and it’s also the best so far, \`max_sum = ${first}\`.`,
    code: { view: 'final', lines: [5, 6] },
    values: { 5: `current_sum = ${first}`, 6: `max_sum = ${first}` },
    metrics: metrics(),
    scene: { entities: scene({ values, phase: 'start', i: 0, start, current, best }) },
  });

  for (let i = 1; i < values.length; i += 1) {
    const x = values[i] ?? 0;
    const extended = current + x;
    const restart = x > extended;
    const before = current;
    current = restart ? x : extended;
    if (restart) {
      start = i;
      restarts += 1;
    } else extends_ += 1;
    steps.push({
      chapter: 'run',
      short: `x = ${x}`,
      title: restart ? `x = ${x}: restart the streak` : `x = ${x}: extend the streak`,
      body: restart
        ? `Line 8 takes \`x = ${x}\`. Line 10: extending gives \`${plus(before, x)} = ${extended}\`, but \`${x}\` alone is bigger, because the streak so far (${before}) is negative. Drop it and start over at ${x}.`
        : `Line 8 takes \`x = ${x}\`. Line 10: extending gives \`${plus(before, x)} = ${extended}\`, at least \`${x}\` alone, so the streak keeps going: \`current_sum = ${current}\`.`,
      code: { view: 'final', lines: [8, 10] },
      values: { 8: `x = ${x}`, 10: `current_sum = max(${x}, ${extended}) = ${current}` },
      metrics: metrics(),
      scene: { entities: scene({ values, phase: 'choose', i, start, current, best, choice: restart ? 'restart' : 'extend' }) },
    });

    const better = current > best;
    steps.push({
      chapter: 'run',
      short: better ? 'Better' : 'Not better',
      title: better ? `${current} > ${best}: the best streak so far` : `${current} > ${best} is false: keep the best`,
      body: better
        ? `Line 11: \`${current} > ${best}\` is true. The streak ${show(values.slice(start, i + 1))} beats every earlier one.`
        : `Line 11: \`${current} > ${best}\` is false, so \`max_sum\` stays ${best}.`,
      code: { view: 'final', lines: [11] },
      values: { 11: `${current} > ${best} → ${better ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ values, phase: better ? 'better' : 'worse', i, start, current, best }) },
    });
    if (better) {
      best = current;
      bestRange = [start, i];
      steps.push({
        chapter: 'run',
        short: 'New best',
        title: `max_sum = ${best}`,
        body: `Line 12 records it: \`max_sum = ${best}\`.`,
        code: { view: 'final', lines: [12] },
        values: { 12: `max_sum = ${best}` },
        metrics: metrics(),
        scene: { entities: scene({ values, phase: 'record', i, start, current, best }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Best streak ${show(values.slice(bestRange[0], bestRange[1] + 1))} = ${best}`,
    body: `The loop has handled every value. Line 14 returns **${best}**, after ${extends_} extend${extends_ === 1 ? '' : 's'} and ${restarts} restart${restarts === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [14] },
    values: { 14: `return ${best}` },
    metrics: metrics(best),
    scene: { entities: scene({ values, phase: 'done', current, best, bestRange }) },
  });
  return steps;
}

const NUMS = [-2, 1, -3, 4, -1, 2, 1, -5, 4] as const;
const RUN = traceKadane(NUMS);
const startMetrics = { extends: 0, restarts: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/kadanes-algorithm',
  title: 'Kadane’s Algorithm, extend or restart',
  summary: 'From the idea to the code: find the biggest sum of neighbouring values in one pass, by deciding at every value whether to extend the current streak or start a new one.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def max_sub_array(nums: list[int]) -> int:
    if not nums:
        return 0

    current_sum = nums[0]
    max_sum = nums[0]

    for x in nums[1:]:
        # Extend the streak, or restart at x if the streak so far is negative
        current_sum = max(x, current_sum + x)
        if current_sum > max_sum:
            max_sum = current_sum

    return max_sum`,
  },
  snapshots: {
    brute: `def max_sub_array(nums: list[int]) -> int:
    best = nums[0]
    for start in range(len(nums)):
        total = 0
        for end in range(start, len(nums)):
            total += nums[end]  # Sum of nums[start..end]
            best = max(best, total)
    return best`,
  },
  metrics: [
    { key: 'extends', label: 'Extends' },
    { key: 'restarts', label: 'Restarts' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'value x' },
    { tone: 'compare', label: 'current streak' },
    { tone: 'found', label: 'best streak' },
    { tone: 'miss', label: 'not better' },
    { tone: 'muted', label: 'dropped' },
  ],
  goals: [
    { text: 'See why trying every run is O(n²)', step: 2 },
    { text: 'Decide at each value: extend or restart', step: 3 },
    { text: 'Follow every choice and every new best', step: BUILD_END + 1 },
    { text: 'Know why a negative streak is dropped', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The biggest sum of neighbouring values',
      body: 'Like an arcade streak where each round wins or loses points: once your running total goes negative, it only drags the next rounds down, so you start fresh.\n\nLine 1 gets a list `nums` with positive and negative values and returns the biggest sum of a **non-empty** run of neighbours. Here: `[4, −1, 2, 1] = 6`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ values: NUMS, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Every run',
      title: 'The obvious way: sum every run',
      body: 'Lines 3–7 try every start and grow a run from it, keeping the best total. For 9 values that’s **45 runs**.\n\nIn general `n(n + 1) / 2` runs: **`O(n²)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 5, 6, 7] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', codeVar: 'nums' }),
          range('streak', 'nums', 0, 8, 'compare'),
          note('note', 0, VARS_Y, 'start 0: 9 runs, start 1: 8 runs, …\n9 + 8 + … + 1 = 45 runs → O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Extend?',
      title: 'At each value: extend the streak or restart',
      body: 'The best run **ending at** a value either continues the best run ending just before it, or starts at the value itself. So `current_sum = max(x, current_sum + x)`.\n\n`current_sum + x` loses to `x` exactly when `current_sum` is negative: `−2 + 1 = −1`, but 1 alone is 1.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ values: NUMS, bare: true, i: 1, start: 1, note: 'streak so far: −2 (negative)\nextend: −2 + 1 = −1\nrestart: 1  ← bigger' }) },
    },
    {
      chapter: 'build',
      short: 'Empty',
      title: 'Lines 2–3: an empty list',
      body: 'A run must hold at least one value, so an empty list has none; line 3 returns 0 by convention.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if not nums: return 0'],
      scene: { entities: scene({ values: NUMS, bare: true, note: 'nums = [] → return 0' }) },
    },
    {
      chapter: 'build',
      short: 'First value',
      title: 'Lines 5–6: start with the first value',
      body: '`current_sum` is the best run ending at the current value; `max_sum` is the best run anywhere so far. Both start at `nums[0] = −2`, a real run, so all-negative lists still work.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['current_sum = nums[0]', 'max_sum = nums[0]'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Choose',
      title: 'Lines 8–10: extend or restart at every value',
      body: 'Line 8 walks the remaining values as `x`. Line 10 is the formula from the idea: keep the streak if it helps, otherwise start over at `x` (the comment on line 9).',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10], lines: [8, 10] },
      metrics: startMetrics,
      changes: ['for x in nums[1:]', 'current_sum = max(x, current_sum + x)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Keep best',
      title: 'Lines 11–12: remember the best streak',
      body: 'The best run might end anywhere, so after every value line 11 compares the current streak with the best, and line 12 records a new best.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['if current_sum > max_sum: max_sum = current_sum'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 14: return the best',
      body: 'After the last value, `max_sum` holds the biggest run sum, and line 14 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [14] },
      metrics: startMetrics,
      changes: ['return max_sum'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One look per value: O(n)',
      body: 'Each value is handled once with one `max` and one comparison, so it’s **`O(n)` time**, and two numbers of memory: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [8, 10, 11] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: NUMS, phase: 'done', current: 5, best: 6, bestRange: [3, 6], note: '9 values → 8 choices, 8 comparisons\nevery run: 45 sums\nn = 10⁶: 10⁶ vs 5·10¹¹', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Restart',
      title: 'Why line 10 drops a negative streak',
      body: 'When 4 arrives, the streak `[1, −3]` is worth −2. Carrying it would give `−2 + 4 = 2`; starting fresh gives 4. A negative streak can only lower whatever comes next, so line 10 drops it, and `[4, −1, 2, 1]` can grow from there.\n\nThat is the key decision. Comparing with `x` itself (not resetting to 0) also keeps all-negative lists right: `[−3, −1, −2]` returns −1.',
      code: { view: 'final', lines: [9, 10] },
      values: { 10: 'max(4, -2 + 4) = 4 → restart' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: NUMS, phase: 'choose', i: 3, start: 3, current: 4, best: 1, choice: 'restart', note: 'streak [1, −3] = −2\nextend: −2 + 4 = 2\nrestart: 4  ← drop the baggage', noteTone: 'note' }) },
    },
  ],
  trace: {
    title: 'Run Kadane’s algorithm on your own numbers',
    inputs: [{ name: 'nums', label: 'Numbers', kind: 'numbers', default: '5, 4, -1, 7, 8' }],
    presets: [
      { label: 'All negative', values: { nums: '-3, -1, -2' } },
      { label: 'All positive', values: { nums: '2, 1, 3' } },
      { label: 'Single value', values: { nums: '-5' } },
      { label: 'Lesson example', values: { nums: '-2, 1, -3, 4, -1, 2, 1, -5, 4' } },
    ],
    maxItems: 10,
    run: (values) => {
      const nums = values['nums'];
      if (!Array.isArray(nums) || nums.length === 0) throw new Error('Enter at least one number.');
      return traceKadane(nums);
    },
  },
});

/** Scene of run step n (0-based), so build steps show the moment they describe. */
function at(n: number): Step['scene'] {
  return RUN[n]?.scene ?? { entities: [] };
}
