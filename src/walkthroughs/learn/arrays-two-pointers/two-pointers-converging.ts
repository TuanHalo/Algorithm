import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface ConvergeState {
  readonly values: readonly number[];
  readonly target: number;
  readonly left: number;
  readonly right: number;
  /** The pair at left / right has been summed. */
  readonly sum?: number;
  /** How the sum compared with the target: too small, too big, or a match. */
  readonly verdict?: 'small' | 'big' | 'match';
  /** Index just ruled out by the last move. */
  readonly dropped?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces `left` / `right`, show only the array and target. */
  readonly bare?: boolean;
}

/** Scene for one moment: window band, both pointers, the summed pair and the variables. */
function scene(s: ConvergeState): Entity[] {
  const last = s.values.length - 1;
  const open = s.left < s.right;
  const cellTones: Record<number, Tone> = {};
  if (!s.bare) {
    s.values.forEach((_, i) => {
      if (i < s.left || i > s.right) cellTones[i] = 'muted';
    });
  }
  const paired = s.sum !== undefined;
  if (paired) {
    const tone: Tone = s.verdict === 'match' ? 'found' : 'compare';
    cellTones[s.left] = tone;
    cellTones[s.right] = tone;
  }

  const entities: Entity[] = [arr('numbers', 0, 0, s.values, { label: 'numbers', tones: cellTones, codeVar: 'numbers' })];
  if (!s.bare) {
    if (open || s.verdict === 'match') entities.push(range('window', 'numbers', s.left, s.right, s.verdict === 'match' ? 'found' : 'compare'));
    if (s.left >= 0 && s.left <= last) entities.push(ptr('left', 'numbers', s.left, 'left', { tone: 'done', codeVar: 'left' }));
    if (s.right >= 0 && s.right <= last && s.right !== s.left) entities.push(ptr('right', 'numbers', s.right, 'right', { tone: 'done', codeVar: 'right' }));
  }
  if (paired) {
    const a = s.values[s.left] ?? 0;
    const b = s.values[s.right] ?? 0;
    const match = s.verdict === 'match';
    const failed = s.verdict === 'small' || s.verdict === 'big';
    entities.push(
      link('pair', { entity: 'numbers', index: s.left, side: 'top' }, { entity: 'numbers', index: s.right, side: 'top' }, {
        label: `${a} + ${b} = ${s.sum}`,
        tone: match ? 'found' : failed ? 'miss' : 'compare',
        dashed: failed,
        flow: match,
      }),
    );
  }

  const sumTone: Tone = s.sum === undefined ? 'muted' : s.verdict === 'match' ? 'found' : s.verdict ? 'miss' : 'default';
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      s.bare
        ? [{ name: 'target', value: s.target }]
        : [
            { name: 'target', value: s.target },
            { name: 'left', value: s.left },
            { name: 'right', value: s.right, tone: open ? 'default' : 'miss' },
            { name: 'current_sum', value: s.sum ?? '—', tone: sumTone },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const windowSize = (left: number, right: number): number => Math.max(0, right - left + 1);

/** Runs converging two pointers on any input and records one step per decision (chapter "run", final code). */
function traceConverging(input: readonly number[], target: number): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const steps: Step[] = [];
  let left = 0;
  let right = values.length - 1;
  let sums = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ sums, window: windowSize(left, right), result });
  const base = { values, target } as const;

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Pointers on both ends of ${values.length} sorted numbers`,
    body: `${wasSorted ? '' : 'This needs sorted input, so the numbers were sorted first.\n\n'}Lines 2–3 put \`left = 0\` on the smallest value and \`right = ${right}\` on the biggest. Line 5: \`0 < ${right}\` is ${left < right ? 'true, so the loop starts' : 'false: there is no pair to try'}.`,
    code: { view: 'final', lines: [2, 3, 5] },
    values: { 2: 'left = 0', 3: `right = ${right}`, 5: `0 < ${right} → ${left < right ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, left, right }) },
  });

  let first = true;
  while (left < right) {
    const a = values[left] ?? 0;
    const b = values[right] ?? 0;
    const sum = a + b;
    sums += 1;
    steps.push({
      chapter: 'run',
      short: `${a} + ${b}`,
      title: `Add the two ends: ${a} + ${b} = ${sum}`,
      body: first
        ? `Line 6 adds the values under both pointers: \`numbers[${left}] + numbers[${right}] = ${a} + ${b} = ${sum}\`.`
        : `Line 5: \`${left} < ${right}\`, so there is still a pair to try. Line 6: \`${a} + ${b} = ${sum}\`.`,
      code: { view: 'final', lines: first ? [6] : [5, 6] },
      values: first ? { 6: `current_sum = ${a} + ${b} = ${sum}` } : { 5: `${left} < ${right} → True`, 6: `current_sum = ${a} + ${b} = ${sum}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, left, right, sum }) },
    });
    first = false;

    if (sum === target) {
      steps.push({
        chapter: 'run',
        short: 'Match',
        title: `${sum} == ${target}: this is the pair`,
        body: `Line 7: \`${sum} == ${target}\` is true. The values at indexes ${left} and ${right} add up to the target.`,
        code: { view: 'final', lines: [7] },
        values: { 7: `${sum} == ${target} → True` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, left, right, sum, verdict: 'match' }) },
      });
      steps.push({
        chapter: 'run',
        short: `Return`,
        title: `Return (${left}, ${right})`,
        body: `Line 8 returns **(${left}, ${right})** after ${sums} sum${sums === 1 ? '' : 's'}. Trying every pair would have taken up to ${(values.length * (values.length - 1)) / 2}.`,
        code: { view: 'final', lines: [8] },
        values: { 8: `return ${left}, ${right}` },
        metrics: metrics(`(${left}, ${right})`),
        scene: { entities: scene({ ...base, left, right, sum, verdict: 'match' }) },
      });
      return steps;
    }

    const small = sum < target;
    steps.push({
      chapter: 'run',
      short: small ? 'Too small' : 'Too big',
      title: small ? `${sum} < ${target}: the sum is too small` : `${sum} > ${target}: the sum is too big`,
      body: small
        ? `Line 7: \`${sum} == ${target}\` is false. Line 9: \`${sum} < ${target}\` is true.\n\n\`${a}\` is already paired with the **biggest** value left, ${b}. Every other partner is smaller, so ${a} can never reach ${target}.`
        : `Line 7: \`${sum} == ${target}\` is false, and line 9: \`${sum} < ${target}\` is false too.\n\n\`${b}\` is already paired with the **smallest** value left, ${a}. Every other partner is bigger, so ${b} always overshoots ${target}.`,
      code: { view: 'final', lines: [7, 9] },
      values: { 7: `${sum} == ${target} → False`, 9: `${sum} < ${target} → ${small ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, left, right, sum, verdict: small ? 'small' : 'big' }) },
    });

    if (small) {
      const dropped = left;
      left += 1;
      steps.push({
        chapter: 'run',
        short: `left → ${left}`,
        title: `Drop ${a}: move left to index ${left}`,
        body: `Line 10: \`left += 1\`, so \`left = ${left}\`. The value ${a} is ruled out without trying its other ${right - dropped - 1} pair${right - dropped - 1 === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [10] },
        values: { 10: `left = ${left}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, left, right, dropped }) },
      });
    } else {
      const dropped = right;
      right -= 1;
      steps.push({
        chapter: 'run',
        short: `right → ${right}`,
        title: `Drop ${b}: move right to index ${right}`,
        body: `Line 12: \`right -= 1\`, so \`right = ${right}\`. The value ${b} is ruled out without trying its other ${dropped - left - 1} pair${dropped - left - 1 === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [11, 12] },
        values: { 12: `right = ${right}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, left, right, dropped }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'No pair',
    title: values.length < 2 ? 'Fewer than two numbers: no pair' : `left (${left}) meets right (${right}): no pair`,
    body: `Line 5: \`${left} < ${right}\` is false, so there is no pair left to try. Line 14 returns **None**${sums > 0 ? ` after ${sums} sum${sums === 1 ? '' : 's'}` : ''}.`,
    code: { view: 'final', lines: [5, 14] },
    values: { 5: `${left} < ${right} → False`, 14: 'return None' },
    metrics: metrics('None'),
    scene: { entities: scene({ ...base, left, right, note: 'left met right → no pair\nreturn None', noteTone: 'miss' }) },
  });
  return steps;
}

const NUMBERS = [1, 3, 4, 6, 8, 11] as const;
const TARGET = 10;
const base = { values: NUMBERS, target: TARGET } as const;
const RUN = traceConverging(NUMBERS, TARGET);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { sums: 0, window: 6, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/two-pointers-converging',
  title: 'Converging Two Pointers, closing in from both ends',
  summary: 'From the idea to the code: find two numbers that add up to a target in a sorted array by moving one end inward at a time.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def two_sum_sorted(numbers: list[int], target: int) -> tuple[int, int] | None:
    left = 0
    right = len(numbers) - 1

    while left < right:
        current_sum = numbers[left] + numbers[right]
        if current_sum == target:
            return left, right
        elif current_sum < target:
            left += 1  # numbers[left] is too small for any partner left
        else:
            right -= 1  # numbers[right] is too big for any partner left

    return None`,
  },
  snapshots: {
    brute: `def two_sum_sorted(numbers: list[int], target: int) -> tuple[int, int] | None:
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] + numbers[j] == target:
                return i, j
    return None`,
  },
  metrics: [
    { key: 'sums', label: 'Sums tried' },
    { key: 'window', label: 'Values left' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'pair being added / still in play' },
    { tone: 'miss', label: 'sum too small or too big' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'the pair' },
  ],
  goals: [
    { text: 'See why one sum can rule out a whole value', step: 3 },
    { text: 'Build the loop that moves one end at a time', step: 5 },
    { text: 'Follow every sum, comparison and move', step: 10 },
    { text: 'Know why dropping that value is always safe', step: 27 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find two numbers that add up to 10',
      body: 'Two friends start at opposite ends of a hallway of sorted room numbers and walk toward each other until their rooms add up to the target.\n\nLine 1 gets a **sorted** list `numbers` and a `target`, and returns the indexes of two values that add up to it, or `None`. Here: which two of `[1, 3, 4, 6, 8, 11]` make 10?',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, left: 0, right: 5, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Brute force',
      title: 'The obvious way: try every pair',
      body: 'Lines 2–4 pair `1` with every value after it, then `3` with every value after it, and so on.\n\nFor 6 numbers that’s **15 pairs**; for 100,000 numbers it’s about **5 billion**. That’s `O(n²)`, and it ignores that the list is sorted.',
      code: { view: 'snapshot', id: 'brute', lines: [2, 3, 4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('numbers', 0, 0, NUMBERS, { label: 'numbers', tones: { 0: 'active', 1: 'compare', 2: 'compare', 3: 'compare', 4: 'compare', 5: 'compare' }, codeVar: 'numbers' }),
          ...[1, 2, 3, 4, 5].map((j) =>
            link(`try-${j}`, { entity: 'numbers', index: 0, side: 'top' }, { entity: 'numbers', index: j, side: 'top' }, { tone: 'compare', dashed: true }),
          ),
          vars('vals', 0, VARS_Y, [{ name: 'target', value: TARGET }], { label: 'variables', width: 180 }),
          note('note', NOTE_X, VARS_Y, 'Pairs to check: 5 + 4 + 3 + 2 + 1 = 15\nn·(n−1)/2  →  O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Both ends',
      title: 'One sum of the two ends rules out a whole value',
      body: 'Add the smallest and the biggest: `1 + 11 = 12`, too big. And 1 is the **smallest** partner 11 has, so 11 plus anything else is even bigger. 11 is out, after one sum.\n\nIf the sum were too small, the same logic would rule out the smallest value. Each sum drops one value: `n − 1` sums at most.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({ ...base, left: 0, right: 5, bare: true, sum: 12, verdict: 'big', note: 'too big → drop the biggest\ntoo small → drop the smallest' }),
      },
    },
    {
      chapter: 'build',
      short: 'Pointers',
      title: 'Lines 2–3: a pointer on each end',
      body: '`left` starts on the smallest value and `right` on the biggest. Everything between them, including both ends, is still in play.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['left = 0', 'right = len(numbers) - 1'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Add ends',
      title: 'Lines 5–6: add the two ends while they haven’t met',
      body: 'Line 5 keeps going while `left < right`, so there are two different values to pair. Line 6 adds them into `current_sum`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [5, 6] },
      metrics: { ...startMetrics, sums: 1 },
      changes: ['while left < right', 'current_sum = numbers[left] + numbers[right]'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Match',
      title: 'Lines 7–8: stop when the sum is the target',
      body: 'If `current_sum == target`, line 8 returns the two indexes straight away.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8], lines: [7, 8] },
      metrics: { ...startMetrics, sums: 1 },
      changes: ['if current_sum == target: return left, right'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Too small',
      title: 'Lines 9–10: too small, so drop the left value',
      body: 'If the sum is too small, `numbers[left]` is already paired with the biggest value left and still falls short. No partner can save it, so line 10 moves `left` one step right.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10], lines: [9, 10] },
      metrics: { ...startMetrics, sums: 1 },
      changes: ['elif current_sum < target: left += 1'],
      scene: { entities: scene({ ...base, left: 0, right: 4, sum: 9, verdict: 'small' }) },
    },
    {
      chapter: 'build',
      short: 'Too big',
      title: 'Lines 11–12: too big, so drop the right value',
      body: 'The mirror case: `numbers[right]` is already paired with the smallest value left and still overshoots. Line 12 moves `right` one step left.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: { ...startMetrics, sums: 1 },
      changes: ['else: right -= 1'],
      scene: { entities: scene({ ...base, left: 0, right: 5, sum: 12, verdict: 'big' }) },
    },
    {
      chapter: 'build',
      short: 'No pair',
      title: 'Line 14: the pointers met, so there is no pair',
      body: 'Each turn drops one value. When `left` reaches `right`, only one value is left and it can’t pair with itself, so line 14 returns `None`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [5, 14] },
      metrics: startMetrics,
      changes: ['return None'],
      scene: { entities: scene({ ...base, left: 3, right: 3, note: 'left == right: one value left\n→ return None' }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One value out per sum is why it’s O(n)',
      body: 'Every turn of the loop moves `left` or `right` one step inward, so `n` values take at most `n − 1` sums: **`O(n)` time** and `O(1)` extra space.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [5, 10, 12] },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          ...base,
          left: 2,
          right: 3,
          sum: 10,
          verdict: 'match',
          note: 'n = 6         →  ≤ 5 sums\nn = 100,000   →  ≤ 99,999 sums\nall pairs: ≈ 5 billion',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Safe drop',
      title: 'Why line 12 may drop 11 without trying it',
      body: 'In the first turn `1 + 11 = 12` was too big. Every other partner of 11 (3, 4, 6, 8) is **at least 1**, so every pair with 11 is at least 12. None of them can be 10.\n\nThat is the key decision: the sorted order turns one sum into a verdict on a whole value, so moving the pointer never skips the answer.',
      code: { view: 'final', lines: [9, 10, 11, 12] },
      values: { 11: '1 + 11 = 12 > 10', 12: 'skip 11 + 3, + 4, + 6, + 8' },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          arr('numbers', 0, 0, NUMBERS, { label: 'numbers', tones: { 0: 'compare', 1: 'muted', 2: 'muted', 3: 'muted', 4: 'muted', 5: 'miss' }, codeVar: 'numbers' }),
          ptr('left', 'numbers', 0, 'left', { tone: 'done', codeVar: 'left' }),
          ptr('right', 'numbers', 5, 'right', { tone: 'done', codeVar: 'right' }),
          link('pair', { entity: 'numbers', index: 0, side: 'top' }, { entity: 'numbers', index: 5, side: 'top' }, { label: '1 + 11 = 12', tone: 'miss', dashed: true }),
          vars(
            'vals',
            0,
            VARS_Y,
            [
              { name: 'target', value: TARGET },
              { name: 'left', value: 0 },
              { name: 'right', value: 5 },
              { name: 'current_sum', value: 12, tone: 'miss' },
            ],
            { label: 'variables', width: 180 },
          ),
          note('note', NOTE_X, VARS_Y, '11 + 3, 11 + 4, 11 + 6, 11 + 8\nare all ≥ 1 + 11 = 12 > 10\n→ skip all four, safely'),
        ],
      },
    },
  ],
  trace: {
    title: 'Run converging two pointers on your own numbers',
    inputs: [
      { name: 'numbers', label: 'Numbers (we sort them for you)', kind: 'numbers', default: '2, 7, 11, 15' },
      { name: 'target', label: 'Target', kind: 'number', default: '18' },
    ],
    presets: [
      { label: 'No pair', values: { numbers: '1, 2, 4, 7', target: '20' } },
      { label: 'Duplicates', values: { numbers: '3, 3, 4, 5', target: '6' } },
      { label: 'Negatives', values: { numbers: '-5, -2, 0, 3, 9', target: '1' } },
      { label: 'Unsorted input', values: { numbers: '8, 1, 6, 3', target: '7' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['numbers'];
      const target = values['target'];
      if (!Array.isArray(input) || input.length === 0 || typeof target !== 'number') throw new Error('Enter some numbers and a single target.');
      return traceConverging(input, target);
    },
  },
});
