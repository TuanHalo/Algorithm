import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const DQ_Y = 130;
const MAXES_Y = 260;
const NOTE_Y = 380;
const ROWS = 5;

/**
 * `expire?` / `expired`: line 9's verdict on the front. `evicted`: line 10 removed it.
 * `back?` / `keep`: line 11's verdict on the back. `popped`: line 12 removed it.
 * `appended`: line 13. `full?` / `notfull`: line 14's verdict. `record`: line 15. `done`: line 17.
 */
type Phase = 'create' | 'expire?' | 'expired' | 'evicted' | 'back?' | 'keep' | 'popped' | 'appended' | 'full?' | 'notfull' | 'record' | 'done';

interface WindowState {
  readonly nums: readonly number[];
  readonly k: number;
  /** Indices in the deque, front → back. */
  readonly dq: readonly number[];
  /** How many indices left through the front so far: the deque's first floor slot. */
  readonly evictions: number;
  readonly maxes: readonly number[];
  readonly phase?: Phase;
  readonly idx?: number;
  /** Index just removed (line 10 or 12), drawn as a miss on `nums`. */
  readonly gone?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: `nums` with the window band, the index deque `dq`, `maxes`, and the variables. */
function scene(s: WindowState): Entity[] {
  const { nums, k, dq, maxes, phase, idx, gone } = s;
  const n = nums.length;
  const front = dq[0];
  const back = dq[dq.length - 1];

  const nTones: Record<number, Tone> = {};
  if (idx !== undefined && phase !== 'done') nTones[idx] = 'active';
  if ((phase === 'expire?' || phase === 'expired') && front !== undefined) nTones[front] = phase === 'expired' ? 'miss' : 'compare';
  if ((phase === 'back?' || phase === 'keep') && back !== undefined && back !== idx) nTones[back] = phase === 'back?' ? 'compare' : 'miss';
  if ((phase === 'evicted' || phase === 'popped') && gone !== undefined) nTones[gone] = 'muted';
  if (phase === 'record' && front !== undefined) nTones[front] = 'found';

  const entities: Entity[] = [arr('nums', 0, 0, nums, { label: 'nums', tones: nTones, codeVar: 'nums' })];
  if (idx !== undefined && phase !== 'done') {
    entities.push(range('window', 'nums', Math.max(0, idx - k + 1), idx, 'compare'));
    entities.push(ptr('idx', 'nums', idx, 'idx', { side: 'top', tone: 'active', codeVar: 'idx' }));
  }

  const dqX = s.evictions * PITCH;
  if (dq.length === 0) {
    entities.push(arr('dq', dqX, DQ_Y, ['—'], { label: 'dq', tones: { 0: 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: 'dq' }));
  } else {
    const dTones: Record<number, Tone> = {};
    dq.forEach((_, j) => (dTones[j] = 'done'));
    if (phase === 'expire?') dTones[0] = 'compare';
    if (phase === 'expired') dTones[0] = 'miss';
    if (phase === 'back?') dTones[dq.length - 1] = 'compare';
    if (phase === 'keep' && back !== idx) dTones[dq.length - 1] = 'miss';
    if (phase === 'appended') dTones[dq.length - 1] = 'active';
    if (phase === 'record') dTones[0] = 'found';
    entities.push(
      arr('dq', dqX, DQ_Y, dq, { label: 'dq', tones: dTones, itemKeys: dq.map((i) => `i${i}`), indexLabels: dq.map((i) => `nums=${nums[i]}`), codeVar: 'dq' }),
      ptr('front', 'dq', 0, 'front', { side: 'top', tone: phase === 'expire?' ? 'compare' : phase === 'record' ? 'found' : 'done' }),
      ptr('back', 'dq', dq.length - 1, 'back', { side: 'bottom', tone: phase === 'back?' ? 'compare' : 'done' }),
    );
  }

  if (maxes.length === 0) {
    entities.push(arr('maxes', 0, MAXES_Y, ['—'], { label: 'maxes', tones: { 0: 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: 'maxes' }));
  } else {
    const mTones: Record<number, Tone> = {};
    maxes.forEach((_, j) => (mTones[j] = phase === 'done' ? 'found' : 'done'));
    if (phase === 'record') mTones[maxes.length - 1] = 'active';
    entities.push(arr('maxes', 0, MAXES_Y, maxes, { label: 'maxes', tones: mTones, itemKeys: maxes.map((_, j) => `m${j}`), codeVar: 'maxes' }));
    if (phase === 'record' && front !== undefined) {
      entities.push(link('write', { entity: 'dq', index: 0, side: 'bottom' }, { entity: 'maxes', index: maxes.length - 1, side: 'top' }, { label: `max = ${nums[front]}`, tone: 'found', flow: true }));
    }
  }

  const cell = (v: number | undefined): ScalarValue => (v === undefined ? '—' : v);
  const live = idx !== undefined && phase !== 'done';
  const rows: VarRow[] = [
    { name: 'idx', value: live ? cell(idx) : '—', tone: live ? 'default' : 'muted' },
    { name: 'val', value: live && idx !== undefined ? cell(nums[idx]) : '—', tone: live ? 'default' : 'muted' },
    { name: 'idx - k', value: live && idx !== undefined ? idx - k : '—', tone: !live ? 'muted' : phase === 'expire?' || phase === 'expired' ? 'compare' : 'default' },
    { name: 'dq[0]', value: cell(front), tone: front === undefined ? 'muted' : phase === 'expired' ? 'miss' : 'default' },
    { name: 'nums[dq[-1]]', value: back === undefined ? '—' : cell(nums[back]), tone: back === undefined ? 'muted' : phase === 'back?' ? 'compare' : 'default' },
  ];
  entities.push(vars('vals', tableBesideArray(n, ROWS), 0, rows, { label: 'variables', width: 190 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Runs sliding_window_max on any input, one step per decision (chapter "run", final code). */
function traceWindowMax(nums: readonly number[], k: number): Step[] {
  const steps: Step[] = [];
  const dq: number[] = [];
  const maxes: number[] = [];
  let evictions = 0;
  let pops = 0;
  const metrics = (answer: ScalarValue = '—'): Record<string, ScalarValue> => ({ evictions, pops, result: answer });
  const snap = (extra: Omit<WindowState, 'nums' | 'k' | 'dq' | 'evictions' | 'maxes'>): WindowState => ({ nums, k, dq: [...dq], evictions, maxes: [...maxes], ...extra });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `An empty deque, no maxima yet (k = ${k})`,
    body: 'Line 5 starts `dq`, the indices that could still be a window’s maximum. Line 6 starts the answer list `maxes`.',
    code: { view: 'final', lines: [5, 6] },
    values: { 5: 'dq = deque([])', 6: 'maxes = []' },
    metrics: metrics(),
    scene: { entities: scene(snap({ phase: 'create' })) },
  });

  nums.forEach((val, idx) => {
    const edge = idx - k;
    const front = dq[0];
    const expired = front !== undefined && front <= edge;
    steps.push({
      chapter: 'run',
      short: `idx ${idx}: front`,
      title: front === undefined ? `idx = ${idx}: the deque is empty` : expired ? `Index ${front} has left the window` : `Index ${front} is still in the window`,
      body:
        front === undefined
          ? `Line 8 moves to \`idx = ${idx}\`, \`val = ${val}\`. Line 9: \`dq\` is empty, so nothing can have expired.`
          : `Line 8 moves to \`idx = ${idx}\`, \`val = ${val}\`. The window is now indices ${Math.max(0, idx - k + 1)}–${idx}. Line 9: \`dq[0] = ${front}\`, and \`${front} <= ${edge}\` is ${expired ? 'true: it is left of the window' : 'false: it is inside'}.`,
      code: { view: 'final', lines: [8, 9] },
      values: { 8: `idx = ${idx}, val = ${val}`, 9: front === undefined ? 'dq → empty, False' : `${front} <= ${idx} - ${k} → ${expired ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: expired ? 'expired' : 'expire?', idx })) },
    });
    if (expired && front !== undefined) {
      dq.shift();
      evictions += 1;
      steps.push({
        chapter: 'run',
        short: `evict ${front}`,
        title: `popleft(): index ${front} leaves through the front`,
        body: `Line 10 removes index ${front} (value ${nums[front]}). It may have been the biggest, but it’s no longer in the window, so it can’t be this window’s answer.`,
        code: { view: 'final', lines: [10] },
        values: { 10: `popleft() → ${front}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'evicted', idx, gone: front })) },
      });
    }

    for (;;) {
      const back = dq[dq.length - 1];
      if (back === undefined) {
        steps.push({
          chapter: 'run',
          short: `idx ${idx}: back`,
          title: 'Nothing at the back to compare',
          body: `Line 11: \`dq\` is empty, so ${val} has no older value to beat.`,
          code: { view: 'final', lines: [11] },
          values: { 11: 'dq → empty, False' },
          metrics: metrics(),
          scene: { entities: scene(snap({ phase: 'keep', idx })) },
        });
        break;
      }
      const backVal = nums[back] ?? 0;
      const weaker = backVal <= val;
      steps.push({
        chapter: 'run',
        short: weaker ? `${backVal} ≤ ${val}` : `${backVal} > ${val}`,
        title: weaker ? `${backVal} ≤ ${val}: index ${back} can never win again` : `${backVal} > ${val}: keep index ${back}`,
        body: weaker
          ? `Line 11: the back is index ${back} with ${backVal}, and \`${backVal} <= ${val}\`. ${val} is at least as big and stays in the window longer, so ${backVal} can never be a maximum again.`
          : `Line 11: the back is index ${back} with ${backVal}, and \`${backVal} <= ${val}\` is false. ${backVal} is bigger, so it may still be a maximum: stop popping.`,
        code: { view: 'final', lines: [11] },
        values: { 11: `${backVal} <= ${val} → ${weaker ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: weaker ? 'back?' : 'keep', idx })) },
      });
      if (!weaker) break;
      dq.pop();
      pops += 1;
      steps.push({
        chapter: 'run',
        short: `pop ${back}`,
        title: `pop(): index ${back} leaves through the back`,
        body: `Line 12 drops index ${back}. ${dq.length ? `The values left in \`dq\` read ${show(dq.map((i) => nums[i] ?? 0))}.` : 'The deque is empty.'}`,
        code: { view: 'final', lines: [12] },
        values: { 12: `pop() → ${back}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'popped', idx, gone: back })) },
      });
    }

    dq.push(idx);
    steps.push({
      chapter: 'run',
      short: `append ${idx}`,
      title: `Append index ${idx} at the back`,
      body: `Line 13 adds index ${idx}. The values in \`dq\` read ${show(dq.map((i) => nums[i] ?? 0))}: decreasing from front to back.`,
      code: { view: 'final', lines: [13] },
      values: { 13: `dq = deque(${show(dq)})` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: 'appended', idx })) },
    });

    const full = idx >= k - 1;
    steps.push({
      chapter: 'run',
      short: full ? `idx ${idx}: full` : `idx ${idx}: not yet`,
      title: full ? `The window ${Math.max(0, idx - k + 1)}–${idx} is complete` : `Only ${idx + 1} of ${k} values so far`,
      body: full
        ? `Line 14: \`${idx} >= ${k - 1}\` is true, so this window has all ${k} values and gets an answer.`
        : `Line 14: \`${idx} >= ${k - 1}\` is false. The first window isn’t full yet, so there is no answer to record.`,
      code: { view: 'final', lines: [14] },
      values: { 14: `${idx} >= ${k - 1} → ${full ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: full ? 'full?' : 'notfull', idx })) },
    });
    if (full) {
      const best = nums[dq[0] ?? 0] ?? 0;
      maxes.push(best);
      steps.push({
        chapter: 'run',
        short: `max = ${best}`,
        title: `The window’s maximum is at the front: ${best}`,
        body: `Line 15 appends \`nums[dq[0]] = nums[${dq[0]}] = ${best}\`. No scan: the front of \`dq\` is always the biggest value still in the window.`,
        code: { view: 'final', lines: [15] },
        values: { 15: `maxes = ${show(maxes)}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'record', idx })) },
      });
    }
  });

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${show(maxes)}`,
    body: `Every window got its maximum. Line 17 returns **${show(maxes)}**.`,
    code: { view: 'final', lines: [17] },
    values: { 17: `return ${show(maxes)}` },
    metrics: metrics(show(maxes)),
    scene: { entities: scene(snap({ phase: 'done' })) },
  });
  return steps;
}

const NUMS = [4, 2, 3, 1] as const;
const K = 3;
const RUN = traceWindowMax(NUMS, K);
const startMetrics = { evictions: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 10;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const ENDING: WindowState = { nums: NUMS, k: K, dq: [2, 3], evictions: 1, maxes: [4, 3] };

export default defineWalkthrough({
  id: 'learn/stack-queue/monotonic-queue',
  title: 'Monotonic Queue, sliding window maximum',
  summary: 'From the idea to the code: the maximum of every window of size k in one pass, with a deque of indices whose values decrease from front to back.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `from collections import deque


def sliding_window_max(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()  # Indices; their values decrease front → back
    maxes: list[int] = []

    for idx, val in enumerate(nums):
        if dq and dq[0] <= idx - k:
            dq.popleft()  # Index dq[0] slid out of the window
        while dq and nums[dq[-1]] <= val:
            dq.pop()  # Smaller and older: it can never be the max again
        dq.append(idx)
        if idx >= k - 1:
            maxes.append(nums[dq[0]])

    return maxes`,
  },
  snapshots: {
    brute: `def sliding_window_max(nums: list[int], k: int) -> list[int]:
    maxes = []
    for end in range(k - 1, len(nums)):
        window = nums[end - k + 1:end + 1]
        maxes.append(max(window))  # k reads for every window
    return maxes`,
  },
  metrics: [
    { key: 'evictions', label: 'Front evictions' },
    { key: 'pops', label: 'Back pops' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'current value / just added' },
    { tone: 'compare', label: 'window / end being checked' },
    { tone: 'done', label: 'kept in dq / recorded' },
    { tone: 'found', label: 'window maximum' },
    { tone: 'miss', label: 'expired / not popped / re-scan' },
    { tone: 'muted', label: 'just removed' },
  ],
  goals: [
    { text: 'See why re-scanning every window is O(n·k)', step: 2 },
    { text: 'Work out the window edges idx − k and k − 1', step: 4 },
    { text: 'Follow every eviction, pop and record', step: BUILD_END + 1 },
    { text: 'Know why smaller older values are thrown away', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The maximum of every window of 3',
      body: 'Like a leaderboard of the last `k` minutes: old scores drop off as time moves on, and an older, lower score is useless once a higher one arrives.\n\nLine 4 gets `nums` and a window size `k` and returns the maximum of every `k` consecutive values. For `[4, 2, 3, 1]` and `k = 3` the windows are `[4, 2, 3]` and `[2, 3, 1]`: answer `[4, 3]`.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: [...scene({ ...ENDING, phase: 'done' }), note('note', 0, NOTE_Y, '[4, 2, 3] → 4\n[2, 3, 1] → 3')] },
    },
    {
      chapter: 'idea',
      short: 'Re-scan',
      title: 'The obvious way: take max() of every window',
      body: 'Line 4 cuts out each window and line 5 scans all `k` values for its maximum. Neighbouring windows share `k − 1` values, but each scan starts from scratch.\n\n`n − k + 1` windows × `k` reads: **`O(n·k)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [4, 5] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 1: 'miss', 2: 'miss' }, codeVar: 'nums' }),
          range('window', 'nums', 1, 3, 'compare'),
          note('note', 0, NOTE_Y, '2 and 3 were read for window 1\nand are read again for window 2\nn − k + 1 windows × k reads', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Candidates',
      title: 'Keep only the values that could still win',
      body: 'When 3 arrives, the older 2 can never be a maximum again: 3 is bigger and stays in the window longer. So keep a deque of **candidates**, whose values decrease from front to back, and drop smaller ones from the back as each value arrives.\n\nThe front is then the biggest candidate: the window’s maximum. It only leaves when it slides out of the window.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(find('2 ≤ 3')),
    },
    {
      chapter: 'idea',
      short: 'Edges',
      title: 'Where the window starts and when it is full',
      body: 'The window ending at `idx` holds `k` indices: `idx − k + 1` up to `idx`. So an index at or below **`idx − k`** is to its left and has expired: with `k = 3` at `idx = 3`, index 0 is out (`0 <= 0`).\n\nThe first window ends at index **`k − 1`** (indices 0, 1, 2), so answers start once `idx >= k − 1`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: at(find('idx 3: front')),
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 1, 5–6: a deque of indices and the answers',
      body: '`dq` stores **indices**, so we can tell when one has left the window. The comment states the order the loop keeps.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6], lines: [1, 5, 6] },
      metrics: startMetrics,
      changes: ['dq = deque()', 'maxes = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Expire',
      title: 'Lines 8–10: drop the front once it slides out',
      body: 'The front is the oldest candidate. Line 9 uses the `idx − k` edge from the idea; only one index can expire per step, so an `if` is enough.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10], lines: [8, 9, 10] },
      metrics: startMetrics,
      changes: ['for idx, val in enumerate(nums)', 'if dq and dq[0] <= idx - k: dq.popleft()'],
      scene: at(find('evict 0')),
    },
    {
      chapter: 'build',
      short: 'Pop back',
      title: 'Lines 11–12: drop smaller values from the back',
      body: 'While the back’s value is no bigger than `val`, it can never win again, so it goes. This keeps the deque decreasing.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['while dq and nums[dq[-1]] <= val: dq.pop()'],
      scene: at(find('pop 1')),
    },
    {
      chapter: 'build',
      short: 'Append',
      title: 'Line 13: the newcomer is always a candidate',
      body: 'It’s the newest value, so it might be the maximum of a later window.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10, 11, 12, 13], lines: [13] },
      metrics: startMetrics,
      changes: ['dq.append(idx)'],
      scene: at(find('append 2')),
    },
    {
      chapter: 'build',
      short: 'Record',
      title: 'Lines 14–15: once the window is full, read the front',
      body: 'The `k − 1` edge from the idea. The answer is `nums[dq[0]]`, read without any scan.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15], lines: [14, 15] },
      metrics: startMetrics,
      changes: ['if idx >= k - 1: maxes.append(nums[dq[0]])'],
      scene: at(find('max = 4')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 17: one answer per window',
      body: '`maxes` ends with `n − k + 1` values.\n\nThat’s the whole function. Now let’s run it on `[4, 2, 3, 1]` with `k = 3`.',
      code: { view: 'final', lines: [17] },
      metrics: startMetrics,
      changes: ['return maxes'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each index enters once and leaves at most once',
      body: 'Every index is appended once (line 13) and removed at most once, from the front (line 10) or the back (line 12). So all the loop’s pops add up to at most `n`: **`O(n)` time** whatever `k` is. The deque never holds more than `k` indices: **`O(k)` extra space**.\n\nSwitch to **🧪 Try your own** to try other lists and window sizes.',
      code: { view: 'final', lines: [10, 12, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...ENDING, phase: 'done', note: '4 appends, 1 eviction, 1 back pop\n≤ n removals in total\n→ O(n) time, O(k) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why pop',
      title: 'Why line 12 throws away smaller, older values',
      body: 'A value that is smaller **and** older than `val` leaves the window first and is beaten by `val` until then, so it can never be a maximum. Removing it keeps the deque decreasing, which is what puts the maximum at `dq[0]`.\n\nThat is the key decision: drop hopeless candidates at the back, and the answer is always waiting at the front.',
      code: { view: 'final', lines: [11, 12, 15] },
      values: { 12: 'hopeless: smaller and leaves sooner', 15: 'so the front is always the max' },
      metrics: FINAL_METRICS,
      scene: at(find('pop 1')),
    },
  ],
  trace: {
    title: 'Slide a window over your own numbers',
    inputs: [
      { name: 'nums', label: 'Numbers', kind: 'numbers', default: '1, 3, -1, -3, 5, 3, 6, 7' },
      { name: 'k', label: 'Window size k', kind: 'number', default: '3' },
    ],
    presets: [
      { label: 'Standard (k = 3)', values: { nums: '1, 3, -1, -3, 5, 3, 6, 7', k: '3' } },
      { label: 'Strictly decreasing', values: { nums: '9, 7, 5, 3, 1', k: '3' } },
      { label: 'Strictly increasing', values: { nums: '1, 2, 3, 4, 5, 6', k: '3' } },
      { label: 'Narrow window (k = 2)', values: { nums: '4, 2, 7, 1, 5', k: '2' } },
    ],
    maxItems: 10,
    run: (values) => {
      const nums = values['nums'];
      const k = values['k'];
      if (!Array.isArray(nums) || nums.length === 0) throw new Error('Enter at least one number.');
      if (typeof k !== 'number' || !Number.isInteger(k) || k < 1 || k > nums.length) throw new Error(`Use a window size from 1 to ${Array.isArray(nums) ? nums.length : 1}.`);
      return traceWindowMax(nums, k);
    },
  },
});
