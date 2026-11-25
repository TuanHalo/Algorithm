import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, graphInputs, lineValues, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** Matrix rows stack downwards, starting right of x = 0 so the row labels clear the graph. */
const ROW_GAP = 74;
const TABLE_X = 110;
const INF = Number.POSITIVE_INFINITY;
const MAX_N = 4;
const showDist = (d: number): string => (d === INF ? '∞' : String(d));

interface FwState {
  readonly g: Graph;
  readonly dist: readonly (readonly number[])[];
  readonly k?: number;
  readonly i?: number;
  readonly j?: number;
  readonly viaK?: number;
  readonly verdict?: 'better' | 'no' | 'updated';
  /** Cells improved so far, as "i,j". */
  readonly improved: ReadonlySet<string>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: FwState): Entity[] {
  const n = s.g.n;
  const entities: Entity[] = drawGraph(s.g, {
    node: (v) => {
      if (s.done) return { tone: 'found' };
      if (v === s.k) return { tone: 'active' };
      if (v === s.i || v === s.j) return { tone: 'compare' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  s.dist.forEach((row, r) => {
    const tones: Record<number, Tone> = {};
    row.forEach((_, c) => {
      const isTarget = r === s.i && c === s.j;
      const isTerm = (r === s.i && c === s.k) || (r === s.k && c === s.j);
      if (isTarget) tones[c] = s.verdict === 'updated' ? 'found' : s.verdict === 'no' ? 'miss' : 'active';
      else if (isTerm) tones[c] = 'compare';
      else if (s.done) tones[c] = 'found';
      else if (s.improved.has(`${r},${c}`)) tones[c] = 'done';
      else if (r === s.k || c === s.k) tones[c] = 'default';
      else tones[c] = 'default';
    });
    entities.push(arr(`row-${r}`, TABLE_X, r * ROW_GAP, row.map(showDist), { label: `dist[${r}]`, tones, codeVar: 'dist', showIndex: r === n - 1 }));
  });
  const dash = (x: number | string | undefined): number | string => x ?? '—';
  const right = TABLE_X + tableBesideArray(n, n);
  entities.push(
    vars(
      'vals',
      right,
      0,
      [
        { name: 'k', value: dash(s.k), tone: s.k === undefined ? 'muted' : 'default' },
        { name: 'i', value: dash(s.i), tone: s.i === undefined ? 'muted' : 'default' },
        { name: 'j', value: dash(s.j), tone: s.j === undefined ? 'muted' : 'default' },
        { name: 'via_k', value: s.viaK === undefined ? '—' : showDist(s.viaK), tone: s.viaK === undefined ? 'muted' : s.verdict === 'no' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 160 },
    ),
  );
  if (s.note) entities.push(note('note', right, 270, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** The starting matrix: 0 on the diagonal, the edge weight where an edge exists, infinity elsewhere. */
function initialDist(g: Graph): number[][] {
  const dist = Array.from({ length: g.n }, (_, r) => Array.from({ length: g.n }, (_, c) => (r === c ? 0 : INF)));
  for (const e of g.edges) {
    const row = dist[e.u];
    if (row) row[e.v] = Math.min(row[e.v] ?? INF, e.w ?? 1);
  }
  return dist;
}

/**
 * Runs Floyd-Warshall and records every (k, i, j) iteration: each step computes
 * via_k and compares it with dist[i][j]; every improvement is its own step.
 */
function traceFloyd(g: Graph): Step[] {
  const n = g.n;
  const dist = initialDist(g);
  const steps: Step[] = [];
  const improved = new Set<string>();
  let tries = 0;
  let updates = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<FwState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { tries, updates, result: e.result ?? '—' },
      scene: { entities: scene({ g, dist: dist.map((r) => [...r]), improved: new Set(improved), ...view }) },
    });
  };
  const cell = (r: number, c: number): number => dist[r]?.[c] ?? INF;

  emit({
    short: 'Start',
    title: 'dist starts as the direct edges',
    body: `The input \`dist\` holds 0 on the diagonal, each edge's weight, and infinity where there is no direct edge. Line 2 will try every vertex as the in-between stop \`k\`, from 0 to ${n - 1}.`,
    lines: [1, 2],
    values: { 1: `n = ${n}` },
  });

  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        tries += 1;
        const viaK = cell(i, k) + cell(k, j);
        const old = cell(i, j);
        const better = viaK < old;
        const firstOfK = i === 0 && j === 0;
        const reason =
          i === k || j === k
            ? ` (${i === k ? 'i' : 'j'} is k itself, so this can't be shorter)`
            : i === j
              ? ' (a loop back to the start never beats 0)'
              : '';
        emit(
          {
            short: `${i}→${j} via ${k}`,
            title: better ? `${i} → ${k} → ${j} costs ${showDist(viaK)}: shorter!` : `${i} → ${k} → ${j} costs ${showDist(viaK)}: not shorter`,
            body: `${firstOfK ? `Line 2: \`k = ${k}\`, so every route may now pass through ${k}. ` : ''}Lines 3–4: \`i, j = ${i}, ${j}\`. Line 5: \`via_k = dist[${i}][${k}] + dist[${k}][${j}] = ${showDist(cell(i, k))} + ${showDist(cell(k, j))} = ${showDist(viaK)}\`. Line 6: against \`dist[${i}][${j}] = ${showDist(old)}\`${better ? ': shorter.' : `: not shorter${reason}.`}`,
            lines: firstOfK ? [2, 3, 4, 5, 6] : [3, 4, 5, 6],
            values: { 2: firstOfK ? `k = ${k}` : undefined, 3: `i = ${i}`, 4: `j = ${j}`, 5: `via_k = ${showDist(viaK)}`, 6: `${showDist(viaK)} < ${showDist(old)} → ${better ? 'True' : 'False'}` },
          },
          { k, i, j, viaK, verdict: better ? 'better' : 'no' },
        );
        if (!better) continue;
        const row = dist[i];
        if (row) row[j] = viaK;
        improved.add(`${i},${j}`);
        updates += 1;
        emit(
          {
            short: `dist[${i}][${j}] = ${viaK}`,
            title: `Remember it: dist[${i}][${j}] = ${viaK}`,
            body: `Line 8 stores the shorter route: \`dist[${i}][${j}] = ${viaK}\`${old === INF ? ` (there was no route before)` : `, down from ${old}`}. Later stops \`k\` build on this value.`,
            lines: [8],
            values: { 8: `dist[${i}][${j}] = ${viaK}` },
          },
          { k, i, j, viaK, verdict: 'updated' },
        );
      }
    }
  }
  emit(
    {
      short: 'Return',
      title: 'Every pair holds its shortest distance',
      body: `All ${n} stops have been tried for all ${n * n} pairs (${tries} tries, ${updates} improvement${updates === 1 ? '' : 's'}). Line 9 returns the matrix: row \`i\`, column \`j\` is the cheapest cost from i to j.`,
      lines: [9],
      values: { 9: `return ${pyList(dist.map((r) => pyList(r.map(showDist))))}` },
      result: `${updates} update${updates === 1 ? '' : 's'}`,
    },
    { done: true },
  );
  return steps;
}

// Story graph: a directed triangle 0 → 1 → 2 → 0. No pair except the edges themselves starts connected.
const G: Graph = {
  n: 3,
  directed: true,
  edges: [
    { u: 0, v: 1, w: 4 },
    { u: 1, v: 2, w: 1 },
    { u: 2, v: 0, w: 2 },
  ],
};
const RUN = traceFloyd(G);
const RUN_START = 6;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`floyd-warshall: no run step "${short}"`);
  return i;
};
const startMetrics = { tries: 0, updates: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const VIA_1 = find('0→2 via 1');
const VIA_2 = find('1→0 via 2');
const FINAL = [
  [0, 4, 5],
  [3, 0, 1],
  [2, 6, 0],
];

export default defineWalkthrough({
  id: 'learn/graph/floyd-warshall',
  title: 'Floyd-Warshall, every pair at once',
  summary: 'From the idea to the code: fill the whole table of shortest distances by allowing one more in-between stop at a time.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def floyd_warshall(n: int, dist: list[list[float]]) -> list[list[float]]:
    for k in range(n):
        for i in range(n):
            for j in range(n):
                via_k = dist[i][k] + dist[k][j]
                if via_k < dist[i][j]:
                    # Going through k is shorter: remember it
                    dist[i][j] = via_k
    return dist`,
  },
  metrics: [
    { key: 'tries', label: 'Pairs tried' },
    { key: 'updates', label: 'Improvements' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'the stop k / pair being tried' },
    { tone: 'compare', label: 'i and j / the two legs via k' },
    { tone: 'miss', label: 'not shorter' },
    { tone: 'done', label: 'improved earlier' },
    { tone: 'found', label: 'just improved / final table' },
  ],
  goals: [
    { text: 'Allow one more in-between stop at a time', step: 2 },
    { text: 'Price a route through k from two cells', step: 3 },
    { text: 'Watch all 27 tries and every improvement', step: RUN_START + 1 },
    { text: 'Know why k must be the outer loop', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Shortest distance between every pair',
      body: 'Like the mileage chart in a road atlas: one table with the shortest drive between every two cities.\n\nLine 1 takes `n` and the matrix `dist`, filled with the direct edges (∞ where there is none), and turns it in place into all-pairs shortest distances.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: at(0),
    },
    {
      chapter: 'idea',
      short: 'One stop',
      title: 'Allow stops one at a time: 0, then 0–1, then 0–2',
      body: 'Start with direct edges only. Then allow vertex 0 as a stop: 2 → 0 → 1 costs 2 + 4 = 6. Then allow 1 too: 0 → 1 → 2 costs 5. After allowing every vertex, every route is covered.\n\nEach new stop `k` only asks one question per pair: is `i → k → j` shorter than what we have?',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, dist: FINAL, improved: new Set(['2,1', '0,2', '1,0']), note: 'via 0: 2 → 1 = 6\nvia 1: 0 → 2 = 5\nvia 2: 1 → 0 = 3' }) },
    },
    {
      chapter: 'idea',
      short: 'Two legs',
      title: 'i → k → j is two cells you already have',
      body: 'The best `i → k` and `k → j` costs are already in the table (`dist[i][k]` and `dist[k][j]`), using only earlier stops. Their sum is the best route through `k`. No path search needed, just additions.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(VIA_1),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 2–4: every stop k, then every pair (i, j)',
      body: 'The **outer** loop picks the stop `k`; the two inner loops visit every pair.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['for k in range(n):', 'for i in range(n):', 'for j in range(n):'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Via k',
      title: 'Lines 5–7: add the two legs, compare',
      body: 'Line 5 adds the two legs through `k`; line 6 compares with the best route so far.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['via_k = dist[i][k] + dist[k][j]', 'if via_k < dist[i][j]:'],
      scene: at(VIA_1),
    },
    {
      chapter: 'build',
      short: 'Keep it',
      title: 'Lines 8–9: keep the shorter one, return the table',
      body: 'Line 8 overwrites the cell in place, and line 9 returns the finished table.\n\nNow let’s run all 3 × 3 × 3 = 27 tries. Each step computes `via_k` and compares it; an improvement gets its own step.',
      code: { view: 'final', lines: [8, 9] },
      metrics: startMetrics,
      changes: ['dist[i][j] = via_k', 'return dist'],
      scene: at(VIA_1 + 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Three nested loops: O(V³)',
      body: 'Lines 2–4 run `n × n × n` times, each a constant amount of work: **`O(V³)` time**. The table is updated in place: **`O(V²)` space**. Fine for a few hundred vertices; a negative number on the diagonal at the end would reveal a negative cycle.',
      code: { view: 'final', lines: [2, 3, 4] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, dist: FINAL, improved: new Set(['2,1', '0,2', '1,0']), done: true, note: 'n = 3 → 27 tries\nn = 400 → 64,000,000', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'k outside',
      title: 'Why the stop k is the outer loop',
      body: 'When `k = 2` tried `1 → 2 → 0`, the leg `dist[2][0]` had to be final for stops 0 and 1 already, and it was, because those `k` rounds had finished for **every** pair. With `k` as an inner loop, a pair would be judged before its legs were ready.\n\nPutting `k` outermost is the key decision: it makes each round use only completed earlier rounds.',
      code: { view: 'final', lines: [2, 5] },
      values: { 2: 'k = 2: stops 0 and 1 done', 5: 'via_k = 1 + 2 = 3' },
      metrics: FINAL_METRICS,
      scene: at(VIA_2),
    },
  ],
  trace: {
    title: 'Run Floyd-Warshall on your own graph',
    inputs: graphInputs({ n: 3, from: '0, 1, 2', to: '1, 2, 0', weight: '4, 1, 2' }),
    presets: [
      { label: 'Negative edge', values: { n: '3', from: '0, 1, 0', to: '1, 2, 2', weight: '4, -2, 3' } },
      { label: 'Disconnected', values: { n: '3', from: '0', to: '1', weight: '5' } },
      { label: 'Four vertices', values: { n: '4', from: '0, 1, 2, 0', to: '1, 2, 3, 3', weight: '1, 1, 1, 5' } },
    ],
    maxItems: 8,
    run: (values) => {
      const g = parseGraph(values, { directed: true, weighted: true, allowEmpty: false });
      if (g.n > MAX_N) throw new Error(`The table fits up to ${MAX_N} vertices here (${MAX_N ** 3} tries).`);
      return traceFloyd(g);
    },
  },
});
