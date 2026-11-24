import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const ROW = 10;
const ROW_Y = 130;
const VARS_X = tableBesideArray(ROW, 4);

interface SieveState {
  readonly n: number;
  /** The `is_prime` flags, index 0..n. */
  readonly flags: readonly boolean[];
  readonly p?: number;
  readonly multiple?: number;
  /** Which cell is being processed right now. */
  readonly active?: 'p' | 'multiple';
  /** Primes whose crossing-out pass has finished. */
  readonly done?: readonly number[];
  /** The sieve has finished: surviving cells are the answer. */
  readonly final?: boolean;
  /** Before the code introduces `p` and `multiple`, show only `n`. */
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

const rowOf = (k: number): string => `is-prime-${Math.floor(k / ROW)}`;
const colOf = (k: number): number => k % ROW;
const allTrue = (n: number): boolean[] => Array.from({ length: n + 1 }, () => true);

/** Scene for one moment: the flags drawn as rows of numbers, `p` and `multiple` pointers, the variables. */
function scene(s: SieveState): Entity[] {
  const tone = (i: number): Tone | undefined => {
    if (s.final) return s.flags[i] ? 'found' : 'muted';
    if (s.active === 'multiple' && s.multiple === i) return 'active';
    if (s.active === 'p' && s.p === i) return 'active';
    if (s.p === i && s.flags[i]) return 'done';
    if (s.done?.includes(i)) return 'done';
    if (!s.flags[i]) return 'muted';
    return undefined;
  };

  const rows = Math.ceil((s.n + 1) / ROW);
  const entities: Entity[] = [];
  for (let r = 0; r < rows; r += 1) {
    const from = r * ROW;
    const values = Array.from({ length: Math.min(ROW, s.n + 1 - from) }, (_, c) => from + c);
    const tones: Record<number, Tone> = {};
    values.forEach((v, c) => {
      const t = tone(v);
      if (t) tones[c] = t;
    });
    entities.push(arr(`is-prime-${r}`, 0, r * ROW_Y, values, { ...(r === 0 ? { label: 'is_prime' } : {}), tones, showIndex: false, codeVar: 'is_prime' }));
  }
  if (s.p !== undefined && !s.bare) {
    entities.push(ptr('p', rowOf(s.p), colOf(s.p), 'p', { side: 'top', tone: s.active === 'p' ? 'active' : 'done', codeVar: 'p' }));
  }
  if (s.multiple !== undefined) {
    entities.push(ptr('multiple', rowOf(s.multiple), colOf(s.multiple), 'multiple', { side: 'top', tone: 'active', codeVar: 'multiple' }));
  }
  entities.push(
    vars(
      'vals',
      VARS_X,
      0,
      s.bare
        ? [{ name: 'n', value: s.n }]
        : [
            { name: 'n', value: s.n },
            { name: 'p', value: s.p ?? '—', tone: s.p === undefined ? 'muted' : 'default' },
            { name: 'p * p', value: s.p === undefined ? '—' : s.p * s.p, tone: s.p === undefined ? 'muted' : 'default' },
            { name: 'multiple', value: s.multiple ?? '—', tone: s.multiple === undefined ? 'muted' : 'default' },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', 0, rows * ROW_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const list = (values: readonly number[], max = 7): string => (values.length > max ? `${values.slice(0, max).join(', ')}, …` : values.join(', '));

const MAX_N = 29;

/** Runs the sieve on any n and records one step per decision (chapter "run", final code). */
function traceSieve(n: number): Step[] {
  const steps: Step[] = [];
  let crossings = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ crossings, result });

  steps.push({
    chapter: 'run',
    short: 'n < 2?',
    title: `Is n = ${n} too small to hold a prime?`,
    body:
      n < 2
        ? `Line 2: \`${n} < 2\` is **true**. The smallest prime is 2, so line 3 returns the empty list.`
        : `Line 2: \`${n} < 2\` is false, so there are primes to look for. Line 3 is skipped.`,
    code: { view: 'final', lines: n < 2 ? [2, 3] : [2] },
    values: n < 2 ? { 2: `${n} < 2 → True`, 3: 'return []' } : { 2: `${n} < 2 → False` },
    metrics: metrics(n < 2 ? '[]' : '—'),
    scene: { entities: scene({ n, flags: allTrue(n), bare: true }) },
  });
  if (n < 2) return steps;

  const flags = allTrue(n);
  steps.push({
    chapter: 'run',
    short: 'Flags',
    title: `Start with a flag for every number 0 to ${n}`,
    body: `Line 5 makes \`n + 1\` flags, all \`True\` for now (a number is "maybe prime" until something crosses it out). Line 6 sets \`is_prime[0]\` and \`is_prime[1]\` to \`False\`: neither is prime.\n\nIn the picture the number in a cell is its index, and a grey cell means \`False\`.`,
    code: { view: 'final', lines: [5, 6] },
    values: { 5: `[True] * ${n + 1}`, 6: 'is_prime[0] = is_prime[1] = False' },
    metrics: metrics(),
    changes: ['is_prime[0] = False', 'is_prime[1] = False'],
    scene: { entities: scene({ n, flags: flags.map((f, i) => (i < 2 ? false : f)), bare: true }) },
  });
  flags[0] = false;
  flags[1] = false;

  const done: number[] = [];
  let p = 2;
  steps.push({
    chapter: 'run',
    short: 'p = 2',
    title: 'Start at p = 2, the first candidate',
    body: `Line 8 sets \`p = 2\`. Line 9 asks \`p * p <= n\`: \`${p * p} <= ${n}\` is **${p * p <= n ? 'true, so the loop starts' : 'false: every composite up to n would have a factor of at most √n, and there is none to cross out'}**.`,
    code: { view: 'final', lines: [8, 9] },
    values: { 8: 'p = 2', 9: `${p * p} <= ${n} → ${p * p <= n ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ n, flags, p, done }) },
  });

  let first = true;
  while (p * p <= n) {
    const prime = flags[p] === true;
    steps.push({
      chapter: 'run',
      short: `is_prime[${p}]?`,
      title: prime ? `is_prime[${p}] is True: ${p} is prime` : `is_prime[${p}] is False: ${p} was crossed out`,
      body: `${first ? '' : `Line 9: \`${p * p} <= ${n}\`, so go again. `}Line 10 checks the flag at \`p = ${p}\`. ${
        prime
          ? `Nothing smaller crossed ${p} out, so **${p} is prime** and line 12 will cross out its multiples.`
          : `A smaller prime already crossed ${p} out, so it cannot be prime. Its multiples are multiples of that prime too, and are crossed out already: skip it.`
      }`,
      code: { view: 'final', lines: first ? [10] : [9, 10] },
      values: first ? { 10: `is_prime[${p}] → ${prime ? 'True' : 'False'}` } : { 9: `${p * p} <= ${n} → True`, 10: `is_prime[${p}] → ${prime ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ n, flags, p, active: 'p', done }) },
    });
    first = false;

    if (prime) {
      const multiples: number[] = [];
      for (let m = p * p; m <= n; m += p) multiples.push(m);
      steps.push({
        chapter: 'run',
        short: `Multiples of ${p}`,
        title: `Cross out the multiples of ${p}, starting at ${p * p}`,
        body: `Line 12 walks \`range(${p * p}, ${n + 1}, ${p})\`: ${list(multiples)}.\n\n${
          p === 2
            ? 'It starts at `p * p = 4`, since 2 itself must stay.'
            : `It starts at \`p * p = ${p * p}\`, not at \`2 × ${p}\`: the multiples \`${p} × 2\` to \`${p} × ${p - 1}\` each have a smaller prime factor and are already crossed out.`
        }`,
        code: { view: 'final', lines: [12] },
        values: { 12: `range(${p * p}, ${n + 1}, ${p})` },
        metrics: metrics(),
        scene: { entities: scene({ n, flags, p, done }) },
      });
      for (const m of multiples) {
        const already = flags[m] === false;
        flags[m] = false;
        crossings += 1;
        steps.push({
          chapter: 'run',
          short: `Cross ${m}`,
          title: `Cross out ${m}`,
          body: `Line 12 sets \`multiple = ${m}\`, the next multiple of ${p}. Line 13 sets \`is_prime[${m}] = False\`${already ? `. It was already \`False\`, because a smaller prime reached it first` : ''}.`,
          code: { view: 'final', lines: [12, 13] },
          values: { 12: `multiple = ${m}`, 13: `is_prime[${m}] = False` },
          metrics: metrics(),
          changes: [`is_prime[${m}] = False`],
          scene: { entities: scene({ n, flags, p, multiple: m, active: 'multiple', done }) },
        });
      }
      done.push(p);
    }

    p += 1;
    steps.push({
      chapter: 'run',
      short: `p = ${p}`,
      title: `Move on: p = ${p}`,
      body: `Line 14: \`p += 1\`, so \`p = ${p}\`.${p * p > n ? ` Next, line 9 will ask \`${p * p} <= ${n}\`.` : ''}`,
      code: { view: 'final', lines: [14] },
      values: { 14: `p = ${p}` },
      metrics: metrics(),
      changes: [`p = ${p}`],
      scene: { entities: scene({ n, flags, p, done }) },
    });
    if (p * p > n) {
      steps.push({
        chapter: 'run',
        short: 'p * p > n',
        title: `${p * p} > ${n}: the loop stops`,
        body: `Line 9: \`${p * p} <= ${n}\` is false. Any composite up to ${n} has a factor of at most √${n}, so all of them are crossed out already. What is left must be prime.`,
        code: { view: 'final', lines: [9] },
        values: { 9: `${p * p} <= ${n} → False` },
        metrics: metrics(),
        scene: { entities: scene({ n, flags, p, done }) },
      });
    }
  }

  const primes = flags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return the ${primes.length} primes up to ${n}`,
    body: `Line 16 collects every index whose flag is still \`True\`: **${primes.join(', ')}**.`,
    code: { view: 'final', lines: [16] },
    values: { 16: `[${list(primes, 5)}]` },
    metrics: metrics(`${primes.length} primes`),
    scene: { entities: scene({ n, flags, final: true, note: `primes up to ${n}:\n${primes.join(', ')}`, noteTone: 'found' }) },
  });
  return steps;
}

const N = 16;
const RUN = traceSieve(N);
const byShort = (short: string): number => RUN.findIndex((s) => s.short === short);
/** Scene of the run step with this rail label, so build steps show the moment they describe. */
const at = (short: string): Step['scene'] => RUN[byShort(short)]?.scene ?? { entities: [] };
/** The same scene plus a callout below the rows. */
const withNote = (base: Step['scene'], text: string, tone: Tone = 'note'): Step['scene'] => ({
  entities: [...base.entities.filter((e) => e.id !== 'note'), note('note', 0, 2 * ROW_Y, text, { tone })],
});
const startMetrics = { crossings: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const PLAIN = allTrue(N);
/** Flags after the whole sieve of 16. */
const SIEVED = PLAIN.map((_, i) => i >= 2 && ![4, 6, 8, 9, 10, 12, 14, 15, 16].includes(i));

export default defineWalkthrough({
  id: 'learn/math-number-theory/sieve-of-eratosthenes',
  title: 'Sieve of Eratosthenes, crossing out composites in bulk',
  summary: 'From the idea to the code: list every prime up to n by crossing out the multiples of each prime.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def sieve_of_eratosthenes(n: int) -> list[int]:
    if n < 2:
        return []

    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False

    p = 2
    while p * p <= n:
        if is_prime[p]:
            # multiples below p * p were crossed out by smaller primes
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1

    return [i for i, prime in enumerate(is_prime) if prime]`,
  },
  snapshots: {
    brute: `def sieve_of_eratosthenes(n: int) -> list[int]:
    primes = []
    for x in range(2, n + 1):
        if all(x % d != 0 for d in range(2, int(x ** 0.5) + 1)):
            primes.append(x)
    return primes`,
  },
  metrics: [
    { key: 'crossings', label: 'Crossed out' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'being processed' },
    { tone: 'done', label: 'prime, multiples done' },
    { tone: 'muted', label: 'False (not prime)' },
    { tone: 'found', label: 'the primes' },
  ],
  goals: [
    { text: 'See why testing each number is slow', step: 2 },
    { text: 'Understand why p can stop at √n', step: 4 },
    { text: 'Build the sieve line by line', step: 5 },
    { text: 'Follow every flag and crossing', step: 11 },
    { text: 'Know why crossing out starts at p × p', step: 35 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'List every prime up to 16',
      body: 'A prime is a number above 1 whose only divisors are 1 and itself. Which of 0 to 16 are prime?\n\nLine 1 takes `n` and returns the list of primes up to `n`. In the picture each cell shows its number; we will turn cells grey as we rule them out.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, flags: PLAIN, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Test each',
      title: 'The obvious way: test every number on its own',
      body: 'Lines 3–5 divide each `x` by every `d` up to `√x`. One number costs up to `√x` divisions, so all of them cost about `n√n`.\n\nBut this throws away what we learn: once we know 2 is prime, we know 4, 6, 8 … are not, without testing any of them.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 4, 5] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, flags: PLAIN, bare: true, note: 'x = 13 → 13 % 2, 13 % 3 (√13 ≈ 3.6)\nevery x repeats work: O(n√n)', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Cross out',
      title: 'Keep a prime, cross out all its multiples at once',
      body: 'Take 2: it stays, and 4, 6, 8, 10, 12, 14, 16 are crossed out in one sweep. The next number still standing, 3, must be prime (nothing smaller divides it), so cross out its multiples too.\n\nEach pass removes composites in bulk, and what is never crossed out is prime.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          n: N,
          flags: PLAIN.map((_, i) => !(i >= 4 && i % 2 === 0)),
          bare: true,
          done: [2],
          note: 'prime 2 stays; 4, 6, 8 … are out\nnext survivor: 3 → prime',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Stop at √n',
      title: 'Why we only need primes up to √n',
      body: 'A composite `x ≤ n` is `a × b` with `a ≤ b`, so `a × a ≤ x ≤ n`, which means `a ≤ √n`. Its smaller factor, or a prime inside it, is at most `√n`.\n\nSo after crossing out the multiples of every prime up to √n, no composite is left. For n = 16, √n = 4: only 2 and 3 are needed.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({ n: N, flags: SIEVED, bare: true, final: true, note: 'x = a × b, a ≤ b  →  a ≤ √x ≤ √n\nn = 16: only the primes 2 and 3 matter' }),
      },
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 2–3: below 2 there are no primes',
      body: 'The smallest prime is 2, so for `n < 2` we return an empty list straight away. This also keeps lines 5–6 safe: they need indexes 0 and 1 to exist.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['if n < 2: return []'],
      scene: { entities: scene({ n: N, flags: PLAIN, bare: true }) },
    },
    {
      chapter: 'build',
      short: 'Flags',
      title: 'Lines 5–6: one flag per number, 0 and 1 are out',
      body: '`is_prime[i]` says whether `i` could still be prime. Everything starts `True`, then 0 and 1 are set to `False` by hand because they are not prime.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['is_prime = [True] * (n + 1)', 'is_prime[0] = is_prime[1] = False'],
      scene: at('Flags'),
    },
    {
      chapter: 'build',
      short: 'Candidates',
      title: 'Lines 8–9: try p = 2, 3, 4 … while p × p ≤ n',
      body: '`p` is the candidate we examine. The loop condition `p * p <= n` is the √n rule from the idea: once `p * p` passes `n`, every composite is already crossed out.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['p = 2', 'while p * p <= n'],
      scene: at('p = 2'),
    },
    {
      chapter: 'build',
      short: 'Prime p?',
      title: 'Lines 10–12: if p is prime, cross out its multiples',
      body: 'Line 10 only acts on a flag still `True`. Line 12 walks the multiples of `p` starting at `p * p`: the smaller ones, `2p`, `3p` … `(p − 1)p`, each have a smaller prime factor and were crossed out in earlier passes.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12], lines: [10, 12] },
      metrics: startMetrics,
      changes: ['if is_prime[p]', 'for multiple in range(p * p, n + 1, p)'],
      scene: withNote(at('Multiples of 3'), '3 × 2 = 6 is already out (by 2)\nthe first new multiple is 3 × 3 = 9'),
    },
    {
      chapter: 'build',
      short: 'Cross out',
      title: 'Lines 13–14: cross out, then try the next p',
      body: 'Line 13 flips the flag of each multiple to `False`. After the `for` loop, line 14 moves `p` up by one and line 9 checks `p * p <= n` again.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14], lines: [13, 14] },
      metrics: { ...startMetrics, crossings: 1 },
      changes: ['is_prime[multiple] = False', 'p += 1'],
      scene: at('Cross 4'),
    },
    {
      chapter: 'build',
      short: 'Collect',
      title: 'Line 16: collect the indexes still True',
      body: 'Whatever was never crossed out is prime. `enumerate` pairs each index `i` with its flag, and the comprehension keeps the indexes whose flag is `True`.\n\nThat is the whole function. Now let’s run it.',
      code: { view: 'final', lines: [16] },
      metrics: FINAL_METRICS,
      changes: ['return [i for i, prime in enumerate(is_prime) if prime]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'About n / p crossings per prime: O(n log log n)',
      body: 'A prime `p` crosses out about `n / p` cells, so the total is `n × (1/2 + 1/3 + 1/5 + …)`. That sum of prime reciprocals grows like `log log n`, which is tiny: **`O(n log log n)` time**, close to linear, with `O(n)` space for the flags.\n\nSwitch to **🧪 Try your own** to sieve any n up to 29.',
      code: { view: 'final', lines: [9, 12, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, flags: SIEVED, final: true, note: 'n × (1/2 + 1/3 + 1/5 + 1/7 + …)\nthe sum grows like log log n\n→ O(n log log n)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Start at p²',
      title: 'Why line 12 starts at p × p, not 2 × p',
      body: 'Take `p = 3`. The multiple 6 = 3 × 2 is already crossed out by 2, and in general `p × k` with `k < p` has the prime factors of `k`, all smaller than `p`, so an earlier pass got it.\n\nThe first multiple nobody crossed out yet is `p × p`. That is the key decision: start there, and the pass never repeats work an earlier prime already did.',
      code: { view: 'final', lines: [11, 12] },
      values: { 11: '3 × 2 = 6: out by 2', 12: 'range(9, 17, 3) → 9, 12, 15' },
      metrics: FINAL_METRICS,
      scene: withNote(at('Multiples of 3'), '3 × 2 = 6 is already out (by 2)\nthe first new multiple is 3 × 3 = 9', 'found'),
    },
  ],
  trace: {
    title: 'Run the sieve on your own n',
    inputs: [{ name: 'n', label: `n (0 to ${MAX_N})`, kind: 'number', default: '16' }],
    presets: [
      { label: 'n < 2', values: { n: '1' } },
      { label: 'n = 2', values: { n: '2' } },
      { label: 'n is prime', values: { n: '13' } },
      { label: 'Perfect square', values: { n: '25' } },
      { label: 'Biggest', values: { n: String(MAX_N) } },
    ],
    run: (values) => {
      const n = values['n'];
      if (typeof n !== 'number') throw new Error('Enter a single whole number.');
      if (n < 0 || n > MAX_N) throw new Error(`Use a whole number from 0 to ${MAX_N} so the grid fits on the stage.`);
      return traceSieve(n);
    },
  },
});
