import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/**
 * What the scene shows about the pair under the pointers:
 * `look` reading only, `dup` / `new` after line 7's verdict, `advance` after line 8,
 * `write` after line 9, `done` once the loop is over.
 */
type Phase = 'look' | 'dup' | 'new' | 'advance' | 'write' | 'done';

interface FastSlowState {
  /** The list as Python holds it right now (values are copied, so no item keys). */
  readonly values: readonly number[];
  readonly slow?: number;
  readonly fast?: number;
  readonly phase?: Phase;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Array id: `nums` for the story input, another id for a different example input. */
  readonly arrayId?: string;
}

/** Scene for one moment: the kept prefix, the reader and writer pointers, and the variables. */
function scene(s: FastSlowState): Entity[] {
  const id = s.arrayId ?? 'nums';
  const tones: Record<number, Tone> = {};
  const { slow, fast, phase } = s;
  if (slow !== undefined) {
    for (let k = 0; k <= slow; k += 1) tones[k] = 'done';
    // Values past the kept part that the reader has already passed: duplicates, or leftovers at the end.
    const passedTo = phase === 'done' ? s.values.length - 1 : (fast ?? 0) - 1;
    for (let k = slow + 1; k <= passedTo; k += 1) tones[k] = 'muted';
  }
  if (fast !== undefined && slow !== undefined && phase !== 'done') {
    if (phase === 'write') {
      tones[fast] = 'compare';
      tones[slow] = 'active';
    } else {
      tones[slow] = 'compare';
      tones[fast] = 'active';
    }
  }

  const entities: Entity[] = [arr(id, 0, 0, s.values, { label: 'nums', tones, codeVar: 'nums' })];
  if (slow !== undefined) entities.push(ptr('slow', id, slow, 'slow', { tone: 'done', codeVar: 'slow' }));
  if (fast !== undefined && phase !== 'done') entities.push(ptr('fast', id, fast, 'fast', { side: 'top', tone: 'active', codeVar: 'fast' }));

  if (fast !== undefined && slow !== undefined && slow !== fast) {
    const read = s.values[fast];
    if (phase === 'dup') {
      entities.push(link('look', { entity: id, index: fast, side: 'top' }, { entity: id, index: slow, side: 'top' }, { label: `${read}? same`, tone: 'miss', dashed: true }));
    } else if (phase === 'new' || phase === 'advance') {
      entities.push(link('look', { entity: id, index: fast, side: 'top' }, { entity: id, index: phase === 'new' ? slow : slow - 1, side: 'top' }, { label: `${read}? new`, tone: 'compare' }));
    } else if (phase === 'write') {
      entities.push(link('copy', { entity: id, index: fast, side: 'top' }, { entity: id, index: slow, side: 'top' }, { label: `copy ${read}`, tone: 'active', flow: true }));
    }
  }

  const cell = (i: number | undefined): number | string => (i === undefined ? '—' : (s.values[i] ?? '—'));
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'slow', value: slow ?? '—', tone: slow === undefined ? 'muted' : 'default' },
        { name: 'fast', value: phase === 'done' ? '—' : (fast ?? '—'), tone: fast === undefined || phase === 'done' ? 'muted' : 'default' },
        { name: 'nums[slow]', value: cell(slow), tone: slow === undefined ? 'muted' : 'default' },
        { name: 'nums[fast]', value: phase === 'done' ? '—' : cell(fast), tone: fast === undefined || phase === 'done' ? 'muted' : phase === 'dup' ? 'miss' : 'default' },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

/** Runs remove_duplicates on any input and records one step per decision (chapter "run", final code). */
function traceFastSlow(input: readonly number[]): Step[] {
  const values = [...input].sort((a, b) => a - b);
  const wasSorted = values.every((v, i) => v === input[i]);
  const steps: Step[] = [];
  let reads = 0;
  let writes = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ reads, writes, result });

  let slow = 0;
  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Keep the first value of ${show(values)}`,
    body: `${wasSorted ? '' : 'This needs sorted input, so the numbers were sorted first.\n\n'}Line 2: the list isn’t empty. Line 5: \`slow = 0\`, so the kept part is just \`nums[0] = ${values[0]}\`. The first value is always unique.`,
    code: { view: 'final', lines: [2, 5] },
    values: { 2: 'not nums → False', 5: 'slow = 0' },
    metrics: metrics(),
    scene: { entities: scene({ values: [...values], slow }) },
  });

  for (let fast = 1; fast < values.length; fast += 1) {
    const a = values[fast] ?? 0;
    const b = values[slow] ?? 0;
    reads += 1;
    if (a === b) {
      steps.push({
        chapter: 'run',
        short: `fast = ${fast}`,
        title: `nums[${fast}] = ${a} is a duplicate: skip it`,
        body: `Line 6 moves the reader to \`fast = ${fast}\`. Line 7: \`${a} != ${b}\` is false, so ${a} is already kept. Nothing is written.`,
        code: { view: 'final', lines: [6, 7] },
        values: { 6: `fast = ${fast}`, 7: `${a} != ${b} → False` },
        metrics: metrics(),
        scene: { entities: scene({ values: [...values], slow, fast, phase: 'dup' }) },
      });
      continue;
    }
    steps.push({
      chapter: 'run',
      short: `fast = ${fast}`,
      title: `nums[${fast}] = ${a} is new`,
      body: `Line 6 moves the reader to \`fast = ${fast}\`. Line 7: \`${a} != ${b}\` is true. The list is sorted, so a value that differs from the last kept one has never been seen.`,
      code: { view: 'final', lines: [6, 7] },
      values: { 6: `fast = ${fast}`, 7: `${a} != ${b} → True` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...values], slow, fast, phase: 'new' }) },
    });
    slow += 1;
    steps.push({
      chapter: 'run',
      short: `slow = ${slow}`,
      title: `Make room: slow moves to ${slow}`,
      body:
        slow === fast
          ? `Line 8: \`slow = ${slow}\`, the slot right after the kept part. Nothing has been skipped yet, so it is the reader’s own slot.`
          : `Line 8: \`slow = ${slow}\`, the slot right after the kept part. It holds a duplicate (${values[slow]}) that we no longer need.`,
      code: { view: 'final', lines: [8] },
      values: { 8: `slow = ${slow}` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...values], slow, fast, phase: 'advance' }) },
    });
    values[slow] = a;
    writes += 1;
    steps.push({
      chapter: 'run',
      short: 'Write',
      title: `Copy ${a} into nums[${slow}]`,
      body:
        slow === fast
          ? `Line 9: \`nums[${slow}] = nums[${fast}]\` copies ${a} onto itself. The kept part is now ${show(values.slice(0, slow + 1))}.`
          : `Line 9: \`nums[${slow}] = nums[${fast}] = ${a}\`. The kept part is now ${show(values.slice(0, slow + 1))}.`,
      code: { view: 'final', lines: [9] },
      values: { 9: `nums[${slow}] = ${a}` },
      metrics: metrics(),
      scene: { entities: scene({ values: [...values], slow, fast, phase: 'write' }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `${slow + 1} unique value${slow === 0 ? '' : 's'}: ${show(values.slice(0, slow + 1))}`,
    body: `The reader has passed the end, so line 6’s loop is over. Line 11 returns \`slow + 1 = ${slow + 1}\`.${slow + 1 < values.length ? ` The ${values.length - slow - 1} value${values.length - slow - 1 === 1 ? '' : 's'} after the kept part ${values.length - slow - 1 === 1 ? 'is a leftover' : 'are leftovers'} the caller ignores.` : ''}`,
    code: { view: 'final', lines: [6, 11] },
    values: { 6: 'loop done', 11: `return ${slow} + 1 = ${slow + 1}` },
    metrics: metrics(slow + 1),
    scene: { entities: scene({ values: [...values], slow, phase: 'done' }) },
  });
  return steps;
}

const NUMS = [1, 1, 2, 2, 2, 3] as const;
const RUN = traceFastSlow(NUMS);
const startMetrics = { reads: 0, writes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FINAL = [1, 2, 3, 2, 2, 3] as const;

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/two-pointers-fast-slow',
  title: 'Fast & Slow Pointers, a reader and a writer',
  summary: 'From the idea to the code: remove duplicates from a sorted list in place, with one pointer reading every value and another writing only the new ones.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def remove_duplicates(nums: list[int]) -> int:
    if not nums:
        return 0

    slow = 0  # nums[:slow + 1] holds the unique values so far
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:  # Sorted, so equal values sit together
            slow += 1
            nums[slow] = nums[fast]

    return slow + 1`,
  },
  snapshots: {
    brute: `def remove_duplicates(nums: list[int]) -> int:
    i = 1
    while i < len(nums):
        if nums[i] == nums[i - 1]:
            del nums[i]  # Every later value shifts one slot left
        else:
            i += 1
    return len(nums)`,
  },
  metrics: [
    { key: 'reads', label: 'Values read' },
    { key: 'writes', label: 'Writes' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'value being read / just written' },
    { tone: 'compare', label: 'last kept value' },
    { tone: 'done', label: 'kept (unique)' },
    { tone: 'miss', label: 'duplicate' },
    { tone: 'muted', label: 'skipped / leftover' },
  ],
  goals: [
    { text: 'See why deleting in place is slow', step: 2 },
    { text: 'Split the work between a reader and a writer', step: 3 },
    { text: 'Follow every read, skip and write', step: 9 },
    { text: 'Know why slow moves before the write', step: 21 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Remove duplicates from [1, 1, 2, 2, 2, 3]',
      body: 'Like a proofreader with two bookmarks: one skims every word, the other marks where the next clean word goes.\n\nLine 1 gets a **sorted** list `nums`, keeps each value once at the front **in place** (no second list), and returns how many it kept. Here: `[1, 2, 3]`, so it returns 3.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ values: NUMS }) },
    },
    {
      chapter: 'idea',
      short: 'Delete',
      title: 'The obvious way: delete each duplicate',
      body: 'Lines 4–5 delete a value that equals the one before it. But `del nums[1]` shifts every later value one slot left: 4 moves for a single delete.\n\nWith many duplicates that’s up to `n` shifts per delete: **`O(n²)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [4, 5] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 1: 'miss', 2: 'compare', 3: 'compare', 4: 'compare', 5: 'compare' }, codeVar: 'nums' }),
          ...[2, 3, 4, 5].map((k) => link(`shift-${k}`, { entity: 'nums', index: k, side: 'top' }, { entity: 'nums', index: k - 1, side: 'top' }, { tone: 'miss', dashed: true })),
          note('note', 0, VARS_Y, 'del nums[1] → 4 values shift left\nup to n shifts per delete → O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Read & write',
      title: 'Don’t delete: copy the new values forward',
      body: 'Use two pointers. `fast` **reads** every value once. `slow` marks the **last kept** value, so the unique values pile up at the front.\n\nThe list is sorted, so a value is new exactly when it differs from the last kept one. Then it’s copied to the slot after `slow`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ values: NUMS, note: 'fast reads every value\nslow marks the last kept one\nnew value → copy it to slow + 1' }) },
    },
    {
      chapter: 'build',
      short: 'Empty',
      title: 'Lines 2–3: an empty list keeps nothing',
      body: 'With no values there is nothing to keep, so line 3 returns 0. Every other list has at least one unique value: its first.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if not nums: return 0'],
      scene: { entities: scene({ values: NUMS, note: 'nums = [] → return 0' }) },
    },
    {
      chapter: 'build',
      short: 'Pointers',
      title: 'Lines 5–6: a writer at 0, a reader from 1',
      body: 'Line 5 keeps `nums[0]` (the comment says what `slow` means). Line 6 walks the reader `fast` over every other value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['slow = 0', 'for fast in range(1, len(nums))'],
      scene: { entities: scene({ values: NUMS, slow: 0, fast: 1, phase: 'look' }) },
    },
    {
      chapter: 'build',
      short: 'New?',
      title: 'Line 7: is the value under fast new?',
      body: 'Equal values sit together in a sorted list, so comparing with the last kept value, `nums[slow]`, is enough. At `fast = 2`: `2 != 1`, a new value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [7] },
      metrics: startMetrics,
      changes: ['if nums[fast] != nums[slow]'],
      scene: { entities: scene({ values: NUMS, slow: 0, fast: 2, phase: 'new' }) },
    },
    {
      chapter: 'build',
      short: 'Keep it',
      title: 'Lines 8–9: copy the new value after the kept part',
      body: 'Line 8 moves `slow` to the next free slot, and line 9 copies the new value there. Whatever was in that slot was a duplicate.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['slow += 1', 'nums[slow] = nums[fast]'],
      scene: { entities: scene({ values: [1, 2, 2, 2, 2, 3], slow: 1, fast: 2, phase: 'write' }) },
    },
    {
      chapter: 'build',
      short: 'Count',
      title: 'Line 11: return how many were kept',
      body: '`slow` is the index of the last kept value, so `slow + 1` values were kept. Values after them are leftovers the caller ignores.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [11] },
      metrics: startMetrics,
      changes: ['return slow + 1'],
      scene: { entities: scene({ values: FINAL, slow: 2, phase: 'done', note: 'kept: nums[:3] = [1, 2, 3]\nreturn slow + 1 = 3' }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One pass, no extra list',
      body: '`fast` reads each value once and `slow` only moves forward, so the loop does `n − 1` reads and at most `n − 1` writes: **`O(n)` time**. Two integers are the only extra memory: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [6, 8, 9] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: FINAL, slow: 2, phase: 'done', note: 'n − 1 reads, ≤ n − 1 writes\nno shifting, no second list\n→ O(n) time, O(1) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Order',
      title: 'Why line 8 comes before line 9',
      body: '`nums[slow]` is the last value we **kept**. Write first and you overwrite it: on `[1, 2]`, `nums[0] = 2` destroys the 1 and leaves `[2, 2]`.\n\nThat is the key decision: move `slow` to the free slot first, then copy, so the kept part only ever grows.',
      code: { view: 'final', lines: [8, 9] },
      values: { 8: 'first: step past the kept part', 9: 'then: copy into the free slot' },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          arr('trap', 0, 0, [2, 2], { label: 'nums', tones: { 0: 'miss', 1: 'compare' }, codeVar: 'nums' }),
          ptr('slow', 'trap', 0, 'slow', { tone: 'done', codeVar: 'slow' }),
          ptr('fast', 'trap', 1, 'fast', { side: 'top', tone: 'active', codeVar: 'fast' }),
          link('copy', { entity: 'trap', index: 1, side: 'top' }, { entity: 'trap', index: 0, side: 'top' }, { label: 'copy 2 too early', tone: 'miss' }),
          note('note', NOTE_X, VARS_Y, 'write before slow += 1:\nnums[0] = 2 overwrites the kept 1\n[1, 2] → [2, 2], the 1 is lost', { tone: 'miss' }),
        ],
      },
    },
  ],
  trace: {
    title: 'Remove duplicates from your own numbers',
    inputs: [{ name: 'nums', label: 'Numbers (we sort them for you)', kind: 'numbers', default: '1, 1, 2, 2, 3' }],
    presets: [
      { label: 'All the same', values: { nums: '4, 4, 4, 4' } },
      { label: 'All unique', values: { nums: '1, 2, 3, 4' } },
      { label: 'Negatives', values: { nums: '-3, -3, -1, 0, 0, 2' } },
      { label: 'Unsorted input', values: { nums: '3, 1, 3, 1' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['nums'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceFastSlow(input);
    },
  },
});
