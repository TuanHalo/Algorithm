import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface JumpState {
  readonly values: readonly number[];
  readonly target: number;
  readonly block?: number;
  readonly prev?: number;
  readonly step?: number;
  /** Set while scanning one block item by item. */
  readonly idx?: number;
  readonly found?: boolean;
  /** Cells left of this index are ruled out. */
  readonly ruledOut?: number;
  /** Block ends checked so far (the jump probes). */
  readonly probed?: readonly number[];
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: ruled-out blocks, the current block, its end probe or the scan pointer, and the variables. */
function scene(s: JumpState): Entity[] {
  const n = s.values.length;
  const cellTones: Record<number, Tone> = {};
  for (let i = 0; i < Math.min(s.ruledOut ?? 0, n); i += 1) cellTones[i] = 'muted';
  for (const p of s.probed ?? []) if (p < n) cellTones[p] = p < (s.ruledOut ?? 0) ? 'muted' : 'compare';
  const inBlock = s.prev !== undefined && s.step !== undefined && s.prev < n;
  const end = s.step === undefined ? undefined : Math.min(s.step, n) - 1;
  if (inBlock && s.idx === undefined && end !== undefined) cellTones[end] = 'compare';
  if (s.idx !== undefined) cellTones[s.idx] = s.found ? 'found' : 'compare';

  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (inBlock && s.prev !== undefined && end !== undefined && end >= s.prev) {
    entities.push(range('blk', 'arr', s.prev, end, s.found ? 'found' : 'compare'));
    entities.push(ptr('prev', 'arr', s.prev, 'prev', { tone: 'done', codeVar: 'prev' }));
    if (s.idx === undefined) entities.push(ptr('end', 'arr', end, 'step − 1', { side: 'top', tone: 'active' }));
  }
  if (s.idx !== undefined) entities.push(ptr('idx', 'arr', s.idx, 'idx', { side: 'top', tone: s.found ? 'found' : 'active', codeVar: 'idx' }));

  const rows = [
    { name: 'target', value: s.target },
    { name: 'n', value: n },
    { name: 'block', value: s.block ?? '—', tone: s.block === undefined ? 'muted' : 'default' },
    { name: 'prev', value: s.prev ?? '—', tone: s.prev === undefined ? 'muted' : 'default' },
    { name: 'step', value: s.step ?? '—', tone: s.step === undefined ? 'muted' : 'default' },
    { name: 'idx', value: s.idx ?? '—', tone: s.idx === undefined ? 'muted' : 'default' },
  ] as const;
  entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs jump search on any input and records one step per block probe and per scanned item (chapter "run", final code). */
function traceJumpSearch(input: readonly number[], target: number): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const n = values.length;
  const steps: Step[] = [];
  const block = Math.floor(Math.sqrt(n));
  let prev = 0;
  let step = block;
  let probes = 0;
  let scans = 0;
  const probed: number[] = [];
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ probes, scans, result });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Search for ${target} in ${n} sorted numbers`,
    body: `${wasSorted ? '' : 'Jump search needs sorted input, so the numbers were sorted first.\n\n'}Line 9: blocks of \`isqrt(${n}) = ${block}\`. Line 10: the first block starts at \`prev = 0\` and ends just before \`step = ${block}\`.`,
    code: { view: 'final', lines: [5, 9, 10] },
    values: { 5: `n = ${n}`, 9: `block = ${block}`, 10: `prev, step = 0, ${block}` },
    metrics: metrics(),
    scene: { entities: scene({ values, target, block, prev, step }) },
  });

  for (;;) {
    const end = Math.min(step, n) - 1;
    const endValue = values[end] ?? 0;
    probes += 1;
    probed.push(end);
    const tooSmall = endValue < target;
    // The probe: compare the block's last item with the target.
    steps.push({
      chapter: 'run',
      short: `Probe ${probes}`,
      title: tooSmall ? `Block ${prev}–${end} ends at ${endValue}: too small` : `Block ${prev}–${end} ends at ${endValue}: stop jumping`,
      body: tooSmall
        ? `Line 12 looks at the block’s last item, \`arr[${end}] = ${endValue}\`. \`${endValue} < ${target}\`, so every item in this block is smaller than ${target}.`
        : `Line 12: \`arr[${end}] = ${endValue}\`, and \`${endValue} < ${target}\` is false. So if ${target} is anywhere, it’s in indexes ${prev}–${end}.`,
      code: { view: 'final', lines: [12] },
      values: { 12: `arr[${end}] = ${endValue} < ${target} → ${tooSmall ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, block, prev, step, ruledOut: prev, probed }) },
    });
    if (!tooSmall) break;
    // The jump it causes.
    prev = step;
    step += block;
    const offEnd = prev >= n;
    steps.push({
      chapter: 'run',
      short: offEnd ? 'Off the end' : `Jump → ${prev}`,
      title: offEnd ? `No blocks left: return -1` : `Skip it: next block is ${prev}–${Math.min(step, n) - 1}`,
      body: offEnd
        ? `Lines 13–14: \`prev = ${prev}\`, past the end. Line 15: \`${prev} >= ${n}\`, so every block ended below ${target} and line 16 returns **-1**.`
        : `Line 13: \`prev = ${prev}\`. Line 14: \`step = ${step - block} + ${block} = ${step}\`. Line 15: \`prev\` is still inside the array, keep going.`,
      code: { view: 'final', lines: offEnd ? [13, 14, 15, 16] : [13, 14, 15] },
      values: offEnd
        ? { 13: `prev = ${prev}`, 14: `step = ${step}`, 15: `${prev} >= ${n} → True`, 16: 'return -1' }
        : { 13: `prev = ${prev}`, 14: `step = ${step}`, 15: `${prev} >= ${n} → False` },
      metrics: metrics(offEnd ? -1 : '—'),
      scene: {
        entities: scene(
          offEnd
            ? { values, target, block, prev, step, ruledOut: n, probed, note: `${target} > every item → return -1`, noteTone: 'miss' }
            : { values, target, block, prev, step, ruledOut: prev, probed },
        ),
      },
    });
    if (offEnd) return steps;
  }

  const stop = Math.min(step, n);
  for (let idx = prev; idx < stop; idx += 1) {
    const value = values[idx] ?? 0;
    scans += 1;
    if (value === target) {
      steps.push({
        chapter: 'run',
        short: `Scan ${idx}`,
        title: `Scan the block: arr[${idx}] = ${value}`,
        body: `Line 18: \`idx = ${idx}\`. Line 19: \`${value} == ${target}\`, a match.`,
        code: { view: 'final', lines: [18, 19] },
        values: { 18: `idx = ${idx}`, 19: `${value} == ${target} → True` },
        metrics: metrics(),
        scene: { entities: scene({ values, target, block, prev, step, idx, found: true, ruledOut: idx }) },
      });
      steps.push({
        chapter: 'run',
        short: `Return ${idx}`,
        title: `Found it: return ${idx}`,
        body: `Line 20 returns **${idx}** after ${probes} probe${probes === 1 ? '' : 's'} and ${scans} scan${scans === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [20] },
        values: { 20: `return ${idx}` },
        metrics: metrics(idx),
        scene: { entities: scene({ values, target, block, prev, step, idx, found: true, ruledOut: idx }) },
      });
      return steps;
    }
    if (value > target) {
      steps.push({
        chapter: 'run',
        short: `Scan ${idx}`,
        title: `Scan the block: arr[${idx}] = ${value} is past ${target}`,
        body: `Line 18: \`idx = ${idx}\`. Line 19: not ${target}. Line 21: \`${value} > ${target}\`, so we’ve already passed where ${target} would be.`,
        code: { view: 'final', lines: [18, 19, 21] },
        values: { 18: `idx = ${idx}`, 19: `${value} == ${target} → False`, 21: `${value} > ${target} → True` },
        metrics: metrics(),
        scene: { entities: scene({ values, target, block, prev, step, idx, ruledOut: idx }) },
      });
      steps.push({
        chapter: 'run',
        short: 'Not found',
        title: `${target} isn’t in the array: return -1`,
        body: `The array is sorted, so ${target} can’t appear later. Line 22 breaks out of the scan and line 23 returns **-1**.`,
        code: { view: 'final', lines: [22, 23] },
        values: { 23: 'return -1' },
        metrics: metrics(-1),
        scene: { entities: scene({ values, target, block, prev, step, idx, ruledOut: idx, note: `${value} > ${target} → stop, return -1`, noteTone: 'miss' }) },
      });
      return steps;
    }
    steps.push({
      chapter: 'run',
      short: `Scan ${idx}`,
      title: `arr[${idx}] = ${value}: keep scanning`,
      body: `Line 18: \`idx = ${idx}\`. Lines 19 and 21: \`${value}\` is neither ${target} nor bigger, so the scan continues.`,
      code: { view: 'final', lines: [18, 19, 21] },
      values: { 18: `idx = ${idx}`, 19: `${value} == ${target} → False`, 21: `${value} > ${target} → False` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, block, prev, step, idx, ruledOut: idx }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Not found',
    title: 'The block ran out without a match',
    body: `Every item in indexes ${prev}–${stop - 1} was smaller than ${target}, so the loop ends and line 23 returns **-1**.`,
    code: { view: 'final', lines: [18, 23] },
    values: { 23: 'return -1' },
    metrics: metrics(-1),
    scene: { entities: scene({ values, target, block, prev, step, ruledOut: stop, note: 'block scanned → return -1', noteTone: 'miss' }) },
  });
  return steps;
}

const ARR = [1, 4, 6, 9, 12, 15, 19, 22, 27] as const;
const TARGET = 19;
const base = { values: ARR, target: TARGET } as const;

export default defineWalkthrough({
  id: 'learn/searching/jump-search',
  title: 'Jump Search, skip blocks then scan one',
  summary: 'From the idea to the code: jump through a sorted array in blocks of √n, then scan the one block that can hold the target.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `import math


def jump_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1

    block = math.isqrt(n)  # Optimal step size balances jumps and linear scan
    prev, step = 0, block

    while arr[min(step, n) - 1] < target:
        prev = step
        step += block
        if prev >= n:
            return -1  # Target is larger than the largest element

    for idx in range(prev, min(step, n)):
        if arr[idx] == target:
            return idx
        if arr[idx] > target:
            break  # Sorted order guarantees target cannot appear later
    return -1`,
  },
  metrics: [
    { key: 'probes', label: 'Block probes' },
    { key: 'scans', label: 'Items scanned' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'current block / item' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'found' },
  ],
  goals: [
    { text: 'Skip whole blocks with one comparison', step: 2 },
    { text: 'Jump until a block reaches the target', step: 5 },
    { text: 'Scan just one block', step: 7 },
    { text: 'See why the block size is √n', step: 18 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find 19 in a sorted array',
      body: 'Like finding page 142 in a thick book: flip ahead a chunk of pages at a time, then go page by page.\n\nLine 4 takes a **sorted** `arr` and a `target` and returns the target’s index, or `-1`.',
      code: { view: 'signature', lines: [4] },
      metrics: { probes: 0, scans: 0, result: '—' },
      scene: { entities: scene(base) },
    },
    {
      chapter: 'idea',
      short: 'Jump, scan',
      title: 'Check only the end of each block',
      body: 'Split the array into blocks and look only at each block’s **last** item. If it’s smaller than the target, the whole block is too small; skip it.\n\nThe first block whose end reaches the target is the only one that can hold it, so scan just that block.',
      code: { view: 'signature' },
      metrics: { probes: 0, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, probed: [2, 5, 8], note: 'blocks of 3: check 6, 15, 27\n27 ≥ 19 → scan that block' }) },
    },
    {
      chapter: 'build',
      short: 'Empty list',
      title: 'Lines 5–7: nothing to search',
      body: 'Line 5 counts the items. An empty list has nothing to jump over, so lines 6–7 return `-1` straight away.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: { probes: 0, scans: 0, result: '—' },
      changes: ['n = len(arr)', 'if n == 0: return -1'],
      scene: { entities: scene(base) },
    },
    {
      chapter: 'build',
      short: 'Block size',
      title: 'Lines 9–10: blocks of √n',
      body: 'Line 9 picks the block size: `math.isqrt(9) = 3`. Line 10 sets up the first block: it starts at `prev = 0` and ends just before `step = 3`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10], lines: [9, 10] },
      metrics: { probes: 0, scans: 0, result: '—' },
      changes: ['block = math.isqrt(n)', 'prev, step = 0, block'],
      scene: { entities: scene({ ...base, block: 3, prev: 0, step: 3 }) },
    },
    {
      chapter: 'build',
      short: 'Jump',
      title: 'Lines 12–14: skip blocks that end too low',
      body: 'Line 12 checks the block’s last item, `arr[2] = 6`. It’s smaller than 19, so nothing in this block can match: lines 13–14 jump to the next block.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 12, 13, 14], lines: [12, 13, 14] },
      metrics: { probes: 1, scans: 0, result: '—' },
      changes: ['while arr[min(step, n) - 1] < target', 'prev = step', 'step += block'],
      scene: { entities: scene({ ...base, block: 3, prev: 3, step: 6, ruledOut: 3, probed: [2] }) },
    },
    {
      chapter: 'build',
      short: 'Off the end',
      title: 'Lines 15–16: ran out of blocks',
      body: 'If `prev` jumps past the end, every block ended below the target, so it’s bigger than every item. Line 16 returns `-1`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 12, 13, 14, 15, 16], lines: [15, 16] },
      metrics: { probes: 1, scans: 0, result: '—' },
      changes: ['if prev >= n: return -1'],
      scene: { entities: scene({ ...base, block: 3, prev: 3, step: 6, ruledOut: 3, probed: [2], note: 'prev ≥ n\n→ target > every item' }) },
    },
    {
      chapter: 'build',
      short: 'Scan',
      title: 'Lines 18–20: walk through one block',
      body: 'Once a block’s end reaches the target, line 18 visits only that block’s items, from `prev` up to `step`. Lines 19–20 return the index on a match.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 12, 13, 14, 15, 16, 18, 19, 20], lines: [18, 19, 20] },
      metrics: { probes: 1, scans: 0, result: '—' },
      changes: ['for idx in range(prev, min(step, n))', 'if arr[idx] == target: return idx'],
      scene: { entities: scene({ ...base, block: 3, prev: 3, step: 6, ruledOut: 3, probed: [2] }) },
    },
    {
      chapter: 'build',
      short: 'Stop early',
      title: 'Lines 21–23: past the target means missing',
      body: 'Sorted order gives one more shortcut: once `arr[idx]` is bigger than the target, it can’t appear later, so line 22 breaks and line 23 returns `-1`.\n\nNow let’s run it.',
      code: { view: 'final', lines: [21, 22, 23] },
      metrics: { probes: 1, scans: 0, result: '—' },
      changes: ['if arr[idx] > target: break', 'return -1'],
      scene: { entities: scene({ ...base, block: 3, prev: 3, step: 6, ruledOut: 3, probed: [2] }) },
    },
    {
      chapter: 'run',
      short: 'Start',
      title: 'Blocks of 3; the first is indexes 0–2',
      body: 'Line 5: `n = 9`. Line 9: `block = isqrt(9) = 3`. Line 10: the first block starts at `prev = 0` and ends just before `step = 3`.',
      code: { view: 'final', lines: [5, 9, 10] },
      values: { 5: 'n = 9', 9: 'block = isqrt(9) = 3', 10: 'prev, step = 0, 3' },
      metrics: { probes: 0, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 0, step: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Probe 1',
      title: 'Block 0–2 ends at 6: too small',
      body: 'Line 12 looks at the block’s last item, `arr[min(3, 9) − 1] = arr[2] = 6`. `6 < 19`, so every item in this block is smaller than 19.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'arr[2] = 6 < 19 → True' },
      metrics: { probes: 1, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 0, step: 3, probed: [2] }) },
    },
    {
      chapter: 'run',
      short: 'Jump 1',
      title: 'Skip it: next block is 3–5',
      body: 'Line 13: `prev = 3`. Line 14: `step = 3 + 3 = 6`. Line 15: `prev` is still inside the array, so we don’t give up.',
      code: { view: 'final', lines: [13, 14, 15] },
      values: { 13: 'prev = 3', 14: 'step = 3 + 3 = 6', 15: '3 >= 9 → False' },
      metrics: { probes: 1, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 3, step: 6, ruledOut: 3, probed: [2] }) },
    },
    {
      chapter: 'run',
      short: 'Probe 2',
      title: 'Block 3–5 ends at 15: too small',
      body: 'Line 12: `arr[5] = 15`, and `15 < 19`, so this whole block is too small as well.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'arr[5] = 15 < 19 → True' },
      metrics: { probes: 2, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 3, step: 6, ruledOut: 3, probed: [2, 5] }) },
    },
    {
      chapter: 'run',
      short: 'Jump 2',
      title: 'Skip it: next block is 6–8',
      body: 'Line 13: `prev = 6`. Line 14: `step = 6 + 3 = 9`. Line 15: `6 >= 9` is false, keep going.',
      code: { view: 'final', lines: [13, 14, 15] },
      values: { 13: 'prev = 6', 14: 'step = 6 + 3 = 9', 15: '6 >= 9 → False' },
      metrics: { probes: 2, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 6, step: 9, ruledOut: 6, probed: [2, 5] }) },
    },
    {
      chapter: 'run',
      short: 'Probe 3',
      title: 'Block 6–8 ends at 27: stop jumping',
      body: 'Line 12: `arr[8] = 27`, and `27 < 19` is false. So if 19 is anywhere, it’s in this block, indexes 6–8.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'arr[8] = 27 < 19 → False' },
      metrics: { probes: 3, scans: 0, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 6, step: 9, ruledOut: 6, probed: [2, 5, 8] }) },
    },
    {
      chapter: 'run',
      short: 'Scan 6',
      title: 'Scan the block: arr[6] = 19',
      body: 'Line 18 walks `idx` from `prev = 6` up to `min(9, 9) = 9`. Line 19: the first item, `arr[6] = 19`, equals the target.',
      code: { view: 'final', lines: [18, 19] },
      values: { 18: 'idx = 6 (of 6, 7, 8)', 19: '19 == 19 → True' },
      metrics: { probes: 3, scans: 1, result: '—' },
      scene: { entities: scene({ ...base, block: 3, prev: 6, step: 9, idx: 6, found: true, ruledOut: 6, probed: [2, 5] }) },
    },
    {
      chapter: 'run',
      short: 'Return 6',
      title: 'Found it: return 6',
      body: 'Line 20 returns **6**.\n\n3 probes and 1 scan, instead of 7 checks from the front.',
      code: { view: 'final', lines: [20] },
      values: { 20: 'return 6' },
      metrics: { probes: 3, scans: 1, result: 6 },
      scene: { entities: scene({ ...base, block: 3, prev: 6, step: 9, idx: 6, found: true, ruledOut: 6, probed: [2, 5] }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'At most √n jumps plus √n scans',
      body: 'With blocks of `√n` there are at most `√n` jumps and at most `√n` scans: **`O(√n)` time**, `O(1)` space.\n\nThat sits between linear search (`O(n)`) and binary search (`O(log n)`).',
      code: { view: 'final', lines: [12, 18] },
      metrics: { probes: 3, scans: 1, result: 6 },
      scene: {
        entities: scene({
          ...base,
          block: 3,
          prev: 6,
          step: 9,
          idx: 6,
          found: true,
          ruledOut: 6,
          probed: [2, 5],
          note: 'n = 100     →  ≤ 20 looks\nn = 10,000  →  ≤ 200 looks',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Why √n',
      title: 'Why line 9 picks blocks of √n',
      body: 'The block size is the key decision. Bigger blocks mean fewer jumps but a longer scan; smaller blocks mean the opposite.\n\nFor `n` items and blocks of `b`, the work is about `n/b + b`, which is smallest at `b = √n`.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'block = 3 for n = 9' },
      metrics: { probes: 3, scans: 1, result: 6 },
      scene: { entities: scene({ ...base, block: 3, prev: 0, step: 3, note: 'n = 10,000:\nb = 10   →  1,000 + 10 = 1,010\nb = 100  →  100 + 100 = 200' }) },
    },
  ],
  trace: {
    title: 'Run jump search on your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (we sort it for you)', kind: 'numbers', default: '1, 4, 6, 9, 12, 15, 19, 22, 27' },
      { name: 'target', label: 'Target', kind: 'number', default: '22' },
    ],
    presets: [
      { label: 'Last block', values: { arr: '2, 5, 9, 13, 17, 21, 26, 30, 34', target: '30' } },
      { label: 'Missing', values: { arr: '3, 6, 9, 12, 15, 18', target: '10' } },
      { label: 'Bigger than all', values: { arr: '1, 2, 3, 4', target: '9' } },
      { label: 'First item', values: { arr: '7, 8, 9, 10', target: '7' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      if (input.length === 0) throw new Error('Enter at least one number.');
      return traceJumpSearch(input, target);
    },
  },
});
