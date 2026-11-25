import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, graphInputs, lineValues, parseGraph, parseVertex, pyList, weightedAdjacency, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 300 } as const;
const INF = Number.POSITIVE_INFINITY;
const showDist = (d: number): string => (d === INF ? '∞' : String(d));

type Entry = readonly [number, number];

interface DijState {
  readonly g: Graph;
  readonly dist: readonly number[];
  readonly heap: readonly Entry[];
  /** Vertices whose distance is final (popped while current). */
  readonly settled: readonly number[];
  readonly d?: number;
  readonly u?: number;
  /** The popped entry was outdated. */
  readonly stale?: boolean;
  readonly edge?: number;
  readonly verdict?: 'better' | 'no' | 'relaxed';
  readonly pushed?: Entry;
  /** Edge that set each vertex's current distance. */
  readonly via: ReadonlyMap<number, number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

const sortHeap = (heap: readonly Entry[]): Entry[] => [...heap].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

function scene(s: DijState): Entity[] {
  const e = s.edge !== undefined ? s.g.edges[s.edge] : undefined;
  const viaEdges = new Set(s.via.values());
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      const sub = s.bare ? undefined : `d ${showDist(s.dist[k] ?? INF)}`;
      const look = (tone: Tone): { tone: Tone; sub?: string } => (sub === undefined ? { tone } : { tone, sub });
      if (s.done) return look((s.dist[k] ?? INF) === INF ? 'muted' : 'found');
      if (k === s.u) return look(s.stale ? 'miss' : 'active');
      if (e && k === e.v) return look(s.verdict === 'no' ? 'miss' : 'compare');
      if (s.settled.includes(k)) return look('done');
      return look('default');
    },
    edge: (i) => {
      if (i === s.edge) return { tone: s.verdict === 'no' ? 'miss' : s.verdict === 'relaxed' ? 'done' : 'compare', ...(s.verdict === 'relaxed' ? { flow: true } : {}) };
      if (viaEdges.has(i)) return { tone: s.done ? 'found' : 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const distTones: Record<number, Tone> = {};
  s.dist.forEach((d, k) => {
    distTones[k] = e && k === e.v && s.verdict === 'relaxed' ? 'active' : s.done && d !== INF ? 'found' : s.settled.includes(k) ? 'done' : 'default';
  });
  const dash = (x: number | string | undefined): number | string => x ?? '—';
  const sorted = sortHeap(s.heap);
  entities.push(
    arr('dist', 0, 0, s.dist.map(showDist), { label: 'dist', codeVar: 'dist', tones: distTones }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'd', value: dash(s.d), tone: s.d === undefined ? 'muted' : s.stale ? 'miss' : 'default' },
        { name: 'u', value: dash(s.u), tone: s.u === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(e?.v), tone: e === undefined ? 'muted' : s.verdict === 'no' ? 'miss' : 'default' },
        { name: 'w', value: dash(e?.w), tone: e === undefined ? 'muted' : 'default' },
      ],
      { label: 'variables', width: 160 },
    ),
    map(
      'heap',
      tableBesideArray(s.g.n, Math.max(4, sorted.length)),
      0,
      'heap',
      sorted.map(([d, v], i) => {
        const outdated = d > (s.dist[v] ?? INF);
        const isPushed = s.pushed !== undefined && s.pushed[0] === d && s.pushed[1] === v;
        return {
          key: `(${showDist(d)}, ${v})`,
          value: outdated ? 'outdated' : i === 0 ? 'smallest' : 'waits',
          tone: (isPushed ? 'active' : outdated ? 'muted' : i === 0 ? 'compare' : 'default') as Tone,
        };
      }),
      { codeVar: 'heap', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs Dijkstra and records one decision per step: each pop (current or outdated), each edge check, each relax-and-push. */
function traceDijkstra(g: Graph, start: number): Step[] {
  const adj = weightedAdjacency(g);
  const steps: Step[] = [];
  const dist = Array.from({ length: g.n }, () => INF);
  dist[start] = 0;
  let heap: Entry[] = [[0, start]];
  const settled: number[] = [];
  const via = new Map<number, number>();
  let pops = 0;
  const edgeIndex = (u: number, v: number): number => g.edges.findIndex((e) => e.u === u && e.v === v);
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<DijState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { settled: settled.length, pops, result: e.result ?? '—' },
      scene: { entities: scene({ g, dist: [...dist], heap: [...heap], settled: [...settled], via: new Map(via), ...view }) },
    });
  };
  const show = (): string => pyList(dist.map(showDist));

  emit({
    short: 'Start',
    title: `dist[${start}] = 0, everything else unknown`,
    body: `Lines 5–6: every distance is infinity except \`dist[${start}] = 0\`. Line 7 puts \`(0, ${start})\` on the min-heap, so line 8's loop starts.`,
    lines: [5, 6, 7, 8],
    values: { 5: 'dist = [inf] * n', 6: `dist = ${show()}`, 7: `heap = [(0, ${start})]`, 8: 'heap → True' },
  });

  let first = true;
  while (heap.length > 0) {
    const sorted = sortHeap(heap);
    const top = sorted[0] ?? [0, 0];
    heap = sorted.slice(1);
    const [d, u] = top;
    pops += 1;
    if (d > (dist[u] ?? INF)) {
      emit(
        {
          short: `(${d}, ${u}) old`,
          title: `Pop (${d}, ${u}): outdated, skip it`,
          body: `${first ? '' : 'Line 8: the heap is not empty. '}Line 9 pops the smallest entry, \`(${d}, ${u})\`. Line 10: \`${d} > dist[${u}] = ${dist[u]}\`. A shorter path to ${u} was found after this entry was pushed, and ${u} was already expanded with it. Line 11 skips it.`,
          lines: [8, 9, 10, 11],
          values: { 8: 'heap → True', 9: `d, u = ${d}, ${u}`, 10: `${d} > ${dist[u]} → True`, 11: 'continue' },
        },
        { d, u, stale: true },
      );
      first = false;
      continue;
    }
    settled.push(u);
    emit(
      {
        short: `Pop ${u} (${d})`,
        title: `Pop (${d}, ${u}): ${u} is settled at ${d}`,
        body: `${first ? '' : 'Line 8: the heap is not empty. '}Line 9 pops the smallest entry, \`(${d}, ${u})\`. Line 10: \`${d} > dist[${u}]\` is false, so it is current. Nothing left in the heap is cheaper, so **${d} is final** for ${u}. Line 12 tries its edges.`,
        lines: first ? [9, 10, 12] : [8, 9, 10, 12],
        values: { 8: first ? undefined : 'heap → True', 9: `d, u = ${d}, ${u}`, 10: `${d} > ${dist[u]} → False`, 12: `adj[${u}] = ${pyList((adj[u] ?? []).map(([v, w]) => `(${v}, ${w})`))}` },
      },
      { d, u },
    );
    first = false;
    for (const [v, w] of adj[u] ?? []) {
      const edge = edgeIndex(u, v);
      const old = dist[v] ?? INF;
      const better = d + w < old;
      emit(
        {
          short: `${u}→${v}: ${d + w}?`,
          title: better ? `Via ${u}, ${v} costs ${d + w}: better than ${showDist(old)}` : `Via ${u}, ${v} costs ${d + w}: not better than ${showDist(old)}`,
          body: `Line 12: \`v, w = ${v}, ${w}\`. Line 13: \`d + w = ${d} + ${w} = ${d + w}\` against \`dist[${v}] = ${showDist(old)}\`. ${better ? 'Cheaper, so take it.' : 'Not cheaper, so keep the old value.'}`,
          lines: [12, 13],
          values: { 12: `v, w = ${v}, ${w}`, 13: `${d + w} < ${showDist(old)} → ${better ? 'True' : 'False'}` },
        },
        { d, u, edge, verdict: better ? 'better' : 'no' },
      );
      if (!better) continue;
      dist[v] = d + w;
      via.set(v, edge);
      const pushed: Entry = [d + w, v];
      heap = [...heap, pushed];
      emit(
        {
          short: `dist[${v}] = ${d + w}`,
          title: `Record ${d + w} for ${v} and push it`,
          body: `Line 14: \`dist[${v}] = ${d + w}\`${old === INF ? '' : `, down from ${old}`}. Line 15 pushes \`(${d + w}, ${v})\` so ${v} is expanded once it is the cheapest left.${old !== INF ? ` The older entry for ${v} stays in the heap: it will be skipped as outdated.` : ''}`,
          lines: [14, 15],
          values: { 14: `dist = ${show()}`, 15: `heappush((${d + w}, ${v}))` },
        },
        { d, u, edge, verdict: 'relaxed', pushed },
      );
    }
  }
  const unreached = dist.map((x, k) => (x === INF ? k : -1)).filter((k) => k >= 0);
  emit(
    {
      short: 'Return',
      title: `Heap empty: return ${show()}`,
      body: `Line 8: the heap is empty. Line 16 returns the shortest distances \`${show()}\`${unreached.length ? `; ${pyList(unreached)} can't be reached (∞)` : ''}.`,
      lines: [8, 16],
      values: { 8: 'heap → False', 16: `return ${show()}` },
      result: show(),
    },
    { done: true },
  );
  return steps;
}

// Story graph: the direct arrow 0 → 1 costs 4, the detour 0 → 2 → 1 costs 3.
const G: Graph = {
  n: 5,
  directed: true,
  edges: [
    { u: 0, v: 1, w: 4 },
    { u: 0, v: 2, w: 1 },
    { u: 2, v: 1, w: 2 },
    { u: 1, v: 3, w: 1 },
    { u: 2, v: 3, w: 5 },
    { u: 3, v: 4, w: 3 },
  ],
};
const RUN = traceDijkstra(G, 0);
const RUN_START = 7;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`dijkstra: no run step "${short}"`);
  return i;
};
const startMetrics = { settled: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const DETOUR = find('dist[1] = 3');
const POP_2 = find('Pop 2 (1)');
const STALE = find('(4, 1) old');

export default defineWalkthrough({
  id: 'learn/graph/dijkstra',
  title: 'Dijkstra’s Algorithm, the cheapest frontier first',
  summary: 'From the idea to the code: always expand the closest vertex not yet settled, using a min-heap, and improve its neighbours’ distances as you go.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `import heapq


def dijkstra(adj: list[list[tuple[int, int]]], start: int) -> list[float]:
    dist = [float("inf")] * len(adj)
    dist[start] = 0
    heap: list[tuple[float, int]] = [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue  # Outdated entry: a shorter path to u was found later
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist`,
  },
  metrics: [
    { key: 'settled', label: 'Settled' },
    { key: 'pops', label: 'Heap pops' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex expanded / value just written' },
    { tone: 'compare', label: 'edge tried / smallest heap entry' },
    { tone: 'miss', label: 'no improvement / outdated pop' },
    { tone: 'done', label: 'settled / edge that set its distance' },
    { tone: 'found', label: 'final shortest paths' },
    { tone: 'muted', label: 'outdated heap entry / unreachable' },
  ],
  goals: [
    { text: 'See why the closest unsettled vertex is final', step: 2 },
    { text: 'Use a min-heap to find it fast', step: 3 },
    { text: 'Watch every pop, check and improvement', step: RUN_START + 1 },
    { text: 'Know why the smallest pop can’t improve later', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Cheapest cost from 0 to every vertex',
      body: 'Driving between cities with tolls: two cheap hops can beat one expensive highway.\n\nLine 4 takes `adj[u]` as `(v, w)` pairs with **non-negative** costs `w` and a `start`, and returns `dist`, the cheapest total cost to each vertex.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, dist: [0, INF, INF, INF, INF], heap: [], settled: [], via: new Map(), bare: true, note: 'start = 0\nlabels on arrows = cost w' }) },
    },
    {
      chapter: 'idea',
      short: 'Closest',
      title: 'The closest unsettled vertex is already final',
      body: 'From 0, the candidates are 1 (cost 4) and 2 (cost 1). Any other way into 2 would leave through 1 first, already costing 4 or more, so **2’s cost 1 can’t improve**.\n\nSo: repeatedly settle the closest vertex, and use it to improve its neighbours. The detour 0 → 2 → 1 then brings 1 down to 3.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(DETOUR),
    },
    {
      chapter: 'idea',
      short: 'Min-heap',
      title: 'A min-heap hands over the closest vertex',
      body: 'Keep `(distance, vertex)` pairs in a **min-heap**: the smallest pops first in `O(log V)`. When a distance improves, just push a new pair; the old one stays behind and gets skipped when it surfaces.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(STALE),
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 5–7: only the start is known',
      body: 'Distances start at infinity, the start at 0, and the heap holds `(0, start)`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['dist = [inf] * n', 'dist[start] = 0', 'heap = [(0, start)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Pop',
      title: 'Lines 8–10: pop the closest, check it is current',
      body: 'Line 9 pops the smallest `(d, u)`. Line 10 asks whether `d` is worse than the best known `dist[u]`: then the entry is out of date.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: { ...startMetrics, pops: 1, settled: 1 },
      changes: ['while heap:', 'd, u = heapq.heappop(heap)', 'if d > dist[u]:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Try edges',
      title: 'Lines 11–13: skip outdated entries, try each edge',
      body: 'Line 11 skips an outdated entry. For a current one, line 13 asks whether going through `u` makes `v` cheaper.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: { ...startMetrics, pops: 1, settled: 1 },
      changes: ['continue', 'for v, w in adj[u]:', 'if d + w < dist[v]:'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Relax',
      title: 'Lines 14–16: record it, push it, return',
      body: 'Line 14 stores the cheaper distance and line 15 pushes it on the heap. When the heap is empty, line 16 returns `dist`.\n\nNow let’s run it.',
      code: { view: 'final', lines: [14, 15, 16] },
      metrics: { ...startMetrics, pops: 1, settled: 1 },
      changes: ['dist[v] = d + w', 'heapq.heappush(heap, (dist[v], v))', 'return dist'],
      scene: at(3),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each edge pushes at most once: O((V + E) log V)',
      body: 'Every improvement pushes one entry, so the heap sees at most `E + 1` pushes and as many pops, each `O(log V)`: **`O((V + E) log V)` time** and `O(V + E)` space for the heap.',
      code: { view: 'final', lines: [9, 15] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, dist: [0, 3, 1, 4, 7], heap: [], settled: [0, 2, 1, 3, 4], via: new Map([[2, 1], [1, 2], [3, 3], [4, 5]]), done: true, note: 'dist = [0, 3, 1, 4, 7]\n7 pops, 2 outdated', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Final pop',
      title: 'Why the smallest pop is final, if no weight is negative',
      body: 'When `(1, 2)` popped, every other path to 2 had to leave through an entry costing at least 1 and then add a cost of **0 or more**, so none can beat 1. That is why line 9 may settle the smallest entry for good.\n\nThis is the key decision, and the reason for the rule on weights: a negative edge could lower a settled vertex later (use Bellman-Ford then).',
      code: { view: 'final', lines: [9, 10, 13] },
      values: { 9: '(1, 2): nothing smaller left', 13: 'w ≥ 0: costs only grow' },
      metrics: FINAL_METRICS,
      scene: at(POP_2),
    },
  ],
  trace: {
    title: 'Run Dijkstra on your own graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 2, 1, 2, 3', to: '1, 2, 1, 3, 3, 4', weight: '4, 1, 2, 1, 5, 3' }, [{ name: 'start', label: 'Start vertex', kind: 'number', default: '0' }]),
    presets: [
      { label: 'Direct is cheapest', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 3, 3', weight: '1, 5, 1, 1', start: '0' } },
      { label: 'Unreachable vertex', values: { n: '4', from: '0, 1', to: '1, 2', weight: '2, 3', start: '0' } },
      { label: 'Zero-cost edges', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 2, 3', weight: '0, 2, 0, 1', start: '0' } },
      { label: 'Start elsewhere', values: { n: '5', from: '0, 0, 2, 1, 2, 3', to: '1, 2, 1, 3, 3, 4', weight: '4, 1, 2, 1, 5, 3', start: '2' } },
    ],
    maxItems: 10,
    run: (values) => {
      const g = parseGraph(values, { directed: true, weighted: true, minWeight: 0 });
      return traceDijkstra(g, parseVertex(values, 'start', g.n, 'Start vertex'));
    },
  },
});
