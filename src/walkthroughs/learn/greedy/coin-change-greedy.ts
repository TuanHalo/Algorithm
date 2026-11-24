import { arr, defineWalkthrough, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 230;

/** A coin plus a stable key, so sorting slides each coin to its new slot. */
interface Coin {
  readonly v: number;
  readonly id: number;
}

/** What the loop is doing with the current coin. */
type Phase = 'fit' | 'skip' | 'count' | 'take';

interface CoinState {
  /** The coins as drawn: input order before line 5 sorts them, biggest first after. */
  readonly coins: readonly Coin[];
  readonly remaining: number;
  /** Position of the current coin in `coins`. */
  readonly at?: number;
  readonly phase?: Phase;
  readonly count?: number;
  /** How many of each coin (by position) were taken, for coins before `at`. */
  readonly taken: readonly number[];
  /** The loop has ended and the answer is known. */
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code has `remaining`: only the coins and the amount. */
  readonly bare?: boolean;
  readonly amount: number;
  readonly arrayId?: string;
}

const listText = (chosen: readonly number[]): string => (chosen.length <= 8 ? `[${chosen.join(', ')}]` : `a list of ${chosen.length} coins`);

/** Scene for one moment: the coins, the one being tried, what was taken, and the variables. */
function scene(s: CoinState): Entity[] {
  const id = s.arrayId ?? 'coins';
  const tones: Record<number, Tone> = {};
  s.coins.forEach((_, k) => {
    const took = s.taken[k] ?? 0;
    if (s.done || (s.at !== undefined && k < s.at)) tones[k] = took > 0 ? 'done' : 'muted';
  });
  if (s.at !== undefined && !s.done) tones[s.at] = s.phase === 'skip' ? 'miss' : 'active';

  const entities: Entity[] = [
    arr(id, 0, 0, s.coins.map((c) => c.v), { label: 'coins', tones, codeVar: 'coins', itemKeys: s.coins.map((c) => c.id) }),
  ];
  if (s.at !== undefined && !s.done) entities.push(ptr('coin', id, s.at, 'coin', { tone: s.phase === 'skip' ? 'miss' : 'active', codeVar: 'coin' }));

  const entries: MapEntry[] = [];
  s.coins.forEach((c, k) => {
    const took = s.taken[k] ?? 0;
    if (took > 0) entries.push({ key: c.v, value: `× ${took}`, tone: 'done' });
  });
  if (s.phase === 'take' && s.at !== undefined && s.count !== undefined) entries.push({ key: s.coins[s.at]?.v ?? 0, value: `× ${s.count}`, tone: 'active' });
  const cells = s.coins.length;
  if (!s.bare) entities.push(map('chosen', tableBesideArray(cells, Math.max(4, entries.length)), 0, 'chosen', entries, { width: 170, codeVar: 'chosen' }));

  const coin = s.at === undefined || s.done ? undefined : s.coins[s.at]?.v;
  const rows: VarRow[] = s.bare
    ? [{ name: 'amount', value: s.amount }]
    : [
        { name: 'amount', value: s.amount },
        { name: 'remaining', value: s.remaining, tone: s.remaining === 0 ? 'found' : 'default' },
        { name: 'coin', value: coin ?? '—', tone: coin === undefined ? 'muted' : 'default' },
        { name: 'count', value: s.count ?? '—', tone: s.count === undefined ? 'muted' : 'default' },
      ];
  entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 190 }));
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs greedy coin change on any input and records one step per decision (chapter "run", final code). */
function traceCoins(input: readonly number[], amount: number): Step[] {
  const coins: Coin[] = input.map((v, id) => ({ v, id }));
  const sorted = [...coins].sort((a, b) => b.v - a.v);
  const steps: Step[] = [];
  const taken: number[] = [];
  let remaining = amount;
  let coinsTaken = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ coinsTaken, remaining, result });
  const base = { amount } as const;

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Start: ${amount} to pay, nothing chosen yet`,
    body: `Line 2 starts with an empty \`chosen\` list. Line 3 sets \`remaining = ${amount}\`: the whole amount is still to pay.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: 'chosen = []', 3: `remaining = ${amount}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, coins, remaining, taken }) },
  });

  sorted.forEach((c, at) => {
    const first = at === 0;
    const ctx = { ...base, coins: sorted, at, taken };
    const intro = first ? 'Line 5 sorts the coins from biggest to smallest and takes the first one' : `Line 5 moves on to the next coin`;
    if (c.v > remaining) {
      taken[at] = 0;
      steps.push({
        chapter: 'run',
        short: `Skip ${c.v}`,
        title: `Coin ${c.v} is bigger than ${remaining}: skip it`,
        body: `${intro}: \`coin = ${c.v}\`. Line 6: \`${c.v} > ${remaining}\` is true, so line 7 skips it.\n\nA coin bigger than what is left can never be part of the change.`,
        code: { view: 'final', lines: [5, 6, 7] },
        values: { 5: `coin = ${c.v}`, 6: `${c.v} > ${remaining} → True`, 7: 'skip this coin' },
        metrics: metrics(),
        scene: { entities: scene({ ...ctx, remaining, phase: 'skip' }) },
      });
      return;
    }
    steps.push({
      chapter: 'run',
      short: `Try ${c.v}`,
      title: `Coin ${c.v} fits into ${remaining}`,
      body: `${intro}: \`coin = ${c.v}\`. Line 6: \`${c.v} > ${remaining}\` is false, so the coin fits and the loop goes on to line 8.`,
      code: { view: 'final', lines: [5, 6] },
      values: { 5: `coin = ${c.v}`, 6: `${c.v} > ${remaining} → False` },
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, remaining, phase: 'fit' }) },
    });
    const count = Math.floor(remaining / c.v);
    steps.push({
      chapter: 'run',
      short: `count = ${count}`,
      title: `${remaining} // ${c.v} = ${count}: take ${count} at once`,
      body: `Line 8 divides: \`${remaining} // ${c.v} = ${count}\`, so ${count === 1 ? 'one coin' : `${count} coins`} of ${c.v} fit${count === 1 ? 's' : ''}. Taking them all now is what "biggest coin first" means.`,
      code: { view: 'final', lines: [8] },
      values: { 8: `count = ${remaining} // ${c.v} = ${count}` },
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, remaining, phase: 'count', count }) },
    });
    const before = remaining;
    taken[at] = count;
    remaining -= count * c.v;
    coinsTaken += count;
    steps.push({
      chapter: 'run',
      short: `Take ${count} × ${c.v}`,
      title: `Take ${count} × ${c.v}: ${remaining} left`,
      body: `Line 9 adds ${count === 1 ? 'one' : count} ${c.v}${count === 1 ? '' : 's'} to \`chosen\`. Line 10 subtracts \`${count} * ${c.v} = ${count * c.v}\`: \`remaining\` goes from ${before} to ${remaining}.`,
      code: { view: 'final', lines: [9, 10] },
      values: { 9: `chosen += [${c.v}] * ${count}`, 10: `remaining = ${before} - ${count * c.v} = ${remaining}` },
      changes: [`chosen: ${c.v} × ${count}`, `remaining = ${remaining}`],
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, at, remaining, phase: 'take', count, taken: taken.map((t, k) => (k === at ? 0 : t)) }) },
    });
  });

  const chosen = sorted.flatMap((c, k) => Array<number>(taken[k] ?? 0).fill(c.v));
  const ok = remaining === 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: ok ? `Return ${chosen.length} coin${chosen.length === 1 ? '' : 's'}` : `${remaining} is left over: return None`,
    body: ok
      ? `The loop has tried every coin. Line 12: \`remaining == 0\`, so it returns **${listText(chosen)}**.${amount === 0 ? '' : ` That is ${chosen.length} coin${chosen.length === 1 ? '' : 's'}.`}`
      : `The loop has tried every coin and ${remaining} is still left. Line 12: \`remaining == 0\` is false, so it returns **None**.\n\nGreedy never goes back to try a different mix.`,
    code: { view: 'final', lines: [12] },
    values: { 12: ok ? `${remaining} == 0 → return ${listText(chosen)}` : `${remaining} == 0 → False, return None` },
    metrics: metrics(ok ? `${chosen.length} coin${chosen.length === 1 ? '' : 's'}` : 'None'),
    scene: { entities: scene({ ...base, coins: sorted, remaining, taken, done: true, note: ok ? undefined : `${remaining} left over\nreturn None`, noteTone: 'miss' }) },
  });
  return steps;
}

const COINS = [1, 25, 5, 10] as const;
const AMOUNT = 63;
const RUN = traceCoins(COINS, AMOUNT);
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { coinsTaken: 0, remaining: AMOUNT, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const items = (values: readonly number[]): Coin[] => values.map((v, id) => ({ v, id }));

/** Scene of the counterexample: coins 1, 3, 4 and amount 6, greedy's pick and the better answer. */
function trapScene(extra: Partial<CoinState> & { readonly note?: string; readonly noteTone?: Tone }): Entity[] {
  return scene({ amount: 6, coins: items([4, 3, 1]), remaining: 0, taken: [1, 0, 2], done: true, arrayId: 'trap', ...extra });
}

export default defineWalkthrough({
  id: 'learn/greedy/coin-change-greedy',
  title: 'Greedy Coin Change, always the biggest coin first',
  summary: 'From the cashier’s habit to the code: hand back change by taking the biggest coin that fits, and see the coin set where that habit fails.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def coin_change_greedy(coins: list[int], amount: int) -> list[int] | None:
    chosen: list[int] = []
    remaining = amount

    for coin in sorted(coins, reverse=True):
        if coin > remaining:
            continue
        count = remaining // coin  # take as many of this coin as fit
        chosen.extend([coin] * count)
        remaining -= count * coin

    return chosen if remaining == 0 else None`,
  },
  metrics: [
    { key: 'coinsTaken', label: 'Coins taken' },
    { key: 'remaining', label: 'Left to pay' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'coin being tried' },
    { tone: 'done', label: 'coin taken' },
    { tone: 'miss', label: 'too big, skipped' },
    { tone: 'muted', label: 'already passed' },
    { tone: 'found', label: 'nothing left to pay' },
  ],
  goals: [
    { text: 'See the coin set where the cashier’s habit fails', step: 3 },
    { text: 'Build the loop one coin type at a time', step: 4 },
    { text: 'Follow every skip, count and take', step: 9 },
    { text: 'Know when "biggest first" is safe', step: 22 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Give back 63 cents in the fewest coins',
      body: 'A cashier owes you 63 cents and has quarters, dimes, nickels and pennies. Without any calculation they hand over two quarters, a dime and three pennies.\n\nLine 1 takes the coin values `coins` (all positive) and an `amount`, and returns the coins handed back, or `None` if the change can’t be made exactly. Here: `[1, 25, 5, 10]` and 63.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ amount: AMOUNT, coins: items(COINS), remaining: AMOUNT, taken: [], bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Biggest first',
      title: 'The cashier’s habit: biggest coin that fits, as many as fit',
      body: 'For 63 the quarter is the biggest coin that fits, and it fits twice. 13 is left: one dime, then three pennies. The nickel never fits again.\n\nNo coin is ever given back or swapped, so there is no search at all: one pass over the coin types.',
      code: { view: 'signature' },
      metrics: { coinsTaken: 6, remaining: 0, result: '6 coins' },
      scene: {
        entities: scene({ amount: AMOUNT, coins: items([25, 10, 5, 1]), remaining: 0, taken: [2, 1, 0, 3], done: true, note: '25 + 25 + 10 + 1 + 1 + 1 = 63\n6 coins, no searching', noteTone: 'found' }),
      },
    },
    {
      chapter: 'idea',
      short: 'It can fail',
      title: 'With coins 1, 3 and 4, the same habit gives 3 coins for 6',
      body: 'The biggest coin that fits 6 is the 4. Then 2 is left, so two 1s: **4 + 1 + 1 = 3 coins**. But **3 + 3** needs only 2.\n\nTaking the biggest coin can close the door on a better mix, and greedy never goes back. It is exact for coin sets like US coins, where no such trap exists.',
      code: { view: 'signature' },
      metrics: { coinsTaken: 3, remaining: 0, result: '3 coins' },
      scene: { entities: trapScene({ note: 'greedy: 4 + 1 + 1 = 3 coins\nbest:   3 + 3 = 2 coins', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Chosen',
      title: 'Lines 2–3: a list for the coins, a number for what is left',
      body: '`chosen` collects the coins handed back. `remaining` starts as the whole `amount` and shrinks every time a coin is taken.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['chosen = []', 'remaining = amount'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Sort',
      title: 'Line 5: visit the coins biggest first',
      body: '`sorted(coins, reverse=True)` puts the coins in order from biggest to smallest, and the loop looks at one coin type at a time. That order **is** the greedy rule.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['for coin in sorted(coins, reverse=True)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Too big',
      title: 'Lines 6–7: a coin bigger than what is left is skipped',
      body: 'If `coin > remaining`, the coin can’t be part of the change, so `continue` jumps to the next coin.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [6, 7] },
      metrics: { ...startMetrics, coinsTaken: 3, remaining: 3 },
      changes: ['if coin > remaining: continue'],
      scene: at(7),
    },
    {
      chapter: 'build',
      short: 'Take all',
      title: 'Lines 8–10: take as many of this coin as fit',
      body: '`remaining // coin` counts how many fit. Line 9 adds that many to `chosen`, and line 10 takes their total value off `remaining`. Doing it in one go replaces a loop of single-coin steps.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: { ...startMetrics, coinsTaken: 2, remaining: 13 },
      changes: ['count = remaining // coin', 'chosen.extend([coin] * count)', 'remaining -= count * coin'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Exact?',
      title: 'Line 12: success only when nothing is left to pay',
      body: 'After the last coin type, `remaining == 0` means the change is exact, and `chosen` is the answer. Anything else means greedy got stuck, so it returns `None`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [12] },
      metrics: FINAL_METRICS,
      changes: ['return chosen if remaining == 0 else None'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One sort and one pass: O(k log k) plus the coins listed',
      body: 'Sorting the `k` coin types costs `O(k log k)`. After that each type is visited once, and `chosen` grows by one entry per coin handed back.\n\nSwitch to **🧪 Try your own** to test other coin sets, including ones where greedy fails.',
      code: { view: 'final', lines: [5, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ amount: AMOUNT, coins: [...items([25, 10, 5, 1])], remaining: 0, taken: [2, 1, 0, 3], done: true, note: 'k = 4 coin types → 4 turns\n6 coins handed back', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'No way back',
      title: 'Line 9 commits to the biggest coin and never looks back',
      body: 'For `[1, 3, 4]` and 6, line 9 takes the 4 and line 10 leaves 2. Nothing ever undoes that, so the 3 + 3 answer is out of reach.\n\nThat is the key decision: greedy is **fast but only exact when the coin set allows it** (US and Euro coins do). For any other set, use dynamic programming, which tries every smaller coin.',
      code: { view: 'final', lines: [8, 9, 10] },
      values: { 8: 'count = 6 // 4 = 1', 9: 'chosen += [4]', 10: 'remaining = 2 → then 1 + 1' },
      metrics: { coinsTaken: 3, remaining: 0, result: '3 coins' },
      scene: { entities: trapScene({ note: 'greedy: 4 + 1 + 1 = 3 coins\nbest:   3 + 3 = 2 coins', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Run greedy coin change on your own coins',
    inputs: [
      { name: 'coins', label: 'Coin values', kind: 'numbers', default: '25, 10, 5, 1' },
      { name: 'amount', label: 'Amount', kind: 'number', default: '63' },
    ],
    presets: [
      { label: 'US coins', values: { coins: '25, 10, 5, 1', amount: '63' } },
      { label: 'Greedy fails', values: { coins: '1, 3, 4', amount: '6' } },
      { label: 'No exact change', values: { coins: '5, 10', amount: '3' } },
      { label: 'Stuck on a gap', values: { coins: '5, 2', amount: '3' } },
      { label: 'Amount is 0', values: { coins: '1, 5', amount: '0' } },
    ],
    maxItems: 8,
    run: (values) => {
      const input = values['coins'];
      const amount = values['amount'];
      if (!Array.isArray(input) || input.length === 0 || typeof amount !== 'number') throw new Error('Enter some coin values and an amount.');
      if (input.some((c) => c < 1)) throw new Error('Coin values must be 1 or more.');
      if (amount < 0 || amount > 999) throw new Error('Pick an amount from 0 to 999.');
      return traceCoins(input, amount);
    },
  },
});
