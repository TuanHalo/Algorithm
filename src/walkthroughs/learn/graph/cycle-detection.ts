import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 300 } as const;

interface CycleState {
  readonly g: Graph;
  /** 0 = unvisited, 1 = on the current path, 2 = fully explored. */
  readonly state: readonly number[];
  /** Running dfs calls, bottom first. */
  readonly stack: readonly number[];
  readonly v?: number;
  /** What line 8 found at v. */
  readonly verdict?: 'new' | 'path' | 'explored';
  /** The top call is returning this value. */
  readonly returning?: boolean;
  /** Outer loop vertex being tried by `any`. */
  readonly outer?: number;
  readonly cycle?: boolean;
  readonly tree: ReadonlySet<number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

const STATE_TONE: readonly Tone[] = ['default', 'compare', 'done'];

function scene(s: CycleState): Entity[] {
  const u = s.stack.at(-1);
  const checking = u !== undefined && s.v !== undefined ? findEdge(s.g, u, s.v) : -1;
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      if (s.cycle && k === s.v) return { tone: 'found' };
      if (k === u && !s.returning) return { tone: 'active' };
      if (k === s.outer && u === undefined) return { tone: s.state[k] === 0 ? 'active' : 'done' };
      return { tone: STATE_TONE[s.state[k] ?? 0] ?? 'default' };
    },
    edge: (i) => {
      if (i === checking) {
        if (s.verdict === 'path') return { tone: 'found', label: 'back edge', flow: true };
        if (s.verdict === 'explored') return { tone: 'done', label: `${s.v} explored` };
        return { tone: 'compare', label: `${s.v} new` };
      }
      if (s.tree.has(i)) return { tone: 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const stateTones: Record<number, Tone> = {};
  s.state.forEach((st, k) => {
    stateTones[k] = k === u && !s.returning ? 'active' : s.cycle && k === s.v ? 'found' : (STATE_TONE[st] ?? 'default');
  });
  entities.push(
    arr('state', 0, 0, s.state, { label: 'state', codeVar: 'state', tones: stateTones }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'u', value: u ?? s.outer ?? '—', tone: u === undefined && s.outer === undefined ? 'muted' : 'default' },
        { name: 'v', value: s.v ?? '—', tone: s.v === undefined ? 'muted' : s.verdict === 'path' ? 'found' : 'default' },
      ],
      { label: 'variables', width: 170 },
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
          return { key: `dfs(${k})`, value: top ? (s.returning ? `returns ${s.cycle ? 'True' : 'False'}` : 'running') : 'waits on line 8', tone: top ? 'note' : 'muted' };
        }),
        { width: 220 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs the three-state DFS and records one decision per step: each vertex the
 * outer `any` tries, each call, each neighbour check, and each return,
 * including every frame that passes a found cycle back up.
 */
function traceCycle(g: Graph): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const state = Array.from({ length: g.n }, () => 0);
  const stack: number[] = [];
  const tree = new Set<number>();
  let checks = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<CycleState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { depth: stack.length, checks, result: e.result ?? '—' },
      scene: { entities: scene({ g, state: [...state], stack: [...stack], tree: new Set(tree), ...view }) },
    });
  };
  const showState = (): string => `state = ${pyList(state)}`;

  emit({
    short: 'Start',
    title: 'Every vertex starts unvisited',
    body: `Line 3 sets \`state = ${pyList(state)}\`: all ${g.n} vertices unvisited. Line 13 will try each vertex in turn and start a DFS from any that is still 0.`,
    lines: [3, 13],
    values: { 3: showState() },
  });

  /** Returns true when a cycle was found below this call. */
  const dfs = (u: number, caller: number | undefined): boolean => {
    stack.push(u);
    state[u] = 1;
    emit({
      short: `dfs(${u})`,
      title: `Enter ${u}: it is now on the current path`,
      body: `${caller === undefined ? `Line 13 calls \`dfs(${u})\`.` : `Line 8 calls \`dfs(${u})\`, and \`dfs(${caller})\` waits.`} Line 6 sets \`state[${u}] = 1\`: ${u} is on the path we are walking right now${stack.length > 1 ? ` (${stack.join(' → ')})` : ''}.`,
      lines: caller === undefined ? [13, 6] : [8, 6],
      values: { [caller === undefined ? 13 : 8]: `dfs(${u})`, 6: showState() },
    });
    for (const v of adj[u] ?? []) {
      checks += 1;
      const st = state[v] ?? 0;
      if (st === 1) {
        emit(
          {
            short: `${u}→${v}: cycle`,
            title: `${v} is on the current path: a cycle!`,
            body: `Line 7: \`v = ${v}\`. Line 8: \`state[${v}] == 1\`, so ${v} is an ancestor still being explored. The edge ${u} → ${v} closes a loop: ${[...stack.slice(stack.indexOf(v)), v].join(' → ')}. Line 9 returns \`True\`.`,
            lines: [7, 8, 9],
            values: { 7: `v = ${v}`, 8: `state[${v}] == 1 → True`, 9: 'return True' },
          },
          { v, verdict: 'path', cycle: true, returning: true },
        );
        stack.pop();
        return true;
      }
      if (st === 2) {
        emit(
          {
            short: `${u}→${v}: done`,
            title: `${v} is fully explored: no loop through it`,
            body: `Line 7: \`v = ${v}\`. Line 8: \`state[${v}] == 2\`. An earlier DFS finished ${v} and found no cycle below it, and ${v} is not on the current path, so this edge can't close a loop. Skip it.`,
            lines: [7, 8],
            values: { 7: `v = ${v}`, 8: `state[${v}] == 2 → no cycle here` },
          },
          { v, verdict: 'explored' },
        );
        continue;
      }
      emit(
        {
          short: `${u}→${v}: new`,
          title: `${v} is unvisited: go deeper`,
          body: `Line 7: \`v = ${v}\`. Line 8: \`state[${v}] == 0\`, so the condition calls \`dfs(${v})\` to explore it. If that call finds a cycle, line 9 passes \`True\` up.`,
          lines: [7, 8],
          values: { 7: `v = ${v}`, 8: `state[${v}] == 0 → call dfs(${v})` },
        },
        { v, verdict: 'new' },
      );
      tree.add(findEdge(g, u, v));
      if (dfs(v, u)) {
        emit(
          {
            short: `${u} gets True`,
            title: `dfs(${v}) found a cycle, so dfs(${u}) returns True`,
            body: `Back in \`dfs(${u})\`: line 8's call \`dfs(${v})\` returned \`True\`, so the condition is true and line 9 returns \`True\` at once, without checking ${u}'s other neighbours.`,
            lines: [8, 9],
            values: { 8: `dfs(${v}) → True`, 9: 'return True' },
          },
          { cycle: true, returning: true },
        );
        stack.pop();
        return true;
      }
    }
    state[u] = 2;
    emit(
      {
        short: `${u} explored`,
        title: `${u} is fully explored: no cycle below it`,
        body: `Line 7 has no neighbours of ${u} left, and none led back onto the path. Line 10 sets \`state[${u}] = 2\` (it leaves the path) and line 11 returns \`False\`.`,
        lines: [10, 11],
        values: { 10: showState(), 11: 'return False' },
      },
      { returning: true },
    );
    stack.pop();
    return false;
  };

  for (let u = 0; u < g.n; u += 1) {
    if ((state[u] ?? 0) !== 0) {
      emit(
        {
          short: `Skip ${u}`,
          title: `${u} was already explored`,
          body: `Line 13 moves on to \`u = ${u}\`: \`state[${u}] == 0\` is false (it is 2), so an earlier DFS covered it and \`any\` doesn't call \`dfs(${u})\`.`,
          lines: [13],
          values: { 13: `u = ${u}: state[${u}] == 0 → False` },
        },
        { outer: u },
      );
      continue;
    }
    if (dfs(u, undefined)) {
      emit(
        {
          short: 'Return True',
          title: 'Cycle found: has_cycle_directed returns True',
          body: `\`dfs(${u})\` returned \`True\`, so \`any\` stops right there and line 13 returns **True**: the graph has a cycle.`,
          lines: [13],
          values: { 13: 'any(...) → True' },
          result: 'True',
        },
        { cycle: true, outer: u },
      );
      return steps;
    }
  }
  emit(
    {
      short: 'Return False',
      title: 'No back edge anywhere: no cycle',
      body: `Every vertex ended in state 2 and no edge ever pointed back onto the current path. Line 13's \`any\` is false: the graph is a **DAG**, return **False**.`,
      lines: [13],
      values: { 13: 'any(...) → False' },
      result: 'False',
    },
  );
  return steps;
}

// Story graph: 0 reaches 3 twice (via 1, then via 2) without a loop, then 2 → 4 → 5 → 2 is a cycle.
const G: Graph = {
  n: 6,
  directed: true,
  edges: [
    { u: 0, v: 1 },
    { u: 0, v: 2 },
    { u: 1, v: 3 },
    { u: 2, v: 3 },
    { u: 2, v: 4 },
    { u: 4, v: 5 },
    { u: 5, v: 2 },
  ],
};
const RUN = traceCycle(G);
const RUN_START = 7;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { depth: 0, checks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** The run step where dfs(2) finds 3 already explored (the diamond). */
const DIAMOND = RUN.findIndex((s) => s.short === '2→3: done');
if (DIAMOND < 0) throw new Error('cycle-detection: the story run lost its diamond step');

export default defineWalkthrough({
  id: 'learn/graph/cycle-detection',
  title: 'Cycle Detection, catching a loop in the act',
  summary: 'From the idea to the code: walk a directed graph with DFS, colour each vertex unvisited, on the path, or finished, and report a cycle when an edge points back onto the path.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def has_cycle_directed(adj: list[list[int]]) -> bool:
    # 0 = unvisited, 1 = on the current path, 2 = fully explored
    state = [0] * len(adj)

    def dfs(u: int) -> bool:
        state[u] = 1
        for v in adj[u]:
            if state[v] == 1 or (state[v] == 0 and dfs(v)):
                return True
        state[u] = 2
        return False

    return any(state[u] == 0 and dfs(u) for u in range(len(adj)))`,
  },
  metrics: [
    { key: 'depth', label: 'Path length' },
    { key: 'checks', label: 'Edges checked' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex being explored' },
    { tone: 'compare', label: 'state 1: on the current path' },
    { tone: 'done', label: 'state 2: fully explored / edge walked' },
    { tone: 'found', label: 'back edge: the cycle' },
    { tone: 'note', label: 'running call' },
    { tone: 'muted', label: 'paused call' },
  ],
  goals: [
    { text: 'See a cycle as an edge back onto the current path', step: 2 },
    { text: 'Track three states, not two', step: 3 },
    { text: 'Watch every call, check and return', step: RUN_START + 1 },
    { text: 'Know why “visited” alone would report false cycles', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Does this directed graph contain a loop?',
      body: 'If task A waits on B and B waits on A, both stall forever: the dependencies loop back on themselves.\n\nLine 1 takes a **directed** graph (`adj[u]` lists the edges leaving `u`) and returns `True` if following arrows can bring you back where you started.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, state: [0, 0, 0, 0, 0, 0], stack: [], tree: new Set(), bare: true, note: 'adj = [[1, 2], [3], [3, 4],\n       [], [5], [2]]' }) },
    },
    {
      chapter: 'idea',
      short: 'Back edge',
      title: 'A cycle is an arrow back onto the path you are walking',
      body: 'Walk with DFS and keep the current path in mind: 0 → 2 → 4 → 5. The edge 5 → 2 points at a vertex **still on that path**, so following it loops forever: 2 → 4 → 5 → 2.\n\nAny cycle is caught this way, because DFS must eventually walk around it and hit its own start.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, state: [1, 2, 1, 2, 1, 1], stack: [], tree: new Set([0, 1, 2, 4, 5]), v: 2, cycle: true, bare: true, note: 'path 0 → 2 → 4 → 5\nedge 5 → 2 hits the path: cycle' }) },
    },
    {
      chapter: 'idea',
      short: '3 states',
      title: 'Unvisited, on the path, or finished',
      body: 'A plain "visited" flag can’t tell an ancestor on the path from a vertex finished long ago. So each vertex gets a **state**: 0 unvisited, 1 on the current path, 2 fully explored.\n\nOnly an edge into state 1 is a cycle.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(DIAMOND),
    },
    {
      chapter: 'build',
      short: 'States',
      title: 'Lines 2–3: everyone starts at 0',
      body: 'One number per vertex, indexed like `adj`. The comment on line 2 is the whole idea.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: startMetrics,
      changes: ['state = [0] * len(adj)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Enter',
      title: 'Lines 5–6: stepping onto a vertex puts it on the path',
      body: 'The inner `dfs(u)` explores from `u`. Line 6 sets its state to 1 the moment we arrive.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [5, 6] },
      metrics: { ...startMetrics, depth: 1 },
      changes: ['def dfs(u)', 'state[u] = 1'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Check',
      title: 'Lines 7–9: an arrow onto the path, or a cycle below',
      body: 'For each edge `u → v`, line 8 is true if `v` is on the path (a back edge), or if `v` is unvisited and exploring it finds a cycle. Either way line 9 reports it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9], lines: [7, 8, 9] },
      metrics: { ...startMetrics, depth: 1, checks: 1 },
      changes: ['for v in adj[u]:', 'if state[v] == 1 or (state[v] == 0 and dfs(v)):', 'return True'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Finish',
      title: 'Lines 10–13: leave the path, then try every start',
      body: 'When no edge loops back, line 10 marks `u` finished (state 2) and line 11 returns `False`. Line 13 starts a DFS from every vertex still at 0, so separate pieces of the graph are checked too.\n\nNow let’s run it.',
      code: { view: 'final', lines: [10, 11, 13] },
      metrics: { ...startMetrics, depth: 3 },
      changes: ['state[u] = 2', 'return False', 'return any(state[u] == 0 and dfs(u) ...)'],
      scene: at(5),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each vertex entered once, each edge read once: O(V + E)',
      body: 'A vertex is only entered from state 0, so there is at most one call per vertex, and each call reads its edges once: **`O(V + E)` time**, `O(V)` for `state` and the call stack. A cycle near the start stops it early.',
      code: { view: 'final', lines: [6, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, state: [1, 2, 1, 2, 1, 1], stack: [], tree: new Set([0, 1, 2, 4, 5]), v: 2, cycle: true, note: '7 edges checked, cycle found\n1,000,000 edges → ≤ 1,000,000 checks', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Not visited',
      title: 'Why line 8 asks for state 1, not just “seen before”',
      body: 'When `dfs(2)` looked at 3, vertex 3 had been seen before (via 1). With a plain visited flag that would be reported as a cycle, yet 0 → 1 → 3 and 0 → 2 → 3 are just two routes to the same place.\n\nState 2 marks "finished, no loop below": telling it apart from state 1 is the key decision.',
      code: { view: 'final', lines: [2, 8, 10] },
      values: { 8: 'state[3] == 2 → not a cycle', 10: 'finished: leaves the path' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, state: [1, 2, 1, 2, 0, 0], stack: [0, 2], tree: new Set([0, 1, 2]), v: 3, verdict: 'explored', note: 'visited flag: 3 seen → "cycle"  ✗\nstate 2: finished → no cycle  ✓' }) },
    },
  ],
  trace: {
    title: 'Look for a cycle in your own directed graph',
    inputs: graphInputs({ n: 6, from: '0, 0, 1, 2, 2, 4, 5', to: '1, 2, 3, 3, 4, 5, 2' }),
    presets: [
      { label: 'DAG (no cycle)', values: { n: '5', from: '0, 0, 1, 2, 3', to: '1, 2, 3, 3, 4' } },
      { label: 'Self-contained loop', values: { n: '3', from: '0, 1, 2', to: '1, 2, 0' } },
      { label: 'Cycle in a 2nd piece', values: { n: '5', from: '0, 2, 3, 4', to: '1, 3, 4, 2' } },
    ],
    maxItems: 10,
    run: (values) => traceCycle(parseGraph(values, { directed: true, allowEmpty: false })),
  },
});
