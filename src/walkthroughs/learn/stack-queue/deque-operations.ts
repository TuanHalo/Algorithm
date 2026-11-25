import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const HAND_Y = 84;
const NOTE_Y = 200;

/** One value in the deque. `slot` is its index in `nums`, so it keeps its spot on the floor. */
interface Item {
  readonly slot: number;
  readonly value: number;
}

/** A value just taken off one end, held in front of the slot it came from. */
interface Held {
  readonly slot: number;
  readonly value: number;
}

/**
 * `check`: line 8's loop test. `left` / `right`: lines 9 / 10 took a value off.
 * `match` / `mismatch`: line 11's verdict. `stop`: the loop test failed.
 */
type Phase = 'create' | 'check' | 'left' | 'right' | 'match' | 'mismatch' | 'stop';

interface DequeState {
  readonly items: readonly Item[];
  /** Width of `nums`, so the variables panel never moves. */
  readonly n: number;
  readonly phase?: Phase;
  readonly left?: Held;
  readonly right?: Held;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: the deque (values keep their slots), both ends' pins, values in hand, and the variables. */
function scene(s: DequeState): Entity[] {
  const { items, phase, left, right } = s;
  const start = items[0]?.slot ?? left?.slot ?? Math.floor(s.n / 2);
  const entities: Entity[] = [];
  if (items.length === 0) {
    entities.push(arr('items', start * PITCH, 0, ['—'], { label: 'items', tones: { 0: 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: 'items' }));
  } else {
    const tones: Record<number, Tone> = {};
    items.forEach((_, k) => (tones[k] = 'done'));
    if (phase === 'check' && items.length > 1) {
      tones[0] = 'compare';
      tones[items.length - 1] = 'compare';
    }
    if (phase === 'stop' && items.length === 1) tones[0] = 'muted';
    entities.push(arr('items', start * PITCH, 0, items.map((it) => it.value), { label: 'items', tones, itemKeys: items.map((it) => it.slot), codeVar: 'items' }));
    if (items.length > 1 || phase !== 'stop') {
      entities.push(ptr('front', 'items', 0, 'popleft', { side: 'top', tone: phase === 'check' ? 'compare' : 'done' }));
      entities.push(ptr('back', 'items', items.length - 1, 'pop', { side: 'top', tone: phase === 'check' ? 'compare' : 'done' }));
    }
  }
  const handTone = (side: 'left' | 'right'): Tone => {
    if (phase === 'match') return 'found';
    if (phase === 'mismatch') return 'miss';
    return phase === side ? 'active' : 'done';
  };
  if (left) entities.push(arr('left', left.slot * PITCH, HAND_Y, [left.value], { tones: { 0: handTone('left') }, indexLabels: ['left'], codeVar: 'left' }));
  if (right) entities.push(arr('right', right.slot * PITCH, HAND_Y, [right.value], { tones: { 0: handTone('right') }, indexLabels: ['right'], codeVar: 'right' }));
  if (left && right && (phase === 'match' || phase === 'mismatch')) {
    entities.push(link('look', { entity: 'left', side: 'bottom' }, { entity: 'right', side: 'bottom' }, phase === 'match' ? { label: `${left.value} = ${right.value}`, tone: 'found', flow: true } : { label: `${left.value} ≠ ${right.value}`, tone: 'miss', dashed: true }));
  }

  const rows: VarRow[] = [
    { name: 'len(items)', value: items.length, tone: phase === 'stop' ? 'miss' : phase === 'check' ? 'compare' : 'default' },
    { name: 'left', value: left?.value ?? '—', tone: left ? 'default' : 'muted' },
    { name: 'right', value: right?.value ?? '—', tone: right ? 'default' : 'muted' },
  ];
  entities.push(vars('vals', tableBesideArray(s.n, 3), 0, rows, { label: 'variables', width: 170 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.value).join(', ')}]`;

/** Runs is_palindrome on any input and records one step per decision (chapter "run", final code). */
function tracePalindrome(nums: readonly number[]): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  let items: Item[] = nums.map((value, slot) => ({ slot, value }));
  let pairs = 0;
  let pops = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ pairs, pops, result });

  steps.push({
    chapter: 'run',
    short: 'Copy',
    title: `Load ${show(items)} into a deque`,
    body: `Line 6 copies \`nums\` into \`items\`, a deque. Both ends are now one cheap call away: \`popleft()\` on the left, \`pop()\` on the right.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `items = deque(${show(items)})` },
    metrics: metrics(),
    scene: { entities: scene({ items, n, phase: 'create' }) },
  });

  for (;;) {
    const more = items.length > 1;
    steps.push({
      chapter: 'run',
      short: `len = ${items.length}`,
      title: more ? `${items.length} values left: compare the outer pair` : items.length === 1 ? 'One value left: it pairs with itself' : 'Nothing left to compare',
      body: more
        ? `Line 8: \`len(items) > 1\` (${items.length} > 1) is true, so there is an outer pair: ${items[0]?.value} on the left and ${items[items.length - 1]?.value} on the right.`
        : `Line 8: \`${items.length} > 1\` is false, so the loop ends. ${items.length === 1 ? `The middle value ${items[0]?.value} reads the same both ways.` : 'Every value was matched with its partner.'}`,
      code: { view: 'final', lines: [8] },
      values: { 8: `${items.length} > 1 → ${more ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ items, n, phase: more ? 'check' : 'stop' }) },
    });
    if (!more) break;

    const first = items[0] ?? { slot: 0, value: 0 };
    items = items.slice(1);
    pops += 1;
    const left: Held = { slot: first.slot, value: first.value };
    steps.push({
      chapter: 'run',
      short: `left = ${left.value}`,
      title: `popleft() takes ${left.value} off the left end`,
      body: `Line 9: \`left = items.popleft() = ${left.value}\`. The other values stay where they are; the deque just starts one slot later.`,
      code: { view: 'final', lines: [9] },
      values: { 9: `left = ${left.value}` },
      metrics: metrics(),
      scene: { entities: scene({ items, n, phase: 'left', left }) },
    });

    const lastItem = items[items.length - 1] ?? { slot: 0, value: 0 };
    items = items.slice(0, -1);
    pops += 1;
    const right: Held = { slot: lastItem.slot, value: lastItem.value };
    steps.push({
      chapter: 'run',
      short: `right = ${right.value}`,
      title: `pop() takes ${right.value} off the right end`,
      body: `Line 10: \`right = items.pop() = ${right.value}\`. ${items.length === 0 ? 'The deque is now empty.' : `${items.length} value${items.length === 1 ? '' : 's'} remain${items.length === 1 ? 's' : ''} in between.`}`,
      code: { view: 'final', lines: [10] },
      values: { 10: `right = ${right.value}` },
      metrics: metrics(),
      scene: { entities: scene({ items, n, phase: 'right', left, right }) },
    });

    pairs += 1;
    const same = left.value === right.value;
    steps.push({
      chapter: 'run',
      short: same ? `${left.value} = ${right.value}` : `${left.value} ≠ ${right.value}`,
      title: same ? `${left.value} = ${right.value}: this pair matches` : `${left.value} ≠ ${right.value}: not a palindrome`,
      body: same
        ? `Line 11: \`${left.value} != ${right.value}\` is false. The outer pair mirrors, so it can be forgotten; keep peeling inward.`
        : `Line 11: \`${left.value} != ${right.value}\` is true. Position ${left.slot} and position ${right.slot} should mirror each other, and they don’t.`,
      code: { view: 'final', lines: [11] },
      values: { 11: `${left.value} != ${right.value} → ${same ? 'False' : 'True'}` },
      metrics: metrics(),
      scene: { entities: scene({ items, n, phase: same ? 'match' : 'mismatch', left, right }) },
    });
    if (!same) {
      steps.push({
        chapter: 'run',
        short: 'Return False',
        title: 'Return False',
        body: `Line 12 stops at the first mismatch and returns **False**. The ${items.length} value${items.length === 1 ? '' : 's'} still inside ${items.length === 1 ? 'is' : 'are'} never looked at.`,
        code: { view: 'final', lines: [12] },
        values: { 12: 'return False' },
        metrics: metrics('False'),
        scene: { entities: scene({ items, n, phase: 'mismatch', left, right }) },
      });
      return steps;
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return True',
    title: `Return True: ${show(nums.map((value, slot) => ({ slot, value })))} is a palindrome`,
    body: `Every pair matched, so line 14 returns **True** after ${pairs} comparison${pairs === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [14] },
    values: { 14: 'return True' },
    metrics: metrics('True'),
    scene: { entities: scene({ items, n, phase: 'stop' }) },
  });
  return steps;
}

const NUMS = [1, 2, 3, 2, 1] as const;
const RUN = tracePalindrome(NUMS);
const startMetrics = { pairs: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const ALL: readonly Item[] = NUMS.map((value, slot) => ({ slot, value }));

export default defineWalkthrough({
  id: 'learn/stack-queue/deque-operations',
  title: 'Deque, a line with two open ends',
  summary: 'From the idea to the code: check a palindrome by peeling values off both ends of a deque, where popleft() and pop() are both O(1).',
  minutes: 5,
  code: {
    lang: 'python',
    source: `from collections import deque


def is_palindrome(nums: list[int]) -> bool:
    # A deque pops both ends in O(1), so we can peel inward
    items: deque[int] = deque(nums)

    while len(items) > 1:
        left = items.popleft()
        right = items.pop()
        if left != right:
            return False  # The outer pair doesn't mirror

    return True`,
  },
  snapshots: {
    brute: `def is_palindrome(nums: list[int]) -> bool:
    items = list(nums)
    while len(items) > 1:
        if items.pop(0) != items.pop():  # pop(0) shifts every item
            return False
    return True`,
  },
  metrics: [
    { key: 'pairs', label: 'Pairs compared' },
    { key: 'pops', label: 'Values popped' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'just popped' },
    { tone: 'compare', label: 'the two ends' },
    { tone: 'done', label: 'still in the deque' },
    { tone: 'found', label: 'matching pair' },
    { tone: 'miss', label: 'mismatch / costly shift' },
    { tone: 'muted', label: 'unpaired middle' },
  ],
  goals: [
    { text: 'See why list.pop(0) makes this O(n²)', step: 2 },
    { text: 'Take values off both ends in O(1)', step: 3 },
    { text: 'Follow every pop and comparison', step: BUILD_END + 1 },
    { text: 'Know why the loop stops at one value', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Does [1, 2, 3, 2, 1] read the same both ways?',
      body: 'Like a subway car with doors at both ends: people can get off at the front or the back without squeezing past anyone.\n\nLine 4 gets a list `nums` and returns `True` if it reads the same from both ends (a palindrome). Here it does; `[1, 2, 3, 5, 1]` wouldn’t.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ items: ALL, n: 5, note: 'first = last? 2nd = 2nd-to-last? …\nall pairs equal → True' }) },
    },
    {
      chapter: 'idea',
      short: 'pop(0)',
      title: 'The obvious way: peel a list from both ends',
      body: 'Line 4 compares the first and last values and drops both. `pop()` at the end is cheap, but `pop(0)` shifts **every** remaining value one slot left.\n\nAbout `n/2` peels, each shifting up to `n` values: **`O(n²)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('items', 0, 0, [2, 3, 2, 1], { label: 'items', tones: { 0: 'miss', 1: 'miss', 2: 'miss', 3: 'miss' }, itemKeys: [1, 2, 3, 4], codeVar: 'items' }),
          ...[1, 2, 3].map((k) => link(`shift-${k}`, { entity: 'items', index: k, side: 'bottom' }, { entity: 'items', index: k - 1, side: 'bottom' }, { tone: 'miss', dashed: true })),
          note('note', 0, NOTE_Y, 'pop(0) took the 1: the other 4 values\neach shift one slot left\n≈ n/2 peels × n shifts → O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Two ends',
      title: 'A deque opens at both ends',
      body: 'A `deque` (double-ended queue) can add or remove at **either** end in `O(1)`: `append` / `pop` on the right, `appendleft` / `popleft` on the left. Nothing in between moves.\n\nSo peel the outer pair with `popleft()` and `pop()` until at most one value is left.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: ALL, n: 5, phase: 'check', note: 'popleft() ← [1, 2, 3, 2, 1] → pop()\nboth O(1), nothing shifts\n→ n pops in total: O(n)' }) },
    },
    {
      chapter: 'build',
      short: 'The deque',
      title: 'Lines 1, 5–6: copy the list into a deque',
      body: '`deque(nums)` copies the values once, `O(n)`. The comment says why we pay for that copy.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6], lines: [1, 5, 6] },
      metrics: startMetrics,
      changes: ['from collections import deque', 'items = deque(nums)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Line 8: keep going while a pair is left',
      body: 'A pair needs two values, so the loop runs while `len(items) > 1`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8], lines: [8] },
      metrics: startMetrics,
      changes: ['while len(items) > 1'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Peel',
      title: 'Lines 9–10: take one value off each end',
      body: '`popleft()` removes the leftmost value and `pop()` the rightmost. Each is one `O(1)` call.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['left = items.popleft()', 'right = items.pop()'],
      scene: at(find('right = 1')),
    },
    {
      chapter: 'build',
      short: 'Mismatch',
      title: 'Lines 11–12: one mismatch settles it',
      body: 'If the outer pair differs, the list can’t read the same both ways, so line 12 returns `False` straight away.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['if left != right: return False'],
      scene: at(find('1 = 1')),
    },
    {
      chapter: 'build',
      short: 'All matched',
      title: 'Line 14: every pair mirrored',
      body: 'Reaching line 14 means no pair failed, so the list is a palindrome.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [14] },
      metrics: startMetrics,
      changes: ['return True'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Each value is popped at most once',
      body: 'The copy on line 6 is `O(n)`, and the loop pops each value at most once with `O(1)` calls: **`O(n)` time**. The deque holds a copy of `nums`: **`O(n)` space**.\n\nSwitch to **🧪 Try your own** to test your own lists.',
      code: { view: 'final', lines: [6, 9, 10] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: [{ slot: 2, value: 3 }], n: 5, phase: 'stop', note: '5 values → 4 pops, 2 comparisons\nno value ever shifted\n→ O(n) time, O(n) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why > 1',
      title: 'Why line 8 stops when one value is left',
      body: 'An odd-length list has a middle value with no partner. With `while items:`, line 9 would take the 3 and line 10 would call `pop()` on an **empty** deque: `IndexError`.\n\nThat is the key decision: loop only while a full pair is left, `len(items) > 1`.',
      code: { view: 'final', lines: [8, 9, 10] },
      values: { 8: '> 1: a full pair, never an empty pop' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: [{ slot: 2, value: 3 }], n: 5, phase: 'stop', note: 'while items: popleft() takes 3,\nthen pop() on empty → IndexError\nlen(items) > 1 stops here instead' }) },
    },
  ],
  trace: {
    title: 'Is your list a palindrome?',
    inputs: [{ name: 'nums', label: 'Numbers', kind: 'numbers', default: '4, 7, 7, 4' }],
    presets: [
      { label: 'Odd length', values: { nums: '1, 2, 3, 2, 1' } },
      { label: 'Even length', values: { nums: '4, 7, 7, 4' } },
      { label: 'Mismatch inside', values: { nums: '1, 2, 3, 5, 1' } },
      { label: 'Mismatch at once', values: { nums: '1, 2, 1, 3' } },
      { label: 'One value', values: { nums: '9' } },
    ],
    maxItems: 10,
    run: (values) => {
      const nums = values['nums'];
      if (!Array.isArray(nums) || nums.length === 0) throw new Error('Enter at least one number.');
      return tracePalindrome(nums);
    },
  },
});
