import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, listArr, parseGraph, parseVertex, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 300 } as const;

interface DfsState {
  readonly g: Graph;
  readonly visited: readonly number[];
  readonly order: readonly number[];
  /** Running calls, bottom first; the last one is running. */
  readonly stack: readonly number[];
  readonly neighbor?: number;
  readonly verdict?: 'new' | 'seen';
  /** The running call just returned (its frame is about to pop). */
  readonly returning?: boolean;
  /** Edges that led to a call (the DFS tree). */
  readonly tree: ReadonlySet<number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: DfsState): Entity[] {
  const node = s.stack.at(-1);
  const checking = node !== undefined && s.neighbor !== undefined ? findEdge(s.g, node, s.neighbor) : -1;
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      if (k === node && !s.done) return { tone: s.returning ? 'done' : 'active' };
      if (k === s.neighbor) return { tone: 'compare' };
      if (s.visited.includes(k)) return { tone: 'done' };
      return { tone: s.done ? 'muted' : 'default' };
    },
    edge: (i) => {
      if (i === checking) return { tone: s.verdict === 'seen' ? 'miss' : 'compare', label: `${s.neighbor} ${s.verdict === 'seen' ? 'seen' : 'new'}` };
      if (s.tree.has(i)) return { tone: 'done' };
      return { tone: s.done ? 'muted' : 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  entities.push(
    listArr('order', 0, 0, s.order, { label: 'order', codeVar: 'order', tones: (k, i) => (s.done ? 'found' : k === node && i === s.order.length - 1 && !s.returning ? 'active' : 'done') }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'node', value: node ?? '—', tone: node === undefined ? 'muted' : 'default' },
        { name: 'neighbor', value: s.neighbor ?? '—', tone: s.neighbor === undefined ? 'muted' : s.verdict === 'seen' ? 'miss' : 'default' },
        { name: 'visited', value: `{${s.visited.join(', ')}}`, tone: s.verdict === 'seen' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 200 },
    ),
  );
  if (s.stack.length > 0) {
    entities.push(
      map(
        'stack',
        tableBesideArray(s.g.n, s.stack.length),
        0,
        'call stack',
        s.stack.map((k, i) => {
          const top = i === s.stack.length - 1;
          return { key: `dfs(adj, ${k}, …)`, value: top ? (s.returning ? 'returns' : 'running') : 'waits on line 7', tone: top ? 'note' : 'muted' };
        }),
        { width: 260 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs recursive DFS and records one decision per step: every call (mark and
 * record), every neighbour check, and every return back to the caller.
 */
function traceDfs(g: Graph, start: number): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const visited: number[] = [];
  const order: number[] = [];
  const stack: number[] = [];
  const tree = new Set<number>();
  let checks = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string>>; result?: string },
    view: Partial<DfsState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { depth: stack.length, checks, result: e.result ?? '—' },
      scene: { entities: scene({ g, visited: [...visited], order: [...order], stack: [...stack], tree: new Set(tree), ...view }) },
    });
  };

  const visit = (node: number, parent: number | undefined): void => {
    stack.push(node);
    visited.push(node);
    order.push(node);
    emit({
      short: `dfs(${node})`,
      title: parent === undefined ? `Call dfs on the start, ${node}` : `Dive into ${node}: a new call on top`,
      body:
        parent === undefined
          ? `The first call is \`dfs(adj, ${node}, set(), [])\`. Line 2 marks ${node} visited and line 3 records it: \`order = ${pyList(order)}\`.`
          : `Line 7 calls \`dfs(adj, ${node}, …)\`, so \`dfs(${parent})\` pauses on line 7. Line 2 marks ${node} and line 3 records it: \`order = ${pyList(order)}\`. The call stack is ${stack.length} deep.`,
      lines: parent === undefined ? [2, 3] : [7, 2, 3],
      values: lineValues({ 7: parent === undefined ? undefined : `dfs(adj, ${node}, visited, order)`, 2: `visited = {${visited.join(', ')}}`, 3: `order = ${pyList(order)}` }),
    });
    for (const neighbor of adj[node] ?? []) {
      checks += 1;
      const isNew = !visited.includes(neighbor);
      emit(
        {
          short: `${node}→${neighbor}?`,
          title: isNew ? `Neighbour ${neighbor} of ${node}: not visited` : `Neighbour ${neighbor} of ${node}: visited, skip`,
          body: isNew
            ? `Line 4: \`neighbor = ${neighbor}\`. Line 5: ${neighbor} is not in \`visited\`, so DFS goes there **right now**, before ${node}'s other neighbours.`
            : `Line 4: \`neighbor = ${neighbor}\`. Line 5: ${neighbor} is already in \`visited\`, so this edge leads nowhere new. Skip it.`,
          lines: [4, 5],
          values: { 4: `neighbor = ${neighbor}`, 5: `${neighbor} not in visited → ${isNew ? 'True' : 'False'}` },
        },
        { neighbor, verdict: isNew ? 'new' : 'seen' },
      );
      if (isNew) {
        tree.add(findEdge(g, node, neighbor));
        visit(neighbor, node);
      }
    }
    const caller = stack.at(-2);
    emit(
      {
        short: `${node} done`,
        title: caller === undefined ? `dfs(${node}) finishes: the search is over` : `dfs(${node}) is done: back to ${caller}`,
        body:
          caller === undefined
            ? `Line 4 has no neighbours of ${node} left, so the first call returns. \`order = ${pyList(order)}\` holds every vertex reachable from ${node}.`
            : `Line 4 has no neighbours of ${node} left, so \`dfs(${node})\` returns. Its frame pops, and \`dfs(${caller})\` carries on from line 7 with its next neighbour.`,
        lines: [4],
        values: { 4: `adj[${node}] = ${pyList(adj[node] ?? [])}: all checked` },
        ...(caller === undefined ? { result: pyList(order) } : {}),
      },
      { returning: true, ...(caller === undefined ? { done: true } : {}) },
    );
    stack.pop();
  };
  visit(start, undefined);
  return steps;
}

// Same diamond as the BFS lesson, so the two visit orders can be compared.
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
const RUN = traceDfs(G, 0);
const RUN_START = 6;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { depth: 0, checks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const TREE = new Set([0, 2, 3, 4]);

export default defineWalkthrough({
  id: 'learn/graph/dfs',
  title: 'Depth-First Search, one corridor at a time',
  summary: 'From the idea to the code: follow one path as deep as it goes, back up only at a dead end, and let recursion remember the way back.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def dfs(adj: list[list[int]], node: int, visited: set[int], order: list[int]) -> None:
    visited.add(node)
    order.append(node)
    for neighbor in adj[node]:
        if neighbor not in visited:
            # Dive in now: this branch finishes before the next neighbour
            dfs(adj, neighbor, visited, order)`,
  },
  metrics: [
    { key: 'depth', label: 'Call depth' },
    { key: 'checks', label: 'Edges checked' },
    { key: 'result', label: 'Visit order' },
  ],
  legend: [
    { tone: 'active', label: 'vertex of the running call' },
    { tone: 'compare', label: 'neighbour being checked' },
    { tone: 'miss', label: 'already visited: skipped' },
    { tone: 'done', label: 'visited / edge that led to a call' },
    { tone: 'note', label: 'running call' },
    { tone: 'muted', label: 'paused call / unused edge' },
    { tone: 'found', label: 'the visit order' },
  ],
  goals: [
    { text: 'Go deep first, back up at dead ends', step: 2 },
    { text: 'Let the call stack remember the way back', step: 3 },
    { text: 'Watch every call, check and return', step: RUN_START + 1 },
    { text: 'Know why a vertex is marked as soon as it is entered', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Visit everything reachable from 0, going deep',
      body: 'In a hedge maze you follow one corridor as far as it goes, and turn back only at a dead end to try the last fork you passed.\n\nLine 1 visits `node`, adding everything it reaches to `visited` and `order`. We call it as `dfs(adj, 0, set(), [])`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, visited: [], order: [], stack: [], tree: new Set(), bare: true, note: 'adj = [[1, 2], [0, 3], [0, 3],\n       [1, 2, 4], [3]]\nstart = 0' }) },
    },
    {
      chapter: 'idea',
      short: 'Go deep',
      title: 'Follow one path to its end, then back up',
      body: 'From 0 take the first neighbour, 1; from 1 take 3; from 3 take 2. At 2 every neighbour is visited: a dead end, so back up to 3 and try its next one, 4.\n\nThe order is `0, 1, 3, 2, 4`. BFS on the same graph gives `0, 1, 2, 3, 4`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, visited: [0, 1, 3, 2], order: [0, 1, 3, 2], stack: [0, 1, 3, 2], tree: new Set([0, 2, 3]), bare: true, note: 'path: 0 → 1 → 3 → 2  (dead end)\nback to 3 → 4' }) },
    },
    {
      chapter: 'idea',
      short: 'Breadcrumbs',
      title: 'The call stack remembers where to back up to',
      body: 'Each paused call waits on the line that made the deeper call. When the deepest call finishes, the one under it simply carries on: that is the "back up to the last fork" from the maze, for free.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, visited: [0, 1, 3, 2], order: [0, 1, 3, 2], stack: [0, 1, 3, 2], tree: new Set([0, 2, 3]), note: 'dead end at 2 → its call returns\n→ dfs(3) resumes with 4' }) },
    },
    {
      chapter: 'build',
      short: 'Mark',
      title: 'Lines 2–3: entering a vertex marks it',
      body: 'Each call handles one vertex. Line 2 marks it visited the moment we arrive, and line 3 records the visit.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: { ...startMetrics, depth: 1 },
      changes: ['visited.add(node)', 'order.append(node)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Neighbours',
      title: 'Lines 4–5: look for an unvisited neighbour',
      body: 'Line 4 walks the neighbours in the order `adj[node]` lists them, and line 5 ignores any that are already visited.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: { ...startMetrics, depth: 1, checks: 1 },
      changes: ['for neighbor in adj[node]:', 'if neighbor not in visited:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Recurse',
      title: 'Lines 6–7: dive in with a recursive call',
      body: 'Line 7 calls `dfs` on the new neighbour. This call pauses until that whole branch is explored; when it returns, the loop on line 4 resumes. The **call stack** is the trail of breadcrumbs back.\n\nNow let’s run it, one call and one check at a time.',
      code: { view: 'final', lines: [6, 7] },
      metrics: { ...startMetrics, depth: 2, checks: 1 },
      changes: ['dfs(adj, neighbor, visited, order)'],
      scene: at(2),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One call per vertex, each edge read twice: O(V + E)',
      body: 'Line 2 makes sure each vertex gets exactly **one** call, and each call reads its adjacency list once, so every edge is read from both ends: **`O(V + E)` time**.\n\nThe call stack can grow as deep as the longest path: **`O(V)` space**, and Python stops near 1,000 calls unless you use an explicit stack.',
      code: { view: 'final', lines: [2, 4] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, visited: [0, 1, 3, 2, 4], order: [0, 1, 3, 2, 4], stack: [], tree: TREE, done: true, note: '5 calls, 10 edge checks\nchain of 10,000 → depth 10,000', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Mark first',
      title: 'Why line 2 marks a vertex before its neighbours',
      body: 'The graph has a cycle 0 → 1 → 3 → 2 → 0. When `dfs(2)` checks 0, line 5 must already see 0 as visited, or it would call `dfs(0)` again, and round the cycle forever.\n\nMarking on entry, before the loop, is the key decision: every vertex gets one call, even in a graph full of cycles.',
      code: { view: 'final', lines: [2, 5] },
      values: { 2: 'marked on the way in', 5: '0 not in visited → False' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, visited: [0, 1, 3, 2], order: [0, 1, 3, 2], stack: [0, 1, 3, 2], tree: new Set([0, 2, 3]), neighbor: 0, verdict: 'seen', note: 'cycle 0 → 1 → 3 → 2 → 0\nno early mark → dfs(0) again ✗' }) },
    },
  ],
  trace: {
    title: 'Run DFS on your own graph',
    inputs: graphInputs({ n: 5, from: '0, 0, 1, 2, 3', to: '1, 2, 3, 3, 4' }, [{ name: 'start', label: 'Start vertex', kind: 'number', default: '0' }]),
    presets: [
      { label: 'Disconnected', values: { n: '6', from: '0, 1, 3', to: '1, 2, 4', start: '0' } },
      { label: 'Cycle', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 0', start: '0' } },
      { label: 'Long chain', values: { n: '6', from: '0, 1, 2, 3, 4', to: '1, 2, 3, 4, 5', start: '0' } },
      { label: 'Star', values: { n: '5', from: '0, 0, 0, 0', to: '1, 2, 3, 4', start: '0' } },
    ],
    maxItems: 10,
    run: (values) => {
      const g = parseGraph(values, { directed: false });
      return traceDfs(g, parseVertex(values, 'start', g.n, 'Start vertex'));
    },
  },
});
