import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

const NOTE_X = 0;
const NOTE_Y = 190;
/** The held key waits in front of the row, under the gap it will drop into (pins rise above the row). */
const HAND_Y = 84;

interface InsertState {
  /** The array exactly as Python holds it (a shift leaves a copy behind). */
  readonly values: readonly ScalarValue[];
  /** Slots 0…sorted − 1 are in sorted order (not necessarily final). */
  readonly sorted: number;
  readonly i?: number;
  readonly j?: number;
  readonly key?: ScalarValue;
  /** Where the key would drop: j + 1. */
  readonly gap?: number;
  /** j is being compared with the key. */
  readonly comparing?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Array id: `arr` for the story input, another id for a different example input. */
  readonly arrayId?: string;
}

/** Scene: sorted prefix, the gap, the compared cell, the key held above the gap, and the variables. */
function scene(s: InsertState): Entity[] {
  const id = s.arrayId ?? 'arr';
  const tones: Record<number, Tone> = {};
  for (let k = 0; k < s.sorted; k += 1) tones[k] = 'done';
  if (s.gap !== undefined) tones[s.gap] = 'muted';
  if (s.comparing && s.j !== undefined && s.j >= 0) tones[s.j] = 'compare';
  const entities: Entity[] = [arr(id, 0, 0, s.values, { label: 'arr', tones, codeVar: 'arr' })];
  if (s.key !== undefined && s.gap !== undefined) {
    entities.push(arr('hand', s.gap * PITCH, HAND_Y, [s.key], { label: 'key', tones: { 0: 'active' }, showIndex: false, codeVar: 'key' }));
  }
  if (s.j !== undefined && s.j >= 0) entities.push(ptr('j', id, s.j, 'j', { side: 'top', tone: 'compare', codeVar: 'j' }));
  if (s.i !== undefined) entities.push(ptr('i', id, s.i, 'i', { tone: 'done', codeVar: 'i' }));
  const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
  const tone = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
  // Variables sit right of the array: the space in front of the row is where the key waits.
  entities.push(
    vars(
      'vals',
      tableBesideArray(s.values.length, 3),
      0,
      [
        { name: 'i', value: dash(s.i), tone: tone(s.i) },
        { name: 'key', value: dash(s.key), tone: tone(s.key) },
        { name: 'j', value: dash(s.j), tone: tone(s.j) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly ScalarValue[]): string => `[${values.join(', ')}]`;

/** Runs insertion sort on any input and records one step per decision (chapter "run", final code). */
function traceInsertion(input: readonly number[]): Step[] {
  const a = [...input];
  const n = a.length;
  const steps: Step[] = [];
  let comparisons = 0;
  let shifts = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ comparisons, shifts, result });

  for (let i = 1; i < n; i += 1) {
    const key = a[i] ?? 0;
    let j = i - 1;
    steps.push({
      chapter: 'run',
      short: `i = ${i}`,
      title: `Pick up key = ${key}`,
      body: `Line 3: \`i = ${i}\`. Line 4 picks up \`key = ${key}\`, leaving a gap at index ${i}. Line 5: \`j = ${j}\`, the last slot of the sorted part.`,
      code: { view: 'final', lines: [3, 4, 5] },
      values: { 3: `i = ${i}`, 4: `key = ${key}`, 5: `j = ${j}` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...a], sorted: i, i, j, key, gap: i }) },
    });
    for (;;) {
      const inRange = j >= 0;
      const left = a[j] ?? 0;
      const bigger = inRange && left > key;
      if (inRange) comparisons += 1;
      steps.push({
        chapter: 'run',
        short: bigger ? 'Compare' : 'Stop',
        title: !inRange ? 'No sorted items left: stop' : bigger ? `${left} > ${key}: it must move right` : `${left} ≤ ${key}: the key goes right after it`,
        body: !inRange
          ? `Line 7: \`j = -1\`, so there is nothing left to compare. The key belongs at the very front.`
          : bigger
            ? `Line 7: \`arr[${j}] = ${left}\` is bigger than the key ${key}, so it has to make room.`
            : `Line 7: \`${left} > ${key}\` is false, so the loop stops. The key belongs in the gap at index ${j + 1}.`,
        code: { view: 'final', lines: [7] },
        values: { 7: inRange ? `${j} >= 0 and ${left} > ${key} → ${bigger ? 'True' : 'False'}` : `${j} >= 0 → False` },
        metrics: metrics(),
        scene: { entities: scene({ values: [...a], sorted: i, i, j, key, gap: j + 1, comparing: inRange }) },
      });
      if (!bigger) break;
      a[j + 1] = left;
      j -= 1;
      shifts += 1;
      steps.push({
        chapter: 'run',
        short: 'Shift',
        title: `Shift ${left} one slot right`,
        body: `Line 8 copies ${left} into index ${j + 2}: ${show(a)}. Line 9: \`j = ${j}\`, so the gap moves to index ${j + 1}.`,
        code: { view: 'final', lines: [8, 9] },
        values: { 8: `arr[${j + 2}] = ${left}`, 9: `j = ${j}` },
        metrics: metrics(),
        scene: { entities: scene({ values: [...a], sorted: i + 1, i, j, key, gap: j + 1 }) },
      });
    }
    a[j + 1] = key;
    steps.push({
      chapter: 'run',
      short: 'Drop',
      title: `Drop ${key} into index ${j + 1}`,
      body: `Line 11: \`arr[${j + 1}] = ${key}\`. Slots 0–${i} are sorted: ${show(a.slice(0, i + 1))}.`,
      code: { view: 'final', lines: [11] },
      values: { 11: `arr[${j + 1}] = ${key}` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...a], sorted: i + 1, i }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Sorted: ${show(a)}`,
    body: `Line 12 returns the array after ${comparisons} comparison${comparisons === 1 ? '' : 's'} and ${shifts} shift${shifts === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [12] },
    values: { 12: `return ${show(a)}` },
    metrics: metrics(show(a)),
    scene: { entities: scene({ values: [...a], sorted: n }) },
  });
  return steps;
}

export default defineWalkthrough({
  id: 'learn/sorting/insertion-sort',
  title: 'Insertion Sort, one card at a time',
  summary: 'From the idea to the code: pick up the next value, shift bigger sorted values right, and drop it into the gap.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def insertion_sort(arr: list[int]) -> list[int]:
    # Start from index 1 (a single item arr[0] is trivially sorted)
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        # Shift larger sorted elements right to open a slot for key
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        # Drop key into its opened sorted slot
        arr[j + 1] = key
    return arr`,
  },
  metrics: [
    { key: 'comparisons', label: 'Comparisons' },
    { key: 'shifts', label: 'Shifts' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'key in hand' },
    { tone: 'compare', label: 'compared with key' },
    { tone: 'muted', label: 'gap (old copy)' },
    { tone: 'done', label: 'sorted so far' },
  ],
  goals: [
    { text: 'Insert each new value into a sorted hand', step: 2 },
    { text: 'Shift bigger values right to open a gap', step: 5 },
    { text: 'Follow every comparison and shift', step: 7 },
    { text: 'See why the strict > keeps it stable', step: 19 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [3, 1, 2] in place',
      body: 'Like sorting playing cards in your hand: pick up one card at a time and slide it into its place among the cards you already hold.\n\nLine 1 takes a list `arr` and returns it sorted from smallest to largest, rearranging it in place.',
      code: { view: 'signature', lines: [1] },
      metrics: { comparisons: 0, shifts: 0, result: '—' },
      scene: { entities: scene({ values: [3, 1, 2], sorted: 0 }) },
    },
    {
      chapter: 'idea',
      short: 'Insert',
      title: 'Grow a sorted part, one value at a time',
      body: 'The first value alone is already sorted. Take the next value, slide every bigger sorted value one step right, and drop it into the gap that opens.\n\nRepeat until every value has been inserted.',
      code: { view: 'signature' },
      metrics: { comparisons: 0, shifts: 0, result: '—' },
      scene: { entities: scene({ values: [3, 1, 2], sorted: 1, key: 1, gap: 1, note: '[3] is sorted; insert 1:\n3 slides right, 1 drops in front' }) },
    },
    {
      chapter: 'build',
      short: 'Pick up',
      title: 'Lines 2–4: pick up the next value',
      body: 'Index 0 on its own is sorted (line 2), so line 3 starts at `i = 1`. Line 4 picks up `key = arr[i]`, which leaves its slot free.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: { comparisons: 0, shifts: 0, result: '—' },
      changes: ['for i in range(1, len(arr))', 'key = arr[i]'],
      scene: { entities: scene({ values: [3, 1, 2], sorted: 1, i: 1, key: 1, gap: 1 }) },
    },
    {
      chapter: 'build',
      short: 'Compare',
      title: 'Lines 5–7: look left while values are bigger',
      body: 'Line 5 starts `j` at the last sorted slot. Line 7 keeps going while there is a sorted value left (`j >= 0`) and it is bigger than the key.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 7] },
      metrics: { comparisons: 1, shifts: 0, result: '—' },
      changes: ['j = i - 1', 'while j >= 0 and arr[j] > key'],
      scene: { entities: scene({ values: [3, 1, 2], sorted: 1, i: 1, j: 0, key: 1, gap: 1, comparing: true }) },
    },
    {
      chapter: 'build',
      short: 'Shift',
      title: 'Lines 8–9: shift it right, move left',
      body: 'Line 8 copies the bigger value one slot right, into the gap. Line 9 moves `j` left, so the gap moves left too.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9] },
      metrics: { comparisons: 1, shifts: 1, result: '—' },
      changes: ['arr[j + 1] = arr[j]', 'j -= 1'],
      scene: { entities: scene({ values: [3, 3, 2], sorted: 2, i: 1, j: -1, key: 1, gap: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Drop',
      title: 'Lines 11–12: drop the key into the gap',
      body: 'When the loop stops, the gap is exactly where the key belongs: line 11 writes it to `arr[j + 1]`. Line 12 returns the sorted list.\n\nNow let’s run it.',
      code: { view: 'final', lines: [11, 12] },
      metrics: { comparisons: 1, shifts: 1, result: '—' },
      changes: ['arr[j + 1] = key', 'return arr'],
      scene: { entities: scene({ values: [1, 3, 2], sorted: 2, i: 1 }) },
    },
    {
      chapter: 'run',
      short: 'i = 1',
      title: 'Pick up key = 1',
      body: 'Line 3: `i = 1`. Line 4 picks up `key = 1`, leaving a gap at index 1. Line 5: `j = 0`, the last slot of the sorted part.',
      code: { view: 'final', lines: [3, 4, 5] },
      values: { 3: 'i = 1', 4: 'key = 1', 5: 'j = 0' },
      metrics: { comparisons: 0, shifts: 0, result: '—' },
      scene: { entities: scene({ values: [3, 1, 2], sorted: 1, i: 1, j: 0, key: 1, gap: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Compare',
      title: '3 > 1: it must move right',
      body: 'Line 7: `arr[0] = 3` is bigger than the key 1, so it has to make room.',
      code: { view: 'final', lines: [7] },
      values: { 7: '0 >= 0 and 3 > 1 → True' },
      metrics: { comparisons: 1, shifts: 0, result: '—' },
      scene: { entities: scene({ values: [3, 1, 2], sorted: 1, i: 1, j: 0, key: 1, gap: 1, comparing: true }) },
    },
    {
      chapter: 'run',
      short: 'Shift',
      title: 'Shift 3 one slot right',
      body: 'Line 8 copies 3 into index 1: `[3, 3, 2]`. Line 9: `j = -1`, so the gap moves to index 0.',
      code: { view: 'final', lines: [8, 9] },
      values: { 8: 'arr[1] = 3', 9: 'j = -1' },
      metrics: { comparisons: 1, shifts: 1, result: '—' },
      scene: { entities: scene({ values: [3, 3, 2], sorted: 2, i: 1, j: -1, key: 1, gap: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Stop',
      title: 'No sorted items left: stop',
      body: 'Line 7: `j = -1`, so there is nothing left to compare. The key belongs at the very front.',
      code: { view: 'final', lines: [7] },
      values: { 7: '-1 >= 0 → False' },
      metrics: { comparisons: 1, shifts: 1, result: '—' },
      scene: { entities: scene({ values: [3, 3, 2], sorted: 2, i: 1, j: -1, key: 1, gap: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Drop',
      title: 'Drop 1 into index 0',
      body: 'Line 11: `arr[0] = 1`. Slots 0–1 are sorted: `[1, 3]`.',
      code: { view: 'final', lines: [11] },
      values: { 11: 'arr[0] = 1' },
      metrics: { comparisons: 1, shifts: 1, result: '—' },
      scene: { entities: scene({ values: [1, 3, 2], sorted: 2, i: 1 }) },
    },
    {
      chapter: 'run',
      short: 'i = 2',
      title: 'Pick up key = 2',
      body: 'Line 3: `i = 2`. Line 4 picks up `key = 2`, leaving a gap at index 2. Line 5: `j = 1`.',
      code: { view: 'final', lines: [3, 4, 5] },
      values: { 3: 'i = 2', 4: 'key = 2', 5: 'j = 1' },
      metrics: { comparisons: 1, shifts: 1, result: '—' },
      scene: { entities: scene({ values: [1, 3, 2], sorted: 2, i: 2, j: 1, key: 2, gap: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Compare',
      title: '3 > 2: it must move right',
      body: 'Line 7: `arr[1] = 3` is bigger than the key 2.',
      code: { view: 'final', lines: [7] },
      values: { 7: '1 >= 0 and 3 > 2 → True' },
      metrics: { comparisons: 2, shifts: 1, result: '—' },
      scene: { entities: scene({ values: [1, 3, 2], sorted: 2, i: 2, j: 1, key: 2, gap: 2, comparing: true }) },
    },
    {
      chapter: 'run',
      short: 'Shift',
      title: 'Shift 3 one slot right',
      body: 'Line 8 copies 3 into index 2: `[1, 3, 3]`. Line 9: `j = 0`, so the gap moves to index 1.',
      code: { view: 'final', lines: [8, 9] },
      values: { 8: 'arr[2] = 3', 9: 'j = 0' },
      metrics: { comparisons: 2, shifts: 2, result: '—' },
      scene: { entities: scene({ values: [1, 3, 3], sorted: 3, i: 2, j: 0, key: 2, gap: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Compare',
      title: '1 ≤ 2: the key goes right after it',
      body: 'Line 7: `1 > 2` is false, so the loop stops. The key belongs in the gap at index 1.',
      code: { view: 'final', lines: [7] },
      values: { 7: '0 >= 0 and 1 > 2 → False' },
      metrics: { comparisons: 3, shifts: 2, result: '—' },
      scene: { entities: scene({ values: [1, 3, 3], sorted: 3, i: 2, j: 0, key: 2, gap: 1, comparing: true }) },
    },
    {
      chapter: 'run',
      short: 'Drop',
      title: 'Drop 2 into index 1',
      body: 'Line 11: `arr[1] = 2`. All three slots are sorted: `[1, 2, 3]`.',
      code: { view: 'final', lines: [11] },
      values: { 11: 'arr[1] = 2' },
      metrics: { comparisons: 3, shifts: 2, result: '—' },
      scene: { entities: scene({ values: [1, 2, 3], sorted: 3, i: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Return',
      title: 'Sorted: [1, 2, 3]',
      body: 'Line 12 returns the array after 3 comparisons and 2 shifts.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'return [1, 2, 3]' },
      metrics: { comparisons: 3, shifts: 2, result: '[1, 2, 3]' },
      scene: { entities: scene({ values: [1, 2, 3], sorted: 3 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Fast on nearly sorted input, O(n²) at worst',
      body: 'Reversed input shifts every key past the whole sorted part: about `n² / 2` steps, **`O(n²)` time**. On sorted input line 7 fails straight away for every key: **`O(n)`**.\n\nIt shifts in place, so it needs `O(1)` extra space.',
      code: { view: 'final', lines: [7, 8] },
      metrics: { comparisons: 3, shifts: 2, result: '[1, 2, 3]' },
      scene: { entities: scene({ values: [1, 2, 3], sorted: 3, note: 'sorted input    →  n − 1 comparisons\nreversed input  →  n(n − 1) / 2', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Stable',
      title: 'Why line 7 uses a strict >',
      body: 'Insert 2ᵇ into `[1, 2ᵃ]`: line 7 asks `2ᵃ > 2ᵇ`, which is false, so 2ᵇ drops in after 2ᵃ and the equal values keep their order.\n\nUsing `>` instead of `>=` is the key decision: it makes insertion sort **stable**, and it also saves pointless shifts.',
      code: { view: 'final', lines: [7] },
      values: { 7: '2ᵃ > 2ᵇ → False, stop' },
      metrics: { comparisons: 1, shifts: 0, result: '[1, 2ᵃ, 2ᵇ]' },
      scene: { entities: scene({ values: [1, '2ᵃ', '2ᵇ'], sorted: 3, arrayId: 'equal', note: 'with >   →  [1, 2ᵃ, 2ᵇ]  order kept\nwith >=  →  [1, 2ᵇ, 2ᵃ]  order flipped' }) },
    },
  ],
  trace: {
    title: 'Run insertion sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Numbers to sort', kind: 'numbers', default: '3, 1, 2' }],
    presets: [
      { label: 'Nearly sorted', values: { arr: '1, 2, 4, 3, 5' } },
      { label: 'Reversed', values: { arr: '5, 4, 3, 2, 1' } },
      { label: 'Duplicates', values: { arr: '2, 3, 2, 1' } },
      { label: 'Already sorted', values: { arr: '1, 2, 3, 4' } },
    ],
    maxItems: 6,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceInsertion(input);
    },
  },
});
