import { defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, listArr, parseGraph, parseVertex, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** Rows on the right of the graph: the queue on top, the answer below it (§5.1 stacked arrays). */
const QUEUE_Y = 0;
const ORDER_Y = 130;

interface BfsState {
  readonly g: Graph;
  readonly start: number;
  readonly visited: readonly number[];
  readonly queue: readonly number[];
  readonly order: readonly number[];
  /** Vertex popped and being expanded. */
  readonly node?: number;
  /** Neighbour under check, and what the check found. */
  readonly neighbor?: number;
  readonly verdict?: 'new' | 'seen';
  /** Neighbour just marked and queued in this step. */
  readonly added?: boolean;
  /** Edges that discovered a vertex (the BFS tree). */
  readonly tree: ReadonlySet<number>;
  /** Hide the tables (problem / idea chapters, before the code makes them). */
  readonly bare?: boolean;
  /** Text under each vertex (the idea chapter's ripple layers). */
  readonly subs?: readonly string[];
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: BfsState): Entity[] {
  const checking = s.node !== undefined && s.neighbor !== undefined ? findEdge(s.g, s.node, s.neighbor) : -1;
  const nodeTone = (k: number): Tone => {
    if (k === s.node) return 'active';
    if (k === s.neighbor) return s.verdict === 'new' && s.added ? 'done' : 'compare';
    if (s.visited.includes(k)) return 'done';
    if (s.done) return 'muted';
    return 'default';
  };
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => ({ tone: s.bare && k === s.start ? 'active' : nodeTone(k), ...(s.subs ? { sub: s.subs[k] ?? '' } : {}) }),
    edge: (i) => {
      if (i === checking) {
        const label = s.verdict === 'seen' ? `${s.neighbor} seen` : s.verdict === 'new' ? `${s.neighbor} new` : undefined;
        return { tone: s.verdict === 'seen' ? 'miss' : s.added ? 'done' : 'compare', ...(label ? { label } : {}), ...(s.added ? { flow: true, from: s.node } : {}) };
      }
      if (s.tree.has(i)) return { tone: 'done' };
      return { tone: s.done ? 'muted' : 'default' };
    },
  });
  if (!s.bare) {
    const justAdded = s.added && s.neighbor !== undefined ? s.neighbor : undefined;
    entities.push(
      listArr('queue', 0, QUEUE_Y, s.queue, { label: 'queue', codeVar: 'queue', tones: (k) => (k === justAdded ? 'active' : 'default') }),
      listArr('order', 0, ORDER_Y, s.order, {
        label: 'order',
        codeVar: 'order',
        tones: (k, i) => (s.done ? 'found' : k === s.node && i === s.order.length - 1 ? 'active' : 'done'),
      }),
    );
    const dash = (v: number | undefined): number | string => v ?? '—';
    const right = tableBesideArray(s.g.n, 3);
    const visitedText = `{${s.visited.join(', ')}}`;
    entities.push(
      vars(
        'vals',
        right,
        0,
        [
          { name: 'node', value: dash(s.node), tone: s.node === undefined ? 'muted' : 'default' },
          { name: 'neighbor', value: dash(s.neighbor), tone: s.neighbor === undefined ? 'muted' : s.verdict === 'seen' ? 'miss' : 'default' },
          { name: 'visited', value: visitedText, tone: justAdded !== undefined ? 'active' : s.verdict === 'seen' ? 'miss' : 'default' },
        ],
        { label: 'variables', width: 200 },
      ),
    );
    if (s.note) entities.push(note('note', right, 200, s.note, { tone: s.noteTone ?? 'note' }));
  } else if (s.note) {
    entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
  }
  return entities;
}

/** Adds line 9's loop check to a pop step's values (every turn after the first). */
const withLoop = (loop: boolean, values: Record<number, string>): Record<number, string> => (loop ? { 9: 'queue → True', ...values } : values);

/**
 * Runs BFS on any graph and records one decision per step: the setup, every
 * pop, every neighbour check, every mark-and-queue, and the return.
 */
function traceBfs(g: Graph, start: number): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const visited: number[] = [start];
  const queue: number[] = [start];
  const order: number[] = [];
  const tree = new Set<number>();
  let checks = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string>>; result?: string },
    view: Partial<BfsState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { visited: visited.length, checks, result: e.result ?? '—' },
      scene: { entities: scene({ g, start, visited: [...visited], queue: [...queue], order: [...order], tree: new Set(tree), ...view }) },
    });
  };

  emit({
    short: 'Start',
    title: `Start at ${start}: seen, and waiting in the queue`,
    body: `Line 5 marks the start as seen: \`visited = {${start}}\`. Line 6 puts it in the queue, and line 7 starts an empty \`order\`.\n\nLine 9: the queue holds one vertex, so the loop starts.`,
    lines: [5, 6, 7, 9],
    values: { 5: `visited = {${start}}`, 6: `queue = deque([${start}])`, 7: 'order = []', 9: 'queue → True' },
  });

  let firstPop = true;
  while (queue.length > 0) {
    const node = queue.shift() ?? 0;
    order.push(node);
    const rest = queue.length === 0 ? 'The queue is now empty.' : `Still waiting: ${pyList(queue)}.`;
    emit(
      {
        short: `Pop ${node}`,
        title: `Take ${node} from the front of the queue`,
        body: `${firstPop ? '' : `Line 9: the queue isn't empty. `}Line 10 pops the **oldest** vertex, ${node}, from the front, and line 11 adds it to \`order\`. ${rest}\n\nLine 12 will now look at its neighbours: ${adj[node]?.length ? pyList(adj[node] ?? []) : 'it has none'}.`,
        lines: firstPop ? [10, 11, 12] : [9, 10, 11, 12],
        values: withLoop(!firstPop, { 10: `node = ${node}`, 11: `order = ${pyList(order)}`, 12: `adj[${node}] = ${pyList(adj[node] ?? [])}` }),
      },
      { node },
    );
    firstPop = false;

    for (const neighbor of adj[node] ?? []) {
      checks += 1;
      const isNew = !visited.includes(neighbor);
      emit(
        {
          short: `${node}→${neighbor}?`,
          title: isNew ? `Neighbour ${neighbor}: not seen yet` : `Neighbour ${neighbor}: already seen, skip`,
          body: isNew
            ? `Line 12: \`neighbor = ${neighbor}\`. Line 13: ${neighbor} is not in \`visited\`, so this is the first time anyone reached it.`
            : `Line 12: \`neighbor = ${neighbor}\`. Line 13: ${neighbor} is already in \`visited\` ${queue.includes(neighbor) ? '(it is waiting in the queue)' : order.includes(neighbor) ? '(it was already popped)' : ''}, so it was reached by a path at least as short. Skip it.`,
          lines: [12, 13],
          values: { 12: `neighbor = ${neighbor}`, 13: `${neighbor} not in visited → ${isNew ? 'True' : 'False'}` },
        },
        { node, neighbor, verdict: isNew ? 'new' : 'seen' },
      );
      if (!isNew) continue;
      visited.push(neighbor);
      queue.push(neighbor);
      tree.add(findEdge(g, node, neighbor));
      emit(
        {
          short: `Queue ${neighbor}`,
          title: `Mark ${neighbor} seen and queue it`,
          body: `Line 15 adds ${neighbor} to \`visited\` right now, so no other vertex can queue it again. Line 16 puts it at the **back** of the queue: ${pyList(queue)}.`,
          lines: [15, 16],
          values: { 15: `visited.add(${neighbor})`, 16: `queue = ${pyList(queue)}` },
        },
        { node, neighbor, verdict: 'new', added: true },
      );
    }
  }

  const missed = g.n - order.length;
  emit(
    {
      short: 'Return',
      title: `Queue empty: return ${pyList(order)}`,
      body: `Line 9: the queue is empty, so every vertex reachable from ${start} has been popped. Line 17 returns \`order = ${pyList(order)}\`${missed > 0 ? `.\n\n${missed} vertex${missed === 1 ? ' was' : 'es were'} never reached: no edge leads to ${missed === 1 ? 'it' : 'them'} from ${start}` : ''}.`,
      lines: [9, 17],
      values: { 9: 'queue → False', 17: `return ${pyList(order)}` },
      result: pyList(order),
    },
    { done: true },
  );
  return steps;
}

// Story graph: a diamond 0 → {1, 2} → 3, then a tail 3 – 4. Vertex 3 is reachable two ways.
const G: Graph = {
  n: 5,
  directed: false,
  edges: [
    { u: 0, v: 1 },
    { u: 0, v: 2 },
    { u: 1, v: 3 },
    { u: 2, v: 3 },
    { u: 3, v: 4 },
  ],
};
const START = 0;
const RUN = traceBfs(G, START);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { visited: 1, checks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const bare = { g: G, start: START, visited: [], queue: [], order: [], tree: new Set<number>(), bare: true } as const;
const ALL = new Set([0, 1, 2, 4]);

export default defineWalkthrough({
  id: 'learn/graph/bfs',
  title: 'Breadth-First Search, ripples on a pond',
  summary: 'From the idea to the code: visit a graph in rings of distance from the start, using a first-in, first-out queue.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `from collections import deque


def bfs(adj: list[list[int]], start: int) -> list[int]:
    visited = {start}
    queue = deque([start])
    order: list[int] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in adj[node]:
            if neighbor not in visited:
                # Mark on enqueue so the same node is never queued twice
                visited.add(neighbor)
                queue.append(neighbor)
    return order`,
  },
  metrics: [
    { key: 'visited', label: 'Seen' },
    { key: 'checks', label: 'Edges checked' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex being expanded' },
    { tone: 'compare', label: 'neighbour being checked' },
    { tone: 'miss', label: 'already seen: skipped' },
    { tone: 'done', label: 'seen / edge that found it' },
    { tone: 'found', label: 'the visit order' },
    { tone: 'muted', label: 'never reached / unused edge' },
  ],
  goals: [
    { text: 'See why BFS visits the nearest vertices first', step: 2 },
    { text: 'Use a queue to keep the rings in order', step: 3 },
    { text: 'Follow every pop and every neighbour check', step: RUN_START + 1 },
    { text: 'Know why a vertex is marked when it is queued', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Visit every vertex reachable from 0',
      body: 'Drop a pebble in a pond: the ring one step away forms first, then the ring two steps away.\n\nLine 4 takes the graph as adjacency lists (`adj[u]` lists the neighbours of `u`) and a `start` vertex. It returns the vertices in the order BFS reaches them, **nearest first**. Edges here go both ways.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ ...bare, note: 'adj = [[1, 2], [0, 3], [0, 3],\n       [1, 2, 4], [3]]\nstart = 0' }) },
    },
    {
      chapter: 'idea',
      short: 'Rings',
      title: 'Visit by distance: one ring at a time',
      body: 'Group the vertices by how many edges they are from 0: ring 0 is `{0}`, ring 1 is `{1, 2}`, ring 2 is `{3}`, ring 3 is `{4}`.\n\nIf we finish a whole ring before touching the next, the first path that reaches a vertex is a **shortest** one (fewest edges).',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ ...bare, subs: ['ring 0', 'ring 1', 'ring 1', 'ring 2', 'ring 3'], note: 'ring 0: 0\nring 1: 1, 2\nring 2: 3    ring 3: 4' }) },
    },
    {
      chapter: 'idea',
      short: 'A queue',
      title: 'First in, first out keeps the rings in order',
      body: 'Expanding 0 finds 1 and 2; expanding those finds 3. If found vertices wait in a **queue** (join at the back, leave from the front), all of ring 1 leaves before any of ring 2 joins the front.\n\nA set `visited` remembers who was already found, so nobody is queued twice.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, start: START, visited: [0, 1, 2], queue: [1, 2], order: [0], tree: new Set([0, 1]), note: 'queue: [1, 2] ← 3 joins here\nfront leaves first: 1, then 2' }) },
    },
    {
      chapter: 'build',
      short: 'Seed',
      title: 'Lines 5–6: the start is seen and waiting',
      body: '`visited` is a set of vertices already found. The start is found by definition, so it goes in, and `queue` (a `deque`, fast at both ends) starts with it.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['visited = {start}', 'queue = deque([start])'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Pop front',
      title: 'Lines 7–10: take the oldest vertex',
      body: '`order` collects the answer. Line 9 loops while anyone is waiting, and line 10 takes the vertex at the **front**: the one that has waited longest, so the nearest.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10], lines: [7, 9, 10] },
      metrics: startMetrics,
      changes: ['order: list[int] = []', 'while queue:', 'node = queue.popleft()'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Neighbours',
      title: 'Lines 11–12: record it, then look around',
      body: 'Line 11 appends the vertex to the answer. Line 12 walks its neighbours in the order `adj[node]` lists them.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['order.append(node)', 'for neighbor in adj[node]:'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'New only',
      title: 'Lines 13–15: only new vertices get marked',
      body: 'Line 13 skips neighbours already in `visited`. A new one is marked on line 15 straight away, the moment it is found (the comment says why; the last step shows it).',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15], lines: [13, 15] },
      metrics: startMetrics,
      changes: ['if neighbor not in visited:', 'visited.add(neighbor)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Queue it',
      title: 'Lines 16–17: join the back, then return',
      body: 'Line 16 puts the new vertex at the **back** of the queue, behind everyone nearer. When nobody is left waiting, line 17 returns the order.\n\nNow let’s run it on the graph, one decision at a time.',
      code: { view: 'final', lines: [16, 17] },
      metrics: { ...startMetrics, visited: 2, checks: 1 },
      changes: ['queue.append(neighbor)', 'return order'],
      scene: at(3),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each vertex once, each edge twice: O(V + E)',
      body: 'Every reachable vertex is queued and popped **once** (line 15 sees to that), and line 12 reads each of its edges once from each end. That is **`O(V + E)` time**, and `visited` plus the queue hold at most `V` vertices: `O(V)` space.',
      code: { view: 'final', lines: [10, 12] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, start: START, visited: [0, 1, 2, 3, 4], queue: [], order: [0, 1, 2, 3, 4], tree: ALL, done: true, note: '5 pops, 10 edge checks\n1,000,000 edges → ~2,000,000 checks', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Mark early',
      title: 'Why line 15 marks a vertex when it is queued',
      body: 'Vertex 3 is a neighbour of both 1 and 2. If we marked vertices only when popped, 3 would still be unmarked when 2 is expanded, so it would be **queued twice**; in a dense graph one vertex could be queued once per edge.\n\nMarking on enqueue is the key decision: each vertex enters the queue exactly once.',
      code: { view: 'final', lines: [13, 14, 15, 16] },
      values: { 13: '3 not in visited → False', 15: 'marked when 1 found it' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          g: G,
          start: START,
          visited: [0, 1, 2, 3],
          queue: [3],
          order: [0, 1, 2],
          tree: new Set([0, 1, 2]),
          node: 2,
          neighbor: 3,
          verdict: 'seen',
          note: 'mark on pop:  queue = [3, 3]  ✗\nmark on queue: queue = [3]     ✓',
        }),
      },
    },
  ],
  trace: {
    title: 'Run BFS on your own graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 1, 2, 3', to: '1, 2, 3, 3, 4' }, [{ name: 'start', label: 'Start vertex', kind: 'number', default: '0' }]),
    presets: [
      { label: 'Disconnected', values: { n: '6', from: '0, 1, 3', to: '1, 2, 4', start: '0' } },
      { label: 'Cycle', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 0', start: '0' } },
      { label: 'Start in the middle', values: { n: '5', from: '0, 1, 2, 3', to: '1, 2, 3, 4', start: '2' } },
    ],
    maxItems: 10,
    run: (values) => {
      const g = parseGraph(values, { directed: false });
      return traceBfs(g, parseVertex(values, 'start', g.n, 'Start vertex'));
    },
  },
});
