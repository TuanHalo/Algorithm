import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const ROW_VALUE = 0;
const ROW_WEIGHT = 130;
const ROW_RATIO = 260;
const NOTE_Y = 370;

/** One item with a stable key, so sorting slides all three rows together. */
interface Item {
  readonly value: number;
  readonly weight: number;
  readonly id: number;
}

/** What the loop is doing: its turn (probe), the update, the break, or nothing (the end). */
type Phase = 'probe' | 'add' | 'break' | 'done';

interface KnapState {
  /** Items as drawn: input order before line 3 sorts them, best ratio first after. */
  readonly items: readonly Item[];
  readonly remaining: number;
  readonly total: number;
  /** Position of the current item. */
  readonly at?: number;
  readonly phase?: Phase;
  readonly take?: number;
  /** Weight taken from each item before `at` (and from `at` once added). */
  readonly taken: readonly number[];
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code has the running totals. */
  readonly bare?: boolean;
  /** Draw the ratio row (needs line 3). */
  readonly ratios?: boolean;
  readonly rowId?: string;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;
/** Python prints a float total like `240.0`; fractions are shown to two decimals. */
const money = (x: number): string => (Number.isInteger(x) ? `${x}.0` : String(round2(x)));
const ratioOf = (it: Item): number => round2(it.value / it.weight);

/** Scene for one moment: value, weight and ratio rows for every item, tones for what was taken, and the variables. */
function scene(s: KnapState): Entity[] {
  const prefix = s.rowId ?? 'ranked';
  const tones: Record<number, Tone> = {};
  s.items.forEach((it, k) => {
    const took = s.taken[k] ?? 0;
    if (s.phase === 'done' || s.phase === 'break') {
      if (s.phase === 'break' && s.at !== undefined && k >= s.at) tones[k] = 'muted';
      else tones[k] = took === 0 ? 'muted' : took === it.weight ? 'done' : 'compare';
    } else if (s.at !== undefined && k < s.at) {
      tones[k] = took === 0 ? 'muted' : took === it.weight ? 'done' : 'compare';
    }
  });
  if (s.at !== undefined && (s.phase === 'probe' || s.phase === 'add')) tones[s.at] = 'active';

  const keys = s.items.map((it) => it.id);
  const entities: Entity[] = [
    arr(`${prefix}-value`, 0, ROW_VALUE, s.items.map((it) => it.value), { label: 'value', tones, codeVar: 'ranked', itemKeys: keys, showIndex: false }),
    arr(`${prefix}-weight`, 0, ROW_WEIGHT, s.items.map((it) => it.weight), { label: 'weight', tones, itemKeys: keys, showIndex: false }),
  ];
  if (s.ratios) {
    entities.push(arr(`${prefix}-ratio`, 0, ROW_RATIO, s.items.map(ratioOf), { label: 'value / weight', tones, itemKeys: keys, showIndex: false }));
  }

  const cur = s.at === undefined ? undefined : s.items[s.at];
  const showCur = cur !== undefined && (s.phase === 'probe' || s.phase === 'add');
  const rows: VarRow[] = s.bare
    ? [{ name: 'capacity', value: s.remaining }]
    : [
        { name: 'value', value: showCur ? cur.value : '—', tone: showCur ? 'default' : 'muted' },
        { name: 'weight', value: showCur ? cur.weight : '—', tone: showCur ? 'default' : 'muted' },
        { name: 'take', value: s.take ?? '—', tone: s.take === undefined ? 'muted' : 'default' },
        { name: 'remaining', value: s.remaining, tone: s.remaining === 0 ? 'found' : 'default' },
        { name: 'total_value', value: money(s.total) },
      ];
  entities.push(vars('vals', tableBesideArray(s.items.length, rows.length), 0, rows, { label: 'variables', width: 190 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs fractional knapsack on any input and records one step per decision (chapter "run", final code). */
function traceKnapsack(values: readonly number[], weights: readonly number[], capacity: number): Step[] {
  const items: Item[] = values.map((value, id) => ({ value, weight: weights[id] ?? 1, id }));
  const ranked = [...items].sort((a, b) => b.value / b.weight - a.value / a.weight);
  const steps: Step[] = [];
  const taken: number[] = [];
  let remaining = capacity;
  let total = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ remaining, total: money(total), result });

  const sortedAlready = ranked.every((it, k) => it.id === items[k]?.id);
  steps.push({
    chapter: 'run',
    short: 'Rank',
    title: 'Sort by value per weight, best first',
    body: `Line 3 divides each item’s value by its weight and sorts from the highest ratio to the lowest: ${ranked.map((it) => `${ratioOf(it)}`).join(', ')}.${sortedAlready ? ' They were already in that order.' : ' The items slide into that order.'}`,
    code: { view: 'final', lines: [3] },
    values: { 3: `ranked by value / weight: ${ranked.map(ratioOf).join(', ')}` },
    metrics: metrics(),
    scene: { entities: scene({ items: ranked, remaining, total, taken, ratios: true }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Empty knapsack with room for ${capacity}`,
    body: `Line 4 starts the total at \`0.0\`. Line 5 sets \`remaining = ${capacity}\`: all the capacity is still free.`,
    code: { view: 'final', lines: [4, 5] },
    values: { 4: 'total_value = 0.0', 5: `remaining = ${capacity}` },
    metrics: metrics(),
    scene: { entities: scene({ items: ranked, remaining, total, taken, ratios: true }) },
  });

  for (let at = 0; at < ranked.length; at += 1) {
    const it = ranked[at];
    if (it === undefined) break;
    const ctx = { items: ranked, at, ratios: true } as const;
    const intro = at === 0 ? 'Line 7 takes the first item' : 'Line 7 takes the next item';
    if (remaining === 0) {
      steps.push({
        chapter: 'run',
        short: 'Full: break',
        title: 'No room left: stop',
        body: `${intro}: value ${it.value}, weight ${it.weight}. Line 8: \`remaining == 0\` is true, so line 9 breaks out of the loop.\n\nThe knapsack is full, so the ${ranked.length - at} item${ranked.length - at === 1 ? '' : 's'} left, the worst by ratio, stay behind.`,
        code: { view: 'final', lines: [7, 8, 9] },
        values: { 7: `value, weight = ${it.value}, ${it.weight}`, 8: '0 == 0 → True', 9: 'break' },
        metrics: metrics(),
        scene: { entities: scene({ ...ctx, remaining, total, taken, phase: 'break' }) },
      });
      break;
    }
    const take = Math.min(it.weight, remaining);
    const whole = take === it.weight;
    steps.push({
      chapter: 'run',
      short: whole ? `Take all ${it.weight}` : `Take ${take} of ${it.weight}`,
      title: whole ? `${it.weight} fits: take the whole item` : `Only ${take} of ${it.weight} fits: take a fraction`,
      body: `${intro}: value ${it.value}, weight ${it.weight}. Line 8: \`remaining == 0\` is false, so there is room.\n\nLine 10: \`min(${it.weight}, ${remaining}) = ${take}\`. ${whole ? 'The whole item fits.' : `Only ${take} of the ${it.weight} fit, so we will scoop **${take}/${it.weight}** of it.`}`,
      code: { view: 'final', lines: [7, 8, 10] },
      values: { 7: `value, weight = ${it.value}, ${it.weight}`, 8: `${remaining} == 0 → False`, 10: `take = min(${it.weight}, ${remaining}) = ${take}` },
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, remaining, total, taken, phase: 'probe', take }) },
    });
    const gain = it.value * (take / it.weight);
    const before = remaining;
    total += gain;
    remaining -= take;
    taken[at] = take;
    steps.push({
      chapter: 'run',
      short: `+${money(gain)}`,
      title: `Add ${money(gain)} to the total, ${remaining} left`,
      body: `Line 11: the value earned is \`${it.value} * (${take} / ${it.weight}) = ${money(gain)}\`, so \`total_value = ${money(total)}\`. Line 12: \`remaining = ${before} - ${take} = ${remaining}\`.`,
      code: { view: 'final', lines: [11, 12] },
      values: { 11: `total_value += ${it.value} * (${take} / ${it.weight}) → ${money(total)}`, 12: `remaining = ${before} - ${take} = ${remaining}` },
      changes: [`total_value = ${money(total)}`, `remaining = ${remaining}`],
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, remaining, total, taken, phase: 'add', take }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${money(total)}`,
    body: `Line 14 returns **${money(total)}**, the most value ${capacity} of capacity can hold.`,
    code: { view: 'final', lines: [14] },
    values: { 14: `return ${money(total)}` },
    metrics: metrics(money(total)),
    scene: { entities: scene({ items: ranked, remaining, total, taken, phase: 'done', ratios: true }) },
  });
  return steps;
}

const VALUES = [120, 60, 100, 30] as const;
const WEIGHTS = [30, 10, 20, 15] as const;
const CAPACITY = 50;
const STORY_ITEMS: readonly Item[] = VALUES.map((value, id) => ({ value, weight: WEIGHTS[id] ?? 1, id }));
const RUN = traceKnapsack(VALUES, WEIGHTS, CAPACITY);
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { remaining: CAPACITY, total: '0.0', result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const byValue: readonly Item[] = [...STORY_ITEMS].sort((a, b) => b.value - a.value);
const byRatio: readonly Item[] = [...STORY_ITEMS].sort((a, b) => b.value / b.weight - a.value / a.weight);

export default defineWalkthrough({
  id: 'learn/greedy/fractional-knapsack',
  title: 'Fractional Knapsack, best value per kilogram first',
  summary: 'From the spice market to the code: fill a bag by value per weight, and scoop a fraction of the last item to use every gram of room.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def fractional_knapsack(items: list[tuple[int, int]], capacity: int) -> float:
    # Highest value per unit of weight first
    ranked = sorted(items, key=lambda item: item[0] / item[1], reverse=True)
    total_value = 0.0
    remaining = capacity

    for value, weight in ranked:
        if remaining == 0:
            break
        take = min(weight, remaining)
        total_value += value * (take / weight)
        remaining -= take

    return total_value`,
  },
  metrics: [
    { key: 'remaining', label: 'Room left' },
    { key: 'total', label: 'Value so far' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'item being handled' },
    { tone: 'done', label: 'taken whole' },
    { tone: 'compare', label: 'taken in part' },
    { tone: 'muted', label: 'left behind' },
    { tone: 'found', label: 'no room left' },
  ],
  goals: [
    { text: 'See why value alone picks the wrong items', step: 2 },
    { text: 'Build the loop one idea at a time', step: 4 },
    { text: 'Follow every take, fraction and stop', step: 9 },
    { text: 'Know why best ratio first is safe', step: 20 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Fill a 50 kg bag with the most valuable spices',
      body: 'At a spice market you can scoop any fraction of a sack. Each sack has a **value** and a **weight**, and your bag holds 50 kg.\n\nLine 1 takes the `items` as (value, weight) pairs plus the `capacity`, and returns the biggest total value that fits. Here there are four sacks, drawn as a value row over a weight row.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ items: STORY_ITEMS, remaining: CAPACITY, total: 0, taken: [], bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Value first?',
      title: 'Taking the biggest price first is not enough',
      body: 'Sort by value alone: the 120 sack (30 kg) goes in, then the 100 sack (20 kg). The bag is full at **220**.\n\nBut the 120 sack is heavy: it uses 30 kg to earn 120. Light sacks pack more value into every kilogram.',
      code: { view: 'signature' },
      metrics: { remaining: 0, total: '220.0', result: '—' },
      scene: {
        entities: scene({
          items: byValue,
          remaining: 0,
          total: 220,
          taken: [30, 20, 0, 0],
          phase: 'done',
          bare: true,
          note: 'by value: 120 + 100 = 220\nthere is a better way…',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Per kilogram',
      title: 'Rank by value per kilogram instead',
      body: 'Divide value by weight: the 60 sack earns **6 per kg**, the 100 sack 5, the 120 sack 4 and the 30 sack only 2.\n\nIf a kilogram of a worse sack were in the bag while a better kilogram stayed out, swapping them would earn more. So the best bag is always filled in ratio order, and the sacks can be split, so no kilogram of room is wasted.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          items: byRatio,
          remaining: CAPACITY,
          total: 0,
          taken: [],
          ratios: true,
          bare: true,
          note: 'swap a 4/kg kilogram for a 6/kg one:\nthe bag gains 2, never loses',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Rank',
      title: 'Lines 2–3: sort the items by value per weight',
      body: 'The `key` divides `item[0]` (value) by `item[1]` (weight), and `reverse=True` puts the highest ratio first. This sort is the whole greedy rule.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: startMetrics,
      changes: ['ranked = items sorted by value / weight, high to low'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Totals',
      title: 'Lines 4–5: the value so far and the room left',
      body: '`total_value` starts at 0.0 and grows with every item. `remaining` starts at `capacity` and shrinks as the bag fills.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['total_value = 0.0', 'remaining = capacity'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Stop when full',
      title: 'Lines 7–9: walk the ranked items, and stop when the bag is full',
      body: 'The loop unpacks each (value, weight) pair in ranked order. As soon as `remaining == 0`, nothing more fits, so `break` skips the rest.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9], lines: [7, 8, 9] },
      metrics: { remaining: 0, total: '240.0', result: '—' },
      changes: ['for value, weight in ranked', 'if remaining == 0: break'],
      scene: at(8),
    },
    {
      chapter: 'build',
      short: 'Take a part',
      title: 'Lines 10–12: take what fits, add its value, use up the room',
      body: '`min(weight, remaining)` is the whole item when it fits, or just the part that does. Line 11 adds the matching share of the value (`take / weight` of it), and line 12 shrinks `remaining`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: { remaining: 0, total: '240.0', result: '—' },
      changes: ['take = min(weight, remaining)', 'total_value += value * (take / weight)', 'remaining -= take'],
      scene: at(7),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 14: return the total',
      body: 'When the loop ends, `total_value` holds the best value the bag can carry.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [14] },
      metrics: FINAL_METRICS,
      changes: ['return total_value'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One sort and one pass: O(n log n)',
      body: 'Sorting `n` items by ratio costs `O(n log n)`. The loop then visits each item at most once, so it adds only `O(n)`. The sorted copy `ranked` needs `O(n)` space.\n\nSwitch to **🧪 Try your own** to pack your own sacks.',
      code: { view: 'final', lines: [3, 7] },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          items: byRatio,
          remaining: 0,
          total: 240,
          taken: [10, 20, 20, 0],
          phase: 'done',
          ratios: true,
          note: 'n = 4 items → one sort, ≤ 4 turns\n10 + 20 + 20 of 30 → 240',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Why a part',
      title: 'Line 10 may take a fraction, and that is why greedy is exact',
      body: 'The 120 sack has a ratio of 4 and 20 kg of room is left, so line 10 takes `min(30, 20) = 20` and line 11 earns `120 * 20/30 = 80`.\n\nThat is the key decision: because a sack can be **split**, the best ratio always fills the room completely and greedy is optimal. If sacks were all-or-nothing (the 0/1 knapsack), a leftover gap could make it wrong, and you would need dynamic programming.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: 'take = min(30, 20) = 20', 11: 'total_value += 120 * (20 / 30) → 240.0' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          items: byRatio,
          remaining: 0,
          total: 240,
          taken: [10, 20, 20, 0],
          phase: 'done',
          ratios: true,
          note: '20 of the 30 kg sack\n= 2/3 of its value 120 = 80',
          noteTone: 'found',
        }),
      },
    },
  ],
  trace: {
    title: 'Run fractional knapsack on your own sacks',
    inputs: [
      { name: 'values', label: 'Values', kind: 'numbers', default: '120, 60, 100, 30' },
      { name: 'weights', label: 'Weights (same count, each 1 or more)', kind: 'numbers', default: '30, 10, 20, 15' },
      { name: 'capacity', label: 'Capacity', kind: 'number', default: '50' },
    ],
    presets: [
      { label: 'Spice market', values: { values: '120, 60, 100, 30', weights: '30, 10, 20, 15', capacity: '50' } },
      { label: 'Everything fits', values: { values: '10, 20', weights: '5, 5', capacity: '100' } },
      { label: 'Zero capacity', values: { values: '10, 20', weights: '5, 5', capacity: '0' } },
      { label: 'Equal ratios', values: { values: '10, 20, 30', weights: '1, 2, 3', capacity: '4' } },
      { label: 'Exact fit', values: { values: '10, 20', weights: '5, 5', capacity: '10' } },
    ],
    maxItems: 6,
    run: (values) => {
      const vs = values['values'];
      const ws = values['weights'];
      const capacity = values['capacity'];
      if (!Array.isArray(vs) || !Array.isArray(ws) || typeof capacity !== 'number' || vs.length === 0) throw new Error('Enter values, weights and a capacity.');
      if (vs.length !== ws.length) throw new Error('Give one weight for every value.');
      if (ws.some((w) => w < 1)) throw new Error('Weights must be 1 or more.');
      if (vs.some((v) => v < 0)) throw new Error('Values can’t be negative.');
      if (capacity < 0) throw new Error('Capacity can’t be negative.');
      return traceKnapsack(vs, ws, capacity);
    },
  },
});
