import { arr, defineWalkthrough, link, map, note, ptr, vars } from '../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../lib/walkthrough/layout';
import type { Entity, MapEntry, Step, Tone } from '../../lib/walkthrough/types';

const NUMS = [3, 8, 1, 6, 4] as const;
const TARGET = 10;
const VARS_Y = 150;

interface Model {
  readonly nums: readonly number[];
  readonly target: number;
}

/** The `seen` map sits right of the array; it can grow to one row per number. */
const mapX = (m: Model): number => tableBesideArray(m.nums.length, m.nums.length);

/**
 * `seen` after the first `processed` numbers were stored, with Python dict
 * semantics: a repeated value keeps its slot and gets the newer index.
 */
function seenAfter(m: Model, processed: number, highlight?: { key: number; tone: Tone }): MapEntry[] {
  const seen = new Map<number, number>();
  m.nums.slice(0, processed).forEach((value, idx) => seen.set(value, idx));
  return [...seen].map(([key, value]) => ({ key, value, tone: highlight?.key === key ? highlight.tone : 'done' }));
}

interface FrameOptions {
  readonly idx?: number;
  /** How many numbers have already been written into `seen`. */
  readonly processed: number;
  readonly cellTones?: Readonly<Record<number, Tone>>;
  readonly highlight?: { key: number; tone: Tone };
  readonly extra?: readonly Entity[];
  /** `miss` / `found` once the lookup has run; plain before that. */
  readonly complementTone?: Tone;
  /** Hide `seen` before the story introduces it. */
  readonly withSeen?: boolean;
}

/** One moment of the hash-map solution: array, idx pointer, variables and `seen`. */
function frame(m: Model, { idx, processed, cellTones, highlight, extra = [], complementTone = 'default', withSeen = true }: FrameOptions): Entity[] {
  const num = idx === undefined ? undefined : m.nums[idx];
  const tones: Record<number, Tone> = {};
  for (let i = 0; i < processed; i += 1) tones[i] = 'done';
  if (idx !== undefined) tones[idx] = 'active';
  return [
    arr('nums', 0, 0, m.nums, { label: 'nums', tones: { ...tones, ...cellTones }, codeVar: 'nums' }),
    ...(idx === undefined ? [] : [ptr('idx', 'nums', idx, 'idx', { codeVar: 'idx' })]),
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'target', value: m.target },
        { name: 'num', value: num ?? '—', tone: num === undefined ? 'muted' : 'default' },
        { name: 'complement', value: num === undefined ? '—' : m.target - num, tone: num === undefined ? 'muted' : complementTone },
      ],
      { label: 'variables', width: 180 },
    ),
    ...(withSeen ? [map('seen', mapX(m), 0, 'seen  (value → index)', seenAfter(m, processed, highlight), { width: 170, codeVar: 'seen' })] : []),
    ...extra,
  ];
}

const lookup = (key: number | undefined, tone: Tone, label: string, flow = false): Entity =>
  link('look', { entity: 'vals', key: 'complement' }, key === undefined ? { entity: 'seen' } : { entity: 'seen', key }, {
    tone,
    label,
    flow,
    dashed: tone === 'miss',
  });

/** Runs the solution on any input and records a step per check and per store (chapter "run", final code). */
function traceTwoSum(nums: readonly number[], target: number): Step[] {
  const m: Model = { nums, target };
  const seen = new Map<number, number>();
  const steps: Step[] = [];
  let lookups = 0;
  const metrics = (answer: string): Record<string, string | number> => ({ lookups, stored: seen.size, answer });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Find two numbers that add up to ${target}`,
    body: 'Line 2 starts `seen` empty. Line 3 walks the array once, and each number asks “is my partner already in `seen`?”',
    code: { view: 'final', lines: [1, 2] },
    values: { 2: 'seen = {}' },
    metrics: metrics('—'),
    scene: { entities: frame(m, { processed: 0 }) },
  });

  for (let idx = 0; idx < nums.length; idx += 1) {
    const num = nums[idx] ?? 0;
    const complement = target - num;
    lookups += 1;
    const partner = seen.get(complement);
    if (partner !== undefined) {
      steps.push({
        chapter: 'run',
        short: 'Match!',
        title: `${num} needs ${complement}, and ${complement} is in seen`,
        body: `Line 4: \`${target} − ${num} = ${complement}\`. Line 5: \`seen[${complement}] = ${partner}\`. Line 6 returns **\`[${partner}, ${idx}]\`** after ${lookups} lookup${lookups === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [4, 5, 6] },
        values: { 3: `idx = ${idx}, num = ${num}`, 4: `complement = ${complement}`, 5: 'True', 6: `return [${partner}, ${idx}]` },
        metrics: metrics(`[${partner}, ${idx}]`),
        changes: [`lookup ${complement} → found at index ${partner}`, `return [${partner}, ${idx}]`],
        scene: {
          entities: frame(m, {
            idx,
            processed: idx,
            cellTones: { [partner]: 'found', [idx]: 'found' },
            highlight: { key: complement, tone: 'found' },
            complementTone: 'found',
            extra: [lookup(complement, 'found', `${complement} → index ${partner}`, true)],
          }),
        },
      });
      return steps;
    }
    steps.push({
      chapter: 'run',
      short: `idx ${idx}`,
      title: `${num} needs ${complement}: not in seen`,
      body: `Line 4: \`complement = ${target} − ${num} = ${complement}\`. Line 5: is \`${complement}\` in \`seen\`? No.`,
      code: { view: 'final', lines: [3, 4, 5] },
      values: { 3: `idx = ${idx}, num = ${num}`, 4: `complement = ${complement}`, 5: 'False' },
      metrics: metrics('—'),
      changes: [`lookup ${complement} → not found`],
      scene: {
        entities: frame(m, { idx, processed: idx, complementTone: 'miss', extra: [lookup(undefined, 'miss', `${complement}? no`)] }),
      },
    });
    const overwrite = seen.has(num);
    seen.set(num, idx);
    steps.push({
      chapter: 'run',
      short: `store ${num}`,
      title: `Remember ${num} → ${idx}`,
      body: overwrite
        ? `Line 8: \`${num}\` was already in \`seen\`, so its index is updated to ${idx}. Either index works as a partner later.`
        : `Line 8: no partner yet, so write \`seen[${num}] = ${idx}\` for a later number to find.`,
      code: { view: 'final', lines: [7, 8] },
      values: { 8: `seen[${num}] = ${idx}` },
      metrics: metrics('—'),
      changes: [`seen[${num}] = ${idx}`],
      scene: { entities: frame(m, { idx, processed: idx + 1, highlight: { key: num, tone: 'active' }, complementTone: 'miss' }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'No pair',
    title: 'The loop ended without a match',
    body: `No two numbers add up to ${target}, so the function falls through to line 9: \`return []\`.`,
    code: { view: 'final', lines: [9] },
    values: { 9: 'return []' },
    metrics: metrics('[]'),
    scene: { entities: frame(m, { processed: nums.length, extra: [note('none', 200, VARS_Y + 110,'no pair found → return []', { tone: 'miss' })] }) },
  });
  return steps;
}

const story: Model = { nums: NUMS, target: TARGET };

export default defineWalkthrough({
  id: 'problems/two-sum',
  title: 'Two Sum, one pass with a hash map',
  summary: 'From the problem to the idea to the code: watch the "complement" trick turn an O(n²) pair search into one O(n) scan, then try your own input.',
  minutes: 5,
  code: {
    lang: 'python',
    source: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for idx, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], idx]
        # Store after checking so the same index isn't paired with itself
        seen[num] = idx
    return []`,
  },
  snapshots: {
    brute: `def two_sum(nums: list[int], target: int) -> list[int]:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
  },
  metrics: [
    { key: 'lookups', label: 'Map lookups' },
    { key: 'stored', label: 'Stored in seen' },
    { key: 'answer', label: 'Answer' },
  ],
  legend: [
    { tone: 'active', label: 'current number' },
    { tone: 'compare', label: 'pair to check' },
    { tone: 'done', label: 'already stored' },
    { tone: 'miss', label: 'lookup missed' },
    { tone: 'found', label: 'pair found' },
  ],
  goals: [
    { text: 'See why checking every pair is O(n²)', step: 2 },
    { text: 'Flip the question: what partner do I need?', step: 3 },
    { text: 'Turn a hash map "notebook" into code', step: 4 },
    { text: 'Know why the solution checks before it stores', step: 11 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find two numbers that add up to 10',
      body: 'Line 1 is all we start with: `nums = [3, 8, 1, 6, 4]` and `target = 10`. Return the **indexes** of the two numbers that sum to the target.\n\nThere is exactly one answer, and we can’t use the same element twice.',
      code: { view: 'signature', lines: [1] },
      metrics: { lookups: 0, stored: 0, answer: '—' },
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', codeVar: 'nums' }),
          vars('vals', 0, VARS_Y, [{ name: 'target', value: TARGET }], { label: 'variables', width: 180 }),
          note('want', 240, VARS_Y + 10, 'return [i, j] where\nnums[i] + nums[j] == 10'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Brute force',
      title: 'The obvious way: try every pair',
      body: 'Lines 2–4 pair `3` with every number after it, then `8` with every number after it, and so on.\n\nFor 5 numbers that’s **10 pairs**; for 10,000 numbers it’s about **50 million**. That’s `O(n²)`, too slow.',
      code: { view: 'snapshot', id: 'brute', lines: [2, 3, 4] },
      metrics: { lookups: 0, stored: 0, answer: '—' },
      scene: {
        entities: [
          arr('nums', 0, 0, NUMS, { label: 'nums', tones: { 0: 'active', 1: 'compare', 2: 'compare', 3: 'compare', 4: 'compare' }, codeVar: 'nums' }),
          ...[1, 2, 3, 4].map((j) =>
            link(`pair-${j}`, { entity: 'nums', index: 0, side: 'top' }, { entity: 'nums', index: j, side: 'top' }, { tone: 'compare', dashed: true }),
          ),
          note('pairs', 0, VARS_Y, 'Pairs to check: 4 + 3 + 2 + 1 = 10\nn·(n−1)/2  →  O(n²)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Flip it',
      title: 'Each number already knows its partner',
      body: 'New code: line 3 hands us one number at a time. If I’m holding `3` and the target is `10`, my partner **must** be `10 − 3 = 7`, which is line 4.\n\nSo the question becomes: “have I already seen a 7?”',
      code: { view: 'reveal', reveal: [1, 3, 4], lines: [3, 4] },
      metrics: { lookups: 0, stored: 0, answer: '—' },
      changes: ['for idx, num in enumerate(nums)', 'complement = target - num'],
      scene: {
        entities: [
          ...frame(story, { idx: 0, processed: 0, withSeen: false }),
          note('flip', 240, VARS_Y + 38, 'complement = target − num\n= 10 − 3 = 7'),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Notebook',
      title: 'Keep a notebook of what we’ve seen',
      body: 'Line 2 creates `seen`, a dict from **value** to **index**. Line 5 asks `complement in seen`, which takes `O(1)` on average, and line 6 returns the pair when it’s there.\n\nThe notebook is empty, so looking up `7` misses.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [2, 5, 6] },
      metrics: { lookups: 1, stored: 0, answer: '—' },
      changes: ['seen = {}', 'if complement in seen: return …'],
      scene: { entities: frame(story, { idx: 0, processed: 0, complementTone: 'miss', extra: [lookup(undefined, 'miss', '7 in seen? no')] }) },
    },
    {
      chapter: 'build',
      short: 'Store it',
      title: 'Write the current number down',
      body: 'No partner yet, so line 8 remembers `3` for later: `seen[3] = 0`. Line 9 covers the case where no pair exists.\n\nThat’s the whole solution. If a `7` shows up later, it will find this `3` waiting for it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [7, 8] },
      metrics: { lookups: 1, stored: 1, answer: '—' },
      changes: ['seen[num] = idx', 'return []'],
      scene: { entities: frame(story, { idx: 0, processed: 1, highlight: { key: 3, tone: 'active' }, complementTone: 'miss' }) },
    },
    {
      chapter: 'run',
      short: 'idx 1',
      title: '8 needs a 2: not seen yet',
      body: 'Next loop turn, line 3: `idx = 1`. Line 4: `10 − 8 = 2`. Line 5: no `2` in `seen`. Line 8: store `8 → 1`.',
      code: { view: 'final', lines: [3, 4, 5, 8] },
      values: { 3: 'idx = 1, num = 8', 4: 'complement = 2', 5: 'False', 8: 'seen[8] = 1' },
      metrics: { lookups: 2, stored: 2, answer: '—' },
      changes: ['lookup 2 → not found', 'seen[8] = 1'],
      scene: { entities: frame(story, { idx: 1, processed: 2, highlight: { key: 8, tone: 'active' }, complementTone: 'miss', extra: [lookup(undefined, 'miss', '2? no')] }) },
    },
    {
      chapter: 'run',
      short: 'idx 2',
      title: '1 needs a 9: not seen yet',
      body: 'Line 4: `10 − 1 = 9`. Line 5: still no match. Line 8: store `1 → 2`.\n\nWe never look backwards through the array, only into the notebook.',
      code: { view: 'final', lines: [3, 4, 5, 8] },
      values: { 3: 'idx = 2, num = 1', 4: 'complement = 9', 5: 'False', 8: 'seen[1] = 2' },
      metrics: { lookups: 3, stored: 3, answer: '—' },
      changes: ['lookup 9 → not found', 'seen[1] = 2'],
      scene: { entities: frame(story, { idx: 2, processed: 3, highlight: { key: 1, tone: 'active' }, complementTone: 'miss', extra: [lookup(undefined, 'miss', '9? no')] }) },
    },
    {
      chapter: 'run',
      short: 'idx 3',
      title: '6 needs a 4: not seen yet',
      body: 'Line 4: `10 − 6 = 4`. Line 5: no `4` stored. Line 8: write down `6 → 3`.\n\nThis `6` is the partner we’ll need in the next step.',
      code: { view: 'final', lines: [3, 4, 5, 8] },
      values: { 3: 'idx = 3, num = 6', 4: 'complement = 4', 5: 'False', 8: 'seen[6] = 3' },
      metrics: { lookups: 4, stored: 4, answer: '—' },
      changes: ['lookup 4 → not found', 'seen[6] = 3'],
      scene: { entities: frame(story, { idx: 3, processed: 4, highlight: { key: 6, tone: 'active' }, complementTone: 'miss', extra: [lookup(undefined, 'miss', '4? no')] }) },
    },
    {
      chapter: 'run',
      short: 'Match!',
      title: '4 needs a 6, and 6 is in the notebook',
      body: 'Line 4: `10 − 4 = 6`. Line 5: `6 in seen` is true, with `seen[6] = 3`.\n\nLine 6 returns `[seen[6], idx]` = **`[3, 4]`**. Each number was looked at once.',
      code: { view: 'final', lines: [4, 5, 6] },
      values: { 3: 'idx = 4, num = 4', 4: 'complement = 6', 5: 'True', 6: 'return [3, 4]' },
      metrics: { lookups: 5, stored: 4, answer: '[3, 4]' },
      changes: ['lookup 6 → found at index 3', 'return [3, 4]'],
      scene: {
        entities: frame(story, {
          idx: 4,
          processed: 4,
          cellTones: { 3: 'found', 4: 'found' },
          highlight: { key: 6, tone: 'found' },
          complementTone: 'found',
          extra: [lookup(6, 'found', '6 → index 3', true)],
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One pass, constant-time lookups',
      body: 'The loop (line 3) runs at most n times. Each turn does one `O(1)` lookup (line 5) and at most one insert (line 8): **`O(n)` time**. `seen` holds up to n entries: **`O(n)` space**.\n\nThat’s the trade: spend memory to skip the nested loop.',
      code: { view: 'final', lines: [3, 5, 8] },
      metrics: { lookups: 5, stored: 4, answer: '[3, 4]' },
      scene: {
        entities: frame(story, {
          processed: 4,
          cellTones: { 3: 'found', 4: 'found' },
          highlight: { key: 6, tone: 'found' },
          extra: [note('recap', 200, VARS_Y + 110, 'Time   O(n)   one pass\nSpace  O(n)   the seen dict', { tone: 'found' })],
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Order matters',
      title: 'Why line 5 (check) comes before line 8 (store)',
      body: 'This is the comment on line 7. Take `nums = [5, 1]`, `target = 10`. If we stored `5` **first**, the lookup for `10 − 5 = 5` would find the `5` we just wrote and return `[0, 0]`: one index paired with itself.\n\nChecking first means `seen` only ever holds **earlier** indexes.',
      code: { view: 'final', lines: [5, 7, 8] },
      values: { 5: 'checks only earlier numbers' },
      metrics: { lookups: 1, stored: 1, answer: '[0, 0] ✗' },
      scene: {
        entities: [
          arr('trap', 0, 0, [5, 1], { label: 'nums', tones: { 0: 'miss' }, codeVar: 'nums' }),
          ptr('idx', 'trap', 0, 'idx', { tone: 'miss', codeVar: 'idx' }),
          vars(
            'vals',
            0,
            VARS_Y,
            [
              { name: 'target', value: TARGET },
              { name: 'num', value: 5 },
              { name: 'complement', value: 5, tone: 'miss' },
            ],
            { label: 'variables', width: 180 },
          ),
          map('seen', mapX(story), 0, 'seen  (value → index)', [{ key: 5, value: 0, tone: 'miss' }], { width: 170, codeVar: 'seen' }),
          link('look', { entity: 'vals', key: 'complement' }, { entity: 'seen', key: 5 }, { tone: 'miss', label: 'finds itself!' }),
          note('order', 220, VARS_Y + 40, 'store first → [0, 0]  ✗\ncheck first → keep scanning  ✓', { tone: 'note' }),
        ],
      },
    },
  ],
  trace: {
    title: 'Run the solution on your own numbers',
    inputs: [
      { name: 'nums', label: 'nums', kind: 'numbers', default: '2, 7, 11, 15' },
      { name: 'target', label: 'target', kind: 'number', default: '9' },
    ],
    presets: [
      { label: 'LeetCode example', values: { nums: '2, 7, 11, 15', target: '9' } },
      { label: 'Duplicates', values: { nums: '3, 3', target: '6' } },
      { label: 'Not itself', values: { nums: '3, 2, 4', target: '6' } },
      { label: 'Negatives', values: { nums: '-3, 4, 3, 90', target: '0' } },
      { label: 'No answer', values: { nums: '1, 2, 4, 8', target: '100' } },
    ],
    maxItems: 8,
    run: (values) => {
      const nums = values['nums'];
      const target = values['target'];
      if (!Array.isArray(nums) || typeof target !== 'number') throw new Error('Enter nums and a single target.');
      return traceTwoSum(nums, target);
    },
  },
});
