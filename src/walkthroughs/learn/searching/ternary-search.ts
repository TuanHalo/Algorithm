import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface ThirdsState {
  readonly values: readonly number[];
  readonly target: number;
  readonly low: number;
  readonly high: number;
  readonly mid1?: number;
  readonly mid2?: number;
  /** Shown as given; by default derived from `mid1 - low` while `mid1` is still in the window. */
  readonly third?: number;
  readonly found?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces `low`/`high`, show only the array and target. */
  readonly bare?: boolean;
}

/** Scene for one moment: window band, low/high, the two dividers and the variables. */
function scene(s: ThirdsState): Entity[] {
  const last = s.values.length - 1;
  const cellTones: Record<number, Tone> = {};
  if (!s.bare) {
    s.values.forEach((_, i) => {
      if (i < s.low || i > s.high) cellTones[i] = 'muted';
    });
  }
  for (const m of [s.mid1, s.mid2]) if (m !== undefined) cellTones[m] = s.found === m ? 'found' : 'compare';

  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (!s.bare) {
    if (s.low <= s.high) entities.push(range('window', 'arr', s.low, s.high, s.found === undefined ? 'compare' : 'found'));
    if (s.low >= 0 && s.low <= last) entities.push(ptr('low', 'arr', s.low, 'low', { tone: 'done', codeVar: 'low' }));
    if (s.high >= 0 && s.high <= last) entities.push(ptr('high', 'arr', s.high, 'high', { tone: 'done', codeVar: 'high' }));
  }
  if (s.mid1 !== undefined) entities.push(ptr('mid1', 'arr', s.mid1, 'mid1', { side: 'top', tone: s.found === s.mid1 ? 'found' : 'active', codeVar: 'mid1' }));
  if (s.mid2 !== undefined) entities.push(ptr('mid2', 'arr', s.mid2, 'mid2', { side: 'top', tone: s.found === s.mid2 ? 'found' : 'active', codeVar: 'mid2' }));

  const third = s.third ?? (s.mid1 !== undefined && s.mid1 >= s.low ? s.mid1 - s.low : undefined);
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
            { name: 'third', value: third ?? '—', tone: third === undefined ? 'muted' : 'default' },
            { name: 'mid1', value: s.mid1 ?? '—', tone: s.mid1 === undefined ? 'muted' : 'default' },
            { name: 'mid2', value: s.mid2 ?? '—', tone: s.mid2 === undefined ? 'muted' : 'default' },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs ternary search on any input and records two steps per pass: the dividers, then the third kept (chapter "run", final code). */
function traceTernary(input: readonly number[], target: number): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const at = (i: number): number => values[i] ?? 0;
  const steps: Step[] = [];
  let low = 0;
  let high = values.length - 1;
  let passes = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ passes, window: Math.max(0, high - low + 1), result });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Search for ${target} in ${values.length} sorted numbers`,
    body: `${wasSorted ? '' : 'Ternary search needs sorted input, so the numbers were sorted first.\n\n'}Line 2 makes the window the whole array: \`low = 0\`, \`high = ${high}\`. Line 4 starts the loop.`,
    code: { view: 'final', lines: [2, 4] },
    values: { 2: `low, high = 0, ${high}`, 4: `0 <= ${high} → ${high >= 0 ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ values, target, low, high }) },
  });

  while (low <= high) {
    passes += 1;
    const third = Math.floor((high - low) / 3);
    const mid1 = low + third;
    const mid2 = high - third;
    steps.push({
      chapter: 'run',
      short: 'Dividers',
      title: `Pass ${passes}: dividers at ${mid1} and ${mid2}`,
      body: `Line 5: \`third = (${high} − ${low}) // 3 = ${third}\`. Line 6: \`mid1 = ${low} + ${third} = ${mid1}\`. Line 7: \`mid2 = ${high} − ${third} = ${mid2}\`.`,
      code: { view: 'final', lines: [4, 5, 6, 7] },
      values: { 4: `${low} <= ${high} → True`, 5: `third = ${third}`, 6: `mid1 = ${mid1}`, 7: `mid2 = ${mid2}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high, mid1, mid2 }) },
    });
    for (const [line, mid, name] of [[9, mid1, 'mid1'], [11, mid2, 'mid2']] as const) {
      const hit = at(mid) === target;
      steps.push({
        chapter: 'run',
        short: `${name}?`,
        title: `Is it at ${name}? arr[${mid}] = ${at(mid)}${hit ? ', yes' : ''}`,
        body: `Line ${line}: \`arr[${mid}] = ${at(mid)}\` ${hit ? 'equals the target.' : `is not ${target}.`}`,
        code: { view: 'final', lines: [line] },
        values: { [line]: `${at(mid)} == ${target} → ${hit ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene({ values, target, low, high, mid1, mid2, found: hit ? mid : undefined }) },
      });
      if (hit) {
        steps.push({
          chapter: 'run',
          short: `Return ${mid}`,
          title: `Found it: return ${mid}`,
          body: `Line ${line + 1} returns **${mid}** after ${passes} pass${passes === 1 ? '' : 'es'}.`,
          code: { view: 'final', lines: [line + 1] },
          values: { [line + 1]: `return ${mid}` },
          metrics: metrics(mid),
          scene: { entities: scene({ values, target, low, high, mid1, mid2, found: mid }) },
        });
        return steps;
      }
    }
    let kept: string;
    let lines: number[];
    let moved: Record<number, string>;
    if (target < at(mid1)) {
      high = mid1 - 1;
      kept = 'left';
      lines = [14, 15];
      moved = { 14: `${target} < ${at(mid1)} → True`, 15: `high = ${high}` };
    } else if (target > at(mid2)) {
      low = mid2 + 1;
      kept = 'right';
      lines = [16, 17];
      moved = { 14: `${target} < ${at(mid1)} → False`, 16: `${target} > ${at(mid2)} → True`, 17: `low = ${low}` };
    } else {
      low = mid1 + 1;
      high = mid2 - 1;
      kept = 'middle';
      lines = [18, 19];
      moved = { 14: `${target} < ${at(mid1)} → False`, 16: `${target} > ${at(mid2)} → False`, 19: `low, high = ${low}, ${high}` };
    }
    steps.push({
      chapter: 'run',
      short: `Keep ${kept}`,
      title: `Keep the ${kept} third`,
      body: `${target} is ${kept === 'left' ? `below ${at(mid1)}` : kept === 'right' ? `above ${at(mid2)}` : `between ${at(mid1)} and ${at(mid2)}`}, so line ${lines[1]} keeps only the ${kept} third: ${low <= high ? `indexes ${low}–${high}` : 'nothing is left'}.`,
      code: { view: 'final', lines },
      values: moved,
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high, mid1, mid2, third }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Not found',
    title: `low (${low}) > high (${high}): the window is empty`,
    body: 'Line 4’s condition fails, so line 21 returns **-1**.',
    code: { view: 'final', lines: [4, 21] },
    values: { 4: `${low} <= ${high} → False`, 21: 'return -1' },
    metrics: metrics(-1),
    scene: { entities: scene({ values, target, low, high, note: 'low > high → return -1', noteTone: 'miss' }) },
  });
  return steps;
}

const ARR = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91] as const;
const TARGET = 23;
const base = { values: ARR, target: TARGET } as const;

export default defineWalkthrough({
  id: 'learn/searching/ternary-search',
  title: 'Ternary Search, two dividers per pass',
  summary: 'From the idea to the code: check two dividers to keep one third of the window per pass, and see why that still loses to binary search on arrays.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def ternary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1

    while low <= high:
        third = (high - low) // 3
        mid1 = low + third
        mid2 = high - third

        if arr[mid1] == target:
            return mid1
        if arr[mid2] == target:
            return mid2

        if target < arr[mid1]:
            high = mid1 - 1       # Target belongs in the left third
        elif target > arr[mid2]:
            low = mid2 + 1        # Target belongs in the right third
        else:
            low, high = mid1 + 1, mid2 - 1  # Keep only the middle third

    return -1`,
  },
  metrics: [
    { key: 'passes', label: 'Passes' },
    { key: 'window', label: 'Window size' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'search window / dividers' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'found' },
  ],
  goals: [
    { text: 'Rule out two thirds with two comparisons', step: 2 },
    { text: 'Place the two dividers', step: 4 },
    { text: 'Pick the left, middle or right third', step: 9 },
    { text: 'See why small windows still shrink', step: 20 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find 23 using two dividers',
      body: 'Picture two friends standing at the 1/3 and 2/3 marks of a sorted bookshelf: one glance at both tells you which third holds your book.\n\nLine 1 takes a sorted `arr` and a `target` and returns the target’s index, or `-1`.',
      code: { view: 'signature', lines: [1] },
      metrics: { passes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Thirds',
      title: 'Two dividers rule out two thirds',
      body: 'Instead of one middle, look at two dividers. Comparing the target with both rules out **two thirds** of the window at once, keeping only the left, middle or right third.',
      code: { view: 'signature' },
      metrics: { passes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6, bare: true, note: '23 is between 12 and 38\n→ keep the middle third' }) },
    },
    {
      chapter: 'build',
      short: 'Window',
      title: 'Lines 2–4: the window',
      body: 'Line 2 starts with the whole array, and line 4 loops while the window has cells.',
      code: { view: 'reveal', reveal: [1, 2, 4], lines: [2, 4] },
      metrics: { passes: 0, window: 10, result: '—' },
      changes: ['low, high = 0, len(arr) - 1', 'while low <= high'],
      scene: { entities: scene({ ...base, low: 0, high: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Dividers',
      title: 'Lines 5–7: place the two dividers',
      body: 'Line 5 measures a third of the window: `(9 − 0) // 3 = 3`. Line 6 puts `mid1` a third in from the left (index 3), and line 7 puts `mid2` a third in from the right (index 6).',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: { passes: 1, window: 10, result: '—' },
      changes: ['third = (high - low) // 3', 'mid1 = low + third', 'mid2 = high - third'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6 }) },
    },
    {
      chapter: 'build',
      short: 'mid1 hit?',
      title: 'Lines 9–10: is it at mid1?',
      body: 'Lines 9–10 return `mid1` if it holds the target. `arr[3] = 12`, so no.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 9, 10], lines: [9, 10] },
      metrics: { passes: 1, window: 10, result: '—' },
      changes: ['if arr[mid1] == target: return mid1'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6 }) },
    },
    {
      chapter: 'build',
      short: 'mid2 hit?',
      title: 'Lines 11–12: is it at mid2?',
      body: 'Lines 11–12 do the same for `mid2`. `arr[6] = 38`, also no.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 9, 10, 11, 12], lines: [11, 12] },
      metrics: { passes: 1, window: 10, result: '—' },
      changes: ['if arr[mid2] == target: return mid2'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6 }) },
    },
    {
      chapter: 'build',
      short: 'Left third',
      title: 'Lines 14–15: smaller than mid1',
      body: 'If the target is smaller than `arr[mid1]`, only the left third can hold it, so line 15 moves `high` to just before `mid1`.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15], lines: [14, 15] },
      metrics: { passes: 1, window: 10, result: '—' },
      changes: ['if target < arr[mid1]: high = mid1 - 1'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6, note: 'target < arr[mid1]\n→ keep indexes 0–2' }) },
    },
    {
      chapter: 'build',
      short: 'Right third',
      title: 'Lines 16–17: bigger than mid2',
      body: 'If it’s bigger than `arr[mid2]`, line 17 keeps only the right third, starting just after `mid2`.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 17], lines: [16, 17] },
      metrics: { passes: 1, window: 10, result: '—' },
      changes: ['elif target > arr[mid2]: low = mid2 + 1'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6, note: 'target > arr[mid2]\n→ keep indexes 7–9' }) },
    },
    {
      chapter: 'build',
      short: 'Middle third',
      title: 'Lines 18–21: between the dividers',
      body: 'Otherwise the target sits between the dividers, and line 19 keeps the middle third. Line 21 returns `-1` once the window is empty.\n\nNow let’s run it.',
      code: { view: 'final', lines: [18, 19, 21] },
      metrics: { passes: 1, window: 10, result: '—' },
      changes: ['else: low, high = mid1 + 1, mid2 - 1', 'return -1'],
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6, note: '12 < 23 < 38\n→ keep indexes 4–5' }) },
    },
    {
      chapter: 'run',
      short: 'Start',
      title: 'The window starts as the whole array',
      body: 'Line 2: `low = 0`, `high = 9`, so the target could be at any index. Line 4: `0 <= 9`, so the loop starts.',
      code: { view: 'final', lines: [2, 4] },
      values: { 2: 'low, high = 0, 9', 4: '0 <= 9 → True' },
      metrics: { passes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9 }) },
    },
    {
      chapter: 'run',
      short: 'Dividers',
      title: 'Pass 1: place the dividers at 3 and 6',
      body: 'Line 5: `third = (9 − 0) // 3 = 3`. Line 6: `mid1 = 0 + 3 = 3`, a third in from the left. Line 7: `mid2 = 9 − 3 = 6`, a third in from the right.',
      code: { view: 'final', lines: [5, 6, 7] },
      values: { 5: 'third = (9 - 0) // 3 = 3', 6: 'mid1 = 0 + 3 = 3', 7: 'mid2 = 9 - 3 = 6' },
      metrics: { passes: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6 }) },
    },
    {
      chapter: 'run',
      short: 'mid1?',
      title: 'Is it at mid1? arr[3] = 12',
      body: 'Line 9 checks the first divider: `arr[3] = 12` is not 23, so we don’t return.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'arr[3] = 12 == 23 → False' },
      metrics: { passes: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6 }) },
    },
    {
      chapter: 'run',
      short: 'mid2?',
      title: 'Is it at mid2? arr[6] = 38',
      body: 'Line 11 checks the second divider: `arr[6] = 38` is not 23 either.',
      code: { view: 'final', lines: [11] },
      values: { 11: 'arr[6] = 38 == 23 → False' },
      metrics: { passes: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, mid1: 3, mid2: 6 }) },
    },
    {
      chapter: 'run',
      short: 'Keep middle',
      title: '12 < 23 < 38: keep the middle third',
      body: 'Line 14: 23 isn’t below 12, so it’s not in the left third. Line 16: it isn’t above 38, so it’s not in the right third.\n\nIt must be between the dividers: line 19 keeps indexes 4–5. From 10 cells down to 2 in one pass.',
      code: { view: 'final', lines: [14, 16, 18, 19] },
      values: { 14: '23 < 12 → False', 16: '23 > 38 → False', 19: 'low, high = 3 + 1, 6 - 1 = 4, 5' },
      metrics: { passes: 1, window: 2, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 5, mid1: 3, mid2: 6, third: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Dividers',
      title: 'Pass 2: only 2 cells, so third is 0',
      body: 'Line 4: `4 <= 5`, keep going. Line 5: `third = (5 − 4) // 3 = 0`.\n\nSo `mid1 = 4 + 0 = 4` and `mid2 = 5 − 0 = 5`: the dividers are the two cells themselves.',
      code: { view: 'final', lines: [4, 5, 6, 7] },
      values: { 4: '4 <= 5 → True', 5: 'third = (5 - 4) // 3 = 0', 6: 'mid1 = 4 + 0 = 4', 7: 'mid2 = 5 - 0 = 5' },
      metrics: { passes: 2, window: 2, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 5, mid1: 4, mid2: 5 }) },
    },
    {
      chapter: 'run',
      short: 'mid1?',
      title: 'Is it at mid1? arr[4] = 16',
      body: 'Line 9: `arr[4] = 16` is not 23.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'arr[4] = 16 == 23 → False' },
      metrics: { passes: 2, window: 2, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 5, mid1: 4, mid2: 5 }) },
    },
    {
      chapter: 'run',
      short: 'mid2?',
      title: 'Is it at mid2? arr[5] = 23, yes',
      body: 'Line 11: `arr[5] = 23` equals the target.',
      code: { view: 'final', lines: [11] },
      values: { 11: 'arr[5] = 23 == 23 → True' },
      metrics: { passes: 2, window: 2, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 5, mid1: 4, mid2: 5, found: 5 }) },
    },
    {
      chapter: 'run',
      short: 'Return 5',
      title: 'Found it: return 5',
      body: 'Line 12 returns **5** after 2 passes.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'return 5' },
      metrics: { passes: 2, window: 2, result: 5 },
      scene: { entities: scene({ ...base, low: 4, high: 5, mid1: 4, mid2: 5, found: 5 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Fewer passes, but more comparisons',
      body: 'Each pass keeps a third of the window, so it takes about `log₃ n` passes: **`O(log₃ n)` time**, `O(1)` space.\n\nBut every pass checks **two** dividers, about `2 · log₃ n ≈ 1.26 · log₂ n` comparisons, so on a sorted array plain binary search does less work.',
      code: { view: 'final', lines: [9, 11] },
      metrics: { passes: 2, window: 2, result: 5 },
      scene: {
        entities: scene({
          ...base,
          low: 4,
          high: 5,
          mid1: 4,
          mid2: 5,
          found: 5,
          note: 'n = 1,000,000:\nbinary   ≈ 20 comparisons\nternary  ≈ 25 comparisons',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Tiny window',
      title: 'Why line 7 counts mid2 back from high',
      body: 'In a window of 1 or 2 cells, `third` is 0, so `mid1 = low` and `mid2 = high`: both cells still get checked and the window always shrinks. That’s exactly how pass 2 found 23.\n\nCounting `mid2` back from `high`, instead of `low + 2 · third`, is the key decision.',
      code: { view: 'final', lines: [5, 6, 7] },
      values: { 5: 'third = 0', 6: 'mid1 = low = 4', 7: 'mid2 = high = 5' },
      metrics: { passes: 2, window: 2, result: 5 },
      scene: { entities: scene({ ...base, low: 4, high: 5, mid1: 4, mid2: 5, found: 5, note: 'window 4–5 → third = 0\nmid1 = low, mid2 = high' }) },
    },
  ],
  trace: {
    title: 'Run ternary search on your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (we sort it for you)', kind: 'numbers', default: '2, 5, 8, 12, 16, 23, 38, 56, 72, 91' },
      { name: 'target', label: 'Target', kind: 'number', default: '72' },
    ],
    presets: [
      { label: 'Left third', values: { arr: '1, 4, 7, 10, 13, 16, 19, 22, 25', target: '4' } },
      { label: 'Right third', values: { arr: '1, 4, 7, 10, 13, 16, 19, 22, 25', target: '25' } },
      { label: 'Missing', values: { arr: '3, 6, 9, 12, 15, 18, 21', target: '14' } },
      { label: 'Two items', values: { arr: '8, 9', target: '9' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      return traceTernary(input, target);
    },
  },
});
