import { arr, defineWalkthrough, map, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/** A value plus a stable id, so a swapped value keeps its block and slides. */
interface Item {
  readonly v: number;
  readonly id: number;
}

const itemsOf = (values: readonly number[]): Item[] => values.map((v, id) => ({ v, id }));

/** One quick_sort call on the call stack; `at` is the line of it that is waiting for a recursive call. */
interface Frame {
  readonly low: number;
  readonly high: number;
  readonly at?: number;
}

interface QuickState {
  readonly items: readonly Item[];
  /** The slice the running call works on (empty when low > high). */
  readonly low?: number;
  readonly high?: number;
  /** Last index of the "≤ pivot" zone (low − 1 when empty). */
  readonly i?: number;
  readonly j?: number;
  readonly pivot?: number;
  /** Index the pivot has landed on: final. */
  readonly placed?: number;
  /** Indexes already in their final slot. */
  readonly final?: readonly number[];
  readonly stack?: readonly Frame[];
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Array id: `arr` for the story input, another id for a different example input. */
  readonly arrayId?: string;
}

/** Scene: the slice between low and high, the ≤ pivot zone, the pivot, i and j, the variables and the call stack. */
function scene(s: QuickState): Entity[] {
  const id = s.arrayId ?? 'arr';
  const n = s.items.length;
  const tones: Record<number, Tone> = {};
  const { low, high } = s;
  if (low !== undefined && high !== undefined) {
    for (let k = 0; k < n; k += 1) if (k < low || k > high) tones[k] = 'muted';
    if (s.i !== undefined) for (let k = low; k <= s.i; k += 1) tones[k] = 'done';
    if (s.pivot !== undefined && s.placed === undefined) tones[high] = 'active';
  }
  if (s.j !== undefined) tones[s.j] = 'compare';
  for (const k of s.final ?? []) tones[k] = 'found';
  if (s.placed !== undefined) tones[s.placed] = 'found';
  if (s.done) for (let k = 0; k < n; k += 1) tones[k] = 'found';

  const entities: Entity[] = [
    arr(id, 0, 0, s.items.map((it) => it.v), { label: 'arr', tones, codeVar: 'arr', itemKeys: s.items.map((it) => it.id) }),
  ];
  if (low !== undefined && high !== undefined && !s.done) {
    if (low <= high) entities.push(range('slice', id, low, high, 'note'));
    if (low < n) entities.push(ptr('low', id, low, 'low', { tone: 'note', codeVar: 'low' }));
    if (high >= 0 && high < n) entities.push(ptr('high', id, high, 'high', { tone: 'note', codeVar: 'high' }));
  }
  if (s.j !== undefined) entities.push(ptr('j', id, s.j, 'j', { side: 'top', tone: 'compare', codeVar: 'j' }));
  if (s.i !== undefined && low !== undefined && s.i >= low) entities.push(ptr('i', id, s.i, 'i', { side: 'top', tone: 'done', codeVar: 'i' }));
  const dash = (v: number | undefined): number | string => v ?? '—';
  const tone = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'low', value: dash(low), tone: tone(low) },
        { name: 'high', value: dash(high), tone: tone(high) },
        { name: 'pivot', value: dash(s.pivot), tone: tone(s.pivot) },
        { name: 'i', value: dash(s.i), tone: tone(s.i) },
        { name: 'j', value: dash(s.j), tone: tone(s.j) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  const stack = s.stack ?? [];
  if (stack.length > 0) {
    entities.push(
      map(
        'stack',
        tableBesideArray(n, stack.length),
        0,
        'call stack',
        stack.map((f, k) => ({
          key: `quick_sort(arr, ${f.low}, ${f.high})`,
          value: k === stack.length - 1 ? 'running' : `waits on line ${f.at ?? '?'}`,
          tone: k === stack.length - 1 ? 'note' : 'muted',
        })),
        { width: 360 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.v).join(', ')}]`;

interface Emit {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly view: Omit<QuickState, 'items' | 'final' | 'stack'>;
  readonly result?: string;
}

/**
 * Runs quick sort on any input and records every call: the low < high check,
 * the pivot, each comparison and swap, the pivot's placement, then both
 * recursive calls in the same detail.
 */
function traceQuick(values: readonly number[]): Step[] {
  const items = itemsOf(values);
  const n = items.length;
  const steps: Step[] = [];
  const final = new Set<number>();
  const stack: Frame[] = [];
  let comparisons = 0;
  let swaps = 0;
  const emit = (e: Emit): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { comparisons, swaps, result: e.result ?? '—' },
      scene: { entities: scene({ items: [...items], final: [...final], stack: [...stack], ...e.view }) },
    });
  };

  const quick = (low: number, high: number, from: 'root' | 9 | 10): void => {
    stack.push({ low, high });
    const go = low < high;
    const call = `quick_sort(arr, ${low}, ${high})`;
    if (!go && low === high) final.add(low);
    const verdict = go
      ? `\`${low} < ${high}\`, so the slice has at least two items to sort.`
      : low === high
        ? `\`${low} < ${high}\` is false: the slice is the single item at index ${low}, so it is already in its final slot.`
        : `\`${low} < ${high}\` is false: \`high\` is left of \`low\`, so the slice is empty and there is nothing to do.`;
    if (from === 'root') {
      emit({
        short: 'Start',
        title: go ? `Sort indexes 0–${high}` : 'One item: nothing to do',
        body: `Line 2: no \`high\` was passed, so line 3 sets \`high = ${high}\`. Line 5: ${verdict}`,
        lines: [2, 3, 5],
        values: { 2: 'high is None → True', 3: `high = ${high}`, 5: `${low} < ${high} → ${go ? 'True' : 'False'}` },
        view: { low, high },
      });
    } else {
      emit({
        short: `Call ${low}..${high}`,
        title: call,
        body: `Line ${from} calls \`${call}\` for the ${from === 9 ? 'left' : 'right'} side of the last pivot. Line 5: ${verdict}`,
        lines: [5],
        values: { 5: `${low} < ${high} → ${go ? 'True' : 'False'}` },
        view: { low, high },
      });
    }
    if (!go) {
      stack.pop();
      return;
    }

    const pivot = items[high]?.v ?? 0;
    let i = low - 1;
    emit({
      short: `Pivot ${pivot}`,
      title: `partition(arr, ${low}, ${high}): pivot = ${pivot}`,
      body: `Line 7 calls \`partition\`. Line 15 picks the slice's last value, \`arr[${high}] = ${pivot}\`, as the pivot. Line 16 starts the "≤ pivot" zone empty: \`i = ${low} - 1 = ${i}\`.`,
      lines: [7, 15, 16],
      values: { 7: `partition(arr, ${low}, ${high})`, 15: `pivot = ${pivot}`, 16: `i = ${i}` },
      view: { low, high, pivot, i },
    });
    for (let j = low; j < high; j += 1) {
      const v = items[j]?.v ?? 0;
      const small = v <= pivot;
      comparisons += 1;
      emit({
        short: `j = ${j}`,
        title: `Is arr[${j}] = ${v} ≤ ${pivot}?`,
        body: small ? `Line 20: \`${v} <= ${pivot}\`, so it belongs in the ≤ pivot zone.` : `Line 20: \`${v} <= ${pivot}\` is false, so it stays where it is, right of the zone.`,
        lines: [18, 20],
        values: { 18: `j = ${j}`, 20: `${v} <= ${pivot} → ${small ? 'True' : 'False'}` },
        view: { low, high, pivot, i, j },
      });
      if (!small) continue;
      i += 1;
      const a = items[i]?.v ?? 0;
      [items[i], items[j]] = [items[j] ?? { v, id: -1 }, items[i] ?? { v: a, id: -2 }];
      swaps += 1;
      emit({
        short: 'Swap',
        title: i === j ? `Grow the zone: ${v} is already at index ${i}` : `Grow the zone: ${v} moves to index ${i}`,
        body:
          i === j
            ? `Line 21: \`i = ${i}\`. Line 22 swaps \`arr[${i}]\` with itself: ${v} already sits in the zone's next slot.`
            : `Line 21: \`i = ${i}\`. Line 22 swaps ${v} into the zone, and ${a} goes to index ${j}: ${show(items)}.`,
        lines: [21, 22],
        values: { 21: `i = ${i}`, 22: `arr[${i}], arr[${j}] = ${v}, ${a}` },
        view: { low, high, pivot, i, j },
      });
    }
    const p = i + 1;
    const displaced = items[p]?.v ?? 0;
    [items[p], items[high]] = [items[high] ?? { v: pivot, id: -1 }, items[p] ?? { v: displaced, id: -2 }];
    swaps += 1;
    final.add(p);
    emit({
      short: 'Place pivot',
      title: `Pivot ${pivot} lands at index ${p}: final`,
      body: `The scan is done. Line 25 swaps the pivot right after the zone${p === high ? ' (with itself: it is already there)' : ''}: ${show(items)}. Everything left of it is ≤ ${pivot} and everything right of it is bigger, so it never moves again. Line 26 returns ${p} into \`pivot_idx\`.`,
      lines: [7, 25, 26],
      values: { 25: `arr[${p}], arr[${high}] = ${pivot}, ${displaced}`, 26: `return ${p}`, 7: `pivot_idx = ${p}` },
      view: { low, high, pivot, i, placed: p },
    });
    stack[stack.length - 1] = { low, high, at: 9 };
    quick(low, p - 1, 9);
    stack[stack.length - 1] = { low, high, at: 10 };
    quick(p + 1, high, 10);
    stack.pop();
  };

  quick(0, n - 1, 'root');
  emit({
    short: 'Return',
    title: `Sorted: ${show(items)}`,
    body: `Every call has finished, so line 11 returns the array, sorted in place: ${comparisons} comparison${comparisons === 1 ? '' : 's'} and ${swaps} swap${swaps === 1 ? '' : 's'} in total.`,
    lines: [11],
    values: { 11: `return ${show(items)}` },
    view: { done: true },
    result: show(items),
  });
  return steps;
}

// Story input: [4, 1, 5, 2, 3]. Ids are the original positions, so blocks keep their identity as they move.
const S = (...order: readonly number[]): Item[] => order.map((id) => ({ v: [4, 1, 5, 2, 3][id] ?? 0, id }));
const START = S(0, 1, 2, 3, 4); // [4, 1, 5, 2, 3]
const PLACED = S(1, 3, 4, 0, 2); // [1, 2, 3, 4, 5]
const base = { low: 0, high: 4, pivot: 3 } as const;
const RUN = traceQuick([4, 1, 5, 2, 3]);
const RUN_START = 9;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? { comparisons: 0, swaps: 0, result: '—' };

export default defineWalkthrough({
  id: 'learn/sorting/quick-sort',
  title: 'Quick Sort, partition around a pivot',
  summary: 'From the idea to the code: put smaller values left of a pivot and bigger ones right, drop the pivot between them, then sort each side the same way.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def quick_sort(arr: list[int], low: int = 0, high: int | None = None) -> list[int]:
    if high is None:
        high = len(arr) - 1

    if low < high:
        # Partition array and place pivot in its final sorted spot
        pivot_idx = partition(arr, low, high)
        # Recursively sort the subarrays on either side of pivot
        quick_sort(arr, low, pivot_idx - 1)
        quick_sort(arr, pivot_idx + 1, high)
    return arr


def partition(arr: list[int], low: int, high: int) -> int:
    pivot = arr[high]  # Choose last element as pivot
    i = low - 1        # Boundary for elements <= pivot

    for j in range(low, high):
        # If element is smaller or equal, expand boundary and swap
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    # Swap pivot right after the boundary
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1`,
  },
  metrics: [
    { key: 'comparisons', label: 'Comparisons' },
    { key: 'swaps', label: 'Swaps' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'note', label: 'slice low..high of this call' },
    { tone: 'active', label: 'pivot' },
    { tone: 'done', label: '≤ pivot zone (up to i)' },
    { tone: 'compare', label: 'being checked (j)' },
    { tone: 'found', label: 'in its final slot' },
    { tone: 'muted', label: 'outside the slice' },
  ],
  goals: [
    { text: 'Split the list around one pivot value', step: 2 },
    { text: 'Let recursion sort each side', step: 5 },
    { text: 'Partition with a growing ≤ pivot zone', step: 7 },
    { text: 'Follow low and high through every call', step: RUN_START + 1 },
    { text: 'See why the last-element pivot can be slow', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [4, 1, 5, 2, 3] in place',
      body: 'Like lining a crowd up around one reference person: everyone shorter steps to the left, everyone taller to the right.\n\nLine 1 takes a list `arr` and sorts it in place; `low` and `high` say which slice to sort (the whole list by default).',
      code: { view: 'signature', lines: [1] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START }) },
    },
    {
      chapter: 'idea',
      short: 'Partition',
      title: 'One pivot splits the problem in two',
      body: 'Pick a pivot, say the last value, 3. Move every value ≤ 3 to its left and every bigger value to its right: the pivot is now in its final slot.\n\nThe two sides are smaller slices, so sort each one the same way. `low` and `high` mark the slice being worked on.',
      code: { view: 'signature' },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, ...base, note: '≤ 3: 1, 2      > 3: 4, 5\n→ [1, 2] 3 [4, 5]' }) },
    },
    {
      chapter: 'build',
      short: 'Bounds',
      title: 'Lines 2–5: sort only slices with 2+ items',
      body: 'Lines 2–3 default `high` to the last index. Line 5 only does work when the slice `low..high` has at least two items (`low < high`); smaller slices are already sorted.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5], lines: [2, 3, 5] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['if high is None: high = len(arr) - 1', 'if low < high'],
      scene: { entities: scene({ items: START, low: 0, high: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Partition',
      title: 'Lines 6–8: partition, and get the pivot’s slot',
      body: 'Line 7 hands the slice to `partition`, which we write below. It rearranges the slice and returns the index where the pivot ended up.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8], lines: [7] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['pivot_idx = partition(arr, low, high)'],
      scene: { entities: scene({ items: START, low: 0, high: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Recurse',
      title: 'Lines 9–11: sort each side the same way',
      body: 'Line 9 calls `quick_sort` on `low..pivot_idx − 1`, the slice left of the pivot, and line 10 on `pivot_idx + 1..high`, the slice right of it. Line 11 returns the array, sorted in place.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11], lines: [9, 10, 11] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['quick_sort(arr, low, pivot_idx - 1)', 'quick_sort(arr, pivot_idx + 1, high)', 'return arr'],
      scene: { entities: scene({ items: PLACED, low: 0, high: 4, placed: 2 }) },
    },
    {
      chapter: 'build',
      short: 'Pivot',
      title: 'Lines 14–16: choose a pivot, start an empty zone',
      body: 'Line 15 picks the slice’s last value, `arr[high]`, as the pivot. Line 16 sets `i = low − 1`: `i` marks the end of a zone of values ≤ pivot, which starts empty.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16], lines: [15, 16] },
      metrics: { comparisons: 0, swaps: 0, result: '—' },
      changes: ['pivot = arr[high]', 'i = low - 1'],
      scene: { entities: scene({ items: START, ...base, i: -1 }) },
    },
    {
      chapter: 'build',
      short: 'Scan',
      title: 'Lines 18–20: check every other value',
      body: 'Line 18 walks `j` from `low` up to, but not including, `high` (the pivot). Line 20 asks whether `arr[j]` belongs in the ≤ pivot zone.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 18, 19, 20], lines: [18, 20] },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      changes: ['for j in range(low, high)', 'if arr[j] <= pivot'],
      scene: { entities: scene({ items: START, ...base, i: -1, j: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Grow zone',
      title: 'Lines 21–22: grow the zone with a swap',
      body: 'If it does, line 21 grows the zone by one slot and line 22 swaps the value into that slot.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 18, 19, 20, 21, 22, 24], lines: [21, 22] },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      changes: ['i += 1', 'arr[i], arr[j] = arr[j], arr[i]'],
      scene: { entities: scene({ items: START, ...base, i: -1, j: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Place pivot',
      title: 'Lines 25–26: drop the pivot after the zone',
      body: 'After the scan, line 25 swaps the pivot into the slot right after the zone, and line 26 returns that index.\n\nNow let’s run it, call by call. Watch `low` and `high` under the blocks and the call stack on the right.',
      code: { view: 'final', lines: [25, 26] },
      metrics: { comparisons: 1, swaps: 0, result: '—' },
      changes: ['arr[i + 1], arr[high] = arr[high], arr[i + 1]', 'return i + 1'],
      scene: { entities: scene({ items: START, ...base, i: -1 }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'O(n log n) on average, in place',
      body: 'When pivots split slices roughly in half, there are about `log₂ n` levels of calls and each level does about `n` comparisons: **`O(n log n)`** on average. It sorts in place, using only the call stack: **`O(log n)` space**.\n\nThe long swaps make it **not stable**.',
      code: { view: 'final', lines: [7, 9, 10] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: PLACED, done: true, note: 'balanced pivots  →  log₂ n levels\neach level        →  ~n comparisons', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Pivot choice',
      title: 'Why line 15’s “last element” pivot matters',
      body: 'On already sorted input like `[1, 2, 3, 4, 5]`, the last value is always the biggest. Each partition only peels off the pivot, so there are `n` levels and about `n² / 2` comparisons: **`O(n²)`**.\n\nThe pivot choice is the key decision; picking a random or middle element avoids this trap.',
      code: { view: 'final', lines: [15] },
      values: { 15: 'sorted input: pivot is always the max' },
      metrics: { comparisons: 10, swaps: 5, result: '[1, 2, 3, 4, 5]' },
      scene: {
        entities: scene({
          items: itemsOf([1, 2, 3, 4, 5]),
          low: 0,
          high: 4,
          pivot: 5,
          i: 3,
          arrayId: 'sorted',
          note: 'pivot 5 → sides [1, 2, 3, 4] and []\nthen 4, then 3…  n levels, O(n²)',
          noteTone: 'miss',
        }),
      },
    },
  ],
  trace: {
    title: 'Run quick sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Numbers to sort', kind: 'numbers', default: '4, 1, 5, 2, 3' }],
    presets: [
      { label: 'Good pivot', values: { arr: '6, 2, 8, 1, 9, 5' } },
      { label: 'Sorted (worst)', values: { arr: '1, 2, 3, 4, 5' } },
      { label: 'Duplicates', values: { arr: '3, 1, 3, 2, 3' } },
      { label: 'Reversed', values: { arr: '5, 4, 3, 2, 1' } },
    ],
    maxItems: 8,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceQuick(input);
    },
  },
});
