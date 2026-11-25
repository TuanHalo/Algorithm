import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, graphInputs, lineValues, parseGraph, parseVertex, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE = { x: 230, y: 300 } as const;
const INF = Number.POSITIVE_INFINITY;
const showDist = (d: number): string => (d === INF ? '∞' : String(d));

interface BfState {
  readonly g: Graph;
  readonly dist: readonly number[];
  /** Relaxation pass (0-based), or 'check' for the final negative-cycle pass. */
  readonly pass?: number | 'check';
  readonly edge?: number;
  readonly verdict?: 'unreached' | 'better' | 'no' | 'relaxed' | 'cycle';
  /** Edge that set each vertex's current distance. */
  readonly via: ReadonlyMap<number, number>;
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly done?: 'ok' | 'cycle';
}

function scene(s: BfState): Entity[] {
  const e = s.edge !== undefined ? s.g.edges[s.edge] : undefined;
  const viaEdges = new Set(s.via.values());
  const entities: Entity[] = drawGraph(s.g, {
    node: (k) => {
      const sub = s.bare ? undefined : `d ${showDist(s.dist[k] ?? INF)}`;
      const look = (tone: Tone): { tone: Tone; sub?: string } => (sub === undefined ? { tone } : { tone, sub });
      if (s.done === 'ok') return look((s.dist[k] ?? INF) === INF ? 'muted' : 'found');
      if (e && k === e.u) return look(s.verdict === 'unreached' ? 'muted' : 'active');
      if (e && k === e.v) return look(s.verdict === 'no' || s.verdict === 'cycle' ? 'miss' : 'compare');
      return look((s.dist[k] ?? INF) === INF ? 'default' : 'done');
    },
    edge: (i) => {
      if (i === s.edge) {
        if (s.verdict === 'cycle') return { tone: 'miss' };
        if (s.verdict === 'no' || s.verdict === 'unreached') return { tone: 'miss' };
        return { tone: s.verdict === 'relaxed' ? 'done' : 'compare', ...(s.verdict === 'relaxed' ? { flow: true } : {}) };
      }
      if (viaEdges.has(i)) return { tone: s.done === 'ok' ? 'found' : 'done' };
      return { tone: 'default' };
    },
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const distTones: Record<number, Tone> = {};
  s.dist.forEach((d, k) => {
    distTones[k] = e && k === e.v && s.verdict === 'relaxed' ? 'active' : s.done === 'ok' && d !== INF ? 'found' : d === INF ? 'default' : 'done';
  });
  const dash = (x: number | string | undefined): number | string => x ?? '—';
  entities.push(
    arr('dist', 0, 0, s.dist.map(showDist), { label: 'dist', codeVar: 'dist', tones: distTones }),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: '_', value: s.pass === undefined ? '—' : s.pass === 'check' ? 'done' : s.pass, tone: typeof s.pass === 'number' ? 'default' : 'muted' },
        { name: 'u', value: dash(e?.u), tone: e === undefined ? 'muted' : 'default' },
        { name: 'v', value: dash(e?.v), tone: e === undefined ? 'muted' : s.verdict === 'no' ? 'miss' : 'default' },
        { name: 'w', value: dash(e?.w), tone: e === undefined ? 'muted' : 'default' },
      ],
      { label: 'variables', width: 160 },
    ),
    map(
      'edges',
      tableBesideArray(s.g.n, Math.max(4, s.g.edges.length)),
      0,
      'edges',
      s.g.edges.map((ed, i) => ({
        key: `(${ed.u}, ${ed.v}, ${ed.w})`,
        value: i === s.edge ? (s.verdict === 'relaxed' ? 'relaxed' : s.verdict === 'cycle' ? 'still drops' : 'checking') : '',
        tone: (i === s.edge ? (s.verdict === 'cycle' || s.verdict === 'no' || s.verdict === 'unreached' ? 'miss' : 'compare') : 'default') as Tone,
      })),
      { codeVar: 'edges', width: 200 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs Bellman-Ford and records one decision per step: every edge check in every pass, every relaxation, the check pass and the return. */
function traceBellmanFord(g: Graph, start: number): Step[] {
  const steps: Step[] = [];
  const dist = Array.from({ length: g.n }, () => INF);
  dist[start] = 0;
  const via = new Map<number, number>();
  let relaxations = 0;
  let checks = 0;
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<BfState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { checks, relaxations, result: e.result ?? '—' },
      scene: { entities: scene({ g, dist: [...dist], via: new Map(via), ...view }) },
    });
  };
  const show = (): string => pyList(dist.map(showDist));

  emit({
    short: 'Start',
    title: `dist[${start}] = 0, the rest unknown`,
    body: `Lines 2–3: every distance is infinity except \`dist[${start}] = 0\`. Line 4 will repeat a full sweep over all ${g.edges.length} edges ${g.n - 1} time${g.n - 1 === 1 ? '' : 's'} (\`n - 1\`).`,
    lines: [2, 3, 4],
    values: { 2: 'dist = [inf] * n', 3: `dist = ${show()}`, 4: `range(${g.n - 1})` },
  });

  /** One check of edge i; returns true if it would improve (and, in a relax pass, applies it). */
  const check = (i: number, pass: number | 'check', firstOfPass: boolean): boolean => {
    const ed = g.edges[i];
    if (!ed) return false;
    const { u, v } = ed;
    const w = ed.w ?? 0;
    checks += 1;
    const du = dist[u] ?? INF;
    const dv = dist[v] ?? INF;
    const loopLine = pass === 'check' ? 8 : 5;
    const ifLine = pass === 'check' ? 9 : 6;
    const header = firstOfPass ? (pass === 'check' ? `Line 8 sweeps the edges **once more**, only to check. ` : `Line 4: pass \`_ = ${pass}\` starts. `) : '';
    const lines = firstOfPass && pass !== 'check' ? [4, loopLine, ifLine] : [loopLine, ifLine];
    const valuesBase: Record<number, string | undefined> = { 4: firstOfPass && pass !== 'check' ? `_ = ${pass}` : undefined, [loopLine]: `u, v, w = ${u}, ${v}, ${w}` };
    if (du === INF) {
      emit(
        {
          short: `${u}→${v}: skip`,
          title: `Edge ${u} → ${v}: ${u} isn't reached yet`,
          body: `${header}Line ${loopLine}: \`u, v, w = ${u}, ${v}, ${w}\`. Line ${ifLine}: \`dist[${u}]\` is infinity, so there is no path through ${u} to extend. Skip.`,
          lines,
          values: { ...valuesBase, [ifLine]: `dist[${u}] != inf → False` },
        },
        { pass, edge: i, verdict: 'unreached' },
      );
      return false;
    }
    const better = du + w < dv;
    if (pass === 'check' && better) {
      emit(
        {
          short: 'Still drops',
          title: `Edge ${u} → ${v} still improves: negative cycle`,
          body: `${header}Line 9: \`${du} + ${w} = ${du + w} < ${showDist(dv)}\`. After ${g.n - 1} full passes every real shortest path is final, so a distance that **still** drops means a loop whose total weight is negative: going around it again always helps. Line 11 returns \`None\`.`,
          lines: [loopLine, ifLine, 11],
          values: { ...valuesBase, [ifLine]: `${du + w} < ${showDist(dv)} → True`, 11: 'return None' },
          result: 'None',
        },
        { pass, edge: i, verdict: 'cycle', done: 'cycle' },
      );
      return true;
    }
    emit(
      {
        short: `${u}→${v}: ${du + w}?`,
        title: better ? `Edge ${u} → ${v}: ${du + w} beats ${showDist(dv)}` : `Edge ${u} → ${v}: ${du + w} doesn't beat ${showDist(dv)}`,
        body: `${header}Line ${loopLine}: \`u, v, w = ${u}, ${v}, ${w}\`. Line ${ifLine}: \`dist[${u}] + w = ${du} + ${w} = ${du + w}\` against \`dist[${v}] = ${showDist(dv)}\`: ${better ? 'cheaper.' : 'not cheaper.'}`,
        lines,
        values: { ...valuesBase, [ifLine]: `${du + w} < ${showDist(dv)} → ${better ? 'True' : 'False'}` },
      },
      { pass, edge: i, verdict: better ? 'better' : 'no' },
    );
    if (better && pass !== 'check') {
      dist[v] = du + w;
      via.set(v, i);
      relaxations += 1;
      emit(
        {
          short: `dist[${v}] = ${du + w}`,
          title: `Relax: dist[${v}] becomes ${du + w}`,
          body: `Line 7: \`dist[${v}] = ${du + w}\`${dv === INF ? '' : `, down from ${dv}`}. Later edges in this pass already see the new value.`,
          lines: [7],
          values: { 7: `dist = ${show()}` },
        },
        { pass, edge: i, verdict: 'relaxed' },
      );
    }
    return better;
  };

  for (let pass = 0; pass < g.n - 1; pass += 1) {
    g.edges.forEach((_, i) => check(i, pass, i === 0));
  }
  for (let i = 0; i < g.edges.length; i += 1) {
    if (check(i, 'check', i === 0)) return steps;
  }
  const unreached = dist.map((d, k) => (d === INF ? k : -1)).filter((k) => k >= 0);
  emit(
    {
      short: 'Return',
      title: `No edge improves: return ${show()}`,
      body: `Line 8's check pass found nothing to improve, so there is no negative cycle reachable from ${start}. Line 12 returns \`${show()}\`${unreached.length ? `; ${pyList(unreached)} can't be reached (∞)` : ''}.`,
      lines: [12],
      values: { 12: `return ${show()}` },
      result: show(),
    },
    { pass: 'check', done: 'ok' },
  );
  return steps;
}

// Story graph: the negative edge 2 → 1 makes 0 → 2 → 1 → 3 the cheapest route. The edge order
// (1 → 3 first, 0 → 1 last) makes that 3-edge path need all three passes.
const G: Graph = {
  n: 4,
  directed: true,
  edges: [
    { u: 1, v: 3, w: 2 },
    { u: 2, v: 1, w: -3 },
    { u: 0, v: 1, w: 4 },
    { u: 0, v: 2, w: 5 },
  ],
};
const RUN = traceBellmanFord(G, 0);
const RUN_START = 7;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`bellman-ford: no run step "${short}"`);
  return i;
};
const startMetrics = { checks: 0, relaxations: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const LAST_FIX = find('dist[3] = 4');
const NEG = find('dist[1] = 2');

export default defineWalkthrough({
  id: 'learn/graph/bellman-ford',
  title: 'Bellman-Ford, patience with negative edges',
  summary: 'From the idea to the code: relax every edge, n − 1 times over, so improvements ripple along even when some edges are negative, then sweep once more to catch negative cycles.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def bellman_ford(n: int, edges: list[tuple[int, int, int]], start: int) -> list[float] | None:
    dist = [float("inf")] * n
    dist[start] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != float("inf") and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] != float("inf") and dist[u] + w < dist[v]:
            # Still improving after n - 1 passes: a negative cycle
            return None
    return dist`,
  },
  metrics: [
    { key: 'checks', label: 'Edge checks' },
    { key: 'relaxations', label: 'Improvements' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'edge start / value just written' },
    { tone: 'compare', label: 'edge being checked' },
    { tone: 'miss', label: 'no improvement / start not reached' },
    { tone: 'done', label: 'reached / edge that set its distance' },
    { tone: 'found', label: 'final shortest paths' },
    { tone: 'muted', label: 'unreachable' },
  ],
  goals: [
    { text: 'See why Dijkstra breaks on a negative edge', step: 2 },
    { text: 'Know why n − 1 sweeps are enough', step: 3 },
    { text: 'Watch every edge check in every pass', step: RUN_START + 1 },
    { text: 'See the last improvement need the last pass', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Cheapest cost from 0, with a rebate edge',
      body: 'Some roads pay you a rebate: the edge 2 → 1 has weight −3, so a path can get cheaper several hops later.\n\nLine 1 takes `n`, a list of `(u, v, w)` edges and a `start`, and returns `dist`, or `None` if a loop of negative total weight makes "cheapest" meaningless.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ g: G, dist: [0, INF, INF, INF], via: new Map(), bare: true, note: 'edges = [(1, 3, 2), (2, 1, -3),\n         (0, 1, 4), (0, 2, 5)]' }) },
    },
    {
      chapter: 'idea',
      short: 'Negative',
      title: 'A negative edge can lower a “final” distance',
      body: 'Dijkstra would settle 1 at cost 4 (the direct edge) before looking at 2, at cost 5. But 0 → 2 → 1 costs 5 − 3 = **2**. A greedy "closest is final" rule breaks once edges can be negative.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(NEG),
    },
    {
      chapter: 'idea',
      short: 'n − 1 sweeps',
      title: 'Sweep every edge, n − 1 times',
      body: 'Instead, try **every** edge and keep any improvement. A shortest path uses at most `n − 1` edges, and each full sweep makes at least one more edge of it correct, in order. So `n − 1` sweeps are always enough, whatever the edge order.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(LAST_FIX),
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 2–4: start, then n − 1 passes',
      body: 'Distances start at infinity except the start. Line 4 repeats the sweep `n − 1` times; `_` is just the pass counter.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['dist = [inf] * n', 'dist[start] = 0', 'for _ in range(n - 1):'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Relax all',
      title: 'Lines 5–7: try every edge, keep improvements',
      body: 'For each edge `u → v`, if `u` is reached and going through it is cheaper, line 7 lowers `dist[v]`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: { ...startMetrics, checks: 3, relaxations: 1 },
      changes: ['for u, v, w in edges:', 'if dist[u] != inf and dist[u] + w < dist[v]:', 'dist[v] = dist[u] + w'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Check pass',
      title: 'Lines 8–10: one more sweep, just to check',
      body: 'After `n − 1` passes nothing real can improve. Lines 8–9 sweep once more; the comment says what an improvement would mean.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: startMetrics,
      changes: ['for u, v, w in edges:', 'if ... < dist[v]:'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Lines 11–12: None for a cycle, else the distances',
      body: 'A drop in the check pass returns `None` (line 11); otherwise line 12 returns `dist`.\n\nNow let’s run all three passes.',
      code: { view: 'final', lines: [11, 12] },
      metrics: startMetrics,
      changes: ['return None', 'return dist'],
      scene: at(0),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n − 1 sweeps of E edges: O(V · E)',
      body: 'Line 4 runs `V − 1` times and line 5 tries all `E` edges each time, plus one check sweep: **`O(V · E)` time** and `O(V)` space. Slower than Dijkstra, but it accepts negative edges and detects negative cycles.',
      code: { view: 'final', lines: [4, 5, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ g: G, dist: [0, 2, 5, 4], via: new Map([[1, 1], [2, 3], [3, 0]]), pass: 'check', done: 'ok', note: '3 passes × 4 edges + 4 checks\nV = 1,000, E = 10,000 → ~10^7', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Last pass',
      title: 'Why line 4 runs n − 1 passes, no fewer',
      body: 'The cheapest route to 3 is 0 → 2 → 1 → 3: **three** edges. With this edge order each pass fixed only one more of them: pass 0 set 2, pass 1 set 1 (via the rebate), and only pass 2 brought 3 down to 4.\n\nStopping after fewer than `n − 1 = 3` passes would have returned 6 for vertex 3: that guarantee is the key decision.',
      code: { view: 'final', lines: [4, 6, 7] },
      values: { 4: '_ = 2: the last pass', 7: 'dist[3] = 4, was 6' },
      metrics: FINAL_METRICS,
      scene: at(LAST_FIX),
    },
  ],
  trace: {
    title: 'Run Bellman-Ford on your own graph',
    inputs: graphInputs({ n: 4, from: '1, 2, 0, 0', to: '3, 1, 1, 2', weight: '2, -3, 4, 5' }, [{ name: 'start', label: 'Start vertex', kind: 'number', default: '0' }]),
    presets: [
      { label: 'Negative cycle', values: { n: '4', from: '0, 1, 2, 3', to: '1, 2, 3, 1', weight: '1, -2, 1, -1', start: '0' } },
      { label: 'Unreachable vertex', values: { n: '4', from: '0, 1', to: '1, 2', weight: '3, -1', start: '0' } },
      { label: 'All positive', values: { n: '4', from: '0, 0, 1, 2', to: '1, 2, 3, 3', weight: '2, 1, 2, 5', start: '0' } },
    ],
    maxItems: 8,
    run: (values) => {
      const g = parseGraph(values, { directed: true, weighted: true, allowEmpty: false });
      if (g.n > 5) throw new Error('Bellman-Ford takes n − 1 passes over every edge: use at most 5 vertices here.');
      return traceBellmanFord(g, parseVertex(values, 'start', g.n, 'Start vertex'));
    },
  },
});
