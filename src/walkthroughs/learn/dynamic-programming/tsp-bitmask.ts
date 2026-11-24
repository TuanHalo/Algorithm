import { arr, defineWalkthrough, link, map, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * dp[mask][u] has 2ⁿ rows of n cities, so it is drawn transposed: a `masks`
 * header (each mask in binary, its number underneath), then one row per
 * city u, `u-k`, whose column `mask` is dp[mask][k]. The distances sit in a
 * `dist` table under the variables.
 */
const TOP = 120;
const ROW_Y = 100;

type Phase = 'bare' | 'init' | 'mask' | 'from' | 'relax' | 'close' | 'done';

interface TspState {
  readonly dist: readonly (readonly number[])[];
  readonly phase: Phase;
  /** dp values that are not infinity, keyed "mask,u". */
  readonly dp: ReadonlyMap<string, number>;
  readonly mask?: number;
  readonly u?: number;
  readonly nxt?: number;
  /** In a relax step, whether the new cost improved the target. */
  readonly better?: boolean;
  /** Cities u already closed in the final min, with their tour totals. */
  readonly closed?: readonly number[];
  readonly answer?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const key = (mask: number, u: number): string => `${mask},${u}`;
const bin = (mask: number, n: number): string => mask.toString(2).padStart(n, '0');
const has = (mask: number, u: number): boolean => (mask & (1 << u)) !== 0;
const setOf = (mask: number, n: number): string => `{${Array.from({ length: n }, (_, k) => k).filter((k) => has(mask, k)).join(', ')}}`;

/** Scene: the mask header, one dp row per city, the move being tried, the variables and the distances. */
function scene(s: TspState): Entity[] {
  const { dist, phase, mask, u, nxt } = s;
  const n = dist.length;
  const masks = 1 << n;
  const full = masks - 1;
  const entities: Entity[] = [];
  const nmask = mask !== undefined && nxt !== undefined ? mask | (1 << nxt) : undefined;

  const headTones: Record<number, Tone> = {};
  if (mask !== undefined && phase !== 'done' && phase !== 'close') headTones[mask] = phase === 'mask' ? 'active' : 'compare';
  if (phase === 'close' || phase === 'done') headTones[full] = 'compare';
  entities.push(arr('masks', 0, 0, Array.from({ length: masks }, (_, m) => bin(m, n)), { label: 'mask', tones: headTones }));

  for (let c = 0; c < n; c += 1) {
    const values: ScalarValue[] = [];
    const tones: Record<number, Tone> = {};
    for (let m = 0; m < masks; m += 1) {
      const v = s.dp.get(key(m, c));
      values.push(v === undefined ? '∞' : v);
      tones[m] = v === undefined ? 'muted' : 'done';
    }
    if (phase === 'mask' && mask !== undefined && s.dp.has(key(mask, c))) tones[mask] = 'compare';
    if ((phase === 'from' || phase === 'relax') && mask !== undefined && c === u) tones[mask] = phase === 'from' ? 'active' : 'compare';
    if (phase === 'relax' && nmask !== undefined && c === nxt) tones[nmask] = 'active';
    if (phase === 'close' && c === u) tones[full] = 'active';
    entities.push(arr(`u-${c}`, 0, TOP + c * ROW_Y, values, { label: `u = ${c}`, tones, codeVar: 'dp', showIndex: false }));
  }

  if (phase === 'relax' && mask !== undefined && u !== undefined && nxt !== undefined && nmask !== undefined) {
    entities.push(
      link('move', { entity: `u-${u}`, index: mask, side: 'top' }, { entity: `u-${nxt}`, index: nmask, side: 'top' }, {
        tone: s.better ? 'found' : 'miss',
        dashed: !s.better,
        flow: s.better,
        label: `+${dist[u]?.[nxt] ?? 0}`,
      }),
    );
  }

  const right = tableBesideArray(masks, 5);
  if (!s.bare) {
    const dash = '—';
    entities.push(
      vars(
        'vals',
        right,
        0,
        [
          { name: 'mask', value: mask !== undefined && phase !== 'close' && phase !== 'done' ? bin(mask, n) : phase === 'close' || phase === 'done' ? bin(full, n) : dash, tone: mask === undefined && phase !== 'close' && phase !== 'done' ? 'muted' : 'default' },
          { name: 'u', value: u ?? dash, tone: u === undefined ? 'muted' : 'default' },
          { name: 'nxt', value: nxt ?? dash, tone: nxt === undefined ? 'muted' : 'default' },
          { name: 'nmask', value: nmask !== undefined ? bin(nmask, n) : dash, tone: nmask === undefined ? 'muted' : 'default' },
          { name: 'answer', value: s.answer ?? dash, tone: phase === 'done' ? 'found' : s.answer === undefined ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  const entries: MapEntry[] = [];
  for (let a = 0; a < n; a += 1) {
    for (let b = 0; b < n; b += 1) {
      if (a === b) continue;
      const used = (phase === 'relax' && a === u && b === nxt) || (phase === 'close' && a === u && b === 0);
      entries.push({ key: `${a} → ${b}`, value: dist[a]?.[b] ?? 0, tone: used ? 'compare' : 'default' });
    }
  }
  entities.push(map('dist', right + 200, 0, 'dist', entries, { codeVar: 'dist', width: 150 }));
  if (s.note) entities.push(note('note', 0, TOP + n * ROW_Y + 70, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs tsp_bitmask(dist) and records one step per decision (chapter "run", final code). */
function traceTsp(dist: readonly (readonly number[])[]): Step[] {
  const steps: Step[] = [];
  const n = dist.length;
  const full = (1 << n) - 1;
  let moves = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ moves, result });
  const dp = new Map<string, number>();
  dp.set(key(1, 0), 0);
  const snap = (): Map<string, number> => new Map(dp);

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: 'Start at city 0, having visited {0}',
    body: `Line 2: \`n = ${n}\` cities. Lines 3–4 fill a ${1 << n} × ${n} table with \`inf\` (shown as ∞: not reachable yet). Line 5 sets \`dp[0b${bin(1, n)}][0] = 0\`: standing at city 0 with only city 0 visited costs nothing.`,
    code: { view: 'final', lines: [2, 3, 4, 5] },
    values: { 2: `n = ${n}`, 4: `dp = ${1 << n} × ${n} inf`, 5: `dp[${1}][0] = 0` },
    metrics: metrics(),
    scene: { entities: scene({ dist, phase: 'init', dp: snap() }) },
  });

  for (let mask = 1; mask <= full; mask += 1) {
    const live = Array.from({ length: n }, (_, u) => u).filter((u) => has(mask, u) && dp.has(key(mask, u)));
    steps.push({
      chapter: 'run',
      short: `mask ${bin(mask, n)}`,
      title: live.length ? `mask ${bin(mask, n)}: visited ${setOf(mask, n)}` : `mask ${bin(mask, n)}: nothing to extend`,
      body: live.length
        ? `Line 6 sets \`mask = 0b${bin(mask, n)}\`, the cities ${setOf(mask, n)}. Lines 7–8 check each city \`u\`: ${live.map((u) => `u = ${u}`).join(' and ')} ${live.length === 1 ? 'is' : 'are'} in the mask and reachable; ${n - live.length === 0 ? 'no city is skipped' : 'the others are skipped by line 9'}.`
        : `Line 6 sets \`mask = 0b${bin(mask, n)}\`, the cities ${setOf(mask, n)}. ${has(mask, 0) ? 'No path reaches these states yet' : 'Every path starts at city 0, and bit 0 is off'}, so line 8 sends every \`u\` to line 9’s \`continue\`.`,
      code: { view: 'final', lines: [6, 7, 8] },
      values: { 6: `mask = 0b${bin(mask, n)}`, 8: live.length ? `live: u = ${live.join(', ')}` : 'all skipped' },
      metrics: metrics(),
      scene: { entities: scene({ dist, phase: 'mask', dp: snap(), mask }) },
    });
    for (const u of live) {
      const base = dp.get(key(mask, u)) ?? 0;
      const open = Array.from({ length: n }, (_, k) => k).filter((k) => !has(mask, k));
      steps.push({
        chapter: 'run',
        short: `from ${u}`,
        title: `At city ${u} with ${setOf(mask, n)}: cost ${base}`,
        body: open.length
          ? `\`u = ${u}\` passes line 8: \`dp[0b${bin(mask, n)}][${u}] = ${base}\`. Line 10 now looks at every \`nxt\`; line 11 keeps the unvisited ones: ${open.join(', ')}.`
          : `\`u = ${u}\` passes line 8 (\`dp = ${base}\`), but every city is already in the mask, so line 11 rejects every \`nxt\`: nothing to extend.`,
        code: { view: 'final', lines: [7, 8, 10, 11] },
        values: { 7: `u = ${u}`, 8: `dp[${mask}][${u}] = ${base}`, 11: open.length ? `unvisited: ${open.join(', ')}` : 'none unvisited' },
        metrics: metrics(),
        scene: { entities: scene({ dist, phase: 'from', dp: snap(), mask, u }) },
      });
      for (const nxt of open) {
        const nmask = mask | (1 << nxt);
        const step = dist[u]?.[nxt] ?? 0;
        const cand = base + step;
        const before = dp.get(key(nmask, nxt));
        const better = before === undefined || cand < before;
        if (better) dp.set(key(nmask, nxt), cand);
        moves += 1;
        steps.push({
          chapter: 'run',
          short: `${u} → ${nxt}`,
          title: better ? `${u} → ${nxt}: dp[${bin(nmask, n)}][${nxt}] = ${cand}` : `${u} → ${nxt}: ${cand} is no better than ${before}`,
          body: `\`nxt = ${nxt}\`. Line 12 adds it to the set: \`nmask = 0b${bin(mask, n)} | 0b${bin(1 << nxt, n)} = 0b${bin(nmask, n)}\`. Line 13: going ${u} → ${nxt} costs \`${base} + ${step} = ${cand}\`${better ? (before === undefined ? ', the first way into that state.' : `, cheaper than ${before}.`) : `, but that state already has ${before}.`}`,
          code: { view: 'final', lines: [10, 12, 13] },
          values: { 10: `nxt = ${nxt}`, 12: `nmask = 0b${bin(nmask, n)}`, 13: `min(${before ?? '∞'}, ${base} + ${step}) = ${better ? cand : before}` },
          metrics: metrics(),
          scene: { entities: scene({ dist, phase: 'relax', dp: snap(), mask, u, nxt, better }) },
        });
      }
    }
  }

  let answer = Infinity;
  const closed: number[] = [];
  for (let u = 0; u < n; u += 1) {
    const at = dp.get(key(full, u));
    const back = dist[u]?.[0] ?? 0;
    closed.push(u);
    if (at === undefined) {
      steps.push({
        chapter: 'run',
        short: `close ${u}`,
        title: `Ending at city ${u}: not reachable`,
        body: `Line 14: \`full = 0b${bin(full, n)}\`, every city visited. Line 15 tries ending the path at \`u = ${u}\`, but \`dp[full][${u}]\` is still \`inf\`${u === 0 && n > 1 ? ': a path that visits everything can’t end at its start' : ''}.`,
        code: { view: 'final', lines: [14, 15] },
        values: { 14: `full = 0b${bin(full, n)}`, 15: `u = ${u}: inf` },
        metrics: metrics(),
        scene: { entities: scene({ dist, phase: 'close', dp: snap(), u, closed: [...closed], answer: answer === Infinity ? undefined : answer }) },
      });
      continue;
    }
    const total = at + back;
    const better = total < answer;
    if (better) answer = total;
    steps.push({
      chapter: 'run',
      short: `close ${u}`,
      title: `End at ${u}, fly home: ${at} + ${back} = ${total}`,
      body: `Line 15 closes the tour from \`u = ${u}\`: the whole set ending at ${u} costs \`dp[0b${bin(full, n)}][${u}] = ${at}\`, plus \`dist[${u}][0] = ${back}\` back home: ${total}. ${better ? 'Best so far.' : `Not better than ${answer}.`}`,
      code: { view: 'final', lines: [14, 15] },
      values: { 14: `full = 0b${bin(full, n)}`, 15: `u = ${u}: ${at} + ${back} = ${total}` },
      metrics: metrics(),
      scene: { entities: scene({ dist, phase: 'close', dp: snap(), u, closed: [...closed], answer }) },
    });
  }

  const result = answer === Infinity ? 0 : answer;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Shortest tour: ${result}`,
    body: n === 1 ? 'With a single city the tour is just staying put: line 15 returns **0**.' : `Line 15’s \`min\` over every last city gives **${result}**, the cheapest round trip from city 0 through every city and back.`,
    code: { view: 'final', lines: [15] },
    values: { 15: `return ${result}` },
    metrics: metrics(result),
    scene: { entities: scene({ dist, phase: 'done', dp: snap(), closed, answer: result }) },
  });
  return steps;
}

const DIST = [
  [0, 2, 9],
  [1, 0, 6],
  [15, 7, 0],
] as const;
const N = DIST.length;
const RUN = traceTsp(DIST);
const startMetrics = { moves: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 11;
const FINAL_DP = new Map([...((): Map<string, number> => {
  const m = new Map<string, number>();
  m.set(key(1, 0), 0);
  m.set(key(3, 1), 2);
  m.set(key(5, 2), 9);
  m.set(key(7, 2), 8);
  m.set(key(7, 1), 16);
  return m;
})()]);
const START_DP = new Map([[key(1, 0), 0]]);

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/tsp-bitmask',
  title: 'Traveling Salesperson, one bit per city',
  summary: 'From the idea to the code: find the shortest round trip through every city by remembering, for each set of visited cities and each last city, only the cheapest way to get there.',
  minutes: 11,
  code: {
    lang: 'python',
    source: `def tsp_bitmask(dist: list[list[int]]) -> int:
    n = len(dist)
    inf = 10**9
    dp = [[inf] * n for _ in range(1 << n)]
    dp[1][0] = 0  # Start at city 0 with bit 0 set
    for mask in range(1, 1 << n):
        for u in range(n):
            if not (mask & (1 << u)) or dp[mask][u] == inf:
                continue
            for nxt in range(n):
                if not (mask & (1 << nxt)):
                    nmask = mask | (1 << nxt)
                    dp[nmask][nxt] = min(dp[nmask][nxt], dp[mask][u] + dist[u][nxt])
    full = (1 << n) - 1
    return min(dp[full][u] + dist[u][0] for u in range(n))`,
  },
  snapshots: {
    brute: `from itertools import permutations


def tsp_bitmask(dist: list[list[int]]) -> int:
    n = len(dist)
    best = float("inf")
    for order in permutations(range(1, n)):  # Every order of the other cities
        tour = (0, *order, 0)
        best = min(best, sum(dist[a][b] for a, b in zip(tour, tour[1:])))
    return int(best)`,
  },
  metrics: [
    { key: 'moves', label: 'Moves tried' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'mask / state being set' },
    { tone: 'compare', label: 'state read / distance used' },
    { tone: 'done', label: 'reachable' },
    { tone: 'muted', label: 'not reachable (∞)' },
    { tone: 'miss', label: 'no cheaper' },
    { tone: 'found', label: 'cheaper / answer' },
  ],
  goals: [
    { text: 'See why trying every order is (n − 1)!', step: 2 },
    { text: 'Store a visited set in the bits of one number', step: 4 },
    { text: 'Extend every reachable state by one city', step: BUILD_END + 4 },
    { text: 'Know why one value per (set, city) is enough', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The shortest round trip through every city',
      body: 'Start at city 0, visit every other city exactly once, and come back. `dist[a][b]` is the cost from `a` to `b` (it may differ from `b` to `a`). Line 1 returns the cheapest tour.\n\nHere 3 cities: 0 → 1 → 2 → 0 costs 2 + 6 + 15 = 23, but 0 → 2 → 1 → 0 costs 9 + 7 + 1 = **17**.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ dist: DIST, phase: 'bare', dp: new Map(), bare: true, note: '0 → 1 → 2 → 0: 2 + 6 + 15 = 23\n0 → 2 → 1 → 0: 9 + 7 + 1 = 17 ✓' }) },
    },
    {
      chapter: 'idea',
      short: 'Every order',
      title: 'The obvious way: try every order of the cities',
      body: 'Lines 7–9 try every order of the other cities and add up each tour. That is `(n − 1)!` tours: 2 here, but 362 880 for 10 cities and about 10¹² for 16.\n\nMost of that work is shared: every tour starting 0 → 1 → 2 pays for that same prefix again.',
      code: { view: 'snapshot', id: 'brute', lines: [7, 8, 9] },
      metrics: startMetrics,
      scene: { entities: scene({ dist: DIST, phase: 'bare', dp: new Map(), bare: true, note: 'n = 10: 9! = 362 880 tours\nn = 16: 15! ≈ 1.3·10¹² tours', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Set + city',
      title: 'Only the visited set and the current city matter',
      body: 'Once you are at city `u` having visited some set of cities, the rest of the trip doesn’t care **in which order** you visited them. So keep one number per state: `dp[set][u]` = the cheapest path from city 0 through exactly that set, ending at `u`.\n\nWith 4 cities, 0 → 1 → 2 → 3 and 0 → 2 → 1 → 3 reach the same state ({0, 1, 2, 3}, 3): only the cheaper one is kept.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ dist: DIST, phase: 'bare', dp: FINAL_DP, bare: true, note: `${1 << N} sets × ${N} cities = ${(1 << N) * N} states\ninstead of every order` }) },
    },
    {
      chapter: 'idea',
      short: 'Bits',
      title: 'A set of cities fits in the bits of one number',
      body: 'Bit `k` of `mask` is 1 when city `k` is visited: `0b101` is {0, 2}. Then **`mask & (1 << k)`** tests whether `k` is in the set, and **`mask | (1 << k)`** adds it.\n\nThe masks run from 1 to `2ⁿ − 1` (all cities). Adding a city only turns bits on, so a bigger set always has a bigger number and is handled later.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ dist: DIST, phase: 'mask', dp: START_DP, mask: 5, bare: true, note: '0b101 = {0, 2}\n0b101 & 0b010 = 0: city 1 not in it\n0b101 | 0b010 = 0b111: add city 1' }) },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–4: a 2ⁿ × n table of “not reachable”',
      body: '`1 << n` is `2ⁿ`, one row per set of cities. `inf` (a huge number) marks states no path has reached yet.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['n = len(dist)', 'inf = 10**9', 'dp = [[inf] * n for _ in range(1 << n)]'],
      scene: { entities: scene({ dist: DIST, phase: 'init', dp: new Map() }) },
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Line 5: standing at city 0 costs nothing',
      body: 'Mask `1` is `0b001`, the set {0}. Every tour grows from this one state.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['dp[1][0] = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'States',
      title: 'Lines 6–7: every set, every last city',
      body: 'Line 6 walks the masks in increasing order (smaller sets first), line 7 every possible last city `u`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['for mask in range(1, 1 << n)', 'for u in range(n)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Skip',
      title: 'Lines 8–9: skip impossible states',
      body: '`u` must be in the set, and the state must have been reached; otherwise line 9 moves on.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['if not (mask & (1 << u)) or dp[mask][u] == inf: continue'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Next city',
      title: 'Lines 10–12: go to an unvisited city',
      body: 'Line 10 tries every city, line 11 keeps the unvisited ones, and line 12 builds the bigger set with `|`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['for nxt in range(n)', 'if not (mask & (1 << nxt))', 'nmask = mask | (1 << nxt)'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Relax',
      title: 'Line 13: keep the cheaper way into the new state',
      body: 'Arriving at `nxt` costs the current state plus `dist[u][nxt]`; line 13 keeps it if it beats what `dp[nmask][nxt]` already holds.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [13] },
      metrics: startMetrics,
      changes: ['dp[nmask][nxt] = min(dp[nmask][nxt], dp[mask][u] + dist[u][nxt])'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Close',
      title: 'Lines 14–15: visit everything, then fly home',
      body: '`full` has every bit set. Line 15 adds the trip back to city 0 from each possible last city and returns the cheapest.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [14, 15] },
      metrics: startMetrics,
      changes: ['full = (1 << n) - 1', 'return min(dp[full][u] + dist[u][0] for u in range(n))'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: '2ⁿ sets × n cities × n moves: O(n² · 2ⁿ)',
      body: 'Each of the `2ⁿ · n` states tries up to `n` next cities, so it’s **`O(n² · 2ⁿ)` time** and **`O(n · 2ⁿ)` space**. Still exponential, but far below `(n − 1)!`.\n\nSwitch to **🧪 Try your own** to plan your own trips (2 to 4 cities).',
      code: { view: 'final', lines: [6, 7, 10, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ dist: DIST, phase: 'done', dp: FINAL_DP, closed: [0, 1, 2], answer: 17, note: 'n = 16: 16² · 2¹⁶ ≈ 1.7·10⁷ steps\nevery order: 15! ≈ 1.3·10¹²', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Merge',
      title: 'Why one value per (set, city) is enough',
      body: 'Two paths that visited the same set and stand on the same city have exactly the same choices left, so the dearer one can never be part of a cheaper tour. Line 13 keeps only the cheaper one. That is the key decision.\n\nIt collapses all the orders of a set into one cell, which is what turns `(n − 1)!` into `n² · 2ⁿ`.',
      code: { view: 'final', lines: [13] },
      values: { 13: 'one cell per (mask, nxt): keep the min' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ dist: DIST, phase: 'relax', dp: FINAL_DP, mask: 3, u: 1, nxt: 2, better: true, note: 'with 4 cities: 0→1→2→3 and 0→2→1→3\nboth land in ({0, 1, 2, 3}, 3)\nkeep the cheaper, forget the order' }) },
    },
  ],
  trace: {
    title: 'Run tsp_bitmask on your own distances',
    inputs: [{ name: 'dist', label: 'dist, row by row (4, 9 or 16 numbers)', kind: 'numbers', default: '0, 5, 9, 4, 0, 3, 8, 2, 0' }],
    presets: [
      { label: 'Lesson example', values: { dist: '0, 2, 9, 1, 0, 6, 15, 7, 0' } },
      { label: 'Same both ways', values: { dist: '0, 1, 4, 1, 0, 2, 4, 2, 0' } },
      { label: 'Two cities', values: { dist: '0, 3, 5, 0' } },
      { label: 'Four cities', values: { dist: '0, 1, 9, 4, 1, 0, 2, 8, 9, 2, 0, 3, 4, 8, 3, 0' } },
    ],
    maxItems: 16,
    run: (values) => {
      const flat = values['dist'];
      if (!Array.isArray(flat)) throw new Error('Enter the distances row by row.');
      const n = Math.round(Math.sqrt(flat.length));
      if (n * n !== flat.length || n < 2 || n > 4) throw new Error('Enter 4, 9 or 16 numbers: a 2×2, 3×3 or 4×4 table.');
      if (flat.some((d) => d < 0 || d > 99)) throw new Error('Distances go from 0 to 99.');
      const dist = Array.from({ length: n }, (_, r) => flat.slice(r * n, r * n + n));
      if (dist.some((row, r) => row[r] !== 0)) throw new Error('A city is 0 away from itself: the diagonal must be 0.');
      return traceTsp(dist);
    },
  },
});
