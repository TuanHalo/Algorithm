import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/**
 * `first`: the first window is summed. `probe`: line 10–12 picked the values that enter and leave.
 * `update`: line 13 changed the sum. `better` / `worse`: line 14's verdict. `done`: the best window is returned.
 */
type Phase = 'first' | 'probe' | 'update' | 'better' | 'worse' | 'done';

interface WindowState {
  readonly values: readonly number[];
  readonly k: number;
  readonly phase?: Phase;
  /** Index of the value entering the window (the loop variable). */
  readonly i?: number;
  readonly windowSum?: number;
  readonly maxSum?: number;
  /** Start of the best window so far, shown when the answer is returned. */
  readonly bestStart?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the loop variables (before the code has them). */
  readonly bare?: boolean;
  readonly arrayId?: string;
}

/** Scene for one moment: the window band, the entering and leaving values, and the variables. */
function scene(s: WindowState): Entity[] {
  const id = s.arrayId ?? 'nums';
  const { k, i, phase } = s;
  const tones: Record<number, Tone> = {};
  const entities: Entity[] = [];
  let from: number | undefined;
  let to: number | undefined;
  if (phase === 'first') [from, to] = [0, k - 1];
  else if (phase === 'done' && s.bestStart !== undefined) [from, to] = [s.bestStart, s.bestStart + k - 1];
  else if (i !== undefined && phase === 'probe') [from, to] = [i - k, i - 1];
  else if (i !== undefined) [from, to] = [i - k + 1, i];
  if (i !== undefined && phase !== 'done') {
    tones[i] = 'active';
    tones[i - k] = 'muted';
  }
  entities.push(arr(id, 0, 0, s.values, { label: 'nums', tones, codeVar: 'nums' }));
  if (from !== undefined && to !== undefined) entities.push(range('window', id, from, to, phase === 'done' ? 'found' : 'compare'));
  if (i !== undefined && phase !== 'done') {
    entities.push(ptr('i', id, i, 'i', { side: 'top', tone: 'active', codeVar: 'i' }));
    entities.push(ptr('out', id, i - k, 'i - k', { tone: 'muted' }));
  }

  const dash = (v: number | undefined): number | string => v ?? '—';
  const sumTone: Tone = phase === 'better' ? 'found' : phase === 'worse' ? 'miss' : s.windowSum === undefined ? 'muted' : 'default';
  const rows: VarRow[] = s.bare
    ? [{ name: 'k', value: k }]
    : [
        { name: 'k', value: k },
        { name: 'i', value: phase === 'done' ? '—' : dash(i), tone: i === undefined || phase === 'done' ? 'muted' : 'default' },
        { name: 'incoming', value: i === undefined || phase === 'done' ? '—' : dash(s.values[i]), tone: i === undefined || phase === 'done' ? 'muted' : 'default' },
        { name: 'outgoing', value: i === undefined || phase === 'done' ? '—' : dash(s.values[i - k]), tone: i === undefined || phase === 'done' ? 'muted' : 'default' },
        { name: 'window_sum', value: dash(s.windowSum), tone: sumTone },
        { name: 'max_sum', value: dash(s.maxSum), tone: s.maxSum === undefined ? 'muted' : phase === 'better' || phase === 'done' ? 'found' : 'default' },
      ];
  entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 190 }));

  if (phase === 'update' && i !== undefined) {
    entities.push(link('in', { entity: id, index: i, side: 'bottom' }, { entity: 'vals', key: 'window_sum' }, { label: `+ ${s.values[i]}`, tone: 'active', flow: true }));
    entities.push(link('drop', { entity: id, index: i - k, side: 'bottom' }, { entity: 'vals', key: 'window_sum' }, { label: `− ${s.values[i - k]}`, tone: 'muted', dashed: true }));
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Runs the fixed window on any input and records one step per decision (chapter "run", final code). */
function traceFixedWindow(values: readonly number[], k: number): Step[] {
  const steps: Step[] = [];
  let slides = 0;
  let ops = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ slides, ops, result });
  const n = values.length;

  if (n < k || k <= 0) {
    steps.push({
      chapter: 'run',
      short: 'Return 0',
      title: k <= 0 ? `k = ${k}: no window to sum` : `Only ${n} value${n === 1 ? '' : 's'}: no window of ${k} fits`,
      body: `Line 2: ${k <= 0 ? `\`k <= 0\` is true` : `\`len(nums) < k\` is true (${n} < ${k})`}, so there is no window of size ${k}. Line 3 returns **0**.`,
      code: { view: 'final', lines: [2, 3] },
      values: { 2: `${n} < ${k} or ${k} <= 0 → True`, 3: 'return 0' },
      metrics: metrics(0),
      scene: { entities: scene({ values, k, bare: true, note: `no window of ${k} fits\nreturn 0`, noteTone: 'miss' }) },
    });
    return steps;
  }

  steps.push({
    chapter: 'run',
    short: 'Fits',
    title: `A window of ${k} fits in ${n} values`,
    body: `Line 2: \`${n} < ${k}\` is false and \`${k} <= 0\` is false, so at least one window fits and we skip line 3.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `${n} < ${k} or ${k} <= 0 → False` },
    metrics: metrics(),
    scene: { entities: scene({ values, k, bare: true }) },
  });

  let windowSum = values.slice(0, k).reduce((a, b) => a + b, 0);
  ops += k - 1;
  steps.push({
    chapter: 'run',
    short: 'First sum',
    title: `The first window: ${show(values.slice(0, k))} = ${windowSum}`,
    body: `Line 6 adds the first ${k} values once, in full: \`${values.slice(0, k).join(' + ')} = ${windowSum}\`. This is the only time a whole window is summed.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `window_sum = ${values.slice(0, k).join(' + ')} = ${windowSum}` },
    metrics: metrics(),
    scene: { entities: scene({ values, k, phase: 'first', windowSum }) },
  });

  let maxSum = windowSum;
  let bestStart = 0;
  steps.push({
    chapter: 'run',
    short: 'Best so far',
    title: `Best so far: ${maxSum}`,
    body: `Line 7: \`max_sum = ${maxSum}\`. The first window is the only one we’ve seen, so it’s the best.`,
    code: { view: 'final', lines: [7] },
    values: { 7: `max_sum = ${maxSum}` },
    metrics: metrics(),
    scene: { entities: scene({ values, k, phase: 'first', windowSum, maxSum }) },
  });

  for (let i = k; i < n; i += 1) {
    const incoming = values[i] ?? 0;
    const outgoing = values[i - k] ?? 0;
    slides += 1;
    steps.push({
      chapter: 'run',
      short: `i = ${i}`,
      title: `Slide right: ${incoming} enters, ${outgoing} leaves`,
      body: `Line 10: \`i = ${i}\`. Line 11 picks the value entering on the right, \`nums[${i}] = ${incoming}\`. Line 12 picks the one leaving on the left, \`nums[${i} − ${k}] = ${outgoing}\`.`,
      code: { view: 'final', lines: [10, 11, 12] },
      values: { 10: `i = ${i}`, 11: `incoming = ${incoming}`, 12: `outgoing = nums[${i - k}] = ${outgoing}` },
      metrics: metrics(),
      scene: { entities: scene({ values, k, phase: 'probe', i, windowSum, maxSum }) },
    });
    const before = windowSum;
    windowSum += incoming - outgoing;
    ops += 2;
    steps.push({
      chapter: 'run',
      short: 'Update sum',
      title: `New window ${show(values.slice(i - k + 1, i + 1))} = ${windowSum}`,
      body: `Line 13: \`window_sum += ${incoming} − ${outgoing}\`, so \`${before} + ${incoming} − ${outgoing} = ${windowSum}\`. The ${k - 1} shared value${k - 1 === 1 ? ' is' : 's are'} never added again.`,
      code: { view: 'final', lines: [13] },
      values: { 13: `window_sum = ${before} + ${incoming} - ${outgoing} = ${windowSum}` },
      metrics: metrics(),
      scene: { entities: scene({ values, k, phase: 'update', i, windowSum, maxSum }) },
    });
    const better = windowSum > maxSum;
    steps.push({
      chapter: 'run',
      short: better ? 'Better' : 'Not better',
      title: better ? `${windowSum} > ${maxSum}: a new best window` : `${windowSum} > ${maxSum} is false: keep the best`,
      body: better
        ? `Line 14: \`${windowSum} > ${maxSum}\` is true. This window beats every earlier one.`
        : `Line 14: \`${windowSum} > ${maxSum}\` is false, so \`max_sum\` stays ${maxSum}.`,
      code: { view: 'final', lines: [14] },
      values: { 14: `${windowSum} > ${maxSum} → ${better ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ values, k, phase: better ? 'better' : 'worse', i, windowSum, maxSum }) },
    });
    if (better) {
      maxSum = windowSum;
      bestStart = i - k + 1;
      steps.push({
        chapter: 'run',
        short: 'New best',
        title: `max_sum = ${maxSum}`,
        body: `Line 15 records it: \`max_sum = ${maxSum}\`, the window ${show(values.slice(bestStart, i + 1))}.`,
        code: { view: 'final', lines: [15] },
        values: { 15: `max_sum = ${maxSum}` },
        metrics: metrics(),
        scene: { entities: scene({ values, k, phase: 'better', i, windowSum, maxSum }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Best window ${show(values.slice(bestStart, bestStart + k))} = ${maxSum}`,
    body: `${slides > 0 ? `The window reached the end after ${slides} slide${slides === 1 ? '' : 's'}, so the loop is over. ` : 'There is nothing to slide: the first window is the only one. '}Line 17 returns **${maxSum}** after ${ops} addition${ops === 1 ? '' : 's'} and subtraction${ops === 1 ? '' : 's'} in total.`,
    code: { view: 'final', lines: [17] },
    values: { 17: `return ${maxSum}` },
    metrics: metrics(maxSum),
    scene: { entities: scene({ values, k, phase: 'done', windowSum, maxSum, bestStart }) },
  });
  return steps;
}

const NUMS = [2, 1, 5, 1, 3, 2] as const;
const K = 3;
const base = { values: NUMS, k: K } as const;
const RUN = traceFixedWindow(NUMS, K);
const startMetrics = { slides: 0, ops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const TRAP = [-4, -1, -3, -2] as const;

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/sliding-window-fixed',
  title: 'Fixed-Size Sliding Window, add one and drop one',
  summary: 'From the idea to the code: find the biggest sum of any 3 neighbouring values by sliding a window and updating its sum with one addition and one subtraction.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def max_sub_array_of_size_k(k: int, nums: list[int]) -> int:
    if len(nums) < k or k <= 0:
        return 0

    # Sum the first window in full, once
    window_sum = sum(nums[:k])
    max_sum = window_sum

    # Each slide adds the value that enters and drops the one that leaves
    for i in range(k, len(nums)):
        incoming = nums[i]
        outgoing = nums[i - k]
        window_sum += incoming - outgoing
        if window_sum > max_sum:
            max_sum = window_sum

    return max_sum`,
  },
  snapshots: {
    brute: `def max_sub_array_of_size_k(k: int, nums: list[int]) -> int:
    best = sum(nums[:k])
    for start in range(1, len(nums) - k + 1):
        best = max(best, sum(nums[start:start + k]))  # Re-adds k values
    return best`,
  },
  metrics: [
    { key: 'slides', label: 'Slides' },
    { key: 'ops', label: 'Adds + subtracts' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'current window' },
    { tone: 'active', label: 'value entering' },
    { tone: 'muted', label: 'value leaving' },
    { tone: 'miss', label: 'not better' },
    { tone: 'found', label: 'best window' },
  ],
  goals: [
    { text: 'See what re-summing every window wastes', step: 2 },
    { text: 'Update a window sum with one add and one subtract', step: 3 },
    { text: 'Follow every slide and comparison', step: 10 },
    { text: 'Know why max_sum starts at the first window, not 0', step: 9 + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The biggest sum of 3 neighbours',
      body: 'Like the side window of a train three poles wide: as a new pole comes into view on the right, the leftmost one slips out.\n\nLine 1 gets a window size `k` and a list `nums`, and returns the biggest sum of `k` neighbouring values. Here `k = 3` on `[2, 1, 5, 1, 3, 2]`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Re-sum',
      title: 'The obvious way: sum every window from scratch',
      body: 'Line 4 sums each window of `k` values on its own. But neighbouring windows overlap: `[2, 1, 5]` and `[1, 5, 1]` share 1 and 5, and both get added again.\n\nThat’s `k` additions per window, about `n · k` in total: **`O(n·k)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 1: 'miss', 2: 'miss' }, codeVar: 'nums' }),
          range('window', 'nums', 1, 3, 'compare'),
          vars('vals', 0, VARS_Y, [{ name: 'k', value: K }], { label: 'variables', width: 190 }),
          note('note', NOTE_X, VARS_Y, '[2, 1, 5] → 2 + 1 + 5\n[1, 5, 1] → 1 + 5 + 1   (1 and 5 again)\nk additions per window → O(n·k)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Slide',
      title: 'Slide instead: add the new value, drop the old',
      body: 'Moving one step right changes only the two ends: one value enters on the right, one leaves on the left. So the new sum is the old sum `+ incoming − outgoing`.\n\nTwo operations per window, whatever `k` is.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 0: 'muted', 3: 'active' }, codeVar: 'nums' }),
          range('window', 'nums', 1, 3, 'compare'),
          vars('vals', 0, VARS_Y, [{ name: 'k', value: K }], { label: 'variables', width: 190 }),
          note('note', NOTE_X, VARS_Y, '[2, 1, 5] = 8\n[1, 5, 1] = 8 − 2 + 1 = 7'),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 2–3: no window fits, return 0',
      body: 'If the list is shorter than `k`, or `k` isn’t positive, there is no window to sum, so line 3 returns 0.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if len(nums) < k or k <= 0: return 0'],
      scene: { entities: scene({ ...base, bare: true }) },
    },
    {
      chapter: 'build',
      short: 'First window',
      title: 'Lines 5–7: sum the first window once',
      body: 'Line 6 adds up the first `k` values: `2 + 1 + 5 = 8`. Line 7 starts the best at that window.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['window_sum = sum(nums[:k])', 'max_sum = window_sum'],
      scene: { entities: scene({ ...base, phase: 'first', windowSum: 8, maxSum: 8 }) },
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Lines 9–10: slide until the right edge hits the end',
      body: '`i` is the index of the value entering the window. It starts at `k`, the first value outside the first window, and runs to the end of the list.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 9, 10], lines: [10] },
      metrics: startMetrics,
      changes: ['for i in range(k, len(nums))'],
      scene: { entities: scene({ ...base, phase: 'probe', i: 3, windowSum: 8, maxSum: 8 }) },
    },
    {
      chapter: 'build',
      short: 'Add & drop',
      title: 'Lines 11–13: one value in, one value out',
      body: 'Line 11 takes the entering value `nums[i]`. The leaving one is `k` slots to its left, `nums[i − k]` (line 12).\n\nLine 13 updates the sum with just those two: `8 + 1 − 2 = 7`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 9, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: startMetrics,
      changes: ['incoming = nums[i]', 'outgoing = nums[i - k]', 'window_sum += incoming - outgoing'],
      scene: { entities: scene({ ...base, phase: 'update', i: 3, windowSum: 7, maxSum: 8 }) },
    },
    {
      chapter: 'build',
      short: 'Keep best',
      title: 'Lines 14–15: remember the biggest window',
      body: 'If this window’s sum beats the best so far, line 15 records it. At `i = 4` the window `[5, 1, 3]` makes 9, beating 8.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15], lines: [14, 15] },
      metrics: startMetrics,
      changes: ['if window_sum > max_sum: max_sum = window_sum'],
      scene: { entities: scene({ ...base, phase: 'better', i: 4, windowSum: 9, maxSum: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 17: return the best sum',
      body: 'When the window reaches the end of the list, line 17 returns the best sum it saw.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [17] },
      metrics: startMetrics,
      changes: ['return max_sum'],
      scene: { entities: scene({ ...base, phase: 'done', windowSum: 6, maxSum: 9, bestStart: 2 }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Two operations per slide is why it’s O(n)',
      body: 'The first window costs `k − 1` additions, then each of the `n − k` slides costs one add and one subtract: about `2n` in total, **`O(n)` time** whatever `k` is. Only a few integers are stored: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [6, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...base, phase: 'done', windowSum: 6, maxSum: 9, bestStart: 2, note: 'first window + 2 per slide\nn = 10⁶, k = 1,000:\n≈ 2·10⁶ operations instead of ≈ 10⁹', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Start value',
      title: 'Why line 7 starts at the first window, not 0',
      body: 'Every window of `[-4, -1, -3, -2]` with `k = 2` is negative: −5, −4, −5. Starting the best at `0` would return 0, a sum no window has.\n\nThat is the key decision: `max_sum` starts as a real window’s sum, so the answer is always one of the windows.',
      code: { view: 'final', lines: [6, 7] },
      values: { 6: 'window_sum = -4 + -1 = -5', 7: 'max_sum = -5, not 0' },
      metrics: { slides: 2, ops: 5, result: -4 },
      scene: {
        entities: scene({
          values: TRAP,
          k: 2,
          phase: 'done',
          windowSum: -5,
          maxSum: -4,
          bestStart: 1,
          arrayId: 'trap',
          note: 'windows: −5, −4, −5 → answer −4\nmax_sum = 0 would return 0,\na sum no window has',
          noteTone: 'miss',
        }),
      },
    },
  ],
  trace: {
    title: 'Slide a window over your own numbers',
    inputs: [
      { name: 'nums', label: 'Numbers', kind: 'numbers', default: '4, 2, 1, 7, 8, 1, 2, 8, 1, 0' },
      { name: 'k', label: 'Window size k', kind: 'number', default: '3' },
    ],
    presets: [
      { label: 'All negative', values: { nums: '-4, -1, -3, -2', k: '2' } },
      { label: 'k = 1', values: { nums: '3, 9, 2, 5', k: '1' } },
      { label: 'Window = whole list', values: { nums: '1, 2, 3', k: '3' } },
      { label: 'k too big', values: { nums: '1, 2', k: '3' } },
    ],
    maxItems: 10,
    run: (values) => {
      const nums = values['nums'];
      const k = values['k'];
      if (!Array.isArray(nums) || typeof k !== 'number') throw new Error('Enter some numbers and a window size.');
      return traceFixedWindow(nums, k);
    },
  },
});
