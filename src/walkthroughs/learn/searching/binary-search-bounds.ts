import { arr, defineWalkthrough, note, ptr, range, span, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface BoundState {
  readonly values: readonly number[];
  readonly target: number;
  readonly findFirst: boolean;
  readonly low: number;
  readonly high: number;
  readonly mid?: number;
  /** Best matching index so far, or -1. */
  readonly ans: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces `low`/`high`/`ans`, show only the array and target. */
  readonly bare?: boolean;
  /** Extra cells to mark as matches (the recap shows every copy). */
  readonly copies?: readonly number[];
}

/** Scene for one moment of the search: window, pointers, the best answer so far and the variables. */
function scene(s: BoundState): Entity[] {
  const last = s.values.length - 1;
  const cellTones: Record<number, Tone> = {};
  if (!s.bare) {
    s.values.forEach((_, i) => {
      if (i < s.low || i > s.high) cellTones[i] = 'muted';
    });
  }
  for (const i of s.copies ?? []) cellTones[i] = 'found';
  if (s.ans >= 0) cellTones[s.ans] = 'found';
  if (s.mid !== undefined) cellTones[s.mid] = s.values[s.mid] === s.target ? 'found' : 'compare';

  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (!s.bare) {
    if (s.low <= s.high) entities.push(range('window', 'arr', s.low, s.high, 'compare'));
    if (s.low >= 0 && s.low <= last) entities.push(ptr('low', 'arr', s.low, 'low', { tone: 'done', codeVar: 'low' }));
    if (s.high >= 0 && s.high <= last) entities.push(ptr('high', 'arr', s.high, 'high', { tone: 'done', codeVar: 'high' }));
    if (s.ans >= 0) entities.push(ptr('ans', 'arr', s.ans, 'ans', { side: 'top', tone: 'found', codeVar: 'ans' }));
  }
  if (s.mid !== undefined) {
    const hit = s.values[s.mid] === s.target;
    entities.push(ptr('mid', 'arr', s.mid, 'mid', { side: 'top', tone: hit ? 'found' : 'active', codeVar: 'mid' }));
  }

  const midValue = s.mid === undefined ? undefined : s.values[s.mid];
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      s.bare
        ? [
            { name: 'target', value: s.target },
            { name: 'find_first', value: s.findFirst ? 'True' : 'False' },
          ]
        : [
            { name: 'target', value: s.target },
            { name: 'find_first', value: s.findFirst ? 'True' : 'False' },
            { name: 'low', value: s.low },
            { name: 'high', value: s.high, tone: s.low > s.high ? 'miss' : 'default' },
            { name: 'mid', value: s.mid ?? '—', tone: s.mid === undefined ? 'muted' : 'default' },
            { name: 'ans', value: s.ans, tone: s.ans >= 0 ? 'found' : 'muted' },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const windowSize = (low: number, high: number): number => Math.max(0, high - low + 1);

/** Runs the bound search on any input and records one step per loop turn (chapter "run", final code). */
function traceBounds(input: readonly number[], target: number, findFirst: boolean): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const steps: Step[] = [];
  let low = 0;
  let high = values.length - 1;
  let ans = -1;
  let checks = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ checks, window: windowSize(low, high), result });
  const side = findFirst ? 'first' : 'last';

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Find the ${side} ${target} in ${values.length} sorted numbers`,
    body: `${wasSorted ? '' : 'The numbers were sorted first, because bounds only make sense in sorted order.\n\n'}Line 2 makes the window the whole array and line 3 starts \`ans = -1\`. Line 5 starts the loop.`,
    code: { view: 'final', lines: [2, 3, 5] },
    values: { 2: `low, high = 0, ${high}`, 3: 'ans = -1', 5: `0 <= ${high} → ${high >= 0 ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ values, target, findFirst, low, high, ans }) },
  });

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const value = values[mid] ?? 0;
    const hit = value === target;
    checks += 1;
    // Step 1 of the loop turn: compute the middle and compare it.
    steps.push({
      chapter: 'run',
      short: `mid = ${mid}`,
      title: `Look at the middle: arr[${mid}] = ${value}${hit ? ', a match' : ''}`,
      body: `Line 6: \`mid = ${low} + (${high} − ${low}) // 2 = ${mid}\`. Line 7: \`${value} == ${target}\` is ${hit ? `true. It’s a ${target}, but maybe not the ${side} one yet.` : 'false.'}`,
      code: { view: 'final', lines: [5, 6, 7] },
      values: { 5: `${low} <= ${high} → True`, 6: `mid = ${mid}`, 7: `${value} == ${target} → ${hit ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, findFirst, low, high, mid, ans }) },
    });
    // Step 2: what that comparison makes the code do.
    if (hit) {
      ans = mid;
      if (findFirst) high = mid - 1;
      else low = mid + 1;
      steps.push({
        chapter: 'run',
        short: `ans = ${mid}`,
        title: `Record index ${mid}, then look ${findFirst ? 'left' : 'right'}`,
        body: `Line 8 saves \`ans = ${mid}\`, the best answer so far. ${findFirst ? `An earlier ${target} could only be left of it, so line 11 moves \`high = ${high}\`.` : `A later ${target} could only be right of it, so line 13 moves \`low = ${low}\`.`}`,
        code: { view: 'final', lines: findFirst ? [8, 10, 11] : [8, 12, 13] },
        values: { 8: `ans = ${mid}`, 10: `find_first → ${findFirst ? 'True' : 'False'}`, ...(findFirst ? { 11: `high = ${high}` } : { 13: `low = ${low}` }) },
        metrics: metrics(),
        scene: { entities: scene({ values, target, findFirst, low, high, ans }) },
      });
      continue;
    }
    const goRight = value < target;
    if (goRight) low = mid + 1;
    else high = mid - 1;
    steps.push({
      chapter: 'run',
      short: goRight ? `low → ${low}` : `high → ${high}`,
      title: `${value} is too ${goRight ? 'small' : 'big'}: drop the ${goRight ? 'left' : 'right'} part`,
      body: goRight
        ? `Line 14: \`${value} < ${target}\`, so every index up to ${mid} is too small. Line 15 moves \`low = ${low}\`.`
        : `Line 14: \`${value} < ${target}\` is false, so the middle is too big and every index from ${mid} on is out. Line 17 moves \`high = ${high}\`.`,
      code: { view: 'final', lines: goRight ? [14, 15] : [14, 16, 17] },
      values: { 14: `${value} < ${target} → ${goRight ? 'True' : 'False'}`, ...(goRight ? { 15: `low = ${low}` } : { 17: `high = ${high}` }) },
      metrics: metrics(),
      scene: { entities: scene({ values, target, findFirst, low, high, ans }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: ans >= 0 ? `Return ${ans}` : 'Not found',
    title: `low (${low}) > high (${high}): the window is empty`,
    body:
      ans >= 0
        ? `Line 5’s condition fails, so line 19 returns \`ans\`: the ${side} ${target} is at index **${ans}**.`
        : `Line 5’s condition fails and no match was recorded, so line 19 returns **-1**.`,
    code: { view: 'final', lines: [5, 19] },
    values: { 5: `${low} <= ${high} → False`, 19: `return ${ans}` },
    metrics: metrics(ans),
    scene: {
      entities: scene({
        values,
        target,
        findFirst,
        low,
        high,
        ans,
        note: ans >= 0 ? `window empty → return ans = ${ans}` : 'window empty → return -1',
        noteTone: ans >= 0 ? 'found' : 'miss',
      }),
    },
  });
  return steps;
}

const ARR = [1, 3, 3, 3, 3, 5, 8, 9] as const;
const TARGET = 3;
const base = { values: ARR, target: TARGET, findFirst: true } as const;

export default defineWalkthrough({
  id: 'learn/searching/binary-search-bounds',
  title: 'Binary Search Bounds, the first and last copy',
  summary: 'From the idea to the code: binary search that keeps going after a hit, so it finds the first (or last) copy of a repeated value.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def find_bound(arr: list[int], target: int, find_first: bool = True) -> int:
    low, high = 0, len(arr) - 1
    ans = -1  # Track the best matching index seen so far

    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            ans = mid
            # Keep searching one side to tighten the boundary
            if find_first:
                high = mid - 1
            else:
                low = mid + 1
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return ans`,
  },
  snapshots: {
    plain: `def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid  # Stops at whichever copy it lands on
        if arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
  },
  metrics: [
    { key: 'checks', label: 'Checks' },
    { key: 'window', label: 'Window size' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'search window / middle' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'match (ans)' },
  ],
  goals: [
    { text: 'See why plain binary search can miss the first copy', step: 2 },
    { text: 'Record a hit and keep searching', step: 5 },
    { text: 'Flip one flag to find the last copy', step: 7 },
    { text: 'Know why the search continues after a hit', step: 19 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find the first 3 among repeats',
      body: 'Like finding the **first** student who scored 90 in a sorted gradebook full of ties: spotting one 90 isn’t enough.\n\nLine 1 gets a sorted `arr` and a `target`; with `find_first=True` it returns the index of the first copy, or `-1`.',
      code: { view: 'signature', lines: [1] },
      metrics: { checks: 0, window: 8, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 7, ans: -1, bare: true, note: 'four 3s at indexes 1–4\nwe want the first: 1' }) },
    },
    {
      chapter: 'idea',
      short: 'Plain fails',
      title: 'Plain binary search stops too early',
      body: 'Plain binary search returns whichever copy it lands on. Its first middle is index 3, a `3`, so it returns **3**, but the first `3` is at index 1.\n\nThe fix: on a hit, **write it down and keep searching** to the left.',
      code: { view: 'snapshot', id: 'plain', lines: [5, 6] },
      metrics: { checks: 1, window: 8, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 7, mid: 3, ans: -1, bare: true, note: 'plain search returns 3\nthe first 3 is at index 1', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Window',
      title: 'Lines 2–3: a window and a best answer',
      body: 'Line 2 makes the window the whole array, as in binary search. Line 3 adds `ans = -1`: the best match seen so far, and the result if we never find one.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: { checks: 0, window: 8, result: '—' },
      changes: ['low, high = 0, len(arr) - 1', 'ans = -1'],
      scene: { entities: scene({ ...base, low: 0, high: 7, ans: -1 }) },
    },
    {
      chapter: 'build',
      short: 'Probe',
      title: 'Lines 5–7: look at the middle',
      body: 'Lines 5–7 are the usual binary search loop: while the window has cells, compare its middle with the target.\n\n`mid = 0 + (7 − 0) // 2 = 3`, and `arr[3]` is a `3`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [5, 6, 7] },
      metrics: { checks: 1, window: 8, result: '—' },
      changes: ['while low <= high', 'mid = low + (high - low) // 2', 'if arr[mid] == target'],
      scene: { entities: scene({ ...base, low: 0, high: 7, mid: 3, ans: -1 }) },
    },
    {
      chapter: 'build',
      short: 'Remember',
      title: 'Line 8: a hit is a candidate, not the end',
      body: 'Line 8 records the hit, `ans = 3`, as the best answer so far. The comment on line 9 says what comes next: keep narrowing on one side.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: { checks: 1, window: 8, result: '—' },
      changes: ['ans = mid'],
      scene: { entities: scene({ ...base, low: 0, high: 7, mid: 3, ans: 3 }) },
    },
    {
      chapter: 'build',
      short: 'Go left',
      title: 'Lines 10–11: an earlier copy must be to the left',
      body: 'To find the **first** copy, any better answer must sit left of `mid`. Line 11 moves `high = mid − 1 = 2`, so the window becomes indexes 0–2.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: { checks: 1, window: 3, result: '—' },
      changes: ['high = mid - 1'],
      scene: { entities: scene({ ...base, low: 0, high: 2, ans: 3 }) },
    },
    {
      chapter: 'build',
      short: 'Or right',
      title: 'Lines 12–13: the last copy is to the right',
      body: 'With `find_first=False` we want the **last** copy instead, so line 13 searches right with `low = mid + 1`.\n\nOne flag, two answers.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: { checks: 1, window: 3, result: '—' },
      changes: ['else: low = mid + 1'],
      scene: { entities: scene({ ...base, low: 0, high: 2, ans: 3, note: 'find_first=False\n→ low = mid + 1 (go right)' }) },
    },
    {
      chapter: 'build',
      short: 'Too small',
      title: 'Lines 14–15: a miss moves the window as usual',
      body: 'When the middle isn’t the target, the window moves exactly like plain binary search. If `arr[mid]` is too small, line 15 searches right.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], lines: [14, 15] },
      metrics: { checks: 1, window: 3, result: '—' },
      changes: ['elif arr[mid] < target: low = mid + 1'],
      scene: { entities: scene({ ...base, low: 0, high: 2, ans: 3 }) },
    },
    {
      chapter: 'build',
      short: 'Too big',
      title: 'Lines 16–19: too big, then return ans',
      body: 'Otherwise the middle is too big, so line 17 searches left. When the window is empty, line 19 returns `ans`: the best match, or `-1` if there was none.\n\nNow let’s run it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19], lines: [16, 17, 19] },
      metrics: { checks: 1, window: 3, result: '—' },
      changes: ['else: high = mid - 1', 'return ans'],
      scene: { entities: scene({ ...base, low: 0, high: 2, ans: 3 }) },
    },
    {
      chapter: 'run',
      short: 'Start',
      title: 'Whole array, no answer yet',
      body: 'Line 2: `low = 0`, `high = 7`, so the window is every index. Line 3: `ans = -1`, nothing found yet.\n\nLine 5: `0 <= 7`, so the loop starts.',
      code: { view: 'final', lines: [2, 3, 5] },
      values: { 2: 'low, high = 0, 7', 3: 'ans = -1', 5: '0 <= 7 → True' },
      metrics: { checks: 0, window: 8, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 7, ans: -1 }) },
    },
    {
      chapter: 'run',
      short: 'mid = 3',
      title: 'Look at the middle: arr[3] = 3, a match',
      body: 'Line 6: `mid = 0 + (7 − 0) // 2 = 3`. Line 7: `arr[3] = 3` equals the target.\n\nIt’s a 3, but we can’t tell yet whether it’s the **first** 3.',
      code: { view: 'final', lines: [6, 7] },
      values: { 6: 'mid = 0 + (7 - 0) // 2 = 3', 7: '3 == 3 → True' },
      metrics: { checks: 1, window: 8, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 7, mid: 3, ans: -1 }) },
    },
    {
      chapter: 'run',
      short: 'ans = 3',
      title: 'Record index 3, then look left',
      body: 'Line 8 saves `ans = 3`: the best answer so far. `find_first` is true (line 10), so an earlier 3 can only be left of index 3.\n\nLine 11 moves `high = 2`. The window is indexes 0–2.',
      code: { view: 'final', lines: [8, 10, 11] },
      values: { 8: 'ans = 3', 10: 'find_first → True', 11: 'high = 3 - 1 = 2' },
      metrics: { checks: 1, window: 3, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 2, ans: 3 }) },
    },
    {
      chapter: 'run',
      short: 'mid = 1',
      title: 'Look at the middle: arr[1] = 3, another match',
      body: 'Line 5: `0 <= 2`. Line 6: `mid = 0 + (2 − 0) // 2 = 1`. Line 7: `arr[1]` is also a 3.',
      code: { view: 'final', lines: [5, 6, 7] },
      values: { 5: '0 <= 2 → True', 6: 'mid = 0 + (2 - 0) // 2 = 1', 7: '3 == 3 → True' },
      metrics: { checks: 2, window: 3, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 2, mid: 1, ans: 3 }) },
    },
    {
      chapter: 'run',
      short: 'ans = 1',
      title: 'An earlier copy: ans improves to 1',
      body: 'Line 8 replaces the answer: `ans = 1`, which is earlier than 3. Line 11 keeps looking left: `high = 0`.\n\nOnly index 0 is left to check.',
      code: { view: 'final', lines: [8, 10, 11] },
      values: { 8: 'ans = 1', 10: 'find_first → True', 11: 'high = 1 - 1 = 0' },
      metrics: { checks: 2, window: 1, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 0, ans: 1 }) },
    },
    {
      chapter: 'run',
      short: 'mid = 0',
      title: 'Look at the middle: arr[0] = 1',
      body: 'Line 5: `0 <= 0`. Line 6: `mid = 0`. Line 7: `arr[0] = 1` is not a 3.',
      code: { view: 'final', lines: [5, 6, 7] },
      values: { 5: '0 <= 0 → True', 6: 'mid = 0 + (0 - 0) // 2 = 0', 7: '1 == 3 → False' },
      metrics: { checks: 3, window: 1, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 0, mid: 0, ans: 1 }) },
    },
    {
      chapter: 'run',
      short: 'low → 1',
      title: '1 < 3: nothing to the left is a 3',
      body: 'Line 14: `1 < 3`, so the target is to the right. Line 15 moves `low = 1`.\n\nThis proves there is no 3 before index 1.',
      code: { view: 'final', lines: [14, 15] },
      values: { 14: '1 < 3 → True', 15: 'low = 0 + 1 = 1' },
      metrics: { checks: 3, window: 0, result: '—' },
      scene: { entities: scene({ ...base, low: 1, high: 0, ans: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Return 1',
      title: 'The window is empty: return ans = 1',
      body: 'Line 5: `1 <= 0` is false, so the loop ends. Line 19 returns `ans`: the first 3 is at index **1**.',
      code: { view: 'final', lines: [5, 19] },
      values: { 5: '1 <= 0 → False', 19: 'return 1' },
      metrics: { checks: 3, window: 0, result: 1 },
      scene: { entities: scene({ ...base, low: 1, high: 0, ans: 1 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Still O(log n), even with many copies',
      body: 'Every loop turn halves the window, hit or not, so it takes about `log₂ n` checks: **`O(log n)` time** and `O(1)` space, however many copies there are.\n\nRun it once per flag and `last − first + 1` counts the copies.',
      code: { view: 'final', lines: [5, 8] },
      metrics: { checks: 3, window: 0, result: 1 },
      scene: {
        entities: scene({
          ...base,
          low: 1,
          high: 0,
          ans: 1,
          copies: span(1, 4),
          note: 'first 3  →  index 1\nlast 3   →  index 4\ncount = 4 − 1 + 1 = 4',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Keep going',
      title: 'Why lines 8 and 11 keep searching after a hit',
      body: 'This is the key decision: **record the hit, then keep searching** on one side. Stopping at the hit returns any copy; moving `high = mid − 1` past it is what proves nothing earlier matches.',
      code: { view: 'final', lines: [8, 10, 11] },
      values: { 8: 'remember the hit', 11: 'then look further left' },
      metrics: { checks: 3, window: 0, result: 1 },
      scene: { entities: scene({ ...base, low: 0, high: 2, mid: 3, ans: 3, note: 'stop here → 3 ✗\nkeep going left → 1 ✓' }) },
    },
  ],
  trace: {
    title: 'Find a bound in your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (we sort it for you)', kind: 'numbers', default: '1, 3, 3, 3, 3, 5, 8, 9' },
      { name: 'target', label: 'Target', kind: 'number', default: '3' },
      { name: 'find_first', label: 'find_first (1 = first, 0 = last)', kind: 'number', default: '0' },
    ],
    presets: [
      { label: 'First of many', values: { arr: '2, 4, 4, 4, 4, 4, 7', target: '4', find_first: '1' } },
      { label: 'Last of many', values: { arr: '2, 4, 4, 4, 4, 4, 7', target: '4', find_first: '0' } },
      { label: 'Missing', values: { arr: '1, 3, 5, 7, 9', target: '4', find_first: '1' } },
      { label: 'All equal', values: { arr: '6, 6, 6, 6, 6', target: '6', find_first: '0' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      const flag = values['find_first'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      return traceBounds(input, target, typeof flag !== 'number' || flag !== 0);
    },
  },
});
