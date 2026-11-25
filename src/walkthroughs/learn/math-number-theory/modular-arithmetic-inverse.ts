import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface InverseState {
  readonly b: number;
  readonly mod: number;
  /** Binary digits of `mod - 2`, lowest first. */
  readonly bits: readonly number[];
  /** Index of the bit `exponent & 1` looks at (bits before it are used up). */
  readonly turn: number;
  /** The lowest bit is being tested right now. */
  readonly testing?: boolean;
  readonly result?: number;
  readonly base?: number;
  readonly exponent?: number;
  /** After a multiply or a skip, draw the arc from the bit to `result`. */
  readonly arc?: 'multiply' | 'skip';
  readonly resultTone?: Tone;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code introduces `result`, `base` and `exponent`, show only `b` and `mod`. */
  readonly bare?: boolean;
}

const bitsOf = (e: number): number[] => {
  if (e === 0) return [0];
  const out: number[] = [];
  for (let x = e; x > 0; x >>= 1) out.push(x & 1);
  return out;
};

const modOf = (x: number, mod: number): number => ((x % mod) + mod) % mod;

/** Scene for one moment: the bits of the exponent, the variables and a multiply arc. */
function scene(s: InverseState): Entity[] {
  const tones: Record<number, Tone> = {};
  s.bits.forEach((_, i) => {
    if (i < s.turn) tones[i] = 'muted';
  });
  if (s.turn < s.bits.length) tones[s.turn] = s.testing ? 'active' : 'compare';

  const entities: Entity[] = [arr('bits', 0, 0, s.bits, { label: 'bits of exponent, lowest first', tones, codeVar: 'exponent' })];
  if (s.arc && s.turn < s.bits.length) {
    entities.push(
      link('use', { entity: 'bits', index: s.turn, side: 'bottom' }, { entity: 'vals', key: 'result' }, s.arc === 'multiply'
        ? { tone: 'found', flow: true }
        : { tone: 'miss', dashed: true }),
    );
  }
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      s.bare
        ? [
            { name: 'b', value: s.b },
            { name: 'mod', value: s.mod },
          ]
        : [
            { name: 'b', value: s.b },
            { name: 'mod', value: s.mod },
            { name: 'result', value: s.result ?? '—', tone: s.resultTone ?? (s.result === undefined ? 'muted' : 'default') },
            { name: 'base', value: s.base ?? '—', tone: s.base === undefined ? 'muted' : 'default' },
            { name: 'exponent', value: s.exponent ?? '—', tone: s.exponent === undefined ? 'muted' : 'default' },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61] as const;

/** Runs the Fermat inverse on any b and prime mod, one step per decision (chapter "run", final code). */
function traceInverse(b: number, mod: number): Step[] {
  const e0 = mod - 2;
  const bits = bitsOf(e0);
  const steps: Step[] = [];
  let turns = 0;
  let multiplies = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ turns, multiplies, result });
  const reduced = modOf(b, mod);
  const common = { b, mod, bits } as const;

  if (reduced === 0) {
    steps.push({
      chapter: 'run',
      short: 'No inverse',
      title: `${b} % ${mod} = 0: there is no inverse`,
      body: `Line 2: \`${b} % ${mod} == 0\` is **true**. A multiple of ${mod} times anything is still a multiple of ${mod}, so it can never be 1. Line 3 raises \`ZeroDivisionError\`.`,
      code: { view: 'final', lines: [2, 3] },
      values: { 2: `${b} % ${mod} = 0 → True`, 3: 'raise ZeroDivisionError' },
      metrics: metrics('error'),
      scene: { entities: scene({ ...common, turn: 0, bare: true, note: `${mod} divides ${b}\nb × x % ${mod} is always 0, never 1\n→ raise ZeroDivisionError`, noteTone: 'miss' }) },
    });
    return steps;
  }

  steps.push({
    chapter: 'run',
    short: 'Guard',
    title: `Is ${b} a multiple of ${mod}?`,
    body: `Line 2: \`${b} % ${mod} == 0\` is false (\`${b} % ${mod} = ${reduced}\`), so ${b} has an inverse. Line 3 is skipped.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `${b} % ${mod} = ${reduced} → False` },
    metrics: metrics(),
    scene: { entities: scene({ ...common, turn: 0, bare: true }) },
  });

  let result = 1;
  let base = reduced;
  let exponent = e0;
  steps.push({
    chapter: 'run',
    short: 'Setup',
    title: `Start: result = 1, base = ${base}, exponent = ${exponent}`,
    body: `Line 5 starts \`result\` at 1. Line 6 reduces \`b\` into 0 to ${mod - 1}: \`base = ${b} % ${mod} = ${base}\`. Line 7 sets \`exponent = ${mod} - 2 = ${exponent}\`.\n\nLine 9: \`${exponent} > 0\` is **${exponent > 0 ? 'true, so the loop starts' : 'false, so the loop never runs'}**.`,
    code: { view: 'final', lines: [5, 6, 7, 9] },
    values: { 5: 'result = 1', 6: `base = ${b} % ${mod} = ${base}`, 7: `exponent = ${mod} - 2 = ${exponent}`, 9: `${exponent} > 0 → ${exponent > 0 ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ ...common, turn: 0, result, base, exponent }) },
  });

  let first = true;
  for (let t = 0; exponent > 0; t += 1) {
    const bit = exponent & 1;
    steps.push({
      chapter: 'run',
      short: `Bit ${t}`,
      title: bit ? `exponent & 1 = 1: the bit is set` : `exponent & 1 = 0: the bit is clear`,
      body: `${first ? '' : `Line 9: \`${exponent} > 0\`, so go again. `}Line 10 looks at the lowest bit of \`exponent = ${exponent}\`: \`${exponent} & 1 = ${bit}\`. ${
        bit ? `It is 1, so the current power of the base, ${base}, belongs in the answer.` : 'It is 0, so this power of the base is not needed.'
      }`,
      code: { view: 'final', lines: first ? [10] : [9, 10] },
      values: first ? { 10: `${exponent} & 1 → ${bit}` } : { 9: `${exponent} > 0 → True`, 10: `${exponent} & 1 → ${bit}` },
      metrics: metrics(),
      scene: { entities: scene({ ...common, turn: t, testing: true, result, base, exponent }) },
    });
    first = false;

    if (bit) {
      const next = (result * base) % mod;
      steps.push({
        chapter: 'run',
        short: `Times ${t}`,
        title: `result = ${result} × ${base} % ${mod} = ${next}`,
        body: `Line 11 multiplies the answer so far by the current power: \`${result} × ${base} = ${result * base}\`, and \`% ${mod}\` brings it back to **${next}**.`,
        code: { view: 'final', lines: [11] },
        values: { 11: `result = ${result} × ${base} % ${mod} = ${next}` },
        metrics: { ...metrics(), multiplies: multiplies + 1 },
        changes: [`result = ${next}`],
        scene: { entities: scene({ ...common, turn: t, result: next, base, exponent, arc: 'multiply', resultTone: 'compare' }) },
      });
      result = next;
      multiplies += 1;
    }

    const squared = (base * base) % mod;
    steps.push({
      chapter: 'run',
      short: `Square ${t}`,
      title: `base = ${base} × ${base} % ${mod} = ${squared}`,
      body: `${bit ? '' : 'Line 11 is skipped. '}Line 12 squares the base: \`${base} × ${base} = ${base * base}\`, and \`% ${mod}\` gives **${squared}**. That is the power for the next bit, twice as high as before.`,
      code: { view: 'final', lines: [12] },
      values: { 12: `base = ${base} × ${base} % ${mod} = ${squared}` },
      metrics: metrics(),
      changes: [`base = ${squared}`],
      scene: { entities: scene({ ...common, turn: t, result, base: squared, exponent, arc: bit ? 'multiply' : 'skip' }) },
    });
    base = squared;

    const shifted = exponent >> 1;
    steps.push({
      chapter: 'run',
      short: `Shift ${t}`,
      title: `exponent >>= 1: ${exponent} becomes ${shifted}`,
      body: `Line 13 shifts the bits right: the bit we just used falls off and \`exponent\` becomes **${shifted}**.`,
      code: { view: 'final', lines: [13] },
      values: { 13: `exponent = ${exponent} >> 1 = ${shifted}` },
      metrics: { ...metrics(), turns: turns + 1 },
      changes: [`exponent = ${shifted}`],
      scene: { entities: scene({ ...common, turn: t + 1, result, base, exponent: shifted }) },
    });
    exponent = shifted;
    turns += 1;
  }

  if (e0 > 0) {
    steps.push({
      chapter: 'run',
      short: 'Done',
      title: 'exponent reached 0: the loop stops',
      body: 'Line 9: `0 > 0` is false, so every bit has been used.',
      code: { view: 'final', lines: [9] },
      values: { 9: '0 > 0 → False' },
      metrics: metrics(),
      scene: { entities: scene({ ...common, turn: bits.length, result, base, exponent }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${result}`,
    body: `Line 15 returns **${result}**. Check: \`${reduced} × ${result} = ${reduced * result}\`, and \`${reduced * result} % ${mod} = ${(reduced * result) % mod}\`, so dividing by ${b} is multiplying by ${result}.`,
    code: { view: 'final', lines: [15] },
    values: { 15: `return ${result}` },
    metrics: metrics(result),
    scene: {
      entities: scene({ ...common, turn: bits.length, result, base, exponent, resultTone: 'found', note: `${reduced} × ${result} = ${reduced * result}\n= ${Math.floor((reduced * result) / mod)} × ${mod} + ${(reduced * result) % mod}  ≡  1`, noteTone: 'found' }),
    },
  });
  return steps;
}

const B = 3;
const MOD = 7;
const RUN = traceInverse(B, MOD);
const byShort = (short: string): number => RUN.findIndex((s) => s.short === short);
/** Scene of the run step with this rail label, so build steps show the moment they describe. */
const at = (short: string): Step['scene'] => RUN[byShort(short)]?.scene ?? { entities: [] };
const BITS = bitsOf(MOD - 2);
const startMetrics = { turns: 0, multiplies: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;

export default defineWalkthrough({
  id: 'learn/math-number-theory/modular-arithmetic-inverse',
  title: 'Modular inverse by Fermat and fast exponentiation',
  summary: 'From the idea to the code: divide in modular arithmetic by multiplying with the inverse b^(mod − 2), computed with squaring.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def mod_inverse(b: int, mod: int) -> int:
    if b % mod == 0:
        raise ZeroDivisionError(f"{b} has no inverse modulo {mod}")

    result = 1
    base = b % mod
    exponent = mod - 2  # Fermat: b^(mod - 2) is the inverse when mod is prime

    while exponent > 0:
        if exponent & 1:  # lowest bit is 1: this power of base is needed
            result = result * base % mod
        base = base * base % mod  # next power: b^1, b^2, b^4, b^8, ...
        exponent >>= 1

    return result`,
  },
  snapshots: {
    brute: `def mod_inverse(b: int, mod: int) -> int:
    for x in range(1, mod):
        if b * x % mod == 1:
            return x
    raise ZeroDivisionError("no inverse")`,
  },
  metrics: [
    { key: 'turns', label: 'Bits used' },
    { key: 'multiplies', label: 'Multiplies' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'bit being tested' },
    { tone: 'compare', label: 'bit in play / result updated' },
    { tone: 'muted', label: 'bit used up' },
    { tone: 'found', label: 'the inverse' },
  ],
  goals: [
    { text: 'See why division needs an inverse', step: 2 },
    { text: 'Understand why b^(mod − 2) is the inverse', step: 3 },
    { text: 'Build the squaring loop line by line', step: 5 },
    { text: 'Follow every bit, multiply and square', step: 12 },
    { text: 'Know why the exponent is mod − 2', step: 26 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'What is 1 / 3 modulo 7?',
      body: 'Modular arithmetic wraps around like a clock, and there is no fractional 1/3 on it. To "divide by 3" we need a number `x` with `3 × x ≡ 1 (mod 7)`: multiplying by `x` then undoes multiplying by 3.\n\nLine 1 takes `b` and a prime `mod` and returns that inverse `x`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ b: B, mod: MOD, bits: BITS, turn: 0, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Try each x',
      title: 'The obvious way: try every x',
      body: 'Lines 2–4 test `x = 1, 2, 3, …` until `b × x % mod` is 1. For `b = 3` modulo 7 the products are 3, 6, 2, 5, **1**: `x = 5`.\n\nThat is up to `mod − 1` tries, `O(mod)`, hopeless for `mod = 10⁹ + 7`.',
      code: { view: 'snapshot', id: 'brute', lines: [2, 3, 4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('tries', 0, 0, [3, 6, 2, 5, 1, 4], { label: 'b × x % mod, for x = 1 … 6', tones: { 0: 'miss', 1: 'miss', 2: 'miss', 3: 'miss', 4: 'found', 5: 'muted' }, indexLabels: [1, 2, 3, 4, 5, 6] }),
          vars('vals', 0, VARS_Y, [{ name: 'b', value: B }, { name: 'mod', value: MOD }], { label: 'variables', width: 180 }),
          note('note', NOTE_X, VARS_Y, '3 × 5 = 15 = 2 × 7 + 1\nx = 5 after 5 tries\nup to mod − 1 tries: O(mod)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Fermat',
      title: 'Fermat: for a prime mod, b^(mod − 1) ≡ 1',
      body: 'Fermat’s little theorem says that for a prime `mod` and `b` not a multiple of it, `b^(mod − 1) ≡ 1 (mod mod)`. Split off one factor of `b`: `b × b^(mod − 2) ≡ 1`.\n\nThat is exactly the inverse we wanted: **`x = b^(mod − 2)`**. Here `3^5 = 243`, and `243 % 7 = 5`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ b: B, mod: MOD, bits: BITS, turn: 0, bare: true, note: '3^6 ≡ 1 (mod 7)\n3 × 3^5 ≡ 1\ninverse = 3^(mod − 2) = 3^5' }) },
    },
    {
      chapter: 'idea',
      short: 'Squaring',
      title: 'Compute b^e with its bits instead of e multiplies',
      body: 'The exponent 5 is `101` in binary, so `3^5 = 3^4 × 3^1`. Keep a `base` that goes 3¹, 3², 3⁴, … by squaring, and multiply it into `result` only where a bit is 1.\n\nThat is about `log₂(e)` squarings instead of `e` multiplies. Taking `% mod` after every multiply keeps the numbers small, because `(x × y) % m = ((x % m) × (y % m)) % m`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ b: B, mod: MOD, bits: BITS, turn: 0, bare: true, note: '5 = 1 + 4  →  3^5 = 3^1 × 3^4\nbase: 3, 3² = 2, 3⁴ = 4  (mod 7)\nresult = 3 × 4 = 12 ≡ 5' }) },
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 2–3: a multiple of mod has no inverse',
      body: 'If `b % mod == 0`, every `b × x` is a multiple of `mod`, never 1. Fermat’s formula would also quietly return 0, so we raise an error instead.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if b % mod == 0: raise ZeroDivisionError'],
      scene: at('Guard'),
    },
    {
      chapter: 'build',
      short: 'Variables',
      title: 'Lines 5–7: the answer, the base and the exponent',
      body: '`result` starts at 1 (the empty product). `base` is `b` reduced into 0 to `mod − 1`. `exponent = mod - 2` is the power from Fermat that we need.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['result = 1', 'base = b % mod', 'exponent = mod - 2'],
      scene: at('Setup'),
    },
    {
      chapter: 'build',
      short: 'Read a bit',
      title: 'Lines 9–10: walk the bits, lowest first',
      body: 'The loop runs until `exponent` is used up. `exponent & 1` keeps only the lowest bit: 1 if the current power of `base` is part of the answer, 0 if not.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['while exponent > 0', 'if exponent & 1'],
      scene: at('Bit 0'),
    },
    {
      chapter: 'build',
      short: 'Mult + square',
      title: 'Lines 11–12: multiply in, then square the base',
      body: 'On a 1 bit, line 11 multiplies `base` into `result`. Line 12 then squares `base`, so it holds the power for the next bit. Both end with `% mod` so no number ever grows past `mod²`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 9, 10, 11, 12], lines: [11, 12] },
      metrics: { ...startMetrics, multiplies: 1 },
      changes: ['result = result * base % mod', 'base = base * base % mod'],
      scene: at('Square 0'),
    },
    {
      chapter: 'build',
      short: 'Shift, return',
      title: 'Lines 13 and 15: drop the used bit, return the result',
      body: '`exponent >>= 1` shifts the bits right, so the next bit becomes the lowest. When no bits are left, `result` holds `b^(mod − 2) % mod`.\n\nThat is the whole function. Now let’s run it.',
      code: { view: 'final', lines: [13, 15] },
      metrics: FINAL_METRICS,
      changes: ['exponent >>= 1', 'return result'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One turn per bit: O(log mod)',
      body: 'The loop runs once per bit of `mod − 2`, and each turn does at most two multiplications. That is **`O(log mod)` time** and `O(1)` space.\n\nSwitch to **🧪 Try your own** to invert any number modulo a prime.',
      code: { view: 'final', lines: [9, 11, 12, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ b: B, mod: MOD, bits: BITS, turn: BITS.length, result: 5, base: 4, exponent: 0, resultTone: 'found', note: 'mod = 7        → 3 bits  → ≤ 6 multiplies\nmod = 10⁹ + 7  → 30 bits → ≤ 60 multiplies\nversus mod − 2 multiplies by hand', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why mod − 2',
      title: 'Why line 7 raises b to mod − 2',
      body: 'Fermat gives `b^(mod − 1) ≡ 1`. Writing that as `b × b^(mod − 2)` shows that `b^(mod − 2)` is a number which, multiplied by `b`, gives 1: the inverse. Here `3 × 5 = 15 = 2 × 7 + 1`.\n\nThat is the key decision: pick the exponent `mod − 2`, and fast exponentiation does the rest. It needs `mod` prime, which is why the lesson’s other inverse methods exist for composite moduli.',
      code: { view: 'final', lines: [7, 15] },
      values: { 7: 'exponent = 7 - 2 = 5', 15: 'return 5  (3 × 5 ≡ 1)' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ b: B, mod: MOD, bits: BITS, turn: BITS.length, result: 5, base: 4, exponent: 0, resultTone: 'found', note: '3^(7 − 1) = 3 × 3^5 ≡ 1 (mod 7)\n3^5 = 243 = 34 × 7 + 5\n3 × 5 = 15 = 2 × 7 + 1', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Invert your own number modulo a prime',
    inputs: [
      { name: 'b', label: 'b (−99 to 99)', kind: 'number', default: '3' },
      { name: 'mod', label: 'Prime modulus (2 to 61)', kind: 'number', default: '7' },
    ],
    presets: [
      { label: 'b larger than mod', values: { b: '10', mod: '7' } },
      { label: 'b = 1', values: { b: '1', mod: '13' } },
      { label: 'No inverse', values: { b: '14', mod: '7' } },
      { label: 'Negative b', values: { b: '-3', mod: '7' } },
      { label: 'mod = 2', values: { b: '1', mod: '2' } },
      { label: 'Longer exponent', values: { b: '5', mod: '61' } },
    ],
    run: (values) => {
      const b = values['b'];
      const mod = values['mod'];
      if (typeof b !== 'number' || typeof mod !== 'number') throw new Error('Enter b and a prime modulus.');
      if (b < -99 || b > 99) throw new Error('Use a b from −99 to 99.');
      if (!(PRIMES as readonly number[]).includes(mod)) throw new Error('The modulus must be a prime from 2 to 61 (2, 3, 5, 7, 11, 13, …). Fermat’s formula needs a prime.');
      return traceInverse(b, mod);
    },
  },
});
