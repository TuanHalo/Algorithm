import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface ScanState {
  readonly values: readonly number[];
  readonly target: number;
  /** The item being checked; cells before it are ruled out. */
  readonly index?: number;
  readonly found?: boolean;
  /** Every item was checked and none matched. */
  readonly exhausted?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Array id: `arr` for the story input, another id for a different example input. */
  readonly arrayId?: string;
}

/** Scene for one moment of the scan: checked cells, the `index` pointer and the variables. */
function scene(s: ScanState): Entity[] {
  const id = s.arrayId ?? 'arr';
  const cellTones: Record<number, Tone> = {};
  const checkedUpTo = s.exhausted ? s.values.length : (s.index ?? 0);
  for (let i = 0; i < checkedUpTo; i += 1) cellTones[i] = 'muted';
  if (s.index !== undefined && !s.exhausted) cellTones[s.index] = s.found ? 'found' : 'compare';

  const entities: Entity[] = [arr(id, 0, 0, s.values, { label: 'arr', tones: cellTones, codeVar: 'arr' })];
  if (s.index !== undefined && !s.exhausted) {
    entities.push(ptr('index', id, s.index, 'index', { side: 'top', tone: s.found ? 'found' : 'active', codeVar: 'index' }));
  }
  const value = s.index === undefined || s.exhausted ? undefined : s.values[s.index];
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'target', value: s.target },
        { name: 'index', value: s.index === undefined || s.exhausted ? '—' : s.index, tone: s.index === undefined ? 'muted' : 'default' },
        { name: 'value', value: value ?? '—', tone: value === undefined ? 'muted' : value === s.target ? 'found' : 'compare' },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs linear search on any input and records one step per item checked (chapter "run", final code). */
function traceLinearSearch(values: readonly number[], target: number): Step[] {
  const steps: Step[] = [];
  let checks = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    checks += 1;
    if (value === target) {
      steps.push({
        chapter: 'run',
        short: `Found @${index}`,
        title: `arr[${index}] = ${value}, found it`,
        body: `Line 3: \`${value} == ${target}\`, so line 4 returns **${index}** after ${checks} check${checks === 1 ? '' : 's'}.`,
        code: { view: 'final', lines: [2, 3, 4] },
        values: { 2: `index = ${index}, value = ${value}`, 3: `${value} == ${target} → True`, 4: `return ${index}` },
        metrics: { checks, result: index },
        scene: { entities: scene({ values, target, index, found: true }) },
      });
      return steps;
    }
    steps.push({
      chapter: 'run',
      short: `index ${index}`,
      title: `arr[${index}] = ${value}: not ${target}`,
      body: `Line 2 hands us \`index = ${index}\`, \`value = ${value}\`. Line 3: \`${value} == ${target}\` is false, so the loop moves on.`,
      code: { view: 'final', lines: [2, 3] },
      values: { 2: `index = ${index}, value = ${value}`, 3: `${value} == ${target} → False` },
      metrics: { checks, result: '—' },
      scene: { entities: scene({ values, target, index }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Not found',
    title: 'The loop ran out of items',
    body: `All ${values.length} item${values.length === 1 ? '' : 's'} checked and none was ${target}, so line 5 returns **-1**.`,
    code: { view: 'final', lines: [2, 5] },
    values: { 5: 'return -1' },
    metrics: { checks, result: -1 },
    scene: { entities: scene({ values, target, exhausted: true, note: 'reached the end → return -1', noteTone: 'miss' }) },
  });
  return steps;
}

const ARR = [14, 7, 25, 42, 3, 19] as const;
const TARGET = 42;
const base = { values: ARR, target: TARGET } as const;

export default defineWalkthrough({
  id: 'learn/searching/linear-search',
  title: 'Linear Search, one item at a time',
  summary: 'From the idea to the code: check each item in order until one matches, then try your own input.',
  minutes: 3,
  code: {
    lang: 'python',
    source: `def linear_search(arr: list[int], target: int) -> int:
    for index, value in enumerate(arr):
        if value == target:
            return index  # Match found; no need to check the rest
    return -1  # Reached the end without finding target`,
  },
  metrics: [
    { key: 'checks', label: 'Checks' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'being checked' },
    { tone: 'muted', label: 'ruled out' },
    { tone: 'found', label: 'found' },
  ],
  goals: [
    { text: 'See why an unsorted list needs a full scan', step: 2 },
    { text: 'Turn the scan into a 4-line loop', step: 3 },
    { text: 'Know when it returns -1', step: 5 },
    { text: 'See why it returns the first match', step: 11 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find 42 in an unsorted list',
      body: 'Like hunting for your favourite mug in a messy drawer: nothing is in any order.\n\nLine 1 takes `arr` and a `target` and returns the target’s index, or `-1` if it isn’t there.',
      code: { view: 'signature', lines: [1] },
      metrics: { checks: 0, result: '—' },
      scene: { entities: scene(base) },
    },
    {
      chapter: 'idea',
      short: 'No shortcut',
      title: 'Check every item, left to right',
      body: 'The list isn’t sorted, so the value at one position says nothing about any other.\n\nThe only safe plan is to look at each item in turn until one matches, or until we run out.',
      code: { view: 'signature' },
      metrics: { checks: 0, result: '—' },
      scene: { entities: scene({ ...base, note: 'unsorted → no shortcut\ncheck items one by one' }) },
    },
    {
      chapter: 'build',
      short: 'Walk',
      title: 'Line 2: visit every item once',
      body: 'Line 2 walks the list from the front. `enumerate` hands us each position (`index`) together with its item (`value`), starting at index 0.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: { checks: 0, result: '—' },
      changes: ['for index, value in enumerate(arr)'],
      scene: { entities: scene({ ...base, index: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Compare',
      title: 'Lines 3–4: stop on a match',
      body: 'Line 3 compares the current item with the target. On a match, line 4 returns its index right away.\n\nHere `14` isn’t `42`, so the loop moves on.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: { checks: 1, result: '—' },
      changes: ['if value == target: return index'],
      scene: { entities: scene({ ...base, index: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Not found',
      title: 'Line 5: no match means -1',
      body: 'If the loop runs out of items, nothing matched, so line 5 returns `-1`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [5] },
      metrics: { checks: 1, result: '—' },
      changes: ['return -1'],
      scene: { entities: scene({ ...base, index: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Check 1',
      title: 'Check 1: arr[0] = 14',
      body: 'Line 2: `index = 0`, `value = 14`. Line 3: `14 == 42` is false.',
      code: { view: 'final', lines: [2, 3] },
      values: { 2: 'index = 0, value = 14', 3: '14 == 42 → False' },
      metrics: { checks: 1, result: '—' },
      scene: { entities: scene({ ...base, index: 0 }) },
    },
    {
      chapter: 'run',
      short: 'Check 2',
      title: 'Check 2: arr[1] = 7',
      body: 'Next loop turn, line 2: `index = 1`, `value = 7`. Line 3: still not 42.',
      code: { view: 'final', lines: [2, 3] },
      values: { 2: 'index = 1, value = 7', 3: '7 == 42 → False' },
      metrics: { checks: 2, result: '—' },
      scene: { entities: scene({ ...base, index: 1 }) },
    },
    {
      chapter: 'run',
      short: 'Check 3',
      title: 'Check 3: arr[2] = 25',
      body: 'Line 2: `index = 2`, `value = 25`. Line 3: not 42 either.\n\nEvery checked item is ruled out for good; we never look back.',
      code: { view: 'final', lines: [2, 3] },
      values: { 2: 'index = 2, value = 25', 3: '25 == 42 → False' },
      metrics: { checks: 3, result: '—' },
      scene: { entities: scene({ ...base, index: 2 }) },
    },
    {
      chapter: 'run',
      short: 'Found!',
      title: 'Check 4: arr[3] = 42, found it',
      body: 'Line 2: `index = 3`, `value = 42`. Line 3: `42 == 42`, so line 4 returns **3** after 4 checks.\n\nIndexes 4 and 5 are never looked at.',
      code: { view: 'final', lines: [2, 3, 4] },
      values: { 2: 'index = 3, value = 42', 3: '42 == 42 → True', 4: 'return 3' },
      metrics: { checks: 4, result: 3 },
      scene: { entities: scene({ ...base, index: 3, found: true }) },
    },
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Up to one check per item: O(n)',
      body: 'Each item is checked at most once, so the worst case (last item or missing) takes **`O(n)` time**; the best case is 1 check. It needs only `O(1)` extra space.\n\nSwitch to **🧪 Try your own** to run it on any numbers you like.',
      code: { view: 'final', lines: [2, 3] },
      metrics: { checks: 4, result: 3 },
      scene: {
        entities: scene({
          ...base,
          index: 3,
          found: true,
          note: 'n = 10          →  ≤ 10 checks\nn = 1,000,000   →  ≤ 1,000,000 checks',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'First match',
      title: 'Why line 4 returns inside the loop',
      body: 'Take `[5, 42, 9, 42]`: line 4 returns `1` and never looks at index 3. Returning inside the loop is the key decision: it stops at the **first** match, which is also why the best case is a single check.',
      code: { view: 'final', lines: [3, 4] },
      values: { 3: '42 == 42 → True', 4: 'return 1' },
      metrics: { checks: 2, result: 1 },
      scene: {
        entities: scene({
          values: [5, 42, 9, 42],
          target: 42,
          index: 1,
          found: true,
          arrayId: 'dupes',
          note: 'stops at the first match\nindex 3 is never checked',
        }),
      },
    },
  ],
  trace: {
    title: 'Run linear search on your own numbers',
    inputs: [
      { name: 'arr', label: 'Array (any order)', kind: 'numbers', default: '14, 7, 25, 42, 3, 19' },
      { name: 'target', label: 'Target', kind: 'number', default: '3' },
    ],
    presets: [
      { label: 'First item', values: { arr: '8, 3, 5, 1', target: '8' } },
      { label: 'Last item', values: { arr: '4, 9, 1, 7', target: '7' } },
      { label: 'Missing', values: { arr: '6, 2, 9, 4', target: '5' } },
      { label: 'Duplicates', values: { arr: '3, 8, 3, 8', target: '8' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['arr'];
      const target = values['target'];
      if (!Array.isArray(input) || typeof target !== 'number') throw new Error('Enter an array and a single target.');
      return traceLinearSearch(input, target);
    },
  },
});
