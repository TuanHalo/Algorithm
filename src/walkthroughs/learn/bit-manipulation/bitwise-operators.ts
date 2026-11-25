import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const WIDTH = 8;
const MASK = 0xff;
/** Place value under each bit cell, left (most significant) to right. */
const PLACES = [128, 64, 32, 16, 8, 4, 2, 1] as const;
const B_Y = 130;
const R_Y = 260;
const NOTE_Y = 480;

type Op = 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr';

interface Result {
  readonly name: string;
  readonly op: Op;
  readonly value: number;
}

interface OpsState {
  readonly a: number;
  readonly b: number;
  /** Variables computed so far; the last one is drawn as the result row. */
  readonly results?: readonly Result[];
  /** Before line 2 the code has no variables yet. */
  readonly bare?: boolean;
  /** Show the finished list instead of a result row. */
  readonly returned?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** The 8 bits of n (0–255) as 0 / 1 cells, most significant first. */
const bits = (n: number): number[] => PLACES.map((p) => ((n & p) !== 0 ? 1 : 0));
const binary = (n: number): string => bits(n).join('');

/** Place values of the columns that hold a 1, e.g. `8 and 2`. */
function columns(n: number): string {
  const on = PLACES.filter((p) => (n & p) !== 0);
  if (on.length === 0) return 'none';
  return on.length === 1 ? `${on[0]}` : `${on.slice(0, -1).join(', ')} and ${on.at(-1)}`;
}

/** Scene for one moment: a and b as rows of bits, the result row under them, the variables on the right. */
function scene(s: OpsState): Entity[] {
  const results = s.results ?? [];
  const current = s.returned ? undefined : results.at(-1);
  const a = bits(s.a);
  const aTones: Record<number, Tone> = {};
  const bTones: Record<number, Tone> = {};
  const rTones: Record<number, Tone> = {};
  if (current) {
    const out = bits(current.value);
    out.forEach((bit, k) => {
      if (bit === 1) rTones[k] = 'found';
    });
    if (current.op === 'and' || current.op === 'or' || current.op === 'xor') {
      out.forEach((bit, k) => {
        if (bit === 1) {
          aTones[k] = 'compare';
          bTones[k] = 'compare';
        }
      });
    }
    if (current.op === 'shl') {
      rTones[6] = 'muted';
      rTones[7] = 'muted';
      for (const k of [0, 1]) if (a[k] === 1) aTones[k] = 'miss';
    }
    if (current.op === 'shr') {
      rTones[0] = 'muted';
      rTones[1] = 'muted';
      for (const k of [6, 7]) if (a[k] === 1) aTones[k] = 'miss';
    }
  }

  const entities: Entity[] = [
    arr('a', 0, 0, a, { label: 'a', tones: aTones, indexLabels: PLACES, codeVar: 'a' }),
    arr('b', 0, B_Y, bits(s.b), { label: 'b', tones: bTones, indexLabels: PLACES, codeVar: 'b' }),
  ];
  if (current) entities.push(arr('result', 0, R_Y, bits(current.value), { label: current.name, tones: rTones, indexLabels: PLACES, codeVar: current.name }));

  const rows: VarRow[] = [
    { name: 'a', value: s.a },
    { name: 'b', value: s.b },
  ];
  if (!s.bare) rows.push({ name: 'mask', value: MASK });
  results.forEach((r, i) => rows.push({ name: r.name, value: r.value, tone: !s.returned && i === results.length - 1 ? 'found' : 'default' }));
  entities.push(vars('vals', tableBesideArray(WIDTH, rows.length), 0, rows, { label: 'variables', width: 200 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the six operators on any two 8-bit numbers and records one step per decision (chapter "run", final code). */
function traceOps(a: number, b: number): Step[] {
  const steps: Step[] = [];
  const done: Result[] = [];
  const metrics = (result: string = '—'): Record<string, string | number> => {
    const last = done.at(-1);
    return { ops: done.length, ones: last ? bits(last.value).filter((bit) => bit === 1).length : '—', result };
  };
  const base = { a, b } as const;

  steps.push({
    chapter: 'run',
    short: 'Setup',
    title: `a = ${a} and b = ${b} as eight bits each`,
    body: `The call brings two numbers: \`a = ${binary(a)}\` and \`b = ${binary(b)}\`. Line 2 sets \`mask = 255\`, eight 1s (\`11111111\`), which will keep later results inside eight bits.`,
    code: { view: 'final', lines: [2] },
    values: { 2: 'mask = 255' },
    metrics: metrics(),
    scene: { entities: scene({ ...base }) },
  });

  const push = (r: Result, line: number, short: string, title: string, body: string, noteText: string, noteTone: Tone = 'note'): void => {
    done.push(r);
    steps.push({
      chapter: 'run',
      short,
      title,
      body,
      code: { view: 'final', lines: [line] },
      values: { [line]: `${r.name} = ${r.value}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, results: [...done], note: noteText, noteTone }) },
    });
  };

  const and = a & b;
  push(
    { name: 'and_ab', op: 'and', value: and },
    4,
    'AND',
    `a & b = ${and}`,
    `Line 4 looks at each column: the result bit is 1 only where **both** \`a\` and \`b\` have a 1. ${and === 0 ? 'No column has a 1 in both, so the result is 0.' : `Columns ${columns(and)} qualify: \`${binary(and)}\` = ${and}.`}`,
    `${binary(a)}\n${binary(b)} AND\n${binary(and)} = ${and}`,
  );
  const or = a | b;
  push(
    { name: 'or_ab', op: 'or', value: or },
    5,
    'OR',
    `a | b = ${or}`,
    `Line 5: the result bit is 1 where **at least one** of \`a\` and \`b\` has a 1. That gives columns ${columns(or)}: \`${binary(or)}\` = ${or}.`,
    `${binary(a)}\n${binary(b)} OR\n${binary(or)} = ${or}`,
  );
  const xor = a ^ b;
  push(
    { name: 'xor_ab', op: 'xor', value: xor },
    6,
    'XOR',
    `a ^ b = ${xor}`,
    `Line 6: the result bit is 1 where the two bits **differ**. ${xor === 0 ? 'Every column matches, so the result is 0: a number XOR itself is always 0.' : `Columns ${columns(xor)} differ: \`${binary(xor)}\` = ${xor}.`}`,
    `${binary(a)}\n${binary(b)} XOR\n${binary(xor)} = ${xor}`,
  );
  const not = ~a & MASK;
  push(
    { name: 'not_a', op: 'not', value: not },
    7,
    'NOT',
    `~a & mask = ${not}`,
    `Line 7: \`~a\` flips every bit, but in Python that is \`${~a}\` (an endless run of 1s on the left). \`& mask\` keeps the low eight bits: \`${binary(not)}\` = ${not}.`,
    `~${a} = ${~a}\n${~a} & 255 = ${not}\nflip each bit: ${binary(a)} → ${binary(not)}`,
  );
  const shl = (a << 2) & MASK;
  const lostLeft = bits(a)[0] === 1 || bits(a)[1] === 1;
  push(
    { name: 'shl', op: 'shl', value: shl },
    8,
    'Shift left',
    `(a << 2) & mask = ${shl}`,
    `Line 8 slides every bit two places left and fills the right with zeros, which multiplies by 4: \`${binary(shl)}\` = ${shl}. ${lostLeft ? '`& mask` throws away the bits that slid past the eighth column (red).' : '`& mask` has nothing to cut here, because no 1 slid past the eighth column.'}`,
    `${binary(a)} << 2\n${binary(shl)} = ${shl}${lostLeft ? '\ntop bits slid out and are cut' : ''}`,
  );
  const shr = a >> 2;
  const lostRight = bits(a)[6] === 1 || bits(a)[7] === 1;
  push(
    { name: 'shr', op: 'shr', value: shr },
    9,
    'Shift right',
    `a >> 2 = ${shr}`,
    `Line 9 slides every bit two places right, which divides by 4 and rounds down: \`${binary(shr)}\` = ${shr}. ${lostRight ? 'The bits that fell off the right (red) are gone, which is the rounding.' : 'The two bits that fell off the right were 0, so nothing is lost.'}`,
    `${binary(a)} >> 2\n${binary(shr)} = ${shr}${lostRight ? '\nlow bits fell off: rounded down' : ''}`,
  );

  const list = done.map((r) => r.value);
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return [${list.join(', ')}]`,
    body: `Line 11 returns the six results in a list: **[${list.join(', ')}]**. Every operator handled all eight columns at once.`,
    code: { view: 'final', lines: [11] },
    values: { 11: `return [${list.join(', ')}]` },
    metrics: metrics('6 values'),
    scene: { entities: scene({ ...base, results: [...done], returned: true, note: `return [${list.join(', ')}]`, noteTone: 'found' }) },
  });
  return steps;
}

const A = 12;
const B = 10;
const RUN = traceOps(A, B);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { ops: 0, ones: '—', result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 10;

export default defineWalkthrough({
  id: 'learn/bit-manipulation/bitwise-operators',
  title: 'Bitwise operators, one column at a time',
  summary: 'From the idea to the code: write numbers as rows of bits and see AND, OR, XOR, NOT and the shifts work on every column at once.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def bitwise_ops(a: int, b: int) -> list[int]:
    mask = 0xFF  # Python ints have no width, so cut ~ and << back to 8 bits

    and_ab = a & b
    or_ab = a | b
    xor_ab = a ^ b
    not_a = ~a & mask
    shl = (a << 2) & mask
    shr = a >> 2

    return [and_ab, or_ab, xor_ab, not_a, shl, shr]`,
  },
  snapshots: {
    slow: `def and_slow(a: int, b: int) -> int:
    result = 0
    for k in range(8):
        if (a >> k) & 1 and (b >> k) & 1:
            result |= 1 << k
    return result`,
  },
  metrics: [
    { key: 'ops', label: 'Operators' },
    { key: 'ones', label: '1s in result' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'columns that decide' },
    { tone: 'found', label: '1 in the result' },
    { tone: 'miss', label: '1 shifted out' },
    { tone: 'muted', label: '0 shifted in' },
  ],
  goals: [
    { text: 'Read a number as a row of bits', step: 2 },
    { text: 'Apply AND, OR and XOR column by column', step: 4 },
    { text: 'See what ~ and the shifts do to the row', step: 5 },
    { text: 'Know why Python needs a mask', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Two numbers, eight switches each',
      body: 'A number is a panel of light switches: each one is a **bit**, up (1) or down (0). Bitwise operators work on the whole panel at once.\n\nLine 1 takes two numbers `a` and `b` and returns the results of all six operators. Here `a = 12` and `b = 10`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, bare: true }) },
    },
    {
      chapter: 'problem',
      short: 'Place values',
      title: 'Each column is worth twice the one on its right',
      body: 'The numbers under the cells are place values: 128, 64, … down to 1. A number is the sum of the columns that hold a 1.\n\nSo `a = 00001100` is 8 + 4 = 12, and `b = 00001010` is 8 + 2 = 10.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, bare: true, note: 'a = 8 + 4 = 12\nb = 8 + 2 = 10' }) },
    },
    {
      chapter: 'idea',
      short: 'One by one',
      title: 'The slow way: test each column',
      body: 'Lines 3–5 build an AND by hand: for each of the 8 columns, test both bits and set the result bit if both are 1.\n\nThat is **8 tests per operator**. The CPU has a gate for every column, so one instruction does all eight at once.',
      code: { view: 'snapshot', id: 'slow', lines: [3, 4, 5] },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, bare: true, note: '8 columns → 8 tests, one operator\nthe CPU: 8 gates side by side → 1 step', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Column rules',
      title: 'Each operator is a rule for one column',
      body: 'The rule is the same in every column, and it only looks at that column’s two bits. That is why one operator can handle all of them together.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, bare: true, note: 'AND  1 only if both are 1\nOR   1 if at least one is 1\nXOR  1 if the two bits differ' }) },
    },
    {
      chapter: 'idea',
      short: 'NOT, shifts',
      title: 'NOT flips, shifts slide, and Python has no width',
      body: '`~a` flips every bit and `a << 2` slides the row two places left, filling with zeros. Python ints have no fixed width, so `~12` is `−13`, with endless 1s on the left.\n\nAn AND with `mask = 0xFF` (eight 1s) keeps only the low eight columns, so every result fits the row.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, results: [RUN_RESULT_PREVIEW()], note: '~12 = −13: endless 1s on the left\n& 0xFF keeps the low 8 bits → 243\n<< 2 slides left; × 4 if nothing falls out' }) },
    },
    {
      chapter: 'build',
      short: 'Mask',
      title: 'Line 2: the mask',
      body: '`mask = 0xFF` is `11111111`. Any result AND-ed with it keeps its low eight bits and drops the rest.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['mask = 0xFF'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'AND OR XOR',
      title: 'Lines 4–6: the three column rules',
      body: 'Each line is one operator on the two rows. `&` keeps a 1 only where both have it, `|` where either has it, `^` where they differ.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6], lines: [4, 5, 6] },
      metrics: startMetrics,
      changes: ['and_ab = a & b', 'or_ab = a | b', 'xor_ab = a ^ b'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'NOT',
      title: 'Line 7: flip every bit',
      body: '`~a` flips all bits of `a`; the `& mask` keeps eight of them. Flipping `00001100` gives `11110011`.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7], lines: [7] },
      metrics: startMetrics,
      changes: ['not_a = ~a & mask'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Shifts',
      title: 'Lines 8–9: slide the row',
      body: 'Left shift slides bits toward the big columns (× 2 per place) and needs the mask, because bits can pass the eighth column. Right shift slides toward the small ones (÷ 2 per place, rounding down), so nothing can overflow.',
      code: { view: 'reveal', reveal: [1, 2, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['shl = (a << 2) & mask', 'shr = a >> 2'],
      scene: at(5),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 11: return all six',
      body: 'Line 11 collects the results in a list.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [11] },
      metrics: startMetrics,
      changes: ['return [and_ab, or_ab, xor_ab, not_a, shl, shr]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Eight columns, one step: O(1)',
      body: 'Every operator touches all columns at once, so each line is **`O(1)` time** for a fixed width, and the six results take **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to run it on any two numbers from 0 to 255.',
      code: { view: 'final', lines: [4, 5, 6, 7, 8, 9] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ a: A, b: B, results: RUN_RESULTS(), returned: true, note: 'AND, OR, XOR, NOT, <<, >>\nall: 8 columns, 1 CPU step\nO(1) time, O(1) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'The mask',
      title: 'Why NOT and shift-left need the mask',
      body: 'A C `uint8_t` forgets bits past the eighth column by itself. A Python int never does, so `~12` stays `−13` and `1 << 7 << 7` keeps growing.\n\nThat is the key decision: pick a width with `mask` and AND it in whenever a result can leave it. `AND`, `OR`, `XOR` and `>>` never need it, since their results stay inside the inputs’ width.',
      code: { view: 'final', lines: [2, 7, 8] },
      values: { 2: 'mask = 255', 7: '~12 & 255 = 243', 8: '(12 << 2) & 255 = 48' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ a: A, b: B, results: [RUN_RESULTS()[3] ?? RUN_RESULT_PREVIEW()], note: '~12 = −13\n−13 & 255 = 243 = 11110011\nwithout the mask: negative, no width', noteTone: 'note' }) },
    },
  ],
  trace: {
    title: 'Run the six operators on your own numbers',
    inputs: [
      { name: 'a', label: 'a (0–255)', kind: 'number', default: '12' },
      { name: 'b', label: 'b (0–255)', kind: 'number', default: '10' },
    ],
    presets: [
      { label: 'Lesson example', values: { a: '12', b: '10' } },
      { label: 'Shifts overflow', values: { a: '201', b: '60' } },
      { label: 'Same number', values: { a: '90', b: '90' } },
      { label: 'Zero and all ones', values: { a: '0', b: '255' } },
    ],
    run: (values) => {
      const a = values['a'];
      const b = values['b'];
      if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Enter two numbers.');
      if (a < 0 || a > 255 || b < 0 || b > 255) throw new Error('Use whole numbers from 0 to 255 (eight bits).');
      return traceOps(a, b);
    },
  },
});

/** The six results of the story example, in order. */
function RUN_RESULTS(): Result[] {
  return [
    { name: 'and_ab', op: 'and', value: A & B },
    { name: 'or_ab', op: 'or', value: A | B },
    { name: 'xor_ab', op: 'xor', value: A ^ B },
    { name: 'not_a', op: 'not', value: ~A & MASK },
    { name: 'shl', op: 'shl', value: (A << 2) & MASK },
    { name: 'shr', op: 'shr', value: A >> 2 },
  ];
}

/** `not_a` of the story example, shown in the idea step that introduces ~ and the mask. */
function RUN_RESULT_PREVIEW(): Result {
  return { name: 'not_a', op: 'not', value: ~A & MASK };
}
