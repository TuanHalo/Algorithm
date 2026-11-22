import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/** A value plus a stable id, so a swapped value keeps its block and slides. */
interface Item {
  readonly v: ScalarValue;
  readonly id: number;
}

const itemsOf = (values: readonly ScalarValue[]): Item[] => values.map((v, id) => ({ v, id }));

interface SelectionState {
  readonly items: readonly Item[];
  /** Slot being filled; slots before it are final. */
  readonly i?: number;
  readonly j?: number;
  readonly minIdx?: number;
  /** Number of final slots at the front (defaults to `i`). */
  readonly final?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Array id: `arr` for the story input, another id for a different example input. */
  readonly arrayId?: string;
}

/** Scene for one moment: final prefix, the current minimum, the scanned index and the variables. */
function scene(s: SelectionState): Entity[] {
  const id = s.arrayId ?? 'arr';
  const n = s.items.length;
  const finalCount = s.final ?? s.i ?? 0;
  const tones: Record<number, Tone> = {};
  for (let k = 0; k < Math.min(finalCount, n); k += 1) tones[k] = 'done';
  if (s.j !== undefined) tones[s.j] = 'compare';
  if (s.minIdx !== undefined) tones[s.minIdx] = 'active';
  const entities: Entity[] = [
    arr(id, 0, 0, s.items.map((it) => it.v), { label: 'arr', tones, codeVar: 'arr', itemKeys: s.items.map((it) => it.id) }),
  ];
  if (s.i !== undefined && s.i < n) entities.push(ptr('i', id, s.i, 'i', { tone: 'done', codeVar: 'i' }));
  if (s.minIdx !== undefined) entities.push(ptr('min-idx', id, s.minIdx, 'min_idx', { side: 'top', tone: 'active', codeVar: 'min_idx' }));
  if (s.j !== undefined) entities.push(ptr('j', id, s.j, 'j', { side: 'top', tone: 'compare', codeVar: 'j' }));
  const dash = (v: number | undefined): number | string => v ?? '—';
  const tone = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'n', value: n },
        { name: 'i', value: dash(s.i), tone: tone(s.i) },
        { name: 'j', value: dash(s.j), tone: tone(s.j) },
        { name: 'min_idx', value: dash(s.minIdx), tone: tone(s.minIdx) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.v).join(', ')}]`;

/** Runs selection sort on any input and records one step per decision (chapter "run", final code). */
function traceSelection(values: readonly number[]): Step[] {
  const items = itemsOf(values);
  const n = items.length;
  const at = (k: number): number => Number(items[k]?.v ?? 0);
  const steps: Step[] = [];
  let comparisons = 0;
  let swaps = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ comparisons, swaps, result });

  for (let i = 0; i < n - 1; i += 1) {
    let minIdx = i;
    steps.push({
      chapter: 'run',
      short: `Slot ${i}`,
      title: `Slot ${i}: assume arr[${i}] = ${at(i)} is the smallest`,
      body: `${i === 0 ? `Line 2: \`n = ${n}\`. ` : ''}Line 3: \`i = ${i}\`. Line 5 assumes the slot already holds the minimum of the unsorted part.`,
      code: { view: 'final', lines: i === 0 ? [2, 3, 5] : [3, 5] },
      values: i === 0 ? { 2: `n = ${n}`, 3: `i = ${i}`, 5: `min_idx = ${i}` } : { 3: `i = ${i}`, 5: `min_idx = ${i}` },
      metrics: metrics(),
      scene: { entities: scene({ items, i, minIdx }) },
    });
    for (let j = i + 1; j < n; j += 1) {
      const smaller = at(j) < at(minIdx);
      comparisons += 1;
      steps.push({
        chapter: 'run',
        short: `j = ${j}`,
        title: `Is arr[${j}] = ${at(j)} smaller than ${at(minIdx)}?`,
        body: smaller ? `Line 8: \`${at(j)} < ${at(minIdx)}\`, a new smallest value.` : `Line 8: \`${at(j)} < ${at(minIdx)}\` is false, so \`min_idx\` stays ${minIdx}.`,
        code: { view: 'final', lines: [6, 8] },
        values: { 6: `j = ${j}`, 8: `${at(j)} < ${at(minIdx)} → ${smaller ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene({ items, i, j, minIdx }) },
      });
      if (!smaller) continue;
      minIdx = j;
      steps.push({
        chapter: 'run',
        short: `min_idx = ${j}`,
        title: `Remember index ${j}: the smallest so far is ${at(j)}`,
        body: `Line 9: \`min_idx = ${j}\`.`,
        code: { view: 'final', lines: [9] },
        values: { 9: `min_idx = ${j}` },
        metrics: metrics(),
        scene: { entities: scene({ items, i, j, minIdx }) },
      });
    }
    if (minIdx !== i) {
      const a = at(i);
      const b = at(minIdx);
      [items[i], items[minIdx]] = [items[minIdx] ?? { v: b, id: -1 }, items[i] ?? { v: a, id: -2 }];
      swaps += 1;
      steps.push({
        chapter: 'run',
        short: 'Swap',
        title: `Swap ${b} into slot ${i}`,
        body: `Line 11: \`${minIdx} != ${i}\`, so line 12 swaps the smallest value into slot ${i}: ${show(items)}. Slot ${i} is now final.`,
        code: { view: 'final', lines: [11, 12] },
        values: { 11: `${minIdx} != ${i} → True`, 12: `arr[${i}], arr[${minIdx}] = ${b}, ${a}` },
        metrics: metrics(),
        scene: { entities: scene({ items, i, minIdx: i, final: i + 1 }) },
      });
    } else {
      steps.push({
        chapter: 'run',
        short: 'No swap',
        title: `${at(i)} is already the smallest: no swap`,
        body: `Line 11: \`min_idx\` is still ${i}, so the swap is skipped. Slot ${i} is final.`,
        code: { view: 'final', lines: [11] },
        values: { 11: `${i} != ${i} → False` },
        metrics: metrics(),
        scene: { entities: scene({ items, i, minIdx: i, final: i + 1 }) },
      });
    }
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Sorted: ${show(items)}`,
    body: `${n > 1 ? `The last slot has nothing left to scan, so it is already final. ` : ''}Line 13 returns the array after ${comparisons} comparison${comparisons === 1 ? '' : 's'} and ${swaps} swap${swaps === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [13] },
    values: { 13: `return ${show(items)}` },
    metrics: metrics(show(items)),
    scene: { entities: scene({ items, final: n }) },
  });
  return steps;
}

// Story input: [4, 2, 5, 1]. Ids are the original positions, so blocks keep their identity as they move.
const S = (...order: readonly number[]): Item[] => order.map((id) => ({ v: [4, 2, 5, 1][id] ?? 0, id }));
const START = S(0, 1, 2, 3); // [4, 2, 5, 1]
const AFTER0 = S(3, 1, 2, 0); // [1, 2, 5, 4]
const AFTER2 = S(3, 1, 0, 2); // [1, 2, 4, 5]

export default defineWalkthrough({
  id: 'learn/sorting/selection-sort',
  title: 'Selection Sort, pick the smallest each time',
  summary: 'From the idea to the code: scan the unsorted part for its smallest value, swap it into the next slot, and repeat.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def selection_sort(arr: list[int]) -> list[int]:
    n = len(arr)
    for i in range(n):
        # Assume the current slot holds the minimum
        min_idx = i
        for j in range(i + 1, n):
            # Look for an even smaller value in the unsorted rest
            if arr[j] < arr[min_idx]:
                min_idx = j
        # Swap found minimum into its final sorted position
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
  },
  metrics: [
    { key: 'comparisons', label: 'Comparisons' },
    { key: 'swaps', label: 'Swaps' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'smallest so far (min_idx)' },
    { tone: 'compare', label: 'being checked (j)' },
    { tone: 'done', label: 'in its final slot' },
  ],
  goals: [
    { text: 'Put the smallest value first, then repeat', step: 2 },
    { text: 'Build the scan for the minimum', step: 4 },
    { text: 'Follow every comparison and swap', step: 7 },
    { text: 'See why the long-distance swap makes it unstable', step: 24 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [4, 2, 5, 1] in place',
      body: 'Like lining up books by height: find the thinnest one and put it first, then the next thinnest, and so on.\n\nLine 1 takes a list `arr` and returns it sorted from smallest to largest, rearranging it in place.',
      code: { view: 'signature', lines: [1] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START }) },
    },
    {
      chapter: 'idea',
      short: 'Pick smallest',
      title: 'Find the smallest, swap it to the front',
      body: 'Scan the whole list for its smallest value and swap it into slot 0. That slot is now final.\n\nThen do the same for the rest of the list: the smallest of slots 1…n − 1 goes into slot 1, and so on.',
      code: { view: 'signature' },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, minIdx: 3, note: 'smallest of [4, 2, 5, 1] is 1\n→ swap it into slot 0, repeat' }) },
    },
    {
      chapter: 'build',
      short: 'Each slot',
      title: 'Lines 2–4: fill one slot at a time',
      body: 'Line 3 visits each slot `i` from left to right. Every slot before `i` already holds its final value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['n = len(arr)', 'for i in range(n)'],
      scene: { entities: scene({ items: START, i: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Scan',
      title: 'Lines 5–7: assume, then scan the rest',
      body: 'Line 5 assumes the slot itself holds the smallest value, `min_idx = i`. Line 6 then visits every later index `j` to look for something smaller.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 6] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['min_idx = i', 'for j in range(i + 1, n)'],
      scene: { entities: scene({ items: START, i: 0, j: 1, minIdx: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Remember',
      title: 'Lines 8–10: remember a smaller value',
      body: 'Line 8 compares `arr[j]` with the best so far. If it is smaller, line 9 remembers its index. Here `2 < 4`, so `min_idx` becomes 1.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9] },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      changes: ['if arr[j] < arr[min_idx]: min_idx = j'],
      scene: { entities: scene({ items: START, i: 0, j: 1, minIdx: 1 }) },
    },
    {
      chapter: 'build',
      short: 'Swap',
      title: 'Lines 11–13: swap the minimum into place',
      body: 'After the scan, line 11 checks whether a smaller value was found, and line 12 swaps it into slot `i`. Line 13 returns the sorted list.\n\nNow let’s run it.',
      code: { view: 'final', lines: [11, 12, 13] },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      changes: ['if min_idx != i: swap', 'return arr'],
      scene: { entities: scene({ items: START, i: 0, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Slot 0',
      title: 'Slot 0: assume arr[0] = 4 is the smallest',
      body: 'Line 2: `n = 4`. Line 3: `i = 0`. Line 5 assumes the slot already holds the minimum.',
      code: { view: 'final', lines: [2, 3, 5] },
      values: { 2: 'n = 4', 3: 'i = 0', 5: 'min_idx = 0' },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, minIdx: 0 }) },
    },
    {
      chapter: 'run',
      short: 'j = 1',
      title: 'Is arr[1] = 2 smaller than 4?',
      body: 'Line 6: `j = 1`. Line 8: `2 < 4`, a new smallest value.',
      code: { view: 'final', lines: [6, 8] },
      values: { 6: 'j = 1', 8: '2 < 4 → True' },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, j: 1, minIdx: 0 }) },
    },
    {
      chapter: 'run',
      short: 'min_idx = 1',
      title: 'Remember index 1: the smallest so far is 2',
      body: 'Line 9: `min_idx = 1`.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'min_idx = 1' },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, j: 1, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'j = 2',
      title: 'Is arr[2] = 5 smaller than 2?',
      body: 'Line 8: `5 < 2` is false, so `min_idx` stays 1.',
      code: { view: 'final', lines: [6, 8] },
      values: { 6: 'j = 2', 8: '5 < 2 → False' },
      metrics: { comparisons: 2, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, j: 2, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'j = 3',
      title: 'Is arr[3] = 1 smaller than 2?',
      body: 'Line 8: `1 < 2`, a new smallest value.',
      code: { view: 'final', lines: [6, 8] },
      values: { 6: 'j = 3', 8: '1 < 2 → True' },
      metrics: { comparisons: 3, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, j: 3, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'min_idx = 3',
      title: 'Remember index 3: the smallest is 1',
      body: 'Line 9: `min_idx = 3`. The scan has reached the end, so 1 is the smallest value in the whole list.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'min_idx = 3' },
      metrics: { comparisons: 3, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, i: 0, j: 3, minIdx: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Swap',
      title: 'Swap 1 into slot 0',
      body: 'Line 11: `3 != 0`, so line 12 swaps: `[1, 2, 5, 4]`. Slot 0 is final.',
      code: { view: 'final', lines: [11, 12] },
      values: { 11: '3 != 0 → True', 12: 'arr[0], arr[3] = 1, 4' },
      metrics: { comparisons: 3, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 0, minIdx: 0, final: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Slot 1',
      title: 'Slot 1: assume arr[1] = 2 is the smallest',
      body: 'Line 3: `i = 1`. Line 5: `min_idx = 1`.',
      code: { view: 'final', lines: [3, 5] },
      values: { 3: 'i = 1', 5: 'min_idx = 1' },
      metrics: { comparisons: 3, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 1, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'j = 2',
      title: 'Is arr[2] = 5 smaller than 2?',
      body: 'Line 8: `5 < 2` is false.',
      code: { view: 'final', lines: [6, 8] },
      values: { 6: 'j = 2', 8: '5 < 2 → False' },
      metrics: { comparisons: 4, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 1, j: 2, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'j = 3',
      title: 'Is arr[3] = 4 smaller than 2?',
      body: 'Line 8: `4 < 2` is false too. 2 is already the smallest of the rest.',
      code: { view: 'final', lines: [6, 8] },
      values: { 6: 'j = 3', 8: '4 < 2 → False' },
      metrics: { comparisons: 5, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 1, j: 3, minIdx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'No swap',
      title: '2 is already in place: no swap',
      body: 'Line 11: `min_idx` is still 1, so the swap is skipped. Slot 1 is final.',
      code: { view: 'final', lines: [11] },
      values: { 11: '1 != 1 → False' },
      metrics: { comparisons: 5, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 1, minIdx: 1, final: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Slot 2',
      title: 'Slot 2: assume arr[2] = 5 is the smallest',
      body: 'Line 3: `i = 2`. Line 5: `min_idx = 2`.',
      code: { view: 'final', lines: [3, 5] },
      values: { 3: 'i = 2', 5: 'min_idx = 2' },
      metrics: { comparisons: 5, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 2, minIdx: 2 }) },
    },
    {
      chapter: 'run',
      short: 'j = 3',
      title: 'Is arr[3] = 4 smaller than 5?',
      body: 'Line 8: `4 < 5`, a new smallest value.',
      code: { view: 'final', lines: [6, 8] },
      values: { 6: 'j = 3', 8: '4 < 5 → True' },
      metrics: { comparisons: 6, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 2, j: 3, minIdx: 2 }) },
    },
    {
      chapter: 'run',
      short: 'min_idx = 3',
      title: 'Remember index 3: the smallest is 4',
      body: 'Line 9: `min_idx = 3`.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'min_idx = 3' },
      metrics: { comparisons: 6, swaps: 1, result: '—' },
      scene: { entities: scene({ items: AFTER0, i: 2, j: 3, minIdx: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Swap',
      title: 'Swap 4 into slot 2',
      body: 'Line 11: `3 != 2`, so line 12 swaps: `[1, 2, 4, 5]`. Slot 2 is final.',
      code: { view: 'final', lines: [11, 12] },
      values: { 11: '3 != 2 → True', 12: 'arr[2], arr[3] = 4, 5' },
      metrics: { comparisons: 6, swaps: 2, result: '—' },
      scene: { entities: scene({ items: AFTER2, i: 2, minIdx: 2, final: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Return',
      title: 'Sorted: [1, 2, 4, 5]',
      body: 'Slot 3 has nothing left to scan (line 6 is an empty range), so it is already final. Line 13 returns the array after 6 comparisons and 2 swaps.',
      code: { view: 'final', lines: [13] },
      values: { 13: 'return [1, 2, 4, 5]' },
      metrics: { comparisons: 6, swaps: 2, result: '[1, 2, 4, 5]' },
      scene: { entities: scene({ items: AFTER2, final: 4 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Always n² / 2 comparisons, at most n − 1 swaps',
      body: 'Slot `i` scans `n − i − 1` items whatever the input, so it always makes `n(n − 1) / 2` comparisons: **`O(n²)` time**, even on sorted input. It needs `O(1)` extra space.\n\nIt does at most `n − 1` swaps, which helps when writing to memory is expensive.',
      code: { view: 'final', lines: [6, 12] },
      metrics: { comparisons: 6, swaps: 2, result: '[1, 2, 4, 5]' },
      scene: { entities: scene({ items: AFTER2, final: 4, note: 'n = 4      →  6 comparisons, ≤ 3 swaps\nn = 1,000  →  499,500, ≤ 999', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Not stable',
      title: 'Why line 12’s long swap makes it unstable',
      body: 'Take two equal 2s marked ᵃ and ᵇ: `[2ᵃ, 2ᵇ, 1]`. Slot 0 swaps 2ᵃ with the 1 at the far end, giving `[1, 2ᵇ, 2ᵃ]`: the equal values have changed order.\n\nThat long-distance swap is the key decision. It keeps swaps to `n − 1`, but it makes selection sort **not stable**.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'arr[0], arr[2] = 1, 2ᵃ' },
      metrics: { comparisons: 3, swaps: 1, result: '[1, 2ᵇ, 2ᵃ]' },
      scene: {
        entities: scene({
          items: [
            { v: 1, id: 2 },
            { v: '2ᵇ', id: 1 },
            { v: '2ᵃ', id: 0 },
          ],
          final: 3,
          arrayId: 'equal',
          note: 'before: [2ᵃ, 2ᵇ, 1]\nafter:  [1, 2ᵇ, 2ᵃ]   order flipped',
          noteTone: 'miss',
        }),
      },
    },
  ],
  trace: {
    title: 'Run selection sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Numbers to sort', kind: 'numbers', default: '4, 2, 5, 1' }],
    presets: [
      { label: 'Reversed', values: { arr: '5, 4, 3, 2, 1' } },
      { label: 'Already sorted', values: { arr: '1, 2, 3, 4, 5' } },
      { label: 'Duplicates', values: { arr: '3, 1, 3, 2' } },
      { label: 'Min at the end', values: { arr: '4, 3, 5, 1' } },
    ],
    maxItems: 6,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceSelection(input);
    },
  },
});
