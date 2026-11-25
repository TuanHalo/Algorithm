import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, graphInputs, lineValues, listArr, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const QUEUE_Y = 130;
const NOTE = { x: 230, y: 300 } as const;

interface TopoState {
  readonly g: Graph;
  readonly inDeg: readonly number[];
  readonly queue: readonly number[];
  readonly order: readonly number[];
  /** Edges already counted (phase 1) or already removed (phase 2). */
  readonly counted: number;
  readonly removed: ReadonlySet<number>;
  /** Edge being counted or removed right now. */
  readonly edge?: number;
  readonly u?: number;
  readonly v?: number;
  /** v's in-degree just reached 0 / v was just queued. */
  readonly freed?: boolean;
  readonly queued?: boolean;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: 'ok' | 'cycle';
}

function scene(s: TopoState): Entity[] {
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      const sub = s.bare ? undefined : `in ${s.inDeg[k] ?? 0}`;
      const look = (tone: Tone): { tone: Tone; sub?: string } => (sub === undefined ? { tone } : { tone, sub });
      if (s.done) return look(s.order.includes(k) ? (s.done === 'ok' ? 'found' : 'done') : 'miss');
      if (k === s.u) return look('active');
      if (k === s.v) return look(s.freed || s.queued ? 'found' : 'compare');
      if (s.order.includes(k)) return look('done');
      return look('default');
    },
    edge: (i) => {
      if (i === s.edge) return { tone: 'compare', flow: s.freed === true };
      if (s.removed.has(i)) return { tone: 'muted', dashed: true };
      if (s.done === 'cycle') return { tone: 'miss' };
      return { tone: i < s.counted ? 'done' : 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const degTones: Record<number, Tone> = {};
  s.inDeg.forEach((d, k) => {
    degTones[k] = k === s.v && s.edge !== undefined ? 'active' : d === 0 && !s.order.includes(k) ? 'found' : s.order.includes(k) ? 'done' : 'default';
  });
  const dash = (x: number | undefined): number | string => x ?? '—';
  entities.push(
    arr('in-deg', 0, 0, s.inDeg, { label: 'in_deg', codeVar: 'in_deg', tones: degTones }),
    listArr('queue', 0, QUEUE_Y, s.queue, { label: 'queue', codeVar: 'queue', tones: (k) => (k === s.v && s.queued ? 'active' : 'default') }),
    vars(
      'vals',
      tableBesideArray(s.g.n, 3),
      0,
      [
        { name: 'u', value: dash(s.u), tone: s.u === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(s.v), tone: s.v === undefined ? 'muted' : 'default' },
        { name: 'order', value: pyList(s.order), tone: s.done === 'ok' ? 'found' : s.done === 'cycle' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 210 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs Kahn's algorithm and records one decision per step: every edge counted,
 * the starting queue, every pop, every edge removed (with its zero check), every enqueue, and the return.
 */
function traceTopo(g: Graph): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const inDeg = Array.from({ length: g.n }, () => 0);
  let queue: number[] = [];
  const order: number[] = [];
  const removed = new Set<number>();
  let counted = 0;
  // Edge index of the k-th neighbour of u, in the order adj lists them.
  const edgeIndex = (u: number, v: number): number => g.edges.findIndex((e) => e.u === u && e.v === v);
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<TopoState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { placed: order.length, queued: queue.length, result: e.result ?? '—' },
      scene: { entities: scene({ g, inDeg: [...inDeg], queue: [...queue], order: [...order], counted, removed: new Set(removed), ...view }) },
    });
  };

  emit({
    short: 'Zero counts',
    title: 'Every in-degree starts at 0',
    body: `Line 5 makes one counter per vertex. Lines 6–8 will add 1 to \`in_deg[v]\` for every edge \`u → v\`: the number of arrows pointing **into** each vertex, its unfinished prerequisites.`,
    lines: [5],
    values: { 5: `in_deg = ${pyList(inDeg)}` },
  });
  let countedIdx = 0;
  for (let u = 0; u < g.n; u += 1) {
    for (const v of adj[u] ?? []) {
      inDeg[v] = (inDeg[v] ?? 0) + 1;
      const idx = edgeIndex(u, v);
      counted = countedIdx + 1;
      countedIdx += 1;
      emit(
        {
          short: `Count ${u}→${v}`,
          title: `Edge ${u} → ${v}: ${v} has one more prerequisite`,
          body: `Line 6: \`u = ${u}\`, line 7: \`v = ${v}\`. Line 8 adds 1: \`in_deg[${v}] = ${inDeg[v]}\`.`,
          lines: [6, 7, 8],
          values: { 6: `u = ${u}`, 7: `v = ${v}`, 8: `in_deg[${v}] = ${inDeg[v]}` },
        },
        { u, v, edge: idx },
      );
    }
  }
  counted = g.edges.length;
  queue = inDeg.map((d, k) => (d === 0 ? k : -1)).filter((k) => k >= 0);
  emit({
    short: 'Ready queue',
    title: queue.length > 0 ? `${pyList(queue)} have no prerequisites` : 'No vertex is free to start',
    body:
      queue.length > 0
        ? `Line 10 queues every vertex with \`in_deg == 0\`: ${pyList(queue)}. Nothing has to come before ${queue.length === 1 ? 'it' : 'them'}, so ${queue.length === 1 ? 'it' : 'any of them'} can go first. Line 11 starts an empty \`order\`.`
        : 'Line 10 finds **no** vertex with `in_deg == 0`: every vertex waits on another. That only happens when the edges loop.',
    lines: [10, 11],
    values: { 10: `queue = ${pyList(queue)}`, 11: 'order = []' },
  });

  while (queue.length > 0) {
    const u = queue.shift() ?? 0;
    order.push(u);
    emit(
      {
        short: `Place ${u}`,
        title: `${u} goes next in the order`,
        body: `Line 12: the queue isn't empty. Line 13 pops ${u}: all of its prerequisites are already placed. Line 14 appends it: \`order = ${pyList(order)}\`. Now its outgoing edges can be crossed off.`,
        lines: [12, 13, 14],
        values: { 12: 'queue → True', 13: `u = ${u}`, 14: `order = ${pyList(order)}` },
      },
      { u },
    );
    for (const v of adj[u] ?? []) {
      const idx = edgeIndex(u, v);
      inDeg[v] = (inDeg[v] ?? 0) - 1;
      removed.add(idx);
      const free = inDeg[v] === 0;
      emit(
        {
          short: `${u}→${v}: ${inDeg[v]} left`,
          title: free ? `${v} has no prerequisites left` : `${v} still waits on ${inDeg[v]} more`,
          body: `Line 15: \`v = ${v}\`. Line 16 crosses off the edge ${u} → ${v}: \`in_deg[${v}] = ${inDeg[v]}\`. Line 17: ${free ? `0, so everything ${v} depends on is placed.` : `not 0 yet, so ${v} must keep waiting.`}`,
          lines: [15, 16, 17],
          values: { 15: `v = ${v}`, 16: `in_deg[${v}] = ${inDeg[v]}`, 17: `${inDeg[v]} == 0 → ${free ? 'True' : 'False'}` },
        },
        { u, v, edge: idx, freed: free },
      );
      if (free) {
        queue.push(v);
        emit(
          {
            short: `Queue ${v}`,
            title: `${v} is ready: queue it`,
            body: `Line 18 adds ${v} to the queue: \`queue = ${pyList(queue)}\`. It will be placed after everything already waiting.`,
            lines: [18],
            values: { 18: `queue = ${pyList(queue)}` },
          },
          { u, v, queued: true },
        );
      }
    }
  }

  const ok = order.length === g.n;
  const left = Array.from({ length: g.n }, (_, k) => k).filter((k) => !order.includes(k));
  emit(
    {
      short: ok ? 'Return' : 'Cycle',
      title: ok ? `Return ${pyList(order)}` : `Only ${order.length} of ${g.n} placed: a cycle`,
      body: ok
        ? `Line 12: the queue is empty. All ${g.n} vertices were placed, so line 20 returns \`${pyList(order)}\`: every arrow points from an earlier vertex to a later one.`
        : `Line 12: the queue is empty, but ${pyList(left)} never reached in-degree 0: they wait on each other in a loop. Line 20 sees \`${order.length} != ${g.n}\` and returns \`[]\`.`,
      lines: [12, 19, 20],
      values: { 12: 'queue → False', 20: ok ? `return ${pyList(order)}` : `${order.length} == ${g.n} → False: return []` },
      result: ok ? pyList(order) : '[]',
    },
    { done: ok ? 'ok' : 'cycle' },
  );
  return steps;
}

// Story graph: getting dressed. 0 socks, 1 trousers, 2 shirt, 3 shoes (after socks and trousers), 4 out the door.
const G: Graph = {
  n: 5,
  directed: true,
  edges: [
    { u: 0, v: 1 },
    { u: 0, v: 2 },
    { u: 1, v: 3 },
    { u: 2, v: 3 },
    { u: 3, v: 4 },
  ],
};
const RUN = traceTopo(G);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { placed: 0, queued: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const READY = RUN.findIndex((s) => s.short === 'Ready queue');
const FIRST_POP = READY + 1;

export default defineWalkthrough({
  id: 'learn/graph/topological-sort',
  title: 'Topological Sort, prerequisites first',
  summary: 'From the idea to the code: count each vertex’s incoming arrows, start with the ones that have none, and free the next vertices as their prerequisites get placed (Kahn’s algorithm).',
  minutes: 8,
  code: {
    lang: 'python',
    source: `from collections import deque


def topo_sort(adj: list[list[int]]) -> list[int]:
    in_deg = [0] * len(adj)
    for u in range(len(adj)):
        for v in adj[u]:
            in_deg[v] += 1

    queue = deque([u for u in range(len(adj)) if in_deg[u] == 0])
    order: list[int] = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                queue.append(v)
    # Any vertex left out belongs to or depends on a cycle
    return order if len(order) == len(adj) else []`,
  },
  metrics: [
    { key: 'placed', label: 'Placed' },
    { key: 'queued', label: 'Ready' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex being placed / counter changing' },
    { tone: 'compare', label: 'edge being counted or crossed off' },
    { tone: 'found', label: 'no prerequisites left / the order' },
    { tone: 'done', label: 'placed / edge counted' },
    { tone: 'muted', label: 'edge crossed off' },
    { tone: 'miss', label: 'stuck in a cycle' },
  ],
  goals: [
    { text: 'Start from what depends on nothing', step: 2 },
    { text: 'Count prerequisites with in-degrees', step: 4 },
    { text: 'Watch every count, placement and cross-off', step: RUN_START + 1 },
    { text: 'Know why a vertex waits until its count hits 0', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Order 5 tasks so every arrow points forward',
      body: 'Socks before shoes, trousers before shoes, shoes before the door. An arrow `u → v` means u must come before v.\n\nLine 4 takes the **directed** graph and returns the vertices in an order where every arrow points forward, or `[]` if the arrows loop.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, inDeg: [0, 1, 1, 2, 1], queue: [], order: [], counted: 0, removed: new Set(), bare: true, note: '0 socks  1 trousers  2 shirt\n3 shoes  4 out the door' }) },
    },
    {
      chapter: 'idea',
      short: 'No prereqs',
      title: 'Something must have no prerequisites: do it first',
      body: 'Vertex 0 has no arrow coming in, so nothing has to happen before it: put it first. Then pretend it is gone: its arrows disappear, and 1 and 2 have nothing left to wait for.\n\nRepeat: always pick a vertex with no arrows left coming in.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(FIRST_POP + 2),
    },
    {
      chapter: 'idea',
      short: 'Count',
      title: 'Count incoming arrows instead of deleting them',
      body: 'Actually deleting edges is slow. Instead keep a counter per vertex, its **in-degree**: the number of arrows into it. Placing `u` subtracts 1 from each vertex it points to, and a counter reaching **0** means "ready".',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(READY),
    },
    {
      chapter: 'build',
      short: 'In-degrees',
      title: 'Lines 5–7: a counter per vertex, then every edge',
      body: 'Line 5 makes `len(adj)` zeros. Lines 6–7 walk every edge `u → v`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['in_deg = [0] * len(adj)', 'for u in range(len(adj)):', 'for v in adj[u]:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Ready',
      title: 'Lines 8–11: count, then queue the vertices at 0',
      body: 'Line 8 counts the edge into `v`. Line 10 queues every vertex whose count is 0, and line 11 starts the answer.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 10, 11], lines: [8, 10, 11] },
      metrics: { ...startMetrics, queued: 1 },
      changes: ['in_deg[v] += 1', 'queue = deque([... if in_deg[u] == 0])', 'order = []'],
      scene: at(READY),
    },
    {
      chapter: 'build',
      short: 'Place',
      title: 'Lines 12–14: place the next ready vertex',
      body: 'While some vertex is ready, line 13 takes it and line 14 places it next in the order.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14], lines: [12, 13, 14] },
      metrics: { ...startMetrics, placed: 1 },
      changes: ['while queue:', 'u = queue.popleft()', 'order.append(u)'],
      scene: at(FIRST_POP),
    },
    {
      chapter: 'build',
      short: 'Cross off',
      title: 'Lines 15–17: cross off u’s outgoing arrows',
      body: 'Each vertex `u` points to now has one prerequisite fewer: line 16 subtracts 1, and line 17 checks whether that was its last one.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17], lines: [15, 16, 17] },
      metrics: { ...startMetrics, placed: 1 },
      changes: ['for v in adj[u]:', 'in_deg[v] -= 1', 'if in_deg[v] == 0:'],
      scene: at(FIRST_POP + 1),
    },
    {
      chapter: 'build',
      short: 'Queue + check',
      title: 'Lines 18–20: queue it, and catch a loop',
      body: 'A vertex whose count hits 0 is ready (line 18). If the loop ends with vertices left over, they were waiting on each other: a cycle, so line 20 returns `[]`.\n\nNow let’s run it.',
      code: { view: 'final', lines: [18, 20] },
      metrics: { ...startMetrics, placed: 1, queued: 1 },
      changes: ['queue.append(v)', 'return order if len(order) == len(adj) else []'],
      scene: at(FIRST_POP + 2),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each edge counted once and crossed off once: O(V + E)',
      body: 'Lines 6–8 touch every edge once, and lines 15–17 touch it once more when its start is placed. Each vertex is queued and placed at most once: **`O(V + E)` time**, `O(V)` for `in_deg` and the queue.',
      code: { view: 'final', lines: [8, 16] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, inDeg: [0, 0, 0, 0, 0], queue: [], order: [0, 1, 2, 3, 4], counted: 5, removed: new Set([0, 1, 2, 3, 4]), done: 'ok', note: '5 edges counted, 5 crossed off\n1,000,000 edges → ~2,000,000 updates', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Wait for 0',
      title: 'Why line 17 waits until the count reaches 0',
      body: 'Shoes (3) have two prerequisites. When socks (0 → 1 → 3) cross off one arrow, `in_deg[3]` drops to 1: queueing shoes now would put them before the shirt-side arrow 2 → 3 is done.\n\nQueueing a vertex only when its **last** incoming arrow is crossed off is the key decision: it guarantees everything before it is already placed.',
      code: { view: 'final', lines: [16, 17, 18] },
      values: { 16: 'in_deg[3] = 1', 17: '1 == 0 → False: keep waiting' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, inDeg: [0, 0, 0, 1, 1], queue: [2], order: [0, 1], counted: 5, removed: new Set([0, 1, 2]), u: 1, v: 3, edge: 2, note: 'in_deg[3] = 1: 2 → 3 still open\nqueue 3 now → shoes before 2  ✗' }) },
    },
  ],
  trace: {
    title: 'Order your own directed graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 1, 2, 3', to: '1, 2, 3, 3, 4' }),
    presets: [
      { label: 'Cycle', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 1' } },
      { label: 'Two starts', values: { n: '5', from: '0, 1, 2, 3', to: '2, 2, 4, 4' } },
      { label: 'Independent', values: { n: '4', from: '0, 2', to: '1, 3' } },
    ],
    maxItems: 10,
    run: (values) => traceTopo(parseGraph(values, { directed: true, allowEmpty: false })),
  },
});
