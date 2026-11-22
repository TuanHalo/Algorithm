import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface ProbeState {
  readonly values: readonly number[];
  readonly target: number;
  readonly low: number;
  readonly high: number;
  readonly pos?: number;
  readonly found?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces `low`/`high`, show only the array and target. */
  readonly bare?: boolean;
}

/** Scene for one moment of the search: window band, low/high, the estimated `pos` and the variables. */
function scene(s: ProbeState): Entity[] {
  const last = s.values.length - 1;
  const cellTones: Record<number, Tone> = {};
  if (!s.bare) {
    s.values.forEach((_, i) => {
      if (i < s.low || i > s.high) cellTones[i] = 'muted';
    });
  }
  if (s.pos !== undefined) cellTones[s.pos] = s.found === s.pos ? 'found' : 'compare';

  const entities: Entity[] = [arr('arr', 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (!s.bare) {
    if (s.low <= s.high) entities.push(range('window', 'arr', s.low, s.high, s.found === undefined ? 'compare' : 'found'));
    if (s.low >= 0 && s.low <= last) entities.push(ptr('low', 'arr', s.low, 'low', { tone: 'done', codeVar: 'low' }));
    if (s.high >= 0 && s.high <= last) entities.push(ptr('high', 'arr', s.high, 'high', { tone: 'done', codeVar: 'high' }));
  }
  if (s.pos !== undefined) entities.push(ptr('pos', 'arr', s.pos, 'pos', { side: 'top', tone: s.found === s.pos ? 'found' : 'active', codeVar: 'pos' }));

  const posValue = s.pos === undefined ? undefined : s.values[s.pos];
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
            { name: 'pos', value: s.pos ?? '—', tone: s.pos === undefined ? 'muted' : 'default' },
            {
              name: 'arr[pos]',
              value: posValue ?? '—',
              tone: posValue === undefined ? 'muted' : posValue === s.target ? 'found' : 'compare',
            },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs interpolation search on any input and records one step per probe (chapter "run", final code). */
function traceInterpolation(input: readonly number[], target: number): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const steps: Step[] = [];
  let low = 0;
  let high = values.length - 1;
  let probes = 0;
  const at = (i: number): number => values[i] ?? 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ probes, window: Math.max(0, high - low + 1), result });

  const sortedNote = wasSorted ? '' : 'Interpolation search needs sorted input, so the numbers were sorted first.\n\n';
  let first = true;
  if (!(low <= high && at(low) <= target && target <= at(high))) {
    // The range test fails straight away: say where the window came from before the "not found" step.
    steps.push({
      chapter: 'run',
      short: 'Start',
      title: `Search for ${target} in ${values.length} sorted numbers`,
      body: `${sortedNote}Line 2 makes the window the whole array: \`low = 0\`, \`high = ${high}\`.`,
      code: { view: 'final', lines: [2] },
      values: { 2: `low, high = 0, ${high}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high }) },
    });
  }

  while (low <= high && at(low) <= target && target <= at(high)) {
    const equalEnds = at(low) === at(high);
    const rangeValues = {
      4: `${low} <= ${high} and ${at(low)} <= ${target} <= ${at(high)} → True`,
      5: `${at(low)} == ${at(high)} → ${equalEnds ? 'True' : 'False'}`,
    };
    // One step for the loop test (line 4) and the zero-span guard (line 5).
    steps.push({
      chapter: 'run',
      short: first ? 'Start' : 'Check range',
      title: first ? `Search for ${target} in ${values.length} sorted numbers` : `Still in range: ${at(low)} ≤ ${target} ≤ ${at(high)}`,
      body: `${first ? `${sortedNote}Line 2: the window is indexes 0–${high}. ` : ''}Line 4: the window ${low}–${high} isn’t empty and ${target} lies between \`arr[${low}] = ${at(low)}\` and \`arr[${high}] = ${at(high)}\`, so it could be inside. Line 5: ${equalEnds ? 'both ends hold the same value.' : 'the ends differ, so there is a span to divide by.'}`,
      code: { view: 'final', lines: first ? [2, 4, 5] : [4, 5] },
      values: first ? { 2: `low, high = 0, ${high}`, ...rangeValues } : rangeValues,
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high }) },
    });
    first = false;
    if (equalEnds) {
      const result = at(low) === target ? low : -1;
      steps.push({
        chapter: 'run',
        short: 'All equal',
        title: `No span to divide by: return ${result}`,
        body: `Every value in the window is ${at(low)}, so line 9’s span would be 0 and line 10 would divide by zero. Line 7 answers directly: **${result}**.`,
        code: { view: 'final', lines: [7] },
        values: { 7: `return ${result}` },
        metrics: metrics(result),
        scene: { entities: scene({ values, target, low, high, pos: low, found: result >= 0 ? low : undefined }) },
      });
      return steps;
    }
    const spanValue = at(high) - at(low);
    const above = target - at(low);
    const pos = low + Math.floor((above * (high - low)) / spanValue);
    const value = at(pos);
    probes += 1;
    steps.push({
      chapter: 'run',
      short: 'Estimate',
      title: `Estimate the position: pos = ${pos}`,
      body: `Line 9: the values span \`${at(high)} − ${at(low)} = ${spanValue}\`. Line 10: ${target} is ${above} above \`arr[low]\`, so \`pos = ${low} + (${above} × ${high - low}) // ${spanValue} = ${pos}\`.`,
      code: { view: 'final', lines: [9, 10] },
      values: { 9: `span = ${at(high)} - ${at(low)} = ${spanValue}`, 10: `pos = ${low} + (${above} * ${high - low}) // ${spanValue} = ${pos}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high, pos }) },
    });
    if (value === target) {
      steps.push({
        chapter: 'run',
        short: 'Compare',
        title: `arr[${pos}] = ${value}: a direct hit`,
        body: `Line 12: the probe holds the target.`,
        code: { view: 'final', lines: [12] },
        values: { 12: `${value} == ${target} → True` },
        metrics: metrics(),
        scene: { entities: scene({ values, target, low, high, pos, found: pos }) },
      });
      steps.push({
        chapter: 'run',
        short: `Return ${pos}`,
        title: `Found it: return ${pos}`,
        body: `Line 13 returns **${pos}** after ${probes} probe${probes === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [13] },
        values: { 13: `return ${pos}` },
        metrics: metrics(pos),
        scene: { entities: scene({ values, target, low, high, pos, found: pos }) },
      });
      return steps;
    }
    const goRight = value < target;
    steps.push({
      chapter: 'run',
      short: 'Compare',
      title: `arr[${pos}] = ${value}: too ${goRight ? 'small' : 'big'}`,
      body: `Line 12: \`${value}\` isn’t ${target}. Line 14: \`${value} < ${target}\` is ${goRight ? 'true, so the target is to the right of the probe' : 'false, so the target is to the left of the probe'}.`,
      code: { view: 'final', lines: [12, 14] },
      values: { 12: `${value} == ${target} → False`, 14: `${value} < ${target} → ${goRight ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high, pos }) },
    });
    if (goRight) low = pos + 1;
    else high = pos - 1;
    steps.push({
      chapter: 'run',
      short: goRight ? `low → ${low}` : `high → ${high}`,
      title: goRight ? 'Move low past the probe' : 'Move high before the probe',
      body: goRight
        ? `Line 15: \`low = ${pos} + 1 = ${low}\`. Indexes up to ${pos} are out; ${low <= high ? `the window is now ${low}–${high}` : 'nothing is left'}.`
        : `Line 17: \`high = ${pos} − 1 = ${high}\`. Indexes from ${pos} on are out; ${low <= high ? `the window is now ${low}–${high}` : 'nothing is left'}.`,
      code: { view: 'final', lines: goRight ? [15] : [16, 17] },
      values: goRight ? { 15: `low = ${pos} + 1 = ${low}` } : { 17: `high = ${pos} - 1 = ${high}` },
      metrics: metrics(),
      scene: { entities: scene({ values, target, low, high }) },
    });
  }

  const outOfRange = low <= high;
  steps.push({
    chapter: 'run',
    short: 'Not found',
    title: outOfRange ? `${target} is outside arr[low]…arr[high]` : `low (${low}) > high (${high}): the window is empty`,
    body: outOfRange
      ? `Line 4’s range test fails: ${target} isn’t between \`arr[${low}] = ${at(low)}\` and \`arr[${high}] = ${at(high)}\`, so it can’t be here. Line 19 returns **-1**.`
      : `Line 4’s condition fails, so the loop ends and line 19 returns **-1**.`,
    code: { view: 'final', lines: [4, 19] },
    values: { 4: outOfRange ? `${at(low)} <= ${target} <= ${at(high)} → False` : `${low} <= ${high} → False`, 19: 'return -1' },
    metrics: metrics(-1),
    scene: { entities: scene({ values, target, low, high, note: outOfRange ? 'target outside the window’s values\n→ return -1' : 'low > high → return -1', noteTone: 'miss' }) },
  });
  return steps;
}

const ARR = [2, 9, 15, 21, 30, 34, 41, 50, 55, 63] as const;
const TARGET = 41;
const base = { values: ARR, target: TARGET } as const;

export default defineWalkthrough({
  id: 'learn/searching/interpolation-search',
  title: 'Interpolation Search, guessing by value',
  summary: 'From the idea to the code: estimate where the target sits from the values themselves, and find 41 in 2 probes where binary search needs 4.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def interpolation_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1

    while low <= high and arr[low] <= target <= arr[high]:
        if arr[low] == arr[high]:
            # Avoid zero-division when all remaining values are equal
            return low if arr[low] == target else -1

        span = arr[high] - arr[low]
        pos = low + ((target - arr[low]) * (high - low)) // span

        if arr[pos] == target:
            return pos
        if arr[pos] < target:
            low = pos + 1
        else:
            high = pos - 1

    return -1`,
  },
  metrics: [
    { key: 'probes', label: 'Probes' },
    { key: 'window', label: 'Window size' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'search window / probe' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'found' },
  ],
  goals: [
    { text: 'Guess the position from the values', step: 2 },
    { text: 'See where the position formula comes from', step: 3 },
    { text: 'Guard against dividing by zero', step: 9 },
    { text: 'See why line 4 checks the target’s range', step: 19 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find 41 in evenly spread numbers',
      body: 'To look up “Zebra” in a dictionary, you don’t open the middle: you flip straight to the back.\n\nLine 1 takes a sorted `arr` whose values are spread fairly evenly, plus a `target`, and returns the target’s index or `-1`.',
      code: { view: 'signature', lines: [1] },
      metrics: { probes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Guess',
      title: 'Guess the position from the values',
      body: '41 is about two-thirds of the way from 2 to 63, so on evenly spread values it should sit about two-thirds of the way along the array.\n\nProbing there, instead of the middle, can land on the target in one or two tries.',
      code: { view: 'signature' },
      metrics: { probes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, pos: 5, bare: true, note: '41 is 64% of the way from 2 to 63\n→ look 64% of the way along' }) },
    },
    {
      chapter: 'idea',
      short: 'The formula',
      title: 'Where the position formula comes from',
      body: 'Pretend the values climb by the same amount `d` at every index. Then `d` is the total climb over the number of steps, `(arr[high] − arr[low]) / (high − low)`, here `61 / 9 ≈ 6.8` per index.\n\nThe target is `target − arr[low] = 39` above the start, so it should be `39 / 6.8 ≈ 5.75` steps after `low`. That is the whole formula: `pos = low + (target − arr[low]) / d`.',
      code: { view: 'signature' },
      metrics: { probes: 0, window: 10, result: '—' },
      scene: {
        entities: scene({
          ...base,
          low: 0,
          high: 9,
          pos: 5,
          bare: true,
          note: 'd = (63 − 2) / (9 − 0) ≈ 6.8\n(41 − 2) / 6.8 ≈ 5.75 steps\npos = 0 + 5.75 → index 5',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Window',
      title: 'Lines 2–4: a window that can hold the target',
      body: 'Line 2 starts with the whole array. Line 4 loops while the window is non-empty **and** the target lies between `arr[low]` and `arr[high]`; outside that range it can’t be in the window.',
      code: { view: 'reveal', reveal: [1, 2, 4], lines: [2, 4] },
      metrics: { probes: 0, window: 10, result: '—' },
      changes: ['low, high = 0, len(arr) - 1', 'while low <= high and arr[low] <= target <= arr[high]'],
      scene: { entities: scene({ ...base, low: 0, high: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Estimate',
      title: 'Lines 9–10: turn the guess into an index',
      body: 'Line 9 measures the value span, `63 − 2 = 61`. Line 10 is the formula from before, with `d` written out: `0 + (39 × 9) // 61 = 5`.\n\nIt multiplies before dividing, so the integer division `//` only drops the fraction at the very end.',
      code: { view: 'reveal', reveal: [1, 2, 4, 9, 10], lines: [9, 10] },
      metrics: { probes: 1, window: 10, result: '—' },
      changes: ['span = arr[high] - arr[low]', 'pos = low + ((target - arr[low]) * (high - low)) // span'],
      scene: { entities: scene({ ...base, low: 0, high: 9, pos: 5 }) },
    },
    {
      chapter: 'build',
      short: 'Found?',
      title: 'Lines 12–13: stop on a hit',
      body: 'If the probe holds the target, line 13 returns it. Here `arr[5] = 34`, not 41.',
      code: { view: 'reveal', reveal: [1, 2, 4, 9, 10, 12, 13], lines: [12, 13] },
      metrics: { probes: 1, window: 10, result: '—' },
      changes: ['if arr[pos] == target: return pos'],
      scene: { entities: scene({ ...base, low: 0, high: 9, pos: 5 }) },
    },
    {
      chapter: 'build',
      short: 'Too small',
      title: 'Lines 14–15: the guess fell short',
      body: '`34 < 41`, so the target is right of the probe. Line 15 moves `low = pos + 1 = 6`.',
      code: { view: 'reveal', reveal: [1, 2, 4, 9, 10, 12, 13, 14, 15], lines: [14, 15] },
      metrics: { probes: 1, window: 4, result: '—' },
      changes: ['low = pos + 1'],
      scene: { entities: scene({ ...base, low: 6, high: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Too big',
      title: 'Lines 16–19: overshoot, or give up',
      body: 'The mirror case moves `high = pos − 1` (line 17). When the loop ends without a hit, line 19 returns `-1`.',
      code: { view: 'reveal', reveal: [1, 2, 4, 9, 10, 12, 13, 14, 15, 16, 17, 19], lines: [16, 17, 19] },
      metrics: { probes: 1, window: 4, result: '—' },
      changes: ['else: high = pos - 1', 'return -1'],
      scene: { entities: scene({ ...base, low: 6, high: 9 }) },
    },
    {
      chapter: 'build',
      short: 'Equal ends',
      title: 'Lines 5–7: no span, no division',
      body: 'One guard is left. If `arr[low] == arr[high]`, the span on line 9 would be 0 and line 10 would divide by zero, so lines 5–7 answer directly.\n\nNow let’s run it.',
      code: { view: 'final', lines: [5, 6, 7] },
      metrics: { probes: 1, window: 4, result: '—' },
      changes: ['if arr[low] == arr[high]: return …'],
      scene: { entities: scene({ ...base, low: 6, high: 9, note: 'arr[low] == arr[high]\n→ span = 0, skip the formula' }) },
    },
    {
      chapter: 'run',
      short: 'Start',
      title: 'Whole array: could 41 be here?',
      body: 'Line 2: the window is indexes 0–9. Line 4: it isn’t empty, and 41 lies between `arr[0] = 2` and `arr[9] = 63`, so it could be inside.\n\nLine 5: `2 ≠ 63`, so there is a span to divide by.',
      code: { view: 'final', lines: [2, 4, 5] },
      values: { 2: 'low, high = 0, 9', 4: '0 <= 9 and 2 <= 41 <= 63 → True', 5: '2 == 63 → False' },
      metrics: { probes: 0, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9 }) },
    },
    {
      chapter: 'run',
      short: 'Estimate',
      title: 'Estimate the position: pos = 5',
      body: 'Line 9: the values span `63 − 2 = 61`. Line 10: 41 is `41 − 2 = 39` above `arr[low]`, so `pos = 0 + (39 × 9) // 61 = 351 // 61 = 5`.',
      code: { view: 'final', lines: [9, 10] },
      values: { 9: 'span = 63 - 2 = 61', 10: 'pos = 0 + (39 * 9) // 61 = 5' },
      metrics: { probes: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, pos: 5 }) },
    },
    {
      chapter: 'run',
      short: 'Compare',
      title: 'arr[5] = 34: a little short',
      body: 'Line 12: `arr[5] = 34` isn’t 41. Line 14: `34 < 41`, so the target is to the right of the probe.\n\nThe guess fell short because these values aren’t perfectly evenly spaced.',
      code: { view: 'final', lines: [12, 14] },
      values: { 12: '34 == 41 → False', 14: '34 < 41 → True' },
      metrics: { probes: 1, window: 10, result: '—' },
      scene: { entities: scene({ ...base, low: 0, high: 9, pos: 5 }) },
    },
    {
      chapter: 'run',
      short: 'low → 6',
      title: 'Move low past the probe',
      body: 'Line 15: `low = pos + 1 = 6`. Indexes 0–5 hold values ≤ 34, so they’re out. The window is now indexes 6–9, values 41…63.',
      code: { view: 'final', lines: [15] },
      values: { 15: 'low = 5 + 1 = 6' },
      metrics: { probes: 1, window: 4, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 9 }) },
    },
    {
      chapter: 'run',
      short: 'Check range',
      title: 'Still in range: 41 ≤ 41 ≤ 63',
      body: 'Back at line 4: the window 6–9 isn’t empty, and 41 lies between `arr[6] = 41` and `arr[9] = 63`. Line 5: `41 ≠ 63`, so we estimate again.',
      code: { view: 'final', lines: [4, 5] },
      values: { 4: '6 <= 9 and 41 <= 41 <= 63 → True', 5: '41 == 63 → False' },
      metrics: { probes: 1, window: 4, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 9 }) },
    },
    {
      chapter: 'run',
      short: 'Estimate',
      title: 'Estimate again: pos = 6',
      body: 'Line 9: `span = 63 − 41 = 22`. Line 10: the target equals `arr[low]`, so it is `0` above the start and `pos = 6 + (0 × 3) // 22 = 6`.',
      code: { view: 'final', lines: [9, 10] },
      values: { 9: 'span = 63 - 41 = 22', 10: 'pos = 6 + (0 * 3) // 22 = 6' },
      metrics: { probes: 2, window: 4, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 9, pos: 6 }) },
    },
    {
      chapter: 'run',
      short: 'Compare',
      title: 'arr[6] = 41: a direct hit',
      body: 'Line 12: `arr[6] = 41` equals the target.',
      code: { view: 'final', lines: [12] },
      values: { 12: '41 == 41 → True' },
      metrics: { probes: 2, window: 4, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 9, pos: 6, found: 6 }) },
    },
    {
      chapter: 'run',
      short: 'Return 6',
      title: 'Found it: return 6',
      body: 'Line 13 returns **6**.\n\nTwo probes; binary search would need four.',
      code: { view: 'final', lines: [13] },
      values: { 13: 'return 6' },
      metrics: { probes: 2, window: 4, result: 6 },
      scene: { entities: scene({ ...base, low: 6, high: 9, pos: 6, found: 6 }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Fast on even data, slow on skewed data',
      body: 'On evenly spread values each probe shrinks the window from about `n` to `√n` items, so it takes **`O(log log n)`** probes with `O(1)` space.\n\nOn skewed values the guess keeps landing near one end and it degrades to `O(n)`.',
      code: { view: 'final', lines: [10] },
      metrics: { probes: 2, window: 4, result: 6 },
      scene: {
        entities: scene({
          ...base,
          low: 6,
          high: 9,
          pos: 6,
          found: 6,
          note: 'evenly spread  →  O(log log n)\nskewed         →  O(n)\nspace          →  O(1)',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Range check',
      title: 'Why line 4 checks arr[low] <= target <= arr[high]',
      body: 'Search for `99` instead. Without the range test, line 10 would compute `pos = 0 + (97 × 9) // 61 = 14`, past the end of the array.\n\nWith it, the loop never starts and line 19 safely returns `-1`. That test keeps every estimate inside the window.',
      code: { view: 'final', lines: [4, 19] },
      values: { 4: '2 <= 99 <= 63 → False', 19: 'return -1' },
      metrics: { probes: 0, window: 10, result: -1 },
      scene: { entities: scene({ values: ARR, target: 99, low: 0, high: 9, note: 'without the range test:\npos = 14 → IndexError', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Run interpolation search on your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (we sort it for you)', kind: 'numbers', default: '2, 9, 15, 21, 30, 34, 41, 50, 55, 63' },
      { name: 'target', label: 'Target', kind: 'number', default: '55' },
    ],
    presets: [
      { label: 'Evenly spaced', values: { arr: '10, 20, 30, 40, 50, 60, 70, 80, 90, 100', target: '70' } },
      { label: 'Skewed', values: { arr: '1, 2, 3, 4, 5, 6, 7, 8, 9, 100', target: '9' } },
      { label: 'Missing', values: { arr: '5, 10, 15, 20, 25', target: '12' } },
      { label: 'All equal', values: { arr: '7, 7, 7, 7', target: '7' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      if (input.length === 0) throw new Error('Enter at least one number.');
      return traceInterpolation(input, target);
    },
  },
});
