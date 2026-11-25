import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const PATTERN_Y = 130;
const NOTE_Y = 250;
const BASE = 10;
const MOD = 13;

interface RollState {
  readonly text: readonly number[];
  readonly pattern: readonly number[];
  /** Start of the window (or the last digit read, while the first hashes are built). */
  readonly i?: number;
  /** Window width: `m`, or the digits read so far while building the first hashes. */
  readonly width?: number;
  readonly win?: number;
  readonly pat?: number;
  readonly high?: number;
  /** Window starts already confirmed as matches. */
  readonly matched?: readonly number[];
  readonly bandTone?: Tone;
  readonly winTone?: Tone;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
}

const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
/** Python's `%`: never negative for a positive modulus. */
const pmod = (a: number, m: number): number => ((a % m) + m) % m;
const powmod = (b: number, e: number, m: number): number => {
  let r = 1 % m;
  for (let k = 0; k < e; k += 1) r = (r * b) % m;
  return r;
};

/** Scene: the text with its window, the pattern, and the hashes. */
function scene(s: RollState): Entity[] {
  const tones: Record<number, Tone> = {};
  for (const start of s.matched ?? []) for (let k = 0; k < s.pattern.length; k += 1) tones[start + k] = 'found';
  const entities: Entity[] = [arr('text', 0, 0, s.text, { label: 'text', tones, codeVar: 'text' })];
  if (s.i !== undefined && s.width !== undefined) {
    const from = s.width === s.pattern.length ? s.i : 0;
    const to = s.width === s.pattern.length ? s.i + s.width - 1 : s.i;
    entities.push(range('win', 'text', from, to, s.bandTone ?? 'compare'));
    entities.push(ptr('i', 'text', s.i, 'i', { side: 'top', tone: 'active', codeVar: 'i' }));
  }
  entities.push(arr('pattern', 0, PATTERN_Y, s.pattern, { label: 'pattern', codeVar: 'pattern', tones: s.winTone ? Object.fromEntries(s.pattern.map((_, k) => [k, s.winTone as Tone])) : {} }));
  if (!s.bare) {
    const rows: VarRow[] = [
      { name: 'i', value: dash(s.i), tone: mute(s.i) },
      { name: 'win_hash', value: dash(s.win), tone: s.winTone ?? mute(s.win) },
      { name: 'pat_hash', value: dash(s.pat), tone: mute(s.pat) },
      { name: 'high_pow', value: dash(s.high), tone: mute(s.high) },
    ];
    entities.push(vars('vals', tableBesideArray(s.text.length, 4), 0, rows, { label: 'variables', width: 180 }));
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Rabin-Karp on digit lists, one step per decision (chapter "run", final code). */
function traceRoll(text: readonly number[], pattern: readonly number[]): Step[] {
  const steps: Step[] = [];
  const n = text.length;
  const m = pattern.length;
  let windows = 0;
  let verifies = 0;
  const matches: number[] = [];
  const metrics = (result: string = '—'): Record<string, string | number> => ({ windows, verifies, result });
  const push = (s: Omit<Step, 'chapter' | 'code' | 'metrics' | 'scene'> & { lines: number[]; entities: Entity[]; result?: string }): void => {
    const { lines, entities, result, ...rest } = s;
    steps.push({ ...rest, chapter: 'run', code: { view: 'final', lines }, metrics: metrics(result), scene: { entities } });
  };
  const bad = m === 0 || m > n;
  push({
    short: 'Sizes',
    title: `n = ${n}, m = ${m}: is a match possible?`,
    body: `Line 2 measures both lists: \`n = ${n}\`, \`m = ${m}\`. Line 3 stops early if the pattern is empty or longer than the text: ${bad ? 'it is longer, so no window fits' : 'neither, so we go on'}.`,
    lines: [2, 3],
    values: { 2: `n = ${n}, m = ${m}`, 3: `${m} == 0 or ${m} > ${n} → ${bad ? 'True' : 'False'}` },
    entities: scene({ text, pattern }),
  });
  if (bad) {
    push({
      short: 'Return []',
      title: 'The pattern cannot fit: return []',
      body: 'Line 4 returns an empty list, because a window of `m` digits does not fit inside `n` digits.',
      lines: [4],
      values: { 4: 'return []' },
      result: '[]',
      entities: scene({ text, pattern, note: 'pattern longer than text\nno window to compare', noteTone: 'miss' }),
    });
    return steps;
  }
  push({
    short: 'base, mod',
    title: `base = ${BASE}, mod = ${MOD}`,
    body: `Line 5 picks the number system (\`base = ${BASE}\`, like decimal digits) and a modulus (\`mod = ${MOD}\`) that keeps every hash below ${MOD}. Real code uses a huge prime for \`mod\`; a small one makes collisions easy to see.`,
    lines: [5],
    values: { 5: `base = ${BASE}, mod = ${MOD}` },
    entities: scene({ text, pattern }),
  });
  const high = powmod(BASE, m - 1, MOD);
  push({
    short: 'high_pow',
    title: `high_pow = ${BASE}^${m - 1} % ${MOD} = ${high}`,
    body: `Line 6: the leading digit of an \`m\`-digit window is worth \`base^(m−1)\` = ${BASE ** (m - 1)}. Reduced \`% ${MOD}\` that is **${high}**, the weight we will subtract when the leading digit leaves.`,
    lines: [6],
    values: { 6: `pow(${BASE}, ${m - 1}, ${MOD}) = ${high}` },
    entities: scene({ text, pattern, high }),
  });
  push({
    short: 'Zero hashes',
    title: 'Both hashes start at 0',
    body: 'Line 7 clears `pat_hash` and `win_hash`. The loop on line 8 will read the first `m` digits into both.',
    lines: [7],
    values: { 7: 'pat_hash = win_hash = 0' },
    entities: scene({ text, pattern, high, pat: 0, win: 0 }),
  });
  let pat = 0;
  let win = 0;
  for (let i = 0; i < m; i += 1) {
    const rp = pat * BASE + (pattern[i] ?? 0);
    const rw = win * BASE + (text[i] ?? 0);
    pat = rp % MOD;
    win = rw % MOD;
    push({
      short: `read ${i}`,
      title: `Read digit ${i}: pat_hash ${pat}, win_hash ${win}`,
      body: `Line 8: \`i = ${i}\`. Line 9 shifts \`pat_hash\` left and adds \`pattern[${i}] = ${pattern[i]}\`: \`${rp} % ${MOD} = ${pat}\`. Line 10 does the same for the text: \`${rw} % ${MOD} = ${win}\`.`,
      lines: [8, 9, 10],
      values: { 8: `i = ${i}`, 9: `pat_hash = (${rp - (pattern[i] ?? 0)}+${pattern[i]}) % ${MOD} = ${pat}`, 10: `win_hash = (${rw - (text[i] ?? 0)}+${text[i]}) % ${MOD} = ${win}` },
      entities: scene({ text, pattern, i, width: i + 1, high, pat, win }),
    });
  }
  for (let i = 0; i <= n - m; i += 1) {
    windows += 1;
    const same = win === pat;
    const base = { text, pattern, i, width: m, high, pat, win, matched: [...matches] };
    push({
      short: `window ${i}`,
      title: same ? `Window ${i}: hashes are equal (${win})` : `Window ${i}: ${win} != ${pat}, skip it`,
      body: same
        ? `Line 13: \`i = ${i}\`, the window is \`${text.slice(i, i + m).join('')}\`. Line 14: \`win_hash == pat_hash\` is true, but equal hashes only mean **maybe**, so the digits must be compared.`
        : `Line 13: \`i = ${i}\`, the window is \`${text.slice(i, i + m).join('')}\`. Line 14: \`${win} == ${pat}\` is false, so these digits cannot be the pattern. No digit comparison is needed.`,
      lines: [13, 14],
      values: { 13: `i = ${i}`, 14: `${win} == ${pat} → ${same ? 'True' : 'False'}` },
      entities: scene({ ...base, winTone: same ? 'compare' : 'miss', bandTone: same ? 'compare' : 'muted' }),
    });
    if (same) {
      verifies += 1;
      const real = text.slice(i, i + m).every((d, k) => d === pattern[k]);
      push({
        short: real ? 'Verify: yes' : 'Verify: no',
        title: real ? `Digits ${text.slice(i, i + m).join('')} == ${pattern.join('')}: a real match` : `Digits ${text.slice(i, i + m).join('')} != ${pattern.join('')}: a collision`,
        body: real
          ? 'Line 14 compares the digits themselves, `text[i : i + m] == pattern`, and every digit agrees.'
          : 'Line 14 compares the digits themselves and they differ. Two different windows had the same hash: a **hash collision**. The check just saved us from a wrong answer.',
        lines: [14],
        values: { 14: `${text.slice(i, i + m).join('')} == ${pattern.join('')} → ${real ? 'True' : 'False'}` },
        entities: scene({ ...base, winTone: real ? 'found' : 'miss', bandTone: real ? 'found' : 'miss' }),
      });
      if (real) {
        matches.push(i);
        push({
          short: 'Match',
          title: `Match at index ${i}`,
          body: `Line 15 records the start of the window: \`matches = [${matches.join(', ')}]\`.`,
          lines: [15],
          values: { 15: `matches = [${matches.join(', ')}]` },
          changes: [`matches = [${matches.join(', ')}]`],
          entities: scene({ ...base, matched: [...matches], winTone: 'found', bandTone: 'found' }),
        });
      }
    }
    if (i + m < n) {
      const out = text[i] ?? 0;
      const inn = text[i + m] ?? 0;
      const before = win;
      const raw = (before - out * high) * BASE + inn;
      win = pmod(raw, MOD);
      push({
        short: 'Slide',
        title: `Slide right: win_hash becomes ${win}`,
        body: `Line 16: the window can still move. Line 17 drops the leading digit ${out} and brings in ${inn}: \`((${before} − ${out} × ${high}) × ${BASE} + ${inn}) % ${MOD}\` = \`${raw} % ${MOD}\` = **${win}**.`,
        lines: [16, 17],
        values: { 17: `win_hash = ((${before} - ${out}*${high}) * ${BASE} + ${inn}) % ${MOD} = ${win}` },
        changes: [`win_hash = ${win}`],
        entities: scene({ text, pattern, i, width: m, high, pat, win, matched: [...matches], bandTone: 'compare' }),
      });
    }
  }
  push({
    short: 'Return',
    title: `Return matches = [${matches.join(', ')}]`,
    body: `The loop ended after ${windows} windows and ${verifies} digit comparison${verifies === 1 ? '' : 's'}. Line 18 returns **[${matches.join(', ')}]**.`,
    lines: [18],
    values: { 18: `return [${matches.join(', ')}]` },
    result: `[${matches.join(', ')}]`,
    changes: [`return [${matches.join(', ')}]`],
    entities: scene({ text, pattern, matched: [...matches], high, pat, win }),
  });
  return steps;
}

const TEXT = [3, 1, 4, 1, 5, 9, 2, 6, 5] as const;
const PATTERN = [1, 5, 9] as const;
const RUN = traceRoll(TEXT, PATTERN);
const START = { windows: 0, verifies: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? START;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BUILD_END = 1 + 3 + 7;

export default defineWalkthrough({
  id: 'learn/hashing/rolling-hash',
  title: 'Rolling Hash, slide a fingerprint along the text',
  summary: 'From the problem to the idea to the code: give every window of the text a small number, update it in one step as the window slides, and compare digits only when the numbers match.',
  minutes: 12,
  code: {
    lang: 'python',
    source: `def rabin_karp(text: list[int], pattern: list[int]) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    base, mod = 10, 13
    high_pow = pow(base, m - 1, mod)
    pat_hash = win_hash = 0
    for i in range(m):
        pat_hash = (pat_hash * base + pattern[i]) % mod
        win_hash = (win_hash * base + text[i]) % mod

    matches: list[int] = []
    for i in range(n - m + 1):
        if win_hash == pat_hash and text[i : i + m] == pattern:
            matches.append(i)  # Verify digits to guard against hash collisions
        if i + m < n:
            win_hash = ((win_hash - text[i] * high_pow) * base + text[i + m]) % mod
    return matches`,
  },
  snapshots: {
    naive: `def search(text: list[int], pattern: list[int]) -> list[int]:
    m = len(pattern)
    return [i for i in range(len(text) - m + 1)
            if text[i : i + m] == pattern]  # m digits per window`,
  },
  metrics: [
    { key: 'windows', label: 'Windows' },
    { key: 'verifies', label: 'Digit checks' },
    { key: 'result', label: 'Matches' },
  ],
  legend: [
    { tone: 'active', label: 'window start `i`' },
    { tone: 'compare', label: 'window / hashes equal' },
    { tone: 'miss', label: 'hash differs / collision' },
    { tone: 'found', label: 'real match' },
    { tone: 'muted', label: 'skipped window' },
  ],
  goals: [
    { text: 'See why comparing every window is slow', step: 2 },
    { text: 'Turn a window into one small number', step: 3 },
    { text: 'Slide the number in one step', step: 4 },
    { text: 'Follow every window, collision and match', step: BUILD_END + 1 },
    { text: 'Know why equal hashes are still verified', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find a pattern inside a text',
      body: 'Given `text = 3 1 4 1 5 9 2 6 5` and `pattern = 1 5 9`, return **every index** where the pattern starts. The text may be very long, so the search should not re-read each window.\n\nHere the answer is `[3]`.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ text: TEXT, pattern: PATTERN, bare: true, note: 'return the start index of every match' }) },
    },
    {
      chapter: 'idea',
      short: 'Compare all',
      title: 'The obvious way: compare every window digit by digit',
      body: 'Slide a window of `m` digits across the text and compare it with the pattern each time (lines 3–4).\n\nThat is `m` comparisons for each of about `n` windows: **`O(n · m)`**.',
      code: { view: 'snapshot', id: 'naive', lines: [3, 4] },
      metrics: START,
      scene: { entities: scene({ text: TEXT, pattern: PATTERN, i: 0, width: 3, bare: true, note: '7 windows × 3 digits each\nn windows × m digits = O(n · m)', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Fingerprint',
      title: 'Give each window one small number',
      body: 'Read the digits as a number and keep it small with `% mod`: window `1 5 9` is `159`, and `159 % 13 = 3`. Comparing two small numbers is **one step**, however long the pattern is.\n\nBuild it digit by digit: `hash = (hash × 10 + digit) % mod`.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ text: TEXT, pattern: PATTERN, i: 5, width: 3, bare: true, pat: undefined, note: '1 5 9 → 159 → 159 % 13 = 3\nsame digits give the same number', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'Slide',
      title: 'Update the number in one step',
      body: 'Moving from `314` to `141` does not need a re-read. Drop the `3` (`314 − 3 × 100 = 14`), shift left (`14 × 10 = 140`), and add the new digit (`141`).\n\nThe same works modulo 13, and `100 % 13 = 9` is the `high_pow` we keep. If the hashes match, **verify the digits**: two different windows can share a number.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ text: TEXT, pattern: PATTERN, i: 1, width: 3, bare: true, note: '314 → drop 3 → 14 → × 10 → 140\n→ add 1 → 141   (all % 13)', noteTone: 'note' }) },
    },
    {
      chapter: 'build',
      short: 'Sizes',
      title: 'Lines 1–4: sizes and the easy exit',
      body: 'Line 2 reads the lengths. Line 3 returns early when no window of `m` digits can fit.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3] },
      metrics: START,
      changes: ['n, m = len(text), len(pattern)', 'if m == 0 or m > n: return []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Constants',
      title: 'Lines 5–7: base, mod and the leading weight',
      body: '`base` and `mod` are the number system and the limit. `high_pow` is `base^(m−1) % mod`: the weight of the digit that leaves the window. Line 7 clears the two hashes.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: START,
      changes: ['base, mod = 10, 13', 'high_pow = pow(base, m - 1, mod)', 'pat_hash = win_hash = 0'],
      scene: at(find('high_pow')),
    },
    {
      chapter: 'build',
      short: 'First hashes',
      title: 'Lines 8–10: hash the pattern and the first window',
      body: 'One loop reads `m` digits into both hashes with the digit-by-digit formula from the idea, so they are directly comparable.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lines: [9, 10] },
      metrics: START,
      changes: ['pat_hash = (pat_hash * base + pattern[i]) % mod', 'win_hash = (win_hash * base + text[i]) % mod'],
      scene: at(find('read 2')),
    },
    {
      chapter: 'build',
      short: 'Windows',
      title: 'Lines 12–13: visit every window',
      body: '`matches` collects the answers. Line 13 loops over the `n − m + 1` places where a window fits.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13], lines: [13] },
      metrics: START,
      changes: ['matches = []', 'for i in range(n - m + 1)'],
      scene: at(find('window 0')),
    },
    {
      chapter: 'build',
      short: 'Verify',
      title: 'Lines 14–15: equal hashes, then check the digits',
      body: 'A different hash proves the window is **not** the pattern, so we skip it. An equal hash only means maybe, so `and text[i : i + m] == pattern` compares the real digits (the comment on line 15 says why).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15], lines: [14, 15] },
      metrics: START,
      changes: ['if win_hash == pat_hash and text[i : i + m] == pattern', 'matches.append(i)'],
      scene: at(find('Verify: no')),
    },
    {
      chapter: 'build',
      short: 'Roll',
      title: 'Lines 16–17: slide with one update',
      body: 'Unless this was the last window, line 17 removes `text[i] × high_pow`, shifts by `base`, and adds `text[i + m]`: the slide from the idea.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17], lines: [16, 17] },
      metrics: START,
      changes: ['if i + m < n', 'win_hash = ((win_hash - text[i] * high_pow) * base + text[i + m]) % mod'],
      scene: at(find('Slide')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 18: the matches',
      body: 'When every window was visited, line 18 returns the start indexes we collected.\n\nThat is the whole function. Now let’s run it.',
      code: { view: 'final', lines: [18] },
      metrics: START,
      changes: ['return matches'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One update per window',
      body: 'Hashing the first window costs `O(m)`, then every slide is a constant number of operations: **`O(n + m)`** on average, with `O(1)` extra space. If many windows collide, each needs a digit check, so the worst case is **`O(n · m)`**.\n\nSwitch to **🧪 Try your own** to search other digits.',
      code: { view: 'final', lines: [13, 14, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ text: TEXT, pattern: PATTERN, matched: [3], high: 9, pat: 3, win: 5, note: 'average  O(n + m)\nworst    O(n · m)  many collisions\nspace    O(1)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Verify why',
      title: 'Why line 14 still compares the digits',
      body: 'Window `926` has the same hash as `159` (both `% 13` give 3), yet it is not the pattern. A hash squeezes many windows into few numbers, so equal hashes can **collide**.\n\nThat is the key decision: the hash only rules windows **out** quickly; the digit comparison decides the match, so the answer is always correct.',
      code: { view: 'final', lines: [14, 15] },
      values: { 14: '926 % 13 = 3, but 9 2 6 != 1 5 9' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ text: TEXT, pattern: PATTERN, i: 5, width: 3, matched: [3], pat: 3, win: 3, high: 9, bandTone: 'miss', winTone: 'miss', note: '159 → 3 and 926 → 3\nsame hash, different digits', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Search your own digits with a rolling hash',
    inputs: [
      { name: 'text', label: 'Text digits (0–9, up to 10)', kind: 'numbers', default: '3, 1, 4, 1, 5, 9, 2, 6, 5' },
      { name: 'pattern', label: 'Pattern digits (0–9)', kind: 'numbers', default: '1, 5, 9' },
    ],
    presets: [
      { label: 'Lesson example', values: { text: '3, 1, 4, 1, 5, 9, 2, 6, 5', pattern: '1, 5, 9' } },
      { label: 'No match', values: { text: '1, 2, 3, 4', pattern: '9, 9' } },
      { label: 'Overlapping', values: { text: '1, 1, 1, 1', pattern: '1, 1' } },
      { label: 'Pattern too long', values: { text: '1, 2', pattern: '1, 2, 3' } },
      { label: 'One digit', values: { text: '5, 3, 5', pattern: '5' } },
    ],
    maxItems: 10,
    run: (values) => {
      const text = values['text'];
      const pattern = values['pattern'];
      if (!Array.isArray(text) || !Array.isArray(pattern) || text.length === 0 || pattern.length === 0) throw new Error('Enter the text digits and the pattern digits.');
      if ([...text, ...pattern].some((d) => d < 0 || d > 9)) throw new Error('Use single digits from 0 to 9.');
      return traceRoll(text, pattern);
    },
  },
});
