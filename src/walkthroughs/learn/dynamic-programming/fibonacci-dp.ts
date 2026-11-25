import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { CELL } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The row `F(i)` is not a variable in the code: it is the timeline of every
 * Fibonacci number the loop has produced. The code only ever holds two of
 * them, `prev2` and `prev1` (the pointers); everything left of `prev2` has
 * been forgotten (muted).
 */
const VARS_Y = 150;
const NOTE_X = 220;

type Phase = 'bare' | 'base' | 'seed' | 'add' | 'shift' | 'done';

interface FibState {
  readonly n: number;
  readonly phase: Phase;
  /** The index being computed (add) or just computed (shift). */
  readonly i?: number;
  /** Values known so far, F(0)…F(known − 1). */
  readonly known: readonly number[];
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables panel (before the code has them). */
  readonly bare?: boolean;
  /** Show the whole table idea: no pointers, nothing forgotten. */
  readonly keepAll?: boolean;
}

/** Scene: the F(i) row, the two pointers the code keeps, read arcs, and the variables. */
function scene(s: FibState): Entity[] {
  const { n, phase, i, known } = s;
  const cells = known.map(String);
  while (cells.length < n + 1) cells.push('?');

  // Which two slots the code holds right now.
  let p2: number | undefined;
  let p1: number | undefined;
  if (phase === 'seed') [p2, p1] = [0, 1];
  else if (phase === 'add' && i !== undefined) [p2, p1] = [i - 2, i - 1];
  else if ((phase === 'shift' || phase === 'done') && known.length >= 2) [p2, p1] = [known.length - 2, known.length - 1];

  const tones: Record<number, Tone> = {};
  for (let k = 0; k <= n; k += 1) {
    if (k >= known.length) tones[k] = 'muted';
    else if (p2 !== undefined && k < p2 && !s.keepAll) tones[k] = 'muted';
    else tones[k] = 'done';
  }
  if (phase === 'add' && p2 !== undefined && p1 !== undefined && i !== undefined) {
    tones[p2] = 'compare';
    tones[p1] = 'compare';
    tones[i] = 'active';
  }
  if (phase === 'shift' && i !== undefined) tones[i] = 'active';
  if (phase === 'base') tones[n] = 'found';
  if (phase === 'done' && p1 !== undefined) tones[p1] = 'found';

  const entities: Entity[] = [arr('table', 0, 0, cells, { label: 'F(i)', tones })];
  if (!s.keepAll && p2 !== undefined && p2 >= 0 && p2 <= n) entities.push(ptr('prev2', 'table', p2, 'prev2', { tone: 'compare', codeVar: 'prev2' }));
  if (!s.keepAll && p1 !== undefined && p1 >= 0 && p1 <= n) entities.push(ptr('prev1', 'table', p1, 'prev1', { tone: phase === 'done' ? 'found' : 'compare', codeVar: 'prev1' }));
  if (phase === 'add' && i !== undefined) {
    entities.push(link('read-2', { entity: 'table', index: i - 2, side: 'top' }, { entity: 'table', index: i, side: 'top' }, { tone: 'compare', flow: true }));
    entities.push(link('read-1', { entity: 'table', index: i - 1, side: 'top' }, { entity: 'table', index: i, side: 'top' }, { tone: 'compare', flow: true }));
  }

  if (!s.bare) {
    const dash = '—';
    const holding = phase === 'seed' || phase === 'add' || phase === 'shift' || phase === 'done';
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'n', value: n },
          { name: 'i', value: i ?? dash, tone: i === undefined ? 'muted' : 'default' },
          { name: 'prev2', value: holding && p2 !== undefined ? (known[p2] ?? dash) : dash, tone: holding ? 'default' : 'muted' },
          { name: 'prev1', value: holding && p1 !== undefined ? (known[p1] ?? dash) : dash, tone: phase === 'done' ? 'found' : holding ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** F(0)…F(k). */
function fibs(k: number): number[] {
  const out = [0, 1];
  for (let j = 2; j <= k; j += 1) out.push((out[j - 2] ?? 0) + (out[j - 1] ?? 0));
  return out.slice(0, k + 1);
}

/** Runs fib_dp(n) and records one step per decision (chapter "run", final code). */
function traceFib(n: number): Step[] {
  const steps: Step[] = [];
  let additions = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ additions, result });

  const base = n <= 1;
  steps.push({
    chapter: 'run',
    short: 'Base case?',
    title: base ? `n = ${n} is a base case` : `n = ${n} is not a base case`,
    body: base
      ? `Line 2: \`${n} <= 1\` is true. F(0) = 0 and F(1) = 1 are known without any work.`
      : `Line 2: \`${n} <= 1\` is false, so there is something to compute.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `${n} <= 1 → ${base ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ n, phase: 'bare', known: [] }) },
  });
  if (base) {
    steps.push({
      chapter: 'run',
      short: 'Return n',
      title: `F(${n}) = ${n}`,
      body: `Line 3 returns **${n}** straight away: no loop, no additions.`,
      code: { view: 'final', lines: [3] },
      values: { 3: `return ${n}` },
      metrics: metrics(n),
      scene: { entities: scene({ n, phase: 'base', known: fibs(n) }) },
    });
    return steps;
  }

  let prev2 = 0;
  let prev1 = 1;
  steps.push({
    chapter: 'run',
    short: 'Seed',
    title: 'Hold F(0) = 0 and F(1) = 1',
    body: 'Line 4 puts the two known values in hand: `prev2 = 0` is F(0) and `prev1 = 1` is F(1).',
    code: { view: 'final', lines: [4] },
    values: { 4: 'prev2 = 0, prev1 = 1' },
    metrics: metrics(),
    scene: { entities: scene({ n, phase: 'seed', known: [0, 1] }) },
  });

  for (let i = 2; i <= n; i += 1) {
    const sum = prev2 + prev1;
    additions += 1;
    const knownBefore = fibs(i - 1);
    steps.push({
      chapter: 'run',
      short: `F(${i})`,
      title: `F(${i}) = ${prev2} + ${prev1} = ${sum}`,
      body: `Line 5 sets \`i = ${i}\`. Line 6 first works out the right side: \`prev2 + prev1 = ${prev2} + ${prev1} = ${sum}\`, which is F(${i - 2}) + F(${i - 1}).`,
      code: { view: 'final', lines: [5, 6] },
      values: { 5: `i = ${i}`, 6: `prev2 + prev1 = ${sum}` },
      metrics: metrics(),
      scene: { entities: scene({ n, phase: 'add', i, known: [...knownBefore, sum] }) },
    });
    const forgotten = prev2;
    prev2 = prev1;
    prev1 = sum;
    steps.push({
      chapter: 'run',
      short: 'Roll',
      title: `Roll forward: prev2 = ${prev2}, prev1 = ${prev1}`,
      body: `Line 6 then assigns both names at once: \`prev2\` takes the old \`prev1\` (${prev2}) and \`prev1\` takes the sum (${prev1}). F(${i - 2}) = ${forgotten} is no longer needed, so it’s forgotten.`,
      code: { view: 'final', lines: [6] },
      values: { 6: `prev2, prev1 = ${prev2}, ${prev1}` },
      metrics: metrics(),
      scene: { entities: scene({ n, phase: 'shift', i, known: fibs(i) }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `F(${n}) = ${prev1}`,
    body: `\`range(2, ${n + 1})\` is used up, so the loop ends. Line 7 returns \`prev1\` = **${prev1}**, after ${additions} addition${additions === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [7] },
    values: { 7: `return ${prev1}` },
    metrics: metrics(prev1),
    scene: { entities: scene({ n, phase: 'done', known: fibs(n) }) },
  });
  return steps;
}

// ── The naive recursion tree for fib(5), drawn in screen space (root on top) ──
const COS30 = Math.cos(Math.PI / 6);
const TREE_SY = 0;
const LEVEL_SY = 85;
const LEAF_SX = 92;

interface CallNode {
  readonly k: number;
  readonly path: string;
  readonly depth: number;
  readonly slot: number;
  readonly repeat: boolean;
  readonly parent?: string;
}

/** Lays out fib(k)'s calls: leaves on consecutive slots, parents centred over their children. */
function callTree(top: number): CallNode[] {
  const nodes: CallNode[] = [];
  const seen = new Set<number>();
  let leaf = 0;
  const visit = (k: number, path: string, depth: number, parent?: string): number => {
    const repeat = seen.has(k);
    let slot: number;
    if (k <= 1) {
      slot = leaf;
      leaf += 1;
      seen.add(k);
      nodes.push({ k, path, depth, slot, repeat, parent });
      return slot;
    }
    const index = nodes.length;
    nodes.push({ k, path, depth, slot: 0, repeat, parent });
    const a = visit(k - 1, `${path}l`, depth + 1, path);
    const b = visit(k - 2, `${path}r`, depth + 1, path);
    seen.add(k);
    slot = (a + b) / 2;
    nodes[index] = { k, path, depth, slot, repeat, parent };
    return slot;
  };
  visit(top, 'c', 0);
  return nodes;
}

function treeScene(top: number): Entity[] {
  const nodes = callTree(top);
  const leaves = nodes.filter((nd) => nd.k <= 1).length;
  const entities: Entity[] = [];
  for (const nd of nodes) {
    const sx = (nd.slot - (leaves - 1) / 2) * LEAF_SX;
    const sy = TREE_SY + nd.depth * LEVEL_SY;
    const a = sx / COS30;
    const b = 2 * sy - CELL;
    const x = Math.round((a + b) / 2);
    const y = Math.round((b - a) / 2);
    entities.push(arr(nd.path, x, y, [nd.k], { showIndex: false, tones: { 0: nd.repeat ? 'miss' : 'done' } }));
  }
  for (const nd of nodes) {
    if (nd.parent) entities.push(link(`e-${nd.path}`, { entity: nd.parent }, { entity: nd.path }, { tone: nd.repeat ? 'miss' : 'default', dashed: nd.repeat }));
  }
  return entities;
}

const N = 6;
const RUN = traceFib(N);
const startMetrics = { additions: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/fibonacci-dp',
  title: 'Fibonacci, from exponential recursion to two variables',
  summary: 'From the idea to the code: see why plain recursion recomputes the same Fibonacci numbers again and again, then fill them bottom-up keeping only the last two.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def fib_dp(n: int) -> int:
    if n <= 1:
        return n
    prev2, prev1 = 0, 1  # Only the last two values are needed to roll forward
    for i in range(2, n + 1):
        prev2, prev1 = prev1, prev2 + prev1
    return prev1`,
  },
  snapshots: {
    brute: `def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)  # Two calls, each repeating the other's work`,
  },
  metrics: [
    { key: 'additions', label: 'Additions' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'F(i) being made' },
    { tone: 'compare', label: 'prev2, prev1' },
    { tone: 'done', label: 'computed' },
    { tone: 'muted', label: 'forgotten / not yet' },
    { tone: 'miss', label: 'repeated call' },
    { tone: 'found', label: 'answer' },
  ],
  goals: [
    { text: 'See why plain recursion is O(2ⁿ)', step: 2 },
    { text: 'Fill F(i) bottom-up from the recurrence', step: 3 },
    { text: 'Roll two variables along the table', step: BUILD_END + 4 },
    { text: 'Know why line 6 assigns both at once', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The n-th Fibonacci number',
      body: 'Each Fibonacci number is the sum of the two before it, starting from 0 and 1: 0, 1, 1, 2, 3, 5, 8, …\n\nLine 1 takes a whole number `n ≥ 0` and returns F(n). Here `n = 6`, so the answer is **8**. The catch: `n` can be large, so the work must grow slowly with it.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, phase: 'bare', known: [], bare: true, note: 'n = 6\nF(6) = ?   (expected 8)' }) },
    },
    {
      chapter: 'idea',
      short: 'Recursion',
      title: 'The obvious way: recurse, and repeat yourself',
      body: 'Line 4 calls `fib(n − 1)` and `fib(n − 2)`, and each of those calls two more. The tree for `fib(5)` has **15 calls**: `fib(3)` runs twice and `fib(2)` three times (red).\n\nEvery extra `n` roughly doubles the calls: **`O(2ⁿ)`**. At `n = 50` that is billions of calls for one number.',
      code: { view: 'snapshot', id: 'brute', lines: [4] },
      metrics: startMetrics,
      scene: { entities: [...treeScene(5), note('note', 420, -60, 'each block is one call fib(k)\nred: computed before\nfib(5) → 15 calls', { tone: 'miss' })] },
    },
    {
      chapter: 'idea',
      short: 'Bottom-up',
      title: 'Compute each F(i) once, smallest first',
      body: 'There are only `n + 1` different questions: F(0) … F(n). Answer them in order, from small to big, and each one is a single addition of two answers you already have: **F(i) = F(i − 1) + F(i − 2)**.\n\nThat is dynamic programming: a recursion whose subproblems repeat, solved once each and remembered.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          ...scene({ n: N, phase: 'add', i: 4, known: fibs(4), bare: true, keepAll: true }),
          note('note', NOTE_X, VARS_Y, 'F(i) = F(i − 1) + F(i − 2)\nF(4) = F(3) + F(2) = 2 + 1 = 3\nn − 1 additions in total'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Keep two',
      title: 'Only the last two values matter',
      body: 'To make F(5) you need F(4) and F(3). F(0) … F(2) will never be read again, so there is no need to keep a whole table.\n\nTwo variables are enough: `prev2` and `prev1`, the two values just behind the one being made.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, phase: 'shift', i: 4, known: fibs(4), bare: true, note: 'grey: never read again\nkeep prev2 = F(3), prev1 = F(4)\nmemory: 2 numbers, not n + 1' }) },
    },
    {
      chapter: 'build',
      short: 'Base case',
      title: 'Lines 2–3: F(0) and F(1) are known',
      body: 'The recurrence needs two values behind it, so the first two are answered directly: line 3 returns `n` itself when `n` is 0 or 1.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if n <= 1: return n'],
      scene: { entities: scene({ n: N, phase: 'bare', known: [0, 1], bare: true, note: 'F(0) = 0, F(1) = 1\nno work needed' }) },
    },
    {
      chapter: 'build',
      short: 'Seed',
      title: 'Line 4: hold the first two values',
      body: '`prev2` starts as F(0) = 0 and `prev1` as F(1) = 1. These are the two values behind F(2), the first one to compute.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [4] },
      metrics: startMetrics,
      changes: ['prev2, prev1 = 0, 1'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Roll',
      title: 'Lines 5–6: make the next value, then step forward',
      body: 'Line 5 walks `i` from 2 to `n`. Line 6 is the recurrence: the new value is `prev2 + prev1`, then the pair moves one slot right, so `prev1` always holds F(i).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['for i in range(2, n + 1)', 'prev2, prev1 = prev1, prev2 + prev1'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 7: the last value made is F(n)',
      body: 'After the turn for `i = n`, `prev1` holds F(n), and line 7 returns it.\n\nThat’s the whole function. Now let’s run it on `n = 6`.',
      code: { view: 'final', lines: [7] },
      metrics: startMetrics,
      changes: ['return prev1'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n − 1 additions: O(n) time, O(1) space',
      body: 'Each F(i) costs one addition, so it’s **`O(n)` time** instead of `O(2ⁿ)`, and only two numbers are kept: **`O(1)` space**. A memo dictionary (top-down) is also `O(n)` time but stores all `n + 1` values plus the call stack.\n\nSwitch to **🧪 Try your own** to run it on any `n` from 0 to 9.',
      code: { view: 'final', lines: [5, 6] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, phase: 'done', known: fibs(N), note: 'recursion: 25 calls for n = 6\nthis loop: 5 additions\nn = 50: 4·10¹⁰ calls vs 49 additions', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Both at once',
      title: 'Why line 6 assigns both names at once',
      body: 'Python works out the whole right side `prev1, prev2 + prev1` **before** it assigns anything, so the sum uses the old `prev2`.\n\nThat is the key decision. Split into two lines, `prev2 = prev1` would overwrite F(i − 2) first, and `prev1 = prev2 + prev1` would just double `prev1`: 1, 2, 4, 8… instead of Fibonacci.',
      code: { view: 'final', lines: [6] },
      values: { 6: 'right side first: (2, 1 + 2)' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, phase: 'add', i: 4, known: fibs(4), note: 'old prev2 = 1, old prev1 = 2\none line: prev1 = 1 + 2 = 3 ✓\ntwo lines: prev1 = 2 + 2 = 4 ✗', noteTone: 'note' }) },
    },
  ],
  trace: {
    title: 'Run fib_dp on your own n',
    inputs: [{ name: 'n', label: 'n (0 to 9)', kind: 'number', default: '7' }],
    presets: [
      { label: 'n = 0', values: { n: '0' } },
      { label: 'n = 1', values: { n: '1' } },
      { label: 'n = 2', values: { n: '2' } },
      { label: 'Lesson example', values: { n: '6' } },
      { label: 'n = 9', values: { n: '9' } },
    ],
    run: (values) => {
      const n = values['n'];
      if (typeof n !== 'number' || n < 0 || n > 9) throw new Error('Pick n from 0 to 9, so the row fits on the stage.');
      return traceFib(n);
    },
  },
});
