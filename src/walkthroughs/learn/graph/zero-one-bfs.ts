import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, graphInputs, lineValues, listArr, parseGraph, parseVertex, pyList, weightedAdjacency, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const DQ_Y = 130;
const NOTE = { x: 230, y: 300 } as const;
const INF = Number.POSITIVE_INFINITY;

/** One deque entry: the vertex plus a serial number, so a vertex pushed twice gets two blocks. */
interface Entry {
  readonly v: number;
  readonly id: number;
}

interface ZobState {
  readonly g: Graph;
  readonly dist: readonly number[];
  readonly dq: readonly Entry[];
  readonly u?: number;
  /** Edge under check, and what happened to it. */
  readonly edge?: number;
  readonly verdict?: 'better' | 'no' | 'relaxed' | 'front' | 'back';
  /** Entry just pushed. */
  readonly pushed?: number;
  /** Edges whose relaxation set a vertex's current dist. */
  readonly best: ReadonlyMap<number, number>;
  readonly stale?: boolean;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

const showDist = (d: number): string => (d === INF ? '∞' : String(d));

function scene(s: ZobState): Entity[] {
  const e = s.edge !== undefined ? s.g.edges[s.edge] : undefined;
  const bestEdges = new Set(s.best.values());
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      const sub = s.bare ? undefined : `d ${showDist(s.dist[k] ?? INF)}`;
      const look = (tone: Tone): { tone: Tone; sub?: string } => (sub === undefined ? { tone } : { tone, sub });
      if (s.done) return look((s.dist[k] ?? INF) === INF ? 'muted' : 'found');
      if (k === s.u) return look(s.stale ? 'muted' : 'active');
      if (e && k === e.v) return look(s.verdict === 'no' ? 'miss' : 'compare');
      return look((s.dist[k] ?? INF) === INF ? 'default' : 'done');
    },
    edge: (i) => {
      if (i === s.edge) return { tone: s.verdict === 'no' ? 'miss' : s.verdict === 'better' ? 'compare' : 'done', ...(s.verdict !== 'no' && s.verdict !== 'better' ? { flow: true } : {}) };
      if (bestEdges.has(i)) return { tone: s.done ? 'found' : 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const distTones: Record<number, Tone> = {};
  s.dist.forEach((d, k) => {
    distTones[k] = e && k === e.v && (s.verdict === 'relaxed' || s.verdict === 'front' || s.verdict === 'back') ? 'active' : s.done && d !== INF ? 'found' : d === INF ? 'default' : 'done';
  });
  const dash = (x: number | string | undefined): number | string => x ?? '—';
  entities.push(
    arr('dist', 0, 0, s.dist.map(showDist), { label: 'dist', codeVar: 'dist', tones: distTones }),
    listArr(
      'dq',
      0,
      DQ_Y,
      s.dq.map((x) => x.v),
      { label: 'dq', codeVar: 'dq', keys: s.dq.map((x) => x.id), tones: (_, i) => (s.dq[i]?.id === s.pushed ? 'active' : 'default') },
    ),
    vars(
      'vals',
      tableBesideArray(s.g.n, 3),
      0,
      [
        { name: 'u', value: dash(s.u), tone: s.u === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(e?.v), tone: e === undefined ? 'muted' : s.verdict === 'no' ? 'miss' : 'default' },
        { name: 'w', value: dash(e?.w), tone: e === undefined ? 'muted' : 'default' },
      ],
      { label: 'variables', width: 160 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs 0-1 BFS and records one decision per step: each pop, each edge check, each relaxation and each push (front or back). */
function traceZeroOne(g: Graph, start: number): Step[] {
  const adj = weightedAdjacency(g);
  const steps: Step[] = [];
  const dist = Array.from({ length: g.n }, () => INF);
  dist[start] = 0;
  let serial = 0;
  let dq: Entry[] = [{ v: start, id: serial }];
  const best = new Map<number, number>();
  let relaxations = 0;
  const edgeIndex = (u: number, v: number): number => g.edges.findIndex((e) => e.u === u && e.v === v);
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<ZobState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { relaxations, queued: dq.length, result: e.result ?? '—' },
      scene: { entities: scene({ g, dist: [...dist], dq: [...dq], best: new Map(best), ...view }) },
    });
  };
  const show = (): string => pyList(dist.map(showDist));
  const showDq = (): string => pyList(dq.map((x) => x.v));

  emit({
    short: 'Start',
    title: `Only the start is reached: dist[${start}] = 0`,
    body: `Line 5 sets every distance to infinity (not reached yet), and line 6 sets \`dist[${start}] = 0\`. Line 7 puts ${start} in the deque, so line 8's loop starts.`,
    lines: [5, 6, 7, 8],
    values: { 5: 'dist = [inf] * n', 6: `dist = ${show()}`, 7: `dq = [${start}]`, 8: 'dq → True' },
  });

  let first = true;
  while (dq.length > 0) {
    const entry = dq.shift() ?? { v: 0, id: -1 };
    const u = entry.v;
    const du = dist[u] ?? INF;
    emit(
      {
        short: `Pop ${u}`,
        title: `Pop ${u} from the front (dist ${showDist(du)})`,
        body: `${first ? '' : 'Line 8: the deque is not empty. '}Line 9 pops ${u}, the vertex at the front, whose best known distance is ${showDist(du)}. Line 10 will try its edges: ${adj[u]?.length ? adj[u]?.map(([v, w]) => `${u} → ${v} (w ${w})`).join(', ') : 'it has none'}.`,
        lines: first ? [9, 10] : [8, 9, 10],
        values: { 8: first ? undefined : 'dq → True', 9: `u = ${u}`, 10: `adj[${u}] = ${pyList((adj[u] ?? []).map(([v, w]) => `(${v}, ${w})`))}` },
      },
      { u },
    );
    first = false;
    for (const [v, w] of adj[u] ?? []) {
      const edge = edgeIndex(u, v);
      const cand = du + w;
      const old = dist[v] ?? INF;
      const better = cand < old;
      emit(
        {
          short: `${u}→${v}: ${showDist(cand)}?`,
          title: better ? `Via ${u}, ${v} costs ${cand}: better than ${showDist(old)}` : `Via ${u}, ${v} costs ${cand}: no better than ${showDist(old)}`,
          body: `Line 10: \`v, w = ${v}, ${w}\`. Line 11: \`dist[${u}] + w = ${du} + ${w} = ${cand}\`, against \`dist[${v}] = ${showDist(old)}\`. ${better ? 'Shorter, so this edge improves it.' : 'Not shorter, so nothing changes.'}`,
          lines: [10, 11],
          values: { 10: `v, w = ${v}, ${w}`, 11: `${du} + ${w} < ${showDist(old)} → ${better ? 'True' : 'False'}` },
        },
        { u, edge, verdict: better ? 'better' : 'no' },
      );
      if (!better) continue;
      dist[v] = cand;
      best.set(v, edge);
      relaxations += 1;
      emit(
        {
          short: `dist[${v}] = ${cand}`,
          title: `Relax: dist[${v}] becomes ${cand}`,
          body: `Line 12 stores the shorter distance: \`dist[${v}] = ${cand}\`${old === INF ? '' : ` (it was ${old})`}. ${v} must now be (re)visited so its own edges use the new value.`,
          lines: [12],
          values: { 12: `dist = ${show()}` },
        },
        { u, edge, verdict: 'relaxed' },
      );
      serial += 1;
      const front = w === 0;
      dq = front ? [{ v, id: serial }, ...dq] : [...dq, { v, id: serial }];
      emit(
        {
          short: front ? `${v} to front` : `${v} to back`,
          title: front ? `Weight 0: ${v} jumps to the front` : `Weight 1: ${v} joins the back`,
          body: front
            ? `Line 13: \`w == 0\`, so ${v} is exactly as far as ${u}: ${cand}. Line 15 pushes it to the **front**, next to the other distance-${cand} vertices: \`dq = ${showDq()}\`.`
            : `Line 13: \`w == 1\`, so ${v} is one farther than ${u}: ${cand}. Line 17 pushes it to the **back**, behind the distance-${du} vertices: \`dq = ${showDq()}\`.`,
          lines: front ? [13, 15] : [13, 17],
          values: { 13: `${w} == 0 → ${front ? 'True' : 'False'}`, [front ? 15 : 17]: `dq = ${showDq()}` },
        },
        { u, edge, verdict: front ? 'front' : 'back', pushed: serial },
      );
    }
  }
  const unreached = dist.map((d, k) => (d === INF ? k : -1)).filter((k) => k >= 0);
  emit(
    {
      short: 'Return',
      title: `Deque empty: return ${show()}`,
      body: `Line 8: the deque is empty, so no distance can improve. Line 18 returns \`dist = ${show()}\`${unreached.length ? `; ${pyList(unreached)} can't be reached from ${start} (∞)` : ''}.`,
      lines: [8, 18],
      values: { 8: 'dq → False', 18: `return ${show()}` },
      result: show(),
    },
    { done: true },
  );
  return steps;
}

// Story graph: free (0) and paid (1) moves. The free detour 0 → 2 → 1 beats the paid edge 0 → 1.
const G: Graph = {
  n: 5,
  directed: true,
  edges: [
    { u: 0, v: 1, w: 1 },
    { u: 0, v: 2, w: 0 },
    { u: 2, v: 1, w: 0 },
    { u: 2, v: 3, w: 1 },
    { u: 1, v: 3, w: 0 },
    { u: 1, v: 4, w: 1 },
    { u: 3, v: 4, w: 1 },
  ],
};
const RUN = traceZeroOne(G, 0);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`zero-one-bfs: no run step "${short}"`);
  return i;
};
const startMetrics = { relaxations: 0, queued: 1, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FRONT_2 = find('2 to front');
const IMPROVE_1 = find('dist[1] = 0');

export default defineWalkthrough({
  id: 'learn/graph/zero-one-bfs',
  title: '0-1 BFS, free moves jump the queue',
  summary: 'From the idea to the code: shortest paths when every edge costs 0 or 1, using a deque that takes free moves at the front and paid moves at the back.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `from collections import deque


def zero_one_bfs(adj: list[list[tuple[int, int]]], start: int) -> list[float]:
    dist = [float("inf")] * len(adj)
    dist[start] = 0
    dq = deque([start])
    while dq:
        u = dq.popleft()
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    # Same distance: the front keeps the deque sorted
                    dq.appendleft(v)
                else:
                    dq.append(v)
    return dist`,
  },
  metrics: [
    { key: 'relaxations', label: 'Improvements' },
    { key: 'queued', label: 'In deque' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex popped / value just written' },
    { tone: 'compare', label: 'edge being tried' },
    { tone: 'miss', label: 'no improvement' },
    { tone: 'done', label: 'reached / edge that set its distance' },
    { tone: 'found', label: 'final shortest paths' },
    { tone: 'muted', label: 'unreachable / outdated entry' },
  ],
  goals: [
    { text: 'See why plain BFS fails with free edges', step: 2 },
    { text: 'Keep two distance levels in one deque', step: 3 },
    { text: 'Watch every pop, check, improvement and push', step: RUN_START + 1 },
    { text: 'Know why free moves go to the front', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Cheapest cost from 0 when moves cost 0 or 1',
      body: 'Walking a corridor is free; a turnstile costs one token. Each arrow here costs `w`, either 0 or 1.\n\nLine 4 takes `adj[u]` as `(v, w)` pairs and a `start`, and returns `dist`: the cheapest total cost to reach each vertex (`inf` if unreachable).',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, dist: [0, INF, INF, INF, INF], dq: [], best: new Map(), bare: true, note: 'start = 0\nlabels on arrows = cost w' }) },
    },
    {
      chapter: 'idea',
      short: 'BFS fails',
      title: 'Counting edges is wrong when some are free',
      body: 'Plain BFS reaches 1 in one hop and calls it final. But the detour 0 → 2 → 1 uses two **free** edges and costs 0, less than the direct arrow’s 1.\n\nWe need the cheapest cost, not the fewest edges. Dijkstra works, but a heap costs `log V` per step; with only 0 and 1 we can do better.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(IMPROVE_1),
    },
    {
      chapter: 'idea',
      short: 'Two levels',
      title: 'A deque that holds two distance levels, in order',
      body: 'If the deque only ever holds vertices at distance `d` (front) and `d + 1` (back), popping from the front always takes a cheapest one, like Dijkstra’s heap.\n\nA free edge keeps the distance at `d`: push to the **front**. A paid edge makes it `d + 1`: push to the **back**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(FRONT_2),
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 5–7: everything unreached except the start',
      body: '`dist` starts at infinity everywhere, the start at 0, and the deque holds the start.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['dist = [inf] * n', 'dist[start] = 0', 'dq = deque([start])'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Pop',
      title: 'Lines 8–10: take the cheapest vertex, try its edges',
      body: 'Line 9 pops from the **front**, the cheapest vertex waiting. Line 10 walks its `(v, w)` edges.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: startMetrics,
      changes: ['while dq:', 'u = dq.popleft()', 'for v, w in adj[u]:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Relax',
      title: 'Lines 11–13: improve v if going through u is cheaper',
      body: 'Line 11 compares the cost through `u` with the best known for `v`; line 12 keeps the cheaper one. Line 13 asks which kind of edge it was.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: { ...startMetrics, relaxations: 1 },
      changes: ['if dist[u] + w < dist[v]:', 'dist[v] = dist[u] + w', 'if w == 0:'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Front',
      title: 'Lines 14–16: a free edge goes to the front',
      body: 'A 0-weight edge leaves `v` at the same distance as `u`, so it belongs with the front of the deque (line 15).',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], lines: [15] },
      metrics: { ...startMetrics, relaxations: 2 },
      changes: ['dq.appendleft(v)'],
      scene: at(FRONT_2),
    },
    {
      chapter: 'build',
      short: 'Back',
      title: 'Lines 17–18: a paid edge goes to the back',
      body: 'A 1-weight edge puts `v` one level farther, behind everyone at the current level (line 17). When the deque empties, line 18 returns the distances.\n\nNow let’s run it.',
      code: { view: 'final', lines: [17, 18] },
      metrics: { ...startMetrics, relaxations: 1 },
      changes: ['dq.append(v)', 'return dist'],
      scene: at(4),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'No heap: O(V + E)',
      body: 'A vertex is pushed only when its distance drops, and with weights 0 and 1 that happens a bounded number of times, so the work is **`O(V + E)`**, with `O(V)` for `dist` and the deque. Dijkstra on the same graph pays `O(log V)` per heap operation.',
      code: { view: 'final', lines: [11, 15, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, dist: [0, 0, 0, 0, 1], dq: [], best: new Map([[2, 1], [1, 2], [3, 4], [4, 5]]), done: true, note: 'dist = [0, 0, 0, 0, 1]\nno heap, no log V', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Front!',
      title: 'Why line 15 pushes a free move to the front',
      body: 'When 0 found 2 through a free edge, 2 was as cheap as 0 itself. At the back it would wait behind 1 (distance 1) and 1 would be expanded first with a worse value; at the **front** it is expanded next.\n\nFront for 0, back for 1 is the key decision: the deque stays sorted, so each pop is a cheapest vertex.',
      code: { view: 'final', lines: [13, 14, 15, 17] },
      values: { 15: 'dq = [2, 1]: 2 (d 0) first', 17: 'paid moves wait at the back' },
      metrics: FINAL_METRICS,
      scene: at(FRONT_2),
    },
  ],
  trace: {
    title: 'Run 0-1 BFS on your own graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 2, 2, 1, 1, 3', to: '1, 2, 1, 3, 3, 4, 4', weight: '1, 0, 0, 1, 0, 1, 1' }, [{ name: 'start', label: 'Start vertex', kind: 'number', default: '0' }]),
    presets: [
      { label: 'All weight 1 (plain BFS)', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 3, 3', weight: '1, 1, 1, 1', start: '0' } },
      { label: 'All free', values: { n: '4', from: '0, 1, 2', to: '1, 2, 3', weight: '0, 0, 0', start: '0' } },
      { label: 'Unreachable vertex', values: { n: '4', from: '0, 1', to: '1, 2', weight: '1, 0', start: '0' } },
    ],
    maxItems: 10,
    run: (values) => {
      const g = parseGraph(values, { directed: true, weighted: true, minWeight: 0, maxWeight: 1 });
      return traceZeroOne(g, parseVertex(values, 'start', g.n, 'Start vertex'));
    },
  },
});
