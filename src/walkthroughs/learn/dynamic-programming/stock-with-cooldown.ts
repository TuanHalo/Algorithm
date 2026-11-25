import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, LinkEntity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * `prices` on top, shifted one slot right so day i sits above column i + 1.
 * Below it, one timeline row per state (hold, sold, rest): column 0 is the
 * start, column i + 1 the value after day i. The code keeps only the latest
 * column (three numbers); the rows show how they got there.
 */
const ROW_Y = 120;
const STATES = ['hold', 'sold', 'rest'] as const;
type State = (typeof STATES)[number];

type Phase = 'bare' | 'init' | 'day' | 'hold' | 'sold' | 'rest' | 'done';

interface StockState {
  readonly prices: readonly number[];
  readonly phase: Phase;
  /** Day being handled. */
  readonly day?: number;
  /** Known columns per state: hist[state][col]. */
  readonly hist: Readonly<Record<State, readonly number[]>>;
  /** Which read won in a hold / rest step (true = the first option: keep / wait). */
  readonly keep?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const fmt = (v: number): string => (v === -Infinity ? '−∞' : String(v));
const rowY = (s: State): number => (STATES.indexOf(s) + 1) * ROW_Y;

/** Scene: prices, the three state timelines, the reads of the state being updated, and the variables. */
function scene(s: StockState): Entity[] {
  const { prices, phase, day } = s;
  const cols = prices.length + 1;
  const priceTones: Record<number, Tone> = {};
  prices.forEach((_, i) => {
    if (day !== undefined && i < day) priceTones[i] = 'done';
  });
  if (day !== undefined && phase !== 'done') priceTones[day] = 'active';
  const entities: Entity[] = [arr('prices', PITCH, 0, prices, { label: 'prices', tones: priceTones, codeVar: 'prices' })];

  const col = day !== undefined ? day + 1 : undefined;
  for (const st of STATES) {
    const known = s.hist[st];
    const values: ScalarValue[] = Array.from({ length: cols }, (_, c) => (c < known.length ? fmt(known[c] ?? 0) : '·'));
    const tones: Record<number, Tone> = {};
    values.forEach((_, c) => (tones[c] = c < known.length ? 'done' : 'muted'));
    if (col !== undefined) {
      if (phase === st) tones[col] = 'active';
      if (phase === 'hold' && (st === 'hold' || st === 'rest')) tones[col - 1] = 'compare';
      if (phase === 'sold' && st === 'hold') tones[col - 1] = 'compare';
      if (phase === 'rest' && (st === 'rest' || st === 'sold')) tones[col - 1] = 'compare';
    }
    if (phase === 'done' && (st === 'sold' || st === 'rest')) {
      const sold = s.hist.sold.at(-1) ?? 0;
      const rest = s.hist.rest.at(-1) ?? 0;
      const win: State = sold > rest ? 'sold' : 'rest';
      tones[cols - 1] = st === win ? 'found' : 'done';
    }
    entities.push(
      arr(st, 0, rowY(st), values, {
        label: st,
        tones,
        codeVar: st,
        indexLabels: values.map((_, c) => (c === 0 ? 'start' : `day ${c - 1}`)),
      }),
    );
  }

  if (col !== undefined && (phase === 'hold' || phase === 'sold' || phase === 'rest')) {
    const price = prices[day ?? 0] ?? 0;
    const read = (id: string, from: State, label: string, win: boolean): LinkEntity =>
      link(id, { entity: from, index: col - 1, side: 'top' }, { entity: phase, index: col, side: 'top' }, {
        tone: win ? 'found' : 'miss',
        dashed: !win,
        flow: win,
        label,
      });
    if (phase === 'hold') {
      entities.push(read('keep', 'hold', 'keep', s.keep ?? false));
      entities.push(read('buy', 'rest', `buy −${price}`, !(s.keep ?? false)));
    } else if (phase === 'sold') {
      entities.push(read('sell', 'hold', `sell +${price}`, true));
    } else {
      entities.push(read('wait', 'rest', 'wait', s.keep ?? false));
      entities.push(read('cool', 'sold', 'cooled down', !(s.keep ?? false)));
    }
  }

  if (!s.bare) {
    const dash = '—';
    const live = day !== undefined && phase !== 'done' && phase !== 'init';
    const prevCol = col !== undefined ? col - 1 : undefined;
    const prev = (st: State): ScalarValue => (live && prevCol !== undefined ? fmt(s.hist[st][prevCol] ?? 0) : dash);
    entities.push(
      vars(
        'vals',
        tableBesideArray(cols, 4),
        0,
        [
          { name: 'price', value: live ? (prices[day ?? 0] ?? dash) : dash, tone: live ? 'default' : 'muted' },
          { name: 'prev_hold', value: prev('hold'), tone: live ? 'default' : 'muted' },
          { name: 'prev_sold', value: prev('sold'), tone: live ? 'default' : 'muted' },
          { name: 'prev_rest', value: prev('rest'), tone: live ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, 4 * ROW_Y + 60, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

type Hist = Record<State, number[]>;
const copy = (h: Hist): Hist => ({ hold: [...h.hold], sold: [...h.sold], rest: [...h.rest] });

/** Runs max_profit_cooldown(prices) and records one step per decision (chapter "run", final code). */
function traceStock(prices: readonly number[]): Step[] {
  const steps: Step[] = [];
  let days = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ days, result });
  const h: Hist = { hold: [-Infinity], sold: [0], rest: [0] };

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: 'Before day 0: no share, no profit',
    body: 'Line 2 sets the start: `hold = −∞` (you can’t own a share before buying one), `sold = 0` and `rest = 0`.',
    code: { view: 'final', lines: [2] },
    values: { 2: 'hold, sold, rest = -inf, 0, 0' },
    metrics: metrics(),
    scene: { entities: scene({ prices, phase: 'init', hist: copy(h) }) },
  });

  prices.forEach((price, day) => {
    days += 1;
    const ph = h.hold[day] ?? -Infinity;
    const ps = h.sold[day] ?? 0;
    const pr = h.rest[day] ?? 0;
    steps.push({
      chapter: 'run',
      short: `Day ${day}`,
      title: `Day ${day}: price ${price}`,
      body: `Line 3 takes \`price = ${price}\`. Line 4 copies yesterday’s three values into \`prev_hold = ${fmt(ph)}\`, \`prev_sold = ${fmt(ps)}\`, \`prev_rest = ${fmt(pr)}\`, so today’s updates all read yesterday.`,
      code: { view: 'final', lines: [3, 4] },
      values: { 3: `price = ${price}`, 4: `prev = ${fmt(ph)}, ${fmt(ps)}, ${fmt(pr)}` },
      metrics: metrics(),
      scene: { entities: scene({ prices, phase: 'day', day, hist: copy(h) }) },
    });

    const buy = pr - price;
    const keepHold = ph >= buy;
    const hold = Math.max(ph, buy);
    h.hold.push(hold);
    steps.push({
      chapter: 'run',
      short: keepHold ? 'Keep share' : 'Buy',
      title: keepHold ? `hold = ${fmt(hold)}: keep the share` : `hold = ${fmt(hold)}: buy at ${price}`,
      body: `Line 5: either keep yesterday’s share (\`prev_hold = ${fmt(ph)}\`) or buy today from rest: \`prev_rest − price = ${pr} − ${price} = ${buy}\`. ${keepHold ? 'Keeping is at least as good.' : 'Buying is better.'}`,
      code: { view: 'final', lines: [5] },
      values: { 5: `hold = max(${fmt(ph)}, ${buy}) = ${fmt(hold)}` },
      metrics: metrics(),
      scene: { entities: scene({ prices, phase: 'hold', day, hist: copy(h), keep: keepHold }) },
    });

    const sold = ph + price;
    h.sold.push(sold);
    steps.push({
      chapter: 'run',
      short: 'Sell?',
      title: `sold = ${fmt(sold)}: sell today`,
      body:
        ph === -Infinity
          ? `Line 6: selling needs a share bought **before** today, and \`prev_hold = −∞\`: there is none, so \`sold = −∞\`.`
          : `Line 6: sell yesterday’s share at today’s price: \`prev_hold + price = ${ph} + ${price} = ${sold}\`. Tomorrow will be a cooldown day.`,
      code: { view: 'final', lines: [6] },
      values: { 6: `sold = ${fmt(ph)} + ${price} = ${fmt(sold)}` },
      metrics: metrics(),
      scene: { entities: scene({ prices, phase: 'sold', day, hist: copy(h) }) },
    });

    const wait = pr >= ps;
    const rest = Math.max(pr, ps);
    h.rest.push(rest);
    steps.push({
      chapter: 'run',
      short: 'Rest',
      title: `rest = ${fmt(rest)}`,
      body: `Line 7: end the day with no share and free to buy tomorrow, either by staying at rest (\`prev_rest = ${fmt(pr)}\`) or because yesterday’s sale cools down today (\`prev_sold = ${fmt(ps)}\`). ${wait ? 'Waiting is at least as good.' : 'The cooled-down sale is better.'}`,
      code: { view: 'final', lines: [7] },
      values: { 7: `rest = max(${fmt(pr)}, ${fmt(ps)}) = ${fmt(rest)}` },
      metrics: metrics(),
      scene: { entities: scene({ prices, phase: 'rest', day, hist: copy(h), keep: wait }) },
    });
  });

  const lastSold = h.sold.at(-1) ?? 0;
  const lastRest = h.rest.at(-1) ?? 0;
  const answer = Math.max(lastSold, lastRest);
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Best profit: ${answer}`,
    body: `The days are over. Line 8 returns the better of ending just after a sale (\`sold = ${fmt(lastSold)}\`) and ending at rest (\`rest = ${fmt(lastRest)}\`): **${answer}**. Ending with a share in hand never counts.`,
    code: { view: 'final', lines: [8] },
    values: { 8: `return max(${fmt(lastSold)}, ${fmt(lastRest)}) = ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ prices, phase: 'done', day: prices.length, hist: copy(h) }) },
  });
  return steps;
}

const PRICES = [1, 2, 3, 0, 2] as const;
const RUN = traceStock(PRICES);
const startMetrics = { days: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
const FINAL_HIST: Hist = { hold: [-Infinity, -1, -1, -1, 1, 1], sold: [0, -Infinity, 1, 2, -1, 3], rest: [0, 0, 0, 1, 2, 2] };
const EMPTY_HIST: Hist = { hold: [], sold: [], rest: [] };

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

/** Run index of day d's first step. */
const dayStep = (d: number): number => 1 + d * 4;

export default defineWalkthrough({
  id: 'learn/dynamic-programming/stock-with-cooldown',
  title: 'Stock with Cooldown, three states a day',
  summary: 'From the idea to the code: get the best profit from buying and selling with a one-day cooldown, by tracking three states (holding, just sold, resting) through every day.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def max_profit_cooldown(prices: list[int]) -> int:
    hold, sold, rest = float("-inf"), 0, 0
    for price in prices:
        prev_hold, prev_sold, prev_rest = hold, sold, rest
        hold = max(prev_hold, prev_rest - price)  # Can only buy from rest
        sold = prev_hold + price                  # Selling triggers cooldown
        rest = max(prev_rest, prev_sold)
    return int(max(sold, rest))`,
  },
  snapshots: {
    brute: `def max_profit_cooldown(prices: list[int]) -> int:
    def best(day: int, holding: bool) -> int:
        if day >= len(prices):
            return 0
        wait = best(day + 1, holding)
        if holding:  # Sell today, then skip tomorrow
            return max(wait, prices[day] + best(day + 2, False))
        return max(wait, -prices[day] + best(day + 1, True))  # Buy today
    return best(0, False)`,
  },
  metrics: [
    { key: 'days', label: 'Days' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'price / state being set' },
    { tone: 'compare', label: 'yesterday’s reads' },
    { tone: 'done', label: 'known' },
    { tone: 'muted', label: 'not yet' },
    { tone: 'miss', label: 'losing option' },
    { tone: 'found', label: 'winning option / answer' },
  ],
  goals: [
    { text: 'See why trying every trade plan explodes', step: 2 },
    { text: 'Track three states and their moves', step: 3 },
    { text: 'Follow every state change, day by day', step: BUILD_END + dayStep(1) + 1 },
    { text: 'Know why line 4 copies yesterday first', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Trade a stock with a cooldown',
      body: 'You may buy and sell as often as you like, but hold **one share at most**, and after a sale you must wait **one day** before buying again. Line 1 takes the daily `prices` and returns the best total profit.\n\nHere `[1, 2, 3, 0, 2]` gives **3**: buy at 1, sell at 2, cool down, buy at 0, sell at 2.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ prices: PRICES, phase: 'bare', hist: EMPTY_HIST, bare: true, note: 'buy 1 → sell 2 (+1), cooldown on day 2\nbuy 0 → sell 2 (+2)\ntotal 3' }) },
    },
    {
      chapter: 'idea',
      short: 'Every plan',
      title: 'The obvious way: try wait, buy and sell every day',
      body: 'Lines 5–8 branch on every day: wait, or act (buy or sell). The calls double with each day, **`O(2ⁿ)`**.\n\nYet the future only depends on **the day** and **whether you hold a share**: just `2n` different questions, each answered many times.',
      code: { view: 'snapshot', id: 'brute', lines: [5, 7, 8] },
      metrics: startMetrics,
      scene: { entities: scene({ prices: PRICES, phase: 'bare', hist: EMPTY_HIST, bare: true, note: '5 days: up to 2⁵ = 32 plans\n30 days: ~10⁹ plans\nbut only 2 × 30 = 60 questions', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Three states',
      title: 'End every day in one of three states',
      body: '**hold**: you own a share. **sold**: you sold today, so tomorrow is a cooldown. **rest**: no share and free to buy. Each state’s best profit comes from yesterday’s:\n\n`hold = max(hold, rest − price)`, `sold = hold + price`, `rest = max(rest, sold)`. Buying only from **rest** is what enforces the cooldown.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ prices: PRICES, phase: 'hold', day: 3, hist: { hold: [-Infinity, -1, -1, -1, 1], sold: [0, -Infinity, 1, 2], rest: [0, 0, 0, 1] }, keep: false, bare: true, note: 'day 3, price 0: buy from rest\nrest − price = 1 − 0 = 1 > −1\nhold = 1' }) },
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Line 2: the three states before day 0',
      body: 'You can’t hold a share you never bought, so `hold` starts at **−∞** (any real choice beats it). `sold` and `rest` start at 0.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['hold, sold, rest = -inf, 0, 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Each day',
      title: 'Lines 3–4: each day, freeze yesterday',
      body: 'Line 3 walks the days. Line 4 copies the three values into `prev_…` first, because all three updates must read **yesterday’s** values.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['for price in prices', 'prev_hold, prev_sold, prev_rest = hold, sold, rest'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Hold',
      title: 'Line 5: keep the share or buy one',
      body: 'Holding today means you held yesterday too, or you buy today. Buying spends `price` and is only allowed from rest.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['hold = max(prev_hold, prev_rest - price)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Sold',
      title: 'Line 6: sell the share',
      body: 'Selling today needs yesterday’s share: `prev_hold + price`. It lands in `sold`, the state that forces a cooldown.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [6] },
      metrics: startMetrics,
      changes: ['sold = prev_hold + price'],
      scene: at(dayStep(1) + 2),
    },
    {
      chapter: 'build',
      short: 'Rest',
      title: 'Line 7: rest, or finish a cooldown',
      body: 'Resting today means you rested yesterday, or you sold yesterday and today is the cooldown day.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [7] },
      metrics: startMetrics,
      changes: ['rest = max(prev_rest, prev_sold)'],
      scene: at(dayStep(2) + 3),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 8: end without a share',
      body: 'A share still in hand at the end is money spent, so line 8 returns the better of `sold` and `rest`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [8] },
      metrics: startMetrics,
      changes: ['return int(max(sold, rest))'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Three updates a day: O(n) time, O(1) space',
      body: 'Each day costs three `max`/`+` updates, so it’s **`O(n)` time**, and only six numbers are kept: **`O(1)` space**. Trying every plan is `O(2ⁿ)`.\n\nSwitch to **🧪 Try your own** to trade other price lists.',
      code: { view: 'final', lines: [5, 6, 7] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ prices: PRICES, phase: 'done', day: PRICES.length, hist: FINAL_HIST, note: '5 days: 15 updates\nn = 10⁵ days: 3·10⁵ updates', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Yesterday',
      title: 'Why line 4 copies yesterday before updating',
      body: 'All three updates must read **yesterday**. Without line 4, line 6 would read the `hold` just set on line 5 (buy and sell on the same day), and line 7 would read today’s `sold`, skipping the cooldown.\n\nThat is the key decision: with `[1, 2, 0, 2]` the in-place version buys at 0 the day after selling, which the cooldown forbids, and returns 3 instead of 2.',
      code: { view: 'final', lines: [4, 6, 7] },
      values: { 4: 'freeze yesterday first', 6: 'reads prev_hold, not today’s hold', 7: 'reads prev_sold: cooldown kept' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ prices: PRICES, phase: 'rest', day: 2, hist: { hold: [-Infinity, -1, -1, -1], sold: [0, -Infinity, 1, 2], rest: [0, 0, 0, 1] }, keep: false, note: 'day 2: rest reads yesterday’s sold (1)\ntoday’s sold (2) waits a day\nthat wait is the cooldown' }) },
    },
  ],
  trace: {
    title: 'Run max_profit_cooldown on your own prices',
    inputs: [{ name: 'prices', label: 'prices (0 to 999)', kind: 'numbers', default: '3, 1, 4, 2, 5' }],
    presets: [
      { label: 'Lesson example', values: { prices: '1, 2, 3, 0, 2' } },
      { label: 'Falling prices', values: { prices: '5, 4, 3, 2' } },
      { label: 'Single day', values: { prices: '7' } },
      { label: 'Cooldown bites', values: { prices: '1, 4, 2, 7' } },
    ],
    maxItems: 7,
    run: (values) => {
      const prices = values['prices'];
      if (!Array.isArray(prices) || prices.length === 0) throw new Error('Enter at least one price.');
      if (prices.some((p) => p < 0 || p > 999)) throw new Error('Prices go from 0 to 999.');
      return traceStock(prices);
    },
  },
});
