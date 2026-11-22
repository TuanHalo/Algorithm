import { arr, defineWalkthrough, note, ptr, range, span, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;
/** The answer space is drawn one cell per capacity, so it must stay short. */
const MAX_CANDIDATES = 12;

interface ShipResult {
  readonly ok: boolean;
  /** Packages per day, in order, up to the day that broke the limit. */
  readonly loads: readonly (readonly number[])[];
}

/** Mirrors `can_ship`: greedy loading in order, one day at a time. */
function canShip(weights: readonly number[], days: number, capacity: number): ShipResult {
  const loads: number[][] = [[]];
  let current = 0;
  for (const w of weights) {
    if (current + w > capacity) {
      loads.push([w]);
      current = w;
      if (loads.length > days) return { ok: false, loads };
    } else {
      current += w;
      loads.at(-1)?.push(w);
    }
  }
  return { ok: true, loads };
}

const describe = (capacity: number, r: ShipResult, days: number): string =>
  `capacity ${capacity}:\n${r.loads.map((l) => `[${l.join(', ')}]`).join(' ')}\n${r.loads.length} days ${r.ok ? `≤ ${days} ✓` : `> ${days} ✗`}`;

interface AnswerState {
  readonly weights: readonly number[];
  readonly days: number;
  /** Smallest and largest candidate capacity (max and sum of the weights). */
  readonly min: number;
  readonly max: number;
  readonly low?: number;
  readonly high?: number;
  readonly mid?: number;
  readonly ans?: number;
  /** Capacities already tested, and whether they worked. */
  readonly tested?: Readonly<Record<number, boolean>>;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces the answer space, show only the input. */
  readonly bare?: boolean;
}

/** Scene: the candidate capacities as an array (low/high/mid on it), plus the inputs and loop variables. */
function scene(s: AnswerState): Entity[] {
  const candidates = span(s.min, s.max);
  const index = (capacity: number): number => capacity - s.min;
  const entities: Entity[] = [];
  if (!s.bare) {
    const cellTones: Record<number, Tone> = {};
    candidates.forEach((c, i) => {
      if (s.low !== undefined && s.high !== undefined && (c < s.low || c > s.high)) cellTones[i] = 'muted';
      const t = s.tested?.[c];
      if (t !== undefined) cellTones[i] = t ? 'found' : 'miss';
    });
    if (s.mid !== undefined) cellTones[index(s.mid)] = s.tested?.[s.mid] === undefined ? 'compare' : s.tested[s.mid] ? 'found' : 'miss';
    entities.push(arr('space', 0, 0, candidates, { label: 'candidate capacities', tones: cellTones }));
    if (s.low !== undefined && s.high !== undefined && s.low <= s.high) entities.push(range('window', 'space', index(s.low), index(s.high), 'compare'));
    if (s.low !== undefined && s.low <= s.max) entities.push(ptr('low', 'space', index(s.low), 'low', { tone: 'done', codeVar: 'low' }));
    if (s.high !== undefined && s.high >= s.min) entities.push(ptr('high', 'space', index(s.high), 'high', { tone: 'done', codeVar: 'high' }));
    if (s.mid !== undefined) entities.push(ptr('mid', 'space', index(s.mid), 'mid', { side: 'top', tone: 'active', codeVar: 'mid' }));
  }
  const dash = (v: number | undefined): number | string => v ?? '—';
  const tone = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'weights', value: `[${s.weights.join(', ')}]` },
        { name: 'days', value: s.days },
        ...(s.bare
          ? []
          : [
              { name: 'low', value: dash(s.low), tone: tone(s.low) },
              { name: 'high', value: dash(s.high), tone: tone(s.high) },
              { name: 'mid', value: dash(s.mid), tone: tone(s.mid) },
              { name: 'ans', value: dash(s.ans), tone: s.ans === undefined ? 'muted' : ('found' as Tone) },
            ]),
      ],
      { label: 'variables', width: 200 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X + 20, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the search on any input and records one step per tested capacity (chapter "run", final code). */
function traceShip(weights: readonly number[], days: number): Step[] {
  const min = Math.max(...weights);
  const max = weights.reduce((a, b) => a + b, 0);
  const steps: Step[] = [];
  let low = min;
  let high = max;
  let ans = max;
  let checks = 0;
  const tested: Record<number, boolean> = {};
  const base = { weights, days, min, max };
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ checks, left: Math.max(0, high - low + 1), result });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Capacities ${min}…${max} are the candidates`,
    body: `Line 4: the heaviest package needs \`low = ${min}\`. Line 6: one day for everything needs \`high = ${max}\`, and line 7 starts \`ans\` there.`,
    code: { view: 'final', lines: [4, 6, 7] },
    values: { 4: `low = ${min}`, 6: `high = ${max}`, 7: `ans = ${max}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, low, high, ans }) },
  });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const result = canShip(weights, days, mid);
    // 1. Pick the middle capacity.
    steps.push({
      chapter: 'run',
      short: `Try ${mid}`,
      title: `Pick the middle capacity: ${mid}`,
      body: `Line 9: \`${low} <= ${high}\`, so capacities ${low}…${high} are still possible. Line 10: \`mid = (${low} + ${high}) // 2 = ${mid}\`.`,
      code: { view: 'final', lines: [9, 10] },
      values: { 9: `${low} <= ${high} → True`, 10: `mid = (${low} + ${high}) // 2 = ${mid}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, low, high, mid, ans, tested: { ...tested } }) },
    });
    // 2. Run the check.
    checks += 1;
    tested[mid] = result.ok;
    const used = result.loads.length;
    steps.push({
      chapter: 'run',
      short: `Ship at ${mid}`,
      title: `can_ship(…, ${mid}): ${result.ok ? `${used} day${used === 1 ? '' : 's'}, so True` : `needs more than ${days} days, so False`}`,
      body: result.ok
        ? `Line 11 calls \`can_ship\`, which loads the packages in order: ${result.loads.map((l) => `[${l.join(', ')}]`).join(' ')}. That is ${used} day${used === 1 ? '' : 's'}, within ${days}, so line 34 returns \`True\`.`
        : `Line 11 calls \`can_ship\`, which loads the packages in order: ${result.loads.map((l) => `[${l.join(', ')}]`).join(' ')}. Day ${used} goes past the ${days} allowed (line 29), so line 30 returns \`False\`.`,
      code: { view: 'final', lines: result.ok ? [11, 25, 34] : [11, 29, 30] },
      values: {
        11: `can_ship(weights, ${days}, ${mid})`,
        ...(result.ok ? { 34: 'return True' } : { 27: `days_needed = ${used}`, 29: `${used} > ${days} → True`, 30: 'return False' }),
      },
      metrics: metrics(),
      scene: { entities: scene({ ...base, low, high, mid, ans, tested: { ...tested }, note: describe(mid, result, days), noteTone: result.ok ? 'found' : 'miss' }) },
    });
    // 3. Act on the answer.
    if (result.ok) {
      ans = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
    steps.push({
      chapter: 'run',
      short: result.ok ? `ans = ${mid}` : `low → ${low}`,
      title: result.ok ? `${mid} works: remember it, try smaller` : `${mid} is too small: go higher`,
      body: result.ok
        ? `Line 12 records \`ans = ${mid}\`. A smaller capacity might work too, so line 13 moves \`high = ${high}\`${low <= high ? `: candidates ${low}…${high}` : ', and no candidates are left'}.`
        : `Every capacity below ${mid} fails too. Line 15 moves \`low = ${low}\`${low <= high ? `: candidates ${low}…${high}` : ', and no candidates are left'}.`,
      code: { view: 'final', lines: result.ok ? [12, 13] : [14, 15] },
      values: result.ok ? { 12: `ans = ${mid}`, 13: `high = ${mid} - 1 = ${high}` } : { 15: `low = ${mid} + 1 = ${low}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, low, high, ans, tested: { ...tested } }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: `Return ${ans}`,
    title: `low (${low}) > high (${high}): the smallest capacity is ${ans}`,
    body: `Line 9’s condition fails, so line 17 returns \`ans\` = **${ans}** after ${checks} check${checks === 1 ? '' : 's'}, out of ${max - min + 1} possible capacities.`,
    code: { view: 'final', lines: [9, 17] },
    values: { 9: `${low} <= ${high} → False`, 17: `return ${ans}` },
    metrics: metrics(ans),
    scene: { entities: scene({ ...base, low, high, ans, tested: { ...tested } }) },
  });
  return steps;
}

const WEIGHTS = [4, 2, 3, 1] as const;
const DAYS = 2;
const base = { weights: WEIGHTS, days: DAYS, min: 4, max: 10 } as const;
const allTested = { 4: false, 5: false, 6: true, 7: true, 8: true, 9: true, 10: true } as const;

export default defineWalkthrough({
  id: 'learn/searching/binary-search-on-answer',
  title: 'Binary Search on the Answer',
  summary: 'From the idea to the code: binary-search the possible answers instead of an array, using a yes/no check that flips only once.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def ship_within_days(weights: list[int], days: int) -> int:
    """Finds the minimum ship capacity to deliver all packages within days."""
    # Minimum possible answer is the heaviest single package
    low = max(weights)
    # Maximum possible answer is shipping all packages on a single day
    high = sum(weights)
    ans = high

    while low <= high:
        mid = (low + high) // 2
        if can_ship(weights, days, mid):
            ans = mid        # mid is feasible, record and try smaller
            high = mid - 1
        else:
            low = mid + 1    # mid is too small, need more capacity

    return ans


def can_ship(weights: list[int], days: int, capacity: int) -> bool:
    """Predicate: Returns True if all weights can be shipped within 'days' at 'capacity'."""
    days_needed = 1
    current_load = 0

    for w in weights:
        if current_load + w > capacity:
            days_needed += 1
            current_load = w
            if days_needed > days:
                return False
        else:
            current_load += w

    return True`,
  },
  metrics: [
    { key: 'checks', label: 'can_ship calls' },
    { key: 'left', label: 'Capacities left' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'range / testing now' },
    { tone: 'miss', label: 'too small' },
    { tone: 'found', label: 'works' },
    { tone: 'muted', label: 'ruled out' },
  ],
  goals: [
    { text: 'Spot a yes/no check that flips only once', step: 2 },
    { text: 'Bound the answer between max and sum', step: 4 },
    { text: 'Write the greedy can_ship check', step: 8 },
    { text: 'See why a working capacity means “go lower”', step: 24 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Ship 4 packages within 2 days',
      body: 'A ship carries packages in order, one day at a time, and a day’s load can’t exceed its **capacity**.\n\nLine 1 gets `weights = [4, 2, 3, 1]` and `days = 2`, and returns the **smallest** capacity that ships everything in time.',
      code: { view: 'signature', lines: [1] },
      metrics: { checks: 0, left: 7, result: '—' },
      scene: { entities: scene({ ...base, bare: true, note: 'order is fixed: 4, 2, 3, 1\nat most 2 days\nsmallest capacity?' }) },
    },
    {
      chapter: 'idea',
      short: 'Search answers',
      title: 'Binary-search the answers, not an array',
      body: 'Checking one capacity is easy: load greedily and count the days. And the answer is **monotonic**: if 6 works, 7, 8… work too, and if 5 fails, everything smaller fails.\n\nSo the candidates 4…10 behave like a sorted array of ✗ then ✓, and binary search can find the first ✓.',
      code: { view: 'signature' },
      metrics: { checks: 0, left: 7, result: '—' },
      scene: { entities: scene({ ...base, tested: allTested, note: '4 ✗  5 ✗  6 ✓  7 ✓ … 10 ✓\nfind the first ✓' }) },
    },
    {
      chapter: 'build',
      short: 'Lowest',
      title: 'Lines 2–4: the smallest possible answer',
      body: 'Every package must fit on the ship by itself, so the capacity is at least the heaviest one. Line 4 starts at `low = max(weights) = 4`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: { checks: 0, left: 7, result: '—' },
      changes: ['low = max(weights)'],
      scene: { entities: scene({ ...base, low: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Highest',
      title: 'Lines 5–7: the largest answer we need',
      body: 'A ship that holds everything finishes in one day, so line 6 sets `high = sum(weights) = 10`. Line 7 starts `ans` there, a capacity we know works.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [6, 7] },
      metrics: { checks: 0, left: 7, result: '—' },
      changes: ['high = sum(weights)', 'ans = high'],
      scene: { entities: scene({ ...base, low: 4, high: 10, ans: 10 }) },
    },
    {
      chapter: 'build',
      short: 'Test middle',
      title: 'Lines 9–11: test the middle capacity',
      body: 'Line 9 loops while candidates are left. Line 10 picks the middle, `(4 + 10) // 2 = 7`, and line 11 asks `can_ship`, written below, whether 7 is enough.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11], lines: [9, 10, 11] },
      metrics: { checks: 1, left: 7, result: '—' },
      changes: ['while low <= high', 'mid = (low + high) // 2', 'if can_ship(weights, days, mid)'],
      scene: { entities: scene({ ...base, low: 4, high: 10, mid: 7, ans: 10 }) },
    },
    {
      chapter: 'build',
      short: 'Works',
      title: 'Lines 12–14: it works, so try smaller',
      body: 'If 7 works, it’s a candidate: line 12 records `ans = 7`. A smaller capacity might work too, so line 13 searches lower with `high = mid − 1`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14], lines: [12, 13] },
      metrics: { checks: 1, left: 3, result: '—' },
      changes: ['ans = mid', 'high = mid - 1'],
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 7, ans: 7, tested: { 7: true } }) },
    },
    {
      chapter: 'build',
      short: 'Too small',
      title: 'Lines 15–20: too small, so go higher',
      body: 'If the middle fails, every smaller capacity fails too, so line 15 searches higher. When no candidates are left, line 17 returns `ans`.\n\nLine 20 starts the checker, `can_ship`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 20], lines: [15, 17, 20] },
      metrics: { checks: 1, left: 3, result: '—' },
      changes: ['else: low = mid + 1', 'return ans', 'def can_ship(…)'],
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 7, ans: 7, tested: { 7: true } }) },
    },
    {
      chapter: 'build',
      short: 'Day 1',
      title: 'Lines 21–23: start on day 1, empty',
      body: '`can_ship` simulates the voyage for one capacity. Line 22 starts on day 1 and line 23 with an empty ship.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 20, 21, 22, 23], lines: [22, 23] },
      metrics: { checks: 1, left: 3, result: '—' },
      changes: ['days_needed = 1', 'current_load = 0'],
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 7, ans: 7, tested: { 7: true }, note: 'capacity 7:\nday 1, load 0' }) },
    },
    {
      chapter: 'build',
      short: 'New day',
      title: 'Lines 25–27: overflow starts a new day',
      body: 'Line 25 loads the packages in order. If the next one would overflow today’s ship (line 26), line 27 starts a new day.',
      code: {
        view: 'reveal',
        reveal: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 20, 21, 22, 23, 25, 26, 27],
        lines: [25, 26, 27],
      },
      metrics: { checks: 1, left: 3, result: '—' },
      changes: ['for w in weights', 'if current_load + w > capacity', 'days_needed += 1'],
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 7, ans: 7, tested: { 7: true }, note: 'capacity 7:\n[4, 2] + 3 = 9 > 7\n→ day 2' }) },
    },
    {
      chapter: 'build',
      short: 'Too many',
      title: 'Lines 28–30: out of days means no',
      body: 'That package becomes the new day’s load (line 28). If we’ve now used more days than allowed, line 30 answers `False` straight away.',
      code: {
        view: 'reveal',
        reveal: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30],
        lines: [28, 29, 30],
      },
      metrics: { checks: 1, left: 3, result: '—' },
      changes: ['current_load = w', 'if days_needed > days: return False'],
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 7, ans: 7, tested: { 7: true } }) },
    },
    {
      chapter: 'build',
      short: 'Fits today',
      title: 'Lines 31–34: it fits today',
      body: 'Otherwise the package fits on today’s ship (line 32). If every package is loaded in time, line 34 returns `True`.\n\nNow let’s run it.',
      code: { view: 'final', lines: [31, 32, 34] },
      metrics: { checks: 1, left: 3, result: '—' },
      changes: ['else: current_load += w', 'return True'],
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 7, ans: 7, tested: { 7: true }, note: 'capacity 7:\n[4, 2] [3, 1]\n2 days ≤ 2 ✓', noteTone: 'found' }) },
    },
    {
      chapter: 'run',
      short: 'Start',
      title: 'Capacities 4…10 are the candidates',
      body: 'Line 4: `low = max(weights) = 4`. Line 6: `high = sum(weights) = 10`, and line 7 starts `ans = 10`, a capacity we know works.',
      code: { view: 'final', lines: [4, 6, 7] },
      values: { 4: 'low = max(weights) = 4', 6: 'high = sum(weights) = 10', 7: 'ans = 10' },
      metrics: { checks: 0, left: 7, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 10, ans: 10 }) },
    },
    {
      chapter: 'run',
      short: 'Try 7',
      title: 'Pick the middle capacity: 7',
      body: 'Line 9: `4 <= 10`, so capacities 4…10 are still possible. Line 10 picks the middle one: `(4 + 10) // 2 = 7`.',
      code: { view: 'final', lines: [9, 10] },
      values: { 9: '4 <= 10 → True', 10: 'mid = (4 + 10) // 2 = 7' },
      metrics: { checks: 0, left: 7, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 10, mid: 7, ans: 10 }) },
    },
    {
      chapter: 'run',
      short: 'Ship at 7',
      title: 'can_ship(…, 7): 2 days, so True',
      body: 'Line 11 calls `can_ship` with capacity 7. Day 1 takes 4 and 2 (load 6); adding 3 would make 9 > 7 (line 26), so line 27 starts day 2 with 3, and 1 fits (load 4).\n\nEverything ships in 2 days, so line 34 returns `True`.',
      code: { view: 'final', lines: [11, 26, 27, 34] },
      values: { 11: 'can_ship(weights, 2, 7)', 26: '6 + 3 = 9 > 7 → True', 27: 'days_needed = 2', 32: 'current_load = 3 + 1 = 4', 34: 'return True' },
      metrics: { checks: 1, left: 7, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 10, mid: 7, ans: 10, tested: { 7: true }, note: 'capacity 7:\n[4, 2] [3, 1]\n2 days ≤ 2 ✓', noteTone: 'found' }) },
    },
    {
      chapter: 'run',
      short: 'ans = 7',
      title: '7 works: remember it, try smaller',
      body: 'Line 12 records `ans = 7`, the best answer so far. A smaller capacity might work too, so line 13 moves `high = 6`: the candidates are now 4…6.',
      code: { view: 'final', lines: [12, 13] },
      values: { 12: 'ans = 7', 13: 'high = 7 - 1 = 6' },
      metrics: { checks: 1, left: 3, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 6, ans: 7, tested: { 7: true } }) },
    },
    {
      chapter: 'run',
      short: 'Try 5',
      title: 'Pick the middle capacity: 5',
      body: 'Line 9: `4 <= 6`, still candidates left. Line 10: `mid = (4 + 6) // 2 = 5`.',
      code: { view: 'final', lines: [9, 10] },
      values: { 9: '4 <= 6 → True', 10: 'mid = (4 + 6) // 2 = 5' },
      metrics: { checks: 1, left: 3, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 5, ans: 7, tested: { 7: true } }) },
    },
    {
      chapter: 'run',
      short: 'Ship at 5',
      title: 'can_ship(…, 5): needs 3 days, so False',
      body: 'Day 1 can only take 4, because 4 + 2 = 6 > 5. Day 2 takes 2 and 3 (load 5), and then 1 doesn’t fit, so line 27 starts day 3.\n\nLine 29: 3 days is more than the 2 allowed, so line 30 returns `False`.',
      code: { view: 'final', lines: [11, 27, 29, 30] },
      values: { 11: 'can_ship(weights, 2, 5)', 26: '5 + 1 = 6 > 5 → True', 27: 'days_needed = 3', 29: '3 > 2 → True', 30: 'return False' },
      metrics: { checks: 2, left: 3, result: '—' },
      scene: { entities: scene({ ...base, low: 4, high: 6, mid: 5, ans: 7, tested: { 7: true, 5: false }, note: 'capacity 5:\n[4] [2, 3] [1]\n3 days > 2 ✗', noteTone: 'miss' }) },
    },
    {
      chapter: 'run',
      short: 'low → 6',
      title: '5 is too small: go higher',
      body: 'If 5 fails, every smaller capacity fails too. Line 15 moves `low = 6`, so the only candidate left is 6.',
      code: { view: 'final', lines: [14, 15] },
      values: { 15: 'low = 5 + 1 = 6' },
      metrics: { checks: 2, left: 1, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 6, ans: 7, tested: { 7: true, 5: false } }) },
    },
    {
      chapter: 'run',
      short: 'Try 6',
      title: 'Pick the middle capacity: 6',
      body: 'Line 9: `6 <= 6`, one candidate left. Line 10: `mid = (6 + 6) // 2 = 6`.',
      code: { view: 'final', lines: [9, 10] },
      values: { 9: '6 <= 6 → True', 10: 'mid = (6 + 6) // 2 = 6' },
      metrics: { checks: 2, left: 1, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 6, mid: 6, ans: 7, tested: { 7: true, 5: false } }) },
    },
    {
      chapter: 'run',
      short: 'Ship at 6',
      title: 'can_ship(…, 6): 2 days, so True',
      body: 'Day 1: 4 + 2 = 6 fits exactly. Adding 3 would make 9 > 6, so day 2 starts with 3, and 1 fits (load 4).\n\nTwo days, so line 34 returns `True`.',
      code: { view: 'final', lines: [11, 26, 27, 34] },
      values: { 11: 'can_ship(weights, 2, 6)', 26: '6 + 3 = 9 > 6 → True', 27: 'days_needed = 2', 32: 'current_load = 3 + 1 = 4', 34: 'return True' },
      metrics: { checks: 3, left: 1, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 6, mid: 6, ans: 7, tested: { 7: true, 5: false, 6: true }, note: 'capacity 6:\n[4, 2] [3, 1]\n2 days ≤ 2 ✓', noteTone: 'found' }) },
    },
    {
      chapter: 'run',
      short: 'ans = 6',
      title: '6 works too: a better answer',
      body: 'Line 12 updates `ans = 6`, smaller than 7. Line 13 moves `high = 5`, so the range 6…5 is empty.',
      code: { view: 'final', lines: [12, 13] },
      values: { 12: 'ans = 6', 13: 'high = 6 - 1 = 5' },
      metrics: { checks: 3, left: 0, result: '—' },
      scene: { entities: scene({ ...base, low: 6, high: 5, ans: 6, tested: { 7: true, 5: false, 6: true } }) },
    },
    {
      chapter: 'run',
      short: 'Return 6',
      title: 'No candidates left: return 6',
      body: 'Line 9: `6 <= 5` is false, so the loop ends. Line 17 returns `ans`: the smallest capacity is **6**.',
      code: { view: 'final', lines: [9, 17] },
      values: { 9: '6 <= 5 → False', 17: 'return 6' },
      metrics: { checks: 3, left: 0, result: 6 },
      scene: { entities: scene({ ...base, low: 6, high: 5, ans: 6, tested: { 7: true, 5: false, 6: true } }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'log(range) checks, each one O(n)',
      body: 'Binary search tests about `log₂(sum − max)` capacities, and each `can_ship` call scans all `n` weights: **`O(n · log(sum − max))` time**, `O(1)` space.\n\nHere that was 3 checks instead of trying all 7 capacities.',
      code: { view: 'final', lines: [9, 25] },
      metrics: { checks: 3, left: 0, result: 6 },
      scene: { entities: scene({ ...base, ans: 6, tested: { 7: true, 5: false, 6: true }, note: 'tested 7 ✓, 5 ✗, 6 ✓\n3 checks, not 7', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Monotonic',
      title: 'Why a working capacity means “search lower”',
      body: 'Lines 12–13 are the key decision: when a capacity **works**, record it and keep searching **lower**. That finds the smallest answer only because every capacity above a working one also works, so the ✓s form one unbroken run.',
      code: { view: 'final', lines: [11, 12, 13] },
      values: { 12: 'remember the ✓', 13: 'then look for a smaller one' },
      metrics: { checks: 3, left: 0, result: 6 },
      scene: { entities: scene({ ...base, ans: 6, tested: allTested, note: '✗ ✗ ✓ ✓ ✓ ✓ ✓\nthe first ✓ is the answer' }) },
    },
  ],
  trace: {
    title: 'Find the smallest capacity for your own packages',
    inputs: [
      { name: 'weights', label: 'Package weights, in order', kind: 'numbers', default: '1, 2, 3, 4, 5' },
      { name: 'days', label: 'Days allowed', kind: 'number', default: '3' },
    ],
    presets: [
      { label: 'Story example', values: { weights: '4, 2, 3, 1', days: '2' } },
      { label: 'One day', values: { weights: '3, 1, 2', days: '1' } },
      { label: 'A day each', values: { weights: '5, 1, 4', days: '3' } },
      { label: 'Three days', values: { weights: '1, 2, 3, 4, 5', days: '3' } },
    ],
    maxItems: 8,
    run: (values) => {
      const weights = values['weights'];
      const days = values['days'];
      if (!Array.isArray(weights) || typeof days !== 'number') throw new Error('Enter the weights and a number of days.');
      if (weights.length === 0 || weights.some((w) => !Number.isInteger(w) || w <= 0)) throw new Error('Weights must be positive whole numbers.');
      if (!Number.isInteger(days) || days < 1) throw new Error('Days must be a whole number of at least 1.');
      const range = weights.reduce((a, b) => a + b, 0) - Math.max(...weights) + 1;
      if (range > MAX_CANDIDATES) throw new Error(`Keep sum(weights) − max(weights) below ${MAX_CANDIDATES} so every capacity fits on screen.`);
      return traceShip(weights, days);
    },
  },
});
