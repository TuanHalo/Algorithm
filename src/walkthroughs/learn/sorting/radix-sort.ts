import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Rows on the floor: arr, the digit each value has at this place, the ten
 * counters, and the output buffer. Variables sit right of the counters.
 */
const DIGITS_Y = 100;
const COUNT_Y = 210;
const OUTPUT_Y = 330;
const VARS_X = tableBesideArray(10, 4);
/** Placeholder for a digit that hasn't been worked out yet. */
const EMPTY = '·';

/** A value plus a stable id, so a value (and its digit) keeps its block as the passes reorder the array. */
interface Item {
  readonly v: number;
  readonly id: number;
  /** Shown instead of `v` (e.g. "21ᵃ" in the stability example). */
  readonly label?: string;
}

const itemsOf = (values: readonly number[]): Item[] => values.map((v, id) => ({ v, id }));
const digitOf = (v: number, exp: number): number => Math.floor(v / exp) % 10;
const PLACES: Readonly<Record<number, string>> = { 1: 'ones', 10: 'tens', 100: 'hundreds', 1000: 'thousands' };
const placeOf = (exp: number): string => PLACES[exp] ?? `${exp}s`;

interface RadixState {
  readonly items: readonly Item[];
  readonly maxVal?: number;
  readonly exp?: number;
  /** Digit row, parallel to items: a digit, or EMPTY when not worked out yet. */
  readonly digits?: readonly ScalarValue[];
  /** The helper's locals; absent outside counting_sort_by_digit. */
  readonly count?: readonly number[];
  readonly output?: readonly ScalarValue[];
  readonly written?: readonly number[];
  /** arr index being processed, and the name of the loop variable pointing at it. */
  readonly cur?: number;
  readonly curName?: 'x' | 'i';
  readonly digit?: number;
  readonly countHit?: readonly number[];
  readonly outHit?: number;
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: arr, each value's digit at this place, the counters, the output buffer, and the variables. */
function scene(s: RadixState): Entity[] {
  const tones: Record<number, Tone> = {};
  if (s.done) s.items.forEach((_, k) => (tones[k] = 'found'));
  if (s.cur !== undefined) tones[s.cur] = 'active';
  const keys = s.items.map((it) => it.id);
  const entities: Entity[] = [
    arr('arr', 0, 0, s.items.map((it): ScalarValue => it.label ?? it.v), { label: 'arr', tones, codeVar: 'arr', itemKeys: keys }),
  ];
  if (s.cur !== undefined && s.curName) {
    entities.push(ptr('cur', 'arr', s.cur, s.curName === 'x' ? 'x' : 'i', { side: 'top', tone: 'active', codeVar: s.curName }));
  }
  if (s.digits) {
    const dt: Record<number, Tone> = {};
    s.digits.forEach((d, k) => (dt[k] = d === EMPTY ? 'muted' : 'default'));
    if (s.cur !== undefined) dt[s.cur] = 'compare';
    entities.push(arr('digits', 0, DIGITS_Y, s.digits, { label: 'digit', showIndex: false, tones: dt, codeVar: 'digit', itemKeys: keys }));
  }
  if (s.count) {
    const ct: Record<number, Tone> = {};
    s.count.forEach((c, k) => (ct[k] = c === 0 ? 'muted' : 'default'));
    for (const k of s.countHit ?? []) ct[k] = 'compare';
    entities.push(arr('count', 0, COUNT_Y, s.count, { label: 'count', tones: ct, codeVar: 'count' }));
  }
  if (s.output) {
    const ot: Record<number, Tone> = {};
    s.output.forEach((_, k) => (ot[k] = (s.written ?? []).includes(k) ? 'done' : 'muted'));
    if (s.outHit !== undefined) ot[s.outHit] = 'active';
    entities.push(arr('output', 0, OUTPUT_Y, s.output, { label: 'output', tones: ot, codeVar: 'output' }));
  }
  const dash = (v: number | undefined): number | string => v ?? '—';
  const tone = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      VARS_X,
      0,
      [
        { name: 'max_val', value: dash(s.maxVal), tone: tone(s.maxVal) },
        { name: 'exp', value: dash(s.exp), tone: tone(s.exp) },
        { name: s.curName ?? 'i', value: dash(s.cur === undefined ? undefined : s.curName === 'x' ? s.items[s.cur]?.v : s.cur), tone: tone(s.cur) },
        { name: 'digit', value: dash(s.digit), tone: tone(s.digit) },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', 0, s.count ? OUTPUT_Y + 110 : COUNT_Y + 20, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.label ?? it.v).join(', ')}]`;
const list = (values: readonly ScalarValue[]): string => `[${values.join(', ')}]`;

interface Emit {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly view: Omit<RadixState, 'items' | 'maxVal'>;
  readonly result?: string;
}

/**
 * Runs radix sort on any input and records every pass in full: each value's
 * digit and counter, the prefix sums, each backwards placement, and the copy back.
 */
function traceRadix(values: readonly number[]): Step[] {
  let items = itemsOf(values);
  const n = items.length;
  const steps: Step[] = [];
  const maxVal = Math.max(...values);
  const digitsInMax = String(maxVal).length;
  let passes = 0;
  const emit = (e: Emit): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { passes, digits: digitsInMax, result: e.result ?? '—' },
      scene: { entities: scene({ items: [...items], maxVal, ...e.view }) },
    });
  };

  emit({
    short: 'Start',
    title: `The largest value is ${maxVal}`,
    body: `Line 3: the list isn’t empty. Line 7: \`max_val = ${maxVal}\`, which has ${digitsInMax} digit${digitsInMax === 1 ? '' : 's'}, so there will be ${digitsInMax} pass${digitsInMax === 1 ? '' : 'es'}: one per digit place.`,
    lines: [3, 7],
    values: { 3: 'not arr → False', 7: `max_val = ${maxVal}` },
    view: {},
  });

  let exp = 1;
  for (;;) {
    const q = Math.floor(maxVal / exp);
    const more = q > 0;
    const check = exp === 1 ? 'Line 10: `exp = 1`, the ones place.' : `Line 13: \`exp = ${exp}\`, the ${placeOf(exp)} place.`;
    emit({
      short: more ? `exp = ${exp}` : 'Stop',
      title: more ? `Pass ${passes + 1}: the ${placeOf(exp)} digit` : `${maxVal} has no ${placeOf(exp)} digit: stop`,
      body: more
        ? `${check} Line 11: \`${maxVal} // ${exp} = ${q}\`, more than 0, so the largest value still has a digit here and we run a pass.`
        : `${check} Line 11: \`${maxVal} // ${exp} = 0\`, so every digit place has been used and the loop ends.`,
      lines: exp === 1 ? [10, 11] : [11, 13],
      values: exp === 1 ? { 10: 'exp = 1', 11: `${maxVal} // 1 = ${q} > 0 → True` } : { 13: `exp = ${exp}`, 11: `${maxVal} // ${exp} = ${q} > 0 → ${more ? 'True' : 'False'}` },
      view: { exp },
    });
    if (!more) break;

    // counting_sort_by_digit(arr, exp), line by line.
    const count = Array.from({ length: 10 }, () => 0);
    const output: (Item | undefined)[] = Array.from({ length: n }, () => undefined);
    const digits: ScalarValue[] = items.map(() => EMPTY);
    const outView = (): ScalarValue[] => output.map((it) => (it ? (it.label ?? it.v) : 0));
    const written = (): number[] => output.flatMap((it, k) => (it ? [k] : []));
    emit({
      short: 'Call helper',
      title: `counting_sort_by_digit(arr, ${exp})`,
      body: `Line 12 calls the helper. Line 20: \`n = ${n}\`. Line 21 makes an \`output\` buffer of ${n} zeros, and line 22 makes 10 counters, one per digit 0–9 (the \`count\` row's indexes are the digits).`,
      lines: [12, 20, 21, 22],
      values: { 12: `counting_sort_by_digit(arr, ${exp})`, 20: `n = ${n}`, 21: `output = ${list(outView())}`, 22: 'count = [0] * 10' },
      view: { exp, digits: [...digits], count: [...count], output: outView() },
    });

    items.forEach((it, k) => {
      const d = digitOf(it.v, exp);
      digits[k] = d;
      count[d] = (count[d] ?? 0) + 1;
      emit({
        short: `Digit of ${it.label ?? it.v}`,
        title: `${it.label ?? it.v} has ${placeOf(exp)} digit ${d}`,
        body: `Line 25: \`x = ${it.v}\`. Line 26 picks out its ${placeOf(exp)} digit: \`${it.v} // ${exp} = ${Math.floor(it.v / exp)}\`${exp === 1 ? ' (dividing by 1 changes nothing)' : ` drops the last ${String(exp).length - 1} digit${exp === 10 ? '' : 's'}`}, and \`% 10\` keeps the last digit left: ${d}. Line 27 adds one to \`count[${d}]\`, now ${count[d]}.`,
        lines: [25, 26, 27],
        values: { 25: `x = ${it.v}`, 26: `digit = (${it.v} // ${exp}) % 10 = ${d}`, 27: `count[${d}] = ${count[d]}` },
        view: { exp, digits: [...digits], count: [...count], output: outView(), cur: k, curName: 'x', digit: d, countHit: [d] },
      });
    });

    const tallies = [...count];
    for (let i = 1; i < 10; i += 1) count[i] = (count[i] ?? 0) + (count[i - 1] ?? 0);
    const ranges = tallies.flatMap((c, d) => {
      if (c === 0) return [];
      const endSlot = (count[d] ?? 0) - 1;
      const startSlot = endSlot - c + 1;
      return [`digit ${d} → slot${c === 1 ? ` ${startSlot}` : `s ${startSlot}–${endSlot}`}`];
    });
    emit({
      short: 'Prefix sums',
      title: 'Counts become end positions',
      body: `Lines 30–31 add each counter to the one before it. Now \`count[d]\` is how many values have a digit ≤ d, which is one past the last output slot for digit d: ${ranges.join(', ')}.`,
      lines: [30, 31],
      values: { 31: `count = ${list(count)}` },
      view: { exp, digits: [...digits], count: [...count], output: outView(), countHit: tallies.flatMap((c, d) => (c > 0 ? [d] : [])) },
    });

    for (let i = n - 1; i >= 0; i -= 1) {
      const it = items[i];
      if (!it) continue;
      const d = digitOf(it.v, exp);
      const pos = (count[d] ?? 1) - 1;
      output[pos] = it;
      count[d] = pos;
      const tie = items.slice(0, i).some((other) => digitOf(other.v, exp) === d);
      emit({
        short: `Place ${it.label ?? it.v}`,
        title: `${it.label ?? it.v} goes to output[${pos}]`,
        body: `Line 34: \`i = ${i}\`, walking from the back. Line 35: its digit is ${d}. Line 36: \`count[${d}] - 1 = ${pos}\`, so ${it.label ?? it.v} goes into \`output[${pos}]\`. Line 37 lowers \`count[${d}]\` to ${pos}${tie ? `, so the next value with digit ${d}, further left in \`arr\`, lands just before it: ties keep their order` : ''}.`,
        lines: [34, 35, 36, 37],
        values: { 34: `i = ${i}`, 35: `digit = ${d}`, 36: `output[${pos}] = ${it.v}`, 37: `count[${d}] = ${pos}` },
        view: { exp, digits: [...digits], count: [...count], output: outView(), written: written(), cur: i, curName: 'i', digit: d, countHit: [d], outHit: pos },
      });
    }

    items = output.filter((it): it is Item => it !== undefined);
    passes += 1;
    emit({
      short: 'Copy back',
      title: `arr by ${placeOf(exp)} digit: ${show(items)}`,
      body: `Lines 40–41 copy \`output\` back into \`arr\`: ${show(items)}. The values are now in order of their ${placeOf(exp)} digit${exp > 1 ? ', and values with the same digit kept the order of the previous pass' : ''}. Line 13 moves on to the next place.`,
      lines: [40, 41],
      values: { 41: `arr = ${show(items)}` },
      view: { exp, digits: items.map((it) => digitOf(it.v, exp)), count: [...count], output: outView(), written: written() },
    });
    exp *= 10;
  }

  emit({
    short: 'Return',
    title: `Sorted: ${show(items)}`,
    body: `Line 15 returns the array after ${passes} pass${passes === 1 ? '' : 'es'}, without ever comparing two values with each other.`,
    lines: [15],
    values: { 15: `return ${show(items)}` },
    view: { exp, done: true },
    result: show(items),
  });
  return steps;
}

// Story input: [42, 15, 7, 32]. 42 and 32 share a ones digit, so the first pass shows a tie.
const INPUT = [42, 15, 7, 32] as const;
const START = itemsOf(INPUT);
const RUN = traceRadix(INPUT);
const RUN_START = 13;
/** Scene and metrics of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Pick<Step, 'scene' | 'metrics'> => ({
  scene: RUN[n]?.scene ?? { entities: [] },
  metrics: RUN[n]?.metrics ?? {},
});
const LAST = RUN.at(-1);
const startMetrics = { passes: 0, digits: 2, result: '—' } as const;

export default defineWalkthrough({
  id: 'learn/sorting/radix-sort',
  title: 'Radix Sort, one digit at a time',
  summary: 'From the idea to the code: sort by the ones digit, then the tens, then the hundreds, using a stable counting sort for each pass.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `def radix_sort(arr: list[int]) -> list[int]:
    """Sorts non-negative integers using LSD Radix Sort."""
    if not arr:
        return arr

    # Find the maximum number to determine number of digits
    max_val = max(arr)

    # Run counting sort for every digit position: 1, 10, 100, ...
    exp = 1
    while max_val // exp > 0:
        counting_sort_by_digit(arr, exp)
        exp *= 10

    return arr


def counting_sort_by_digit(arr: list[int], exp: int) -> None:
    """Stable counting sort subroutine that sorts arr according to digit at (arr[i] // exp) % 10."""
    n = len(arr)
    output = [0] * n
    count = [0] * 10

    # Count occurrences of each digit
    for x in arr:
        digit = (x // exp) % 10
        count[digit] += 1

    # Compute prefix sums so count[i] holds the output index
    for i in range(1, 10):
        count[i] += count[i - 1]

    # Build output array in reverse order to ensure stability
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]
        count[digit] -= 1

    # Copy sorted elements back into original array
    for i in range(n):
        arr[i] = output[i]`,
  },
  metrics: [
    { key: 'passes', label: 'Passes' },
    { key: 'digits', label: 'Digits in max' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'value being handled / slot just written' },
    { tone: 'compare', label: 'its digit and counter' },
    { tone: 'done', label: 'placed in output' },
    { tone: 'muted', label: 'not yet / zero' },
    { tone: 'found', label: 'sorted' },
  ],
  goals: [
    { text: 'Sort by digits, least significant first', step: 2 },
    { text: 'Loop over the digit places with exp', step: 5 },
    { text: 'Pick out one digit with (x // exp) % 10', step: 9 },
    { text: 'Watch every value get split into its digit', step: RUN_START + 4 },
    { text: 'See why each pass must be stable', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [42, 15, 7, 32] by digits',
      body: 'Like sorting library slips by a date code: bin them by the last digit, restack, bin them by the next digit, restack, and so on.\n\nLine 1 takes a list of non-negative integers and sorts it in place.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ items: START }) },
    },
    {
      chapter: 'idea',
      short: 'Digit passes',
      title: 'Sort by the last digit, then the next',
      body: 'Split every value into its digits. Order the values by their ones digit (the row below), then by their tens digit, and so on. Each pass only looks at one digit, 0–9, so it can use counting sort.\n\nBecause every pass keeps ties in the order the previous pass left them, the last pass leaves everything sorted.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          items: START,
          exp: 1,
          digits: START.map((it) => digitOf(it.v, 1)),
          note: 'ones:  2 5 7 2  →  [42, 32, 15, 7]\ntens:  4 3 1 0  →  [7, 15, 32, 42]  sorted',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Empty list',
      title: 'Lines 2–4: nothing to sort',
      body: 'Lines 3–4 return an empty list straight away, because `max([])` would fail on line 7.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['if not arr: return arr'],
      scene: { entities: scene({ items: START }) },
    },
    {
      chapter: 'build',
      short: 'Max value',
      title: 'Lines 6–9: how many digits?',
      body: 'Line 7 finds the largest value: its number of digits is the number of passes needed. Here 42 has 2 digits.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9], lines: [7] },
      changes: ['max_val = max(arr)'],
      ...at(0),
    },
    {
      chapter: 'build',
      short: 'Digit loop',
      title: 'Lines 10–12: one pass per digit place',
      body: '`exp` is the place value: 1 for ones, 10 for tens, 100 for hundreds. Line 11 keeps going while `max_val` still has a digit at that place, and line 12 sorts by it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12], lines: [10, 11, 12] },
      changes: ['exp = 1', 'while max_val // exp > 0', 'counting_sort_by_digit(arr, exp)'],
      ...at(1),
    },
    {
      chapter: 'build',
      short: 'Next place',
      title: 'Lines 13–18: next place, and the helper',
      body: 'Line 13 moves to the next place (`exp *= 10`), and line 15 returns the sorted array. Line 18 starts the helper that sorts by one digit.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18], lines: [13, 15, 18] },
      changes: ['exp *= 10', 'return arr', 'def counting_sort_by_digit(arr, exp)'],
      ...at(13),
    },
    {
      chapter: 'build',
      short: 'Buffers',
      title: 'Lines 19–21: an output buffer',
      body: 'The helper (its docstring is line 19) needs the length (line 20) and an output buffer of the same size (line 21).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21], lines: [20, 21] },
      changes: ['n = len(arr)', 'output = [0] * n'],
      ...at(2),
    },
    {
      chapter: 'build',
      short: 'Counters',
      title: 'Lines 22–25: ten digit counters',
      body: 'A digit is always 0–9, so line 22 needs just 10 counters: `count[d]` counts the values whose digit is `d`. Line 25 visits every value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22, 24, 25], lines: [22, 25] },
      changes: ['count = [0] * 10', 'for x in arr'],
      ...at(2),
    },
    {
      chapter: 'build',
      short: 'Tally',
      title: 'Lines 26–29: pick out the digit and count it',
      body: '`(x // exp) % 10` picks one digit. `// exp` drops the digits to the right of the place, and `% 10` keeps the last digit left: for 42 at `exp = 10`, `42 // 10 = 4` and `4 % 10 = 4`. Line 27 counts it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22, 24, 25, 26, 27, 29], lines: [26, 27] },
      changes: ['digit = (x // exp) % 10', 'count[digit] += 1'],
      ...at(3),
    },
    {
      chapter: 'build',
      short: 'Prefix sums',
      title: 'Lines 30–33: counts become end positions',
      body: 'Exactly as in counting sort, lines 30–31 turn each count into the position just past where that digit’s values end in the output.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22, 24, 25, 26, 27, 29, 30, 31, 33], lines: [30, 31] },
      changes: ['for i in range(1, 10): count[i] += count[i - 1]'],
      ...at(7),
    },
    {
      chapter: 'build',
      short: 'Place',
      title: 'Lines 34–36: place values from the back',
      body: 'Line 34 walks the array backwards (the comment on line 33 says why). Line 36 drops each value into the last free slot for its digit.',
      code: {
        view: 'reveal',
        reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22, 24, 25, 26, 27, 29, 30, 31, 33, 34, 35, 36],
        lines: [34, 35, 36],
      },
      changes: ['for i in range(n - 1, -1, -1)', 'output[count[digit] - 1] = arr[i]'],
      ...at(8),
    },
    {
      chapter: 'build',
      short: 'Copy back',
      title: 'Lines 37–40: step back, then copy over',
      body: 'Line 37 steps that digit’s end marker back one, so the next value with the same digit goes just before. When every value is placed, line 40 starts copying `output` back into `arr`.',
      code: {
        view: 'reveal',
        reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 18, 19, 20, 21, 22, 24, 25, 26, 27, 29, 30, 31, 33, 34, 35, 36, 37, 39, 40],
        lines: [37, 40],
      },
      changes: ['count[digit] -= 1', 'for i in range(n)'],
      ...at(11),
    },
    {
      chapter: 'build',
      short: 'Done',
      title: 'Line 41: arr now holds this pass’s order',
      body: 'Line 41 copies each slot back, so `arr` is ordered by this digit, ready for the next pass.\n\nNow let’s run it, one digit at a time.',
      code: { view: 'final', lines: [41] },
      changes: ['arr[i] = output[i]'],
      ...at(12),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'd passes of O(n + 10)',
      body: 'Each pass is a counting sort over `n` values and 10 digits, and there is one pass per digit of the largest value, `d`: **`O(d · (n + k))` time** with `k = 10`, and `O(n + k)` extra space.\n\nFor fixed-width keys, `d` is a constant, so that is linear.',
      code: { view: 'final', lines: [11, 12] },
      metrics: LAST?.metrics ?? startMetrics,
      scene: { entities: [...(LAST?.scene.entities ?? []), note('note', 0, COUNT_Y + 20, '1,000,000 six-digit IDs:\n6 passes × ~1,000,010 steps', { tone: 'found' })] },
    },
    {
      chapter: 'why',
      short: 'Stable',
      title: 'Why line 34 walks backwards',
      body: 'Take 21 and 25. The ones pass puts 21 first. In the tens pass both have digit 2, a tie, so the order must come from the previous pass.\n\nWalking backwards (line 34) with the end markers keeps ties in their current order: that stability is the key decision that makes the passes add up to a full sort.',
      code: { view: 'final', lines: [34, 36] },
      values: { 34: 'backwards → ties keep their order' },
      metrics: { passes: 2, digits: 2, result: '[21, 25]' },
      scene: {
        entities: scene({
          items: [
            { v: 21, id: 100 },
            { v: 25, id: 101 },
          ],
          exp: 10,
          digits: [2, 2],
          note: 'tens digit: 21 → 2, 25 → 2 (a tie)\nstable    →  [21, 25]  ✓\nunstable  →  [25, 21]  ✗',
        }),
      },
    },
  ],
  trace: {
    title: 'Run radix sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Non-negative whole numbers', kind: 'numbers', default: '170, 45, 75, 90, 2, 24' }],
    presets: [
      { label: 'Two digits', values: { arr: '42, 15, 7, 32' } },
      { label: 'Three digits', values: { arr: '802, 24, 2, 66, 170' } },
      { label: 'Same last digit', values: { arr: '31, 11, 21, 41' } },
      { label: 'Single digits', values: { arr: '5, 3, 9, 1' } },
    ],
    maxItems: 8,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      if (input.some((v) => !Number.isInteger(v) || v < 0 || v > 9999)) throw new Error('Use whole numbers from 0 to 9999.');
      return traceRadix(input);
    },
  },
});
