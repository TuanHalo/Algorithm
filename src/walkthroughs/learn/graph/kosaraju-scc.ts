import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, listArr, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 330 } as const;

interface KoState {
  readonly g: Graph;
  /** 1 = first pass on adj, 2 = second pass on rev (edges drawn flipped). */
  readonly pass: 1 | 2;
  readonly seen: readonly number[];
  readonly order: readonly number[];
  readonly comp: readonly number[];
  readonly sccs: readonly (readonly number[])[];
  /** Running dfs calls, bottom first. */
  readonly stack: readonly number[];
  readonly v?: number;
  readonly verdict?: 'new' | 'seen';
  readonly finished?: boolean;
  readonly outer?: number;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: KoState): Entity[] {
  const shown: Graph = s.pass === 2 ? { ...s.g, edges: s.g.edges.map((e) => ({ u: e.v, v: e.u })) } : s.g;
  const u = s.stack.at(-1);
  const checking = u !== undefined && s.v !== undefined ? findEdge(shown, u, s.v) : -1;
  const sccOf = (k: number): number => s.sccs.findIndex((c) => c.includes(k));
  const entities: Entity[] = drawGraph(shown, {
    codeVar: s.pass === 2 ? 'rev' : 'adj',
    node: (k) => {
      const c = sccOf(k);
      const sub = c >= 0 ? `scc ${c}` : s.pass === 1 && s.order.includes(k) ? `#${s.order.indexOf(k)}` : '';
      if (k === u && !s.finished) return { tone: 'active', sub };
      if (k === u && s.finished) return { tone: 'done', sub };
      if (k === s.v) return { tone: s.verdict === 'seen' ? 'miss' : 'compare', sub };
      if (k === s.outer && u === undefined) return { tone: 'miss', sub };
      if (c >= 0) return { tone: 'found', sub };
      if (s.comp.includes(k)) return { tone: 'compare', sub };
      if (s.seen.includes(k)) return { tone: 'done', sub };
      return { tone: 'default', sub };
    },
    edge: (i, e) => {
      if (i === checking) return { tone: s.verdict === 'seen' ? 'miss' : 'compare' };
      const cu = sccOf(e.u);
      if (cu >= 0 && cu === sccOf(e.v)) return { tone: 'found' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const dash = (x: number | undefined): number | string => x ?? '—';
  const right = tableBesideArray(s.g.n, 4);
  entities.push(
    listArr('order', 0, 0, s.order, { label: 'order', codeVar: 'order', tones: (k, i) => (s.pass === 1 && s.finished && k === u && i === s.order.length - 1 ? 'active' : s.pass === 2 ? 'muted' : 'done') }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'u', value: dash(u ?? s.outer), tone: u === undefined && s.outer === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(s.v), tone: s.v === undefined ? 'muted' : s.verdict === 'seen' ? 'miss' : 'default' },
        { name: 'seen', value: `{${s.seen.join(', ')}}`, tone: s.verdict === 'seen' ? 'miss' : 'default' },
        { name: 'comp', value: s.pass === 2 ? pyList(s.comp) : '—', tone: s.pass === 2 ? 'default' : 'muted' },
      ],
      { label: 'variables', width: 180 },
    ),
    map(
      'sccs',
      right + 280,
      0,
      'sccs',
      s.sccs.map((c, i) => ({ key: i, value: pyList(c), tone: (s.done ? 'found' : 'default') as Tone })),
      { codeVar: 'sccs', width: 170 },
    ),
  );
  if (s.stack.length > 0) {
    entities.push(
      map(
        'stack',
        right,
        0,
        'call stack',
        s.stack.map((k, i) => {
          const top = i === s.stack.length - 1;
          return { key: `dfs(${k}, ${s.pass === 2 ? 'rev' : 'adj'}, …)`, value: top ? (s.finished ? 'returns' : 'running') : 'waits on line 9', tone: (top ? 'note' : 'muted') as Tone };
        }),
        { width: 250 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs both Kosaraju passes and records one decision per step: every outer-loop
 * check, every call, every neighbour check, every finish, the reset, every
 * component stored, and the return.
 */
function traceKosaraju(g: Graph): Step[] {
  const adj = adjacency(g);
  const rev = adjacency({ ...g, edges: g.edges.map((e) => ({ u: e.v, v: e.u })) });
  const steps: Step[] = [];
  const seen: number[] = [];
  const order: number[] = [];
  let comp: number[] = [];
  const sccs: number[][] = [];
  const stack: number[] = [];
  let pass: 1 | 2 = 1;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<KoState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { finished: order.length, sccs: sccs.length, result: e.result ?? '—' },
      scene: { entities: scene({ g, pass, seen: [...seen], order: [...order], comp: [...comp], sccs: sccs.map((c) => [...c]), stack: [...stack], ...view }) },
    });
  };

  const dfs = (u: number, graph: number[][], out: number[], call: { lines: readonly number[]; values: Record<number, string | undefined>; text: string }): void => {
    stack.push(u);
    seen.push(u);
    const name = pass === 1 ? 'adj' : 'rev';
    emit({
      short: `dfs(${u})`,
      title: `Enter ${u} (${pass === 1 ? 'first pass, real arrows' : 'second pass, flipped arrows'})`,
      body: `${call.text} Line 6 marks ${u} seen. Line 7 will follow the arrows of \`${name}[${u}] = ${pyList(graph[u] ?? [])}\`.`,
      lines: [...call.lines, 6],
      values: { ...call.values, 6: `seen = {${seen.join(', ')}}` },
    });
    for (const v of graph[u] ?? []) {
      const isNew = !seen.includes(v);
      emit(
        {
          short: `${u}→${v}?`,
          title: isNew ? `${v} is not seen: go there` : `${v} is already seen: skip`,
          body: `Line 7: \`v = ${v}\`. Line 8: ${isNew ? `${v} is not in \`seen\`, so line 9 calls \`dfs(${v})\`.` : `${v} is in \`seen\`, nothing to do.`}`,
          lines: [7, 8],
          values: { 7: `v = ${v}`, 8: `${v} not in seen → ${isNew ? 'True' : 'False'}` },
        },
        { v, verdict: isNew ? 'new' : 'seen' },
      );
      if (isNew) dfs(v, graph, out, { lines: [9], values: { 9: `dfs(${v}, ${name}, ${pass === 1 ? 'order' : 'comp'})` }, text: `Line 9 calls \`dfs(${v})\`; \`dfs(${u})\` waits.` });
    }
    out.push(u);
    emit(
      {
        short: `${u} done`,
        title: pass === 1 ? `${u} is finished: append it to order` : `${u} belongs to this component`,
        body:
          pass === 1
            ? `Every arrow out of ${u} is explored. Line 10 appends it: \`order = ${pyList(out)}\`. A vertex finishes only after everything it can reach.`
            : `No new vertex is reachable from ${u} on the flipped arrows. Line 10 appends it: \`comp = ${pyList(out)}\`.`,
        lines: [10],
        values: { 10: `${pass === 1 ? 'order' : 'comp'} = ${pyList(out)}` },
      },
      { finished: true },
    );
    stack.pop();
  };

  for (let u = 0; u < g.n; u += 1) {
    if (seen.includes(u)) {
      emit(
        {
          short: `Skip ${u}`,
          title: `${u} was already seen`,
          body: `Line 12: \`u = ${u}\`. Line 13: ${u} is in \`seen\`, an earlier DFS reached it. No new call.`,
          lines: [12, 13],
          values: { 12: `u = ${u}`, 13: `${u} not in seen → False` },
        },
        { outer: u },
      );
      continue;
    }
    dfs(u, adj, order, { lines: [12, 13, 14], values: { 12: `u = ${u}`, 13: `${u} not in seen → True`, 14: `dfs(${u}, adj, order)` }, text: `Line 12: \`u = ${u}\`, not seen, so line 14 starts a DFS on the real arrows.` });
  }

  seen.length = 0;
  pass = 2;
  emit({
    short: 'Flip',
    title: 'First pass done: forget seen, flip the arrows',
    body: `\`order = ${pyList(order)}\`: the last vertex to finish, ${order.at(-1)}, sits in a "source" component. Line 15 clears \`seen\` and line 16 starts \`sccs\`. Line 17 walks \`order\` backwards, and the second pass follows \`rev\`: every arrow flipped.`,
    lines: [15, 16, 17],
    values: { 15: 'seen = set()', 16: 'sccs = []', 17: `reversed(order) = ${pyList([...order].reverse())}` },
  });

  for (const u of [...order].reverse()) {
    if (seen.includes(u)) {
      emit(
        {
          short: `Skip ${u}`,
          title: `${u} already has a component`,
          body: `Line 17: \`u = ${u}\`. Line 18: ${u} is in \`seen\`, so it was swept into an earlier component.`,
          lines: [17, 18],
          values: { 17: `u = ${u}`, 18: `${u} not in seen → False` },
        },
        { outer: u },
      );
      continue;
    }
    comp = [];
    dfs(u, rev, comp, { lines: [17, 18, 19, 20], values: { 17: `u = ${u}`, 18: `${u} not in seen → True`, 19: 'comp = []', 20: `dfs(${u}, rev, comp)` }, text: `Line 17: \`u = ${u}\`, not seen yet: line 19 starts an empty \`comp\` and line 20 explores the flipped arrows from it.` });
    sccs.push([...comp]);
    emit({
      short: `SCC ${sccs.length - 1}`,
      title: `Component ${sccs.length - 1}: ${pyList(comp)}`,
      body: `The DFS from ${u} on flipped arrows is over. Every vertex it reached can reach ${u} and be reached from it, so they form one strongly connected component. Line 21 stores it.`,
      lines: [21],
      values: { 21: `sccs = ${pyList(sccs.map((c) => pyList(c)))}` },
    });
    comp = [];
  }
  emit(
    {
      short: 'Return',
      title: `${sccs.length} strongly connected component${sccs.length === 1 ? '' : 's'}`,
      body: `Line 22 returns ${sccs.map((c) => pyList(c)).join(', ')}.`,
      lines: [22],
      values: { 22: `return ${pyList(sccs.map((c) => pyList(c)))}` },
      result: `${sccs.length} SCC${sccs.length === 1 ? '' : 's'}`,
    },
    { done: true },
  );
  return steps;
}

// Story graph: the loop 0 → 1 → 2 → 0 is one component; the arrow 1 → 3 leads out to a lone vertex 3.
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
const RUN = traceKosaraju(G);
const RUN_START = 10;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`kosaraju-scc: no run step "${short}"`);
  return i;
};
const startMetrics = { finished: 0, sccs: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FLIP = find('Flip');
const SCC0 = find('SCC 0');
const FIRST_DONE = find('2 done');

export default defineWalkthrough({
  id: 'learn/graph/kosaraju-scc',
  title: 'Kosaraju’s SCC, two passes and a flip',
  summary: 'From the idea to the code: record the order in which a DFS finishes vertices, then run DFS again on the reversed graph in reverse finish order; each second-pass tree is one strongly connected component.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `def kosaraju_scc(adj: list[list[int]], rev: list[list[int]]) -> list[list[int]]:
    seen: set[int] = set()
    order: list[int] = []

    def dfs(u: int, graph: list[list[int]], out: list[int]) -> None:
        seen.add(u)
        for v in graph[u]:
            if v not in seen:
                dfs(v, graph, out)
        out.append(u)  # Finished: everything reachable from u is done

    for u in range(len(adj)):
        if u not in seen:
            dfs(u, adj, order)
    seen.clear()
    sccs: list[list[int]] = []
    for u in reversed(order):
        if u not in seen:
            comp: list[int] = []
            dfs(u, rev, comp)
            sccs.append(comp)
    return sccs`,
  },
  metrics: [
    { key: 'finished', label: 'Finished' },
    { key: 'sccs', label: 'Components' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex of the running call' },
    { tone: 'compare', label: 'arrow checked / in this component' },
    { tone: 'miss', label: 'already seen' },
    { tone: 'done', label: 'seen / finished' },
    { tone: 'found', label: 'a finished component' },
    { tone: 'note', label: 'running call' },
    { tone: 'muted', label: 'paused call / order already used' },
  ],
  goals: [
    { text: 'Know what a strongly connected component is', step: 2 },
    { text: 'Start pass two from the last vertex to finish', step: 3 },
    { text: 'Watch both passes, call by call', step: RUN_START + 1 },
    { text: 'Know why reversed finish order keeps components apart', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Group vertices that can reach each other both ways',
      body: 'In a city of one-way streets, a district is strongly connected if you can drive from any corner of it to any other and back.\n\nLine 1 takes the arrows `adj` and the same arrows flipped, `rev`, and returns the **strongly connected components**: here 0, 1, 2 form a loop, and 3 can be reached but can’t get back.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, pass: 1, seen: [], order: [], comp: [], sccs: [], stack: [], bare: true, note: 'adj = [[1], [2, 3], [0], []]\nrev = [[2], [0], [1], [1]]' }) },
    },
    {
      chapter: 'idea',
      short: 'Both ways',
      title: 'A plain DFS from 0 leaks out of the loop',
      body: 'From 0 you reach 1, 2 and 3. But 3 can’t come back, so it isn’t in 0’s component. A component is what you can reach **and** return from.\n\n"Return from" is the same as "reach on flipped arrows". So the second pass searches `rev`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, pass: 1, seen: [], order: [], comp: [], sccs: [[0, 1, 2], [3]], stack: [], bare: true, note: 'reach from 0: {0, 1, 2, 3}\nreach 0 back: {0, 1, 2}' }) },
    },
    {
      chapter: 'idea',
      short: 'Order',
      title: 'Start the second pass from the last vertex to finish',
      body: 'The first DFS finishes a vertex only after everything it reaches. So the vertex that finishes **last** lies in a component nothing else leads into. On flipped arrows, nothing leads **out** of it: a DFS from there stays inside its own component.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(FLIP),
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 2–3: seen, and the finish order',
      body: '`seen` is shared by every DFS; `order` collects vertices as they finish.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['seen = set()', 'order = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'dfs',
      title: 'Lines 5–7: one DFS for both passes',
      body: '`dfs` takes the arrows to follow (`graph`) and the list to write into (`out`). Line 6 marks `u`, line 7 walks its arrows.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['def dfs(u, graph, out)', 'seen.add(u)', 'for v in graph[u]:'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Finish',
      title: 'Lines 8–10: recurse, then record the finish',
      body: 'Unseen neighbours are explored first (line 9). Only then does line 10 append `u`: after everything it can reach.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: { ...startMetrics, finished: 1 },
      changes: ['if v not in seen:', 'dfs(v, graph, out)', 'out.append(u)'],
      scene: at(FIRST_DONE),
    },
    {
      chapter: 'build',
      short: 'Pass 1',
      title: 'Lines 12–14: first pass on the real arrows',
      body: 'Every vertex not yet seen starts a DFS on `adj`, writing finish times into `order`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14], lines: [12, 13, 14] },
      metrics: startMetrics,
      changes: ['for u in range(len(adj)):', 'if u not in seen:', 'dfs(u, adj, order)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Reset',
      title: 'Lines 15–17: reset, then walk order backwards',
      body: 'Line 15 forgets `seen` for the second pass. Line 17 visits vertices from the last finished to the first.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17], lines: [15, 16, 17] },
      metrics: startMetrics,
      changes: ['seen.clear()', 'sccs = []', 'for u in reversed(order):'],
      scene: at(FLIP),
    },
    {
      chapter: 'build',
      short: 'Pass 2',
      title: 'Lines 18–20: each unseen vertex grows a component',
      body: 'An unseen vertex starts a fresh `comp`, and a DFS on `rev` fills it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20], lines: [18, 19, 20] },
      metrics: startMetrics,
      changes: ['if u not in seen:', 'comp = []', 'dfs(u, rev, comp)'],
      scene: at(FLIP + 1),
    },
    {
      chapter: 'build',
      short: 'Store',
      title: 'Lines 21–22: store each component, return all',
      body: 'Line 21 keeps the component and line 22 returns them all.\n\nNow let’s run both passes.',
      code: { view: 'final', lines: [21, 22] },
      metrics: startMetrics,
      changes: ['sccs.append(comp)', 'return sccs'],
      scene: at(SCC0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Two DFS passes: O(V + E)',
      body: 'Each pass visits every vertex once and reads every arrow once: **`O(V + E)` time**. Space is `O(V)` for `seen`, `order` and the call stack, plus `O(V + E)` for the flipped graph `rev`.',
      code: { view: 'final', lines: [14, 20] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, pass: 2, seen: [0, 1, 2, 3], order: [2, 3, 1, 0], comp: [], sccs: [[1, 2, 0], [3]], stack: [], done: true, note: '2 passes × (4 vertices + 4 arrows)\ncomponents {0, 1, 2} and {3}', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Reverse order',
      title: 'Why the second pass starts from the last finisher, on rev',
      body: '0 finished last. On flipped arrows, the only arrow touching 3 now points **from** 3 **into** 1, so the DFS from 0 collects 0, 2, 1 and stops: 3 is unreachable from 0 in `rev`.\n\nWalking `reversed(order)` on `rev` is the key decision: each DFS is trapped inside exactly one component.',
      code: { view: 'final', lines: [17, 20] },
      values: { 17: 'u = 0: finished last', 20: 'dfs(0, rev, comp) → [1, 2, 0]' },
      metrics: FINAL_METRICS,
      scene: at(SCC0),
    },
  ],
  trace: {
    title: 'Find the SCCs of your own directed graph',
    inputs: graphInputs({ n: 4, from: '0, 1, 2, 1', to: '1, 2, 0, 3' }),
    presets: [
      { label: 'Two loops, one link', values: { n: '6', from: '0, 1, 2, 2, 3, 4, 5', to: '1, 2, 0, 3, 4, 5, 3' } },
      { label: 'DAG (all singletons)', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 3, 3' } },
      { label: 'One big loop', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 0' } },
    ],
    maxItems: 8,
    run: (values) => traceKosaraju(parseGraph(values, { directed: true, allowEmpty: false })),
  },
});
