import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, Step, Tone } from '../../../lib/walkthrough/types';

const MASK_Y = 130;
const CURRENT_Y = 260;
const NOTE_Y = 480;
/** The vars panel sits right of the elements; the subsets table sits right of the panel. */
const TABLE_DX = 230;

/** `setup`: lines 2–3. `mask`: a new mask. `test`: bit i was tested. `add`: elements[i] joined. `store`: the subset was saved. `exit`: all masks done. */
type Stage = 'setup' | 'mask' | 'test' | 'add' | 'store' | 'exit';

interface Saved {
  readonly mask: number;
  readonly items: readonly number[];
}

interface MaskState {
  readonly elements: readonly number[];
  readonly stage: Stage;
  readonly mask?: number;
  readonly i?: number;
  readonly current?: readonly number[];
  /** Subsets stored so far (the last one is the newest). */
  readonly saved?: readonly Saved[];
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables and the table (before the code has them). */
  readonly bare?: boolean;
}

const show = (items: readonly number[]): string => `[${items.join(', ')}]`;
/** `mask` as `n` binary digits, bit n−1 first. */
const binary = (mask: number, n: number): string => mask.toString(2).padStart(n, '0');
const bitsOf = (mask: number, n: number): number[] => binary(mask, n).split('').map(Number);

/** Scene for one moment: the elements, the mask as switches, the subset being built, the variables and the saved subsets. */
function scene(s: MaskState): Entity[] {
  const n = s.elements.length;
  const { stage } = s;
  const current = s.current ?? [];
  const testing = (stage === 'test' || stage === 'add') && s.i !== undefined;

  const eTones: Record<number, Tone> = {};
  if (s.mask !== undefined) {
    s.elements.forEach((_, k) => {
      if (k < (s.i ?? n) && ((s.mask ?? 0) >> k) & 1 && stage !== 'mask') eTones[k] = 'done';
      if (stage === 'store') if (((s.mask ?? 0) >> k) & 1) eTones[k] = 'done';
    });
  }
  if (testing && s.i !== undefined) eTones[s.i] = 'active';
  const entities: Entity[] = [arr('elements', 0, 0, s.elements, { label: 'elements', tones: eTones, codeVar: 'elements' })];

  if (s.mask !== undefined && stage !== 'exit') {
    const mTones: Record<number, Tone> = {};
    if (testing && s.i !== undefined) mTones[n - 1 - s.i] = 'active';
    entities.push(arr('mask', 0, MASK_Y, bitsOf(s.mask, n), { label: 'mask', tones: mTones, indexLabels: Array.from({ length: n }, (_, k) => `b${n - 1 - k}`), codeVar: 'mask' }));
    const cTones: Record<number, Tone> = {};
    if (stage === 'add') cTones[current.length - 1] = 'active';
    else if (stage === 'store') current.forEach((_, k) => (cTones[k] = 'done'));
    entities.push(
      arr('current', 0, CURRENT_Y, current.length > 0 ? current : ['∅'], {
        label: 'current_subset',
        tones: current.length > 0 ? cTones : { 0: 'muted' },
        showIndex: false,
        codeVar: 'current_subset',
      }),
    );
  }

  if (!s.bare) {
    const rows = [{ name: 'n', value: n }];
    if (s.mask !== undefined && stage !== 'exit') rows.push({ name: 'mask', value: s.mask });
    if (testing && s.i !== undefined) rows.push({ name: 'i', value: s.i });
    const vx = tableBesideArray(Math.max(n, 2), 3);
    entities.push(vars('vals', vx, 0, rows, { label: 'variables', width: 170 }));
    const saved = s.saved ?? [];
    const entries: MapEntry[] = saved.map((e, k) => ({
      key: binary(e.mask, n),
      value: show(e.items),
      tone: stage === 'store' && k === saved.length - 1 ? 'active' : stage === 'exit' ? 'found' : 'done',
    }));
    const lift = Math.max(0, (1 << n) - 4) * 19; // tall cards rise toward the elements, so slide right (as tableBesideArray does)
    entities.push(map('subsets', vx + TABLE_DX + lift, 0, 'subsets', entries, { width: 200, codeVar: 'subsets' }));
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the bitmask power set on any list and records one step per decision (chapter "run", final code). */
function traceSubsets(elements: readonly number[]): Step[] {
  const steps: Step[] = [];
  const n = elements.length;
  const total = 1 << n;
  const saved: Saved[] = [];
  let tests = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ subsets: saved.length, tests, result });
  const base = { elements } as const;

  steps.push({
    chapter: 'run',
    short: 'Setup',
    title: `${n} element${n === 1 ? '' : 's'}: ${total} masks to visit`,
    body: `Line 2: \`n = ${n}\`. Line 3 starts \`subsets\` as an empty list. Line 5 will count \`mask\` through \`range(1 << ${n})\`, which is \`range(${total})\`: ${total} numbers, one per subset.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `n = ${n}`, 3: 'subsets = []' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, stage: 'setup', saved }) },
  });

  for (let mask = 0; mask < total; mask += 1) {
    const current: number[] = [];
    steps.push({
      chapter: 'run',
      short: `mask ${binary(mask, n)}`,
      title: `mask = ${mask} (${binary(mask, n)}): a fresh subset`,
      body: `Line 5 takes \`mask = ${mask}\`, which is \`${binary(mask, n)}\` in binary${mask === 0 ? ' (every switch off)' : ''}. Line 6 starts an empty \`current_subset\`.`,
      code: { view: 'final', lines: [5, 6] },
      values: { 5: `mask = ${mask}`, 6: 'current_subset = []' },
      metrics: metrics(),
      scene: { entities: scene({ ...base, stage: 'mask', mask, current: [], saved }) },
    });

    for (let i = 0; i < n; i += 1) {
      const bit = (mask >> i) & 1;
      const x = elements[i] ?? 0;
      tests += 1;
      steps.push({
        chapter: 'run',
        short: `bit ${i}`,
        title: bit ? `Bit ${i} is 1: ${x} is in` : `Bit ${i} is 0: ${x} stays out`,
        body: `Line 7 picks \`i = ${i}\`. Line 8 tests bit ${i}: \`(${mask} >> ${i}) & 1 = ${mask >> i} & 1 = ${bit}\`. ${bit ? `It is 1, so \`elements[${i}] = ${x}\` belongs to this subset.` : `It is 0, so \`elements[${i}] = ${x}\` is left out.`}`,
        code: { view: 'final', lines: [7, 8] },
        values: { 7: `i = ${i}`, 8: `(${mask} >> ${i}) & 1 = ${bit}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, stage: 'test', mask, i, current: [...current], saved }) },
      });
      if (bit) {
        current.push(x);
        steps.push({
          chapter: 'run',
          short: `add ${x}`,
          title: `Add ${x}: current_subset = ${show(current)}`,
          body: `Line 9 appends \`elements[${i}] = ${x}\`, so \`current_subset = ${show(current)}\`.`,
          code: { view: 'final', lines: [9] },
          values: { 9: `current_subset = ${show(current)}` },
          metrics: metrics(),
          scene: { entities: scene({ ...base, stage: 'add', mask, i, current: [...current], saved }) },
        });
      }
    }

    saved.push({ mask, items: [...current] });
    steps.push({
      chapter: 'run',
      short: `save ${show(current)}`.slice(0, 14),
      title: `Save ${show(current)} for mask ${binary(mask, n)}`,
      body: `Line 7 has no bit left, so line 10 appends \`current_subset\` to \`subsets\`: mask \`${binary(mask, n)}\` stands for **${show(current)}**.`,
      code: { view: 'final', lines: [7, 10] },
      values: { 10: `subsets[${mask}] = ${show(current)}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, stage: 'store', mask, current: [...current], saved }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return all ${total} subsets`,
    body: `Line 5 has no mask left, so the loop ends. Line 12 returns **${total} subsets**, which is \`2^${n}\`. Each mask number named a different one.`,
    code: { view: 'final', lines: [5, 12] },
    values: { 12: `return ${total} subsets` },
    metrics: metrics(`${total} subsets`),
    scene: { entities: scene({ ...base, stage: 'exit', saved, note: `${n} elements → 2^${n} = ${total} masks\neach mask = one subset`, noteTone: 'found' }) },
  });
  return steps;
}

const ELEMENTS = [7, 9] as const;
const RUN = traceSubsets(ELEMENTS);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { subsets: 0, tests: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** problem 1 + idea 3 + build 5. */
const BUILD_END = 9;

export default defineWalkthrough({
  id: 'learn/bit-manipulation/bitmask-subsets',
  title: 'Bitmask subsets: one number per subset',
  summary: 'From the idea to the code: list every subset of a list by counting a mask from 0 to 2^n − 1, where each bit says whether one element is in.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def generate_subsets(elements: list[int]) -> list[list[int]]:
    n = len(elements)
    subsets: list[list[int]] = []

    for mask in range(1 << n):  # every n-bit number picks one subset
        current_subset: list[int] = []
        for i in range(n):
            if (mask >> i) & 1:  # bit i set means elements[i] is in
                current_subset.append(elements[i])
        subsets.append(current_subset)

    return subsets`,
  },
  snapshots: {
    doubling: `def subsets_doubling(elements: list[int]) -> list[list[int]]:
    subsets: list[list[int]] = [[]]
    for x in elements:
        subsets += [s + [x] for s in subsets]
    return subsets`,
  },
  metrics: [
    { key: 'subsets', label: 'Subsets saved' },
    { key: 'tests', label: 'Bit tests' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'bit / element tested' },
    { tone: 'done', label: 'in the subset' },
    { tone: 'found', label: 'all subsets' },
    { tone: 'muted', label: 'empty subset' },
  ],
  goals: [
    { text: 'See why a subset needs a number', step: 2 },
    { text: 'Read a mask as one switch per element', step: 3 },
    { text: 'Learn the bit test (mask >> i) & 1', step: 4 },
    { text: 'Follow every mask to its subset', step: BUILD_END + 2 },
    { text: 'Know why a number can stand for a set', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'List every subset',
      body: 'Packing for a hike: each gear item goes in the backpack or stays home. Two items give four possible packs, and ten items give 1024.\n\nLine 1 gets a list `elements` and returns **all** its subsets. Here `[7, 9]` gives `[]`, `[7]`, `[9]` and `[7, 9]`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ elements: ELEMENTS, stage: 'setup', bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Copying',
      title: 'The usual way: keep copying lists',
      body: 'Lines 3–4 start with `[[]]` and, for each element, add a copy of every subset so far with that element appended. It works, but every subset is just a list with no name.\n\nYou cannot use one as a table index, and dynamic programming over subsets needs exactly that.',
      code: { view: 'snapshot', id: 'doubling', lines: [2, 3, 4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('elements', 0, 0, ELEMENTS, { label: 'elements', codeVar: 'elements' }),
          note('note', 0, 150, 'after 7: [], [7]\nafter 9: [], [7], [9], [7, 9]\nlists, with no number to index by', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'A switch each',
      title: 'Give every element a switch',
      body: 'A subset is one choice per element: in or out. Write the choices as bits, one switch per element, and the row of bits is a number: the **mask**.\n\nWith `n` switches there are `2^n` patterns, and counting from 0 up to `2^n − 1` visits each pattern once.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('elements', 0, 0, ELEMENTS, { label: 'elements', codeVar: 'elements' }),
          arr('mask', 0, MASK_Y, [1, 0], { label: 'mask', indexLabels: ['b1', 'b0'], tones: { 1: 'compare' } }),
          note('note', 0, 300, 'mask 10 = 2: only element 1 is in\n00, 01, 10, 11 → 4 subsets', { tone: 'note' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Test a bit',
      title: 'Reading switch i: (mask >> i) & 1',
      body: 'To read bit `i`, shift the mask right `i` places so that bit lands in the ones column, then AND with 1 to throw the rest away.\n\nFor `mask = 2 = 10` and `i = 1`: `2 >> 1 = 1`, and `1 & 1 = 1`, so element 1 is in.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('elements', 0, 0, ELEMENTS, { label: 'elements', tones: { 1: 'active' }, codeVar: 'elements' }),
          arr('mask', 0, MASK_Y, [1, 0], { label: 'mask', indexLabels: ['b1', 'b0'], tones: { 0: 'active' } }),
          note('note', 0, 300, 'mask = 10, i = 1\n10 >> 1 = 01, 01 & 1 = 1 → in\ni = 0: 10 >> 0 = 10, & 1 = 0 → out', { tone: 'note' }),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 2–3: size and result list',
      body: '`n` is the number of switches. `subsets` collects one list per mask, and it starts empty.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['n = len(elements)', 'subsets = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Every mask',
      title: 'Lines 5–6: count through every mask',
      body: '`1 << n` is a 1 followed by `n` zeros, which is `2^n`. So `range(1 << n)` is every mask from 0 to `2^n − 1`. Each mask starts with an empty `current_subset`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['for mask in range(1 << n)', 'current_subset = []'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Read bits',
      title: 'Lines 7–9: collect the chosen elements',
      body: 'For each position `i`, line 8 is the bit test from the idea. When the bit is 1, line 9 puts `elements[i]` into the subset.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9], lines: [7, 8, 9] },
      metrics: startMetrics,
      changes: ['for i in range(n)', 'if (mask >> i) & 1', 'current_subset.append(elements[i])'],
      scene: at(7),
    },
    {
      chapter: 'build',
      short: 'Save',
      title: 'Line 10: keep the subset',
      body: 'After all `n` bits are read, `current_subset` is complete, and line 10 stores it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10], lines: [10] },
      metrics: startMetrics,
      changes: ['subsets.append(current_subset)'],
      scene: at(9),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 12: return everything',
      body: 'When the last mask is done, `subsets` holds all `2^n` lists.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [12] },
      metrics: startMetrics,
      changes: ['return subsets'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Every mask, every bit: O(n · 2^n)',
      body: 'There are `2^n` masks and each tests `n` bits, so it is **`O(n · 2^n)` time**. The output alone holds up to `n · 2^n` numbers; besides it the code keeps `current_subset`, **`O(n)` extra space**.\n\nSwitch to **🧪 Try your own** to list the subsets of up to three numbers.',
      code: { view: 'final', lines: [5, 7, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ elements: ELEMENTS, stage: 'exit', saved: RUN_SAVED(), note: '2 elements: 4 masks, 8 bit tests\n20 elements: 1,048,576 masks\neach added element doubles the work', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Bit test',
      title: 'Why a number can stand for a subset',
      body: 'Line 8 ties bit `i` of the mask to `elements[i]`, so a plain integer carries the whole in-or-out choice for every element. That is the key decision: the mask is the subset.\n\nBecause it is an integer, it can also index a table or key a memo, which is what bitmask dynamic programming uses.',
      code: { view: 'final', lines: [5, 8] },
      values: { 8: '(2 >> 1) & 1 = 1' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ elements: ELEMENTS, stage: 'test', mask: 2, i: 1, current: [], saved: RUN_SAVED().slice(0, 2), note: 'mask 10 → [9]\nmask 11 → [7, 9]\nthe integer is the subset' }) },
    },
  ],
  trace: {
    title: 'List the subsets of your own numbers',
    inputs: [{ name: 'elements', label: 'Elements (1–3 numbers)', kind: 'numbers', default: '7, 9, 4' }],
    presets: [
      { label: 'Lesson example', values: { elements: '7, 9' } },
      { label: 'Three elements', values: { elements: '7, 9, 4' } },
      { label: 'One element', values: { elements: '5' } },
      { label: 'Duplicates', values: { elements: '2, 2' } },
    ],
    maxItems: 3,
    run: (values) => {
      const elements = values['elements'];
      if (!Array.isArray(elements) || elements.length === 0) throw new Error('Enter one to three numbers.');
      return traceSubsets(elements);
    },
  },
});

/** The four subsets of the story example, in mask order. */
function RUN_SAVED(): Saved[] {
  return [
    { mask: 0, items: [] },
    { mask: 1, items: [7] },
    { mask: 2, items: [9] },
    { mask: 3, items: [7, 9] },
  ];
}
