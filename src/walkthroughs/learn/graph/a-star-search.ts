import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, findEdge, graphInputs, lineValues, parseGraph, parseVertex, type Graph, weightedAdjacency } from '../../../lib/walkthrough/graph';
import type { Entity, Step, Tone, TraceValues } from '../../../lib/walkthrough/types';

const NOTE = { x: 230, y: 330 } as const;
const GSCORE_X = 200;
const OPEN_X = 400;
const INF = Number.POSITIVE_INFINITY;

/** An open-set entry (f, g, v); `id` keeps duplicates apart on screen. */
interface Entry {
  readonly f: number;
  readonly g: number;
  readonly v: number;
  readonly id: number;
}

interface AState {
  readonly g: Graph;
  readonly h: readonly number[];
  readonly start: number;
  readonly goal: number;
  readonly gScore: ReadonlyMap<number, number>;
  readonly open: readonly Entry[];
  /** Vertices whose edges were expanded. */
  readonly expanded: readonly number[];
  readonly popped?: Entry;
  readonly stale?: boolean;
  readonly v?: number;
  readonly w?: number;
  readonly verdict?: 'better' | 'no' | 'pushed' | 'goal';
  readonly pushedId?: number;
  readonly via: ReadonlyMap<number, number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: boolean;
}

const sortOpen = (open: readonly Entry[]): Entry[] => [...open].sort((a, b) => a.f - b.f || a.g - b.g || a.v - b.v || a.id - b.id);

function scene(s: AState): Entity[] {
  const u = s.popped?.v;
  const checking = u !== undefined && s.v !== undefined ? findEdge(s.g, u, s.v) : -1;
  const viaEdges = new Set(s.via.values());
  const entities: Entity[] = drawGraph(s.g, {
    codeVar: 'adj',
    node: (k) => {
      const gk = s.gScore.get(k);
      const sub = `${k === s.goal ? 'goal · ' : ''}${gk === undefined ? '' : `g ${gk} · `}h ${s.h[k] ?? 0}`;
      if (s.verdict === 'goal' && k === s.goal) return { tone: 'found', sub };
      if (k === u) return { tone: s.stale ? 'miss' : 'active', sub };
      if (k === s.v) return { tone: s.verdict === 'no' ? 'miss' : 'compare', sub };
      if (s.expanded.includes(k)) return { tone: 'done', sub };
      return { tone: gk === undefined ? 'muted' : 'default', sub };
    },
    edge: (i) => {
      if (i === checking) return { tone: s.verdict === 'no' ? 'miss' : 'compare' };
      if (viaEdges.has(i)) return { tone: s.verdict === 'goal' ? 'found' : 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const dash = (x: number | undefined): number | string => x ?? '—';
  const sorted = sortOpen(s.open);
  entities.push(
    vars(
      'vals',
      0,
      0,
      [
        { name: 'f', value: dash(s.popped?.f), tone: s.popped ? 'default' : 'muted' },
        { name: 'g', value: dash(s.popped?.g), tone: s.popped ? 'default' : 'muted' },
        { name: 'u', value: dash(u), tone: u === undefined ? 'muted' : s.stale ? 'miss' : 'default' },
        { name: 'v', value: dash(s.v), tone: s.v === undefined ? 'muted' : s.verdict === 'no' ? 'miss' : 'default' },
        { name: 'w', value: dash(s.w), tone: s.w === undefined ? 'muted' : 'default' },
      ],
      { label: 'variables', width: 150 },
    ),
    map(
      'g-score',
      GSCORE_X,
      0,
      'g_score',
      [...s.gScore.entries()].map(([k, gk]) => ({ key: k, value: gk, tone: (k === s.v && s.verdict === 'pushed' ? 'active' : 'default') as Tone })),
      { codeVar: 'g_score', width: 140 },
    ),
    map(
      'open-set',
      OPEN_X,
      0,
      'open_set',
      sorted.map((e, i) => {
        const outdated = e.g > (s.gScore.get(e.v) ?? INF);
        return {
          key: `(${e.f}, ${e.g}, ${e.v})${'​'.repeat(sorted.slice(0, i).filter((x) => x.f === e.f && x.g === e.g && x.v === e.v).length)}`,
          value: outdated ? 'outdated' : i === 0 ? 'smallest f' : 'waits',
          tone: (e.id === s.pushedId ? 'active' : outdated ? 'muted' : i === 0 ? 'compare' : 'default') as Tone,
        };
      }),
      { codeVar: 'open_set', width: 190 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Plain Dijkstra distances to compare A*'s answer with (used to explain an overestimating h). */
function trueDistance(g: Graph, start: number, goal: number): number {
  const adj = weightedAdjacency(g);
  const dist = Array.from({ length: g.n }, () => INF);
  dist[start] = 0;
  const done = new Set<number>();
  for (;;) {
    let u = -1;
    dist.forEach((d, k) => {
      if (!done.has(k) && d < INF && (u < 0 || d < (dist[u] ?? INF))) u = k;
    });
    if (u < 0) break;
    done.add(u);
    for (const [v, w] of adj[u] ?? []) dist[v] = Math.min(dist[v] ?? INF, (dist[u] ?? 0) + w);
  }
  return dist[goal] ?? INF;
}

/** Runs A* and records one decision per step: each pop (goal, outdated or expanded), each edge check, each push, and the return. */
function traceAStar(g: Graph, h: readonly number[], start: number, goal: number): Step[] {
  const adj = weightedAdjacency(g);
  const steps: Step[] = [];
  const gScore = new Map<number, number>([[start, 0]]);
  let serial = 0;
  let open: Entry[] = [{ f: h[start] ?? 0, g: 0, v: start, id: serial }];
  const expanded: number[] = [];
  const via = new Map<number, number>();
  let pops = 0;
  const base = { g, h, start, goal } as const;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<AState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { expanded: expanded.length, pops, result: e.result ?? '—' },
      scene: { entities: scene({ ...base, gScore: new Map(gScore), open: [...open], expanded: [...expanded], via: new Map(via), ...view }) },
    });
  };

  emit({
    short: 'Start',
    title: `Start at ${start}: g = 0, f = h = ${h[start]}`,
    body: `Line 5: the start costs \`g = 0\`. Line 7 puts \`(${h[start]}, 0, ${start})\` in the open set: its priority \`f = g + h = 0 + ${h[start]}\`. Line 8: the open set isn't empty.`,
    lines: [5, 7, 8],
    values: { 5: `g_score = {${start}: 0}`, 7: `open_set = [(${h[start]}, 0, ${start})]`, 8: 'open_set → True' },
  });

  let first = true;
  while (open.length > 0) {
    const sorted = sortOpen(open);
    const popped = sorted[0] ?? { f: 0, g: 0, v: 0, id: -1 };
    open = sorted.slice(1);
    pops += 1;
    const u = popped.v;
    const loop = first ? undefined : 'open_set → True';
    first = false;
    if (u === goal) {
      emit(
        {
          short: `Pop ${u}: goal`,
          title: `Pop (${popped.f}, ${popped.g}, ${u}): it is the goal`,
          body: `Line 9 pops the smallest \`f\`: \`(${popped.f}, ${popped.g}, ${u})\`. Line 10: \`${u} == goal\`. Every entry still open has \`f ≥ ${popped.f}\`, and \`h\` never overestimates, so no other route can be cheaper than ${popped.g}.`,
          lines: loop ? [8, 9, 10] : [9, 10],
          values: { 8: loop, 9: `f, g, u = ${popped.f}, ${popped.g}, ${u}`, 10: `${u} == ${goal} → True` },
        },
        { popped, verdict: 'goal' },
      );
      const best = trueDistance(g, start, goal);
      emit(
        {
          short: 'Return',
          title: `Return ${popped.g}`,
          body: `Line 11 returns \`g = ${popped.g}\` after expanding ${expanded.length} vertex${expanded.length === 1 ? '' : 'es'}${g.n - expanded.length - 1 > 0 ? `; ${g.n - expanded.length - 1} other${g.n - expanded.length - 1 === 1 ? ' was' : 's were'} never expanded` : ''}.${best < popped.g ? `\n\nCareful: the real shortest cost is ${best}. Some \`h\` value overestimates, so A* stopped too early.` : ''}`,
          lines: [11],
          values: { 11: `return ${popped.g}` },
          result: String(popped.g),
        },
        { popped, verdict: 'goal' },
      );
      return steps;
    }
    if (popped.g > (gScore.get(u) ?? INF)) {
      emit(
        {
          short: `Pop ${u}: old`,
          title: `Pop (${popped.f}, ${popped.g}, ${u}): outdated`,
          body: `Line 9 pops \`(${popped.f}, ${popped.g}, ${u})\`. Line 10: not the goal. Line 12: \`${popped.g} > g_score[${u}] = ${gScore.get(u)}\`: a cheaper path to ${u} was found later, so line 13 skips this entry.`,
          lines: loop ? [8, 9, 10, 12, 13] : [9, 10, 12, 13],
          values: { 8: loop, 9: `f, g, u = ${popped.f}, ${popped.g}, ${u}`, 10: `${u} == ${goal} → False`, 12: `${popped.g} > ${gScore.get(u)} → True`, 13: 'continue' },
        },
        { popped, stale: true },
      );
      continue;
    }
    expanded.push(u);
    emit(
      {
        short: `Pop ${u} (f ${popped.f})`,
        title: `Pop (${popped.f}, ${popped.g}, ${u}): expand ${u}`,
        body: `Line 9 pops the entry with the smallest \`f = g + h = ${popped.g} + ${h[u]} = ${popped.f}\`: the most promising vertex. Line 10: not the goal. Line 12: \`g\` is current. Line 14 will try its edges.`,
        lines: loop ? [8, 9, 10, 12, 14] : [9, 10, 12, 14],
        values: { 8: loop, 9: `f, g, u = ${popped.f}, ${popped.g}, ${u}`, 10: `${u} == ${goal} → False`, 12: `${popped.g} > ${gScore.get(u)} → False` },
      },
      { popped },
    );
    for (const [v, w] of adj[u] ?? []) {
      const old = gScore.get(v) ?? INF;
      const cand = popped.g + w;
      const better = cand < old;
      emit(
        {
          short: `${u}→${v}: ${cand}?`,
          title: better ? `Via ${u}, ${v} costs ${cand}: better than ${old === INF ? '∞' : old}` : `Via ${u}, ${v} costs ${cand}: no better than ${old}`,
          body: `Line 14: \`v, w = ${v}, ${w}\`. Line 15: \`g + w = ${popped.g} + ${w} = ${cand}\` against \`g_score.get(${v}) = ${old === INF ? 'inf' : old}\`. ${better ? 'Cheaper.' : 'Not cheaper: skip.'}`,
          lines: [14, 15],
          values: { 14: `v, w = ${v}, ${w}`, 15: `${cand} < ${old === INF ? 'inf' : old} → ${better ? 'True' : 'False'}` },
        },
        { popped, v, w, verdict: better ? 'better' : 'no' },
      );
      if (!better) continue;
      gScore.set(v, cand);
      via.set(v, findEdge(g, u, v));
      serial += 1;
      const f = cand + (h[v] ?? 0);
      open = [...open, { f, g: cand, v, id: serial }];
      emit(
        {
          short: `Push ${v} (f ${f})`,
          title: `Record g = ${cand} for ${v}, push it with f = ${f}`,
          body: `Line 16: \`g_score[${v}] = ${cand}\`. Line 17 pushes \`(${f}, ${cand}, ${v})\`: \`f = ${cand} + h[${v}] = ${cand} + ${h[v]} = ${f}\`, the best guess for a whole route through ${v}.`,
          lines: [16, 17],
          values: { 16: `g_score[${v}] = ${cand}`, 17: `push (${f}, ${cand}, ${v})` },
        },
        { popped, v, w, verdict: 'pushed', pushedId: serial },
      );
    }
  }
  emit(
    {
      short: 'Return -1',
      title: 'Open set empty: the goal is unreachable',
      body: `Line 8: nothing left to explore and the goal was never popped. Line 18 returns \`-1\`.`,
      lines: [8, 18],
      values: { 8: 'open_set → False', 18: 'return -1' },
      result: '-1',
    },
    { done: true },
  );
  return steps;
}

// Story graph: the route 0 → 1 → 3 → 5 costs 6; the cheap-looking start 0 → 2 → 4 ends in a costly last edge.
const G: Graph = {
  n: 6,
  directed: false,
  edges: [
    { u: 0, v: 1, w: 2 },
    { u: 0, v: 2, w: 1 },
    { u: 1, v: 3, w: 2 },
    { u: 2, v: 4, w: 1 },
    { u: 3, v: 5, w: 2 },
    { u: 4, v: 5, w: 6 },
  ],
};
const H = [5, 4, 6, 2, 6, 0] as const;
const START = 0;
const GOAL = 5;
const RUN = traceAStar(G, H, START, GOAL);
const RUN_START = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`a-star-search: no run step "${short}"`);
  return i;
};
const startMetrics = { expanded: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const POP_1 = find('Pop 1 (f 6)');
const GOAL_POP = find('Pop 5: goal');
const base = { g: G, h: H, start: START, goal: GOAL } as const;

/** Reads the heuristic list (one value per vertex). */
function parseH(values: TraceValues, n: number): number[] {
  const h = Array.isArray(values['h']) ? [...values['h']] : [];
  if (h.length !== n) throw new Error(`Give one h value per vertex: ${n} vertices, ${h.length} values.`);
  if (h.some((x) => x < 0)) throw new Error('h is an estimate of a remaining cost, so it can’t be negative.');
  return h;
}

export default defineWalkthrough({
  id: 'learn/graph/a-star-search',
  title: 'A* Search, a compass toward the goal',
  summary: 'From the idea to the code: Dijkstra plus an estimate of the distance still to go, so the search heads for the goal and stops as soon as it gets there.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `import heapq


def a_star(adj: list[list[tuple[int, int]]], h: list[int], start: int, goal: int) -> int:
    g_score = {start: 0}
    # Priority f = cost so far (g) + estimate still to go (h)
    open_set = [(h[start], 0, start)]
    while open_set:
        f, g, u = heapq.heappop(open_set)
        if u == goal:
            return g
        if g > g_score[u]:
            continue  # Outdated entry: a cheaper path to u was found
        for v, w in adj[u]:
            if g + w < g_score.get(v, float("inf")):
                g_score[v] = g + w
                heapq.heappush(open_set, (g + w + h[v], g + w, v))
    return -1  # Goal unreachable`,
  },
  metrics: [
    { key: 'expanded', label: 'Expanded' },
    { key: 'pops', label: 'Pops' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'vertex being expanded / value just written' },
    { tone: 'compare', label: 'edge tried / smallest f' },
    { tone: 'miss', label: 'no improvement / outdated' },
    { tone: 'done', label: 'expanded / edge on a best path' },
    { tone: 'found', label: 'goal reached / the route' },
    { tone: 'muted', label: 'never reached / outdated entry' },
  ],
  goals: [
    { text: 'Add an estimate of the distance left', step: 2 },
    { text: 'Know when the estimate keeps the answer right', step: 3 },
    { text: 'Watch every pop, check and push', step: RUN_START + 1 },
    { text: 'Know why A* may stop at the first goal pop', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Cheapest route from 0 to 5, without searching everywhere',
      body: 'Driving from Paris to Rome, you don’t explore London first: a compass tells you which way Rome is.\n\nLine 4 takes the graph `adj` (`(v, w)` pairs, edges both ways), an estimate `h[v]` of the cost from each vertex to the goal, and `start`, `goal`. It returns the cheapest cost, or -1.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, gScore: new Map(), open: [], expanded: [], via: new Map(), bare: true, note: 'start = 0, goal = 5\nh = [5, 4, 6, 2, 6, 0]' }) },
    },
    {
      chapter: 'idea',
      short: 'f = g + h',
      title: 'Rank vertices by cost so far plus estimate left',
      body: 'Dijkstra expands the vertex with the smallest cost so far, `g`: here that is 2 (cost 1), heading away from the goal. A* ranks by **`f = g + h`**: for 2 that is 1 + 6 = 7, for 1 it is 2 + 4 = 6, so it goes toward the goal first.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(POP_1),
    },
    {
      chapter: 'idea',
      short: 'Admissible',
      title: 'The estimate must never overestimate',
      body: 'If `h[v]` is never more than the real remaining cost (**admissible**), `f` never overstates a route. So when the goal comes out of the open set with the smallest `f`, nothing still waiting can beat it. Here `h` is a lower bound everywhere (3’s real distance is 2, 1’s is 4).',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(GOAL_POP),
    },
    {
      chapter: 'build',
      short: 'Seed',
      title: 'Lines 5–7: the start, ranked by its estimate',
      body: '`g_score` holds the best known cost to each vertex. The open set is a min-heap of `(f, g, v)`; the comment on line 6 says what `f` means.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 7] },
      metrics: startMetrics,
      changes: ['g_score = {start: 0}', 'open_set = [(h[start], 0, start)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Pop',
      title: 'Lines 8–10: pop the smallest f, is it the goal?',
      body: 'Line 9 pops the most promising entry. Line 10 checks whether we have arrived.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: { ...startMetrics, pops: 1 },
      changes: ['while open_set:', 'f, g, u = heapq.heappop(open_set)', 'if u == goal:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Stop / skip',
      title: 'Lines 11–13: stop at the goal, skip outdated entries',
      body: 'The goal’s `g` is the answer (line 11). An entry whose `g` is worse than the best known is out of date (lines 12–13).',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [11, 12, 13] },
      metrics: { ...startMetrics, pops: 1 },
      changes: ['return g', 'if g > g_score[u]:', 'continue'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Relax',
      title: 'Lines 14–16: improve neighbours, as in Dijkstra',
      body: 'For each edge, a cheaper `g` for `v` is recorded.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], lines: [14, 15, 16] },
      metrics: { ...startMetrics, pops: 1 },
      changes: ['for v, w in adj[u]:', 'if g + w < g_score.get(v, inf):', 'g_score[v] = g + w'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Push',
      title: 'Lines 17–18: push with f = g + h; -1 if never reached',
      body: 'The only change from Dijkstra is the priority: `g + w + h[v]`. If the open set empties first, line 18 returns -1.\n\nNow let’s run it.',
      code: { view: 'final', lines: [17, 18] },
      metrics: { ...startMetrics, pops: 1 },
      changes: ['heapq.heappush(open_set, (g + w + h[v], g + w, v))', 'return -1'],
      scene: at(3),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Dijkstra’s cost at worst, far less with a good h',
      body: 'With `h = 0` everywhere A* **is** Dijkstra: `O((V + E) log V)`. A good estimate prunes the search: here only 3 of 6 vertices were expanded, and 4 was never even reached. Space is `O(V)` for `g_score` and the open set.',
      code: { view: 'final', lines: [9, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...base, gScore: new Map([[0, 0], [1, 2], [2, 1], [3, 4], [5, 6]]), open: [], expanded: [0, 1, 3], via: new Map([[1, 0], [2, 1], [3, 2], [5, 4]]), popped: { f: 6, g: 6, v: 5, id: 0 }, verdict: 'goal', note: 'expanded 0, 1, 3 → cost 6\nDijkstra would expand 2 and 4 too', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Stop early',
      title: 'Why line 11 may return at the first goal pop',
      body: 'When 5 popped with `f = 6`, the only other open entry was 2 with `f = 1 + 6 = 7`. Since `h` never overestimates, any route through 2 costs **at least** 7. So 6 is final, and A* stops without ever looking at 2 or 4.\n\nStopping at the first goal pop is the key decision, and admissibility is what makes it safe.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: '5 == 5: smallest f is 6', 11: 'route via 2 costs ≥ 7' },
      metrics: FINAL_METRICS,
      scene: at(GOAL_POP),
    },
  ],
  trace: {
    title: 'Run A* on your own graph',
    inputs: graphInputs({ n: 6, from: '0, 0, 1, 2, 3, 4', to: '1, 2, 3, 4, 5, 5', weight: '2, 1, 2, 1, 2, 6' }, [
      { name: 'h', label: 'Estimate h[v] for each vertex', kind: 'numbers', default: '5, 4, 6, 2, 6, 0' },
      { name: 'start', label: 'Start vertex', kind: 'number', default: '0' },
      { name: 'goal', label: 'Goal vertex', kind: 'number', default: '5' },
    ]),
    presets: [
      { label: 'h = 0 (Dijkstra)', values: { n: '6', from: '0, 0, 1, 2, 3, 4', to: '1, 2, 3, 4, 5, 5', weight: '2, 1, 2, 1, 2, 6', h: '0, 0, 0, 0, 0, 0', start: '0', goal: '5' } },
      { label: 'Overestimating h', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 3, 3', weight: '1, 3, 5, 1', h: '0, 0, 9, 0', start: '0', goal: '3' } },
      { label: 'Unreachable goal', values: { n: '4', from: '0, 2', to: '1, 3', weight: '1, 1', h: '0, 0, 0, 0', start: '0', goal: '3' } },
    ],
    maxItems: 8,
    run: (values) => {
      const g = parseGraph(values, { directed: false, weighted: true, minWeight: 0, allowEmpty: false });
      const h = parseH(values, g.n);
      return traceAStar(g, h, parseVertex(values, 'start', g.n, 'Start vertex'), parseVertex(values, 'goal', g.n, 'Goal vertex'));
    },
  },
});
