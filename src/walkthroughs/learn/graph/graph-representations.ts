import { arr, defineWalkthrough, map, note } from '../../../lib/walkthrough/helpers';
import { drawGraph, graphInputs, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** Matrix rows stack downwards, one array per vertex; the adjacency list stands right of them. */
const ROW_GAP = 74;
/** Tables start right of x = 0 so the lowest matrix row's label stays clear of the graph. */
const TABLE_X = 110;
const MAX_N = 5;

interface RepState {
  readonly g: Graph;
  readonly lists: readonly (readonly number[])[];
  readonly matrix: readonly (readonly number[])[];
  /** Edge being recorded, and which half of it (u → v first, then the mirror v → u). */
  readonly edge?: number;
  readonly half?: 'forward' | 'mirror';
  /** Edges already recorded both ways. */
  readonly recorded: number;
  /** Show only the graph (problem chapter). */
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: RepState): Entity[] {
  const e = s.edge !== undefined ? s.g.edges[s.edge] : undefined;
  const from = e && s.half === 'mirror' ? e.v : e?.u;
  const to = e && s.half === 'mirror' ? e.u : e?.v;
  const entities: Entity[] = drawGraph(s.g, {
    node: (k) => ({ tone: k === from ? 'active' : k === to ? 'compare' : s.done ? 'done' : 'default' }),
    edge: (i) =>
      i === s.edge
        ? { tone: 'compare', label: `${from} → ${to}` }
        : { tone: i < s.recorded || s.done ? 'done' : 'default' },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 40, 0, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const n = s.g.n;
  s.matrix.forEach((row, r) => {
    const tones: Record<number, Tone> = {};
    row.forEach((cell, c) => {
      tones[c] = r === from && c === to ? 'active' : cell === 1 ? 'done' : 'default';
    });
    entities.push(arr(`row-${r}`, TABLE_X, r * ROW_GAP, row, { label: `matrix[${r}]`, tones, codeVar: 'matrix', showIndex: r === n - 1 }));
  });
  entities.push(
    map(
      'adj-list',
      TABLE_X + tableBesideArray(n, n) + 30,
      0,
      'adj_list',
      s.lists.map((list, u) => ({ key: u, value: pyList(list), ...(u === from ? { tone: 'active' as const } : {}) })),
      { codeVar: 'adj_list', width: 160 },
    ),
  );
  if (s.note) entities.push(note('note', TABLE_X + tableBesideArray(n, n) + 30, n * 38 + 110, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const emptyMatrix = (n: number): number[][] => Array.from({ length: n }, () => Array.from({ length: n }, () => 0));

/** Builds both structures edge by edge, one write (and one mirror) per step. */
function traceBuild(g: Graph): Step[] {
  const steps: Step[] = [];
  const lists: number[][] = Array.from({ length: g.n }, () => []);
  const matrix = emptyMatrix(g.n);
  let writes = 0;
  const snap = (view: Partial<RepState>, recorded: number): Entity[] =>
    scene({ g, lists: lists.map((l) => [...l]), matrix: matrix.map((r) => [...r]), recorded, ...view });
  const push = (step: Omit<Step, 'chapter' | 'metrics'> & { result?: string }): void => {
    const { result, ...rest } = step;
    steps.push({ chapter: 'run', ...rest, metrics: { edges: g.edges.length, writes, result: result ?? '—' } });
  };

  push({
    short: 'Empty',
    title: `${g.n} empty lists and an ${g.n} × ${g.n} grid of zeros`,
    body: `Line 2 makes one empty list per vertex. Line 3 makes ${g.n} rows of ${g.n} zeros: no edge anywhere yet.\n\nThe matrix costs ${g.n * g.n} cells before a single edge is stored.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `adj_list = ${pyList(lists.map(() => '[]'))}`, 3: `matrix = ${g.n} × ${g.n} zeros` },
    scene: { entities: snap({}, 0) },
  });

  g.edges.forEach((e, i) => {
    lists[e.u]?.push(e.v);
    const rowU = matrix[e.u];
    if (rowU) rowU[e.v] = 1;
    writes += 2;
    push({
      short: `${e.u} → ${e.v}`,
      title: `Edge (${e.u}, ${e.v}): write it from ${e.u}'s side`,
      body: `Line 4 takes the next edge: \`u, v = ${e.u}, ${e.v}\`. Line 5 appends ${e.v} to ${e.u}'s list, now ${pyList(lists[e.u] ?? [])}. Line 6 sets \`matrix[${e.u}][${e.v}] = 1\`: row ${e.u}, column ${e.v}.`,
      code: { view: 'final', lines: [4, 5, 6] },
      values: { 4: `u, v = ${e.u}, ${e.v}`, 5: `adj_list[${e.u}] = ${pyList(lists[e.u] ?? [])}`, 6: `matrix[${e.u}][${e.v}] = 1` },
      scene: { entities: snap({ edge: i, half: 'forward' }, i) },
    });
    lists[e.v]?.push(e.u);
    const rowV = matrix[e.v];
    if (rowV) rowV[e.u] = 1;
    writes += 2;
    push({
      short: `${e.v} → ${e.u}`,
      title: `Mirror it: ${e.v} can reach ${e.u} too`,
      body: `The edge has no direction, so lines 8–9 write it again from the other end: ${e.u} joins ${e.v}'s list (${pyList(lists[e.v] ?? [])}) and \`matrix[${e.v}][${e.u}] = 1\`.`,
      code: { view: 'final', lines: [8, 9] },
      values: { 8: `adj_list[${e.v}] = ${pyList(lists[e.v] ?? [])}`, 9: `matrix[${e.v}][${e.u}] = 1` },
      scene: { entities: snap({ edge: i, half: 'mirror' }, i) },
    });
  });

  const ones = 2 * g.edges.length;
  push({
    short: 'Return',
    title: 'Return both structures',
    body: `The loop on line 4 is done, so line 10 returns both. The lists hold ${ones} entries in total; the matrix holds ${ones} ones among ${g.n * g.n} cells.`,
    code: { view: 'final', lines: [4, 10] },
    values: { 4: 'no edges left', 10: `return adj_list, matrix` },
    scene: { entities: snap({ done: true }, g.edges.length) },
    result: `${ones} list entries`,
  });
  return steps;
}

// Story graph: 4 vertices, 4 edges. Vertex 3 hangs off 2, so its row is mostly zeros.
const G: Graph = {
  n: 4,
  directed: false,
  edges: [
    { u: 0, v: 1 },
    { u: 0, v: 2 },
    { u: 1, v: 2 },
    { u: 2, v: 3 },
  ],
};
const RUN = traceBuild(G);
const RUN_START = 6;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { edges: 4, writes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FINAL_LISTS = [[1, 2], [0, 2], [0, 1, 3], [2]];
const FINAL_MATRIX = [
  [0, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 0, 1],
  [0, 0, 1, 0],
];

export default defineWalkthrough({
  id: 'learn/graph/graph-representations',
  title: 'Graph Representations, index cards or a grid',
  summary: 'From the idea to the code: store the same graph two ways, as an adjacency list and as an adjacency matrix, and see what each one costs.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def build_graph(n: int, edges: list[tuple[int, int]]) -> tuple[list[list[int]], list[list[int]]]:
    adj_list: list[list[int]] = [[] for _ in range(n)]
    matrix = [[0] * n for _ in range(n)]
    for u, v in edges:
        adj_list[u].append(v)
        matrix[u][v] = 1
        # Undirected: mirror each edge so lookups work from either end
        adj_list[v].append(u)
        matrix[v][u] = 1
    return adj_list, matrix`,
  },
  metrics: [
    { key: 'edges', label: 'Edges' },
    { key: 'writes', label: 'Writes' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'end being written from / cell just set' },
    { tone: 'compare', label: 'edge being recorded / other end' },
    { tone: 'done', label: 'recorded edge / a 1 in the matrix' },
  ],
  goals: [
    { text: 'Compare index cards with a grid', step: 2 },
    { text: 'Build both from one edge list', step: 3 },
    { text: 'Watch every edge land in both structures', step: RUN_START + 1 },
    { text: 'Know why undirected edges are written twice', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Store 4 vertices and 4 two-way edges',
      body: 'A subway map can be written down two ways: an index card per station listing its neighbours, or a grid with every station along both sides.\n\nLine 1 takes the vertex count `n` and a list of `edges`, and returns both forms: `adj_list` and `matrix`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, lists: [], matrix: [], recorded: 0, bare: true, note: 'n = 4\nedges = [(0, 1), (0, 2),\n         (1, 2), (2, 3)]' }) },
    },
    {
      chapter: 'idea',
      short: 'Two forms',
      title: 'A list per vertex, or a V × V grid',
      body: 'The **adjacency list** keeps, for each vertex, only the neighbours it really has: `V + 2E` entries. The **matrix** keeps a 0 or 1 for every pair: `V²` cells, mostly zeros when edges are rare.\n\nThe matrix answers "is there an edge u–v?" in one read; the list answers "who are u’s neighbours?" without scanning zeros.',
      code: { view: 'signature' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, lists: FINAL_LISTS, matrix: FINAL_MATRIX, recorded: 4, done: true, note: 'list: 4 + 8 = 12 entries\nmatrix: 4 × 4 = 16 cells' }) },
    },
    {
      chapter: 'build',
      short: 'Empty',
      title: 'Lines 2–3: empty cards, a grid of zeros',
      body: 'Line 2 gives every vertex its own empty list (a comprehension, so the lists are separate objects). Line 3 builds `n` rows of `n` zeros the same way.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['adj_list = [[] for _ in range(n)]', 'matrix = [[0] * n for _ in range(n)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'One side',
      title: 'Lines 4–6: write each edge from u’s side',
      body: 'For every edge `(u, v)`, line 5 adds `v` to u’s card and line 6 puts a 1 at row `u`, column `v`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [4, 5, 6] },
      metrics: { ...startMetrics, writes: 2 },
      changes: ['for u, v in edges:', 'adj_list[u].append(v)', 'matrix[u][v] = 1'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Mirror',
      title: 'Lines 7–9: and again from v’s side',
      body: 'An undirected edge works both ways, so lines 8–9 store it from `v` too. A directed graph would stop after line 6.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: { ...startMetrics, writes: 4 },
      changes: ['adj_list[v].append(u)', 'matrix[v][u] = 1'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 10: hand back both',
      body: 'Line 10 returns the pair. Now let’s run it on the 4 edges, one write at a time.',
      code: { view: 'final', lines: [10] },
      metrics: startMetrics,
      changes: ['return adj_list, matrix'],
      scene: at(0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'O(V + E) for lists, O(V²) for the grid',
      body: 'Both builds touch each edge twice, but the matrix first fills `V²` zeros: **`O(V²)`** time and space, against **`O(V + E)`** for the lists.\n\nIn return the matrix checks one pair in `O(1)`, while a list needs `O(deg(u))`.',
      code: { view: 'final', lines: [2, 3] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, lists: FINAL_LISTS, matrix: FINAL_MATRIX, recorded: 4, done: true, note: 'V = 10,000, E = 30,000:\nlists ≈ 70,000 entries\nmatrix = 100,000,000 cells', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Both ways',
      title: 'Why lines 8–9 write every edge twice',
      body: 'Without the mirror, edge (2, 3) would sit only on 2’s card: a search starting at 3 would find **no neighbours** and stop, and `matrix[3][2]` would wrongly read 0.\n\nWriting both directions is the key decision: it keeps each matrix symmetric and every list complete.',
      code: { view: 'final', lines: [7, 8, 9] },
      values: { 8: 'adj_list[3] = [2]', 9: 'matrix[3][2] = 1' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, lists: FINAL_LISTS, matrix: FINAL_MATRIX, recorded: 3, edge: 3, half: 'mirror', note: 'no mirror: adj_list[3] = []\nmatrix[3][2] = 0  ✗' }) },
    },
  ],
  trace: {
    title: 'Build both structures for your own graph',
    inputs: graphInputs({ n: 4, from: '0, 0, 1, 2', to: '1, 2, 2, 3' }),
    presets: [
      { label: 'Dense (every pair)', values: { n: '4', from: '0, 0, 0, 1, 1, 2', to: '1, 2, 3, 2, 3, 3' } },
      { label: 'Sparse line', values: { n: '5', from: '0, 1, 2, 3', to: '1, 2, 3, 4' } },
      { label: 'Isolated vertex', values: { n: '4', from: '0, 1', to: '1, 2' } },
    ],
    maxItems: 10,
    run: (values) => {
      const g = parseGraph(values, { directed: false, allowEmpty: false });
      if (g.n > MAX_N) throw new Error(`The matrix fits up to ${MAX_N} vertices here.`);
      return traceBuild(g);
    },
  },
});
