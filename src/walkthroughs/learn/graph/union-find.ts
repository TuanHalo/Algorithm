import { arr, defineWalkthrough, link, map, note, vars } from '../../../lib/walkthrough/helpers';
import { drawGraph, lineValues, MAX_NODES, nodeId, pyList, type Graph } from '../../../lib/walkthrough/graph';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone, TraceValues } from '../../../lib/walkthrough/types';

const RANK_Y = 130;
const STACK_Y = 300;
const NOTE = { x: 200, y: 330 } as const;

interface UfState {
  readonly n: number;
  readonly parent: readonly number[];
  readonly rank: readonly number[];
  readonly a?: number;
  readonly b?: number;
  readonly ra?: number;
  readonly rb?: number;
  /** Vertex find() is looking at, and whether it just followed / rewired its pointer. */
  readonly x?: number;
  readonly rewired?: boolean;
  /** Running calls, bottom first, e.g. ['union(1, 3)', 'find(3)']. */
  readonly stack: readonly string[];
  /** Pointer just attached by union. */
  readonly attached?: number;
  readonly verdict?: 'same' | 'merged';
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

function scene(s: UfState): Entity[] {
  const g: Graph = { n: s.n, directed: true, edges: [] };
  const isRoot = (k: number): boolean => s.parent[k] === k;
  const entities: Entity[] = drawGraph(g, {
    codeVar: 'parent',
    node: (k) => {
      const sub = isRoot(k) ? `rank ${s.rank[k] ?? 0}` : '';
      if (k === s.x) return { tone: 'active', sub };
      if (s.verdict === 'same' && (k === s.ra || k === s.rb)) return { tone: 'miss', sub };
      if (k === s.ra || k === s.rb) return { tone: 'found', sub };
      if (k === s.a || k === s.b) return { tone: 'compare', sub };
      return { tone: isRoot(k) ? 'done' : 'default', sub };
    },
  });
  // Parent pointers: one link per non-root, keyed by the child so it re-aims instead of being redrawn.
  s.parent.forEach((p, k) => {
    if (p === k) return;
    const hot = k === s.x || k === s.attached;
    entities.push(link(`parent-${k}`, { entity: nodeId(k) }, { entity: nodeId(p) }, { tone: hot ? (s.rewired || k === s.attached ? 'found' : 'compare') : 'default', ...(hot && (s.rewired || k === s.attached) ? { flow: true } : {}) }));
  });
  if (s.bare) {
    if (s.note) entities.push(note('note', 60, 40, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const right = tableBesideArray(s.n, 4);
  const dash = (v: number | undefined): number | string => v ?? '—';
  const muted = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    arr('parent', 0, 0, s.parent, {
      label: 'parent',
      codeVar: 'parent',
      tones: Object.fromEntries(s.parent.map((p, k) => [k, k === s.x ? 'active' : k === s.attached ? 'active' : p === k ? 'done' : 'default'])),
    }),
    arr('rank', 0, RANK_Y, s.rank, { label: 'rank', codeVar: 'rank', tones: Object.fromEntries(s.rank.map((_, k) => [k, k === s.ra || k === s.rb ? 'compare' : 'default'])) }),
    vars(
      'vals',
      right,
      0,
      [
        { name: 'a', value: dash(s.a), tone: muted(s.a) },
        { name: 'b', value: dash(s.b), tone: muted(s.b) },
        { name: 'ra', value: dash(s.ra), tone: s.ra === undefined ? 'muted' : s.verdict === 'same' ? 'miss' : 'default' },
        { name: 'rb', value: dash(s.rb), tone: s.rb === undefined ? 'muted' : s.verdict === 'same' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 160 },
    ),
  );
  if (s.stack.length > 0) {
    entities.push(
      map(
        'stack',
        right,
        STACK_Y,
        'call stack',
        s.stack.map((frame, i) => {
          const top = i === s.stack.length - 1;
          return { key: frame, value: top ? 'running' : frame.startsWith('union') ? 'waits on line 13' : 'waits on line 9', tone: top ? 'note' : 'muted' };
        }),
        { width: 230 },
      ),
    );
  }
  if (s.note) entities.push(note('note', NOTE.x, NOTE.y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/**
 * Runs a sequence of unions and records one decision per step: every find
 * call down to the root, every path-compression rewire on the way back,
 * the same-set check, the rank comparison, the attach, the rank bump and the return.
 */
function traceUnionFind(n: number, ops: readonly (readonly [number, number])[]): Step[] {
  const parent = Array.from({ length: n }, (_, k) => k);
  const rank = Array.from({ length: n }, () => 0);
  const steps: Step[] = [];
  let unions = 0;
  const sets = (): number => parent.filter((p, k) => p === k).length;
  const stack: string[] = [];
  const emit = (
    e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string | undefined>>; result?: string },
    view: Partial<UfState> = {},
  ): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: lineValues(e.values),
      metrics: { sets: sets(), unions, result: e.result ?? '—' },
      scene: { entities: scene({ n, parent: [...parent], rank: [...rank], stack: [...stack], ...view }) },
    });
  };

  emit({
    short: 'Init',
    title: `${n} singletons: everyone leads their own set`,
    body: `Line 3 points every element at itself: \`parent = ${pyList(parent)}\`, so each is the **root** of a set of one. Line 4 gives every tree rank 0 (its height bound).`,
    lines: [3, 4],
    values: { 3: `parent = ${pyList(parent)}`, 4: `rank = ${pyList(rank)}` },
  });

  /** find(x) with path compression; `ctx` keeps the union's variables on screen. */
  const find = (x: number, ctx: Partial<UfState>, caller: string): number => {
    stack.push(`find(${x})`);
    const p = parent[x] ?? x;
    if (p === x) {
      emit(
        {
          short: `${x} is root`,
          title: `find(${x}): ${x} is a root`,
          body: `${caller} Line 7: \`parent[${x}] == ${x}\`, so ${x} leads its set. Line 10 returns ${x}.`,
          lines: [7, 10],
          values: { 7: `parent[${x}] != ${x} → False`, 10: `return ${x}` },
        },
        { ...ctx, x },
      );
      stack.pop();
      return x;
    }
    emit(
      {
        short: `${x} → ${p}`,
        title: `find(${x}): not a root, ask its parent ${p}`,
        body: `${caller} Line 7: \`parent[${x}] = ${p}\`, not ${x} itself, so ${x} is not a root. Line 9 asks \`find(${p})\` for the root and waits for the answer.`,
        lines: [7, 9],
        values: { 7: `parent[${x}] != ${x} → True`, 9: `self.find(${p})` },
      },
      { ...ctx, x },
    );
    const root = find(p, ctx, `Line 9 calls \`find(${p})\`.`);
    const before = parent[x];
    parent[x] = root;
    emit(
      {
        short: `${x} ⇒ ${root}`,
        title: before === root ? `parent[${x}] = ${root} (already pointing there)` : `Shortcut: point ${x} straight at the root ${root}`,
        body:
          before === root
            ? `Back in \`find(${x})\`: the root is ${root}. Line 9 stores it in \`parent[${x}]\`, which already held ${root}. Line 10 returns ${root}.`
            : `Back in \`find(${x})\`: the root is ${root}. Line 9 rewires \`parent[${x}] = ${root}\`, skipping ${before}: the next find from ${x} takes **one** hop. Line 10 returns ${root}.`,
        lines: [9, 10],
        values: { 9: `parent[${x}] = ${root}`, 10: `return ${root}` },
      },
      { ...ctx, x, rewired: before !== root },
    );
    stack.pop();
    return root;
  };

  for (const [a, b] of ops) {
    stack.push(`union(${a}, ${b})`);
    const ra = find(a, { a, b }, `\`union(${a}, ${b})\` starts: line 13 calls \`find(${a})\`.`);
    const rb = find(b, { a, b, ra }, `Line 13 calls \`find(${b})\`.`);
    if (ra === rb) {
      emit(
        {
          short: 'Same set',
          title: `${a} and ${b} already share root ${ra}`,
          body: `Line 14: \`ra == rb == ${ra}\`. ${a} and ${b} are already in one set, so there is nothing to merge: line 15 returns \`False\`. (In Kruskal's algorithm this edge would close a cycle.)`,
          lines: [14, 15],
          values: { 14: `${ra} == ${rb} → True`, 15: 'return False' },
          result: 'False',
        },
        { a, b, ra, rb, verdict: 'same' },
      );
      stack.pop();
      continue;
    }
    let hi = ra;
    let lo = rb;
    const swap = (rank[ra] ?? 0) < (rank[rb] ?? 0);
    if (swap) [hi, lo] = [rb, ra];
    emit(
      {
        short: swap ? 'Swap roots' : 'Ranks ok',
        title: swap ? `${rb}'s tree is taller: swap so it stays on top` : `${ra}'s tree is at least as tall: it stays on top`,
        body: `Line 14: \`${ra} != ${rb}\`, two different sets. Line 16 compares ranks: ${rank[ra]} < ${rank[rb]} is ${swap ? 'true, so line 17 swaps them' : 'false, so no swap'}. Now \`ra = ${hi}\` is the taller root and \`rb = ${lo}\` will hang under it.`,
        lines: swap ? [14, 16, 17] : [14, 16],
        values: { 14: `${ra} == ${rb} → False`, 16: `${rank[ra]} < ${rank[rb]} → ${swap ? 'True' : 'False'}`, 17: swap ? `ra, rb = ${hi}, ${lo}` : undefined },
      },
      { a, b, ra: hi, rb: lo },
    );
    parent[lo] = hi;
    emit(
      {
        short: `${lo} under ${hi}`,
        title: `Hang root ${lo} under root ${hi}`,
        body: `Line 18: \`parent[${lo}] = ${hi}\`. Every element of ${lo}'s set now reaches ${hi} by following pointers, so the two sets are one.`,
        lines: [18],
        values: { 18: `parent[${lo}] = ${hi}` },
      },
      { a, b, ra: hi, rb: lo, attached: lo },
    );
    const equal = rank[hi] === rank[lo];
    if (equal) rank[hi] = (rank[hi] ?? 0) + 1;
    emit(
      {
        short: equal ? `rank ${hi} + 1` : 'Rank stays',
        title: equal ? `Equal heights: ${hi}'s tree grows one level` : `${hi} was taller: its height doesn't change`,
        body: equal
          ? `Line 19: both ranks were ${rank[lo]}, so hanging ${lo} below ${hi} makes the tree one level taller. Line 20: \`rank[${hi}] = ${rank[hi]}\`.`
          : `Line 19: ranks ${rank[hi]} and ${rank[lo]} differ. The shorter tree fits under the taller one without making it taller, so the rank stays.`,
        lines: equal ? [19, 20] : [19],
        values: { 19: `${equal ? rank[lo] : rank[hi]} == ${rank[lo]} → ${equal ? 'True' : 'False'}`, 20: equal ? `rank[${hi}] = ${rank[hi]}` : undefined },
      },
      { a, b, ra: hi, rb: lo },
    );
    unions += 1;
    emit(
      {
        short: 'Return True',
        title: `union(${a}, ${b}) merged two sets`,
        body: `Line 21 returns \`True\`: a merge happened. ${sets()} set${sets() === 1 ? '' : 's'} left.`,
        lines: [21],
        values: { 21: 'return True' },
        result: 'True',
      },
      { a, b, ra: hi, rb: lo, verdict: 'merged' },
    );
    stack.pop();
  }
  return steps;
}

const N = 5;
const OPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 3],
  [1, 3],
  [0, 3],
];
const RUN = traceUnionFind(N, OPS);
const RUN_START = 10;
const at = (k: number): Step['scene'] => RUN[k]?.scene ?? { entities: [] };
const find = (short: string): number => {
  const i = RUN.findIndex((s) => s.short === short);
  if (i < 0) throw new Error(`union-find: no run step "${short}"`);
  return i;
};
const startMetrics = { sets: 5, unions: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const COMPRESS = find('3 ⇒ 0');

/** Reads n and the two parallel lists of union arguments. */
function parseOps(values: TraceValues): { n: number; ops: [number, number][] } {
  const n = values['n'];
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_NODES) throw new Error(`Elements n must be a whole number from 1 to ${MAX_NODES}.`);
  const as = Array.isArray(values['a']) ? values['a'] : [];
  const bs = Array.isArray(values['b']) ? values['b'] : [];
  if (as.length !== bs.length) throw new Error(`"a" has ${as.length} numbers but "b" has ${bs.length}: each union needs both.`);
  const ops = as.map((a, i): [number, number] => [a, bs[i] ?? 0]);
  for (const [a, b] of ops) if (a < 0 || b < 0 || a >= n || b >= n) throw new Error(`union(${a}, ${b}): elements go from 0 to ${n - 1}.`);
  return { n, ops };
}

export default defineWalkthrough({
  id: 'learn/graph/union-find',
  title: 'Union-Find, every set has a leader',
  summary: 'From the idea to the code: follow parent pointers to a set’s root to answer “same group?”, merge by hanging one root under another, and keep the trees flat with union by rank and path compression.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            # Flatten the chain so later finds jump straight to the root
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a: int, b: int) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True`,
  },
  metrics: [
    { key: 'sets', label: 'Sets' },
    { key: 'unions', label: 'Merges' },
    { key: 'result', label: 'Last returns' },
  ],
  legend: [
    { tone: 'active', label: 'element find() is on / pointer just set' },
    { tone: 'compare', label: 'union arguments / ranks compared' },
    { tone: 'found', label: 'roots found / pointer rewired' },
    { tone: 'done', label: 'a root' },
    { tone: 'miss', label: 'already one set' },
    { tone: 'note', label: 'running call' },
    { tone: 'muted', label: 'waiting call' },
  ],
  goals: [
    { text: 'Name each set by its root', step: 2 },
    { text: 'Keep trees flat with rank and shortcuts', step: 3 },
    { text: 'Watch every find, merge and shortcut', step: RUN_START + 1 },
    { text: 'Know why find rewires pointers to the root', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Merge friend circles, answer “same circle?”',
      body: 'At a party every circle has one leader. When two people shake hands their circles merge under one leader, and "are these two in the same circle?" means "do they have the same leader?".\n\nThe class keeps `n` elements, 0 to 4 here, and supports `union(a, b)` and `find(x)`. We run `union(0, 1)`, `union(2, 3)`, `union(1, 3)`, `union(0, 3)`.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, parent: [0, 1, 2, 3, 4], rank: [0, 0, 0, 0, 0], stack: [], bare: true, note: 'union(0, 1)  union(2, 3)\nunion(1, 3)  union(0, 3)' }) },
    },
    {
      chapter: 'idea',
      short: 'Leaders',
      title: 'Each element points toward its set’s root',
      body: 'Store one pointer per element: `parent[x]`. Following pointers always ends at a **root**, an element that points at itself, and the root names the set.\n\nMerging two sets is then one write: point one root at the other.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, parent: [0, 0, 2, 2, 4], rank: [1, 0, 1, 0, 0], stack: [], bare: true, note: 'sets {0, 1} and {2, 3}\nroots 0 and 2, and 4 alone' }) },
    },
    {
      chapter: 'idea',
      short: 'Stay flat',
      title: 'Short trees: union by rank, then shortcuts',
      body: 'Long chains would make `find` slow. Two tricks keep trees flat: hang the **shorter** tree under the taller one (its `rank` bounds the height), and when `find` walks a chain, point everything it passed **straight at the root**.\n\nTogether they make each operation nearly `O(1)`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(COMPRESS),
    },
    {
      chapter: 'build',
      short: 'Init',
      title: 'Lines 3–4: everyone is their own root',
      body: '`parent[x] = x` for every element: n sets of one. Every tree starts with rank 0.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self.parent = list(range(n))', 'self.rank = [0] * n'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'find',
      title: 'Lines 6–8: a non-root asks its parent',
      body: '`find(x)` returns x’s root. If `x` is not its own parent, it isn’t the root yet; the comment on line 8 says what happens next.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['def find(self, x)', 'if self.parent[x] != x:'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Shortcut',
      title: 'Lines 9–10: find the root, and remember it',
      body: 'Line 9 recursively finds the root of x’s parent and **stores it in `parent[x]`**: path compression in one line. Line 10 returns the root.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['self.parent[x] = self.find(self.parent[x])', 'return self.parent[x]'],
      scene: at(COMPRESS),
    },
    {
      chapter: 'build',
      short: 'union',
      title: 'Lines 12–13: find both roots',
      body: '`union(a, b)` first finds the roots of both elements.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13], lines: [12, 13] },
      metrics: startMetrics,
      changes: ['def union(self, a, b)', 'ra, rb = self.find(a), self.find(b)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Same set?',
      title: 'Lines 14–16: same root means nothing to do',
      body: 'Equal roots mean one set already: line 15 reports `False`. Otherwise line 16 compares the trees’ ranks.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16], lines: [14, 15, 16] },
      metrics: startMetrics,
      changes: ['if ra == rb: return False', 'if self.rank[ra] < self.rank[rb]:'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Attach',
      title: 'Lines 17–19: taller root on top',
      body: 'Line 17 swaps so `ra` is the taller tree, and line 18 hangs `rb` under it. Line 19 checks whether the heights were equal.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19], lines: [17, 18, 19] },
      metrics: startMetrics,
      changes: ['ra, rb = rb, ra', 'self.parent[rb] = ra', 'if self.rank[ra] == self.rank[rb]:'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Grow',
      title: 'Lines 20–21: equal heights grow by one',
      body: 'Only a merge of two equally tall trees makes the result taller (line 20). Line 21 reports that a merge happened.\n\nNow let’s run the four unions.',
      code: { view: 'final', lines: [20, 21] },
      metrics: { sets: 4, unions: 1, result: 'True' },
      changes: ['self.rank[ra] += 1', 'return True'],
      scene: at(5),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Nearly O(1) per operation: O(α(n))',
      body: 'Union by rank keeps every tree `O(log n)` tall; path compression flattens whatever a find walks. Together, a sequence of operations costs **`O(α(n))` each** (amortized), where `α` is the inverse Ackermann function: at most 4 for any real input. Space is **`O(n)`**.',
      code: { view: 'final', lines: [9, 18] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, parent: [0, 0, 0, 0, 4], rank: [2, 0, 1, 0, 0], stack: [], note: 'n = 10^80 → α(n) ≤ 4\n4 unions, 1 shortcut', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Shortcut',
      title: 'Why line 9 rewires parent[x] to the root',
      body: 'Before `union(0, 3)`, 3 sat two hops below its root (3 → 2 → 0). The find in that union walked the chain once and then pointed 3 **straight at 0**: every later `find(3)` is one hop.\n\nRewiring on the way back is the key decision: each long walk pays for itself by shortening all future ones.',
      code: { view: 'final', lines: [8, 9] },
      values: { 9: 'parent[3] = 0, was 2' },
      metrics: FINAL_METRICS,
      scene: at(COMPRESS),
    },
  ],
  trace: {
    title: 'Run your own unions',
    inputs: [
      { name: 'n', label: `Elements n (0 to n − 1, at most ${MAX_NODES})`, kind: 'number', default: '5' },
      { name: 'a', label: 'union(a, b): a', kind: 'numbers', default: '0, 2, 1, 0' },
      { name: 'b', label: 'union(a, b): b (same order)', kind: 'numbers', default: '1, 3, 3, 3' },
    ],
    presets: [
      { label: 'Repeat union', values: { n: '3', a: '0, 0, 1', b: '1, 1, 0' } },
      { label: 'Long chain', values: { n: '5', a: '0, 1, 2, 3, 4', b: '1, 2, 3, 4, 0' } },
      { label: 'Union with itself', values: { n: '3', a: '1, 0', b: '1, 2' } },
      { label: 'Two groups meet', values: { n: '6', a: '0, 1, 3, 4, 2', b: '1, 2, 4, 5, 5' } },
    ],
    maxItems: 8,
    run: (values) => {
      const { n, ops } = parseOps(values);
      return traceUnionFind(n, ops);
    },
  },
});
