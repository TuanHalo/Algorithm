import { arr, defineWalkthrough, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
/** Notes go in the right column, under the buckets table (the 5-row variables panel fills the left). */
const NOTE_X = 380;
const NOTE_Y = 240;

interface BucketState {
  /** The array exactly as Python holds it (gather overwrites it slot by slot). */
  readonly values: readonly number[];
  readonly buckets?: readonly (readonly number[])[];
  /** Index in `values` being scattered. */
  readonly at?: number;
  /** Bucket being filled, sorted or gathered. */
  readonly bucket?: number;
  /** Slots of `values` already written by the gather. */
  readonly written?: number;
  readonly x?: number;
  readonly key?: number;
  readonly j?: number;
  readonly idx?: number;
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

const list = (b: readonly number[]): string => `[${b.join(', ')}]`;

/** Scene: the array, one table row per bucket, and the variables. */
function scene(s: BucketState): Entity[] {
  const n = s.values.length;
  const tones: Record<number, Tone> = {};
  for (let k = 0; k < (s.written ?? 0); k += 1) tones[k] = s.done ? 'found' : 'done';
  if (s.at !== undefined) tones[s.at] = 'active';
  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones, codeVar: 'arr' })];
  if (s.at !== undefined) entities.push(ptr('x', 'arr', s.at, 'x', { side: 'top', tone: 'active', codeVar: 'x' }));
  if (s.buckets) {
    const entries: MapEntry[] = s.buckets.map((b, k) => ({ key: k, value: list(b), tone: k === s.bucket ? 'compare' : b.length === 0 ? 'muted' : 'default' }));
    entities.push(map('buckets', tableBesideArray(n, s.buckets.length), 0, 'buckets (index → values)', entries, { width: 190, codeVar: 'buckets' }));
  }
  const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
  const tone = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'x', value: dash(s.x), tone: tone(s.x) },
        { name: 'bucket_idx', value: dash(s.bucket), tone: tone(s.bucket) },
        { name: 'key', value: dash(s.key), tone: tone(s.key) },
        { name: 'j', value: dash(s.j), tone: tone(s.j) },
        { name: 'idx', value: dash(s.idx), tone: tone(s.idx) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const copy = (bs: readonly (readonly number[])[]): number[][] => bs.map((b) => [...b]);
const round = (v: number): number => Math.round(v * 100) / 100;

/** Runs bucket sort on any input and records one step per decision (chapter "run", final code). */
function traceBucket(input: readonly number[]): Step[] {
  const values = [...input];
  const n = values.length;
  const steps: Step[] = [];
  const buckets: number[][] = Array.from({ length: n }, () => []);
  let placed = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ buckets: n, used: buckets.filter((b) => b.length > 0).length, result });
  steps.push({
    chapter: 'run',
    short: 'Buckets',
    title: `${n} empty buckets`,
    body: `Line 3: ${n} values, so there is work to do. Line 6: \`n = ${n}\`. Line 8 makes one empty bucket per value.`,
    code: { view: 'final', lines: [3, 6, 8] },
    values: { 3: `${n} <= 1 → False`, 6: `n = ${n}`, 8: `buckets = ${n} empty lists` },
    metrics: metrics(),
    scene: { entities: scene({ values: [...values], buckets: copy(buckets) }) },
  });
  values.forEach((x, k) => {
    const idx = Math.min(Math.floor(x * n), n - 1);
    buckets[idx]?.push(x);
    steps.push({
      chapter: 'run',
      short: `x = ${x}`,
      title: `${x} goes into bucket ${idx}`,
      body: `Line 11: \`x = ${x}\`. Line 13: \`${x} × ${n} = ${round(x * n)}\`, rounded down to ${idx}. Line 14 appends it there.`,
      code: { view: 'final', lines: [11, 13, 14] },
      values: { 11: `x = ${x}`, 13: `bucket_idx = min(int(${round(x * n)}), ${n - 1}) = ${idx}`, 14: `buckets[${idx}] = ${list(buckets[idx] ?? [])}` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...values], buckets: copy(buckets), at: k, bucket: idx, x }) },
    });
  });
  buckets.forEach((b, bi) => {
    for (let i = 1; i < b.length; i += 1) {
      const key = b[i] ?? 0;
      let j = i - 1;
      steps.push({
        chapter: 'run',
        short: `Sort ${bi}`,
        title: `Bucket ${bi}: pick up key = ${key}`,
        body: `Line 17: \`b = buckets[${bi}]\`. Lines 18–20: \`i = ${i}\`, \`key = ${key}\`, \`j = ${j}\`. This is insertion sort inside one small bucket.`,
        code: { view: 'final', lines: [17, 18, 19, 20] },
        values: { 17: `b = ${list(b)}`, 18: `i = ${i}`, 19: `key = ${key}`, 20: `j = ${j}` },
        metrics: metrics(),
        scene: { entities: scene({ values: [...values], buckets: copy(buckets), bucket: bi, key, j }) },
      });
      for (;;) {
        const left = b[j];
        const bigger = j >= 0 && (left ?? 0) > key;
        // The comparison on line 21 …
        steps.push({
          chapter: 'run',
          short: bigger ? 'Compare' : 'Stop',
          title: bigger ? `${left} > ${key}: it must move right` : j < 0 ? 'Nothing left to compare' : `${left} ≤ ${key}: the key goes after it`,
          body: bigger
            ? `Line 21: \`b[${j}] = ${left}\` is bigger than the key ${key}, so it has to make room.`
            : j < 0
              ? 'Line 21: `j = -1`, so the key belongs at the front of the bucket.'
              : `Line 21: \`${left} > ${key}\` is false, so the loop stops.`,
          code: { view: 'final', lines: [21] },
          values: { 21: j < 0 ? '-1 >= 0 → False' : `${left} > ${key} → ${bigger ? 'True' : 'False'}` },
          metrics: metrics(),
          scene: { entities: scene({ values: [...values], buckets: copy(buckets), bucket: bi, key, j }) },
        });
        if (!bigger) break;
        // … then the shift it causes.
        b[j + 1] = left ?? 0;
        j -= 1;
        steps.push({
          chapter: 'run',
          short: 'Shift',
          title: `Shift ${left} one slot right`,
          body: `Line 22 copies ${left} into slot ${j + 2}: ${list(b)}. Line 23: \`j = ${j}\`.`,
          code: { view: 'final', lines: [22, 23] },
          values: { 22: `b[${j + 2}] = ${left}`, 23: `j = ${j}` },
          metrics: metrics(),
          scene: { entities: scene({ values: [...values], buckets: copy(buckets), bucket: bi, key, j }) },
        });
      }
      b[j + 1] = key;
      steps.push({
        chapter: 'run',
        short: 'Drop',
        title: `Drop ${key} into slot ${j + 1}`,
        body: `Line 24: \`b[${j + 1}] = ${key}\`. Bucket ${bi} is now ${list(b.slice(0, i + 1))}${i + 1 < b.length ? ' so far' : ''}.`,
        code: { view: 'final', lines: [24] },
        values: { 24: `b[${j + 1}] = ${key}` },
        metrics: metrics(),
        scene: { entities: scene({ values: [...values], buckets: copy(buckets), bucket: bi }) },
      });
    }
  });
  let idx = 0;
  buckets.forEach((b, bi) => {
    if (b.length === 0) return;
    const start = idx;
    for (const v of b) {
      values[idx] = v;
      idx += 1;
    }
    placed = idx;
    steps.push({
      chapter: 'run',
      short: `Gather ${bi}`,
      title: `Copy bucket ${bi} into arr[${start}…${idx - 1}]`,
      body: `Line 28: \`b = buckets[${bi}]\`. Lines 29–31 write ${list(b)} into \`arr\` from index ${start}, and \`idx\` moves to ${idx}.`,
      code: { view: 'final', lines: [28, 30, 31] },
      values: { 28: `b = ${list(b)}`, 30: `arr[${start}…${idx - 1}] = ${list(b)}`, 31: `idx = ${idx}` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...values], buckets: copy(buckets), bucket: bi, written: placed, idx }) },
    });
  });
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Sorted: ${list(values)}`,
    body: 'Line 33 returns the array. Buckets were gathered in order, so the whole list is sorted.',
    code: { view: 'final', lines: [33] },
    values: { 33: `return ${list(values)}` },
    metrics: metrics(list(values)),
    scene: { entities: scene({ values: [...values], buckets: copy(buckets), written: n, done: true }) },
  });
  return steps;
}

const INPUT = [0.91, 0.17, 0.82] as const;

export default defineWalkthrough({
  id: 'learn/sorting/bucket-sort',
  title: 'Bucket Sort, scatter then gather',
  summary: 'From the idea to the code: drop each value into a bucket by its size, sort each small bucket, then read the buckets back in order.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def bucket_sort(arr: list[float]) -> list[float]:
    """Sorts a list of floating point numbers uniformly distributed in [0, 1)."""
    if len(arr) <= 1:
        return arr

    n = len(arr)
    # Create n empty buckets
    buckets: list[list[float]] = [[] for _ in range(n)]

    # 1. Scatter: distribute elements into buckets
    for x in arr:
        # Map [0.0, 1.0) into bucket indices [0, n - 1]
        bucket_idx = min(int(x * n), n - 1)
        buckets[bucket_idx].append(x)

    # 2. Sort each bucket using insertion sort
    for b in buckets:
        for i in range(1, len(b)):
            key = b[i]
            j = i - 1
            while j >= 0 and b[j] > key:
                b[j + 1] = b[j]
                j -= 1
            b[j + 1] = key

    # 3. Gather: concatenate all buckets back into arr
    idx = 0
    for b in buckets:
        for val in b:
            arr[idx] = val
            idx += 1

    return arr`,
  },
  metrics: [
    { key: 'buckets', label: 'Buckets' },
    { key: 'used', label: 'Non-empty' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'value being scattered' },
    { tone: 'compare', label: 'bucket in use' },
    { tone: 'muted', label: 'empty bucket' },
    { tone: 'done', label: 'written back' },
  ],
  goals: [
    { text: 'Spread values into buckets by size', step: 2 },
    { text: 'Map a value to its bucket with x × n', step: 6 },
    { text: 'Sort each small bucket, then gather', step: 7 },
    { text: 'See why the buckets come out in order', step: 24 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [0.91, 0.17, 0.82]',
      body: 'Like sorting test papers into grade trays: 90s in one tray, 80s in the next. Each tray is small and quick to sort, and stacking the trays in order sorts the class.\n\nLine 1 takes floats spread evenly in `[0, 1)` and sorts them in place.',
      code: { view: 'signature', lines: [1] },
      metrics: { buckets: 0, used: 0, result: '—' },
      scene: { entities: scene({ values: INPUT }) },
    },
    {
      chapter: 'idea',
      short: 'Scatter',
      title: 'Bucket by size, sort buckets, read in order',
      body: 'Split `[0, 1)` into `n` equal ranges, one bucket each. Every value in bucket 0 is smaller than every value in bucket 1, and so on.\n\nSo after sorting each (small) bucket, reading the buckets left to right gives the sorted list.',
      code: { view: 'signature' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.82, 0.91]], note: 'bucket 0: [0, 0.33)\nbucket 1: [0.33, 0.67)\nbucket 2: [0.67, 1)' }) },
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 2–4: 0 or 1 values are sorted',
      body: 'Line 3 returns a list of 0 or 1 values unchanged. The docstring on line 2 states the assumption: values spread evenly over `[0, 1)`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: { buckets: 0, used: 0, result: '—' },
      changes: ['if len(arr) <= 1: return arr'],
      scene: { entities: scene({ values: INPUT }) },
    },
    {
      chapter: 'build',
      short: 'Buckets',
      title: 'Lines 6–8: one bucket per value',
      body: 'Line 8 makes `n` empty buckets. With evenly spread values, that averages about one value per bucket.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [6, 8] },
      metrics: { buckets: 3, used: 0, result: '—' },
      changes: ['n = len(arr)', 'buckets = [[] for _ in range(n)]'],
      scene: { entities: scene({ values: INPUT, buckets: [[], [], []] }) },
    },
    {
      chapter: 'build',
      short: 'Scatter loop',
      title: 'Lines 10–12: visit every value',
      body: 'Line 11 visits each value `x` to drop it into a bucket. The comment on line 12 says how the bucket is chosen.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12], lines: [11] },
      metrics: { buckets: 3, used: 0, result: '—' },
      changes: ['for x in arr'],
      scene: { entities: scene({ values: INPUT, buckets: [[], [], []], at: 0, x: 0.91 }) },
    },
    {
      chapter: 'build',
      short: 'Bucket index',
      title: 'Lines 13–16: x × n picks the bucket',
      body: 'Line 13 scales `x` up to `0…n` and rounds down: `0.91 × 3 = 2.73 → 2`. `min(…, n − 1)` keeps a value of exactly 1.0 in range. Line 14 appends `x` to that bucket.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 16], lines: [13, 14] },
      metrics: { buckets: 3, used: 1, result: '—' },
      changes: ['bucket_idx = min(int(x * n), n - 1)', 'buckets[bucket_idx].append(x)'],
      scene: { entities: scene({ values: INPUT, buckets: [[], [], [0.91]], at: 0, bucket: 2, x: 0.91 }) },
    },
    {
      chapter: 'build',
      short: 'Sort buckets',
      title: 'Lines 17–19: insertion sort inside each bucket',
      body: 'Line 17 visits each bucket, and lines 18–19 run insertion sort on it, picking up one `key` at a time. Buckets are tiny, so this is cheap.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19], lines: [17, 18, 19] },
      metrics: { buckets: 3, used: 2, result: '—' },
      changes: ['for b in buckets', 'for i in range(1, len(b))', 'key = b[i]'],
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91, 0.82]], bucket: 2, key: 0.82 }) },
    },
    {
      chapter: 'build',
      short: 'Shift',
      title: 'Lines 20–22: shift bigger values right',
      body: 'Exactly as in insertion sort: line 21 looks left while values are bigger than the key, and line 22 shifts them right.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22], lines: [20, 21, 22] },
      metrics: { buckets: 3, used: 2, result: '—' },
      changes: ['j = i - 1', 'while j >= 0 and b[j] > key', 'b[j + 1] = b[j]'],
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91, 0.91]], bucket: 2, key: 0.82, j: -1 }) },
    },
    {
      chapter: 'build',
      short: 'Drop',
      title: 'Lines 23–26: drop the key in',
      body: 'Line 23 moves `j` left, and line 24 drops the key into the gap. The comment on line 26 starts the last phase.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26], lines: [23, 24] },
      metrics: { buckets: 3, used: 2, result: '—' },
      changes: ['j -= 1', 'b[j + 1] = key'],
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.82, 0.91]], bucket: 2 }) },
    },
    {
      chapter: 'build',
      short: 'Gather',
      title: 'Lines 27–29: read the buckets in order',
      body: 'Line 27 starts writing at `idx = 0`. Lines 28–29 visit the buckets left to right and every value inside each one.',
      code: {
        view: 'reveal',
        reveal: [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29],
        lines: [27, 28, 29],
      },
      metrics: { buckets: 3, used: 2, result: '—' },
      changes: ['idx = 0', 'for b in buckets', 'for val in b'],
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.82, 0.91]], idx: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Write back',
      title: 'Lines 30–33: write back, return',
      body: 'Line 30 writes each value into `arr`, and line 31 moves to the next slot. Line 33 returns the sorted array.\n\nNow let’s run it.',
      code: { view: 'final', lines: [30, 31, 33] },
      metrics: { buckets: 3, used: 2, result: '—' },
      changes: ['arr[idx] = val', 'idx += 1', 'return arr'],
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.82, 0.91]], idx: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Buckets',
      title: '3 empty buckets',
      body: 'Line 3: 3 values, so there is work to do. Line 6: `n = 3`. Line 8 makes 3 empty buckets.',
      code: { view: 'final', lines: [3, 6, 8] },
      values: { 3: '3 <= 1 → False', 6: 'n = 3', 8: 'buckets = [[], [], []]' },
      metrics: { buckets: 3, used: 0, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[], [], []] }) },
    },
    {
      chapter: 'run',
      short: 'x = 0.91',
      title: '0.91 goes into bucket 2',
      body: 'Line 11: `x = 0.91`. Line 13: `0.91 × 3 = 2.73`, rounded down to 2. Line 14 appends it to bucket 2.',
      code: { view: 'final', lines: [11, 13, 14] },
      values: { 11: 'x = 0.91', 13: 'bucket_idx = min(int(2.73), 2) = 2', 14: 'buckets[2] = [0.91]' },
      metrics: { buckets: 3, used: 1, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[], [], [0.91]], at: 0, bucket: 2, x: 0.91 }) },
    },
    {
      chapter: 'run',
      short: 'x = 0.17',
      title: '0.17 goes into bucket 0',
      body: 'Line 13: `0.17 × 3 = 0.51 → 0`. Line 14 appends it to bucket 0.',
      code: { view: 'final', lines: [11, 13, 14] },
      values: { 11: 'x = 0.17', 13: 'bucket_idx = min(int(0.51), 2) = 0', 14: 'buckets[0] = [0.17]' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91]], at: 1, bucket: 0, x: 0.17 }) },
    },
    {
      chapter: 'run',
      short: 'x = 0.82',
      title: '0.82 also goes into bucket 2',
      body: 'Line 13: `0.82 × 3 = 2.46 → 2`. Line 14 appends it after 0.91, so bucket 2 is out of order: `[0.91, 0.82]`.',
      code: { view: 'final', lines: [11, 13, 14] },
      values: { 11: 'x = 0.82', 13: 'bucket_idx = min(int(2.46), 2) = 2', 14: 'buckets[2] = [0.91, 0.82]' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91, 0.82]], at: 2, bucket: 2, x: 0.82 }) },
    },
    {
      chapter: 'run',
      short: 'Sort 2',
      title: 'Bucket 2: pick up key = 0.82',
      body: 'Buckets 0 and 1 hold at most one value, so their sort loops do nothing. In bucket 2, lines 18–20 set `i = 1`, `key = 0.82`, `j = 0`.',
      code: { view: 'final', lines: [17, 18, 19, 20] },
      values: { 17: 'b = [0.91, 0.82]', 18: 'i = 1', 19: 'key = 0.82', 20: 'j = 0' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91, 0.82]], bucket: 2, key: 0.82, j: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Compare',
      title: '0.91 > 0.82: it must move right',
      body: 'Line 21: `b[0] = 0.91` is bigger than the key, so it has to make room.',
      code: { view: 'final', lines: [21] },
      values: { 21: '0 >= 0 and 0.91 > 0.82 → True' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91, 0.82]], bucket: 2, key: 0.82, j: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Shift',
      title: 'Shift 0.91 one slot right',
      body: 'Line 22 copies 0.91 into slot 1: `[0.91, 0.91]`. Line 23: `j = -1`.',
      code: { view: 'final', lines: [22, 23] },
      values: { 22: 'b[1] = 0.91', 23: 'j = -1' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.91, 0.91]], bucket: 2, key: 0.82, j: -1 }) },
    },
    {
      chapter: 'run',
      short: 'Drop',
      title: 'Drop 0.82 into slot 0',
      body: 'Line 21: `j = -1`, nothing left to compare. Line 24 drops the key in: bucket 2 is `[0.82, 0.91]`.',
      code: { view: 'final', lines: [21, 24] },
      values: { 21: '-1 >= 0 → False', 24: 'b[0] = 0.82' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: INPUT, buckets: [[0.17], [], [0.82, 0.91]], bucket: 2, key: 0.82, j: -1 }) },
    },
    {
      chapter: 'run',
      short: 'Gather 0',
      title: 'Copy bucket 0 into arr[0]',
      body: 'Line 27: `idx = 0`. Line 28: bucket 0 is `[0.17]`, so line 30 writes `arr[0] = 0.17`, and line 31 moves `idx` to 1.',
      code: { view: 'final', lines: [27, 28, 30, 31] },
      values: { 27: 'idx = 0', 28: 'b = [0.17]', 30: 'arr[0] = 0.17', 31: 'idx = 1' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: [0.17, 0.17, 0.82], buckets: [[0.17], [], [0.82, 0.91]], bucket: 0, written: 1, idx: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Gather 2',
      title: 'Copy bucket 2 into arr[1…2]',
      body: 'Bucket 1 is empty, so nothing is written for it. Bucket 2 writes `arr[1] = 0.82` and `arr[2] = 0.91`, and `idx` reaches 3.',
      code: { view: 'final', lines: [28, 30, 31] },
      values: { 28: 'b = [0.82, 0.91]', 30: 'arr[1], arr[2] = 0.82, 0.91', 31: 'idx = 3' },
      metrics: { buckets: 3, used: 2, result: '—' },
      scene: { entities: scene({ values: [0.17, 0.82, 0.91], buckets: [[0.17], [], [0.82, 0.91]], bucket: 2, written: 3, idx: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Return',
      title: 'Sorted: [0.17, 0.82, 0.91]',
      body: 'Line 33 returns the array. Only values inside the same bucket were ever compared.',
      code: { view: 'final', lines: [33] },
      values: { 33: 'return [0.17, 0.82, 0.91]' },
      metrics: { buckets: 3, used: 2, result: '[0.17, 0.82, 0.91]' },
      scene: { entities: scene({ values: [0.17, 0.82, 0.91], buckets: [[0.17], [], [0.82, 0.91]], written: 3, done: true }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'O(n) on even data, O(n²) when values clump',
      body: 'With values spread evenly, each bucket holds about one value, so scattering, sorting and gathering are all `O(n)`: **`O(n + k)` time and space** on average.\n\nIf every value lands in one bucket, its insertion sort does all the work: **`O(n²)`**.',
      code: { view: 'final', lines: [13, 17] },
      metrics: { buckets: 3, used: 2, result: '[0.17, 0.82, 0.91]' },
      scene: { entities: scene({ values: [0.17, 0.82, 0.91], buckets: [[0.17], [], [0.82, 0.91]], written: 3, done: true, note: 'evenly spread  →  O(n)\nall clumped    →  O(n²)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Ordered',
      title: 'Why line 13 keeps the buckets in order',
      body: 'Line 13 sends a value to `int(x × n)`: bucket `k` only gets values in `[k/n, (k+1)/n)`. So everything in bucket 0 is smaller than everything in bucket 1, and so on.\n\nThat order-preserving mapping is the key decision: values from different buckets never need comparing, and gathering left to right is enough.',
      code: { view: 'final', lines: [13, 28] },
      values: { 13: 'bucket k holds [k/n, (k+1)/n)', 28: 'read buckets 0, 1, 2… in order' },
      metrics: { buckets: 3, used: 2, result: '[0.17, 0.82, 0.91]' },
      scene: { entities: scene({ values: [0.17, 0.82, 0.91], buckets: [[0.17], [], [0.82, 0.91]], written: 3, done: true, note: 'bucket 0  <  0.33  ≤  bucket 1\nbucket 1  <  0.67  ≤  bucket 2\n→ read 0, 1, 2 in order' }) },
    },
  ],
  trace: {
    title: 'Run bucket sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Decimals from 0 up to (not incl.) 1', kind: 'numbers', default: '0.78, 0.17, 0.39, 0.26, 0.72', decimals: true }],
    presets: [
      { label: 'Evenly spread', values: { arr: '0.15, 0.55, 0.35, 0.75, 0.95' } },
      { label: 'Clumped', values: { arr: '0.91, 0.95, 0.92, 0.93' } },
      { label: 'Story example', values: { arr: '0.91, 0.17, 0.82' } },
      { label: 'Duplicates', values: { arr: '0.5, 0.2, 0.5, 0.2' } },
    ],
    maxItems: 6,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      if (input.some((v) => v < 0 || v >= 1)) throw new Error('Use decimals from 0 up to (but not including) 1, like 0.42.');
      return traceBucket(input);
    },
  },
});
