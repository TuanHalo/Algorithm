import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { adjacency, drawGraph, findEdge, graphInputs, lineValues, listArr, parseGraph, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const COMP_Y = 130;
const NOTE = { x: 200, y: 300 } as const;

interface CompState {
  readonly g: Graph;
  readonly visited: readonly number[];
  readonly groups: readonly (readonly number[])[];
  readonly comp: readonly number[];
  readonly stack: readonly number[];
  readonly start?: number;
  /** The outer loop's verdict on `start`. */
  readonly startVerdict?: 'new' | 'skip';
  readonly u?: number;
  readonly v?: number;
  readonly verdict?: 'new' | 'seen';
  readonly pushed?: boolean;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

function scene(s: CompState): Entity[] {
  const groupOf = (k: number): number => {
    const i = s.groups.findIndex((grp) => grp.includes(k));
    if (i >= 0) return i;
    return s.visited.includes(k) ? s.groups.length : -1;
  };
  const checking = s.u !== undefined && s.v !== undefined ? findEdge(s.g, s.u, s.v) : -1;
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      const grp = groupOf(k);
      const sub = grp >= 0 ? `group ${grp}` : '';
      if (k === s.u) return { tone: 'active', sub };
      if (k === s.v) return { tone: 'compare', sub };
      if (k === s.start && s.startVerdict) return { tone: s.startVerdict === 'skip' ? 'miss' : 'active', sub };
      if (grp >= 0 && grp < s.groups.length) return { tone: 'found', sub };
      if (grp >= 0) return { tone: 'done', sub };
      return { tone: 'default', sub };
    },
    edge: (i, e) => {
      if (i === checking) return { tone: s.verdict === 'seen' ? 'miss' : 'compare', label: `${s.v} ${s.verdict === 'seen' ? 'seen' : 'new'}` };
      const grp = groupOf(e.u);
      if (grp >= 0 && grp < s.groups.length) return { tone: 'found' };
      if (s.visited.includes(e.u) && s.visited.includes(e.v)) return { tone: 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const right = tableBesideArray(s.g.n, 3);
  const dash = (v: number | undefined): number | string => v ?? '—';
  entities.push(
    listArr('stack', 0, 0, s.stack, { label: 'stack', codeVar: 'stack', tones: (k) => (k === s.v && s.pushed ? 'active' : 'default') }),
    listArr('comp', 0, COMP_Y, s.comp, { label: 'comp', codeVar: 'comp', tones: (k, i) => (k === s.u && i === s.comp.length - 1 ? 'active' : 'done') }),
    vars(
      'vals',
      right,
      0,
      [
        { name: 'start', value: dash(s.start), tone: s.start === undefined ? 'muted' : s.startVerdict === 'skip' ? 'miss' : 'default' },
        { name: 'u', value: dash(s.u), tone: s.u === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(s.v), tone: s.v === undefined ? 'muted' : s.verdict === 'seen' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 170 },
    ),
    map(
      'groups',
      right,
      290,
      'groups',
      s.groups.map((grp, i) => ({ key: i, value: pyList(grp), tone: s.done ? ('found' as const) : i === s.groups.length - 1 && s.comp.length === 0 && s.u === undefined && s.start === undefined ? ('active' as const) : ('default' as const) })),
      { codeVar: 'groups', width: 170 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the component sweep: every outer-loop check, every pop, every neighbour check, every push, every closed group. */
function traceComponents(g: Graph): Step[] {
  const adj = adjacency(g);
  const steps: Step[] = [];
  const visited: number[] = [];
  const groups: number[][] = [];
  let comp: number[] = [];
  let stack: number[] = [];
  let checks = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<CompState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { groups: groups.length, checks, result: e.result ?? '—' },
      scene: { entities: scene({ g, visited: [...visited], groups: groups.map((x) => [...x]), comp: [...comp], stack: [...stack], ...view }) },
    });
  };

  emit({
    short: 'Start',
    title: 'Nothing visited, no groups yet',
    body: `Lines 2–3 start with an empty \`visited\` set and no groups. Line 4 will try every vertex, 0 to ${g.n - 1}, as the start of a new group.`,
    lines: [2, 3],
    values: { 2: 'visited = set()', 3: 'groups = []' },
  });

  for (let start = 0; start < g.n; start += 1) {
    if (visited.includes(start)) {
      emit(
        {
          short: `${start}: skip`,
          title: `${start} already belongs to a group`,
          body: `Line 4: \`start = ${start}\`. Line 5: ${start} is in \`visited\`, so an earlier flood already put it in a group. Line 6 skips it.`,
          lines: [4, 5, 6],
          values: { 4: `start = ${start}`, 5: `${start} in visited → True`, 6: 'continue' },
        },
        { start, startVerdict: 'skip' },
      );
      continue;
    }
    comp = [];
    stack = [start];
    visited.push(start);
    emit(
      {
        short: `${start}: new`,
        title: `${start} is unvisited: a new group starts here`,
        body: `Line 4: \`start = ${start}\`. Line 5: ${start} is not in \`visited\`, so no earlier flood reached it: it must be in a **new** group. Lines 8–9 start an empty \`comp\`, put ${start} on the stack and mark it.`,
        lines: [4, 5, 8, 9],
        values: { 4: `start = ${start}`, 5: `${start} in visited → False`, 8: `comp, stack = [], [${start}]`, 9: `visited.add(${start})` },
      },
      { start, startVerdict: 'new' },
    );
    while (stack.length > 0) {
      const u = stack.pop() ?? 0;
      comp.push(u);
      emit(
        {
          short: `Pop ${u}`,
          title: `Pop ${u} and add it to the group`,
          body: `Line 10: the stack isn't empty. Line 11 pops the **last** vertex pushed, ${u}, and line 12 adds it to \`comp = ${pyList(comp)}\`. Line 13 will check its neighbours: ${pyList(adj[u] ?? [])}.`,
          lines: [10, 11, 12],
          values: { 10: 'stack → True', 11: `u = ${u}`, 12: `comp = ${pyList(comp)}` },
        },
        { u },
      );
      for (const v of adj[u] ?? []) {
        checks += 1;
        const isNew = !visited.includes(v);
        emit(
          {
            short: `${u}→${v}?`,
            title: isNew ? `${v} is new: same group as ${u}` : `${v} is already visited`,
            body: isNew
              ? `Line 13: \`v = ${v}\`. Line 14: ${v} is not in \`visited\`. An edge joins it to ${u}, so it belongs to this group too.`
              : `Line 13: \`v = ${v}\`. Line 14: ${v} is already in \`visited\` (already in this group), so skip it.`,
            lines: [13, 14],
            values: { 13: `v = ${v}`, 14: `${v} not in visited → ${isNew ? 'True' : 'False'}` },
          },
          { u, v, verdict: isNew ? 'new' : 'seen' },
        );
        if (!isNew) continue;
        visited.push(v);
        stack.push(v);
        emit(
          {
            short: `Push ${v}`,
            title: `Mark ${v} and push it`,
            body: `Line 15 marks ${v} visited, and line 16 pushes it: \`stack = ${pyList(stack)}\`. It will be popped and expanded later.`,
            lines: [15, 16],
            values: { 15: `visited.add(${v})`, 16: `stack = ${pyList(stack)}` },
          },
          { u, v, verdict: 'new', pushed: true },
        );
      }
    }
    groups.push([...comp]);
    const closed = [...comp];
    comp = [];
    emit(
      {
        short: `Group ${groups.length - 1}`,
        title: `Stack empty: group ${groups.length - 1} is ${pyList(closed)}`,
        body: `Line 10: the stack is empty, so nothing else is reachable from ${start}. Line 17 appends \`${pyList(closed)}\` to \`groups\`, which now holds ${groups.length} group${groups.length === 1 ? '' : 's'}.`,
        lines: [10, 17],
        values: { 10: 'stack → False', 17: `groups = ${pyList(groups.map((x) => pyList(x)))}` },
      },
      { comp: closed },
    );
  }

  emit(
    {
      short: 'Return',
      title: `${groups.length} connected component${groups.length === 1 ? '' : 's'}`,
      body: `Line 4 has tried every vertex. Line 18 returns ${groups.length} group${groups.length === 1 ? '' : 's'}: ${groups.map((x) => pyList(x)).join(', ')}.`,
      lines: [18],
      values: { 18: `return ${pyList(groups.map((x) => pyList(x)))}` },
      result: `${groups.length} group${groups.length === 1 ? '' : 's'}`,
    },
    { done: true },
  );
  return steps;
}

// Story graph: three islands, a path 0–1–2, a pair 3–4 and a lone vertex 5.
const G: Graph = {
  n: 6,
  directed: false,
  edges: [
    { u: 0, v: 1 },
    { u: 1, v: 2 },
    { u: 3, v: 4 },
  ],
};
const RUN = traceComponents(G);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { groups: 0, checks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const GROUPS = [[0, 1, 2], [3, 4], [5]];
const ALL = [0, 1, 2, 3, 4, 5];

export default defineWalkthrough({
  id: 'learn/graph/connected-components',
  title: 'Connected Components, counting the islands',
  summary: 'From the idea to the code: start a flood from every vertex no earlier flood reached, and each flood is one connected component.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def count_components(adj: list[list[int]]) -> list[list[int]]:
    visited: set[int] = set()
    groups: list[list[int]] = []
    for start in range(len(adj)):
        if start in visited:
            continue
        # New component: flood it with an explicit stack
        comp, stack = [], [start]
        visited.add(start)
        while stack:
            u = stack.pop()
            comp.append(u)
            for v in adj[u]:
                if v not in visited:
                    visited.add(v)
                    stack.append(v)
        groups.append(comp)
    return groups`,
  },
  metrics: [
    { key: 'groups', label: 'Groups' },
    { key: 'checks', label: 'Edges checked' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex popped / new start' },
    { tone: 'compare', label: 'neighbour being checked' },
    { tone: 'miss', label: 'already visited: skipped' },
    { tone: 'done', label: 'in the group being built' },
    { tone: 'found', label: 'in a finished group' },
  ],
  goals: [
    { text: 'See why one flood finds exactly one island', step: 2 },
    { text: 'Restart the flood from every unvisited vertex', step: 4 },
    { text: 'Watch every start, pop and check', step: RUN_START + 1 },
    { text: 'Know why one shared visited set keeps it O(V + E)', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Group 6 vertices into islands',
      body: 'Picture islands linked by footbridges: you can walk between any two towns on one island, never to another island.\n\nLine 1 takes the adjacency lists `adj` (edges go both ways) and returns the **groups** of vertices that can reach each other. Vertex 5 has no edges at all.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, visited: [], groups: [], comp: [], stack: [], bare: true, note: 'adj = [[1], [0, 2], [1],\n       [4], [3], []]' }) },
    },
    {
      chapter: 'idea',
      short: 'One flood',
      title: 'A flood from one vertex covers its whole island',
      body: 'A DFS or BFS from 0 reaches 1 and 2, then runs out: no edge leaves the island. So **one flood = one component**.\n\nAny vertex the flood didn’t reach (3, 4, 5) belongs to another island: start a new flood there.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, visited: ALL, groups: GROUPS, comp: [], stack: [], bare: true, note: 'flood from 0 → {0, 1, 2}\nflood from 3 → {3, 4}\nflood from 5 → {5}' }) },
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 2–3: one visited set for every flood',
      body: '`visited` is shared by all floods, so a vertex reached once is never flooded again. `groups` collects the answer.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['visited = set()', 'groups = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Each start',
      title: 'Lines 4–6: skip vertices already in a group',
      body: 'Line 4 tries every vertex as a start. Line 5 skips one that an earlier flood reached: it already has a group.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [4, 5, 6] },
      metrics: startMetrics,
      changes: ['for start in range(len(adj)):', 'if start in visited: continue'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Seed',
      title: 'Lines 7–9: a new group, seeded with start',
      body: 'An unvisited start opens a new group: `comp` collects it, and the `stack` holds vertices waiting to be expanded. Line 9 marks the start.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['comp, stack = [], [start]', 'visited.add(start)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Flood',
      title: 'Lines 10–12: pop a vertex into the group',
      body: 'While anything waits on the stack, line 11 pops the most recent vertex and line 12 adds it to the group. This is DFS with a stack instead of recursion.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['while stack:', 'u = stack.pop()', 'comp.append(u)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Neighbours',
      title: 'Lines 13–16: grow the flood through edges',
      body: 'Every unvisited neighbour of `u` is on the same island. Line 15 marks it and line 16 pushes it so its own neighbours get checked.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], lines: [13, 14, 15] },
      metrics: { ...startMetrics, checks: 1 },
      changes: ['for v in adj[u]:', 'if v not in visited:', 'visited.add(v)'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Close',
      title: 'Lines 16–18: push, close the group, return',
      body: 'Line 16 pushes the neighbour. When the stack runs dry the island is complete, so line 17 stores it; line 18 returns every group.\n\nNow let’s run it, one decision at a time.',
      code: { view: 'final', lines: [16, 17, 18] },
      metrics: { ...startMetrics, checks: 1 },
      changes: ['stack.append(v)', 'groups.append(comp)', 'return groups'],
      scene: at(4),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each vertex flooded once: O(V + E)',
      body: 'Line 4 looks at every vertex once, each vertex is pushed and popped once in total, and each edge is checked from both ends: **`O(V + E)` time** and **`O(V)` space**.',
      code: { view: 'final', lines: [4, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, visited: ALL, groups: GROUPS, comp: [], stack: [], done: true, note: '6 starts, 6 pops, 6 edge checks\n3 islands', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Shared set',
      title: 'Why every flood shares one visited set',
      body: 'Line 5 skips 1 and 2 because the flood from 0 already marked them. With a fresh `visited` per start, the loop would flood `{0, 1, 2}` three times and report it as three groups.\n\nSharing `visited` across the outer loop is the key decision: it makes each vertex start at most one group.',
      code: { view: 'final', lines: [2, 5, 6] },
      values: { 5: '1 in visited → True', 6: 'skip: already in group 0' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, visited: [0, 1, 2], groups: [[0, 1, 2]], comp: [], stack: [], start: 1, startVerdict: 'skip', note: 'new visited per start:\n{0,1,2} found 3 times  ✗' }) },
    },
  ],
  trace: {
    title: 'Find the components of your own graph',
    inputs: graphInputs({ n: 6, from: '0, 1, 3', to: '1, 2, 4' }),
    presets: [
      { label: 'All connected', values: { n: '5', from: '0, 1, 2, 3', to: '1, 2, 3, 4' } },
      { label: 'All isolated but one', values: { n: '5', from: '3', to: '4' } },
      { label: 'Cycle plus a pair', values: { n: '6', from: '0, 1, 2, 4', to: '1, 2, 0, 5' } },
    ],
    maxItems: 10,
    run: (values) => traceComponents(parseGraph(values, { directed: false })),
  },
});
