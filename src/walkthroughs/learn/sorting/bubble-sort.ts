import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/** A value plus a stable id, so a swapped value keeps its block and slides. */
interface Item {
  readonly v: number;
  readonly id: number;
}

const itemsOf = (values: readonly number[]): Item[] => values.map((v, id) => ({ v, id }));

interface BubbleState {
  readonly items: readonly Item[];
  /** Outer pass; the last `i` slots are already final. */
  readonly i?: number;
  /** Left index of the pair being compared or swapped. */
  readonly j?: number;
  readonly swapped?: boolean;
  /** The pair at `j` was just swapped. */
  readonly didSwap?: boolean;
  /** Every slot is final. */
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Array id: `arr` for the story input, another id for a different example input. */
  readonly arrayId?: string;
}

/** Scene for one moment: final tail, the compared pair, the j pointer and the variables. */
function scene(s: BubbleState): Entity[] {
  const id = s.arrayId ?? 'arr';
  const n = s.items.length;
  const tones: Record<number, Tone> = {};
  const finalFrom = s.done ? 0 : n - (s.i ?? 0);
  for (let k = finalFrom; k < n; k += 1) tones[k] = 'done';
  if (s.j !== undefined && !s.done) {
    // After a swap the bigger value sits at j + 1: that is the one that just moved right.
    tones[s.j] = 'compare';
    tones[s.j + 1] = s.didSwap ? 'active' : 'compare';
  }
  const entities: Entity[] = [
    arr(id, 0, 0, s.items.map((it) => it.v), { label: 'arr', tones, codeVar: 'arr', itemKeys: s.items.map((it) => it.id) }),
  ];
  if (s.j !== undefined && !s.done) entities.push(ptr('j', id, s.j, 'j', { side: 'top', tone: 'active', codeVar: 'j' }));
  const dash = (v: number | undefined): number | string => v ?? '—';
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'n', value: n },
        { name: 'i', value: dash(s.i), tone: s.i === undefined ? 'muted' : 'default' },
        { name: 'j', value: dash(s.j), tone: s.j === undefined ? 'muted' : 'default' },
        { name: 'swapped', value: s.swapped === undefined ? '—' : s.swapped ? 'True' : 'False', tone: s.swapped === undefined ? 'muted' : 'default' },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.v).join(', ')}]`;

/** Runs bubble sort on any input and records one step per decision (chapter "run", final code). */
function traceBubble(values: readonly number[]): Step[] {
  const items = itemsOf(values);
  const n = items.length;
  const steps: Step[] = [];
  let comparisons = 0;
  let swaps = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ comparisons, swaps, result });

  for (let i = 0; i < n; i += 1) {
    let swapped = false;
    const last = n - i - 1;
    steps.push({
      chapter: 'run',
      short: `Pass ${i + 1}`,
      title: i === 0 ? `Pass 1: walk all ${n} items` : `Pass ${i + 1}: the last ${i} slot${i === 1 ? ' is' : 's are'} final`,
      body:
        i === 0
          ? `Line 2: \`n = ${n}\`. Line 3 starts pass \`i = 0\`, and line 4 resets \`swapped = False\`. Line 5 will compare neighbours up to index ${last}.`
          : `Line 3: \`i = ${i}\`. The biggest ${i} value${i === 1 ? ' has' : 's have'} bubbled to the end, so line 5 only goes up to index ${last}. Line 4: \`swapped = False\`.`,
      code: { view: 'final', lines: i === 0 ? [2, 3, 4] : [3, 4, 5] },
      values: i === 0 ? { 2: `n = ${n}`, 3: 'i = 0', 4: 'swapped = False' } : { 3: `i = ${i}`, 4: 'swapped = False', 5: `j in range(0, ${last})` },
      metrics: metrics(),
      scene: { entities: scene({ items, i, swapped }) },
    });
    for (let j = 0; j < last; j += 1) {
      const a = items[j]?.v ?? 0;
      const b = items[j + 1]?.v ?? 0;
      const out = a > b;
      comparisons += 1;
      steps.push({
        chapter: 'run',
        short: `j = ${j}`,
        title: `Compare arr[${j}] = ${a} and arr[${j + 1}] = ${b}`,
        body: out
          ? `Line 6: \`${a} > ${b}\`, so this pair is out of order.`
          : `Line 6: \`${a} > ${b}\` is false. This pair is already in order, so nothing moves.`,
        code: { view: 'final', lines: [5, 6] },
        values: { 5: `j = ${j}`, 6: `${a} > ${b} → ${out ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene({ items, i, j, swapped }) },
      });
      if (!out) continue;
      [items[j], items[j + 1]] = [items[j + 1] ?? { v: b, id: -1 }, items[j] ?? { v: a, id: -2 }];
      swapped = true;
      swaps += 1;
      steps.push({
        chapter: 'run',
        short: 'Swap',
        title: `Swap: ${a} moves right`,
        body: `Line 7 swaps the pair, so the bigger value ${a} moves one slot right: ${show(items)}. Line 8 notes \`swapped = True\`.`,
        code: { view: 'final', lines: [7, 8] },
        values: { 7: `arr[${j}], arr[${j + 1}] = ${b}, ${a}`, 8: 'swapped = True' },
        metrics: metrics(),
        scene: { entities: scene({ items, i, j, swapped, didSwap: true }) },
      });
    }
    if (!swapped) {
      steps.push({
        chapter: 'run',
        short: 'Stop early',
        title: `No swaps in pass ${i + 1}: already sorted`,
        body: `Line 9: \`swapped\` is still \`False\`, so every neighbour pair is in order. Line 10 breaks out of the loop early.`,
        code: { view: 'final', lines: [9, 10] },
        values: { 9: 'not False → True', 10: 'break' },
        metrics: metrics(),
        scene: { entities: scene({ items, i, swapped, done: true }) },
      });
      break;
    }
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Sorted: ${show(items)}`,
    body: `Line 11 returns the array, sorted in place after ${comparisons} comparison${comparisons === 1 ? '' : 's'} and ${swaps} swap${swaps === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [11] },
    values: { 11: `return ${show(items)}` },
    metrics: metrics(show(items)),
    scene: { entities: scene({ items, done: true }) },
  });
  return steps;
}

// Story input: [5, 1, 4, 2]. Ids are the original positions, so blocks keep their identity as they move.
const S = (...order: readonly number[]): Item[] => order.map((id) => ({ v: [5, 1, 4, 2][id] ?? 0, id }));
const START = S(0, 1, 2, 3); // [5, 1, 4, 2]
const P1A = S(1, 0, 2, 3); // [1, 5, 4, 2]
const P1B = S(1, 2, 0, 3); // [1, 4, 5, 2]
const P1C = S(1, 2, 3, 0); // [1, 4, 2, 5]
const P2 = S(1, 3, 2, 0); // [1, 2, 4, 5]

export default defineWalkthrough({
  id: 'learn/sorting/bubble-sort',
  title: 'Bubble Sort, neighbours swap until sorted',
  summary: 'From the idea to the code: compare neighbours, swap when they are out of order, and watch the biggest value bubble to the end of each pass.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def bubble_sort(arr: list[int]) -> list[int]:
    n = len(arr)
    for i in range(n):
        swapped = False  # Track swaps so we can stop early if sorted
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr`,
  },
  metrics: [
    { key: 'comparisons', label: 'Comparisons' },
    { key: 'swaps', label: 'Swaps' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'pair being compared' },
    { tone: 'active', label: 'just moved right' },
    { tone: 'done', label: 'in its final slot' },
  ],
  goals: [
    { text: 'See how one pass carries the biggest value to the end', step: 2 },
    { text: 'Build the nested loops one line at a time', step: 3 },
    { text: 'Follow every comparison and swap', step: 7 },
    { text: 'Know why the swapped flag makes sorted input fast', step: 22 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [5, 1, 4, 2] in place',
      body: 'Like bubbles in soda, the biggest ones rise to the top first.\n\nLine 1 takes a list `arr` and returns it sorted from smallest to largest, rearranging it in place.',
      code: { view: 'signature', lines: [1] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START }) },
    },
    {
      chapter: 'idea',
      short: 'Bubble up',
      title: 'Swap neighbours that are out of order',
      body: 'Walk left to right and compare each pair of neighbours. Whenever the left one is bigger, swap them.\n\nThe biggest value gets carried along like a bubble and lands at the end after one pass. Repeat for the rest.',
      code: { view: 'signature' },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, note: 'one pass: 5 is carried right\n[5, 1, 4, 2] → [1, 4, 2, 5]' }) },
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 2–5: passes, and neighbours inside each pass',
      body: 'Line 3 runs one pass per item. Inside, line 5 walks `j` along the neighbours.\n\nAfter pass `i`, the last `i` slots are final, so line 5 stops at `n − i − 1` and never re-checks them.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5], lines: [2, 3, 5] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['n = len(arr)', 'for i in range(n)', 'for j in range(0, n - i - 1)'],
      scene: { entities: scene({ items: START, i: 0, j: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Swap',
      title: 'Lines 6–7: swap an out-of-order pair',
      body: 'Line 6 compares the pair. If the left value is bigger, line 7 swaps them in one go with Python’s tuple assignment.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [6, 7] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['if arr[j] > arr[j + 1]', 'arr[j], arr[j + 1] = arr[j + 1], arr[j]'],
      scene: { entities: scene({ items: START, i: 0, j: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Flag',
      title: 'Lines 4 and 8: remember whether anything moved',
      body: 'Line 4 starts each pass with `swapped = False`, and line 8 sets it to `True` whenever a swap happens.\n\nA pass with no swaps means everything is already in order.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8], lines: [4, 8] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['swapped = False', 'swapped = True'],
      scene: { entities: scene({ items: START, i: 0, j: 0, swapped: false }) },
    },
    {
      chapter: 'build',
      short: 'Stop early',
      title: 'Lines 9–11: stop when a pass changed nothing',
      body: 'Line 9 checks the flag after each pass. If nothing moved, line 10 breaks out early, and line 11 returns the sorted array.\n\nNow let’s run it.',
      code: { view: 'final', lines: [9, 10, 11] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['if not swapped: break', 'return arr'],
      scene: { entities: scene({ items: START, i: 0, j: 0, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'Pass 1',
      title: 'Pass 1: walk all 4 items',
      body: 'Line 2: `n = 4`. Line 3 starts pass `i = 0`, and line 4 resets `swapped = False`. Line 5 will compare neighbours up to index 2.',
      code: { view: 'final', lines: [2, 3, 4] },
      values: { 2: 'n = 4', 3: 'i = 0', 4: 'swapped = False' },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'j = 0',
      title: 'Compare arr[0] = 5 and arr[1] = 1',
      body: 'Line 5: `j = 0`. Line 6: `5 > 1`, so this pair is out of order.',
      code: { view: 'final', lines: [5, 6] },
      values: { 5: 'j = 0', 6: '5 > 1 → True' },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, j: 0, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'Swap',
      title: 'Swap: 5 moves right',
      body: 'Line 7 swaps them: `[1, 5, 4, 2]`. Line 8 notes `swapped = True`.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'arr[0], arr[1] = 1, 5', 8: 'swapped = True' },
      metrics: { comparisons: 1, swaps: 1, result: '—' },
      scene: { entities: scene({ items: P1A, i: 0, j: 0, swapped: true, didSwap: true }) },
    },
    {
      chapter: 'run',
      short: 'j = 1',
      title: 'Compare arr[1] = 5 and arr[2] = 4',
      body: 'Line 5: `j = 1`. Line 6: `5 > 4`, out of order again. The 5 we just moved is compared once more.',
      code: { view: 'final', lines: [5, 6] },
      values: { 5: 'j = 1', 6: '5 > 4 → True' },
      metrics: { comparisons: 2, swaps: 1, result: '—' },
      scene: { entities: scene({ items: P1A, i: 0, j: 1, swapped: true }) },
    },
    {
      chapter: 'run',
      short: 'Swap',
      title: 'Swap: 5 keeps bubbling right',
      body: 'Line 7: `[1, 4, 5, 2]`. `swapped` stays `True`.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'arr[1], arr[2] = 4, 5', 8: 'swapped = True' },
      metrics: { comparisons: 2, swaps: 2, result: '—' },
      scene: { entities: scene({ items: P1B, i: 0, j: 1, swapped: true, didSwap: true }) },
    },
    {
      chapter: 'run',
      short: 'j = 2',
      title: 'Compare arr[2] = 5 and arr[3] = 2',
      body: 'Line 5: `j = 2`, the last pair of this pass. Line 6: `5 > 2`, out of order.',
      code: { view: 'final', lines: [5, 6] },
      values: { 5: 'j = 2', 6: '5 > 2 → True' },
      metrics: { comparisons: 3, swaps: 2, result: '—' },
      scene: { entities: scene({ items: P1B, i: 0, j: 2, swapped: true }) },
    },
    {
      chapter: 'run',
      short: 'Swap',
      title: 'Swap: 5 reaches the end',
      body: 'Line 7: `[1, 4, 2, 5]`. The biggest value is now in its final slot, after one pass.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'arr[2], arr[3] = 2, 5', 8: 'swapped = True' },
      metrics: { comparisons: 3, swaps: 3, result: '—' },
      scene: { entities: scene({ items: P1C, i: 0, j: 2, swapped: true, didSwap: true }) },
    },
    {
      chapter: 'run',
      short: 'Pass 2',
      title: 'Pass 2: the last slot is final',
      body: 'Line 9: `swapped` is `True`, so we keep going. Line 3: `i = 1`, line 4 resets the flag, and line 5 now stops at index 1, skipping the 5.',
      code: { view: 'final', lines: [3, 4, 5] },
      values: { 3: 'i = 1', 4: 'swapped = False', 5: 'j in range(0, 2)' },
      metrics: { comparisons: 3, swaps: 3, result: '—' },
      scene: { entities: scene({ items: P1C, i: 1, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'j = 0',
      title: 'Compare arr[0] = 1 and arr[1] = 4',
      body: 'Line 6: `1 > 4` is false. This pair is in order, so nothing moves.',
      code: { view: 'final', lines: [5, 6] },
      values: { 5: 'j = 0', 6: '1 > 4 → False' },
      metrics: { comparisons: 4, swaps: 3, result: '—' },
      scene: { entities: scene({ items: P1C, i: 1, j: 0, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'j = 1',
      title: 'Compare arr[1] = 4 and arr[2] = 2',
      body: 'Line 6: `4 > 2`, out of order.',
      code: { view: 'final', lines: [5, 6] },
      values: { 5: 'j = 1', 6: '4 > 2 → True' },
      metrics: { comparisons: 5, swaps: 3, result: '—' },
      scene: { entities: scene({ items: P1C, i: 1, j: 1, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'Swap',
      title: 'Swap: 4 settles next to 5',
      body: 'Line 7: `[1, 2, 4, 5]`, and line 8 sets `swapped = True`. Now the last two slots are final.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'arr[1], arr[2] = 2, 4', 8: 'swapped = True' },
      metrics: { comparisons: 5, swaps: 4, result: '—' },
      scene: { entities: scene({ items: P2, i: 1, j: 1, swapped: true, didSwap: true }) },
    },
    {
      chapter: 'run',
      short: 'Pass 3',
      title: 'Pass 3: compare 1 and 2',
      body: 'Line 3: `i = 2`, line 4 resets the flag, and line 5 checks a single pair. Line 6: `1 > 2` is false.',
      code: { view: 'final', lines: [3, 4, 6] },
      values: { 3: 'i = 2', 4: 'swapped = False', 5: 'j = 0', 6: '1 > 2 → False' },
      metrics: { comparisons: 6, swaps: 4, result: '—' },
      scene: { entities: scene({ items: P2, i: 2, j: 0, swapped: false }) },
    },
    {
      chapter: 'run',
      short: 'Stop early',
      title: 'No swaps in pass 3: stop',
      body: 'Line 9: `swapped` is still `False`, so every pair is in order. Line 10 breaks out, skipping the pass that `range(n)` still had left.',
      code: { view: 'final', lines: [9, 10] },
      values: { 9: 'not False → True', 10: 'break' },
      metrics: { comparisons: 6, swaps: 4, result: '—' },
      scene: { entities: scene({ items: P2, swapped: false, done: true }) },
    },
    {
      chapter: 'run',
      short: 'Return',
      title: 'Sorted: [1, 2, 4, 5]',
      body: 'Line 11 returns the array, sorted in place after 6 comparisons and 4 swaps.',
      code: { view: 'final', lines: [11] },
      values: { 11: 'return [1, 2, 4, 5]' },
      metrics: { comparisons: 6, swaps: 4, result: '[1, 2, 4, 5]' },
      scene: { entities: scene({ items: P2, done: true }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Up to n² / 2 comparisons',
      body: 'Pass `i` compares `n − i − 1` pairs, so a full run is `(n − 1) + … + 1 = n(n − 1) / 2` comparisons: **`O(n²)` time**, and `O(1)` extra space because it swaps in place.\n\nEqual values never swap (`>` not `>=`), so it is **stable**.',
      code: { view: 'final', lines: [5, 6] },
      metrics: { comparisons: 6, swaps: 4, result: '[1, 2, 4, 5]' },
      scene: { entities: scene({ items: P2, done: true, note: 'n = 4      →  ≤ 6 comparisons\nn = 1,000  →  ≤ 499,500', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Early exit',
      title: 'Why lines 9–10 check the swapped flag',
      body: 'Run it on an already sorted list, `[1, 2, 3, 4]`: pass 1 compares 3 pairs, swaps nothing, and lines 9–10 stop right there.\n\nThat flag is the key decision: it turns the best case from `O(n²)` into a single **`O(n)`** pass.',
      code: { view: 'final', lines: [4, 8, 9, 10] },
      values: { 9: 'nothing moved in pass 1', 10: 'stop after 3 comparisons' },
      metrics: { comparisons: 3, swaps: 0, result: '[1, 2, 3, 4]' },
      scene: { entities: scene({ items: itemsOf([1, 2, 3, 4]), swapped: false, done: true, arrayId: 'sorted', note: 'sorted input: 1 pass, 0 swaps\nwithout the flag: 6 comparisons' }) },
    },
  ],
  trace: {
    title: 'Run bubble sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Numbers to sort', kind: 'numbers', default: '5, 1, 4, 2' }],
    presets: [
      { label: 'Reversed', values: { arr: '5, 4, 3, 2, 1' } },
      { label: 'Already sorted', values: { arr: '1, 2, 3, 4, 5' } },
      { label: 'Duplicates', values: { arr: '3, 1, 3, 2' } },
      { label: 'One swap', values: { arr: '1, 3, 2, 4' } },
    ],
    maxItems: 6,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceBubble(input);
    },
  },
});
