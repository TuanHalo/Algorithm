import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, graphInputs, lineValues, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 340 } as const;

interface KrState {
  readonly g: Graph;
  readonly parent: readonly number[];
  /** Input edge indexes in sorted order. */
  readonly order: readonly number[];
  /** Position in `order` of the edge being considered. */
  readonly pos?: number;
  readonly inMst: ReadonlySet<number>;
  readonly rejected: ReadonlySet<number>;
  /** Vertex find() is on, and the roots found so far for this edge. */
  readonly x?: number;
  readonly ru?: number;
  readonly rv?: number;
  readonly verdict?: 'join' | 'cycle';
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

const key = (g: Graph, i: number): string => {
  const e = g.edges[i];
  return e ? `(${e.w}, ${e.u}, ${e.v})` : '';
};

function scene(s: KrState): Entity[] {
  const current = s.pos !== undefined ? s.order[s.pos] : undefined;
  const e = current !== undefined ? s.g.edges[current] : undefined;
  const entities: Entity[] = drawGraph(s.g, {
    node: (k) => {
      if (k === s.x) return { tone: 'active' };
      if (s.verdict === 'cycle' && (k === s.ru || k === s.rv)) return { tone: 'miss' };
      if (k === s.ru || k === s.rv) return { tone: 'found' };
      if (e && (k === e.u || k === e.v)) return { tone: 'compare' };
      return { tone: s.done ? 'found' : 'default' };
    },
    edge: (i) => {
      if (i === current) return { tone: s.verdict === 'cycle' ? 'miss' : s.verdict === 'join' ? 'found' : 'compare', ...(s.verdict === 'join' ? { flow: true } : {}) };
      if (s.inMst.has(i)) return { tone: 'found' };
      if (s.rejected.has(i)) return { tone: 'muted' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const dash = (v: number | undefined): number | string => v ?? '—';
  entities.push(
    arr('parent', 0, 0, s.parent, {
      label: 'parent',
      codeVar: 'parent',
      tones: Object.fromEntries(s.parent.map((p, k) => [k, k === s.x ? 'active' : p === k ? 'done' : 'default'])),
    }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'w', value: dash(e?.w), tone: e ? 'default' : 'muted' },
        { name: 'u', value: dash(e?.u), tone: e ? 'default' : 'muted' },
        { name: 'v', value: dash(e?.v), tone: e ? 'default' : 'muted' },
        { name: 'ru', value: dash(s.ru), tone: s.ru === undefined ? 'muted' : s.verdict === 'cycle' ? 'miss' : 'default' },
        { name: 'rv', value: dash(s.rv), tone: s.rv === undefined ? 'muted' : s.verdict === 'cycle' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 150 },
    ),
    map(
      'sorted',
      tableBesideArray(s.g.n, Math.max(4, s.order.length)),
      0,
      'sorted(edges)',
      s.order.map((i, p) => ({
        key: key(s.g, i),
        value: s.inMst.has(i) ? 'in mst' : s.rejected.has(i) ? 'cycle' : p === s.pos ? 'next' : '',
        tone: (p === s.pos ? (s.verdict === 'cycle' ? 'miss' : 'compare') : s.inMst.has(i) ? 'found' : s.rejected.has(i) ? 'muted' : 'default') as Tone,
      })),
      { width: 190 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Edge indexes sorted the way Python sorts (w, u, v) tuples. */
function sortedOrder(g: Graph): number[] {
  return g.edges
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.w ?? 0) - (b.e.w ?? 0) || a.e.u - b.e.u || a.e.v - b.e.v)
    .map(({ i }) => i);
}

/** Runs Kruskal and records one decision per step: the sort, every hop of every find, each root comparison, each join, and the return. */
function traceKruskal(g: Graph): Step[] {
  const steps: Step[] = [];
  const parent = Array.from({ length: g.n }, (_, k) => k);
  const order = sortedOrder(g);
  const inMst = new Set<number>();
  const rejected = new Set<number>();
  let total = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<KrState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { edges: inMst.size, total, result: e.result ?? '—' },
      scene: { entities: scene({ g, parent: [...parent], order, inMst: new Set(inMst), rejected: new Set(rejected), ...view }) },
    });
  };

  emit({
    short: 'Sort',
    title: 'Every vertex alone, edges cheapest first',
    body: `Line 2: \`parent = ${pyList(parent)}\`, so every vertex is its own tree. Line 10 starts an empty \`mst\`, and line 11 sorts the edges by weight: ${order.map((i) => key(g, i)).join(', ')}.`,
    lines: [2, 10, 11],
    values: { 2: `parent = ${pyList(parent)}`, 10: 'mst = []', 11: `sorted: ${order.map((i) => g.edges[i]?.w).join(', ')}` },
  });

  /** find(x) with path halving; one step per hop, then one for the root. */
  const find = (x0: number, view: Partial<KrState>, intro: string, line12: string): number => {
    let x = x0;
    let first = true;
    while (parent[x] !== x) {
      const p = parent[x] ?? x;
      const gp = parent[p] ?? p;
      parent[x] = gp;
      emit(
        {
          short: `find: ${x}→${gp}`,
          title: `find(${x0}): ${x} is not a root, jump to ${gp}`,
          body: `${first ? intro : ''}Line 5: \`parent[${x}] = ${p}\`, not ${x}, so keep climbing. Line 6 points ${x} at its grandparent (\`parent[${x}] = ${gp}\`), halving the path, and line 7 moves on: \`x = ${gp}\`.`,
          lines: first ? [12, 5, 6, 7] : [5, 6, 7],
          values: { 12: first ? line12 : undefined, 5: `parent[${x}] = ${p} != ${x} → True`, 6: `parent[${x}] = ${gp}`, 7: `x = ${gp}` },
        },
        { ...view, x },
      );
      x = gp;
      first = false;
    }
    return x;
  };

  order.forEach((i, pos) => {
    const e = g.edges[i];
    if (!e) return;
    const w = e.w ?? 0;
    const line12 = `ru, rv = find(${e.u}), find(${e.v})`;
    const base = { pos } as const;
    const ru = find(e.u, base, `Line 11 takes the next cheapest edge \`(${w}, ${e.u}, ${e.v})\`. Line 12 calls \`find(${e.u})\`. `, line12);
    emit(
      {
        short: `root(${e.u}) = ${ru}`,
        title: `Edge (${w}, ${e.u}, ${e.v}): ${e.u}'s tree has root ${ru}`,
        body: ru === e.u ? `Line 11 takes the next cheapest edge \`(${w}, ${e.u}, ${e.v})\`. Line 12 calls \`find(${e.u})\`: line 5 sees \`parent[${e.u}] == ${e.u}\`, so ${e.u} is a root and line 8 returns it.` : `Line 5: \`parent[${ru}] == ${ru}\`: the climb stops. Line 8 returns the root, \`ru = ${ru}\`.`,
        lines: ru === e.u ? [11, 12, 5, 8] : [5, 8],
        values: { 11: ru === e.u ? `w, u, v = ${w}, ${e.u}, ${e.v}` : undefined, 12: ru === e.u ? line12 : undefined, 5: `parent[${ru}] != ${ru} → False`, 8: `return ${ru}` },
      },
      { ...base, x: ru, ru },
    );
    const rv = find(e.v, { ...base, ru }, `Line 12 now calls \`find(${e.v})\`. `, line12);
    emit(
      {
        short: `root(${e.v}) = ${rv}`,
        title: `${e.v}'s tree has root ${rv}`,
        body: rv === e.v ? `Line 12 calls \`find(${e.v})\`: \`parent[${e.v}] == ${e.v}\`, so ${e.v} is a root; line 8 returns it.` : `Line 5: \`parent[${rv}] == ${rv}\`: the climb stops. Line 8 returns \`rv = ${rv}\`.`,
        lines: rv === e.v ? [12, 5, 8] : [5, 8],
        values: { 12: rv === e.v ? line12 : undefined, 5: `parent[${rv}] != ${rv} → False`, 8: `return ${rv}` },
      },
      { ...base, x: rv, ru, rv },
    );
    if (ru === rv) {
      rejected.add(i);
      emit(
        {
          short: 'Cycle: skip',
          title: `Same root ${ru}: this edge would close a loop`,
          body: `Line 13: \`ru == rv == ${ru}\`. ${e.u} and ${e.v} are already connected by cheaper tree edges, so adding ${e.u}–${e.v} would make a cycle. Skip it.`,
          lines: [13],
          values: { 13: `${ru} != ${rv} → False` },
        },
        { ...base, ru, rv, verdict: 'cycle' },
      );
      return;
    }
    parent[rv] = ru;
    inMst.add(i);
    total += w;
    emit(
      {
        short: `Take ${e.u}–${e.v}`,
        title: `Different trees: join them with ${e.u}–${e.v} (weight ${w})`,
        body: `Line 13: \`${ru} != ${rv}\`, two separate trees. Line 14 hangs root ${rv} under ${ru} (\`parent[${rv}] = ${ru}\`), and line 15 adds the edge: ${inMst.size} edge${inMst.size === 1 ? '' : 's'} in the tree, total weight ${total}.`,
        lines: [13, 14, 15],
        values: { 13: `${ru} != ${rv} → True`, 14: `parent[${rv}] = ${ru}`, 15: `mst += (${e.u}, ${e.v}, ${w})` },
      },
      { ...base, ru, rv, verdict: 'join' },
    );
  });

  const spanning = inMst.size === g.n - 1;
  emit(
    {
      short: 'Return',
      title: spanning ? `Return ${inMst.size} edges, total weight ${total}` : `Return a forest: ${inMst.size} edges, total ${total}`,
      body: spanning
        ? `Line 11 has tried every edge. Line 16 returns the ${inMst.size} tree edges (\`n − 1\` for ${g.n} vertices), total weight **${total}**.`
        : `Line 11 has tried every edge, but only ${inMst.size} of the ${g.n - 1} needed joined trees: the graph is disconnected, so line 16 returns a minimum spanning **forest** of weight ${total}.`,
      lines: [16],
      values: { 16: `return ${inMst.size} edges, total ${total}` },
      result: String(total),
    },
    { done: true },
  );
  return steps;
}

// Story graph: 5 vertices, 7 weighted edges; the MST takes 0–2, 1–2, 3–4 and 1–3 (total 11).
const G: Graph = {
  n: 5,
  directed: false,
  edges: [
    { u: 0, v: 1, w: 4 },
    { u: 0, v: 2, w: 1 },
    { u: 1, v: 2, w: 2 },
    { u: 1, v: 3, w: 5 },
    { u: 2, v: 3, w: 8 },
    { u: 3, v: 4, w: 3 },
    { u: 2, v: 4, w: 9 },
  ],
};
const RUN = traceKruskal(G);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`kruskal-mst: no run step "${short}"`);
  return i;
};
const startMetrics = { edges: 0, total: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FIRST_CYCLE = find('Cycle: skip');
const ORDER = sortedOrder(G);

export default defineWalkthrough({
  id: 'learn/graph/kruskal-mst',
  title: 'Kruskal’s MST, cheapest edges that don’t loop',
  summary: 'From the idea to the code: take the edges cheapest first and keep each one that joins two separate trees, using Union-Find to tell.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def kruskal_mst(n: int, edges: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # Path halving
            x = parent[x]
        return x

    mst: list[tuple[int, int, int]] = []
    for w, u, v in sorted(edges):
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[rv] = ru
            mst.append((u, v, w))
    return mst`,
  },
  metrics: [
    { key: 'edges', label: 'Tree edges' },
    { key: 'total', label: 'Total weight' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex find() is on' },
    { tone: 'compare', label: 'edge being considered' },
    { tone: 'found', label: 'roots / tree edges' },
    { tone: 'miss', label: 'would close a loop' },
    { tone: 'done', label: 'a root in parent' },
    { tone: 'muted', label: 'skipped edge' },
  ],
  goals: [
    { text: 'See why the cheapest safe edge is always right', step: 2 },
    { text: 'Spot a loop with Union-Find', step: 3 },
    { text: 'Watch every edge, every find and every join', step: RUN_START + 1 },
    { text: 'Know why an edge inside one tree is skipped', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Connect all 5 vertices as cheaply as possible',
      body: 'A town wants to link every neighbourhood with fiber at the lowest total cost, with no redundant loops.\n\nLine 1 takes `n` and the `edges` as `(w, u, v)` (both directions allowed) and returns a **minimum spanning tree**: `n − 1` edges that connect everything with the smallest total weight.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, parent: [0, 1, 2, 3, 4], order: ORDER, inMst: new Set(), rejected: new Set(), bare: true, note: 'n = 5, 7 edges\ngoal: 4 edges, smallest total' }) },
    },
    {
      chapter: 'idea',
      short: 'Cheapest',
      title: 'Cheapest edge first, unless it makes a loop',
      body: 'Sort the edges by weight and walk through them. Keep an edge if it joins two parts that aren’t connected yet; skip it if both ends are already connected (it would only close a loop).\n\nThe cheapest edge across any split must be in some minimum tree, so this greedy choice is never wrong.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, parent: [1, 1, 1, 1, 3], order: ORDER, inMst: new Set([1, 2, 5, 3]), rejected: new Set([0, 4, 6]), bare: true, done: true, note: 'keep 1, 2, 3, 5 → total 11\nskip 4, 8, 9: they close loops' }) },
    },
    {
      chapter: 'idea',
      short: 'Same tree?',
      title: 'Union-Find answers “already connected?”',
      body: 'Each tree has a root; `parent` points each vertex toward it. Two vertices are connected exactly when `find` gives them the same root, and joining two trees is one pointer write.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(FIRST_CYCLE),
    },
    {
      chapter: 'build',
      short: 'parent',
      title: 'Line 2: every vertex is its own tree',
      body: '`parent[x] = x` means x is a root. Every vertex starts alone.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['parent = list(range(n))'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'find',
      title: 'Lines 4–6: climb to the root, halving the path',
      body: '`find(x)` climbs parent pointers until it reaches a root. Line 6 points each vertex it passes at its grandparent, so later climbs are shorter.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6], lines: [4, 5, 6] },
      metrics: startMetrics,
      changes: ['def find(x)', 'while parent[x] != x:', 'parent[x] = parent[parent[x]]'],
      scene: at(find('find: 2→0')),
    },
    {
      chapter: 'build',
      short: 'Root',
      title: 'Lines 7–10: step up, return the root, start the tree',
      body: 'Line 7 moves up; line 8 returns the root. Line 10 starts the empty answer `mst`.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 8, 10], lines: [7, 8, 10] },
      metrics: startMetrics,
      changes: ['x = parent[x]', 'return x', 'mst = []'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Each edge',
      title: 'Lines 11–13: cheapest edge first, compare roots',
      body: 'Line 11 sorts the edges (tuples sort by `w` first). Line 12 finds both ends’ roots, and line 13 asks whether they differ.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: startMetrics,
      changes: ['for w, u, v in sorted(edges):', 'ru, rv = find(u), find(v)', 'if ru != rv:'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Join',
      title: 'Lines 14–16: join the trees, keep the edge',
      body: 'Different roots: line 14 merges the two trees and line 15 keeps the edge. Line 16 returns the tree.\n\nNow let’s run all 7 edges.',
      code: { view: 'final', lines: [14, 15, 16] },
      metrics: { edges: 1, total: 1, result: '—' },
      changes: ['parent[rv] = ru', 'mst.append((u, v, w))', 'return mst'],
      scene: at(3),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Sorting dominates: O(E log E)',
      body: 'Line 11 sorts `E` edges in **`O(E log E)`**. Each edge then costs two nearly-constant `find`s. Space is `O(V)` for `parent` plus the sorted copy of the edges.',
      code: { view: 'final', lines: [11, 12] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, parent: [1, 1, 1, 1, 1], order: ORDER, inMst: new Set([1, 2, 5, 3]), rejected: new Set([0, 4, 6]), done: true, note: '4 tree edges, total 11\n3 edges skipped as loops', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Skip loops',
      title: 'Why line 13 skips an edge whose ends share a root',
      body: 'Edge 0–1 (weight 4) came after 0–2 and 1–2 had already joined 0, 1 and 2 into one tree. Adding it would close the loop 0–1–2 and could only make the total heavier: the tree already reaches 1 more cheaply.\n\nKeeping only edges between different trees is the key decision: the result never has a loop, and stops at `n − 1` edges.',
      code: { view: 'final', lines: [12, 13] },
      values: { 12: 'ru = rv = 1', 13: 'False: skip (0, 1, 4)' },
      metrics: FINAL_METRICS,
      scene: at(FIRST_CYCLE),
    },
  ],
  trace: {
    title: 'Find the MST of your own graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 1, 1, 2, 3, 2', to: '1, 2, 2, 3, 3, 4, 4', weight: '4, 1, 2, 5, 8, 3, 9' }),
    presets: [
      { label: 'Disconnected', values: { n: '5', from: '0, 1, 3', to: '1, 2, 4', weight: '2, 1, 7' } },
      { label: 'Equal weights', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 0', weight: '1, 1, 1, 1' } },
      { label: 'Already a tree', values: { n: '4', from: '0, 0, 0', to: '1, 2, 3', weight: '3, 1, 2' } },
    ],
    maxItems: 8,
    run: (values) => traceKruskal(parseGraph(values, { directed: false, weighted: true, allowEmpty: false })),
  },
});
