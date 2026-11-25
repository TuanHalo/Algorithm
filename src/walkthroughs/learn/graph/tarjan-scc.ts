import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, listArr, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** Rows start right of x = 0 so the lowest row's label clears the graph (as in Floyd-Warshall). */
const TABLE_X = 110;
const LOW_Y = 130;
const STACK_Y = 260;
const NOTE = { x: 260, y: 380 } as const;

interface TaState {
  readonly g: Graph;
  readonly disc: readonly number[];
  readonly low: readonly number[];
  readonly stack: readonly number[];
  readonly sccs: readonly (readonly number[])[];
  readonly component: readonly number[];
  readonly calls: readonly number[];
  readonly timer: number;
  readonly v?: number;
  readonly verdict?: 'tree' | 'back' | 'cross' | 'lowUp' | 'root' | 'notRoot' | 'pop';
  readonly w?: number;
  readonly outer?: number;
  readonly treeEdges: ReadonlySet<number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: TaState): Entity[] {
  const u = s.calls.at(-1);
  const checking = u !== undefined && s.v !== undefined ? findEdge(s.g, u, s.v) : -1;
  const sccOf = (k: number): number => s.sccs.findIndex((c) => c.includes(k));
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      const c = sccOf(k);
      const sub = c >= 0 ? `scc ${c}` : (s.disc[k] ?? -1) >= 0 ? `${s.disc[k]}/${s.low[k]}` : '';
      if (k === s.w) return { tone: 'found', sub };
      if (k === u) return { tone: s.verdict === 'root' ? 'found' : 'active', sub };
      if (k === s.v) return { tone: s.verdict === 'cross' ? 'miss' : 'compare', sub };
      if (k === s.outer && u === undefined) return { tone: 'miss', sub };
      if (c >= 0) return { tone: 'found', sub };
      if (s.component.includes(k)) return { tone: 'found', sub };
      return { tone: s.stack.includes(k) ? 'done' : 'default', sub };
    },
    edge: (i, e) => {
      if (i === checking) return { tone: s.verdict === 'cross' ? 'miss' : 'compare', ...(s.verdict === 'back' ? { label: 'back' } : {}) };
      const cu = sccOf(e.u);
      if (cu >= 0 && cu === sccOf(e.v)) return { tone: 'found' };
      if (s.treeEdges.has(i)) return { tone: 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const n = s.g.n;
  const hot = (k: number, which: 'disc' | 'low'): Tone => {
    if (which === 'low' && k === u && (s.verdict === 'back' || s.verdict === 'lowUp')) return 'active';
    if (which === 'disc' && k === u && s.verdict === undefined) return 'active';
    if (k === u && (s.verdict === 'root' || s.verdict === 'notRoot')) return 'compare';
    return (which === 'disc' ? s.disc[k] : s.low[k]) === -1 ? 'muted' : 'default';
  };
  const right = TABLE_X + tableBesideArray(n, 5);
  entities.push(
    arr('disc', TABLE_X, 0, s.disc, { label: 'disc', codeVar: 'disc', tones: Object.fromEntries(s.disc.map((_, k) => [k, hot(k, 'disc')])) }),
    arr('low', TABLE_X, LOW_Y, s.low, { label: 'low', codeVar: 'low', tones: Object.fromEntries(s.low.map((_, k) => [k, hot(k, 'low')])) }),
    listArr('stack', TABLE_X, STACK_Y, s.stack, { label: 'stack', codeVar: 'stack', tones: (k, i) => (s.verdict === undefined && k === u && i === s.stack.length - 1 ? 'active' : 'done') }),
    vars(
      'vals',
      right,
      0,
      [
        { name: 'u', value: u ?? s.outer ?? '—', tone: u === undefined && s.outer === undefined ? 'muted' : 'default' },
        { name: 'v', value: s.v ?? '—', tone: s.v === undefined ? 'muted' : 'default' },
        { name: 'timer', value: s.timer },
        { name: 'component', value: pyList(s.component), tone: s.component.length ? 'active' : 'muted' },
        { name: 'sccs', value: pyList(s.sccs.map((c) => pyList(c))), tone: s.done ? 'found' : 'default' },
      ],
      { label: 'variables', width: 230 },
    ),
  );
  if (s.calls.length > 0) {
    entities.push(
      map(
        'calls',
        right + 330,
        0,
        'call stack',
        s.calls.map((k, i) => {
          const top = i === s.calls.length - 1;
          return { key: `dfs(${k})`, value: top ? 'running' : 'waits on line 16', tone: (top ? 'note' : 'muted') as Tone };
        }),
        { width: 190 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs Tarjan's algorithm and records one decision per step: each call, each
 * edge (tree, back into the stack, or to a finished component), each low update
 * after a child returns, each root check, each pop and each stored component.
 */
function traceTarjan(g: Graph): Step[] {
  const adj = adjacency(g);
  const n = g.n;
  const steps: Step[] = [];
  const disc = Array.from({ length: n }, () => -1);
  const low = Array.from({ length: n }, () => -1);
  const onStack = Array.from({ length: n }, () => false);
  const stack: number[] = [];
  const sccs: number[][] = [];
  let component: number[] = [];
  const calls: number[] = [];
  const treeEdges = new Set<number>();
  let timer = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<TaState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { onStack: stack.length, sccs: sccs.length, result: e.result ?? '—' },
      scene: {
        entities: scene({ g, disc: [...disc], low: [...low], stack: [...stack], sccs: sccs.map((c) => [...c]), component: [...component], calls: [...calls], timer, treeEdges: new Set(treeEdges), ...view }),
      },
    });
  };
  const D = (k: number): number => disc[k] ?? -1;
  const Lo = (k: number): number => low[k] ?? -1;

  const dfs = (u: number, callText: string, callLines: readonly number[], callValues: Record<number, string | undefined>): void => {
    calls.push(u);
    disc[u] = timer;
    low[u] = timer;
    timer += 1;
    stack.push(u);
    onStack[u] = true;
    emit({
      short: `dfs(${u})`,
      title: `Visit ${u}: time ${D(u)}, onto the stack`,
      body: `${callText} Lines 10–11: \`disc[${u}] = low[${u}] = ${D(u)}\`, then \`timer = ${timer}\`. Lines 12–13 push ${u} on the stack: it waits there until its component is complete.`,
      lines: [...callLines, 10, 11, 12, 13],
      values: { ...callValues, 10: `disc[${u}] = low[${u}] = ${D(u)}`, 11: `timer = ${timer}`, 12: `stack = ${pyList(stack)}` },
    });
    for (const v of adj[u] ?? []) {
      if (D(v) === -1) {
        treeEdges.add(findEdge(g, u, v));
        emit(
          {
            short: `${u}→${v}: new`,
            title: `${v} is unvisited: a tree edge`,
            body: `Line 14: \`v = ${v}\`. Line 15: \`disc[${v}] == -1\`, so line 16 calls \`dfs(${v})\` and \`dfs(${u})\` waits.`,
            lines: [14, 15],
            values: { 14: `v = ${v}`, 15: `disc[${v}] == -1 → True` },
          },
          { v, verdict: 'tree' },
        );
        dfs(v, `Line 16 calls \`dfs(${v})\`.`, [16], { 16: `dfs(${v})` });
        const before = Lo(u);
        low[u] = Math.min(before, Lo(v));
        emit(
          {
            short: `low[${u}] = ${Lo(u)}`,
            title: `Back in ${u}: take ${v}'s low`,
            body: `\`dfs(${v})\` returned. Line 17: \`low[${u}] = min(${before}, low[${v}] = ${Lo(v)}) = ${Lo(u)}\`: whatever ${v}'s subtree can reach, ${u} can too.`,
            lines: [17],
            values: { 17: `low[${u}] = ${Lo(u)}` },
          },
          { v, verdict: 'lowUp' },
        );
        continue;
      }
      if (onStack[v]) {
        const before = Lo(u);
        low[u] = Math.min(before, D(v));
        emit(
          {
            short: `${u}→${v}: back`,
            title: `${v} is still on the stack: a back edge`,
            body: `Line 14: \`v = ${v}\`. Line 15: visited. Line 18: \`on_stack[${v}]\` is true, so ${v} belongs to a component still being built, and ${u} can reach it. Line 19: \`low[${u}] = min(${before}, disc[${v}] = ${D(v)}) = ${Lo(u)}\`.`,
            lines: [14, 15, 18, 19],
            values: { 14: `v = ${v}`, 15: `disc[${v}] == -1 → False`, 18: `on_stack[${v}] → True`, 19: `low[${u}] = ${Lo(u)}` },
          },
          { v, verdict: 'back' },
        );
        continue;
      }
      emit(
        {
          short: `${u}→${v}: done`,
          title: `${v} is in a finished component: ignore`,
          body: `Line 14: \`v = ${v}\`. Line 15: visited, and line 18: no longer on the stack, so ${v}'s component is already complete. An edge into it can't make it part of ${u}'s.`,
          lines: [14, 15, 18],
          values: { 14: `v = ${v}`, 15: `disc[${v}] == -1 → False`, 18: `on_stack[${v}] → False` },
        },
        { v, verdict: 'cross' },
      );
    }
    const isRoot = D(u) === Lo(u);
    emit(
      {
        short: isRoot ? `${u} is a root` : `${u} not root`,
        title: isRoot ? `disc[${u}] == low[${u}]: ${u} heads a component` : `low[${u}] = ${Lo(u)} < disc[${u}]: ${u} belongs to an older root`,
        body: isRoot
          ? `Every edge of ${u} is done. Line 20: \`disc[${u}] == low[${u}] == ${D(u)}\`: nothing ${u} reaches leads back above it, so ${u} and everything above it on the stack form one component.`
          : `Every edge of ${u} is done. Line 20: \`low[${u}] = ${Lo(u)}\` is smaller than \`disc[${u}] = ${D(u)}\`: ${u} reaches an older vertex, so it stays on the stack for that vertex's component.`,
        lines: isRoot ? [20, 21, 22] : [20],
        values: { 20: `${D(u)} == ${Lo(u)} → ${isRoot ? 'True' : 'False'}`, 22: isRoot ? 'component = []' : undefined },
      },
      { verdict: isRoot ? 'root' : 'notRoot' },
    );
    if (isRoot) {
      component = [];
      for (;;) {
        const w = stack.pop() ?? u;
        onStack[w] = false;
        component.push(w);
        emit(
          {
            short: `Pop ${w}`,
            title: w === u ? `Pop ${w}: the root itself, component complete` : `Pop ${w} into the component`,
            body: `Line 24 pops \`w = ${w}\`; line 25 marks it off the stack; line 26: \`component = ${pyList(component)}\`. Line 27: ${w === u ? `\`w == ${u}\`, so line 28 stops.` : `${w} isn't ${u} yet, keep popping.`}`,
            lines: w === u ? [24, 25, 26, 27, 28] : [24, 25, 26, 27],
            values: { 24: `w = ${w}`, 25: `on_stack[${w}] = False`, 26: `component = ${pyList(component)}`, 27: `${w} == ${u} → ${w === u ? 'True' : 'False'}` },
          },
          { verdict: 'pop', w },
        );
        if (w === u) break;
      }
      sccs.push([...component]);
      const stored = [...component];
      component = [];
      emit(
        {
          short: `SCC ${sccs.length - 1}`,
          title: `Component ${sccs.length - 1}: ${pyList(stored)}`,
          body: `Line 29 stores it: \`sccs = ${pyList(sccs.map((c) => pyList(c)))}\`.`,
          lines: [29],
          values: { 29: `sccs = ${pyList(sccs.map((c) => pyList(c)))}` },
        },
        { verdict: 'root' },
      );
    }
    calls.pop();
  };

  for (let i = 0; i < n; i += 1) {
    if (D(i) !== -1) {
      emit(
        {
          short: `Skip ${i}`,
          title: `${i} was already visited`,
          body: `Line 31: \`i = ${i}\`. Line 32: \`disc[${i}] = ${D(i)}\`, so an earlier DFS covered it.`,
          lines: [31, 32],
          values: { 31: `i = ${i}`, 32: `disc[${i}] == -1 → False` },
        },
        { outer: i },
      );
      continue;
    }
    dfs(i, `Line 31: \`i = ${i}\` is unvisited, so line 33 calls \`dfs(${i})\`.`, [31, 32, 33], { 31: `i = ${i}`, 32: `disc[${i}] == -1 → True`, 33: `dfs(${i})` });
  }
  emit(
    {
      short: 'Return',
      title: `${sccs.length} strongly connected component${sccs.length === 1 ? '' : 's'}`,
      body: `Line 34 returns ${sccs.map((c) => pyList(c)).join(', ')}, found in a single DFS.`,
      lines: [34],
      values: { 34: `return ${pyList(sccs.map((c) => pyList(c)))}` },
      result: `${sccs.length} SCC${sccs.length === 1 ? '' : 's'}`,
    },
    { done: true },
  );
  return steps;
}

// Story graph: Kosaraju's example, the loop 0 → 1 → 2 → 0 plus an arrow 1 → 3.
const G: Graph = {
  n: 4,
  directed: true,
  edges: [
    { u: 0, v: 1 },
    { u: 1, v: 2 },
    { u: 2, v: 0 },
    { u: 1, v: 3 },
  ],
};
const RUN = traceTarjan(G);
const RUN_START = 14;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`tarjan-scc: no run step "${short}"`);
  return i;
};
const startMetrics = { onStack: 0, sccs: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BACK = find('2→0: back');
const ROOT_3 = find('3 is a root');
const ROOT_0 = find('0 is a root');
const NOT_ROOT_1 = find('1 not root');

export default defineWalkthrough({
  id: 'learn/graph/tarjan-scc',
  title: 'Tarjan’s SCC, one pass and a stack',
  summary: 'From the idea to the code: one DFS stamps discovery times, tracks the oldest stacked vertex each subtree reaches, and pops a whole component whenever a vertex turns out to be its root.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `def tarjan_scc(n: int, adj: list[list[int]]) -> list[list[int]]:
    disc, low = [-1] * n, [-1] * n
    on_stack = [False] * n
    stack: list[int] = []
    sccs: list[list[int]] = []
    timer = 0

    def dfs(u: int) -> None:
        nonlocal timer
        disc[u] = low[u] = timer
        timer += 1
        stack.append(u)
        on_stack[u] = True
        for v in adj[u]:
            if disc[v] == -1:
                dfs(v)  # Tree edge: v not yet visited
                low[u] = min(low[u], low[v])
            elif on_stack[v]:
                low[u] = min(low[u], disc[v])  # Back edge into the current SCC
        if disc[u] == low[u]:
            # u is the root of an SCC: pop it and everything above it
            component: list[int] = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                component.append(w)
                if w == u:
                    break
            sccs.append(component)

    for i in range(n):
        if disc[i] == -1:
            dfs(i)
    return sccs`,
  },
  metrics: [
    { key: 'onStack', label: 'On stack' },
    { key: 'sccs', label: 'Components' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex of the running call / value just set' },
    { tone: 'compare', label: 'edge or neighbour being handled / root check' },
    { tone: 'miss', label: 'edge into a finished component' },
    { tone: 'done', label: 'on the stack / tree edge' },
    { tone: 'found', label: 'a component (root, popped, stored)' },
    { tone: 'note', label: 'running call' },
    { tone: 'muted', label: 'paused call / not visited yet' },
  ],
  goals: [
    { text: 'Find all components in one DFS', step: 2 },
    { text: 'Spot a component’s root with disc == low', step: 3 },
    { text: 'Watch every call, edge, pop and component', step: RUN_START + 1 },
    { text: 'Know why only on-stack vertices may lower low', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Strongly connected components in one pass',
      body: 'A group of stations on one-way tracks is strongly connected if you can get from any of them to any other and back.\n\nLine 1 takes `n` and the arrows `adj` and returns the components: here the loop `{0, 1, 2}`, and `{3}`, which can be reached but can’t get back. Kosaraju needs two passes and the flipped graph; Tarjan needs one DFS.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, disc: [-1, -1, -1, -1], low: [-1, -1, -1, -1], stack: [], sccs: [], component: [], calls: [], timer: 0, treeEdges: new Set(), bare: true, note: 'adj = [[1], [2, 3], [0], []]' }) },
    },
    {
      chapter: 'idea',
      short: 'One pass',
      title: 'Keep visited vertices on a stack until their component is known',
      body: 'DFS pushes every vertex it enters onto a stack. A component is a run of vertices on top of that stack, with its first-visited vertex (the **root**) at the bottom. When the DFS finishes a root, it pops the whole run in one go.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(ROOT_0),
    },
    {
      chapter: 'idea',
      short: 'disc == low',
      title: 'A root can’t reach anything older than itself',
      body: '`disc[u]` is when `u` was found; `low[u]` is the oldest `disc` its subtree reaches among vertices still on the stack (under each vertex: `disc/low`). If `low[u] == disc[u]`, nothing below `u` loops back above it: `u` is a root.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(ROOT_3),
    },
    {
      chapter: 'build',
      short: 'Tables',
      title: 'Lines 2–4: times, low values and the stack',
      body: '`-1` means "not visited yet". `on_stack` answers "is this vertex still waiting for its component?" in `O(1)`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['disc, low = [-1] * n, [-1] * n', 'on_stack = [False] * n', 'stack = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Timer',
      title: 'Lines 5–8: answers, a clock, and the DFS',
      body: '`timer` hands out discovery times in order.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8], lines: [5, 6, 8] },
      metrics: startMetrics,
      changes: ['sccs = []', 'timer = 0', 'def dfs(u)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Stamp',
      title: 'Lines 9–11: stamp u with the next time',
      body: '`nonlocal` lets `dfs` advance the shared `timer`. `low` starts equal to `disc`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11], lines: [9, 10, 11] },
      metrics: startMetrics,
      changes: ['nonlocal timer', 'disc[u] = low[u] = timer', 'timer += 1'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Push',
      title: 'Lines 12–14: onto the stack, then each arrow',
      body: '`u` waits on the stack until its component is decided.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14], lines: [12, 13, 14] },
      metrics: { ...startMetrics, onStack: 1 },
      changes: ['stack.append(u)', 'on_stack[u] = True', 'for v in adj[u]:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Tree edge',
      title: 'Lines 15–17: explore unvisited v, inherit its low',
      body: 'An unvisited `v` is explored first; afterwards `u` can reach whatever `v` reached.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], lines: [15, 16, 17] },
      metrics: { ...startMetrics, onStack: 1 },
      changes: ['if disc[v] == -1:', 'dfs(v)', 'low[u] = min(low[u], low[v])'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Back edge',
      title: 'Lines 18–20: an arrow back into the stack',
      body: 'A visited `v` still on the stack is in the component being built: `u` reaches its time. Line 20 then asks whether `u` is a root.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], lines: [18, 19, 20] },
      metrics: { ...startMetrics, onStack: 3 },
      changes: ['elif on_stack[v]:', 'low[u] = min(low[u], disc[v])', 'if disc[u] == low[u]:'],
      scene: at(BACK),
    },
    {
      chapter: 'build',
      short: 'Collect',
      title: 'Lines 21–23: a root collects its component',
      body: 'The comment on line 21 says what follows: start an empty `component` and pop until the root comes off.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], lines: [22, 23] },
      metrics: { ...startMetrics, onStack: 4 },
      changes: ['component = []', 'while True:'],
      scene: at(ROOT_3),
    },
    {
      chapter: 'build',
      short: 'Pop',
      title: 'Lines 24–26: pop one vertex into it',
      body: 'Each popped vertex leaves the stack for good and joins the component.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], lines: [24, 25, 26] },
      metrics: { ...startMetrics, onStack: 3 },
      changes: ['w = stack.pop()', 'on_stack[w] = False', 'component.append(w)'],
      scene: at(ROOT_3 + 1),
    },
    {
      chapter: 'build',
      short: 'Stop',
      title: 'Lines 27–29: stop at the root, store the component',
      body: 'The root was pushed first, so it is the last to come off.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29], lines: [27, 28, 29] },
      metrics: { ...startMetrics, onStack: 3, sccs: 1 },
      changes: ['if w == u: break', 'sccs.append(component)'],
      scene: at(ROOT_3 + 2),
    },
    {
      chapter: 'build',
      short: 'Every start',
      title: 'Lines 31–33: start from every unvisited vertex',
      body: 'Vertices no earlier DFS reached start their own search.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33], lines: [31, 32, 33] },
      metrics: startMetrics,
      changes: ['for i in range(n):', 'if disc[i] == -1:', 'dfs(i)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 34: return every component',
      body: 'Line 34 returns them in the order they were completed.\n\nNow let’s run it.',
      code: { view: 'final', lines: [34] },
      metrics: startMetrics,
      changes: ['return sccs'],
      scene: at(0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One DFS: O(V + E)',
      body: 'Each vertex is entered, pushed and popped once, and each arrow is read once: **`O(V + E)` time** in a single pass, and `O(V)` for `disc`, `low`, the stack and the call stack. No flipped graph is needed, unlike Kosaraju.',
      code: { view: 'final', lines: [14, 24] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, disc: [0, 1, 2, 3], low: [0, 0, 0, 3], stack: [], sccs: [[3], [2, 1, 0]], component: [], calls: [], timer: 4, treeEdges: new Set([0, 1, 3]), done: true, note: 'components [3] and [2, 1, 0]\none pass, 4 arrows read', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'On stack',
      title: 'Why line 18 needs v to be on the stack',
      body: 'In the preset “Edge into a done SCC”, vertex 3 has an arrow 3 → 1 and is visited after `{0, 1, 2}` was popped. 1 has an old time, but it is **off** the stack: its component is finished and nothing there leads back to 3. Letting it lower `low[3]` would glue 3 onto a component it can’t return to.\n\nHere `low[2]` dropped to 0 through 2 → 0 because 0 was still stacked. Only stacked vertices count: that `on_stack` test is the key decision.',
      code: { view: 'final', lines: [18, 19, 20] },
      values: { 18: 'only vertices still waiting', 19: 'low[2] = disc[0] = 0' },
      metrics: FINAL_METRICS,
      scene: at(NOT_ROOT_1),
    },
  ],
  trace: {
    title: 'Find the SCCs of your own directed graph',
    inputs: graphInputs({ n: 4, from: '0, 1, 2, 1', to: '1, 2, 0, 3' }),
    presets: [
      { label: 'Edge into a done SCC', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 0, 1' } },
      { label: 'DAG (all singletons)', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 3, 3' } },
      { label: 'Two loops, one link', values: { n: '6', from: '0, 1, 2, 2, 3, 4, 5', to: '1, 2, 0, 3, 4, 5, 3' } },
    ],
    maxItems: 8,
    run: (values) => traceTarjan(parseGraph(values, { directed: true, allowEmpty: false })),
  },
});
