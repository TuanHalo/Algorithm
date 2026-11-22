import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface ExpState {
  readonly values: readonly number[];
  readonly target: number;
  /** Doubling phase: the current bound (may be past the end). */
  readonly bound?: number;
  /** Indexes already probed while doubling (all ≤ target). */
  readonly probed?: readonly number[];
  /** Binary phase: the window. */
  readonly low?: number;
  readonly high?: number;
  readonly mid?: number;
  readonly found?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: probed cells and the bound while doubling, then a binary-search window. */
function scene(s: ExpState): Entity[] {
  const n = s.values.length;
  const last = n - 1;
  const cellTones: Record<number, Tone> = {};
  const binary = s.low !== undefined && s.high !== undefined;
  if (binary) {
    s.values.forEach((_, i) => {
      if (i < (s.low ?? 0) || i > (s.high ?? last)) cellTones[i] = 'muted';
    });
  } else {
    for (const p of s.probed ?? []) cellTones[p] = 'done';
    if (s.bound !== undefined && s.bound < n) cellTones[s.bound] = 'compare';
  }
  if (s.mid !== undefined) cellTones[s.mid] = s.found === s.mid ? 'found' : 'compare';
  if (s.found !== undefined) cellTones[s.found] = 'found';

  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (binary && s.low !== undefined && s.high !== undefined) {
    if (s.low <= s.high) entities.push(range('window', 'arr', s.low, s.high, s.found === undefined ? 'compare' : 'found'));
    if (s.low <= last) entities.push(ptr('low', 'arr', s.low, 'low', { tone: 'done', codeVar: 'low' }));
    if (s.high >= 0 && s.high <= last) entities.push(ptr('high', 'arr', s.high, 'high', { tone: 'done', codeVar: 'high' }));
  } else if (s.bound !== undefined && s.bound < n) {
    entities.push(ptr('bound', 'arr', s.bound, 'bound', { side: 'top', tone: 'active', codeVar: 'bound' }));
  }
  if (s.mid !== undefined) entities.push(ptr('mid', 'arr', s.mid, 'mid', { side: 'top', tone: s.found === s.mid ? 'found' : 'active', codeVar: 'mid' }));

  const dash = (v: number | undefined): number | string => v ?? '—';
  const tone = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'target', value: s.target },
        { name: 'n', value: n },
        { name: 'bound', value: dash(s.bound), tone: tone(s.bound) },
        { name: 'low', value: dash(s.low), tone: tone(s.low) },
        { name: 'high', value: dash(s.high), tone: tone(s.high) },
        { name: 'mid', value: dash(s.mid), tone: tone(s.mid) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs exponential search on any input and records one step per probe (chapter "run", final code). */
function traceExponential(input: readonly number[], target: number): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const n = values.length;
  const at = (i: number): number => values[i] ?? 0;
  const steps: Step[] = [];
  let probes = 1;
  const metrics = (window: number, result: string | number = '—'): Record<string, string | number> => ({ probes, window, result });

  const sortedNote = wasSorted ? '' : 'Exponential search needs sorted input, so the numbers were sorted first.\n\n';
  const hitAt0 = at(0) === target;
  steps.push({
    chapter: 'run',
    short: 'Index 0',
    title: `arr[0] = ${at(0)}${hitAt0 ? ': the target' : ': not the target'}`,
    body: `${sortedNote}Line 2: \`n = ${n}\`, so the list isn’t empty. Line 5: \`arr[0] = ${at(0)}\` ${hitAt0 ? `equals ${target}.` : `isn’t ${target}, so we start doubling.`}`,
    code: { view: 'final', lines: [2, 5] },
    values: { 2: `n = ${n}`, 3: `${n} == 0 → False`, 5: `${at(0)} == ${target} → ${hitAt0 ? 'True' : 'False'}` },
    metrics: metrics(n),
    scene: { entities: scene(hitAt0 ? { values, target, found: 0 } : { values, target, probed: [0] }) },
  });
  if (hitAt0) {
    steps.push({
      chapter: 'run',
      short: 'Return 0',
      title: 'Found it at the front: return 0',
      body: 'Line 6 returns **0** without any doubling.',
      code: { view: 'final', lines: [6] },
      values: { 6: 'return 0' },
      metrics: metrics(n, 0),
      scene: { entities: scene({ values, target, found: 0 }) },
    });
    return steps;
  }

  // Doubling: one step per probe of arr[bound]; each doubled bound is tested in the same step.
  let bound = 1;
  const probed = [0];
  for (;;) {
    const inside = bound < n;
    const keepGoing = inside && at(bound) <= target;
    if (inside) probes += 1;
    const test = inside ? `${bound} < ${n} and ${at(bound)} <= ${target} → ${keepGoing ? 'True' : 'False'}` : `${bound} < ${n} → False`;
    const first = bound === 1;
    steps.push({
      chapter: 'run',
      short: first ? 'bound = 1' : `bound → ${bound}`,
      title: inside
        ? `${first ? 'Probe index 1' : `Double to ${bound}`}: arr[${bound}] = ${at(bound)} ${keepGoing ? `≤ ${target}` : `> ${target}, stop`}`
        : `Double to ${bound}: past the end, stop`,
      body: `${first ? 'Line 8: `bound = 1`.' : `Line 11 doubles: \`bound = ${bound}\`.`} Line 10: ${
        inside ? (keepGoing ? `\`arr[${bound}] = ${at(bound)} <= ${target}\`, so the target is further right.` : `\`arr[${bound}] = ${at(bound)}\` has passed ${target}, so the doubling stops.`) : `${bound} is past the last index, so the doubling stops.`
      }`,
      code: { view: 'final', lines: first ? [8, 10] : [10, 11] },
      values: first ? { 8: 'bound = 1', 10: test } : { 10: test, 11: `bound = ${bound / 2} * 2 = ${bound}` },
      metrics: metrics(n),
      scene: { entities: scene({ values, target, bound, probed }) },
    });
    if (!keepGoing) break;
    probed.push(bound);
    bound *= 2;
  }
  let low = Math.floor(bound / 2);
  let high = Math.min(bound, n - 1);
  steps.push({
    chapter: 'run',
    short: 'Window',
    title: `The target is between indexes ${low} and ${high}`,
    body: `Line 13: \`low = ${bound} // 2 = ${low}\`, the previous probe, which was ≤ ${target}. Line 14: \`high = min(${bound}, ${n - 1}) = ${high}\`.`,
    code: { view: 'final', lines: [13, 14] },
    values: { 13: `low = ${bound} // 2 = ${low}`, 14: `high = min(${bound}, ${n} - 1) = ${high}` },
    metrics: metrics(high - low + 1),
    scene: { entities: scene({ values, target, bound, low, high }) },
  });

  // Binary search inside the window: look at the middle, then act on it.
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const value = at(mid);
    const hit = value === target;
    probes += 1;
    steps.push({
      chapter: 'run',
      short: `mid = ${mid}`,
      title: `Binary search: arr[${mid}] = ${value}`,
      body: `Line 15: \`${low} <= ${high}\`. Line 16: \`mid = ${low} + (${high} − ${low}) // 2 = ${mid}\`. Line 17: \`${value} == ${target}\` is ${hit ? 'true' : 'false'}.`,
      code: { view: 'final', lines: [15, 16, 17] },
      values: { 15: `${low} <= ${high} → True`, 16: `mid = ${mid}`, 17: `${value} == ${target} → ${hit ? 'True' : 'False'}` },
      metrics: metrics(high - low + 1),
      scene: { entities: scene({ values, target, bound, low, high, mid, found: hit ? mid : undefined }) },
    });
    if (hit) {
      steps.push({
        chapter: 'run',
        short: `Return ${mid}`,
        title: `Found it: return ${mid}`,
        body: `Line 18 returns **${mid}** after ${probes} looks at the array.`,
        code: { view: 'final', lines: [18] },
        values: { 18: `return ${mid}` },
        metrics: metrics(high - low + 1, mid),
        scene: { entities: scene({ values, target, bound, low, high, mid, found: mid }) },
      });
      return steps;
    }
    const goRight = value < target;
    if (goRight) low = mid + 1;
    else high = mid - 1;
    steps.push({
      chapter: 'run',
      short: goRight ? `low → ${low}` : `high → ${high}`,
      title: `${value} is too ${goRight ? 'small' : 'big'}: drop the ${goRight ? 'left' : 'right'} part`,
      body: goRight
        ? `Line 19: \`${value} < ${target}\`, so the target is right of the middle. Line 20: \`low = ${low}\`.`
        : `Line 19: \`${value} < ${target}\` is false, so the target is left of the middle. Line 22: \`high = ${high}\`.`,
      code: { view: 'final', lines: goRight ? [19, 20] : [19, 21, 22] },
      values: { 19: `${value} < ${target} → ${goRight ? 'True' : 'False'}`, ...(goRight ? { 20: `low = ${mid} + 1 = ${low}` } : { 22: `high = ${mid} - 1 = ${high}` }) },
      metrics: metrics(Math.max(0, high - low + 1)),
      scene: { entities: scene({ values, target, bound, low, high }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Not found',
    title: `low (${low}) > high (${high}): the window is empty`,
    body: 'Line 15’s condition fails, so line 23 returns **-1**.',
    code: { view: 'final', lines: [15, 23] },
    values: { 15: `${low} <= ${high} → False`, 23: 'return -1' },
    metrics: metrics(0, -1),
    scene: { entities: scene({ values, target, bound, low, high, note: 'low > high → return -1', noteTone: 'miss' }) },
  });
  return steps;
}

const ARR = [3, 6, 9, 14, 18, 25, 31, 40, 47, 56] as const;
const TARGET = 31;
const base = { values: ARR, target: TARGET } as const;

export default defineWalkthrough({
  id: 'learn/searching/exponential-search',
  title: 'Exponential Search, double then halve',
  summary: 'From the idea to the code: double a bound until it passes the target, then binary-search the small range it leaves behind.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def exponential_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1
    if arr[0] == target:
        return 0

    bound = 1
    # Double the range while still below target
    while bound < n and arr[bound] <= target:
        bound *= 2

    low = bound // 2
    high = min(bound, n - 1)
    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
  },
  metrics: [
    { key: 'probes', label: 'Array looks' },
    { key: 'window', label: 'Window size' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'done', label: 'probed, ≤ target' },
    { tone: 'compare', label: 'bound / window / middle' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'found' },
  ],
  goals: [
    { text: 'Find a small range by doubling', step: 2 },
    { text: 'Turn the doubling into a 2-line loop', step: 5 },
    { text: 'Hand the range to binary search', step: 6 },
    { text: 'See why the window starts at bound // 2', step: 19 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find 31, probably near the front',
      body: 'Guessing a big secret number, you might try 1, 2, 4, 8, 16… until you overshoot, then narrow down.\n\nLine 1 takes a **sorted** `arr` and a `target` and returns the target’s index, or `-1`.',
      code: { view: 'signature', lines: [1] },
      metrics: { probes: 0, window: 10, result: '—' },
      scene: { entities: scene(base) },
    },
    {
      chapter: 'idea',
      short: 'Double',
      title: 'Double until you pass it, then halve',
      body: 'Probe indexes 1, 2, 4, 8… until a value passes the target. The target must then lie between the last two probes, a range about as long as its position `i`.\n\nBinary search finishes the job inside that range, never touching the far end of the array.',
      code: { view: 'signature' },
      metrics: { probes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, probed: [1, 2, 4], bound: 8, note: 'probe 6, 9, 18 → all ≤ 31\n47 > 31 → search indexes 4–8' }) },
    },
    {
      chapter: 'build',
      short: 'Empty list',
      title: 'Lines 2–4: nothing to search',
      body: 'Line 2 counts the items, and lines 3–4 return `-1` for an empty list.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: { probes: 0, window: 10, result: '—' },
      changes: ['n = len(arr)', 'if n == 0: return -1'],
      scene: { entities: scene(base) },
    },
    {
      chapter: 'build',
      short: 'Index 0',
      title: 'Lines 5–6: check the first item',
      body: 'Doubling starts at index 1, so lines 5–6 check index 0 on its own. `arr[0] = 3`, not 31.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [5, 6] },
      metrics: { probes: 1, window: 10, result: '—' },
      changes: ['if arr[0] == target: return 0'],
      scene: { entities: scene({ ...base, probed: [0] }) },
    },
    {
      chapter: 'build',
      short: 'Doubling',
      title: 'Lines 8–10: keep going while still below',
      body: 'Line 8 starts at `bound = 1`. Line 10 keeps going while `bound` is inside the array and `arr[bound]` hasn’t passed the target: `arr[1] = 6` is ≤ 31.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10], lines: [8, 10] },
      metrics: { probes: 2, window: 10, result: '—' },
      changes: ['bound = 1', 'while bound < n and arr[bound] <= target'],
      scene: { entities: scene({ ...base, bound: 1, probed: [0] }) },
    },
    {
      chapter: 'build',
      short: 'Window',
      title: 'Lines 11–14: double, then fix the range',
      body: 'Line 11 doubles the bound: 1, 2, 4, 8. Once `arr[8] = 47` passes 31, line 13 starts the window at the previous bound, `8 // 2 = 4`, and line 14 ends it at `min(8, 9) = 8`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14], lines: [11, 13, 14] },
      metrics: { probes: 5, window: 5, result: '—' },
      changes: ['bound *= 2', 'low = bound // 2', 'high = min(bound, n - 1)'],
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8 }) },
    },
    {
      chapter: 'build',
      short: 'Middle',
      title: 'Lines 15–17: binary search the window',
      body: 'The rest is plain binary search. Line 15 loops while the window has cells, line 16 finds its middle, `4 + (8 − 4) // 2 = 6`, and line 17 compares it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17], lines: [15, 16, 17] },
      metrics: { probes: 5, window: 5, result: '—' },
      changes: ['while low <= high', 'mid = low + (high - low) // 2', 'if arr[mid] == target'],
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8, mid: 6 }) },
    },
    {
      chapter: 'build',
      short: 'Hit or right',
      title: 'Lines 18–20: return a hit, or go right',
      body: 'Line 18 returns the middle on a match. If it’s too small, line 20 searches the right half.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20], lines: [18, 19, 20] },
      metrics: { probes: 5, window: 5, result: '—' },
      changes: ['return mid', 'if arr[mid] < target: low = mid + 1'],
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8, mid: 6 }) },
    },
    {
      chapter: 'build',
      short: 'Left or quit',
      title: 'Lines 21–23: go left, or give up',
      body: 'Otherwise line 22 searches left, and line 23 returns `-1` once the window is empty.\n\nNow let’s run it.',
      code: { view: 'final', lines: [21, 22, 23] },
      metrics: { probes: 5, window: 5, result: '—' },
      changes: ['else: high = mid - 1', 'return -1'],
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8, mid: 6 }) },
    },
    {
      chapter: 'run',
      short: 'Index 0',
      title: 'arr[0] = 3: not the target',
      body: 'Line 2: `n = 10`, so the list isn’t empty. Line 5: `arr[0] = 3` isn’t 31, so we start doubling.',
      code: { view: 'final', lines: [2, 5] },
      values: { 2: 'n = 10', 3: '10 == 0 → False', 5: '3 == 31 → False' },
      metrics: { probes: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, probed: [0] }) },
    },
    {
      chapter: 'run',
      short: 'bound = 1',
      title: 'Probe index 1: arr[1] = 6 ≤ 31',
      body: 'Line 8: `bound = 1`. Line 10: 1 is inside the array and `arr[1] = 6 <= 31`, so the target is further right.',
      code: { view: 'final', lines: [8, 10] },
      values: { 8: 'bound = 1', 10: '1 < 10 and 6 <= 31 → True' },
      metrics: { probes: 2, window: 10, result: '—' },
      scene: { entities: scene({ ...base, bound: 1, probed: [0] }) },
    },
    {
      chapter: 'run',
      short: 'bound → 2',
      title: 'Double to 2: arr[2] = 9 ≤ 31',
      body: 'Line 11 doubles: `bound = 2`. Line 10: `arr[2] = 9 <= 31`, still below the target.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: '2 < 10 and 9 <= 31 → True', 11: 'bound = 1 * 2 = 2' },
      metrics: { probes: 3, window: 10, result: '—' },
      scene: { entities: scene({ ...base, bound: 2, probed: [0, 1] }) },
    },
    {
      chapter: 'run',
      short: 'bound → 4',
      title: 'Double to 4: arr[4] = 18 ≤ 31',
      body: 'Line 11: `bound = 4`. Line 10: `arr[4] = 18 <= 31`, keep doubling.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: '4 < 10 and 18 <= 31 → True', 11: 'bound = 2 * 2 = 4' },
      metrics: { probes: 4, window: 10, result: '—' },
      scene: { entities: scene({ ...base, bound: 4, probed: [0, 1, 2] }) },
    },
    {
      chapter: 'run',
      short: 'bound → 8',
      title: 'Double to 8: arr[8] = 47 > 31, stop',
      body: 'Line 11: `bound = 8`. Line 10: `arr[8] = 47 <= 31` is false, so 47 has passed the target and the doubling stops.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: '8 < 10 and 47 <= 31 → False', 11: 'bound = 4 * 2 = 8' },
      metrics: { probes: 5, window: 10, result: '—' },
      scene: { entities: scene({ ...base, bound: 8, probed: [0, 1, 2, 4] }) },
    },
    {
      chapter: 'run',
      short: 'Window',
      title: 'The target is between indexes 4 and 8',
      body: 'Line 13: `low = 8 // 2 = 4`, the previous probe, which was ≤ 31. Line 14: `high = min(8, 9) = 8`. That leaves a window of 5 cells.',
      code: { view: 'final', lines: [13, 14] },
      values: { 13: 'low = 8 // 2 = 4', 14: 'high = min(8, 10 - 1) = 8' },
      metrics: { probes: 5, window: 5, result: '—' },
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8 }) },
    },
    {
      chapter: 'run',
      short: 'mid = 6',
      title: 'Binary search: arr[6] = 31',
      body: 'Line 15: `4 <= 8`. Line 16: `mid = 4 + (8 − 4) // 2 = 6`. Line 17: `arr[6] = 31` equals the target.',
      code: { view: 'final', lines: [15, 16, 17] },
      values: { 15: '4 <= 8 → True', 16: 'mid = 4 + (8 - 4) // 2 = 6', 17: '31 == 31 → True' },
      metrics: { probes: 6, window: 5, result: '—' },
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8, mid: 6, found: 6 }) },
    },
    {
      chapter: 'run',
      short: 'Return 6',
      title: 'Found it: return 6',
      body: 'Line 18 returns **6** after 6 looks at the array.\n\nIndex 9 was never touched.',
      code: { view: 'final', lines: [18] },
      values: { 18: 'return 6' },
      metrics: { probes: 6, window: 5, result: 6 },
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8, mid: 6, found: 6 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'O(log i): cost depends on where the target is',
      body: 'Passing position `i` takes about `log₂ i` doublings, and the window left behind is about `i/2` wide, so binary search adds `log₂ i` more: **`O(log i)` time**, `O(1)` space.\n\nWhen the target is near the front, that beats binary search’s `O(log n)`.',
      code: { view: 'final', lines: [10, 15] },
      metrics: { probes: 6, window: 5, result: 6 },
      scene: {
        entities: scene({
          ...base,
          bound: 8,
          low: 4,
          high: 8,
          mid: 6,
          found: 6,
          note: 'target at i = 6:\n4 doubling probes + 1 middle check\nworks even if n is unknown',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'bound // 2',
      title: 'Why line 13 starts at bound // 2, not 0',
      body: 'The previous probe, `arr[4] = 18`, was already ≤ 31, so nothing left of index 4 can be the target. Starting the window at `bound // 2` is the key decision: it keeps the window about `i/2` wide instead of `i`.',
      code: { view: 'final', lines: [13, 14] },
      values: { 13: 'low = 8 // 2 = 4', 14: 'high = min(8, 9) = 8' },
      metrics: { probes: 6, window: 5, result: 6 },
      scene: { entities: scene({ ...base, bound: 8, low: 4, high: 8, note: 'indexes 0–3 already ≤ 31\nwindow = 4..8, not 0..8' }) },
    },
  ],
  trace: {
    title: 'Run exponential search on your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (we sort it for you)', kind: 'numbers', default: '3, 6, 9, 14, 18, 25, 31, 40, 47, 56' },
      { name: 'target', label: 'Target', kind: 'number', default: '9' },
    ],
    presets: [
      { label: 'Near the front', values: { arr: '2, 4, 6, 8, 10, 12, 14, 16, 18, 20', target: '4' } },
      { label: 'At index 0', values: { arr: '5, 9, 11, 15', target: '5' } },
      { label: 'Last item', values: { arr: '1, 3, 5, 7, 9, 11', target: '11' } },
      { label: 'Missing', values: { arr: '2, 5, 8, 11, 14, 17', target: '9' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      if (input.length === 0) throw new Error('Enter at least one number.');
      return traceExponential(input, target);
    },
  },
});
