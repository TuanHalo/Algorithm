import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/**
 * `grow`: line 7 just added nums[right]. `enough` / `short`: line 10's verdict.
 * `record`: line 11 checked the length. `shrink`: lines 12–13 dropped nums[left]. `done`: returned.
 */
type Phase = 'start' | 'grow' | 'enough' | 'short' | 'record' | 'shrink' | 'done';

interface DynState {
  readonly values: readonly number[];
  readonly target: number;
  readonly phase?: Phase;
  readonly left?: number;
  readonly right?: number;
  readonly sum?: number;
  /** Shortest length so far; undefined means Python's float("inf"). */
  readonly minLen?: number;
  /** Where the shortest window starts, to show it when the answer is returned. */
  readonly bestLeft?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces the variables, show only the list and target. */
  readonly bare?: boolean;
  readonly arrayId?: string;
}

/** Scene for one moment: the window band, both edges, the running sum and the best length. */
function scene(s: DynState): Entity[] {
  const id = s.arrayId ?? 'nums';
  const { left, right, phase } = s;
  const tones: Record<number, Tone> = {};
  const entities: Entity[] = [];
  if (left !== undefined) for (let k = 0; k < left; k += 1) tones[k] = 'muted';
  if (phase === 'grow' && right !== undefined) tones[right] = 'active';
  if (phase === 'shrink' && left !== undefined && left > 0) tones[left - 1] = 'active';

  entities.push(arr(id, 0, 0, s.values, { label: 'nums', tones, codeVar: 'nums' }));
  if (phase === 'done' && s.bestLeft !== undefined && s.minLen !== undefined) {
    entities.push(range('window', id, s.bestLeft, s.bestLeft + s.minLen - 1, 'found'));
  } else if (left !== undefined && right !== undefined && left <= right && phase !== 'done') {
    const meets = phase === 'enough' || phase === 'record';
    entities.push(range('window', id, left, right, meets ? 'found' : 'compare'));
  }
  const last = s.values.length - 1;
  if (left !== undefined && left <= last && phase !== 'done') entities.push(ptr('left', id, left, 'left', { tone: 'done', codeVar: 'left' }));
  if (right !== undefined && phase !== 'done') entities.push(ptr('right', id, right, 'right', { side: 'top', tone: 'active', codeVar: 'right' }));

  const inf = (v: number | undefined): number | string => (v === undefined ? 'inf' : v);
  const sumTone: Tone = phase === 'enough' || phase === 'record' ? 'found' : phase === 'short' ? 'miss' : s.sum === undefined ? 'muted' : 'default';
  const rows: VarRow[] = s.bare
    ? [{ name: 'target', value: s.target }]
    : [
        { name: 'target', value: s.target },
        { name: 'left', value: left ?? '—', tone: left === undefined ? 'muted' : 'default' },
        { name: 'right', value: phase === 'done' || right === undefined ? '—' : right, tone: phase === 'done' || right === undefined ? 'muted' : 'default' },
        { name: 'current_sum', value: s.sum ?? '—', tone: sumTone },
        { name: 'min_len', value: inf(s.minLen), tone: phase === 'record' || phase === 'done' ? 'found' : 'default' },
      ];
  entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));

  if (phase === 'grow' && right !== undefined) {
    entities.push(link('add', { entity: id, index: right, side: 'bottom' }, { entity: 'vals', key: 'current_sum' }, { label: `+ ${s.values[right]}`, tone: 'active', flow: true }));
  }
  if (phase === 'shrink' && left !== undefined && left > 0) {
    entities.push(link('drop', { entity: id, index: left - 1, side: 'bottom' }, { entity: 'vals', key: 'current_sum' }, { label: `− ${s.values[left - 1]}`, tone: 'muted', dashed: true }));
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Runs the dynamic window on any input and records one step per decision (chapter "run", final code). */
function traceDynamic(values: readonly number[], target: number): Step[] {
  const steps: Step[] = [];
  let grows = 0;
  let shrinks = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ grows, shrinks, result });
  const base = { values, target } as const;
  let left = 0;
  let sum = 0;
  let minLen: number | undefined;
  let bestLeft: number | undefined;

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: 'An empty window, no answer yet',
    body: 'Line 2: `left = 0`. Line 3: the window is empty, so `current_sum = 0`. Line 4: `min_len = inf`, longer than any real window, so the first one that fits will beat it.',
    code: { view: 'final', lines: [2, 3, 4] },
    values: { 2: 'left = 0', 3: 'current_sum = 0', 4: 'min_len = inf' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, phase: 'start', left, sum, minLen }) },
  });

  for (let right = 0; right < values.length; right += 1) {
    const x = values[right] ?? 0;
    const before = sum;
    sum += x;
    grows += 1;
    steps.push({
      chapter: 'run',
      short: `right = ${right}`,
      title: `Grow: ${x} joins the window`,
      body: `Line 6 moves the right edge to \`right = ${right}\`. Line 7 adds \`nums[${right}] = ${x}\`: \`current_sum = ${before} + ${x} = ${sum}\`.`,
      code: { view: 'final', lines: [6, 7] },
      values: { 6: `right = ${right}`, 7: `current_sum = ${before} + ${x} = ${sum}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, phase: 'grow', left, right, sum, minLen }) },
    });

    let firstCheck = true;
    for (;;) {
      const enough = sum >= target;
      const window = show(values.slice(left, right + 1));
      steps.push({
        chapter: 'run',
        short: enough ? 'Enough' : 'Too small',
        title: enough ? `${window} = ${sum} reaches ${target}` : `${sum} < ${target}: ${firstCheck ? 'keep growing' : 'stop shrinking'}`,
        body: enough
          ? `Line 10: \`${sum} >= ${target}\` is true. This window meets the target, so we note its length and then try to make it shorter.`
          : firstCheck
            ? `Line 10: \`${sum} >= ${target}\` is false. The window is too small, so it has to grow to the right.`
            : `Line 10: \`${sum} >= ${target}\` is false. Dropping that value broke the window, so the shrinking stops here and the window grows again.`,
        code: { view: 'final', lines: [10] },
        values: { 10: `${sum} >= ${target} → ${enough ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, phase: enough ? 'enough' : 'short', left, right, sum, minLen }) },
      });
      firstCheck = false;
      if (!enough) break;

      const length = right - left + 1;
      const old = minLen;
      const better = old === undefined || length < old;
      if (better) {
        minLen = length;
        bestLeft = left;
      }
      steps.push({
        chapter: 'run',
        short: `len = ${length}`,
        title: better ? `Length ${length} is the shortest so far` : `Length ${length} doesn’t beat ${old}`,
        body: better
          ? `Line 11: \`right − left + 1 = ${right} − ${left} + 1 = ${length}\`, and \`min(${old ?? 'inf'}, ${length}) = ${length}\`. \`min_len\` is now ${length}.`
          : `Line 11: \`right − left + 1 = ${length}\`, and \`min(${old}, ${length}) = ${old}\`. \`min_len\` stays ${old}.`,
        code: { view: 'final', lines: [11] },
        values: { 11: `min_len = min(${old ?? 'inf'}, ${length}) = ${minLen}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, phase: 'record', left, right, sum, minLen }) },
      });

      const dropped = values[left] ?? 0;
      const was = sum;
      sum -= dropped;
      left += 1;
      shrinks += 1;
      steps.push({
        chapter: 'run',
        short: `left = ${left}`,
        title: `Shrink: drop ${dropped} from the left`,
        body: `Line 12 takes \`nums[${left - 1}] = ${dropped}\` out: \`current_sum = ${was} − ${dropped} = ${sum}\`. Line 13 moves the left edge to \`left = ${left}\`.`,
        code: { view: 'final', lines: [12, 13] },
        values: { 12: `current_sum = ${was} - ${dropped} = ${sum}`, 13: `left = ${left}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, phase: 'shrink', left, right, sum, minLen }) },
      });
    }
  }

  const result = minLen ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: minLen === undefined ? 'No window reaches the target: return 0' : `Shortest window: length ${minLen}`,
    body:
      minLen === undefined
        ? `The right edge passed the end, and no window ever reached ${target}. Line 15: \`min_len\` is still \`inf\`, so it returns **0**.`
        : `The right edge passed the end, so the loop is over. Line 15 returns **${minLen}**, the window ${show(values.slice(bestLeft ?? 0, (bestLeft ?? 0) + minLen))}. Right moved ${grows} times and left ${shrinks} times.`,
    code: { view: 'final', lines: [15] },
    values: { 15: minLen === undefined ? 'min_len is inf → return 0' : `return ${minLen}` },
    metrics: metrics(result),
    scene: { entities: scene({ ...base, phase: 'done', left, sum, minLen, bestLeft }) },
  });
  return steps;
}

const NUMS = [2, 3, 1, 2, 4, 3] as const;
const TARGET = 7;
const base = { values: NUMS, target: TARGET } as const;
const RUN = traceDynamic(NUMS, TARGET);
const startMetrics = { grows: 0, shrinks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/sliding-window-dynamic',
  title: 'Dynamic Sliding Window, grow then shrink',
  summary: 'From the idea to the code: find the shortest run of neighbours that adds up to at least the target, by growing the window on the right and shrinking it from the left.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def min_sub_array_len(target: int, nums: list[int]) -> int:
    left = 0
    current_sum = 0
    min_len = float("inf")  # No window has reached the target yet

    for right in range(len(nums)):
        current_sum += nums[right]

        # While the window still reaches the target, try a shorter one
        while current_sum >= target:
            min_len = min(min_len, right - left + 1)
            current_sum -= nums[left]
            left += 1

    return int(min_len) if min_len != float("inf") else 0`,
  },
  snapshots: {
    brute: `def min_sub_array_len(target: int, nums: list[int]) -> int:
    best = float("inf")
    for start in range(len(nums)):
        total = 0
        for end in range(start, len(nums)):
            total += nums[end]
            if total >= target:
                best = min(best, end - start + 1)
                break  # Longer windows from this start can't be shorter
    return int(best) if best != float("inf") else 0`,
  },
  metrics: [
    { key: 'grows', label: 'Right moves' },
    { key: 'shrinks', label: 'Left moves' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'current window' },
    { tone: 'active', label: 'value joining / leaving' },
    { tone: 'found', label: 'window reaches the target' },
    { tone: 'miss', label: 'sum too small' },
    { tone: 'muted', label: 'left behind' },
  ],
  goals: [
    { text: 'See why restarting at every index repeats work', step: 2 },
    { text: 'Grow on the right, shrink from the left', step: 3 },
    { text: 'Follow every grow, check, record and shrink', step: BUILD_END + 1 },
    { text: 'Know why the shrink is a while, not an if', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The shortest run that adds up to 7',
      body: 'Like a rubber band on a ruler: stretch the right edge until it holds enough, then pull the left edge in as far as it will go.\n\nLine 1 gets a `target` and a list `nums` of **positive** numbers, and returns the length of the shortest run of neighbours whose sum is at least `target` (0 if none). Here: `[4, 3]`, so 2.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Every start',
      title: 'The obvious way: grow a window from every start',
      body: 'Lines 3–6 start a fresh window at every index and grow it until it reaches the target. Starting at 0, then at 1, re-adds `3, 1, 2` all over again.\n\nThat’s up to `n` additions per start: **`O(n²)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 5, 6] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 1: 'miss', 2: 'miss', 3: 'miss' }, codeVar: 'nums' }),
          range('window', 'nums', 1, 4, 'compare'),
          vars('vals', 0, VARS_Y, [{ name: 'target', value: TARGET }], { label: 'variables', width: 180 }),
          note('note', NOTE_X, VARS_Y, 'start 0: 2 + 3 + 1 + 2 = 8\nstart 1: 3 + 1 + 2 + 4 = 10\n3, 1, 2 added twice → O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Grow, shrink',
      title: 'Keep one window: grow right, shrink left',
      body: 'Once `[2, 3, 1, 2]` reaches 8, the window starting at 1 is the same values minus the 2, so don’t start over: **drop from the left**. While it still reaches the target, keep dropping; when it doesn’t, **grow on the right**.\n\nThe numbers are positive, so growing always raises the sum and shrinking always lowers it.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 0: 'muted' }, codeVar: 'nums' }),
          range('window', 'nums', 1, 3, 'compare'),
          vars('vals', 0, VARS_Y, [{ name: 'target', value: TARGET }], { label: 'variables', width: 180 }),
          note('note', NOTE_X, VARS_Y, '[2, 3, 1, 2] = 8 ≥ 7 → drop the 2\n[3, 1, 2] = 6 < 7 → grow right\nboth edges only move right'),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'State',
      title: 'Lines 2–4: an empty window and no answer yet',
      body: '`left` is the window’s left edge and `current_sum` its total. `min_len` starts at infinity, so any real window beats it (the comment on line 4).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['left = 0', 'current_sum = 0', 'min_len = float("inf")'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Grow',
      title: 'Lines 6–7: the right edge adds one value per turn',
      body: 'Line 6 walks the right edge over every index, and line 7 adds the value it lands on to the window.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['for right in range(len(nums))', 'current_sum += nums[right]'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Enough?',
      title: 'Lines 9–10: shrink while the window reaches the target',
      body: 'The comment on line 9 says why: a window that reaches the target might still work with fewer values. Line 10 keeps shrinking for as long as `current_sum >= target`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10], lines: [10] },
      metrics: startMetrics,
      changes: ['while current_sum >= target'],
      scene: { entities: scene({ ...base, phase: 'enough', left: 0, right: 3, sum: 8 }) },
    },
    {
      chapter: 'build',
      short: 'Record',
      title: 'Line 11: note the window’s length',
      body: 'The window runs from `left` to `right`, so it holds `right − left + 1` values. Line 11 keeps the smallest length seen: `[2, 3, 1, 2]` gives 4.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11], lines: [11] },
      metrics: startMetrics,
      changes: ['min_len = min(min_len, right - left + 1)'],
      scene: { entities: scene({ ...base, phase: 'record', left: 0, right: 3, sum: 8, minLen: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Shrink',
      title: 'Lines 12–13: drop the leftmost value',
      body: 'Line 12 takes `nums[left]` out of the sum, and line 13 moves the left edge past it. Then line 10 checks again.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: startMetrics,
      changes: ['current_sum -= nums[left]', 'left += 1'],
      scene: { entities: scene({ ...base, phase: 'shrink', left: 1, right: 3, sum: 6, minLen: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 15: 0 if no window ever reached the target',
      body: 'If `min_len` is still infinity, nothing worked, so line 15 returns 0; otherwise it returns the shortest length as an `int`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [15] },
      metrics: startMetrics,
      changes: ['return int(min_len) if min_len != float("inf") else 0'],
      scene: { entities: scene({ ...base, phase: 'done', left: 5, sum: 3, minLen: 2, bestLeft: 4 }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Both edges only move right: O(n)',
      body: 'There is a `while` inside the `for`, but `left` never moves back. Over the whole run `right` moves `n` times and `left` at most `n` times, so the work is at most about **`2n` steps: `O(n)` time**, and `O(1)` extra space.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [6, 10, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...base, phase: 'done', left: 5, sum: 3, minLen: 2, bestLeft: 4, note: 'here: right moved 6 times, left 5\nat most n + n moves in total\n→ O(n), not O(n²)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'While, not if',
      title: 'Why line 10 is a while, not an if',
      body: 'When 3 joined, `[2, 4, 3] = 9` lost **two** values in one turn: dropping 2 left `[4, 3] = 7`, still enough, and that’s the answer. With an `if`, each turn adds one value and drops at most one, so the window can never get shorter than its first fit: it would return 4.\n\nThat is the key decision: keep shrinking until the window stops reaching the target.',
      code: { view: 'final', lines: [10, 11, 12, 13] },
      values: { 10: 'right = 5: runs twice', 11: 'records 3, then 2' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...base, phase: 'record', left: 4, right: 5, sum: 7, minLen: 2, note: 'while: [2, 4, 3] → [4, 3], two drops\nif: +1 and at most −1 per turn,\nlength stays 4 → returns 4', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Find the shortest window in your own numbers',
    inputs: [
      { name: 'nums', label: 'Positive numbers', kind: 'numbers', default: '1, 4, 4' },
      { name: 'target', label: 'Target (at least 1)', kind: 'number', default: '4' },
    ],
    presets: [
      { label: 'No window', values: { nums: '1, 1, 1, 1, 1', target: '11' } },
      { label: 'Whole list', values: { nums: '1, 2, 3, 4, 5', target: '15' } },
      { label: 'Lesson example', values: { nums: '2, 3, 1, 2, 4, 3', target: '7' } },
      { label: 'One big value', values: { nums: '1, 1, 9, 1', target: '8' } },
    ],
    maxItems: 8,
    run: (values) => {
      const nums = values['nums'];
      const target = values['target'];
      if (!Array.isArray(nums) || typeof target !== 'number') throw new Error('Enter some numbers and a target.');
      if (nums.some((v) => v <= 0)) throw new Error('Use positive numbers only: with zeros or negatives, growing the window may not raise the sum.');
      if (target < 1) throw new Error('Use a target of at least 1.');
      return traceDynamic(nums, target);
    },
  },
});

/** Scene of run step n (0-based), so build steps show the moment they describe. */
function at(n: number): Step['scene'] {
  return RUN[n]?.scene ?? { entities: [] };
}
