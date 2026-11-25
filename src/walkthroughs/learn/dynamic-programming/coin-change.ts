import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/** `coins` on top, the 1D table `dp` (one cell per amount 0…amount) below it. */
const DP_Y = 130;
const NOTE_Y = 300;

type Phase = 'bare' | 'init' | 'base' | 'skip' | 'try' | 'done';

interface CoinState {
  readonly coins: readonly number[];
  readonly amount: number;
  readonly phase: Phase;
  readonly dp: readonly ScalarValue[];
  readonly a?: number;
  /** Index into coins of the coin being tried. */
  readonly k?: number;
  /** The try improved dp[a]. */
  readonly better?: boolean;
  readonly result?: number;
  /** Per-cell tones for the idea chapter. */
  readonly dpTones?: Readonly<Record<number, Tone>>;
  /** Arcs drawn into one cell in the idea chapter: [from, to, label]. */
  readonly arcs?: readonly (readonly [number, number, string])[];
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

/** Scene: the coins, the dp row, the read arc for one try, and the variables. */
function scene(s: CoinState): Entity[] {
  const { coins, amount, phase, a, k } = s;
  const sentinel = amount + 1;
  const coin = k !== undefined ? coins[k] : undefined;

  const coinTones: Record<number, Tone> = {};
  if (k !== undefined) coinTones[k] = phase === 'skip' ? 'miss' : 'compare';
  const entities: Entity[] = [arr('coins', 0, 0, coins, { label: 'coins', tones: coinTones, codeVar: 'coins' })];

  let tones: Record<number, Tone> = {};
  if (s.dpTones) tones = { ...s.dpTones };
  else {
    s.dp.forEach((v, i) => {
      if (phase === 'bare') tones[i] = 'muted';
      else if (a !== undefined && i > a) tones[i] = 'muted';
      else tones[i] = v === sentinel ? 'muted' : 'done';
    });
    if (phase === 'base') tones[0] = 'active';
    if ((phase === 'skip' || phase === 'try') && a !== undefined) {
      tones[a] = 'active';
      if (phase === 'try' && coin !== undefined) tones[a - coin] = 'compare';
    }
    if (phase === 'done') tones[amount] = s.result === -1 ? 'miss' : 'found';
  }
  entities.push(arr('dp', 0, DP_Y, s.dp, { label: 'dp', tones, codeVar: 'dp' }));
  if (a !== undefined && phase !== 'done' && phase !== 'base') entities.push(ptr('a', 'dp', a, 'a', { side: 'bottom', codeVar: 'a' }));
  if (k !== undefined) entities.push(ptr('coin', 'coins', k, 'coin', { side: 'top', tone: phase === 'skip' ? 'miss' : 'compare', codeVar: 'coin' }));
  if (phase === 'try' && a !== undefined && coin !== undefined) {
    const from = s.dp[a - coin];
    entities.push(
      link('look', { entity: 'dp', index: a - coin, side: 'top' }, { entity: 'dp', index: a, side: 'top' }, {
        tone: s.better ? 'found' : 'miss',
        dashed: !s.better,
        flow: s.better,
        label: `${String(from)} + 1`,
      }),
    );
  }
  for (const [from, to, label] of s.arcs ?? []) {
    entities.push(link(`arc-${from}`, { entity: 'dp', index: from, side: 'top' }, { entity: 'dp', index: to, side: 'top' }, { tone: 'compare', label }));
  }

  if (!s.bare) {
    const dash = '—';
    entities.push(
      vars(
        'vals',
        tableBesideArray(Math.max(coins.length, s.dp.length), 4),
        0,
        [
          { name: 'amount', value: amount },
          { name: 'a', value: a ?? dash, tone: a === undefined ? 'muted' : 'default' },
          { name: 'coin', value: coin ?? dash, tone: coin === undefined ? 'muted' : phase === 'skip' ? 'miss' : 'default' },
          { name: 'dp[a]', value: a !== undefined ? String(s.dp[a]) : dash, tone: a === undefined ? 'muted' : s.better ? 'found' : 'default' },
        ],
        { label: 'variables', width: 160 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Inline values for one try; the first coin of an amount also shows line 4's new `a`. */
function withA(k: number, a: number, values: Record<number, string>): Record<number, string> {
  return k === 0 ? { 4: `a = ${a}`, ...values } : values;
}

/** Runs coin_change(coins, amount) and records one step per decision (chapter "run", final code). */
function traceCoins(coins: readonly number[], amount: number): Step[] {
  const steps: Step[] = [];
  let tries = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ tries, result });
  const sentinel = amount + 1;
  const dp: number[] = Array.from({ length: amount + 1 }, () => sentinel);

  steps.push({
    chapter: 'run',
    short: 'Sentinel',
    title: `Fill dp with ${sentinel}: “not reachable yet”`,
    body: `Line 2 makes ${amount + 1} slot${amount === 0 ? '' : 's'}, one per amount 0…${amount}, all set to \`amount + 1 = ${sentinel}\`. No real answer can be that big, so ${sentinel} means “no way found yet”.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `dp = [${sentinel}] * ${amount + 1}` },
    metrics: metrics(),
    scene: { entities: scene({ coins, amount, phase: 'init', dp: [...dp] }) },
  });
  dp[0] = 0;
  steps.push({
    chapter: 'run',
    short: 'dp[0] = 0',
    title: 'Paying 0 takes 0 coins',
    body: 'Line 3 sets the base case: `dp[0] = 0`. Every other amount will be built on top of it.',
    code: { view: 'final', lines: [3] },
    values: { 3: 'dp[0] = 0' },
    metrics: metrics(),
    scene: { entities: scene({ coins, amount, phase: 'base', dp: [...dp] }) },
  });

  for (let a = 1; a <= amount; a += 1) {
    coins.forEach((coin, k) => {
      const first = k === 0 ? `Line 4 moves on to \`a = ${a}\`. ` : '';
      if (a < coin) {
        steps.push({
          chapter: 'run',
          short: `a=${a}, ${coin}?`,
          title: `Coin ${coin} doesn’t fit in ${a}`,
          body: `${first}Line 5 tries \`coin = ${coin}\`. Line 6: \`${a} >= ${coin}\` is false, so this coin can’t be the last one paid.`,
          code: { view: 'final', lines: k === 0 ? [4, 5, 6] : [5, 6] },
          values: withA(k, a, { 5: `coin = ${coin}`, 6: `${a} >= ${coin} → False` }),
          metrics: metrics(),
          scene: { entities: scene({ coins, amount, phase: 'skip', dp: [...dp], a, k }) },
        });
        return;
      }
      tries += 1;
      const before = dp[a] ?? sentinel;
      const rest = dp[a - coin] ?? sentinel;
      const candidate = rest + 1;
      const better = candidate < before;
      if (better) dp[a] = candidate;
      const restText = rest === sentinel ? `${rest} (not reachable)` : String(rest);
      steps.push({
        chapter: 'run',
        short: `a=${a}, ${coin}`,
        title: better ? `Pay ${coin} last: dp[${a}] = ${candidate}` : `Pay ${coin} last: ${candidate} is no better`,
        body: `${first}Line 5 tries \`coin = ${coin}\`; it fits (line 6). Line 7 reads \`dp[${a} − ${coin}] = dp[${a - coin}] = ${restText}\`, so ${coin} as the last coin costs ${candidate}. ${better ? `That beats ${before}: \`dp[${a}] = ${candidate}\`.` : `\`dp[${a}]\` already has ${before}, so it stays.`}`,
        code: { view: 'final', lines: k === 0 ? [4, 5, 6, 7] : [5, 6, 7] },
        values: withA(k, a, { 5: `coin = ${coin}`, 6: `${a} >= ${coin} → True`, 7: `min(${before}, ${rest} + 1) = ${Math.min(before, candidate)}` }),
        metrics: metrics(),
        scene: { entities: scene({ coins, amount, phase: 'try', dp: [...dp], a, k, better }) },
      });
    });
  }

  const last = dp[amount] ?? sentinel;
  const result = last <= amount ? last : -1;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: result === -1 ? `${amount} can’t be paid: −1` : `${amount} needs ${result} coin${result === 1 ? '' : 's'}`,
    body:
      result === -1
        ? `Line 8: \`dp[${amount}]\` is still the sentinel ${sentinel} (> ${amount}), so no mix of coins reaches ${amount}. It returns **−1**.`
        : `Line 8: \`dp[${amount}] = ${last}\` is at most ${amount}, a real count, so it returns **${result}**.`,
    code: { view: 'final', lines: [8] },
    values: { 8: `return ${result}` },
    metrics: metrics(result),
    scene: { entities: scene({ coins, amount, phase: 'done', dp: [...dp], result }) },
  });
  return steps;
}

/** How many times the naive recursion solves each amount. */
function naiveCalls(coins: readonly number[], amount: number): number[] {
  const calls = Array.from({ length: amount + 1 }, () => 0);
  const solve = (a: number): void => {
    calls[a] = (calls[a] ?? 0) + 1;
    for (const c of coins) if (c <= a) solve(a - c);
  };
  solve(amount);
  return calls;
}

const COINS = [1, 3, 4] as const;
const AMOUNT = 6;
const RUN = traceCoins(COINS, AMOUNT);
const startMetrics = { tries: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;
const CALLS = naiveCalls(COINS, AMOUNT);
const TOTAL_CALLS = CALLS.reduce((x, y) => x + y, 0);
const FILLED = [0, 1, 2, 1, 1, 2, 2] as const;
const UNKNOWN = Array.from({ length: AMOUNT + 1 }, () => '?');
const allTones = (tone: Tone): Record<number, Tone> => Object.fromEntries(FILLED.map((_, i) => [i, tone]));

/** Scene of run step n (0-based), so build steps show the moment they describe. */
function at(n: number): Step['scene'] {
  return RUN[n]?.scene ?? { entities: [] };
}

/** First run step that handles amount a with coin index k. */
const runIndex = (a: number, k: number): number => 2 + (a - 1) * COINS.length + k;

export default defineWalkthrough({
  id: 'learn/dynamic-programming/coin-change',
  title: 'Coin Change, the fewest coins for every amount',
  summary: 'From the idea to the code: find the fewest coins that pay an amount by solving every smaller amount first, and trying each coin as the last one paid.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def coin_change(coins: list[int], amount: int) -> int:
    dp = [amount + 1] * (amount + 1)  # Sentinel larger than any valid count
    dp[0] = 0
    for a in range(1, amount + 1):
        for coin in coins:
            if a >= coin:
                dp[a] = min(dp[a], dp[a - coin] + 1)
    return dp[amount] if dp[amount] <= amount else -1`,
  },
  snapshots: {
    brute: `def coin_change(coins: list[int], amount: int) -> int:
    if amount == 0:
        return 0  # Nothing left to pay
    counts = [coin_change(coins, amount - c) for c in coins if c <= amount]
    best = min((n for n in counts if n >= 0), default=-1)
    return best + 1 if best >= 0 else -1`,
  },
  metrics: [
    { key: 'tries', label: 'Coins tried' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'amount a' },
    { tone: 'compare', label: 'coin, dp[a − coin]' },
    { tone: 'done', label: 'solved' },
    { tone: 'muted', label: 'not reachable / not yet' },
    { tone: 'miss', label: 'no fit / no better' },
    { tone: 'found', label: 'answer' },
  ],
  goals: [
    { text: 'See why grabbing the biggest coin fails', step: 2 },
    { text: 'Build dp[a] from dp[a − coin] + 1', step: 4 },
    { text: 'Follow every coin tried for every amount', step: BUILD_END + 3 },
    { text: 'Know why the sentinel is amount + 1', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Pay an amount with the fewest coins',
      body: 'You may use each coin value as often as you like. Line 1 takes the coin values and an `amount`, and returns the fewest coins that add up to it, or **−1** if no mix works.\n\nHere `coins = [1, 3, 4]` and `amount = 6`: the answer is **2** (3 + 3).',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ coins: COINS, amount: AMOUNT, phase: 'bare', dp: UNKNOWN, bare: true, note: 'coins = [1, 3, 4], amount = 6\nfewest coins? (expected 2: 3 + 3)' }) },
    },
    {
      chapter: 'idea',
      short: 'Greedy?',
      title: 'Grabbing the biggest coin first doesn’t work',
      body: 'Greedy takes 4, then 1, then 1: **3 coins**. But 3 + 3 pays 6 with **2**.\n\nA big coin now can leave an awkward rest. We have to compare every coin as a choice, not commit to one.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ coins: COINS, amount: AMOUNT, phase: 'bare', dp: UNKNOWN, bare: true, note: 'greedy: 4 + 1 + 1 → 3 coins ✗\nbest:   3 + 3     → 2 coins ✓', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Try all',
      title: 'The obvious way: try every coin, recursively',
      body: `Line 4 tries each coin as the first one paid and solves the rest the same way. Each cell shows how often an amount gets solved: ${TOTAL_CALLS} calls in total, and amount 1 alone is solved ${CALLS[1] ?? 0} times (red).\n\nThe calls multiply with every level: **exponential** in \`amount\`.`,
      code: { view: 'snapshot', id: 'brute', lines: [4] },
      metrics: startMetrics,
      scene: {
        entities: scene({
          coins: COINS,
          amount: AMOUNT,
          phase: 'bare',
          dp: CALLS,
          bare: true,
          dpTones: Object.fromEntries(CALLS.map((n, i) => [i, n > 1 ? 'miss' : 'done'])),
          note: 'number = times amount a is solved\nred: solved again from scratch',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Last coin',
      title: 'Solve small amounts first, then try each last coin',
      body: 'Whatever the best way to pay `a` is, it ends with some coin. Remove it and what’s left, `a − coin`, must itself be paid the best way. So **dp[a] = min over coins of dp[a − coin] + 1**.\n\nGo from `a = 1` up to `amount`, and every `dp[a − coin]` is already final when it’s read.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          coins: COINS,
          amount: AMOUNT,
          phase: 'bare',
          dp: FILLED,
          bare: true,
          dpTones: { ...allTones('done'), 2: 'compare', 3: 'compare', 5: 'compare', 6: 'active' },
          arcs: [
            [5, 6, '2 + 1'],
            [3, 6, '1 + 1'],
            [2, 6, '2 + 1'],
          ],
          note: 'dp[6] = min(dp[5], dp[3], dp[2]) + 1\n      = min(2, 1, 2) + 1 = 2',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–3: one slot per amount, a sentinel, and dp[0]',
      body: 'Line 2 makes `amount + 1` slots filled with `amount + 1`, a value no real answer reaches (it would take more coins than the amount, even with 1s). Line 3 sets the base case `dp[0] = 0`.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['dp = [amount + 1] * (amount + 1)', 'dp[0] = 0'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 4–5: every amount, every coin',
      body: 'Line 4 walks the amounts from small to big, so smaller answers are ready first. Line 5 tries each coin as the last one paid.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['for a in range(1, amount + 1)', 'for coin in coins'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Relax',
      title: 'Lines 6–7: keep the best last coin',
      body: 'Line 6 skips a coin bigger than `a`. Line 7 is the recurrence: paying `coin` last costs `dp[a − coin] + 1`, and `dp[a]` keeps the smaller of that and what it already has.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['if a >= coin', 'dp[a] = min(dp[a], dp[a - coin] + 1)'],
      scene: at(runIndex(3, 1)),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 8: a count, or −1',
      body: 'If `dp[amount]` still holds the sentinel, no mix of coins reached it, so line 8 returns −1; otherwise it returns the count.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [8] },
      metrics: startMetrics,
      changes: ['return dp[amount] if dp[amount] <= amount else -1'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Every amount × every coin: O(amount · k)',
      body: 'Each of the `amount` slots tries each of the `k` coins once, so it’s **`O(amount · k)` time** and **`O(amount)` space** for the table.\n\nSwitch to **🧪 Try your own** to try other coins, including amounts that can’t be paid.',
      code: { view: 'final', lines: [4, 5, 7] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ coins: COINS, amount: AMOUNT, phase: 'done', dp: FILLED, result: 2, note: `recursion: ${TOTAL_CALLS} calls for amount 6\nthis table: 6 × 3 = 18 checks`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Sentinel',
      title: 'Why the sentinel is amount + 1',
      body: 'The most coins any real answer needs is `amount` (all 1s), so `amount + 1` can never be a real count. `min` then ignores it automatically, and line 8 can spot “never reached” with `<= amount`.\n\nThat is the key decision. Starting at 0 instead would make every amount look free; `amount + 1` keeps the table plain integers, unlike `float("inf")`.',
      code: { view: 'final', lines: [2, 8] },
      values: { 2: 'sentinel = 7 for amount 6', 8: '2 <= 6 → return 2' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ coins: COINS, amount: AMOUNT, phase: 'done', dp: FILLED, result: 2, note: 'no real count is above 6 (all 1s)\nsentinel 7 = “not reachable”\ncoins [2], amount 3: dp[3] stays 4 → −1' }) },
    },
  ],
  trace: {
    title: 'Run coin_change on your own coins',
    inputs: [
      { name: 'coins', label: 'coins (1 to 9)', kind: 'numbers', default: '1, 2, 5' },
      { name: 'amount', label: 'amount (0 to 9)', kind: 'number', default: '7' },
    ],
    presets: [
      { label: 'Lesson example', values: { coins: '1, 3, 4', amount: '6' } },
      { label: 'Impossible', values: { coins: '2', amount: '3' } },
      { label: 'Amount 0', values: { coins: '1', amount: '0' } },
      { label: 'Coins 2, 5', values: { coins: '2, 5', amount: '9' } },
    ],
    maxItems: 3,
    run: (values) => {
      const coins = values['coins'];
      const amount = values['amount'];
      if (!Array.isArray(coins) || coins.length === 0) throw new Error('Enter at least one coin.');
      if (coins.some((c) => c < 1 || c > 9)) throw new Error('Coins go from 1 to 9.');
      if (new Set(coins).size !== coins.length) throw new Error('Enter each coin value once.');
      if (typeof amount !== 'number' || amount < 0 || amount > 9) throw new Error('Pick an amount from 0 to 9, so the table fits on the stage.');
      return traceCoins(coins, amount);
    },
  },
});
