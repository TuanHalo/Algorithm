import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const PATTERN_Y = 130;
const NOTE_Y = 260;
const BASE = 10;
const MOD = 101;

/** Letters travel as numbers so the trace can take them: 1 = a, 2 = b, …, 26 = z. */
const letter = (code: number): string => String.fromCharCode(96 + code);
const word = (codes: readonly number[]): string => `"${codes.map(letter).join('')}"`;
/** Python's `%`: never negative. */
const md = (x: number): number => ((x % MOD) + MOD) % MOD;

type Verdict = 'differ' | 'equal' | 'same' | 'collision';

interface RkState {
  readonly text: readonly number[];
  readonly pattern: readonly number[];
  /** First index of the window in `text`. */
  readonly win?: number;
  /** Window length so far (shorter than the pattern while the first hashes are built). */
  readonly winLen?: number;
  /** Letter leaving the window on the left / entering on the right. */
  readonly out?: number;
  readonly inn?: number;
  /** Outcome of the hash check or the verification for the current window. */
  readonly verdict?: Verdict;
  readonly pHash?: number;
  readonly wHash?: number;
  readonly high?: number;
  readonly matches?: readonly number[];
  readonly showVars?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: text on top with the window band, pattern below it, variables on the right. */
function scene(s: RkState): Entity[] {
  const n = s.text.length;
  const m = s.pattern.length;
  const entities: Entity[] = [];
  const textTones: Record<number, Tone> = {};
  for (const start of s.matches ?? []) for (let k = start; k < start + m; k += 1) textTones[k] = 'found';
  if (s.out !== undefined && s.win !== undefined) textTones[s.win - 1] = 'muted';
  if (s.inn !== undefined && s.win !== undefined) textTones[s.win + m - 1] = 'active';
  entities.push(arr('text', 0, 0, s.text.map(letter), { label: 'text', tones: textTones, codeVar: 'text' }));

  const patTones: Record<number, Tone> = {};
  if (s.verdict === 'same') for (let k = 0; k < m; k += 1) patTones[k] = 'found';
  if (s.verdict === 'collision') for (let k = 0; k < m; k += 1) patTones[k] = 'miss';
  if (s.winLen !== undefined && s.winLen < m) for (let k = 0; k < s.winLen; k += 1) patTones[k] = 'done';
  entities.push(arr('pattern', 0, PATTERN_Y, s.pattern.map(letter), { label: 'pattern', tones: patTones, codeVar: 'pattern' }));

  if (s.win !== undefined) {
    const len = s.winLen ?? m;
    const tone: Tone = s.verdict === 'same' ? 'found' : s.verdict === 'collision' ? 'miss' : 'compare';
    entities.push(range('window', 'text', s.win, s.win + len - 1, tone));
    entities.push(ptr('i', 'text', s.win, 'i', { side: 'top', tone: 'compare', codeVar: 'i' }));
    const hashes = s.pHash !== undefined && s.wHash !== undefined && s.verdict !== undefined;
    if (hashes) {
      const from = { entity: 'text', index: s.win, side: 'bottom' as const };
      const to = { entity: 'pattern', index: 0, side: 'top' as const };
      if (s.verdict === 'differ') entities.push(link('look', from, to, { label: `${s.wHash} ≠ ${s.pHash}`, tone: 'miss', dashed: true }));
      else if (s.verdict === 'equal') entities.push(link('look', from, to, { label: `${s.wHash} = ${s.pHash}`, tone: 'compare' }));
      else if (s.verdict === 'same') entities.push(link('look', from, to, { label: 'same letters', tone: 'found', flow: true }));
      else entities.push(link('look', from, to, { label: 'different letters', tone: 'miss', dashed: true }));
    }
  }
  if (s.showVars) {
    const dash = (v: number | undefined): number | string => v ?? '—';
    const tone = (v: unknown): Tone => (v === undefined ? 'muted' : 'default');
    entities.push(
      vars(
        'vals',
        tableBesideArray(n, 5),
        0,
        [
          { name: 'i', value: dash(s.win), tone: tone(s.win) },
          { name: 'high', value: dash(s.high), tone: tone(s.high) },
          { name: 'pattern_hash', value: dash(s.pHash), tone: tone(s.pHash) },
          { name: 'window_hash', value: dash(s.wHash), tone: tone(s.wHash) },
          { name: 'matches', value: s.matches ? `[${s.matches.join(', ')}]` : '—', tone: tone(s.matches) },
        ],
        { label: 'variables', width: 230 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs rabin_karp on any letters and records one step per decision (chapter "run", final code). */
function traceRabinKarp(text: readonly number[], pattern: readonly number[]): Step[] {
  const n = text.length;
  const m = pattern.length;
  const steps: Step[] = [];
  let windows = 0;
  let verifies = 0;
  const found: number[] = [];
  const metrics = (result: string = '—'): Record<string, string | number> => ({ windows, verifies, result });
  const base = { text, pattern };

  if (n < m) {
    steps.push({
      chapter: 'run',
      short: 'Too short',
      title: `${word(pattern)} is longer than ${word(text)}`,
      body: `Line 2: \`n = ${n}\`, \`m = ${m}\`. Line 3: \`n < m\` is true, so no window of ${m} letters fits. Line 4 returns an empty list.`,
      code: { view: 'final', lines: [2, 3, 4] },
      values: { 2: `n = ${n}, m = ${m}`, 3: `${n} < ${m} → True`, 4: 'return []' },
      metrics: metrics('[]'),
      scene: { entities: scene({ ...base, note: 'the pattern cannot fit\nreturn []', noteTone: 'miss' }) },
    });
    return steps;
  }

  steps.push({
    chapter: 'run',
    short: 'Sizes',
    title: `n = ${n} letters of text, m = ${m} of pattern`,
    body: `Line 2 measures both. Line 3: the pattern isn’t empty and fits in the text, so the guard on lines 3–4 doesn’t return.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `n = ${n}, m = ${m}`, 3: 'm == 0 or n < m → False' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, showVars: true }) },
  });
  steps.push({
    chapter: 'run',
    short: 'base, mod',
    title: `Hashes use base ${BASE} and modulus ${MOD}`,
    body: `Line 6: every letter is a digit in base ${BASE} (\`a = 1 … z = 26\`), and every hash is kept below \`mod = ${MOD}\`. They are tiny on purpose, so you can follow the numbers.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `base = ${BASE}, mod = ${MOD}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, showVars: true }) },
  });
  const high = md(BASE ** (m - 1));
  steps.push({
    chapter: 'run',
    short: 'high',
    title: `high = ${BASE}^${m - 1} mod ${MOD} = ${high}`,
    body: `Line 7: in a window of ${m} letters, the first letter is multiplied by \`base^${m - 1}\`. That weight is \`high\`, and it is exactly what the roll will subtract.`,
    code: { view: 'final', lines: [7] },
    values: { 7: `high = pow(${BASE}, ${m - 1}, ${MOD}) = ${high}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, showVars: true, high, note: `${m === 1 ? 'one letter: weight 1' : `first letter of a window of ${m}\nweighs base^${m - 1} = ${BASE ** (m - 1)}, mod ${MOD} → ${high}`}` }) },
  });

  let pHash = 0;
  let wHash = 0;
  for (let k = 0; k < m; k += 1) {
    const p = pattern[k] ?? 0;
    const t = text[k] ?? 0;
    const pNew = md(pHash * BASE + p);
    const wNew = md(wHash * BASE + t);
    steps.push({
      chapter: 'run',
      short: `Hash ${k + 1}/${m}`,
      title: `Fold in letter ${k + 1}: pattern ${pNew}, window ${wNew}`,
      body: `Line 11: \`i = ${k}\`. Line 12 shifts \`pattern_hash\` one digit left and adds \`${letter(p)} = ${p}\`: \`(${pHash}·${BASE} + ${p}) % ${MOD} = ${pNew}\`. Line 13 does the same for the first window with \`${letter(t)} = ${t}\`: \`(${wHash}·${BASE} + ${t}) % ${MOD} = ${wNew}\`.`,
      code: { view: 'final', lines: [11, 12, 13] },
      values: { 11: `i = ${k}`, 12: `pattern_hash = (${pHash}·${BASE} + ${p}) % ${MOD} = ${pNew}`, 13: `window_hash = (${wHash}·${BASE} + ${t}) % ${MOD} = ${wNew}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, showVars: true, high, win: 0, winLen: k + 1, pHash: pNew, wHash: wNew }) },
    });
    pHash = pNew;
    wHash = wNew;
  }
  steps.push({
    chapter: 'run',
    short: 'matches',
    title: `Both fingerprints are ready: ${pHash} and ${wHash}`,
    body: `Line 15: \`matches = []\`. Now every window of ${m} letters gets compared with the pattern by one number, not by letters.`,
    code: { view: 'final', lines: [15] },
    values: { 15: 'matches = []' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, showVars: true, high, win: 0, pHash, wHash, matches: [] }) },
  });

  for (let i = 0; i <= n - m; i += 1) {
    windows += 1;
    const window = text.slice(i, i + m);
    const equal = wHash === pHash;
    const hashShown = { ...base, showVars: true, high, win: i, pHash, wHash, matches: [...found] };
    if (!equal) {
      steps.push({
        chapter: 'run',
        short: `Window ${i}`,
        title: `${word(window)}: ${wHash} ≠ ${pHash}, skip it`,
        body: `Line 16: \`i = ${i}\`, the window ${word(window)}. Line 17: \`${wHash} == ${pHash}\` is false. Different numbers always mean different letters, so no letter-by-letter check is needed.`,
        code: { view: 'final', lines: [16, 17] },
        values: { 16: `i = ${i}`, 17: `${wHash} == ${pHash} → False` },
        metrics: metrics(),
        scene: { entities: scene({ ...hashShown, verdict: 'differ' }) },
      });
    } else {
      steps.push({
        chapter: 'run',
        short: `Window ${i}`,
        title: `${word(window)}: ${wHash} = ${pHash}, a candidate`,
        body: `Line 16: \`i = ${i}\`, the window ${word(window)}. Line 17: \`${wHash} == ${pHash}\` is true. Equal hashes only say the window **might** match, so line 18 must check.`,
        code: { view: 'final', lines: [16, 17] },
        values: { 16: `i = ${i}`, 17: `${wHash} == ${pHash} → True` },
        metrics: metrics(),
        scene: { entities: scene({ ...hashShown, verdict: 'equal' }) },
      });
      verifies += 1;
      const same = window.every((c, k) => c === pattern[k]);
      steps.push({
        chapter: 'run',
        short: same ? 'Verify: yes' : 'Collision',
        title: same ? `Letters agree: ${word(window)} = ${word(pattern)}` : `Collision: ${word(window)} is not ${word(pattern)}`,
        body: same
          ? `Line 18 compares the letters: \`text[${i}:${i + m}] == pattern\` is true. This is a real match.`
          : `Line 18 compares the letters: \`text[${i}:${i + m}] == pattern\` is false. Two different windows can share a hash (there are only ${MOD} values), which is why the check can’t be skipped.`,
        code: { view: 'final', lines: [18] },
        values: { 18: `${word(window)} == ${word(pattern)} → ${same ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene({ ...hashShown, verdict: same ? 'same' : 'collision' }) },
      });
      if (same) {
        found.push(i);
        steps.push({
          chapter: 'run',
          short: 'Record',
          title: `Match found at index ${i}`,
          body: `Line 19 appends \`${i}\` to \`matches\`.`,
          code: { view: 'final', lines: [19] },
          values: { 19: `matches = [${found.join(', ')}]` },
          metrics: metrics(),
          scene: { entities: scene({ ...base, showVars: true, high, win: i, pHash, wHash, matches: [...found] }) },
        });
      }
    }
    if (i < n - m) {
      const out = text[i] ?? 0;
      const inn = text[i + m] ?? 0;
      const raw = (wHash - out * high) * BASE + inn;
      const next = md(raw);
      steps.push({
        chapter: 'run',
        short: 'Roll',
        title: `Slide: drop '${letter(out)}', add '${letter(inn)}' → ${next}`,
        body: `Line 20: \`i < n - m\` is true, so there is another window. Line 21 removes \`${letter(out)} = ${out}\` at weight ${high}, shifts everything one digit left and adds \`${letter(inn)} = ${inn}\`: \`((${wHash} − ${out}·${high})·${BASE} + ${inn}) % ${MOD} = ${next}\`.`,
        code: { view: 'final', lines: [20, 21] },
        values: { 20: `${i} < ${n - m} → True`, 21: `window_hash = ((${wHash} − ${out}·${high})·${BASE} + ${inn}) % ${MOD} = ${next}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, showVars: true, high, win: i + 1, pHash, wHash: next, matches: [...found], out, inn, note: `drop ${letter(out)}, shift, add ${letter(inn)}\nno letters re-read: O(1)` }) },
      });
      wHash = next;
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: found.length === 0 ? 'No match: return []' : `Return [${found.join(', ')}]`,
    body: `Line 20: at the last window \`i < n - m\` is false, so there is nothing left to roll. The loop is over, and line 22 returns \`matches\`. ${windows} windows cost ${windows} hash comparisons and only ${verifies} letter-by-letter check${verifies === 1 ? '' : 's'}.`,
    code: { view: 'final', lines: [20, 22] },
    values: { 20: `${n - m} < ${n - m} → False`, 22: `return [${found.join(', ')}]` },
    metrics: metrics(`[${found.join(', ')}]`),
    scene: { entities: scene({ ...base, showVars: true, high, win: n - m, pHash, wHash, matches: [...found] }) },
  });
  return steps;
}

const TEXT = [19, 3, 1, 20, 3, 1, 20] as const;
const PATTERN = [3, 1, 20] as const;
const RUN = traceRabinKarp(TEXT, PATTERN);
const startMetrics = { windows: 0, verifies: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FOUND = [1, 4];

/** Base scene of the story: both words, nothing hashed yet. */
const story = (extra: Partial<RkState> = {}): Entity[] => scene({ text: TEXT, pattern: PATTERN, ...extra });
const runScene = (shortOrIndex: number): { entities: readonly Entity[] } => RUN[shortOrIndex]?.scene ?? { entities: story() };

export default defineWalkthrough({
  id: 'learn/strings/string-hashing-rabin-karp',
  title: 'Rabin-Karp, compare fingerprints, not letters',
  summary: 'From the idea to the code: turn every window of the text into a number, roll that number along in O(1), and only compare letters when two numbers agree.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def rabin_karp(text: list[int], pattern: list[int]) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0 or n < m:
        return []

    base, mod = 10, 101  # Tiny so hashes fit on screen; real code uses a ~10**9 prime
    high = pow(base, m - 1, mod)  # Weight of the window's first letter

    pattern_hash = 0
    window_hash = 0
    for i in range(m):
        pattern_hash = (pattern_hash * base + pattern[i]) % mod
        window_hash = (window_hash * base + text[i]) % mod

    matches: list[int] = []
    for i in range(n - m + 1):
        if window_hash == pattern_hash:
            if text[i : i + m] == pattern:  # Equal hashes can collide, so verify
                matches.append(i)
        if i < n - m:
            window_hash = ((window_hash - text[i] * high) * base + text[i + m]) % mod
    return matches`,
  },
  snapshots: {
    brute: `def rabin_karp(text: list[int], pattern: list[int]) -> list[int]:
    n, m = len(text), len(pattern)
    matches: list[int] = []
    for i in range(n - m + 1):
        if text[i : i + m] == pattern:  # Re-reads up to m letters per window
            matches.append(i)
    return matches`,
  },
  metrics: [
    { key: 'windows', label: 'Windows checked' },
    { key: 'verifies', label: 'Letter checks' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'letter entering the window' },
    { tone: 'compare', label: 'current window' },
    { tone: 'muted', label: 'letter leaving the window' },
    { tone: 'found', label: 'verified match' },
    { tone: 'miss', label: 'hash differs / collision' },
  ],
  goals: [
    { text: 'See why re-reading every window is slow', step: 2 },
    { text: 'Turn a window into a number you can roll', step: 4 },
    { text: 'Follow every hash, roll and verification', step: 13 },
    { text: 'Know why equal hashes still need a check', step: 35 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find "cat" in "scatcat"',
      body: 'Like a guard who first glances at height and build, and only checks ID when those match.\n\nLine 1 takes a `text` and a `pattern` (letters as numbers, `a = 1 … z = 26`) and returns every index where the pattern starts. Here: `[1, 4]`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: story({ note: 'text = "scatcat", pattern = "cat"\nanswer: [1, 4]' }) },
    },
    {
      chapter: 'idea',
      short: 'Compare all',
      title: 'The obvious way: compare every window letter by letter',
      body: 'Line 5 slices out each window and compares it with the pattern. That re-reads up to `m` letters for each of the `n − m + 1` windows: **`O(n·m)`**.\n\nMost windows are wrong from their first letter, yet the slice still copies all `m` of them.',
      code: { view: 'snapshot', id: 'brute', lines: [5] },
      metrics: startMetrics,
      scene: { entities: story({ win: 0, verdict: 'differ', note: '5 windows × up to 3 letters each\n→ O(n · m) letter comparisons' }).filter((e) => e.type !== 'link' && e.type !== 'pointer') },
    },
    {
      chapter: 'idea',
      short: 'Fingerprint',
      title: 'Give every window a one-number fingerprint',
      body: 'Read a window as a number in base 10, with `a = 1 … z = 26`, and keep it below 101. `"cat"` is `3·100 + 1·10 + 20 = 330`, and `330 % 101 = 27`.\n\nTwo numbers compare in one step. Different numbers prove different letters; equal numbers only say "maybe".',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ win: 1, winLen: 3, note: '"cat" = 3·100 + 1·10 + 20 = 330\n330 mod 101 = 27 → one number' }).filter((e) => e.type !== 'pointer') },
    },
    {
      chapter: 'idea',
      short: 'Roll it',
      title: 'Slide the window by updating the number',
      body: 'Recomputing each fingerprint from scratch costs `m` again. Instead, going from `"sca"` to `"cat"`: subtract the leaving letter at its weight (`19·100`), multiply by 10 to shift everyone left, add the new letter (`20`).\n\nThe weight of the first letter is `base^(m−1)`, called `high`. Each slide is **`O(1)`**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ win: 1, out: 19, inn: 20, note: '"sca" = 12   (19·100 + 3·10 + 1, mod 101)\n((12 − 19·100)·10 + 20) mod 101 = 27 = "cat"' }).filter((e) => e.type !== 'pointer') },
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 2–4: sizes and the impossible cases',
      body: 'Line 2 measures both lists. If the pattern is empty, or longer than the text, no window fits, so lines 3–4 return an empty list.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['n, m = len(text), len(pattern)', 'if m == 0 or n < m: return []'],
      scene: { entities: story({ note: 'n = 7, m = 3\n3 letters fit in 7 → go on' }) },
    },
    {
      chapter: 'build',
      short: 'Constants',
      title: 'Lines 6–7: the base, the modulus and `high`',
      body: 'Line 6 picks the number system. Line 7 computes `base^(m−1) % mod`, the weight of a window’s first letter, with Python’s fast modular `pow`. With `m = 3` that is `100`.\n\nReal code uses a modulus near `10**9` so collisions are rare.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['base, mod = 10, 101', 'high = pow(base, m - 1, mod)'],
      scene: runScene(2),
    },
    {
      chapter: 'build',
      short: 'Start hashes',
      title: 'Lines 9–11: two hashes, built over the first m letters',
      body: 'Line 9 holds the pattern’s fingerprint and line 10 the first window’s. Line 11 loops over the first `m` letters to fill both in.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11], lines: [9, 10, 11] },
      metrics: startMetrics,
      changes: ['pattern_hash = 0', 'window_hash = 0', 'for i in range(m)'],
      scene: runScene(3),
    },
    {
      chapter: 'build',
      short: 'Fold letters',
      title: 'Lines 12–13: shift left, add the next letter',
      body: 'Each pass multiplies the hash by `base` (a digit shift) and adds the next letter, reducing mod `mod`. That is the `3·100 + 1·10 + 20` from before, built one digit at a time.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: startMetrics,
      changes: ['pattern_hash = (pattern_hash * base + pattern[i]) % mod', 'window_hash = (window_hash * base + text[i]) % mod'],
      scene: runScene(5),
    },
    {
      chapter: 'build',
      short: 'Windows',
      title: 'Lines 15–17: visit every window, compare fingerprints',
      body: 'Line 15 collects the answers. Line 16 tries each of the `n − m + 1` start positions, and line 17 compares the window’s hash with the pattern’s.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17], lines: [15, 16, 17] },
      metrics: startMetrics,
      changes: ['matches = []', 'for i in range(n - m + 1)', 'if window_hash == pattern_hash'],
      scene: runScene(7),
    },
    {
      chapter: 'build',
      short: 'Verify',
      title: 'Lines 18–19: equal hashes still need a letter check',
      body: 'Two different windows can share a hash, so line 18 compares the real letters. Only then does line 19 record index `i`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19], lines: [18, 19] },
      metrics: startMetrics,
      changes: ['if text[i : i + m] == pattern', 'matches.append(i)'],
      scene: runScene(10),
    },
    {
      chapter: 'build',
      short: 'Roll',
      title: 'Lines 20–21: roll the hash to the next window',
      body: 'Unless this was the last window (line 20), line 21 removes `text[i]` at weight `high`, shifts by `base` and adds `text[i + m]`. Python’s `%` is never negative, so no extra fix-up is needed.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21], lines: [20, 21] },
      metrics: startMetrics,
      changes: ['if i < n - m:', 'window_hash = ((window_hash - text[i] * high) * base + text[i + m]) % mod'],
      scene: runScene(8),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 22: return the matches',
      body: 'After the last window, line 22 returns every verified start index.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [22] },
      metrics: startMetrics,
      changes: ['return matches'],
      scene: { entities: story({ matches: FOUND, note: 'matches = [1, 4]', noteTone: 'found' }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Linear on average, quadratic only under attack',
      body: 'Building the first hashes costs `m`. Each of the `n − m + 1` windows then costs `O(1)` to compare and roll, and a letter check only when hashes agree: **`O(n + m)` on average**.\n\nIf almost every window collides, each check costs `m`: the worst case is **`O(n·m)`**. Space is **`O(1)`** beyond the answer.',
      code: { view: 'final', lines: [12, 13, 17, 21] },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, high: 100, win: 4, pHash: 27, wHash: 27, matches: FOUND, note: 'build hashes: m\nper window: O(1) roll\n→ O(n + m) average, O(n·m) worst', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Verify',
      title: 'Why line 18 can never be skipped',
      body: 'A hash squeezes a whole window into one of only `mod` values, so different windows can collide. Try the "Collision" preset: `"abh"` hashes to 27, exactly like `"cat"`.\n\nThat is the key decision: a hash match is only a **candidate**. Comparing the letters on line 18 is what makes the answer exact.',
      code: { view: 'final', lines: [17, 18] },
      values: { 17: 'equal hashes: only a candidate', 18: 'the letters decide' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          text: [1, 2, 8, 3, 1, 20],
          pattern: PATTERN,
          showVars: true,
          high: 100,
          win: 0,
          pHash: 27,
          wHash: 27,
          verdict: 'collision',
          note: '"abh" and "cat" both hash to 27\nequal hash ≠ equal letters → verify',
          noteTone: 'miss',
        }),
      },
    },
  ],
  trace: {
    title: 'Search your own text',
    inputs: [
      { name: 'text', label: 'Text letters as numbers (1 = a … 26 = z)', kind: 'numbers', default: '19, 3, 1, 20, 3, 1, 20' },
      { name: 'pattern', label: 'Pattern letters as numbers', kind: 'numbers', default: '3, 1, 20' },
    ],
    presets: [
      { label: 'Two matches', values: { text: '19, 3, 1, 20, 3, 1, 20', pattern: '3, 1, 20' } },
      { label: 'Overlapping', values: { text: '1, 1, 1, 1, 1', pattern: '1, 1' } },
      { label: 'No match', values: { text: '1, 2, 3, 4, 5, 6', pattern: '3, 1' } },
      { label: 'Collision', values: { text: '1, 2, 8, 3, 1, 20', pattern: '3, 1, 20' } },
      { label: 'Pattern too long', values: { text: '3, 1', pattern: '3, 1, 20' } },
    ],
    maxItems: 10,
    run: (values) => {
      const text = values['text'];
      const pattern = values['pattern'];
      if (!Array.isArray(text) || text.length === 0) throw new Error('Enter at least one letter of text.');
      if (!Array.isArray(pattern) || pattern.length === 0) throw new Error('Enter at least one letter of pattern.');
      if ([...text, ...pattern].some((v) => !Number.isInteger(v) || v < 1 || v > 26)) throw new Error('Use whole numbers from 1 (a) to 26 (z).');
      return traceRabinKarp(text, pattern);
    },
  },
});
