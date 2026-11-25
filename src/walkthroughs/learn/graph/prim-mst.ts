import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, findEdge, graphInputs, lineValues, parseGraph, parseVertex, weightedAdjacency, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 0;
const NOTE = { x: 230, y: 330 } as const;

/** A heap entry (w, v), plus the tree vertex whose edge it is (for drawing only) and a serial. */
interface Entry {
  readonly w: number;
  readonly v: number;
  readonly from: number;
  readonly id: number;
}

interface PrimState {
  readonly g: Graph;
  readonly visited: readonly number[];
  readonly heap: readonly Entry[];
  readonly total: number;
  /** Popped entry. */
  readonly popped?: Entry;
  readonly stale?: boolean;
  readonly added?: boolean;
  /** Neighbour check / push from the newest tree vertex. */
  readonly u?: number;
  readonly v?: number;
  readonly edgeW?: number;
  readonly verdict?: 'outside' | 'inside' | 'pushed';
  /** Edges in the tree. */
  readonly tree: ReadonlySet<number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

const sortHeap = (heap: readonly Entry[]): Entry[] => [...heap].sort((a, b) => a.w - b.w || a.v - b.v || a.id - b.id);

function scene(s: PrimState): Entity[] {
  const popEdge = s.popped && s.popped.from >= 0 ? findEdge(s.g, s.popped.from, s.popped.v) : -1;
  const checkEdge = s.u !== undefined && s.v !== undefined ? findEdge(s.g, s.u, s.v) : -1;
  const entities: Entity[] = drawGraph(s.g, {
    node: (k) => {
      if (s.done) return { tone: s.visited.includes(k) ? 'found' : 'muted' };
      if (s.popped && k === s.popped.v) return { tone: s.stale ? 'miss' : 'active' };
      if (k === s.u) return { tone: 'active' };
      if (k === s.v) return { tone: s.verdict === 'inside' ? 'miss' : 'compare' };
      return { tone: s.visited.includes(k) ? 'found' : 'default' };
    },
    edge: (i) => {
      if (i === checkEdge) return { tone: s.verdict === 'inside' ? 'miss' : 'compare' };
      if (i === popEdge) return { tone: s.stale ? 'miss' : 'found', ...(s.added ? { flow: true, from: s.popped?.from } : {}) };
      if (s.tree.has(i)) return { tone: 'found' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const dash = (x: number | undefined): number | string => x ?? '—';
  const sorted = sortHeap(s.heap);
  const seen = new Map<string, number>();
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'w', value: dash(s.popped?.w), tone: s.popped ? 'default' : 'muted' },
        { name: 'u', value: dash(s.popped?.v ?? s.u), tone: s.popped || s.u !== undefined ? 'default' : 'muted' },
        { name: 'v', value: dash(s.v), tone: s.v === undefined ? 'muted' : s.verdict === 'inside' ? 'miss' : 'default' },
        { name: 'edge_w', value: dash(s.edgeW), tone: s.edgeW === undefined ? 'muted' : 'default' },
        { name: 'visited', value: `{${s.visited.join(', ')}}`, tone: s.stale || s.verdict === 'inside' ? 'miss' : s.added ? 'active' : 'default' },
        { name: 'total', value: s.total, tone: s.done ? 'found' : s.added ? 'active' : 'default' },
      ],
      { label: 'variables', width: 170 },
    ),
    map(
      'heap',
      tableBesideArray(0, Math.max(4, sorted.length)) - 60,
      0,
      'heap',
      sorted.map((e, i) => {
        const base = `(${e.w}, ${e.v})`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const inTree = s.visited.includes(e.v);
        const justPushed = s.verdict === 'pushed' && i === sorted.findIndex((x) => x.id === Math.max(...s.heap.map((h) => h.id)));
        return {
          key: base + '​'.repeat(count),
          value: inTree ? 'in tree' : i === 0 ? 'smallest' : 'waits',
          tone: (justPushed ? 'active' : inTree ? 'muted' : i === 0 ? 'compare' : 'default') as Tone,
        };
      }),
      { codeVar: 'heap', width: 170 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs Prim and records one decision per step: each pop (in the tree already, or new), each addition, each neighbour check and each push. */
function tracePrim(g: Graph, start: number): Step[] {
  const adj = weightedAdjacency(g);
  const steps: Step[] = [];
  const visited: number[] = [];
  let serial = 0;
  let heap: Entry[] = [{ w: 0, v: start, from: -1, id: serial }];
  const tree = new Set<number>();
  let total = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<PrimState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { inTree: visited.length, total, result: e.result ?? '—' },
      scene: { entities: scene({ g, visited: [...visited], heap: [...heap], total, tree: new Set(tree), ...view }) },
    });
  };

  emit({
    short: 'Start',
    title: `Seed the heap with (0, ${start})`,
    body: `Lines 5–7: nothing is in the tree yet, the heap holds \`(0, ${start})\` (reaching the start costs nothing) and \`total = 0\`. Line 8: the heap isn't empty, so the loop starts.`,
    lines: [5, 6, 7, 8],
    values: { 5: 'visited = set()', 6: `heap = [(0, ${start})]`, 7: 'total = 0', 8: 'heap → True' },
  });

  let first = true;
  while (heap.length > 0) {
    const sorted = sortHeap(heap);
    const popped = sorted[0] ?? { w: 0, v: 0, from: -1, id: -1 };
    heap = sorted.slice(1);
    const { w, v: u } = popped;
    if (visited.includes(u)) {
      emit(
        {
          short: `(${w}, ${u}) skip`,
          title: `Pop (${w}, ${u}): ${u} is already in the tree`,
          body: `${first ? '' : 'Line 8: the heap is not empty. '}Line 9 pops the cheapest entry, \`(${w}, ${u})\`. Line 10: ${u} is in \`visited\`: a cheaper edge already brought it in, and this one would close a loop. Line 11 skips it.`,
          lines: [8, 9, 10, 11],
          values: { 8: 'heap → True', 9: `w, u = ${w}, ${u}`, 10: `${u} in visited → True`, 11: 'continue' },
        },
        { popped, stale: true },
      );
      first = false;
      continue;
    }
    emit(
      {
        short: `Pop (${w}, ${u})`,
        title: popped.from < 0 ? `Pop (${w}, ${u}): the start` : `Pop (${w}, ${u}): cheapest edge out of the tree`,
        body: `${first ? '' : 'Line 8: the heap is not empty. '}Line 9 pops the cheapest entry, \`(${w}, ${u})\`${popped.from >= 0 ? `: the edge ${popped.from}–${u} is the cheapest way to grow the tree` : ''}. Line 10: ${u} is not in \`visited\` yet.`,
        lines: first ? [9, 10] : [8, 9, 10],
        values: { 8: first ? undefined : 'heap → True', 9: `w, u = ${w}, ${u}`, 10: `${u} in visited → False` },
      },
      { popped },
    );
    first = false;
    visited.push(u);
    total += w;
    if (popped.from >= 0) tree.add(findEdge(g, popped.from, u));
    emit(
      {
        short: `Add ${u}`,
        title: popped.from < 0 ? `${u} starts the tree` : `${u} joins the tree via ${popped.from}–${u}`,
        body: `Line 12 adds ${u} to \`visited\`; line 13 adds the edge's weight: \`total = ${total}\`. ${visited.length} of ${g.n} vertices are in the tree.`,
        lines: [12, 13],
        values: { 12: `visited = {${visited.join(', ')}}`, 13: `total = ${total}` },
      },
      { popped, added: true },
    );
    for (const [v, edgeW] of adj[u] ?? []) {
      const inside = visited.includes(v);
      emit(
        {
          short: `${u}–${v}: ${inside ? 'in' : 'out'}`,
          title: inside ? `${v} is already in the tree` : `${v} is outside: a candidate edge`,
          body: `Line 14: \`v, edge_w = ${v}, ${edgeW}\`. Line 15: ${inside ? `${v} is in \`visited\`, so this edge stays inside the tree: ignore it.` : `${v} is not in \`visited\`, so the edge ${u}–${v} could grow the tree.`}`,
          lines: [14, 15],
          values: { 14: `v, edge_w = ${v}, ${edgeW}`, 15: `${v} not in visited → ${inside ? 'False' : 'True'}` },
        },
        { popped, u, v, edgeW, verdict: inside ? 'inside' : 'outside' },
      );
      if (inside) continue;
      serial += 1;
      heap = [...heap, { w: edgeW, v, from: u, id: serial }];
      emit(
        {
          short: `Push (${edgeW}, ${v})`,
          title: `Offer the edge ${u}–${v} at cost ${edgeW}`,
          body: `Line 16 pushes \`(${edgeW}, ${v})\` onto the heap. It competes with every other edge leaving the tree; the cheapest wins the next pop.`,
          lines: [16],
          values: { 16: `heappush((${edgeW}, ${v}))` },
        },
        { popped, u, v, edgeW, verdict: 'pushed' },
      );
    }
  }
  const missed = g.n - visited.length;
  emit(
    {
      short: 'Return',
      title: `Heap empty: total weight ${total}`,
      body: `Line 8: the heap is empty. Line 17 returns \`total = ${total}\`${missed > 0 ? `. ${missed} vertex${missed === 1 ? ' was' : 'es were'} never reached: Prim only spans the start's component` : `, the weight of a minimum spanning tree over all ${g.n} vertices`}.`,
      lines: [8, 17],
      values: { 8: 'heap → False', 17: `return ${total}` },
      result: String(total),
    },
    { done: true },
  );
  return steps;
}

// Story graph: Kruskal's graph without the 2–4 edge. The MST is 0–2, 2–1, 1–3, 3–4 (total 11).
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
  ],
};
const RUN = tracePrim(G, 0);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`prim-mst: no run step "${short}"`);
  return i;
};
const startMetrics = { inTree: 0, total: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const POP_21 = find('Pop (2, 1)');
const SKIP_41 = find('(4, 1) skip');

export default defineWalkthrough({
  id: 'learn/graph/prim-mst',
  title: 'Prim’s MST, growing one tree outward',
  summary: 'From the idea to the code: start from one vertex and keep adding the cheapest edge that leaves the tree, using a min-heap of candidate edges.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `import heapq


def prim_mst(adj: list[list[tuple[int, int]]], start: int) -> int:
    visited: set[int] = set()
    heap: list[tuple[int, int]] = [(0, start)]
    total = 0
    while heap:
        w, u = heapq.heappop(heap)
        if u in visited:
            continue  # A cheaper edge already brought u into the tree
        visited.add(u)
        total += w
        for v, edge_w in adj[u]:
            if v not in visited:
                heapq.heappush(heap, (edge_w, v))
    return total`,
  },
  metrics: [
    { key: 'inTree', label: 'In tree' },
    { key: 'total', label: 'Total weight' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex joining / value just changed' },
    { tone: 'compare', label: 'edge checked / cheapest heap entry' },
    { tone: 'found', label: 'in the tree / tree edges' },
    { tone: 'miss', label: 'already in the tree' },
    { tone: 'muted', label: 'outdated heap entry / never reached' },
  ],
  goals: [
    { text: 'Grow one tree by its cheapest outgoing edge', step: 2 },
    { text: 'Keep the candidate edges in a min-heap', step: 3 },
    { text: 'Watch every pop, check and push', step: RUN_START + 1 },
    { text: 'Know why a popped vertex already in the tree is skipped', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Wire all 5 vertices for the least total cost',
      body: 'Power a dark neighbourhood from one substation: at every step, string cable along the cheapest wire from a lit house to an unlit one.\n\nLine 4 takes `adj[u]` as `(v, w)` pairs (edges both ways) and a `start`, and returns the total weight of a minimum spanning tree.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, visited: [], heap: [], total: 0, tree: new Set(), bare: true, note: 'start = 0\nlabels = cable cost' }) },
    },
    {
      chapter: 'idea',
      short: 'Grow',
      title: 'Grow the tree by its cheapest outgoing edge',
      body: 'Start with vertex 0 alone. Of all edges leaving the tree, the cheapest is 0–2 (1): take it. Now the cheapest leaving `{0, 2}` is 2–1 (2), and so on.\n\nThe cheapest edge across the tree’s border is always safe to take, so the tree stays minimal.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(POP_21),
    },
    {
      chapter: 'idea',
      short: 'Heap',
      title: 'A min-heap holds every candidate edge',
      body: 'When a vertex joins, push each edge from it to the outside as `(weight, vertex)`. The heap pops the cheapest. Some entries go out of date (their vertex joined by a cheaper edge): those are skipped when popped.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(SKIP_41),
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 5–7: an empty tree and the start in the heap',
      body: '`visited` is the tree, `heap` the candidates (the start costs 0), and `total` the answer.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['visited = set()', 'heap = [(0, start)]', 'total = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Pop',
      title: 'Lines 8–10: pop the cheapest candidate',
      body: 'Line 9 pops the cheapest `(w, u)`. Line 10 asks whether `u` is already in the tree.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: startMetrics,
      changes: ['while heap:', 'w, u = heapq.heappop(heap)', 'if u in visited:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Join',
      title: 'Lines 11–13: skip, or let u join',
      body: 'An entry for a tree vertex is skipped (line 11). Otherwise `u` joins the tree and its edge’s weight is added.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: { ...startMetrics, inTree: 1 },
      changes: ['continue', 'visited.add(u)', 'total += w'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Offer',
      title: 'Lines 14–16: offer u’s edges to the outside',
      body: 'Each edge from `u` to a vertex outside the tree becomes a candidate on the heap.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], lines: [14, 15, 16] },
      metrics: { ...startMetrics, inTree: 1 },
      changes: ['for v, edge_w in adj[u]:', 'if v not in visited:', 'heapq.heappush(heap, (edge_w, v))'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 17: return the total',
      body: 'When no candidates are left, line 17 returns the tree’s weight.\n\nNow let’s run it from vertex 0.',
      code: { view: 'final', lines: [17] },
      metrics: startMetrics,
      changes: ['return total'],
      scene: at(0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each edge pushed at most once per end: O((V + E) log V)',
      body: 'A vertex joins once, and then pushes each of its edges at most once, so the heap sees `O(E)` pushes and pops at `O(log V)` each: **`O((V + E) log V)` time**, `O(V + E)` space.',
      code: { view: 'final', lines: [9, 16] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, visited: [0, 2, 1, 3, 4], heap: [], total: 11, tree: new Set([1, 2, 3, 5]), done: true, note: 'tree 0–2, 2–1, 1–3, 3–4\ntotal 11', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Skip',
      title: 'Why line 10 skips a vertex already in the tree',
      body: 'The entry `(4, 1)` was pushed when 0 joined. But 1 joined earlier through the cheaper 2–1 (2). Taking 0–1 now would add 4 for a vertex already wired, and close the loop 0–1–2.\n\nSkipping popped vertices that are already in the tree is the key decision: each vertex joins once, by its cheapest edge.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: '1 in visited → True', 11: 'skip (4, 1): loop 0–1–2' },
      metrics: FINAL_METRICS,
      scene: at(SKIP_41),
    },
  ],
  trace: {
    title: 'Grow an MST on your own graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 1, 1, 2, 3', to: '1, 2, 2, 3, 3, 4', weight: '4, 1, 2, 5, 8, 3' }, [{ name: 'start', label: 'Start vertex', kind: 'number', default: '0' }]),
    presets: [
      { label: 'Disconnected', values: { n: '5', from: '0, 1, 3', to: '1, 2, 4', weight: '2, 1, 7', start: '0' } },
      { label: 'Equal weights', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 0', weight: '1, 1, 1, 1', start: '0' } },
      { label: 'Start elsewhere', values: { n: '5', from: '0, 0, 1, 1, 2, 3', to: '1, 2, 2, 3, 3, 4', weight: '4, 1, 2, 5, 8, 3', start: '4' } },
    ],
    maxItems: 8,
    run: (values) => {
      const g = parseGraph(values, { directed: false, weighted: true, allowEmpty: false });
      return tracePrim(g, parseVertex(values, 'start', g.n, 'Start vertex'));
    },
  },
});
