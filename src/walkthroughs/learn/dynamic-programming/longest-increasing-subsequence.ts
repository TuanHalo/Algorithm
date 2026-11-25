import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * `nums` on top, `tails` below it. tails has one slot per possible length;
 * slot k (labelled "len k+1") holds the smallest value that ends an
 * increasing subsequence of length k + 1. Unused slots show `·`.
 */
const TAILS_Y = 130;
const NOTE_Y = 320;

type Phase = 'bare' | 'start' | 'search' | 'check' | 'append' | 'replace' | 'done';

interface LisState {
  readonly nums: readonly number[];
  readonly phase: Phase;
  readonly tails: readonly number[];
  readonly i?: number;
  readonly idx?: number;
  /** The value tails[idx] held before a replace. */
  readonly old?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
  /** Show a dp row (the O(n²) idea) instead of tails. */
  readonly dpRow?: readonly ScalarValue[];
  readonly dpTones?: Readonly<Record<number, Tone>>;
  readonly dpArcs?: readonly (readonly [number, number])[];
}

const DOT = '·';

/** Scene: nums with the current value, tails with its slots, the search arc, and the variables. */
function scene(s: LisState): Entity[] {
  const { nums, phase, i, idx } = s;
  const n = nums.length;
  const numTones: Record<number, Tone> = {};
  nums.forEach((_, k) => {
    if (i !== undefined && k < i) numTones[k] = 'done';
  });
  if (i !== undefined && phase !== 'done') numTones[i] = 'active';
  if (phase === 'done') nums.forEach((_, k) => (numTones[k] = 'done'));
  const entities: Entity[] = [arr('nums', 0, 0, nums, { label: 'nums', tones: numTones, codeVar: 'nums' })];
  if (i !== undefined && phase !== 'done' && phase !== 'start') entities.push(ptr('num', 'nums', i, 'num', { side: 'top', codeVar: 'num' }));

  if (s.dpRow) {
    const tones: Record<number, Tone> = { ...(s.dpTones ?? {}) };
    entities.push(arr('dp', 0, TAILS_Y, s.dpRow, { label: 'dp', tones }));
    for (const [from, to] of s.dpArcs ?? []) {
      entities.push(link(`dp-${from}`, { entity: 'dp', index: from, side: 'bottom' }, { entity: 'dp', index: to, side: 'bottom' }, { tone: 'compare' }));
    }
  } else if (n > 0) {
    const slots: ScalarValue[] = Array.from({ length: n }, (_, k) => s.tails[k] ?? DOT);
    const tones: Record<number, Tone> = {};
    slots.forEach((_, k) => (tones[k] = k < s.tails.length ? 'done' : 'muted'));
    if (idx !== undefined) {
      if (phase === 'search' || phase === 'check') tones[idx] = 'compare';
      if (phase === 'append' || phase === 'replace') tones[idx] = 'found';
    }
    if (phase === 'done') s.tails.forEach((_, k) => (tones[k] = 'found'));
    entities.push(
      arr('tails', 0, TAILS_Y, slots, {
        label: 'tails',
        tones,
        codeVar: 'tails',
        indexLabels: slots.map((_, k) => `len ${k + 1}`),
      }),
    );
    if (idx !== undefined && i !== undefined && (phase === 'search' || phase === 'append' || phase === 'replace')) {
      entities.push(
        link('look', { entity: 'nums', index: i, side: 'bottom' }, { entity: 'tails', index: idx, side: 'top' }, {
          tone: phase === 'search' ? 'compare' : 'found',
          flow: phase !== 'search',
          label: phase === 'search' ? `idx = ${idx}` : phase === 'append' ? 'append' : `${s.old ?? ''} → ${nums[i] ?? ''}`,
        }),
      );
    }
  }

  if (!s.bare) {
    const dash = '—';
    const hasNum = i !== undefined && phase !== 'start' && phase !== 'done';
    entities.push(
      vars(
        'vals',
        tableBesideArray(n, 4),
        0,
        [
          { name: 'num', value: hasNum ? (nums[i] ?? dash) : dash, tone: hasNum ? 'default' : 'muted' },
          { name: 'idx', value: idx ?? dash, tone: idx === undefined ? 'muted' : 'default' },
          { name: 'len(tails)', value: s.tails.length, tone: phase === 'done' ? 'found' : 'default' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Python's bisect_left: the first index whose value is >= x. */
function bisectLeft(a: readonly number[], x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((a[mid] ?? 0) < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Runs length_of_lis(nums) and records one step per decision (chapter "run", final code). */
function traceLis(nums: readonly number[]): Step[] {
  const steps: Step[] = [];
  let appends = 0;
  let replaces = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ appends, replaces, result });
  const tails: number[] = [];

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: 'No subsequence yet',
    body: 'Line 5 starts with an empty `tails`: no length has a best ending yet.',
    code: { view: 'final', lines: [5] },
    values: { 5: 'tails = []' },
    metrics: metrics(),
    scene: { entities: scene({ nums, phase: 'start', tails: [] }) },
  });

  nums.forEach((num, i) => {
    const idx = bisectLeft(tails, num);
    const firstBigger = tails[idx];
    steps.push({
      chapter: 'run',
      short: `${num}: search`,
      title: `Where does ${num} fit? idx = ${idx}`,
      body:
        firstBigger === undefined
          ? `Line 6 takes \`num = ${num}\`. Line 7: \`bisect_left\` searches ${show(tails)} for the first value ≥ ${num} and finds none, so \`idx = ${idx}\`, one past the end.`
          : `Line 6 takes \`num = ${num}\`. Line 7: \`bisect_left\` searches ${show(tails)} for the first value ≥ ${num}: it’s ${firstBigger} at \`idx = ${idx}\`.`,
      code: { view: 'final', lines: [6, 7] },
      values: { 6: `num = ${num}`, 7: `idx = bisect_left(${show(tails)}, ${num}) = ${idx}` },
      metrics: metrics(),
      scene: { entities: scene({ nums, phase: 'search', tails: [...tails], i, idx }) },
    });
    const extend = idx === tails.length;
    steps.push({
      chapter: 'run',
      short: extend ? 'Longer' : 'Same length',
      title: extend ? `${num} is bigger than every tail` : `${num} ends a length-${idx + 1} run better`,
      body: extend
        ? `Line 8: \`${idx} == ${tails.length}\` is true. ${tails.length === 0 ? `Nothing came before, so ${num} starts` : `${num} can follow the length-${tails.length} run ending at ${tails.at(-1)}, making`} a run of length ${tails.length + 1}.`
        : `Line 8: \`${idx} == ${tails.length}\` is false. ${num} can follow the length-${idx} run${idx > 0 ? ` (ending at ${tails[idx - 1]})` : ''}, giving a length-${idx + 1} run that ends lower than ${firstBigger}.`,
      code: { view: 'final', lines: [8] },
      values: { 8: `${idx} == ${tails.length} → ${extend ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ nums, phase: 'check', tails: [...tails], i, idx }) },
    });
    if (extend) {
      tails.push(num);
      appends += 1;
      steps.push({
        chapter: 'run',
        short: 'Append',
        title: `Append ${num}: length ${tails.length}`,
        body: `Line 9 appends it: \`tails = ${show(tails)}\`. The longest increasing subsequence so far has length ${tails.length}.`,
        code: { view: 'final', lines: [9] },
        values: { 9: `tails = ${show(tails)}` },
        metrics: metrics(),
        scene: { entities: scene({ nums, phase: 'append', tails: [...tails], i, idx }) },
      });
    } else {
      const old = tails[idx] ?? 0;
      tails[idx] = num;
      replaces += 1;
      steps.push({
        chapter: 'run',
        short: 'Replace',
        title: `tails[${idx}]: ${old} → ${num}`,
        body: `Line 11 overwrites the tail: \`tails[${idx}] = ${num}\`. Same lengths as before, but a length-${idx + 1} run now ends lower, so more values can follow it later.`,
        code: { view: 'final', lines: [10, 11] },
        values: { 11: `tails = ${show(tails)}` },
        metrics: metrics(),
        scene: { entities: scene({ nums, phase: 'replace', tails: [...tails], i, idx, old }) },
      });
    }
  });

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Longest increasing subsequence: ${tails.length}`,
    body: `Every value is placed. Line 12 returns \`len(tails)\` = **${tails.length}**, after ${appends} append${appends === 1 ? '' : 's'} and ${replaces} replace${replaces === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [12] },
    values: { 12: `return ${tails.length}` },
    metrics: metrics(tails.length),
    scene: { entities: scene({ nums, phase: 'done', tails: [...tails] }) },
  });
  return steps;
}

const NUMS = [10, 9, 2, 5, 3, 7, 101, 18] as const;
const RUN = traceLis(NUMS);
const startMetrics = { appends: 0, replaces: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
/** dp[i] of the O(n²) version for NUMS. */
const DP = [1, 1, 1, 2, 2, 3, 4, 4] as const;

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

/** Run index of the first step (search) for nums[i]. */
const stepOf = (i: number): number => {
  let k = 1;
  const tails: number[] = [];
  for (let j = 0; j < i; j += 1) {
    const num = NUMS[j] ?? 0;
    const idx = bisectLeft(tails, num);
    if (idx === tails.length) tails.push(num);
    else tails[idx] = num;
    k += 3;
  }
  return k;
};

export default defineWalkthrough({
  id: 'learn/dynamic-programming/longest-increasing-subsequence',
  title: 'Longest Increasing Subsequence, with the smallest tails',
  summary: 'From the idea to the code: find the length of the longest strictly increasing subsequence by keeping, for every length, the smallest value that can end it.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `from bisect import bisect_left


def length_of_lis(nums: list[int]) -> int:
    tails: list[int] = []
    for num in nums:
        idx = bisect_left(tails, num)
        if idx == len(tails):
            tails.append(num)
        else:
            tails[idx] = num  # Lower tail keeps same length, widens future options
    return len(tails)`,
  },
  snapshots: {
    quadratic: `def length_of_lis(nums: list[int]) -> int:
    dp = [1] * len(nums)  # dp[i]: longest run that ends at nums[i]
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp, default=0)`,
  },
  metrics: [
    { key: 'appends', label: 'Appends' },
    { key: 'replaces', label: 'Replaces' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'num' },
    { tone: 'compare', label: 'search result / read' },
    { tone: 'done', label: 'placed' },
    { tone: 'muted', label: 'unused length' },
    { tone: 'found', label: 'tail just written / answer' },
  ],
  goals: [
    { text: 'Build the O(n²) recurrence dp[i]', step: 2 },
    { text: 'Keep the smallest tail for every length', step: 3 },
    { text: 'Watch a smaller value replace a tail', step: BUILD_END + stepOf(1) + 3 },
    { text: 'Know why tails is not the subsequence itself', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The longest increasing subsequence',
      body: 'A subsequence keeps the order but may skip values. Line 4 takes `nums` and returns the length of the longest one whose values **strictly increase**.\n\nHere `[10, 9, 2, 5, 3, 7, 101, 18]` gives **4**, for example `2, 3, 7, 18`.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: [arr('nums', 0, 0, NUMS, { label: 'nums', codeVar: 'nums', tones: { 2: 'found', 4: 'found', 5: 'found', 7: 'found' } }), note('note', 0, NOTE_Y, '2 → 3 → 7 → 18: length 4\nskipping is fine, order is not')] },
    },
    {
      chapter: 'idea',
      short: 'dp[i]',
      title: 'The obvious DP: the best run ending at each value',
      body: 'Trying all `2ⁿ` subsequences is hopeless. Instead let `dp[i]` be the longest run that **ends at** `nums[i]`: look back at every smaller earlier value and extend the best one, **dp[i] = 1 + max dp[j]** for `j < i` with `nums[j] < nums[i]`.\n\nThat’s two nested loops (lines 3–6): **`O(n²)`**.',
      code: { view: 'snapshot', id: 'quadratic', lines: [4, 5, 6] },
      metrics: startMetrics,
      scene: {
        entities: [
          ...scene({
            nums: NUMS,
            phase: 'bare',
            tails: [],
            i: 5,
            bare: true,
            dpRow: DP,
            dpTones: { 0: 'muted', 1: 'muted', 2: 'compare', 3: 'compare', 4: 'compare', 5: 'active', 6: 'muted', 7: 'muted' },
            dpArcs: [
              [2, 5],
              [3, 5],
              [4, 5],
            ],
          }),
          note('note', 0, NOTE_Y, 'dp[5] (value 7): smaller before it: 2, 5, 3\n1 + max(1, 2, 2) = 3\nn values → ~n²/2 looks back'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Tails',
      title: 'Faster: for each length, remember only the smallest tail',
      body: 'Two runs of the same length aren’t equal: the one ending lower is better, because more values can follow it. So keep `tails[k]` = **the smallest value that ends an increasing run of length k + 1**.\n\n`tails` always increases, so binary search finds where a new value fits: **`O(log n)`** per value.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ nums: NUMS, phase: 'search', tails: [2, 3, 7], i: 7, idx: 3, bare: true, note: 'runs of length 2: [2, 5] and [2, 3]\nkeep 3: anything > 3 can follow it\ntails = [2, 3, 7] is sorted' }) },
    },
    {
      chapter: 'idea',
      short: 'Place it',
      title: 'Each new value either extends or lowers a tail',
      body: 'Find the first tail ≥ the new value. If there is none, the value is bigger than every tail: it **extends** the longest run. Otherwise it **replaces** that tail, giving a run of the same length that ends lower.\n\nThe answer is simply how many tails there are.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ nums: NUMS, phase: 'replace', tails: [2, 3, 7, 18], i: 7, idx: 3, old: 101, bare: true, note: '18: first tail ≥ 18 is 101\n→ replace: [2, 3, 7, 18]\nstill length 4, but ends lower' }) },
    },
    {
      chapter: 'build',
      short: 'Empty',
      title: 'Line 5: no tails yet',
      body: '`tails` starts empty: before any value, no length has an ending.',
      code: { view: 'reveal', reveal: [1, 4, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['tails = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Search',
      title: 'Lines 6–7: binary search for each value',
      body: 'Line 6 visits every value. Line 7 uses `bisect_left` (imported on line 1) to find `idx`, the first tail ≥ `num`, or `len(tails)` if none is.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['for num in nums', 'idx = bisect_left(tails, num)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Extend',
      title: 'Lines 8–9: bigger than every tail, so extend',
      body: 'When `idx == len(tails)`, `num` beats every tail and line 9 appends it: the longest run grows by one.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['if idx == len(tails): tails.append(num)'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Replace',
      title: 'Lines 10–11: otherwise lower that tail',
      body: 'Otherwise `tails[idx]` is the first tail ≥ `num`; line 11 swaps it for the smaller `num`. The lengths stay, the ending gets lower.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['else: tails[idx] = num'],
      scene: at(stepOf(1) + 2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 12: the number of tails is the answer',
      body: '`tails` has one slot per length reached, so line 12 returns `len(tails)`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [12] },
      metrics: startMetrics,
      changes: ['return len(tails)'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One binary search per value: O(n log n)',
      body: 'Each of the `n` values costs one `bisect_left` on a list of at most `n` tails, so it’s **`O(n log n)` time** and **`O(n)` space** for `tails`. The `dp[i]` version looks back at every earlier value: `O(n²)`.\n\nSwitch to **🧪 Try your own** to try sorted, reversed and repeated values.',
      code: { view: 'final', lines: [6, 7] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ nums: NUMS, phase: 'done', tails: [2, 3, 7, 18], note: '8 values: 8 searches of ≤ 3 probes\ndp[i] version: 28 looks back\nn = 10⁵: ~1.7·10⁶ vs 5·10⁹', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Not the LIS',
      title: 'Why line 11 overwrites, and what tails is not',
      body: 'Replacing a tail never changes a length, it only lowers the bar for later values: after 3 replaces 5, a later 4 could still make a length-3 run. That is the key decision.\n\nSo `tails` holds the best ending per length, not one real subsequence: for `[3, 4, 1]` it ends as `[1, 4]`, yet 1 comes after 4. The length is right; to print the run, store parent links.',
      code: { view: 'final', lines: [10, 11] },
      values: { 11: 'tails[1] = 3 (was 5)' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ nums: NUMS, phase: 'replace', tails: [2, 3], i: 4, idx: 1, old: 5, note: '5 → 3: still a length-2 run\nbut now 4, 5 or 6 could follow it\n[3, 4, 1] → tails [1, 4]: length only' }) },
    },
  ],
  trace: {
    title: 'Run length_of_lis on your own numbers',
    inputs: [{ name: 'nums', label: 'Numbers', kind: 'numbers', default: '0, 1, 0, 3, 2, 3' }],
    presets: [
      { label: 'Lesson example', values: { nums: '10, 9, 2, 5, 3, 7, 101, 18' } },
      { label: 'All equal', values: { nums: '7, 7, 7, 7' } },
      { label: 'Decreasing', values: { nums: '5, 4, 3, 2, 1' } },
      { label: 'Increasing', values: { nums: '1, 2, 3, 4, 5' } },
      { label: 'Single value', values: { nums: '42' } },
    ],
    maxItems: 10,
    run: (values) => {
      const nums = values['nums'];
      if (!Array.isArray(nums) || nums.length === 0) throw new Error('Enter at least one number.');
      return traceLis(nums);
    },
  },
});
