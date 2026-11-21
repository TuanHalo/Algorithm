import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface SearchState {
  readonly values: readonly number[];
  readonly target: number;
  readonly low: number;
  readonly high: number;
  readonly mid?: number;
  readonly found?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces `low`/`high`, show only the array and target. */
  readonly bare?: boolean;
}

/** Scene for one moment of the search: window band, pointers, discarded cells, variables. */
function scene(s: SearchState): Entity[] {
  const last = s.values.length - 1;
  const cellTones: Record<number, Tone> = {};
  if (!s.bare) {
    s.values.forEach((_, i) => {
      if (i < s.low || i > s.high) cellTones[i] = 'muted';
    });
  }
  if (s.mid !== undefined) cellTones[s.mid] = s.found === s.mid ? 'found' : 'compare';

  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (!s.bare) {
    if (s.low <= s.high) entities.push(range('window', 'arr', s.low, s.high, s.found === undefined ? 'compare' : 'found'));
    if (s.low >= 0 && s.low <= last) entities.push(ptr('low', 'arr', s.low, 'low', { tone: 'done', codeVar: 'low' }));
    if (s.high >= 0 && s.high <= last) entities.push(ptr('high', 'arr', s.high, 'high', { tone: 'done', codeVar: 'high' }));
  }
  if (s.mid !== undefined) entities.push(ptr('mid', 'arr', s.mid, 'mid', { side: 'top', tone: s.found === s.mid ? 'found' : 'active', codeVar: 'mid' }));

  const midValue = s.mid === undefined ? undefined : s.values[s.mid];
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      s.bare
        ? [{ name: 'target', value: s.target }]
        : [
            { name: 'target', value: s.target },
            { name: 'low', value: s.low },
            { name: 'high', value: s.high, tone: s.low > s.high ? 'miss' : 'default' },
            { name: 'mid', value: s.mid ?? '—', tone: s.mid === undefined ? 'muted' : 'default' },
            {
              name: 'arr[mid]',
              value: midValue ?? '—',
              tone: midValue === undefined ? 'muted' : midValue === s.target ? 'found' : 'compare',
            },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const windowSize = (low: number, high: number): number => Math.max(0, high - low + 1);

/** Runs binary search on any input and records one step per decision (chapter "run", final code). */
function traceBinarySearch(input: readonly number[], target: number): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const steps: Step[] = [];
  let low = 0;
  let high = values.length - 1;
  let checks = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ checks, window: windowSize(low, high), result });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Search for ${target} in ${values.length} sorted numbers`,
    body: `${wasSorted ? '' : 'Binary search needs sorted input, so the numbers were sorted first.\n\n'}Lines 2–3 make the window the whole array: \`low = 0\`, \`high = ${high}\`.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: 'low = 0', 3: `high = ${high}` },
    metrics: metrics(),
    scene: { entities: scene({ values, target, low, high }) },
  });

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const value = values[mid] ?? 0;
    checks += 1;
    if (value === target) {
      steps.push({
        chapter: 'run',
        short: `Found @${mid}`,
        title: `arr[${mid}] = ${value}, found it`,
        body: `Line 7: \`mid = ${low} + (${high} − ${low}) // 2 = ${mid}\`. Line 8: the middle value equals the target, so line 9 returns **${mid}** after ${checks} check${checks === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [7, 8, 9] },
        values: { 7: `mid = ${mid}`, 8: `${value} == ${target}`, 9: `return ${mid}` },
        metrics: metrics(mid),
        scene: { entities: scene({ values, target, low, high, mid, found: mid }) },
      });
      return steps;
    }
    steps.push({
      chapter: 'run',
      short: `mid = ${mid}`,
      title: `Check the middle: arr[${mid}] = ${value}`,
      body: `Line 7: \`mid = ${low} + (${high} − ${low}) // 2 = ${mid}\`. Line 8 compares \`${value}\` with \`${target}\`: not equal.`,
      code: { view: 'final', lines: [5, 7, 8] },
      values: { 5: `${low} <= ${high}`, 7: `mid = ${mid}`, 8: `${value} == ${target} → False` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high, mid }) },
    });
    if (value < target) {
      low = mid + 1;
      steps.push({
        chapter: 'run',
        short: `low → ${low}`,
        title: `${value} < ${target}: drop the left half`,
        body: `Everything at or left of index ${mid} is ≤ ${value}, so it can’t be ${target}. Line 11: \`low = mid + 1 = ${low}\`.`,
        code: { view: 'final', lines: [10, 11] },
        values: { 10: `${value} < ${target} → True`, 11: `low = ${low}` },
        metrics: metrics(),
        scene: { entities: scene({ values, target, low, high }) },
      });
    } else {
      high = mid - 1;
      steps.push({
        chapter: 'run',
        short: `high → ${high}`,
        title: `${value} > ${target}: drop the right half`,
        body: `Everything at or right of index ${mid} is ≥ ${value}, so it can’t be ${target}. Line 13: \`high = mid − 1 = ${high}\`.`,
        code: { view: 'final', lines: [12, 13] },
        values: { 10: `${value} < ${target} → False`, 13: `high = ${high}` },
        metrics: metrics(),
        scene: { entities: scene({ values, target, low, high }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Not found',
    title: `low (${low}) > high (${high}): the window is empty`,
    body: `Line 5’s condition fails, so the loop ends and line 15 returns **-1** after ${checks} check${checks === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [5, 15] },
    values: { 5: `${low} <= ${high} → False`, 15: 'return -1' },
    metrics: metrics(-1),
    scene: { entities: scene({ values, target, low, high, note: 'low > high → return -1', noteTone: 'miss' }) },
  });
  return steps;
}

const ARR = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91] as const;
const TARGET = 23;
const base = { values: ARR, target: TARGET } as const;

export default defineWalkthrough({
  id: 'learn/searching/binary-search',
  title: 'Binary Search, halving the window',
  summary: 'From the idea to the code: find 23 among 10 sorted numbers in 3 checks instead of 6, then try your own input.',
  minutes: 4,
  code: {
    lang: 'python',
    source: `def binary_search(arr: list[int], target: int) -> int:
    low = 0
    high = len(arr) - 1

    while low <= high:
        # Avoid integer overflow in fixed-width languages
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1   # Target can only live in the right half
        else:
            high = mid - 1  # Target can only live in the left half

    return -1  # Search window collapsed without a match`,
  },
  metrics: [
    { key: 'checks', label: 'Checks' },
    { key: 'window', label: 'Window size' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'search window / middle' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'found' },
  ],
  goals: [
    { text: 'Keep a window that must contain the target', step: 3 },
    { text: 'Halve the window with one comparison', step: 6 },
    { text: 'See why it takes O(log n) checks', step: 12 },
    { text: 'Spot the stopping rule: low > high', step: 13 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find 23 in a sorted array',
      body: 'Line 1: we get a **sorted** `arr` and a `target`, and return the target’s index, or `-1` if it isn’t there.\n\nScanning left to right would check `2, 5, 8, 12, 16, 23`: **6 checks**.',
      code: { view: 'signature', lines: [1] },
      metrics: { checks: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Look middle',
      title: 'One look at the middle rules out half',
      body: 'Because `arr` is sorted, the middle value tells us which half the target **can’t** be in.\n\nCompare `arr[4] = 16` with `23`: everything left of the middle is even smaller, so half the array is gone after one check.',
      code: { view: 'signature' },
      metrics: { checks: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, mid: 4, bare: true, note: 'sorted → one look\nrules out half' }) },
    },
    {
      chapter: 'build',
      short: 'Window',
      title: 'Lines 2–3: start with the whole array',
      body: '`low` and `high` mark the only place the target could still be. At the start that’s everything: `low = 0`, `high = 9`.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: { checks: 0, window: 10, result: '—' },
      changes: ['low = 0', 'high = len(arr) - 1'],
      scene: { entities: scene({ ...base, low: 0, high: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Lines 5–7: keep looking while the window has cells',
      body: 'Line 5 loops while the window is non-empty. Line 7 finds its middle: `0 + (9 − 0) // 2 = 4`.\n\nWriting it as `low + (high − low) // 2` keeps the sum small in languages with fixed-size integers (the comment on line 6).',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [5, 7] },
      metrics: { checks: 0, window: 10, result: '—' },
      changes: ['while low <= high', 'mid = low + (high - low) // 2'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Found?',
      title: 'Lines 8–9: stop when the middle is the target',
      body: 'If `arr[mid] == target`, line 9 returns `mid` straight away.\n\nHere `arr[4] = 16`, not `23`, so we keep going.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: { checks: 1, window: 10, result: '—' },
      changes: ['if arr[mid] == target: return mid'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Go right',
      title: 'Lines 10–11: too small, so search the right half',
      body: '`16 < 23`, and the array is sorted, so everything at index 0–4 is ≤ 16 and can’t be 23.\n\nLine 11 moves `low = mid + 1 = 5`. **Half the array is gone after one check.**',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: { checks: 1, window: 5, result: '—' },
      changes: ['low = mid + 1'],
      scene: { entities: scene({ ...base, low: 5, high: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Go left',
      title: 'Lines 12–13: too big, so search the left half',
      body: 'The mirror case: if `arr[mid]` is bigger than the target, everything from `mid` rightwards is out, so line 13 moves `high = mid − 1`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: { checks: 1, window: 5, result: '—' },
      changes: ['else: high = mid - 1'],
      scene: { entities: scene({ ...base, low: 5, high: 9, note: 'arr[mid] > target\n→ high = mid − 1' }) },
    },
    {
      chapter: 'build',
      short: 'Give up',
      title: 'Line 15: an empty window means "not here"',
      body: 'If the loop on line 5 ends because `low` passed `high`, there is nowhere left to look, so line 15 returns `-1`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15], lines: [5, 15] },
      metrics: { checks: 1, window: 5, result: '—' },
      changes: ['return -1'],
      scene: { entities: scene({ ...base, low: 5, high: 9 }) },
    },
    {
      chapter: 'run',
      short: 'Check 1',
      title: 'Check 1: arr[4] = 16 is too small',
      body: 'Line 7: `mid = 4`. Line 10: `16 < 23`, so line 11 sets `low = 5`.',
      code: { view: 'final', lines: [7, 10, 11] },
      values: { 5: '0 <= 9', 7: 'mid = 4', 10: '16 < 23 → True', 11: 'low = 5' },
      metrics: { checks: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, mid: 4 }) },
    },
    {
      chapter: 'run',
      short: 'Check 2',
      title: 'Check 2: arr[7] = 56 is too big',
      body: 'Line 7: `mid = 5 + (9 − 5) // 2 = 7`. Line 10: `56 < 23` is false, so line 13 sets `high = 6`.\n\nThe window is down to **2 cells**.',
      code: { view: 'final', lines: [7, 12, 13] },
      values: { 5: '5 <= 9', 7: 'mid = 7', 10: '56 < 23 → False', 13: 'high = 6' },
      metrics: { checks: 2, window: 5, result: '—' },
      scene: { entities: scene({ ...base, low: 5, high: 9, mid: 7 }) },
    },
    {
      chapter: 'run',
      short: 'Check 3',
      title: 'Check 3: arr[5] = 23, found it',
      body: 'Line 7: `mid = 5 + (6 − 5) // 2 = 5`. Line 8: `arr[5] == 23`, so line 9 returns **5**.\n\nThree checks instead of six.',
      code: { view: 'final', lines: [7, 8, 9] },
      values: { 5: '5 <= 6', 7: 'mid = 5', 8: '23 == 23', 9: 'return 5' },
      metrics: { checks: 3, window: 2, result: 5 },
      scene: { entities: scene({ ...base, low: 5, high: 6, mid: 5, found: 5 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Halving is why it’s O(log n)',
      body: 'Each pass of the loop (line 5) halves the window, so n items need at most about `log₂ n + 1` checks, using only `O(1)` extra space.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [5, 7] },
      metrics: { checks: 3, window: 2, result: 5 },
      scene: {
        entities: scene({
          ...base,
          low: 5,
          high: 6,
          mid: 5,
          found: 5,
          note: 'n = 10          →  ≤ 4 checks\nn = 1,000       →  ≤ 10 checks\nn = 1,000,000   →  ≤ 20 checks',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Not there',
      title: 'The stopping rule: low > high',
      body: 'Search for `20` instead: the same halving leaves `low = 5` and `high = 4`. Line 5’s `low <= high` fails, so line 15 returns `-1`.\n\nUsing `<=` (not `<`) is the key decision: it still checks a one-cell window before giving up.',
      code: { view: 'final', lines: [5, 15] },
      values: { 5: '5 <= 4 → False', 15: 'return -1' },
      metrics: { checks: 3, window: 0, result: -1 },
      scene: { entities: scene({ values: ARR, target: 20, low: 5, high: 4, note: 'low > high → window empty\nreturn -1', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Run binary search on your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (we sort it for you)', kind: 'numbers', default: '2, 5, 8, 12, 16, 23, 38, 56, 72, 91' },
      { name: 'target', label: 'Target', kind: 'number', default: '72' },
    ],
    presets: [
      { label: 'Found at the end', values: { arr: '1, 3, 5, 7, 9, 11, 13, 15', target: '15' } },
      { label: 'Missing value', values: { arr: '4, 8, 15, 16, 23, 42', target: '10' } },
      { label: 'First element', values: { arr: '10, 20, 30, 40, 50, 60, 70', target: '10' } },
      { label: 'Unsorted input', values: { arr: '9, 2, 7, 4, 1, 8', target: '7' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      return traceBinarySearch(input, target);
    },
  },
});
