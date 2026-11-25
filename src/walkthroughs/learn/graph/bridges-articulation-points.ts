import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const LOW_Y = 130;
const NOTE = { x: 230, y: 330 } as const;

interface Frame {
  readonly u: number;
  readonly parent: number;
  readonly children: number;
}

interface BrState {
  readonly g: Graph;
  readonly tin: ReadonlyMap<number, number>;
  readonly low: ReadonlyMap<number, number>;
  readonly bridges: readonly (readonly [number, number])[];
  readonly aps: readonly number[];
  readonly stack: readonly Frame[];
  readonly v?: number;
  readonly verdict?: 'parent' | 'back' | 'tree' | 'lowUp' | 'bridge' | 'noBridge' | 'ap' | 'noAp' | 'end';
  readonly treeEdges: ReadonlySet<number>;
  readonly outer?: number;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: BrState): Entity[] {
  const top = s.stack.at(-1);
  const u = top?.u;
  const checking = u !== undefined && s.v !== undefined ? findEdge(s.g, u, s.v) : -1;
  const bridgeEdges = new Set(s.bridges.map(([a, b]) => findEdge(s.g, a, b)));
  const sub = (k: number): string => (s.tin.has(k) ? `${s.tin.get(k)}/${s.low.get(k)}` : '');
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      if (s.aps.includes(k)) return { tone: 'found', sub: sub(k) };
      if (k === u && s.verdict !== 'end') return { tone: 'active', sub: sub(k) };
      if (k === s.v) return { tone: s.verdict === 'parent' ? 'muted' : 'compare', sub: sub(k) };
      if (k === s.outer && u === undefined) return { tone: 'miss', sub: sub(k) };
      return { tone: s.tin.has(k) ? 'done' : 'default', sub: sub(k) };
    },
    edge: (i) => {
      if (bridgeEdges.has(i)) return { tone: 'found' };
      if (i === checking) {
        if (s.verdict === 'parent') return { tone: 'muted' };
        if (s.verdict === 'back') return { tone: 'compare', label: 'back edge' };
        if (s.verdict === 'noBridge') return { tone: 'miss' };
        return { tone: 'compare' };
      }
      if (s.treeEdges.has(i)) return { tone: 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const n = s.g.n;
  const cells = (m: ReadonlyMap<number, number>): (number | string)[] => Array.from({ length: n }, (_, k) => m.get(k) ?? '—');
  const tones = (m: ReadonlyMap<number, number>, hot: number | undefined): Record<number, Tone> =>
    Object.fromEntries(Array.from({ length: n }, (_, k) => [k, k === hot ? 'active' : m.has(k) ? 'done' : 'muted'])) as Record<number, Tone>;
  const lowHot = s.verdict === 'back' || s.verdict === 'lowUp' ? u : undefined;
  const right = tableBesideArray(n, 6);
  entities.push(
    arr('tin', 0, 0, cells(s.tin), { label: 'tin', codeVar: 'tin', tones: tones(s.tin, s.stack.length > 0 && s.verdict === undefined ? u : undefined) }),
    arr('low', 0, LOW_Y, cells(s.low), { label: 'low', codeVar: 'low', tones: tones(s.low, lowHot) }),
    vars(
      'vals',
      right,
      0,
      [
        { name: 'u', value: u ?? s.outer ?? '—', tone: u === undefined && s.outer === undefined ? 'muted' : 'default' },
        { name: 'v', value: s.v ?? '—', tone: s.v === undefined ? 'muted' : 'default' },
        { name: 'parent', value: top?.parent ?? '—', tone: top === undefined ? 'muted' : 'default' },
        { name: 'children', value: top?.children ?? '—', tone: top === undefined ? 'muted' : 'default' },
        { name: 'bridges', value: pyList(s.bridges.map(([a, b]) => `(${a}, ${b})`)), tone: s.verdict === 'bridge' ? 'active' : s.done ? 'found' : 'default' },
        { name: 'aps', value: `{${s.aps.join(', ')}}`, tone: s.verdict === 'ap' ? 'active' : s.done ? 'found' : 'default' },
      ],
      { label: 'variables', width: 200 },
    ),
  );
  if (s.stack.length > 0) {
    entities.push(
      map(
        'stack',
        right + 240,
        0,
        'call stack',
        s.stack.map((f, i) => {
          const isTop = i === s.stack.length - 1;
          return { key: `dfs(${f.u}, ${f.parent})`, value: isTop ? 'running' : 'waits on line 17', tone: (isTop ? 'note' : 'muted') as Tone };
        }),
        { width: 220 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs the tin / low DFS and records one decision per step: each call, each
 * neighbour (parent, back edge or tree edge), and after every child call the
 * low update, the bridge test and the articulation-point test.
 */
function traceBridges(g: Graph): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const tin = new Map<number, number>();
  const low = new Map<number, number>();
  const bridges: [number, number][] = [];
  const aps: number[] = [];
  const stack: { u: number; parent: number; children: number }[] = [];
  const treeEdges = new Set<number>();
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<BrState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { bridges: bridges.length, aps: aps.length, result: e.result ?? '—' },
      scene: {
        entities: scene({ g, tin: new Map(tin), low: new Map(low), bridges: bridges.map((b) => [...b] as [number, number]), aps: [...aps], stack: stack.map((f) => ({ ...f })), treeEdges: new Set(treeEdges), ...view }),
      },
    });
  };
  const L = (k: number): number => low.get(k) ?? 0;
  const T = (k: number): number => tin.get(k) ?? 0;

  const dfs = (u: number, parent: number, callText: string, callLines: readonly number[], callValues: Record<number, string | undefined>): void => {
    const t = tin.size;
    tin.set(u, t);
    low.set(u, t);
    const frame = { u, parent, children: 0 };
    stack.push(frame);
    emit({
      short: `dfs(${u})`,
      title: `Visit ${u}: time ${t}`,
      body: `${callText} Line 8 stamps ${u} with the next time, \`tin[${u}] = low[${u}] = ${t}\`: so far ${u} reaches nothing older than itself. Line 9: \`children = 0\`.`,
      lines: [...callLines, 8, 9],
      values: { ...callValues, 8: `tin[${u}] = low[${u}] = ${t}`, 9: 'children = 0' },
    });
    for (const v of adj[u] ?? []) {
      if (v === parent) {
        emit(
          {
            short: `${u}→${v}: parent`,
            title: `${v} is the parent: skip the edge back`,
            body: `Line 10: \`v = ${v}\`. Line 11: that is the vertex we came from. Using the same edge backwards would look like a cycle, so line 12 skips it.`,
            lines: [10, 11, 12],
            values: { 10: `v = ${v}`, 11: `${v} == ${parent} → True`, 12: 'continue' },
          },
          { v, verdict: 'parent' },
        );
        continue;
      }
      if (tin.has(v)) {
        const before = L(u);
        low.set(u, Math.min(before, T(v)));
        emit(
          {
            short: `${u}→${v}: back`,
            title: `Back edge to ${v}: ${u} reaches time ${T(v)}`,
            body: `Line 10: \`v = ${v}\`. Line 13: ${v} already has a time, so this edge jumps back to an ancestor. Line 14: \`low[${u}] = min(${before}, tin[${v}] = ${T(v)}) = ${L(u)}\`.`,
            lines: [10, 11, 13, 14],
            values: { 10: `v = ${v}`, 11: `${v} == ${parent} → False`, 13: `${v} in tin → True`, 14: `low[${u}] = ${L(u)}` },
          },
          { v, verdict: 'back' },
        );
        continue;
      }
      frame.children += 1;
      treeEdges.add(findEdge(g, u, v));
      emit(
        {
          short: `${u}→${v}: new`,
          title: `${v} is new: a tree edge, go deeper`,
          body: `Line 10: \`v = ${v}\`. Line 13: ${v} has no time yet. Line 16: \`children = ${frame.children}\`, and line 17 will explore ${v}'s whole subtree before coming back.`,
          lines: [10, 11, 13, 16],
          values: { 10: `v = ${v}`, 11: `${v} == ${parent} → False`, 13: `${v} in tin → False`, 16: `children = ${frame.children}` },
        },
        { v, verdict: 'tree' },
      );
      dfs(v, u, `Line 17 calls \`dfs(${v}, ${u})\`; \`dfs(${u})\` waits.`, [17], { 17: `dfs(${v}, ${u})` });
      const before = L(u);
      low.set(u, Math.min(before, L(v)));
      emit(
        {
          short: `low[${u}] = ${L(u)}`,
          title: `Back in ${u}: its subtree through ${v} reaches time ${L(v)}`,
          body: `\`dfs(${v})\` returned. Line 18: \`low[${u}] = min(${before}, low[${v}] = ${L(v)}) = ${L(u)}\`: anything ${v}'s subtree can reach, ${u} can reach too.`,
          lines: [18],
          values: { 18: `low[${u}] = ${L(u)}` },
        },
        { v, verdict: 'lowUp' },
      );
      const isBridge = L(v) > T(u);
      if (isBridge) bridges.push([u, v]);
      emit(
        {
          short: isBridge ? `Bridge ${u}–${v}` : `${u}–${v} not bridge`,
          title: isBridge ? `${u}–${v} is a bridge` : `${u}–${v} is not a bridge`,
          body: isBridge
            ? `Line 19: \`low[${v}] = ${L(v)} > tin[${u}] = ${T(u)}\`. Nothing under ${v} can reach ${u} or above except through this edge, so cutting it splits the graph. Line 20 records it.`
            : `Line 19: \`low[${v}] = ${L(v)} > tin[${u}] = ${T(u)}\` is false: ${v}'s subtree has another way back up to ${u} or higher, so this edge isn't the only link.`,
          lines: isBridge ? [19, 20] : [19],
          values: { 19: `${L(v)} > ${T(u)} → ${isBridge ? 'True' : 'False'}`, 20: isBridge ? `bridges = ${pyList(bridges.map(([a, b]) => `(${a}, ${b})`))}` : undefined },
        },
        { v, verdict: isBridge ? 'bridge' : 'noBridge' },
      );
      if (parent === -1) {
        emit(
          {
            short: 'Root: later',
            title: `${u} is the root: its test comes at the end`,
            body: `Line 21: \`parent == -1\`, so the "low ≥ tin" test doesn't apply to the root (every subtree reaches it trivially). Lines 23–24 handle the root after the loop.`,
            lines: [21],
            values: { 21: 'parent != -1 → False' },
          },
          { v, verdict: 'noAp' },
        );
        continue;
      }
      const isAp = L(v) >= T(u);
      if (isAp && !aps.includes(u)) aps.push(u);
      emit(
        {
          short: isAp ? `AP ${u}` : `${u} not AP (${v})`,
          title: isAp ? `${u} is an articulation point` : `${v}'s subtree doesn't depend on ${u}`,
          body: isAp
            ? `Line 21: \`low[${v}] = ${L(v)} >= tin[${u}] = ${T(u)}\`. ${v}'s subtree can't get above ${u} without ${u}, so removing ${u} cuts it off. Line 22 adds ${u}.`
            : `Line 21: \`low[${v}] = ${L(v)} >= tin[${u}] = ${T(u)}\` is false: ${v}'s subtree reaches above ${u}, so it stays connected without ${u}.`,
          lines: isAp ? [21, 22] : [21],
          values: { 21: `${L(v)} >= ${T(u)} → ${isAp ? 'True' : 'False'}`, 22: isAp ? `aps = {${aps.join(', ')}}` : undefined },
        },
        { v, verdict: isAp ? 'ap' : 'noAp' },
      );
    }
    const rootAp = parent === -1 && frame.children > 1;
    if (rootAp) aps.push(u);
    emit(
      {
        short: `${u} done`,
        title: parent === -1 ? (rootAp ? `Root ${u} has ${frame.children} subtrees: an articulation point` : `Root ${u} has ${frame.children} subtree: not a cut vertex`) : `dfs(${u}) is done`,
        body:
          parent === -1
            ? `Line 23: the root has \`children = ${frame.children}\`. ${rootAp ? 'Its subtrees only meet through it, so line 24 adds it.' : 'With one subtree, removing the root leaves the rest connected.'}`
            : `Every neighbour of ${u} is handled. Line 23: ${u} isn't the root, so the call ends with \`low[${u}] = ${L(u)}\`.`,
        lines: rootAp ? [23, 24] : [23],
        values: { 23: `parent == -1 and children > 1 → ${rootAp ? 'True' : 'False'}`, 24: rootAp ? `aps = {${aps.join(', ')}}` : undefined },
      },
      { verdict: 'end' },
    );
    stack.pop();
  };

  for (let u = 0; u < g.n; u += 1) {
    if (tin.has(u)) {
      emit(
        {
          short: `Skip ${u}`,
          title: `${u} already has a time`,
          body: `Line 26: \`u = ${u}\`. Line 27: ${u} is in \`tin\`, so it was visited by an earlier DFS.`,
          lines: [26, 27],
          values: { 26: `u = ${u}`, 27: `${u} not in tin → False` },
        },
        { outer: u },
      );
      continue;
    }
    dfs(u, -1, `Line 26: \`u = ${u}\` has no time yet, so line 28 starts a DFS with no parent.`, [26, 27, 28], { 26: `u = ${u}`, 27: `${u} not in tin → True`, 28: `dfs(${u}, -1)` });
  }
  const show = `${pyList(bridges.map(([a, b]) => `(${a}, ${b})`))}, {${aps.join(', ')}}`;
  emit(
    {
      short: 'Return',
      title: `Bridges ${pyList(bridges.map(([a, b]) => `${a}–${b}`))}, cut vertices {${aps.join(', ')}}`,
      body: `Line 29 returns \`${show}\`: ${bridges.length} edge${bridges.length === 1 ? '' : 's'} and ${aps.length} vertex${aps.length === 1 ? '' : 'es'} whose removal would split the graph.`,
      lines: [29],
      values: { 29: `return ${show}` },
      result: `${bridges.length} bridge${bridges.length === 1 ? '' : 's'}, ${aps.length} cut`,
    },
    { done: true },
  );
  return steps;
}

// Story graph: a triangle 0–1–2 with a pendant edge 1–3. The edge 1–3 is a bridge and 1 is a cut vertex.
const G: Graph = {
  n: 4,
  directed: false,
  edges: [
    { u: 0, v: 1 },
    { u: 1, v: 2 },
    { u: 2, v: 0 },
    { u: 1, v: 3 },
  ],
};
const RUN = traceBridges(G);
const RUN_START = 12;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`bridges-articulation-points: no run step "${short}"`);
  return i;
};
const startMetrics = { bridges: 0, aps: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BACK = find('2→0: back');
const BRIDGE = find('Bridge 1–3');

export default defineWalkthrough({
  id: 'learn/graph/bridges-articulation-points',
  title: 'Bridges & Articulation Points, single points of failure',
  summary: 'From the idea to the code: one DFS stamps each vertex with a time and tracks the oldest vertex its subtree can reach; a subtree that can’t reach above its parent hangs by one edge or one vertex.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `def find_bridges_and_aps(adj: list[list[int]]) -> tuple[list[tuple[int, int]], set[int]]:
    tin: dict[int, int] = {}
    low: dict[int, int] = {}
    bridges: list[tuple[int, int]] = []
    aps: set[int] = set()

    def dfs(u: int, parent: int) -> None:
        tin[u] = low[u] = len(tin)
        children = 0
        for v in adj[u]:
            if v == parent:
                continue
            if v in tin:
                low[u] = min(low[u], tin[v])  # Back edge to an ancestor
            else:
                children += 1
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > tin[u]:
                    bridges.append((u, v))
                if parent != -1 and low[v] >= tin[u]:
                    aps.add(u)
        if parent == -1 and children > 1:
            aps.add(u)

    for u in range(len(adj)):
        if u not in tin:
            dfs(u, -1)
    return bridges, aps`,
  },
  metrics: [
    { key: 'bridges', label: 'Bridges' },
    { key: 'aps', label: 'Cut vertices' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex of the running call / value just set' },
    { tone: 'compare', label: 'neighbour / edge being handled' },
    { tone: 'done', label: 'visited / tree edge' },
    { tone: 'found', label: 'bridge / articulation point' },
    { tone: 'miss', label: 'not a bridge' },
    { tone: 'note', label: 'running call' },
    { tone: 'muted', label: 'edge to the parent / paused call / not set' },
  ],
  goals: [
    { text: 'Know what bridges and cut vertices are', step: 2 },
    { text: 'Read tin and low: “how far back can this subtree reach?”', step: 3 },
    { text: 'Watch every call, edge and test', step: RUN_START + 1 },
    { text: 'Know why the bridge test uses > and the vertex test ≥', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Which single edge or vertex would split the graph?',
      body: 'If closing one highway cuts a country in two, it is a **bridge**; if closing one junction splits the network, it is an **articulation point**.\n\nLine 1 takes the adjacency lists `adj` (edges both ways) and returns both: the list of bridges and the set of articulation points.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, tin: new Map(), low: new Map(), bridges: [], aps: [], stack: [], treeEdges: new Set(), bare: true, note: 'adj = [[1, 2], [0, 2, 3],\n       [1, 0], [1]]' }) },
    },
    {
      chapter: 'idea',
      short: 'Hanging',
      title: 'A part that hangs by one edge or one vertex',
      body: 'Cut 1–3 and vertex 3 is alone: a bridge. Remove vertex 1 and 3 is cut off too: an articulation point. Cutting 0–1 changes nothing, because 0 still reaches 1 through 2.\n\nSo the question is: can a part of the graph get back **around** an edge, or around a vertex?',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, tin: new Map(), low: new Map(), bridges: [[1, 3]], aps: [1], stack: [], treeEdges: new Set(), bare: true, note: 'bridge 1–3, cut vertex 1\n0–1 is safe: 0 → 2 → 1' }) },
    },
    {
      chapter: 'idea',
      short: 'tin / low',
      title: 'Discovery time, and the oldest time a subtree reaches',
      body: 'DFS stamps each vertex with `tin`, the order it was found. `low[u]` is the oldest `tin` that u’s subtree can reach using **one** back edge. Under each vertex: `tin/low`.\n\nIf a child’s subtree can’t reach older than its parent, it hangs on the parent.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(BACK),
    },
    {
      chapter: 'build',
      short: 'Tables',
      title: 'Lines 2–5: times, low values and the answers',
      body: '`tin` and `low` are filled as the DFS goes; `bridges` and `aps` collect the answers.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['tin = {}', 'low = {}', 'bridges = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Stamp',
      title: 'Lines 5–8: stamp each vertex on arrival',
      body: '`len(tin)` is how many vertices were visited before, so it is the next time stamp. `low` starts equal to it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8], lines: [5, 7, 8] },
      metrics: startMetrics,
      changes: ['aps = set()', 'def dfs(u, parent)', 'tin[u] = low[u] = len(tin)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Neighbours',
      title: 'Lines 9–11: count children, look at each neighbour',
      body: '`children` counts the DFS subtrees hanging under `u`. Line 11 spots the edge back to the parent.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11], lines: [9, 10, 11] },
      metrics: startMetrics,
      changes: ['children = 0', 'for v in adj[u]:', 'if v == parent:'],
      scene: at(find('1→0: parent')),
    },
    {
      chapter: 'build',
      short: 'Back edge',
      title: 'Lines 12–14: skip the parent, use back edges',
      body: 'The parent edge is skipped. A neighbour that already has a time is an ancestor: line 14 lets `u` reach its time.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14], lines: [12, 13, 14] },
      metrics: startMetrics,
      changes: ['continue', 'if v in tin:', 'low[u] = min(low[u], tin[v])'],
      scene: at(BACK),
    },
    {
      chapter: 'build',
      short: 'Tree edge',
      title: 'Lines 15–17: a new vertex is a child: explore it',
      body: 'A vertex without a time becomes a child (line 16) and is explored completely (line 17).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], lines: [15, 16, 17] },
      metrics: startMetrics,
      changes: ['else:', 'children += 1', 'dfs(v, u)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Bridge test',
      title: 'Lines 18–20: pull up low, test the edge',
      body: 'After the child returns, `u` inherits whatever its subtree reaches (line 18). If the child’s subtree can’t reach `u` or older, the edge is a bridge.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], lines: [18, 19, 20] },
      metrics: startMetrics,
      changes: ['low[u] = min(low[u], low[v])', 'if low[v] > tin[u]:', 'bridges.append((u, v))'],
      scene: at(BRIDGE),
    },
    {
      chapter: 'build',
      short: 'Vertex test',
      title: 'Lines 21–23: the cut-vertex test',
      body: 'A non-root `u` is a cut vertex if some child’s subtree can’t get above it (lines 21–22). Line 23 starts the root’s own test, after the loop.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], lines: [21, 22, 23] },
      metrics: startMetrics,
      changes: ['if parent != -1 and low[v] >= tin[u]:', 'aps.add(u)', 'if parent == -1 and children > 1:'],
      scene: at(BRIDGE + 1),
    },
    {
      chapter: 'build',
      short: 'Root',
      title: 'Lines 24–27: the root, and every start',
      body: 'The root is a cut vertex exactly when it has two or more DFS children: they can only meet through it (line 24). Lines 26–27 look for vertices no DFS reached yet.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27], lines: [24, 26, 27] },
      metrics: startMetrics,
      changes: ['aps.add(u)', 'for u in range(len(adj)):', 'if u not in tin:'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Lines 28–29: a DFS with no parent, then return',
      body: 'Each new piece starts a DFS with parent `-1`. Line 29 returns both answers.\n\nNow let’s run it.',
      code: { view: 'final', lines: [28, 29] },
      metrics: startMetrics,
      changes: ['dfs(u, -1)', 'return bridges, aps'],
      scene: at(0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One DFS: O(V + E)',
      body: 'Each vertex is stamped once and each edge is looked at from both ends, with constant work per look: **`O(V + E)` time**, `O(V)` for `tin`, `low` and the call stack.',
      code: { view: 'final', lines: [8, 10] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, tin: new Map([[0, 0], [1, 1], [2, 2], [3, 3]]), low: new Map([[0, 0], [1, 0], [2, 0], [3, 3]]), bridges: [[1, 3]], aps: [1], stack: [], treeEdges: new Set([0, 1, 3]), done: true, note: '4 vertices, 8 edge looks\nbridge 1–3, cut vertex 1', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: '> vs ≥',
      title: 'Why the bridge test is > and the vertex test is ≥',
      body: 'Under 1, child 2 has `low = 0`: it reaches above 1, so neither 1–2 nor 1 is critical for it. Child 3 has `low = 3`. For the **edge** 1–3, reaching 1 itself would be enough to survive the cut (so bridge needs `low[v] > tin[u]`). For the **vertex** 1, reaching 1 doesn’t help once 1 is gone, so `low[v] ≥ tin[u]` already cuts it off.\n\nThat one-character difference is the key decision.',
      code: { view: 'final', lines: [19, 21] },
      values: { 19: 'low[3] = 3 > tin[1] = 1', 21: 'low[3] = 3 >= tin[1] = 1' },
      metrics: FINAL_METRICS,
      scene: at(BRIDGE),
    },
  ],
  trace: {
    title: 'Find the weak spots of your own graph',
    inputs: graphInputs({ n: 4, from: '0, 1, 2, 1', to: '1, 2, 0, 3' }),
    presets: [
      { label: 'A chain (all bridges)', values: { n: '4', from: '0, 1, 2', to: '1, 2, 3' } },
      { label: 'A cycle (none)', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 0' } },
      { label: 'Root with two arms', values: { n: '5', from: '0, 1, 0, 3', to: '1, 2, 3, 4' } },
      { label: 'Two triangles, one vertex', values: { n: '5', from: '0, 1, 2, 2, 3, 4', to: '1, 2, 0, 3, 4, 2' } },
    ],
    maxItems: 8,
    run: (values) => traceBridges(parseGraph(values, { directed: false, allowEmpty: false })),
  },
});
