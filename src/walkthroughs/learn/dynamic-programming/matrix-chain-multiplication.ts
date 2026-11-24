import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * `p` (the dimensions) on top. Below it, row `dp-i` holds dp[i][j] for
 * j = 1…n (the unused row and column 0 are not drawn); i > j is blank.
 */
const TOP = 130;
const ROW_Y = 100;

type Phase = 'bare' | 'init' | 'start' | 'cost' | 'keep' | 'done';

interface ChainState {
  readonly p: readonly number[];
  readonly phase: Phase;
  /** dp values known so far, keyed "i,j". */
  readonly dp: ReadonlyMap<string, number>;
  readonly i?: number;
  readonly j?: number;
  readonly k?: number;
  readonly cost?: number;
  /** In a keep step, whether the cost beat dp[i][j]. */
  readonly better?: boolean;
  /** Current dp[i][j] while it is being minimised (∞ before the first k). */
  readonly current?: number;
  readonly cellTones?: Readonly<Record<string, Tone>>;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const key = (i: number, j: number): string => `${i},${j}`;
const rowId = (i: number): string => `dp-${i}`;
const fmt = (v: number | undefined): string => (v === undefined ? '·' : v === Infinity ? '∞' : String(v));

/** Scene: p with the three dimensions in play, the dp triangle, the two halves read, and the variables. */
function scene(s: ChainState): Entity[] {
  const { p, phase, i, j, k } = s;
  const n = p.length - 1;
  const entities: Entity[] = [];
  const splitting = (phase === 'cost' || phase === 'keep') && i !== undefined && j !== undefined && k !== undefined;

  const pTones: Record<number, Tone> = {};
  if (splitting) for (const d of [i - 1, k, j]) pTones[d] = 'compare';
  entities.push(arr('p', 0, 0, p, { label: 'p', tones: pTones, codeVar: 'p' }));

  for (let r = 1; r <= n; r += 1) {
    const values: ScalarValue[] = [];
    const tones: Record<number, Tone> = {};
    for (let c = 1; c <= n; c += 1) {
      const idx = c - 1;
      if (c < r) {
        values.push(' ');
        tones[idx] = 'muted';
        continue;
      }
      const isCurrent = i === r && j === c && s.current !== undefined && phase !== 'done';
      const v = isCurrent ? s.current : s.dp.get(key(r, c));
      values.push(fmt(v));
      tones[idx] = s.cellTones?.[key(r, c)] ?? (v === undefined ? 'muted' : 'done');
    }
    if (i === r && j !== undefined && phase !== 'done' && phase !== 'bare') tones[j - 1] = 'active';
    if (splitting) {
      if (r === i) tones[k - 1] = 'compare';
      if (r === k + 1) tones[j - 1] = 'compare';
    }
    if (phase === 'done' && r === 1) tones[n - 1] = 'found';
    entities.push(arr(rowId(r), 0, TOP + (r - 1) * ROW_Y, values, { label: `i=${r}`, tones, codeVar: 'dp', indexLabels: values.map((_, c) => `j=${c + 1}`) }));
  }

  if (splitting) {
    const to = { entity: rowId(i), index: j - 1, side: 'top' as const };
    const tone: Tone = phase === 'keep' ? (s.better ? 'found' : 'miss') : 'compare';
    entities.push(link('left-part', { entity: rowId(i), index: k - 1, side: 'top' }, to, { tone, dashed: phase === 'keep' && !s.better, flow: phase === 'keep' && s.better, label: `A${i}..A${k}` }));
    entities.push(link('right-part', { entity: rowId(k + 1), index: j - 1, side: 'top' }, to, { tone, dashed: phase === 'keep' && !s.better, flow: phase === 'keep' && s.better, label: `A${k + 1}..A${j}` }));
  }

  if (!s.bare) {
    const dash = '—';
    const live = phase !== 'init' && phase !== 'done' && i !== undefined && j !== undefined;
    entities.push(
      vars(
        'vals',
        tableBesideArray(Math.max(p.length, n), 5),
        0,
        [
          { name: 'length', value: live ? j - i + 1 : dash, tone: live ? 'default' : 'muted' },
          { name: 'i', value: live ? i : dash, tone: live ? 'default' : 'muted' },
          { name: 'j', value: live ? j : dash, tone: live ? 'default' : 'muted' },
          { name: 'k', value: splitting ? k : dash, tone: splitting ? 'default' : 'muted' },
          { name: 'cost', value: splitting && s.cost !== undefined ? s.cost : dash, tone: phase === 'keep' ? (s.better ? 'found' : 'miss') : splitting ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, TOP + n * ROW_Y + 50, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs matrix_chain_order(p) and records one step per decision (chapter "run", final code). */
function traceChain(p: readonly number[]): Step[] {
  const steps: Step[] = [];
  const n = p.length - 1;
  let splits = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ splits, result });
  const dp = new Map<string, number>();
  for (let d = 1; d <= n; d += 1) dp.set(key(d, d), 0);
  const dims = (a: number): string => `${p[a - 1] ?? 0}×${p[a] ?? 0}`;

  steps.push({
    chapter: 'run',
    short: 'Setup',
    title: `${n} matri${n === 1 ? 'x' : 'ces'}, single ones cost 0`,
    body: `Line 2: \`p\` has ${p.length} numbers, so \`n = ${n}\` matri${n === 1 ? 'x' : 'ces'}: ${Array.from({ length: n }, (_, a) => `A${a + 1} is ${dims(a + 1)}`).join(', ')}. Line 3 fills the table with 0; the diagonal \`dp[i][i] = 0\` is already right, one matrix needs no multiplication.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `n = ${n}`, 3: `dp = ${n + 1} × ${n + 1} zeros` },
    metrics: metrics(),
    scene: { entities: scene({ p, phase: 'init', dp: new Map(dp) }) },
  });

  for (let length = 2; length <= n; length += 1) {
    for (let i = 1; i <= n - length + 1; i += 1) {
      const j = i + length - 1;
      const first = i === 1;
      steps.push({
        chapter: 'run',
        short: `A${i}..A${j}`,
        title: `Chain A${i}..A${j}: start at ∞`,
        body: `${first ? `Line 4 moves to \`length = ${length}\`. ` : ''}Line 5 sets \`i = ${i}\`, line 6 \`j = ${j}\`: the chain A${i}…A${j}. Line 7 starts \`dp[${i}][${j}]\` at infinity, so the first split tried always wins.`,
        code: { view: 'final', lines: first ? [4, 5, 6, 7] : [5, 6, 7] },
        values: first ? { 4: `length = ${length}`, 5: `i = ${i}`, 6: `j = ${j}`, 7: `dp[${i}][${j}] = inf` } : { 5: `i = ${i}`, 6: `j = ${j}`, 7: `dp[${i}][${j}] = inf` },
        metrics: metrics(),
        scene: { entities: scene({ p, phase: 'start', dp: new Map(dp), i, j, current: Infinity }) },
      });
      let current = Infinity;
      for (let k = i; k < j; k += 1) {
        const leftCost = dp.get(key(i, k)) ?? 0;
        const rightCost = dp.get(key(k + 1, j)) ?? 0;
        const last = (p[i - 1] ?? 0) * (p[k] ?? 0) * (p[j] ?? 0);
        const cost = leftCost + rightCost + last;
        splits += 1;
        steps.push({
          chapter: 'run',
          short: `k = ${k}`,
          title: `Split after A${k}: ${leftCost} + ${rightCost} + ${last} = ${cost}`,
          body: `Line 8 tries \`k = ${k}\`: (A${i}…A${k}) × (A${k + 1}…A${j}). Line 9 adds the left part (${leftCost}), the right part (${rightCost}) and the last multiplication, a ${p[i - 1]}×${p[k]} result times a ${p[k]}×${p[j]} one: \`${p[i - 1]} · ${p[k]} · ${p[j]} = ${last}\`.`,
          code: { view: 'final', lines: [8, 9] },
          values: { 8: `k = ${k}`, 9: `cost = ${leftCost} + ${rightCost} + ${last} = ${cost}` },
          metrics: metrics(),
          scene: { entities: scene({ p, phase: 'cost', dp: new Map(dp), i, j, k, cost, current }) },
        });
        const better = cost < current;
        const before = current;
        if (better) current = cost;
        steps.push({
          chapter: 'run',
          short: better ? 'Cheaper' : 'Not cheaper',
          title: better ? `${cost} < ${fmt(before)}: dp[${i}][${j}] = ${cost}` : `${cost} < ${fmt(before)} is false`,
          body: better
            ? `Line 10: \`${cost} < ${fmt(before)}\` is true, so line 11 records it: \`dp[${i}][${j}] = ${cost}\`.`
            : `Line 10: \`${cost} < ${fmt(before)}\` is false. Splitting after A${k} costs more, so \`dp[${i}][${j}]\` stays ${fmt(before)}.`,
          code: { view: 'final', lines: better ? [10, 11] : [10] },
          values: better ? { 10: `${cost} < ${fmt(before)} → True`, 11: `dp[${i}][${j}] = ${cost}` } : { 10: `${cost} < ${fmt(before)} → False` },
          metrics: metrics(),
          scene: { entities: scene({ p, phase: 'keep', dp: new Map(dp), i, j, k, cost, current, better }) },
        });
      }
      dp.set(key(i, j), current);
    }
  }

  const answer = dp.get(key(1, n)) ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Cheapest order: ${answer} multiplications`,
    body: `${n === 1 ? 'One matrix: line 4’s loop never ran. ' : 'Every chain is solved. '}Line 12 returns \`dp[1][${n}]\`, the whole chain A1…A${n}: **${answer}**.`,
    code: { view: 'final', lines: [12] },
    values: { 12: `return ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ p, phase: 'done', dp: new Map(dp) }) },
  });
  return steps;
}

/** Final table for p. */
function chainTable(p: readonly number[]): Map<string, number> {
  const n = p.length - 1;
  const dp = new Map<string, number>();
  for (let d = 1; d <= n; d += 1) dp.set(key(d, d), 0);
  for (let length = 2; length <= n; length += 1) {
    for (let i = 1; i <= n - length + 1; i += 1) {
      const j = i + length - 1;
      let best = Infinity;
      for (let k = i; k < j; k += 1) best = Math.min(best, (dp.get(key(i, k)) ?? 0) + (dp.get(key(k + 1, j)) ?? 0) + (p[i - 1] ?? 0) * (p[k] ?? 0) * (p[j] ?? 0));
      dp.set(key(i, j), best);
    }
  }
  return dp;
}

/** How often the naive recursion solves each chain (i, j). */
function naiveCalls(n: number): Map<string, number> {
  const calls = new Map<string, number>();
  const go = (i: number, j: number): void => {
    calls.set(key(i, j), (calls.get(key(i, j)) ?? 0) + 1);
    for (let k = i; k < j; k += 1) {
      go(i, k);
      go(k + 1, j);
    }
  };
  go(1, n);
  return calls;
}

const P = [10, 20, 30, 40, 30] as const;
const N = P.length - 1;
const RUN = traceChain(P);
const startMetrics = { splits: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
const TABLE = chainTable(P);
const CALLS = naiveCalls(N);
const TOTAL_CALLS = [...CALLS.values()].reduce((x, y) => x + y, 0);
const DIAG = new Map(Array.from({ length: N }, (_, d) => [key(d + 1, d + 1), 0] as const));
const upToLength = (len: number): Map<string, number> => new Map([...TABLE].filter(([kk]) => {
  const [a, b] = kk.split(',').map(Number);
  return (b ?? 0) - (a ?? 0) + 1 <= len;
}));

/** Scene of run step n (0-based), so build steps show the moment they describe. */
function at(n: number): Step['scene'] {
  return RUN[n]?.scene ?? { entities: [] };
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/matrix-chain-multiplication',
  title: 'Matrix Chain Multiplication, the best last split',
  summary: 'From the idea to the code: find the cheapest order to multiply a chain of matrices by trying every place to split it, shortest chains first.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `def matrix_chain_order(p: list[int]) -> int:
    n = len(p) - 1  # Matrix i is p[i - 1] x p[i], for i = 1..n
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    for length in range(2, n + 1):  # Shorter chains must be solved first
        for i in range(1, n - length + 2):
            j = i + length - 1
            dp[i][j] = float("inf")
            for k in range(i, j):
                cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]
                if cost < dp[i][j]:
                    dp[i][j] = cost
    return dp[1][n]`,
  },
  snapshots: {
    brute: `def matrix_chain_order(p: list[int]) -> int:
    def cost(i: int, j: int) -> int:
        if i == j:
            return 0  # One matrix: nothing to multiply
        return min(
            cost(i, k) + cost(k + 1, j) + p[i - 1] * p[k] * p[j]
            for k in range(i, j)
        )
    return cost(1, len(p) - 1)`,
  },
  metrics: [
    { key: 'splits', label: 'Splits tried' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'dp[i][j] being solved' },
    { tone: 'compare', label: 'the two halves, the 3 dimensions' },
    { tone: 'done', label: 'solved' },
    { tone: 'muted', label: 'not yet / unused' },
    { tone: 'miss', label: 'costlier split / repeated call' },
    { tone: 'found', label: 'cheaper split / answer' },
  ],
  goals: [
    { text: 'See why the order of multiplication matters', step: 1 },
    { text: 'Split a chain at its last multiplication', step: 3 },
    { text: 'Try every split of a chain, one by one', step: BUILD_END + 11 },
    { text: 'Know where p[i − 1] · p[k] · p[j] comes from', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Multiply a chain of matrices as cheaply as possible',
      body: 'Multiplying an `a×b` matrix by a `b×c` one takes `a·b·c` scalar multiplications. The result is the same in any grouping, but the cost isn’t. Line 1 gets the sizes as `p` (matrix `i` is `p[i − 1] × p[i]`) and returns the cheapest total.\n\nHere `p = [10, 20, 30, 40, 30]`: A1 10×20, A2 20×30, A3 30×40, A4 40×30. The answer is **30000**, from `((A1 A2) A3) A4`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ p: P, phase: 'bare', dp: DIAG, bare: true, note: '((A1 A2) A3) A4: 6000 + 12000 + 12000\n= 30000 ✓\nA1 (A2 (A3 A4)): 36000 + 18000 + 6000 = 60000' }) },
    },
    {
      chapter: 'idea',
      short: 'Every split',
      title: 'The obvious way: try every split, recursively',
      body: `Lines 5–8 try every place \`k\` for the last multiplication and solve both sides the same way. Each cell shows how often \`cost(i, j)\` runs: ${TOTAL_CALLS} calls for 4 matrices, small chains again and again (red).\n\nEach extra matrix roughly triples the calls: **\`O(3ⁿ)\`**.`,
      code: { view: 'snapshot', id: 'brute', lines: [5, 6, 7] },
      metrics: startMetrics,
      scene: {
        entities: scene({
          p: P,
          phase: 'bare',
          dp: CALLS,
          bare: true,
          cellTones: Object.fromEntries([...CALLS].map(([kk, v]) => [kk, v > 1 ? 'miss' : 'done'] as const)),
          note: 'number = calls of cost(i, j)\nonly 10 different chains exist',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Last split',
      title: 'Every grouping ends with one last multiplication',
      body: 'The final step multiplies (A_i…A_k) by (A_k+1…A_j) for some `k`, and each side should itself be done the cheapest way. So **dp[i][j] = min over k of dp[i][k] + dp[k + 1][j] + p[i − 1]·p[k]·p[j]**.\n\nBoth sides are shorter chains, so solve chains by length: 1 (free), then 2, 3, …',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ p: P, phase: 'keep', dp: upToLength(2), i: 1, j: 3, k: 2, cost: 18000, current: 18000, better: true, bare: true, note: 'A1..A3 split after A2:\ndp[1][2] + dp[3][3] + 10·30·40\n= 6000 + 0 + 12000 = 18000' }) },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–3: n matrices, a table of zeros',
      body: '`p` has one more number than there are matrices. Line 3’s zeros already answer every single matrix, `dp[i][i] = 0`.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['n = len(p) - 1', 'dp = [[0] * (n + 1) for _ in range(n + 1)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Chains',
      title: 'Lines 4–6: every chain, shortest first',
      body: 'Line 4 walks chain lengths from 2; line 5 picks the start `i`, line 6 works out the end `j`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [4, 5, 6] },
      metrics: startMetrics,
      changes: ['for length in range(2, n + 1)', 'for i in range(1, n - length + 2)', 'j = i + length - 1'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Infinity',
      title: 'Line 7: no split tried yet',
      body: 'Starting at infinity means the first split’s cost always replaces it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [7] },
      metrics: startMetrics,
      changes: ['dp[i][j] = float("inf")'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Cost',
      title: 'Lines 8–9: the cost of splitting after A_k',
      body: 'Line 8 tries each split `k`; line 9 is the recurrence: left part, right part, plus the last multiplication.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['for k in range(i, j)', 'cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Keep',
      title: 'Lines 10–11: keep the cheapest',
      body: 'A cheaper split replaces the best so far.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['if cost < dp[i][j]: dp[i][j] = cost'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 12: the whole chain',
      body: '`dp[1][n]` is the cheapest way to multiply all `n` matrices, so line 12 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [12] },
      metrics: startMetrics,
      changes: ['return dp[1][n]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n² chains × n splits: O(n³)',
      body: 'There are about `n²/2` chains and each tries up to `n` splits, so it’s **`O(n³)` time** and **`O(n²)` space** for the table. The recursion alone makes about `3ⁿ` calls.\n\nSwitch to **🧪 Try your own** to try other sizes.',
      code: { view: 'final', lines: [4, 5, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ p: P, phase: 'done', dp: TABLE, note: `4 matrices: 10 splits tried\nrecursion: ${TOTAL_CALLS} calls\nn = 20: ~1300 splits vs ~10⁹ calls`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Last product',
      title: 'Where p[i − 1] · p[k] · p[j] comes from',
      body: 'Whatever happens inside, A_i…A_k ends up as one `p[i − 1] × p[k]` matrix and A_k+1…A_j as one `p[k] × p[j]` matrix. Multiplying those two costs `p[i − 1]·p[k]·p[j]`, and only the outer dimensions matter.\n\nThat is the key decision: it makes the last step’s cost known without knowing how each side was grouped, so the sides can be solved on their own.',
      code: { view: 'final', lines: [9] },
      values: { 9: 'k = 3: 18000 + 0 + 10·40·30 = 30000' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ p: P, phase: 'keep', dp: TABLE, i: 1, j: 4, k: 3, cost: 30000, current: 30000, better: true, note: '(A1 A2 A3) is 10×40, A4 is 40×30\nlast product: 10 · 40 · 30 = 12000\n18000 + 0 + 12000 = 30000' }) },
    },
  ],
  trace: {
    title: 'Run matrix_chain_order on your own sizes',
    inputs: [{ name: 'p', label: 'p (sizes, 1 to 50)', kind: 'numbers', default: '5, 10, 3, 12' }],
    presets: [
      { label: 'Lesson example', values: { p: '10, 20, 30, 40, 30' } },
      { label: 'Two matrices', values: { p: '10, 40, 5' } },
      { label: 'One matrix', values: { p: '10, 20' } },
      { label: 'Order matters', values: { p: '10, 50, 5, 40' } },
    ],
    maxItems: 5,
    run: (values) => {
      const p = values['p'];
      if (!Array.isArray(p) || p.length < 2) throw new Error('Enter at least two sizes (one matrix).');
      if (p.some((d) => d < 1 || d > 50)) throw new Error('Sizes go from 1 to 50.');
      return traceChain(p);
    },
  },
});
