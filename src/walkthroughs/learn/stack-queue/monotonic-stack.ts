import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const RESULT_Y = 130;
const STACK_Y = 260;
const NOTE_Y = 380;
const ROWS = 5;

/**
 * `create`: lines 2–4. `pop?` / `stay`: line 7's verdict (the top is smaller / not smaller, or the stack is empty).
 * `popped`: lines 8–9 resolved the top. `pushed`: line 10. `done`: line 12.
 */
type Phase = 'create' | 'pop?' | 'stay' | 'popped' | 'pushed' | 'done';

interface MonoState {
  readonly nums: readonly number[];
  readonly result: readonly number[];
  /** Indices waiting for a bigger value, bottom → top. */
  readonly stack: readonly number[];
  readonly phase?: Phase;
  readonly idx?: number;
  /** Index just popped and resolved (lines 8–9). */
  readonly waiting?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: `nums`, `result`, the index `stack` underneath, and the variables. */
function scene(s: MonoState): Entity[] {
  const { nums, result, stack, phase, idx, waiting } = s;
  const n = nums.length;
  const top = stack[stack.length - 1];
  const resolved = new Set<number>();
  result.forEach((r, k) => {
    if (r !== -1) resolved.add(k);
  });

  const nTones: Record<number, Tone> = {};
  resolved.forEach((k) => (nTones[k] = 'done'));
  if (phase === 'pop?' && top !== undefined) nTones[top] = 'compare';
  if (phase === 'stay' && top !== undefined) nTones[top] = 'miss';
  if (idx !== undefined && phase !== 'done') nTones[idx] = 'active';

  const rTones: Record<number, Tone> = {};
  result.forEach((r, k) => (rTones[k] = phase === 'done' ? 'found' : r === -1 ? 'muted' : 'done'));
  if (phase === 'popped' && waiting !== undefined) rTones[waiting] = 'active';

  const entities: Entity[] = [
    arr('nums', 0, 0, nums, { label: 'nums', tones: nTones, codeVar: 'nums' }),
    arr('result', 0, RESULT_Y, result, { label: 'result', tones: rTones, codeVar: 'result' }),
  ];
  if (stack.length === 0) {
    entities.push(arr('stack', 0, STACK_Y, ['—'], { label: 'stack', tones: { 0: phase === 'stay' ? 'miss' : 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: 'stack' }));
  } else {
    const sTones: Record<number, Tone> = {};
    stack.forEach((_, k) => (sTones[k] = 'done'));
    if (phase === 'pop?') sTones[stack.length - 1] = 'compare';
    if (phase === 'stay') sTones[stack.length - 1] = 'miss';
    if (phase === 'pushed') sTones[stack.length - 1] = 'active';
    entities.push(
      arr('stack', 0, STACK_Y, stack, { label: 'stack', tones: sTones, itemKeys: stack.map((i) => `i${i}`), indexLabels: stack.map((i) => `nums=${nums[i]}`), codeVar: 'stack' }),
      ptr('top', 'stack', stack.length - 1, 'top', { side: 'top', tone: phase === 'pop?' ? 'compare' : phase === 'stay' ? 'miss' : 'done' }),
    );
  }
  if (idx !== undefined && phase !== 'done') entities.push(ptr('idx', 'nums', idx, 'idx', { side: 'top', tone: 'active', codeVar: 'idx' }));

  if (idx !== undefined && waiting !== undefined && phase === 'popped') {
    entities.push(link('write', { entity: 'nums', index: idx, side: 'bottom' }, { entity: 'result', index: waiting, side: 'top' }, { label: `${nums[idx]} → result[${waiting}]`, tone: 'found', flow: true }));
  }

  const cell = (v: number | undefined): ScalarValue => (v === undefined ? '—' : v);
  const rows: VarRow[] = [
    { name: 'idx', value: phase === 'done' ? '—' : cell(idx), tone: idx === undefined || phase === 'done' ? 'muted' : 'default' },
    { name: 'val', value: phase === 'done' || idx === undefined ? '—' : cell(nums[idx]), tone: idx === undefined || phase === 'done' ? 'muted' : 'default' },
    { name: 'stack[-1]', value: cell(top), tone: top === undefined ? 'muted' : 'default' },
    { name: 'nums[stack[-1]]', value: top === undefined ? '—' : cell(nums[top]), tone: top === undefined ? 'muted' : phase === 'pop?' ? 'compare' : phase === 'stay' ? 'miss' : 'default' },
    { name: 'waiting_idx', value: cell(waiting), tone: waiting === undefined ? 'muted' : 'default' },
  ];
  entities.push(vars('vals', tableBesideArray(n, ROWS), 0, rows, { label: 'variables', width: 210 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Runs next_greater_elements on any input, one step per decision (chapter "run", final code). */
function traceNextGreater(nums: readonly number[]): Step[] {
  const steps: Step[] = [];
  const result: number[] = nums.map(() => -1);
  const stack: number[] = [];
  let pushes = 0;
  let pops = 0;
  const metrics = (answer: ScalarValue = '—'): Record<string, ScalarValue> => ({ pushes, pops, result: answer });
  const snap = (extra: Omit<MonoState, 'nums' | 'result' | 'stack'>): MonoState => ({ nums, result: [...result], stack: [...stack], ...extra });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Every answer starts as -1, the stack starts empty`,
    body: `Line 2: \`result = ${show(result)}\`, so a value nothing bigger ever follows keeps -1. Line 4: no index is waiting yet.`,
    code: { view: 'final', lines: [2, 4] },
    values: { 2: `result = ${show(result)}`, 4: 'stack = []' },
    metrics: metrics(),
    scene: { entities: scene(snap({ phase: 'create' })) },
  });

  nums.forEach((val, idx) => {
    let first = true;
    for (;;) {
      const top = stack[stack.length - 1];
      const smaller = top !== undefined && (nums[top] ?? 0) < val;
      const enter = first ? `Line 6 moves to \`idx = ${idx}\`, \`val = ${val}\`. ` : '';
      const lineVals: Record<number, string> = first ? { 6: `idx = ${idx}, val = ${val}` } : {};
      first = false;
      if (top === undefined) {
        steps.push({
          chapter: 'run',
          short: `idx ${idx}: empty`,
          title: `${val}: nobody is waiting`,
          body: `${enter}Line 7: the stack is empty, so there is nothing for ${val} to resolve.`,
          code: { view: 'final', lines: Object.keys(lineVals).length ? [6, 7] : [7] },
          values: { ...lineVals, 7: 'stack → empty, False' },
          metrics: metrics(),
          scene: { entities: scene(snap({ phase: 'stay', idx })) },
        });
        break;
      }
      const topVal = nums[top] ?? 0;
      steps.push({
        chapter: 'run',
        short: smaller ? `${topVal} < ${val}` : `${topVal} ≥ ${val}`,
        title: smaller ? `${topVal} < ${val}: ${val} is what index ${top} was waiting for` : `${topVal} ≥ ${val}: stop popping`,
        body: smaller
          ? `${enter}Line 7: the top of the stack is index ${top}, holding ${topVal}. \`${topVal} < ${val}\`, so ${val} is the first bigger value to its right.`
          : `${enter}Line 7: the top is index ${top}, holding ${topVal}, and \`${topVal} < ${val}\` is false. The stack is decreasing, so every index below waits on an even bigger value: none of them can be resolved by ${val} either.`,
        code: { view: 'final', lines: Object.keys(lineVals).length ? [6, 7] : [7] },
        values: { ...lineVals, 7: `${topVal} < ${val} → ${smaller ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: smaller ? 'pop?' : 'stay', idx })) },
      });
      if (!smaller) break;
      stack.pop();
      pops += 1;
      result[top] = val;
      steps.push({
        chapter: 'run',
        short: `result[${top}] = ${val}`.slice(0, 14),
        title: `Pop index ${top}: result[${top}] = ${val}`,
        body: `Line 8 pops index ${top} off the stack; it has its answer and never waits again. Line 9 writes \`result[${top}] = ${val}\`.`,
        code: { view: 'final', lines: [8, 9] },
        values: { 8: `waiting_idx = ${top}`, 9: `result[${top}] = ${val}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'popped', idx, waiting: top })) },
      });
    }
    stack.push(idx);
    pushes += 1;
    steps.push({
      chapter: 'run',
      short: `push ${idx}`,
      title: `Push index ${idx}: ${val} now waits`,
      body: `Line 10 pushes index ${idx}. Its own next bigger value is still ahead. The stack’s values read ${show(stack.map((i) => nums[i] ?? 0))}: still decreasing.`,
      code: { view: 'final', lines: [10] },
      values: { 10: `stack = ${show(stack)}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: 'pushed', idx })) },
    });
  });

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${show(result)}`,
    body: `The loop is over. ${stack.length ? `Index${stack.length === 1 ? '' : 'es'} ${stack.join(', ')} never met a bigger value, so ${stack.length === 1 ? 'it keeps' : 'they keep'} -1. ` : ''}Line 12 returns **${show(result)}**.`,
    code: { view: 'final', lines: [12] },
    values: { 12: `return ${show(result)}` },
    metrics: metrics(show(result)),
    scene: { entities: scene(snap({ phase: 'done' })) },
  });
  return steps;
}

const NUMS = [2, 1, 5, 3, 6, 4] as const;
const RUN = traceNextGreater(NUMS);
const startMetrics = { pushes: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BLANK = [-1, -1, -1, -1, -1, -1] as const;
const ANSWER = [5, 5, 6, 6, -1, -1] as const;

export default defineWalkthrough({
  id: 'learn/stack-queue/monotonic-stack',
  title: 'Monotonic Stack, next greater element',
  summary: 'From the idea to the code: find each value’s next bigger value to the right in one pass, keeping the unresolved indices on a stack whose values only decrease.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def next_greater_elements(nums: list[int]) -> list[int]:
    result = [-1] * len(nums)
    # Indices still waiting for a bigger value; their values decrease
    stack: list[int] = []

    for idx, val in enumerate(nums):
        while stack and nums[stack[-1]] < val:
            waiting_idx = stack.pop()
            result[waiting_idx] = val  # First bigger value to its right
        stack.append(idx)

    return result`,
  },
  snapshots: {
    brute: `def next_greater_elements(nums: list[int]) -> list[int]:
    result = [-1] * len(nums)
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):  # Look right until bigger
            if nums[j] > nums[i]:
                result[i] = nums[j]
                break
    return result`,
  },
  metrics: [
    { key: 'pushes', label: 'Pushes' },
    { key: 'pops', label: 'Pops' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'current value / just written' },
    { tone: 'compare', label: 'top being compared' },
    { tone: 'done', label: 'answer found / waiting' },
    { tone: 'found', label: 'returned' },
    { tone: 'miss', label: 'not smaller: stop' },
    { tone: 'muted', label: 'no answer yet (-1)' },
  ],
  goals: [
    { text: 'See why looking right from every value is O(n²)', step: 2 },
    { text: 'Keep the waiting values on a decreasing stack', step: 3 },
    { text: 'Follow every comparison, pop and push', step: BUILD_END + 1 },
    { text: 'Know why the stack holds indices, not values', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'For each value, the next bigger value to its right',
      body: 'Like people in a line facing right: each person wants to know who is the first taller person in front of them.\n\nLine 1 gets `nums` and returns, for every position, the first bigger value to its right, or -1 if there is none. For `[2, 1, 5, 3, 6, 4]` that’s `[5, 5, 6, 6, -1, -1]`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ nums: NUMS, result: ANSWER, stack: [], phase: 'done', note: '2 → 5, 1 → 5, 5 → 6, 3 → 6\n6 and 4: nothing bigger → -1' }) },
    },
    {
      chapter: 'idea',
      short: 'Look right',
      title: 'The obvious way: scan right from every value',
      body: 'Lines 3–7 start at each value and walk right until something bigger shows up. On a decreasing list like `[5, 4, 3, 2, 1]` nothing ever does, so every scan runs to the end.\n\nThat’s about `n²/2` comparisons: **`O(n²)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 4, 5] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, [5, 4, 3, 2, 1], { label: 'nums', tones: { 0: 'active', 1: 'miss', 2: 'miss', 3: 'miss', 4: 'miss' }, codeVar: 'nums' }),
          ...[1, 2, 3, 4].map((k) => link(`scan-${k}`, { entity: 'nums', index: 0, side: 'top' }, { entity: 'nums', index: k, side: 'top' }, { tone: 'miss', dashed: true })),
          note('note', 0, RESULT_Y, '5 checks 4, 3, 2, 1: none bigger\nthen 4 checks 3, 2, 1 …\n≈ n²/2 comparisons → O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Wait list',
      title: 'Let the waiting values wait on a stack',
      body: 'Scan once, left to right. Values still waiting for an answer go on a stack. When a newcomer is bigger than the top, it **is** the top’s answer: pop it and repeat.\n\nThe waiting values always decrease from bottom to top (a bigger one would have resolved the smaller ones). So once the top isn’t smaller, nothing below is either.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(find('3 < 6')),
    },
    {
      chapter: 'build',
      short: 'Answers',
      title: 'Line 2: every answer starts as -1',
      body: 'A value that never meets a bigger one keeps -1, so we fill that in first and only overwrite answers we find.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['result = [-1] * len(nums)'],
      scene: { entities: scene({ nums: NUMS, result: BLANK, stack: [] }) },
    },
    {
      chapter: 'build',
      short: 'Stack',
      title: 'Lines 3–4: a stack of waiting indices',
      body: 'The stack stores **indices**, so we know where to write each answer. The comment states the rule the loop keeps: their values decrease.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['stack = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Bigger?',
      title: 'Lines 6–7: is the newcomer bigger than the top?',
      body: 'For each value, line 7 keeps asking while there is a top and its value is smaller than `val`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['for idx, val in enumerate(nums)', 'while stack and nums[stack[-1]] < val'],
      scene: at(find('2 < 5')),
    },
    {
      chapter: 'build',
      short: 'Resolve',
      title: 'Lines 8–9: pop the top and record its answer',
      body: 'The popped index has found its next bigger value: `val`. It leaves the stack for good.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['waiting_idx = stack.pop()', 'result[waiting_idx] = val'],
      scene: at(find('result[1] = 5')),
    },
    {
      chapter: 'build',
      short: 'Wait',
      title: 'Line 10: the newcomer starts waiting',
      body: 'After resolving everything it can, `val` still needs its own answer, so its index goes on top. It is smaller than whatever stayed below it, so the stack stays decreasing.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10], lines: [10] },
      metrics: startMetrics,
      changes: ['stack.append(idx)'],
      scene: at(find('push 2')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 12: indices left on the stack keep -1',
      body: 'Whatever still waits at the end never met a bigger value.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [12] },
      metrics: startMetrics,
      changes: ['return result'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each index is pushed once and popped at most once',
      body: 'The `while` loop can pop several times for one value, but every pop removes an index that was pushed once. So over the whole scan there are at most `n` pushes and `n` pops: **`O(n)` time**, even though there is a loop inside a loop. The stack and `result` take **`O(n)` space**.\n\nSwitch to **🧪 Try your own** to try increasing, decreasing or repeated values.',
      code: { view: 'final', lines: [7, 8, 10] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ nums: NUMS, result: ANSWER, stack: [4, 5], phase: 'done', note: '6 pushes, 4 pops, 10 checks of line 7\nat most 2n stack operations\n→ O(n), not O(n²)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Indices',
      title: 'Why line 4 stores indices instead of values',
      body: 'When 5 arrives and pops the waiting 1, the answer has to go into `result` at the 1’s **position**. A stack of values would know the answer but not where to write it, and with repeats like `[3, 1, 3]` a value doesn’t even name a single position.\n\nThat is the key decision: keep indices, and read the values through `nums[stack[-1]]`.',
      code: { view: 'final', lines: [4, 8, 9] },
      values: { 4: 'indices: the answer’s address', 9: 'written at the waiting position' },
      metrics: FINAL_METRICS,
      scene: at(find('result[1] = 5')),
    },
  ],
  trace: {
    title: 'Find the next greater elements of your own numbers',
    inputs: [{ name: 'nums', label: 'Numbers', kind: 'numbers', default: '2, 1, 5, 3, 6, 4' }],
    presets: [
      { label: 'Lesson example', values: { nums: '2, 1, 5, 3, 6, 4' } },
      { label: 'All increasing', values: { nums: '1, 2, 3, 4, 5' } },
      { label: 'All decreasing', values: { nums: '5, 4, 3, 2, 1' } },
      { label: 'Equal values', values: { nums: '3, 3, 1, 3' } },
      { label: 'Temperatures', values: { nums: '73, 74, 75, 71, 69, 72, 76, 73' } },
    ],
    maxItems: 10,
    run: (values) => {
      const nums = values['nums'];
      if (!Array.isArray(nums) || nums.length === 0) throw new Error('Enter at least one number.');
      return traceNextGreater(nums);
    },
  },
});
