import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/** Rows: the input, the counts (index = value), then the output. */
const COUNTS_Y = 130;
const OUTPUT_Y = 260;
const NOTE_Y = 380;

interface CountState {
  readonly input: readonly ScalarValue[];
  readonly counts?: readonly number[];
  readonly output?: readonly ScalarValue[];
  /** Index in `input` being tallied or placed. */
  readonly at?: number;
  /** Index in `counts` being read or changed. */
  readonly slot?: number;
  /** Index in `output` just written. */
  readonly wrote?: number;
  /** Output slots already written. */
  readonly filled?: readonly number[];
  readonly num?: ScalarValue;
  readonly val?: number;
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: input on top, counts in the middle (index = value), output underneath, variables on the right. */
function scene(s: CountState): Entity[] {
  const n = s.input.length;
  const entities: Entity[] = [];
  const inputTones: Record<number, Tone> = {};
  if (s.at !== undefined) inputTones[s.at] = 'active';
  entities.push(arr('arr', 0, 0, s.input, { label: 'arr', tones: inputTones, codeVar: 'arr' }));
  if (s.at !== undefined) entities.push(ptr('num', 'arr', s.at, 'num', { side: 'top', tone: 'active', codeVar: 'num' }));
  if (s.counts) {
    const tones: Record<number, Tone> = {};
    if (s.slot !== undefined) tones[s.slot] = 'compare';
    entities.push(arr('counts', 0, COUNTS_Y, s.counts, { label: 'counts', tones, codeVar: 'counts' }));
  }
  if (s.output) {
    const tones: Record<number, Tone> = {};
    for (const k of s.filled ?? []) tones[k] = s.done ? 'found' : 'done';
    if (s.wrote !== undefined) tones[s.wrote] = 'active';
    entities.push(arr('output', 0, OUTPUT_Y, s.output, { label: 'output', tones, codeVar: 'output' }));
  }
  const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
  const tone = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      tableBesideArray(Math.max(n, s.counts?.length ?? 0), 3),
      0,
      [
        { name: 'num', value: dash(s.num), tone: tone(s.num) },
        { name: 'val', value: dash(s.val), tone: tone(s.val) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly ScalarValue[]): string => `[${values.join(', ')}]`;

/** Runs counting sort on any input and records one step per decision (chapter "run", final code). */
function traceCounting(input: readonly number[]): Step[] {
  const steps: Step[] = [];
  const n = input.length;
  const max = Math.max(...input);
  const counts = new Array<number>(max + 1).fill(0);
  let writes = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ size: counts.length, writes, result });
  steps.push({
    chapter: 'run',
    short: 'counts',
    title: `One counter per value 0…${max}`,
    body: `Line 2: the list isn’t empty. Line 6: \`max(arr) = ${max}\`, so \`counts\` gets ${max + 1} slots, all 0.`,
    code: { view: 'final', lines: [2, 6] },
    values: { 2: 'not arr → False', 6: `counts = [0] * ${max + 1}` },
    metrics: metrics(),
    scene: { entities: scene({ input, counts: [...counts] }) },
  });
  input.forEach((num, k) => {
    counts[num] = (counts[num] ?? 0) + 1;
    steps.push({
      chapter: 'run',
      short: `Tally ${num}`,
      title: `Count a ${num}: counts[${num}] = ${counts[num]}`,
      body: `Line 7: \`num = ${num}\`. Line 8 adds one to its counter.`,
      code: { view: 'final', lines: [7, 8] },
      values: { 7: `num = ${num}`, 8: `counts[${num}] = ${counts[num]}` },
      metrics: metrics(),
      scene: { entities: scene({ input, counts: [...counts], at: k, slot: num, num }) },
    });
  });
  for (let val = 1; val < counts.length; val += 1) {
    const before = counts[val] ?? 0;
    counts[val] = before + (counts[val - 1] ?? 0);
    steps.push({
      chapter: 'run',
      short: `Prefix ${val}`,
      title: `counts[${val}] = ${before} + ${counts[val - 1]} = ${counts[val]}`,
      body: `Line 11: \`val = ${val}\`. Line 12 adds the count before it, so \`counts[${val}]\` now says where the ${val}s end: ${counts[val]} item${counts[val] === 1 ? '' : 's'} are ≤ ${val}.`,
      code: { view: 'final', lines: [11, 12] },
      values: { 11: `val = ${val}`, 12: `counts[${val}] = ${before} + ${counts[val - 1]} = ${counts[val]}` },
      metrics: metrics(),
      scene: { entities: scene({ input, counts: [...counts], slot: val, val }) },
    });
  }
  const output = new Array<number>(n).fill(0);
  const filled: number[] = [];
  steps.push({
    chapter: 'run',
    short: 'output',
    title: `An empty output of ${n} slots`,
    body: `Line 15 creates \`output\`. Line 16 will walk \`arr\` backwards, from index ${n - 1} to 0.`,
    code: { view: 'final', lines: [15, 16] },
    values: { 15: `output = [0] * ${n}` },
    metrics: metrics(),
    scene: { entities: scene({ input, counts: [...counts], output: [...output] }) },
  });
  for (let k = n - 1; k >= 0; k -= 1) {
    const num = input[k] ?? 0;
    counts[num] = (counts[num] ?? 0) - 1;
    const pos = counts[num] ?? 0;
    steps.push({
      chapter: 'run',
      short: `Slot for ${num}`,
      title: `arr[${k}] = ${num} goes to index ${pos}`,
      body: `Line 16: \`num = ${num}\`. Line 17 moves its end marker back one: \`counts[${num}] = ${pos}\`, which is exactly its slot.`,
      code: { view: 'final', lines: [16, 17] },
      values: { 16: `num = ${num}`, 17: `counts[${num}] = ${pos}` },
      metrics: metrics(),
      scene: { entities: scene({ input, counts: [...counts], output: [...output], filled: [...filled], at: k, slot: num, num }) },
    });
    output[pos] = num;
    filled.push(pos);
    writes += 1;
    steps.push({
      chapter: 'run',
      short: 'Place',
      title: `Write ${num} into output[${pos}]`,
      body: `Line 18: \`output[${pos}] = ${num}\`: ${show(output)}.`,
      code: { view: 'final', lines: [18] },
      values: { 18: `output[${pos}] = ${num}` },
      metrics: metrics(),
      scene: { entities: scene({ input, counts: [...counts], output: [...output], filled: [...filled], wrote: pos, at: k, num }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Sorted: ${show(output)}`,
    body: `Line 19 returns \`output\`. No two values were ever compared.`,
    code: { view: 'final', lines: [19] },
    values: { 19: `return ${show(output)}` },
    metrics: metrics(show(output)),
    scene: { entities: scene({ input, counts: [...counts], output: [...output], filled: [...filled], done: true }) },
  });
  return steps;
}

const INPUT = [2, 0, 2] as const;

export default defineWalkthrough({
  id: 'learn/sorting/counting-sort',
  title: 'Counting Sort, count instead of compare',
  summary: 'From the idea to the code: count how often each value occurs, turn the counts into end positions, and drop every value straight into its slot.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def counting_sort(arr: list[int]) -> list[int]:
    if not arr:
        return arr

    # Tally how many times each value appears
    counts = [0] * (max(arr) + 1)
    for num in arr:
        counts[num] += 1

    # Convert counts to cumulative ending indices
    for val in range(1, len(counts)):
        counts[val] += counts[val - 1]

    # Walk backwards so equal values keep their original order
    output = [0] * len(arr)
    for num in reversed(arr):
        counts[num] -= 1
        output[counts[num]] = num
    return output`,
  },
  metrics: [
    { key: 'size', label: 'Counters (k)' },
    { key: 'writes', label: 'Values placed' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'value being handled' },
    { tone: 'compare', label: 'its counter' },
    { tone: 'done', label: 'placed in output' },
  ],
  goals: [
    { text: 'Sort without comparing two values', step: 2 },
    { text: 'Turn counts into end positions', step: 5 },
    { text: 'Place every value straight into its slot', step: 15 },
    { text: 'See why the backwards walk keeps it stable', step: 23 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [2, 0, 2]: small whole numbers',
      body: 'Like tallying exam scores from 0 to 100: instead of comparing papers, count how many got each score and read the totals in order.\n\nLine 1 takes a list of small non-negative integers and returns a sorted copy.',
      code: { view: 'signature', lines: [1] },
      metrics: { size: 0, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT }) },
    },
    {
      chapter: 'idea',
      short: 'Count',
      title: 'Count each value, then lay them out',
      body: 'With values 0…2, keep one counter per value: one 0, no 1s, two 2s. The output is then "one 0, then two 2s".\n\nNo comparisons at all, which is how it beats the `O(n log n)` limit of comparison sorts.',
      code: { view: 'signature' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 0, 2], note: 'counts: 0 → 1, 1 → 0, 2 → 2\n→ [0, 2, 2]' }) },
    },
    {
      chapter: 'build',
      short: 'Empty list',
      title: 'Lines 2–5: an empty list is already sorted',
      body: 'Lines 2–3 return an empty list straight away, because `max([])` would fail on line 6.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5], lines: [2, 3] },
      metrics: { size: 0, writes: 0, result: '—' },
      changes: ['if not arr: return arr'],
      scene: { entities: scene({ input: INPUT }) },
    },
    {
      chapter: 'build',
      short: 'Counters',
      title: 'Lines 6–8: one counter per value',
      body: 'Line 6 makes a counter for every value from 0 up to the maximum. Lines 7–8 add one to the counter of each number in `arr`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8], lines: [6, 7, 8] },
      metrics: { size: 3, writes: 0, result: '—' },
      changes: ['counts = [0] * (max(arr) + 1)', 'for num in arr: counts[num] += 1'],
      scene: { entities: scene({ input: INPUT, counts: [1, 0, 2] }) },
    },
    {
      chapter: 'build',
      short: 'Prefix sums',
      title: 'Lines 10–12: counts become end positions',
      body: 'Lines 11–12 add each counter to the one before it. Now `counts[v]` is how many values are ≤ v, which is exactly where the `v`s end in the output.\n\n`[1, 0, 2]` becomes `[1, 1, 3]`: the 0 fills slot 0, and the 2s end at slot 3.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 10, 11, 12], lines: [11, 12] },
      metrics: { size: 3, writes: 0, result: '—' },
      changes: ['for val in range(1, len(counts)): counts[val] += counts[val - 1]'],
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 3] }) },
    },
    {
      chapter: 'build',
      short: 'Walk back',
      title: 'Lines 14–16: walk the input backwards',
      body: 'Line 15 makes an output of the same length. Line 16 visits `arr` from the back; the comment on line 14 explains why.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16], lines: [15, 16] },
      metrics: { size: 3, writes: 0, result: '—' },
      changes: ['output = [0] * len(arr)', 'for num in reversed(arr)'],
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 3], output: [0, 0, 0] }) },
    },
    {
      chapter: 'build',
      short: 'Place',
      title: 'Lines 17–19: step the end back, write the value',
      body: 'Line 17 moves the value’s end marker back one: that is its slot. Line 18 writes it there, and line 19 returns `output`.\n\nNow let’s run it.',
      code: { view: 'final', lines: [17, 18, 19] },
      metrics: { size: 3, writes: 0, result: '—' },
      changes: ['counts[num] -= 1', 'output[counts[num]] = num', 'return output'],
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 3], output: [0, 0, 0] }) },
    },
    {
      chapter: 'run',
      short: 'counts',
      title: 'One counter per value 0…2',
      body: 'Line 2: the list isn’t empty. Line 6: `max(arr) = 2`, so `counts` gets 3 slots, all 0.',
      code: { view: 'final', lines: [2, 6] },
      values: { 2: 'not arr → False', 6: 'counts = [0] * 3' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [0, 0, 0] }) },
    },
    {
      chapter: 'run',
      short: 'Tally 2',
      title: 'Count a 2: counts[2] = 1',
      body: 'Line 7: `num = 2`. Line 8 adds one to its counter.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'num = 2', 8: 'counts[2] = 1' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [0, 0, 1], at: 0, slot: 2, num: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Tally 0',
      title: 'Count a 0: counts[0] = 1',
      body: 'Line 7: `num = 0`. Line 8: `counts[0] = 1`.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'num = 0', 8: 'counts[0] = 1' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 0, 1], at: 1, slot: 0, num: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Tally 2',
      title: 'Count another 2: counts[2] = 2',
      body: 'Line 7: `num = 2`. Line 8: `counts[2] = 2`. The counts are done: one 0, no 1s, two 2s.',
      code: { view: 'final', lines: [7, 8] },
      values: { 7: 'num = 2', 8: 'counts[2] = 2' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 0, 2], at: 2, slot: 2, num: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Prefix 1',
      title: 'counts[1] = 0 + 1 = 1',
      body: 'Line 11: `val = 1`. Line 12 adds the count before it: 1 value is ≤ 1, so 1s would end at slot 1.',
      code: { view: 'final', lines: [11, 12] },
      values: { 11: 'val = 1', 12: 'counts[1] = 0 + 1 = 1' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 2], slot: 1, val: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Prefix 2',
      title: 'counts[2] = 2 + 1 = 3',
      body: 'Line 11: `val = 2`. Line 12: 3 values are ≤ 2, so the 2s end at slot 3 (they fill slots 1 and 2).',
      code: { view: 'final', lines: [11, 12] },
      values: { 11: 'val = 2', 12: 'counts[2] = 2 + 1 = 3' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 3], slot: 2, val: 2 }) },
    },
    {
      chapter: 'run',
      short: 'output',
      title: 'An empty output of 3 slots',
      body: 'Line 15 creates `output`. Line 16 will walk `arr` backwards, from index 2 to 0.',
      code: { view: 'final', lines: [15, 16] },
      values: { 15: 'output = [0] * 3' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 3], output: [0, 0, 0] }) },
    },
    {
      chapter: 'run',
      short: 'Slot for 2',
      title: 'The last 2 goes to index 2',
      body: 'Line 16: `num = 2` (index 2, the back). Line 17 moves its end marker back: `counts[2] = 2`, which is its slot.',
      code: { view: 'final', lines: [16, 17] },
      values: { 16: 'num = 2', 17: 'counts[2] = 3 - 1 = 2' },
      metrics: { size: 3, writes: 0, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 2], output: [0, 0, 0], at: 2, slot: 2, num: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Place',
      title: 'Write 2 into output[2]',
      body: 'Line 18: `output[2] = 2`.',
      code: { view: 'final', lines: [18] },
      values: { 18: 'output[2] = 2' },
      metrics: { size: 3, writes: 1, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [1, 1, 2], output: [0, 0, 2], filled: [2], wrote: 2, at: 2, num: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Slot for 0',
      title: 'The 0 goes to index 0',
      body: 'Line 16: `num = 0`. Line 17: `counts[0] = 0`.',
      code: { view: 'final', lines: [16, 17] },
      values: { 16: 'num = 0', 17: 'counts[0] = 1 - 1 = 0' },
      metrics: { size: 3, writes: 1, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [0, 1, 2], output: [0, 0, 2], filled: [2], at: 1, slot: 0, num: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Place',
      title: 'Write 0 into output[0]',
      body: 'Line 18: `output[0] = 0`.',
      code: { view: 'final', lines: [18] },
      values: { 18: 'output[0] = 0' },
      metrics: { size: 3, writes: 2, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [0, 1, 2], output: [0, 0, 2], filled: [2, 0], wrote: 0, at: 1, num: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Slot for 2',
      title: 'The first 2 goes to index 1',
      body: 'Line 16: `num = 2` (index 0, the front). Line 17: `counts[2] = 1`, the slot just before the other 2.',
      code: { view: 'final', lines: [16, 17] },
      values: { 16: 'num = 2', 17: 'counts[2] = 2 - 1 = 1' },
      metrics: { size: 3, writes: 2, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [0, 1, 1], output: [0, 0, 2], filled: [2, 0], at: 0, slot: 2, num: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Place',
      title: 'Write 2 into output[1]',
      body: 'Line 18: `output[1] = 2`.',
      code: { view: 'final', lines: [18] },
      values: { 18: 'output[1] = 2' },
      metrics: { size: 3, writes: 3, result: '—' },
      scene: { entities: scene({ input: INPUT, counts: [0, 1, 1], output: [0, 2, 2], filled: [2, 0, 1], wrote: 1, at: 0, num: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Return',
      title: 'Sorted: [0, 2, 2]',
      body: 'Line 19 returns `output`. No two values were ever compared.',
      code: { view: 'final', lines: [19] },
      values: { 19: 'return [0, 2, 2]' },
      metrics: { size: 3, writes: 3, result: '[0, 2, 2]' },
      scene: { entities: scene({ input: INPUT, counts: [0, 1, 1], output: [0, 2, 2], filled: [0, 1, 2], done: true }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'O(n + k): linear when the range is small',
      body: 'The tally and the placing each touch the `n` inputs once, and the prefix sums touch the `k` counters once: **`O(n + k)` time and space**.\n\nThat is fast when `k` is small, and wasteful when the values are spread out (sorting `[1, 1,000,000]` needs a million counters).',
      code: { view: 'final', lines: [6, 11, 16] },
      metrics: { size: 3, writes: 3, result: '[0, 2, 2]' },
      scene: { entities: scene({ input: INPUT, counts: [0, 1, 1], output: [0, 2, 2], filled: [0, 1, 2], done: true, note: 'n = 1,000,000 scores 0–100  →  ~1,000,101 steps\nno comparisons at all', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Stable',
      title: 'Why line 16 walks backwards',
      body: 'Mark the two 2s as 2ᵃ (first) and 2ᵇ (last). Walking backwards meets 2ᵇ first and gives it the **last** 2-slot; 2ᵃ then gets the slot before it, so they keep their order.\n\nThat backwards walk is the key decision: it makes counting sort **stable**, which radix sort relies on.',
      code: { view: 'final', lines: [16, 17, 18] },
      values: { 16: 'meet 2ᵇ first, then 2ᵃ', 18: '2ᵇ → slot 2, 2ᵃ → slot 1' },
      metrics: { size: 3, writes: 3, result: '[0, 2ᵃ, 2ᵇ]' },
      scene: { entities: scene({ input: ['2ᵃ', 0, '2ᵇ'], counts: [0, 1, 1], output: [0, '2ᵃ', '2ᵇ'], filled: [0, 1, 2], done: true, note: 'backwards  →  [0, 2ᵃ, 2ᵇ]  order kept\nforwards   →  [0, 2ᵇ, 2ᵃ]  order flipped' }) },
    },
  ],
  trace: {
    title: 'Run counting sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Small non-negative whole numbers', kind: 'numbers', default: '3, 1, 2, 1' }],
    presets: [
      { label: 'Duplicates', values: { arr: '2, 0, 2, 1, 0' } },
      { label: 'Gaps', values: { arr: '4, 0, 4, 1' } },
      { label: 'All equal', values: { arr: '3, 3, 3' } },
      { label: 'Reversed', values: { arr: '5, 4, 3, 2, 1' } },
    ],
    maxItems: 6,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      if (input.some((v) => !Number.isInteger(v) || v < 0 || v > 9)) throw new Error('Use whole numbers from 0 to 9, so every counter fits on screen.');
      return traceCounting(input);
    },
  },
});
