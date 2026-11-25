import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/** The table `dp` (dp[i] = ways to reach step i) along the floor, variables and notes below it. */
const VARS_Y = 150;
const NOTE_X = 210;

type Phase = 'bare' | 'base' | 'alloc' | 'seed' | 'fill' | 'done';

interface StairState {
  readonly n: number;
  readonly phase: Phase;
  /** Values shown in dp; undefined → "?" (not in the code yet) or 0 (allocated). */
  readonly dp?: readonly ScalarValue[];
  readonly i?: number;
  readonly tones?: Readonly<Record<number, Tone>>;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

/** Scene: the dp row, the two reads of the current fill, and the variables. */
function scene(s: StairState): Entity[] {
  const { n, phase, i } = s;
  const values: ScalarValue[] = s.dp ? [...s.dp] : Array.from({ length: n + 1 }, () => '?');
  const tones: Record<number, Tone> = {};
  values.forEach((v, k) => (tones[k] = v === '?' || (k > 0 && v === 0) ? 'muted' : 'done'));
  tones[0] = 'muted';
  if (phase === 'seed') {
    tones[1] = 'active';
    if (n >= 2) tones[2] = 'active';
  }
  if (phase === 'fill' && i !== undefined) {
    tones[i] = 'active';
    tones[i - 1] = 'compare';
    tones[i - 2] = 'compare';
  }
  if (phase === 'done' || phase === 'base') tones[n] = 'found';
  Object.assign(tones, s.tones ?? {});
  const entities: Entity[] = [arr('dp', 0, 0, values, { label: 'dp', tones, codeVar: s.bare ? undefined : 'dp' })];
  if (phase === 'fill' && i !== undefined) {
    entities.push(link('one', { entity: 'dp', index: i - 1, side: 'top' }, { entity: 'dp', index: i, side: 'top' }, { tone: 'compare', flow: true, label: '+1 step' }));
    entities.push(link('two', { entity: 'dp', index: i - 2, side: 'bottom' }, { entity: 'dp', index: i, side: 'bottom' }, { tone: 'compare', flow: true, label: '+2 steps' }));
  }
  if (!s.bare) {
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'n', value: n },
          { name: 'i', value: i ?? '—', tone: i === undefined ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 150 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs climb_stairs(n) and records one step per decision (chapter "run", final code). */
function traceStairs(n: number): Step[] {
  const steps: Step[] = [];
  let additions = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ additions, result });
  const small = n <= 2;
  steps.push({
    chapter: 'run',
    short: 'Small n?',
    title: small ? `n = ${n}: answer straight away` : `n = ${n}: needs the table`,
    body: small
      ? `Line 2: \`${n} <= 2\` is true. ${n === 1 ? 'One stair: one way.' : 'Two stairs: 1 + 1 or 2, two ways.'}`
      : `Line 2: \`${n} <= 2\` is false, so the table is needed.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `${n} <= 2 → ${small ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ n, phase: 'bare' }) },
  });
  if (small) {
    steps.push({
      chapter: 'run',
      short: 'Return n',
      title: `${n} way${n === 1 ? '' : 's'}`,
      body: `Line 3 returns **${n}**.`,
      code: { view: 'final', lines: [3] },
      values: { 3: `return ${n}` },
      metrics: metrics(n),
      scene: { entities: scene({ n, phase: 'base', dp: n === 1 ? [0, 1] : [0, 1, 2] }) },
    });
    return steps;
  }
  const dp: number[] = Array.from({ length: n + 1 }, () => 0);
  steps.push({
    chapter: 'run',
    short: 'Table',
    title: `A table for steps 0…${n}`,
    body: `Line 4 makes \`dp\` with ${n + 1} slots, one per step 0…${n}, all 0 for now. Slot 0 is never used.`,
    code: { view: 'final', lines: [4] },
    values: { 4: `dp = [0] * ${n + 1}` },
    metrics: metrics(),
    scene: { entities: scene({ n, phase: 'alloc', dp: [...dp] }) },
  });
  dp[1] = 1;
  dp[2] = 2;
  steps.push({
    chapter: 'run',
    short: 'Base cases',
    title: 'Steps 1 and 2 are known',
    body: 'Lines 5–6 write the base cases: step 1 has **1** way (one stair), step 2 has **2** (1 + 1, or 2).',
    code: { view: 'final', lines: [5, 6] },
    values: { 5: 'dp[1] = 1', 6: 'dp[2] = 2' },
    metrics: metrics(),
    scene: { entities: scene({ n, phase: 'seed', dp: [...dp] }) },
  });
  for (let i = 3; i <= n; i += 1) {
    const one = dp[i - 1] ?? 0;
    const two = dp[i - 2] ?? 0;
    dp[i] = one + two;
    additions += 1;
    steps.push({
      chapter: 'run',
      short: `Step ${i}`,
      title: `dp[${i}] = ${one} + ${two} = ${dp[i]}`,
      body: `Line 7 sets \`i = ${i}\`. Line 8: the last move onto step ${i} was 1 stair (from step ${i - 1}, ${one} ways) or 2 stairs (from step ${i - 2}, ${two} ways). Both are read from the table, not recomputed: **${dp[i]}** ways.`,
      code: { view: 'final', lines: [7, 8] },
      values: { 7: `i = ${i}`, 8: `dp[${i}] = ${one} + ${two} = ${dp[i]}` },
      metrics: metrics(),
      scene: { entities: scene({ n, phase: 'fill', dp: [...dp], i }) },
    });
  }
  const answer = dp[n] ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `${answer} ways to climb ${n} stairs`,
    body: `The table is full. Line 9 returns \`dp[${n}]\` = **${answer}**, after ${additions} addition${additions === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [9] },
    values: { 9: `return ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ n, phase: 'done', dp: [...dp] }) },
  });
  return steps;
}

/** How often the naive recursion ways(k) runs for each k when asked for ways(top). */
function naiveCalls(top: number): number[] {
  const calls = Array.from({ length: top + 1 }, () => 0);
  const go = (k: number): void => {
    calls[k] = (calls[k] ?? 0) + 1;
    if (k <= 2) return;
    go(k - 1);
    go(k - 2);
  };
  go(top);
  return calls;
}

const N = 5;
const RUN = traceStairs(N);
const startMetrics = { additions: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
const FILLED = [0, 1, 2, 3, 5, 8] as const;
const CALLS = naiveCalls(N);
const TOTAL_CALLS = CALLS.reduce((a, b) => a + b, 0);

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/what-is-dp',
  title: 'What is Dynamic Programming? Remember, don’t recompute',
  summary: 'From the idea to the code: see what makes a problem a DP problem, then build a table for Climbing Stairs using the four steps every DP solution follows.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    dp = [0] * (n + 1)  # dp[i]: ways to reach step i
    dp[1] = 1
    dp[2] = 2
    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]  # Last move was 1 step or 2 steps
    return dp[n]`,
  },
  snapshots: {
    brute: `def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    return climb_stairs(n - 1) + climb_stairs(n - 2)  # Same answers, asked again`,
  },
  metrics: [
    { key: 'additions', label: 'Additions' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'dp[i] being written' },
    { tone: 'compare', label: 'stored answers read' },
    { tone: 'done', label: 'stored' },
    { tone: 'muted', label: 'unused / not yet' },
    { tone: 'miss', label: 'solved again' },
    { tone: 'found', label: 'answer' },
  ],
  goals: [
    { text: 'Spot overlapping subproblems', step: 3 },
    { text: 'Know the two ways to remember: memo or table', step: 4 },
    { text: 'Build a DP in four steps: state, base, transition, order', step: 5 },
    { text: 'Know why reading the table beats recursing', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'How many ways up the stairs?',
      body: 'You climb a staircase of `n` steps, taking **1 or 2 stairs** at a time. Line 1 returns how many different ways there are to reach the top.\n\nHere `n = 5`: the answer is **8** (for example 1+1+1+1+1, 2+2+1, 1+2+2…).',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, phase: 'bare', bare: true, note: 'n = 5, moves of 1 or 2\n2 + 2 + 1, 1 + 2 + 2, 2 + 1 + 2, …\nhow many? (expected 8)' }) },
    },
    {
      chapter: 'idea',
      short: 'Remember',
      title: 'DP in one sentence: remember answers you already have',
      body: 'Ask someone `1 + 1 + 1 + 1 + 1` and they say 5. Add `+ 1` and they say 6 at once: they didn’t recount, they **remembered** 5.\n\nDynamic programming does exactly that: solve each smaller question once, store the answer, and build bigger answers from stored ones.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, phase: 'bare', bare: true, note: '1 + 1 + 1 + 1 + 1 = 5\n… + 1 = 5 + 1 = 6\nreuse, don’t recount' }) },
    },
    {
      chapter: 'idea',
      short: 'Overlap',
      title: 'The obvious way: recurse, and ask the same questions again',
      body: `To reach step \`n\`, the last move came from step \`n − 1\` or \`n − 2\`, so line 4 adds those two answers. But each call asks two more: the cells count how often each step is solved, ${TOTAL_CALLS} calls in all (red: repeats).\n\nThat’s **overlapping subproblems**, and it costs **\`O(2ⁿ)\`**. DP needs it, plus **optimal substructure**: the big answer is built from the small answers.`,
      code: { view: 'snapshot', id: 'brute', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, phase: 'bare', bare: true, dp: CALLS, tones: Object.fromEntries(CALLS.map((c, k) => [k, k === 0 ? 'muted' : c > 1 ? 'miss' : 'done'])), note: 'number = times climb_stairs(k) runs\nstep 2 is solved 3 times\nn = 40: ~10⁸ calls', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Memo or table',
      title: 'Two ways to remember: top-down or bottom-up',
      body: '**Top-down (memoization):** keep the recursion, but store each answer in a dictionary and look it up before recursing. **Bottom-up (tabulation):** fill a table from the smallest step upwards, so every answer you need is already there.\n\nBoth solve each step once: `O(n)`. This lesson builds the table, with no recursion at all.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, phase: 'fill', dp: FILLED, i: 4, bare: true, note: 'top-down: ask 5, remember on the way\nbottom-up: fill 1, 2, 3, 4, 5 in order\nboth: each step solved once' }) },
    },
    {
      chapter: 'build',
      short: 'Small n',
      title: 'Lines 2–3: tiny staircases answer themselves',
      body: 'With 1 stair there is 1 way, with 2 stairs 2 ways: `n` itself. Answer those before building anything.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if n <= 2: return n'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: '1. State',
      title: 'Line 4, step 1 of every DP: define the state',
      body: 'Decide what one cell means: **`dp[i]` = the number of ways to reach step `i`**. One slot per step, `n + 1` in all.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [4] },
      metrics: startMetrics,
      changes: ['dp = [0] * (n + 1)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: '2. Base',
      title: 'Lines 5–6, step 2: the base cases',
      body: 'Write the answers you know without any rule: `dp[1] = 1`, `dp[2] = 2`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['dp[1] = 1', 'dp[2] = 2'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: '3. Transition',
      title: 'Lines 7–8, steps 3 and 4: transition and order',
      body: 'The transition is the recurrence, **`dp[i] = dp[i − 1] + dp[i − 2]`** (line 8). The order (line 7) goes from 3 upwards, so both cells it reads are always filled first.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['for i in range(3, n + 1)', 'dp[i] = dp[i - 1] + dp[i - 2]'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 9: the answer is the last cell',
      body: '`dp[n]` is the number of ways to reach the top, and line 9 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [9] },
      metrics: startMetrics,
      changes: ['return dp[n]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One addition per step: O(n) instead of O(2ⁿ)',
      body: 'Each step is filled once with one addition, so it’s **`O(n)` time** and **`O(n)` space** for the table. Since line 8 only looks two steps back, two variables would do (`O(1)` space): see the Fibonacci lesson.\n\nSwitch to **🧪 Try your own** to climb other staircases.',
      code: { view: 'final', lines: [7, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, phase: 'done', dp: FILLED, note: `recursion: ${TOTAL_CALLS} calls for n = 5\ntable: 3 additions\nn = 40: ~10⁸ calls vs 38 additions`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Read, not redo',
      title: 'Why line 8 reads the table instead of recursing',
      body: '`dp[i − 1]` and `dp[i − 2]` were stored before `i` was reached, so line 8 just reads them: each smaller question is answered **once** and reused. That is the key decision, and the whole idea of DP.\n\nWhen subproblems don’t repeat (merge sort’s halves never overlap), there is nothing to reuse: plain divide and conquer is enough.',
      code: { view: 'final', lines: [8] },
      values: { 8: 'dp[5] = dp[4] + dp[3]: two reads' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, phase: 'fill', dp: FILLED, i: 5, note: 'dp[4] = 5 and dp[3] = 3 are stored\n5 + 3 = 8: no recursion' }) },
    },
  ],
  trace: {
    title: 'Run climb_stairs on your own staircase',
    inputs: [{ name: 'n', label: 'n (1 to 9)', kind: 'number', default: '6' }],
    presets: [
      { label: 'n = 1', values: { n: '1' } },
      { label: 'n = 2', values: { n: '2' } },
      { label: 'n = 3', values: { n: '3' } },
      { label: 'Lesson example', values: { n: '5' } },
      { label: 'n = 9', values: { n: '9' } },
    ],
    run: (values) => {
      const n = values['n'];
      if (typeof n !== 'number' || n < 1 || n > 9) throw new Error('Pick n from 1 to 9, so the table fits on the stage.');
      return traceStairs(n);
    },
  },
});
