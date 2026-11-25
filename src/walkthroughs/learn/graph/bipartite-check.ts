import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, listArr, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 300 } as const;

interface BipState {
  readonly g: Graph;
  /** Colour of each vertex, in the order they were coloured. */
  readonly color: ReadonlyMap<number, number>;
  readonly queue: readonly number[];
  readonly start?: number;
  readonly startVerdict?: 'new' | 'skip';
  readonly u?: number;
  readonly v?: number;
  readonly verdict?: 'uncolored' | 'painted' | 'opposite' | 'clash';
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: BipState): Entity[] {
  const checking = s.u !== undefined && s.v !== undefined ? findEdge(s.g, s.u, s.v) : -1;
  const sub = (k: number): string => (s.color.has(k) ? `color ${s.color.get(k)}` : '');
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      if (s.verdict === 'clash' && (k === s.u || k === s.v)) return { tone: 'miss', sub: sub(k) };
      if (k === s.u) return { tone: 'active', sub: sub(k) };
      if (k === s.v) return { tone: 'compare', sub: sub(k) };
      if (k === s.start && s.startVerdict) return { tone: s.startVerdict === 'skip' ? 'muted' : 'active', sub: sub(k) };
      return { tone: s.color.has(k) ? (s.done ? 'found' : 'done') : 'default', sub: sub(k) };
    },
    edge: (i, e) => {
      if (i === checking) {
        // Short labels (≤ 6 characters) so the pill stays clear of the blocks on short edges.
        const cu = s.u !== undefined ? s.color.get(s.u) : undefined;
        const cv = s.v !== undefined ? s.color.get(s.v) : undefined;
        if (s.verdict === 'clash') return { tone: 'miss', label: `${cu} = ${cv}` };
        if (s.verdict === 'opposite') return { tone: 'done', label: `${cu} ≠ ${cv}` };
        return { tone: 'compare', label: s.verdict === 'painted' ? `${s.v} → ${cv}` : `${s.v}: ?` };
      }
      const cu = s.color.get(e.u);
      const cv = s.color.get(e.v);
      if (cu !== undefined && cv !== undefined && cu !== cv) return { tone: s.done ? 'found' : 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const dash = (x: number | undefined): number | string => x ?? '—';
  entities.push(
    listArr('queue', 0, 0, s.queue, { label: 'queue', codeVar: 'queue', tones: (k) => (k === s.v && s.verdict === 'painted' ? 'active' : 'default') }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'start', value: dash(s.start), tone: s.start === undefined ? 'muted' : 'default' },
        { name: 'u', value: dash(s.u), tone: s.u === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(s.v), tone: s.v === undefined ? 'muted' : s.verdict === 'clash' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 170 },
    ),
    map(
      'color',
      tableBesideArray(s.g.n, s.g.n),
      0,
      'color',
      [...s.color.entries()].map(([k, c]) => ({
        key: k,
        value: c,
        tone: (s.verdict === 'clash' && (k === s.u || k === s.v) ? 'miss' : k === s.v && s.verdict === 'painted' ? 'active' : 'default') as Tone,
      })),
      { codeVar: 'color', width: 150 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the BFS 2-colouring and records one decision per step: each start, pop, neighbour check and paint. */
function traceBipartite(g: Graph): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const color = new Map<number, number>();
  let queue: number[] = [];
  let checks = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<BipState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { colored: color.size, checks, result: e.result ?? '—' },
      scene: { entities: scene({ g, color: new Map(color), queue: [...queue], ...view }) },
    });
  };

  emit({
    short: 'Start',
    title: 'No vertex has a color yet',
    body: `Line 5 starts an empty \`color\` dict. Line 6 will try every vertex, 0 to ${g.n - 1}, so every separate piece of the graph gets colored.`,
    lines: [5, 6],
    values: { 5: 'color = {}' },
  });

  for (let start = 0; start < g.n; start += 1) {
    if (color.has(start)) {
      emit(
        {
          short: `${start}: skip`,
          title: `${start} already has a color`,
          body: `Line 6: \`start = ${start}\`. Line 7: ${start} is already in \`color\`, colored while exploring an earlier start. Line 8 skips it.`,
          lines: [6, 7, 8],
          values: { 6: `start = ${start}`, 7: `${start} in color → True`, 8: 'continue' },
        },
        { start, startVerdict: 'skip' },
      );
      continue;
    }
    color.set(start, 0);
    queue = [start];
    emit(
      {
        short: `${start}: new`,
        title: `Seed ${start} with color 0`,
        body: `Line 6: \`start = ${start}\`, uncolored, so it starts a new piece. Its color is a free choice: line 9 picks 0. Line 10 puts it in the queue.`,
        lines: [6, 7, 9, 10],
        values: { 6: `start = ${start}`, 7: `${start} in color → False`, 9: `color[${start}] = 0`, 10: `queue = [${start}]` },
      },
      { start, startVerdict: 'new' },
    );
    while (queue.length > 0) {
      const u = queue.shift() ?? 0;
      emit(
        {
          short: `Pop ${u}`,
          title: `Pop ${u} (color ${color.get(u)})`,
          body: `Line 11: the queue isn't empty. Line 12 pops ${u} from the front; it has color ${color.get(u)}, so all of its neighbours must get color ${1 - (color.get(u) ?? 0)}.`,
          lines: [11, 12],
          values: { 11: 'queue → True', 12: `u = ${u}` },
        },
        { start, u },
      );
      for (const v of adj[u] ?? []) {
        checks += 1;
        const cu = color.get(u) ?? 0;
        const cv = color.get(v);
        if (cv === undefined) {
          emit(
            {
              short: `${u}→${v}?`,
              title: `${v} has no color yet`,
              body: `Line 13: \`v = ${v}\`. Line 14: ${v} is not in \`color\`, so nothing constrains it except this edge.`,
              lines: [13, 14],
              values: { 13: `v = ${v}`, 14: `${v} not in color → True` },
            },
            { start, u, v, verdict: 'uncolored' },
          );
          color.set(v, 1 - cu);
          queue.push(v);
          emit(
            {
              short: `Paint ${v}`,
              title: `${v} takes the other side: color ${1 - cu}`,
              body: `Line 16: \`color[${v}] = 1 - ${cu} = ${1 - cu}\`, the opposite of ${u}. Line 17 queues ${v} so its own neighbours get checked: \`queue = ${pyList(queue)}\`.`,
              lines: [16, 17],
              values: { 16: `color[${v}] = 1 - ${cu} = ${1 - cu}`, 17: `queue = ${pyList(queue)}` },
            },
            { start, u, v, verdict: 'painted' },
          );
          continue;
        }
        if (cv === cu) {
          emit(
            {
              short: 'Clash',
              title: `${u} and ${v} both have color ${cu}: not bipartite`,
              body: `Line 13: \`v = ${v}\`. Line 14: ${v} already has a color. Line 18: it is ${cv}, the **same** as ${u}'s, yet an edge joins them. No 2-coloring can fix this edge, so line 19 returns \`False\`.`,
              lines: [13, 14, 18, 19],
              values: { 13: `v = ${v}`, 14: `${v} not in color → False`, 18: `${cv} == ${cu} → True`, 19: 'return False' },
              result: 'False',
            },
            { start, u, v, verdict: 'clash' },
          );
          return steps;
        }
        emit(
          {
            short: `${u}→${v} ok`,
            title: `${v} is on the other side already`,
            body: `Line 13: \`v = ${v}\`. Line 14: ${v} is colored. Line 18: its color ${cv} differs from ${u}'s ${cu}, so this edge is fine. Nothing to do.`,
            lines: [13, 14, 18],
            values: { 13: `v = ${v}`, 14: `${v} not in color → False`, 18: `${cv} == ${cu} → False` },
          },
          { start, u, v, verdict: 'opposite' },
        );
      }
    }
  }
  emit(
    {
      short: 'Return True',
      title: 'Every edge joins two colors: bipartite',
      body: `Every vertex is colored and no edge joined two vertices of the same color. Line 20 returns **True**: side 0 is {${[...color].filter(([, c]) => c === 0).map(([k]) => k).join(', ')}}, side 1 is {${[...color].filter(([, c]) => c === 1).map(([k]) => k).join(', ')}}.`,
      lines: [20],
      values: { 20: 'return True' },
      result: 'True',
    },
    { done: true },
  );
  return steps;
}

// Story graph: the square 0–1–3–2 (an even cycle) with a tail 3–4. It is bipartite.
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
const TRIANGLE: Graph = { n: 5, directed: false, edges: [...G.edges, { u: 1, v: 2 }] };
const RUN = traceBipartite(G);
const RUN_START = 9;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { colored: 0, checks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FINAL_COLOR = new Map([
  [0, 0],
  [1, 1],
  [2, 1],
  [3, 0],
  [4, 1],
]);

export default defineWalkthrough({
  id: 'learn/graph/bipartite-check',
  title: 'Bipartite Check, two teams with no inside rivals',
  summary: 'From the idea to the code: color the start 0, force every neighbour to the other color with BFS, and fail the moment an edge joins two vertices of the same color.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `from collections import deque


def is_bipartite(adj: list[list[int]]) -> bool:
    color: dict[int, int] = {}
    for start in range(len(adj)):
        if start in color:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v not in color:
                    # Neighbours must take the opposite side
                    color[v] = 1 - color[u]
                    queue.append(v)
                elif color[v] == color[u]:
                    return False
    return True`,
  },
  metrics: [
    { key: 'colored', label: 'Colored' },
    { key: 'checks', label: 'Edges checked' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex popped / new start' },
    { tone: 'compare', label: 'neighbour being checked' },
    { tone: 'done', label: 'colored / edge between two colors' },
    { tone: 'miss', label: 'same-color edge' },
    { tone: 'found', label: 'the final 2-coloring' },
    { tone: 'muted', label: 'start skipped: already colored' },
  ],
  goals: [
    { text: 'See why one color decides all the others', step: 2 },
    { text: 'Spot the odd cycle that makes it impossible', step: 3 },
    { text: 'Watch every pop, check and paint', step: RUN_START + 1 },
    { text: 'Know why line 16 never has a choice to make', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Split 5 players into two teams',
      body: 'Every edge is a rivalry, and rivals must wear different jerseys. Can everyone get one of two colors so that no edge joins two of the same?\n\nLine 4 takes the adjacency lists `adj` (edges go both ways) and returns `True` if such a split exists.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, color: new Map(), queue: [], bare: true, note: 'adj = [[1, 2], [0, 3], [0, 3],\n       [1, 2, 4], [3]]' }) },
    },
    {
      chapter: 'idea',
      short: 'Forced',
      title: 'Choose one color, and the rest is forced',
      body: 'Give 0 color 0. Its neighbours 1 and 2 **must** be 1; their neighbour 3 must be 0; then 4 must be 1. Nothing was ever a choice after the first vertex.\n\nSo spread colors outward with BFS and just check that no edge breaks the rule.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, color: FINAL_COLOR, queue: [], bare: true, done: true, note: 'side 0: 0, 3\nside 1: 1, 2, 4' }) },
    },
    {
      chapter: 'idea',
      short: 'Odd cycle',
      title: 'An odd cycle can never be split',
      body: 'Add the edge 1–2: now 0, 1, 2 form a triangle. 1 and 2 both have to be the opposite of 0, so they get the **same** color, but they are rivals.\n\nAround any cycle the colors alternate, so a cycle of odd length always ends with a clash.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: TRIANGLE, color: new Map([[0, 0], [1, 1], [2, 1]]), queue: [], u: 1, v: 2, verdict: 'clash', bare: true, note: 'triangle 0–1–2:\n1 and 2 both get color 1  ✗' }) },
    },
    {
      chapter: 'build',
      short: 'Each start',
      title: 'Lines 5–7: try every vertex as a start',
      body: '`color` maps a vertex to 0 or 1. Line 6 tries every vertex, so separate pieces of the graph get colored too; line 7 asks whether this one already has a color.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['color = {}', 'for start in range(len(adj)):', 'if start in color:'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Seed',
      title: 'Lines 8–10: skip colored starts, seed the rest with 0',
      body: 'A colored start was reached earlier, so line 8 skips it. Otherwise it begins a new piece, and its color is a free pick: line 9 uses 0, and line 10 queues it.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: { ...startMetrics, colored: 1 },
      changes: ['continue', 'color[start] = 0', 'queue = deque([start])'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'BFS',
      title: 'Lines 11–13: BFS through the piece',
      body: 'Plain BFS: while anyone waits, line 12 pops the front vertex `u` and line 13 looks at each neighbour `v`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: { ...startMetrics, colored: 1 },
      changes: ['while queue:', 'u = queue.popleft()', 'for v in adj[u]:'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Paint',
      title: 'Lines 14–16: an uncolored neighbour takes the other side',
      body: 'A neighbour without a color gets `1 - color[u]`: 0 becomes 1 and 1 becomes 0, so this edge joins two different colors.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], lines: [14, 16] },
      metrics: { ...startMetrics, colored: 2, checks: 1 },
      changes: ['if v not in color:', 'color[v] = 1 - color[u]'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Clash',
      title: 'Lines 17–19: queue it, or catch a clash',
      body: 'Line 17 queues the freshly painted neighbour. A neighbour that already has **our** color can’t be fixed: line 19 returns `False`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], lines: [17, 18, 19] },
      metrics: { ...startMetrics, colored: 3, checks: 2 },
      changes: ['queue.append(v)', 'elif color[v] == color[u]:', 'return False'],
      scene: at(7),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 20: no clash anywhere',
      body: 'If every edge survives the check, line 20 returns `True`.\n\nNow let’s run it, one decision at a time.',
      code: { view: 'final', lines: [20] },
      metrics: startMetrics,
      changes: ['return True'],
      scene: at(0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each vertex colored once, each edge checked twice: O(V + E)',
      body: 'Every vertex is colored and queued once, and line 13 reads each edge from both ends: **`O(V + E)` time**, `O(V)` for `color` and the queue. A clash stops it early.',
      code: { view: 'final', lines: [12, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, color: FINAL_COLOR, queue: [], done: true, note: '5 colored, 10 edge checks\nsides {0, 3} and {1, 2, 4}', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Forced',
      title: 'Why line 16 uses 1 − color[u], with no choice',
      body: 'Once `u` has a color, its neighbour has exactly one legal color: the other one. Trying both would be backtracking, exponential in the worst case.\n\nBecause every color after the seed is forced, a single clash proves **no** 2-coloring exists: that is the key decision, and it is why the check is linear.',
      code: { view: 'final', lines: [15, 16, 18, 19] },
      values: { 16: 'only legal color', 19: 'a forced clash: impossible' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, color: new Map([[0, 0], [1, 1], [2, 1], [3, 0]]), queue: [2, 3], u: 1, v: 3, verdict: 'painted', note: 'u = 1 has color 1\n→ 3 must be 0: no choice' }) },
    },
  ],
  trace: {
    title: 'Check your own graph for a 2-coloring',
    inputs: graphInputs({ n: 5, from: '0, 0, 1, 2, 3', to: '1, 2, 3, 3, 4' }),
    presets: [
      { label: 'Triangle (odd cycle)', values: { n: '3', from: '0, 1, 2', to: '1, 2, 0' } },
      { label: 'Odd cycle of 5', values: { n: '5', from: '0, 1, 2, 3, 4', to: '1, 2, 3, 4, 0' } },
      { label: 'Two pieces', values: { n: '6', from: '0, 1, 3, 4', to: '1, 2, 4, 5' } },
      { label: 'Even cycle of 6', values: { n: '6', from: '0, 1, 2, 3, 4, 5', to: '1, 2, 3, 4, 5, 0' } },
    ],
    maxItems: 10,
    run: (values) => traceBipartite(parseGraph(values, { directed: false })),
  },
});
