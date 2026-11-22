/**
 * Build-time validation for walkthrough modules. Imported only by server code
 * (the registry), so Zod never ships to the browser.
 */
import { z } from 'astro/zod';
import { nonBlankLines, resolveView, signatureLines, type ResolvedView } from './code-view';
import { CHAPTERS, type Entity, type Step, type Walkthrough } from './types';

const tone = z.enum(['default', 'active', 'compare', 'found', 'miss', 'muted', 'done', 'note']);
const scalar = z.union([z.number(), z.string()]);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/i, 'ids are letters, digits and dashes');
const coord = z.number().finite();
const codeVar = z.string().regex(/^[A-Za-z_]\w*$/, 'codeVar must be a code identifier').optional();
const lineList = z.array(z.number().int().positive()).optional();

const anchor = z
  .object({
    entity: id,
    index: z.number().int().nonnegative().optional(),
    key: scalar.optional(),
    side: z.enum(['top', 'bottom', 'left', 'right']).optional(),
  })
  .strict();

const entity = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('array'),
      id,
      x: coord,
      y: coord,
      values: z.array(scalar).min(1).max(24),
      label: z.string().optional(),
      tones: z.record(z.string().regex(/^\d+$/), tone).optional(),
      showIndex: z.boolean().optional(),
      codeVar,
    })
    .strict(),
  z
    .object({
      type: z.literal('pointer'),
      id,
      array: id,
      index: z.number().int().nonnegative(),
      label: z.string().min(1),
      tone: tone.optional(),
      side: z.enum(['top', 'bottom']).optional(),
      codeVar,
    })
    .strict(),
  z
    .object({
      type: z.literal('range'),
      id,
      array: id,
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative(),
      tone: tone.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('map'),
      id,
      x: coord,
      y: coord,
      label: z.string(),
      entries: z.array(z.object({ key: scalar, value: scalar, tone: tone.optional() }).strict()).max(16),
      width: z.number().positive().optional(),
      codeVar,
    })
    .strict(),
  z
    .object({
      type: z.literal('vars'),
      id,
      x: coord,
      y: coord,
      label: z.string().optional(),
      rows: z.array(z.object({ name: z.string(), value: scalar, tone: tone.optional() }).strict()).min(1),
      width: z.number().positive().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('note'),
      id,
      x: coord,
      y: coord,
      text: z.string().min(1),
      tone: tone.optional(),
      width: z.number().positive().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('link'),
      id,
      from: anchor,
      to: anchor,
      label: z.string().optional(),
      tone: tone.optional(),
      dashed: z.boolean().optional(),
      flow: z.boolean().optional(),
    })
    .strict(),
]);

const codeView = z.discriminatedUnion('view', [
  z.object({ view: z.literal('signature'), lines: lineList }).strict(),
  z.object({ view: z.literal('snapshot'), id: z.string().min(1), lines: lineList }).strict(),
  z.object({ view: z.literal('reveal'), reveal: z.array(z.number().int().positive()).min(1), lines: lineList }).strict(),
  z.object({ view: z.literal('final'), lines: lineList }).strict(),
]);

const step = z
  .object({
    chapter: z.enum(CHAPTERS),
    short: z.string().min(1).max(14),
    title: z.string().min(1),
    body: z.string().min(1),
    code: codeView,
    values: z.record(z.string().regex(/^\d+$/), z.string().min(1)).optional(),
    metrics: z.record(scalar).optional(),
    changes: z.array(z.string()).optional(),
    scene: z.object({ entities: z.array(entity) }).strict(),
  })
  .strict();

const traceShape = z
  .object({
    title: z.string(),
    inputs: z
      .array(
        z
          .object({
            name: z.string(),
            label: z.string(),
            kind: z.enum(['numbers', 'number']),
            default: z.string(),
          })
          .strict(),
      )
      .min(1),
    presets: z.array(z.object({ label: z.string(), values: z.record(z.string()) }).strict()).optional(),
    maxItems: z.number().int().positive().max(24).optional(),
    run: z.custom<(...args: unknown[]) => unknown>((value) => typeof value === 'function', 'run must be a function'),
  })
  .strict();

const walkthroughShape = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    minutes: z.number().positive().optional(),
    code: z.object({ lang: z.literal('python'), source: z.string().min(1) }).strict(),
    snapshots: z.record(z.string().min(1)).optional(),
    metrics: z.array(z.object({ key: z.string(), label: z.string() }).strict()).optional(),
    legend: z.array(z.object({ tone, label: z.string() }).strict()).optional(),
    goals: z.array(z.object({ text: z.string(), step: z.number().int().positive() }).strict()).optional(),
    steps: z.array(step).min(1),
    trace: traceShape.optional(),
  })
  .strict();

/** Checks references between entities inside one scene. Returns problems found. */
function checkScene(entities: readonly Entity[], where: string): string[] {
  const problems: string[] = [];
  const byId = new Map<string, Entity>();
  for (const e of entities) {
    if (byId.has(e.id)) problems.push(`${where}: duplicate entity id "${e.id}"`);
    byId.set(e.id, e);
  }
  const arrayLength = (arrayId: string): number | undefined => {
    const target = byId.get(arrayId);
    return target?.type === 'array' ? target.values.length : undefined;
  };
  for (const e of entities) {
    if (e.type === 'pointer' || e.type === 'range') {
      const len = arrayLength(e.array);
      if (len === undefined) {
        problems.push(`${where}: ${e.type} "${e.id}" targets missing array "${e.array}"`);
        continue;
      }
      const indices = e.type === 'pointer' ? [e.index] : [e.from, e.to];
      if (indices.some((i) => i >= len)) problems.push(`${where}: ${e.type} "${e.id}" is out of bounds`);
      if (e.type === 'range' && e.from > e.to) problems.push(`${where}: range "${e.id}" has from > to`);
    }
    if (e.type === 'link') {
      for (const end of [e.from, e.to]) {
        const target = byId.get(end.entity);
        if (!target) {
          problems.push(`${where}: link "${e.id}" points at missing entity "${end.entity}"`);
        } else if (end.index !== undefined && (target.type !== 'array' || end.index >= target.values.length)) {
          problems.push(`${where}: link "${e.id}" has a bad index on "${end.entity}"`);
        } else if (end.key !== undefined) {
          const keys =
            target.type === 'map'
              ? target.entries.map((entry) => String(entry.key))
              : target.type === 'vars'
                ? target.rows.map((row) => row.name)
                : [];
          if (!keys.includes(String(end.key))) {
            problems.push(`${where}: link "${e.id}" key "${end.key}" not found on "${end.entity}"`);
          }
        }
      }
    }
  }
  return problems;
}

/** Identifiers that appear anywhere in the given code listings. */
function identifiersIn(sources: readonly string[]): Set<string> {
  return new Set(sources.flatMap((src) => src.match(/[A-Za-z_]\w*/g) ?? []));
}

/** Code identifiers that scene entities claim to stand for. */
function codeVarsOf(entities: readonly Entity[]): string[] {
  return entities.flatMap((e) => ('codeVar' in e && e.codeVar ? [e.codeVar] : []));
}

/** Per-step rules shared by story and trace steps: code views, highlighted lines, values, metrics, scene links. */
export function checkSteps(steps: readonly Step[], wt: Walkthrough, label: string): string[] {
  const problems: string[] = [];
  const metricKeys = (wt.metrics ?? []).map((m) => m.key);
  const known = identifiersIn([wt.code.source, ...Object.values(wt.snapshots ?? {})]);
  steps.forEach((s, i) => {
    const where = `${label} step ${i + 1}`;
    problems.push(...checkScene(s.scene.entities, where));
    let view: ResolvedView | undefined;
    try {
      view = resolveView(wt, s.code);
    } catch (err) {
      problems.push(`${where}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (view) {
      const shown = view.visible;
      for (const line of s.code.lines ?? []) {
        if (!shown.has(line)) problems.push(`${where}: highlighted line ${line} is not visible in the "${view.key}" view`);
      }
      for (const key of Object.keys(s.values ?? {})) {
        if (!shown.has(Number(key))) problems.push(`${where}: value for line ${key} is not visible in the "${view.key}" view`);
      }
    }
    for (const key of Object.keys(s.metrics ?? {})) {
      if (!metricKeys.includes(key)) problems.push(`${where}: unknown metric "${key}"`);
    }
    for (const name of codeVarsOf(s.scene.entities)) {
      if (!known.has(name)) problems.push(`${where}: codeVar "${name}" does not appear in the code`);
    }
  });
  return problems;
}

/** The set of final-code lines a build step puts on screen, or undefined for a snapshot. */
function shownByBuildStep(s: Step, all: readonly number[], signature: readonly number[]): Set<number> | undefined {
  switch (s.code.view) {
    case 'final':
      return new Set(all);
    case 'reveal':
      return new Set(s.code.reveal);
    case 'signature':
      return new Set(signature);
    case 'snapshot':
      return undefined;
  }
}

/** Story-level rules from `.migration-contract.md` §3 and §4.2. */
function checkStory(wt: Walkthrough): string[] {
  const problems: string[] = [];
  const steps = wt.steps;
  // Lessons get more room because their run chapter takes one decision per step.
  const maxSteps = wt.id.startsWith('learn/') ? 24 : 14;
  if (steps.length < 8 || steps.length > maxSteps) problems.push(`story has ${steps.length} steps; expected 8–${maxSteps}`);

  // Chapters: in order, none skipped, and the last step is the key decision in "why".
  const order = steps.map((s) => CHAPTERS.indexOf(s.chapter));
  order.forEach((o, i) => {
    const prev = order[i - 1];
    if (prev !== undefined && o < prev) problems.push(`story step ${i + 1}: chapter "${steps[i]?.chapter}" comes after a later chapter`);
  });
  for (const chapter of CHAPTERS) {
    if (!steps.some((s) => s.chapter === chapter)) problems.push(`story is missing the "${chapter}" chapter`);
  }
  if (steps.at(-1)?.chapter !== 'why') problems.push('the last story step must be in the "why" chapter (the key decision)');

  // Build chapter: reveals only grow, add at most 3 lines per step, and end with the whole solution.
  const all = nonBlankLines(wt.code.source);
  const signature = signatureLines(wt.code.source);
  let shown = new Set<number>(signature);
  const build = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === 'build');
  for (const { s, i } of build) {
    const where = `story step ${i + 1}`;
    const next = shownByBuildStep(s, all, signature);
    if (!next) {
      problems.push(`${where}: build steps show the solution growing ("reveal" or "final"), not a snapshot`);
      continue;
    }
    const dropped = [...shown].filter((line) => !next.has(line));
    if (dropped.length > 0) problems.push(`${where}: reveal hides line(s) ${dropped.join(', ')} shown earlier; reveals may only grow`);
    const added = [...next].filter((line) => !shown.has(line) && all.includes(line));
    if (added.length > 3) problems.push(`${where}: reveal adds ${added.length} lines (${added.join(', ')}); add at most 3 per step`);
    shown = next;
  }
  const missing = all.filter((line) => !shown.has(line));
  if (build.length > 0 && missing.length > 0) problems.push(`the last build step must reveal the whole solution; missing line(s) ${missing.join(', ')}`);

  for (const goal of wt.goals ?? []) {
    if (goal.step > steps.length) problems.push(`goal "${goal.text}" points past the last step`);
  }
  return problems;
}

/** Parses an imported walkthrough module and throws a readable error listing every problem. */
export function validateWalkthrough(value: unknown, expectedId: string): Walkthrough {
  const parsed = walkthroughShape.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Walkthrough "${expectedId}" failed validation:\n${issues.join('\n')}`);
  }
  // The shape check passed, so the original object (which keeps the real `run` function) is a Walkthrough.
  const wt = value as Walkthrough;
  const problems: string[] = [];
  if (wt.id !== expectedId) problems.push(`id "${wt.id}" must match file path "${expectedId}"`);
  problems.push(...checkStory(wt), ...checkSteps(wt.steps, wt, 'story'));

  if (wt.trace) {
    // Run the trace once with its default inputs so a broken generator fails the build.
    const defaults: Record<string, number | number[]> = {};
    for (const input of wt.trace.inputs) {
      const nums = input.default.split(/[\s,]+/).filter(Boolean).map(Number);
      defaults[input.name] = input.kind === 'number' ? (nums[0] ?? 0) : nums;
    }
    const traced = wt.trace.run(defaults);
    const tracedShape = z.array(step).min(1).safeParse(traced);
    if (!tracedShape.success) {
      problems.push(`trace output: ${tracedShape.error.issues[0]?.path.join('.')} ${tracedShape.error.issues[0]?.message}`);
    } else {
      problems.push(...checkSteps(traced, wt, 'trace'));
      traced.forEach((s, i) => {
        if (s.chapter !== 'run' || s.code.view !== 'final') problems.push(`trace step ${i + 1}: trace steps must be chapter "run" with the "final" code view`);
      });
    }
  }

  if (problems.length > 0) {
    throw new Error(`Walkthrough "${expectedId}" failed validation:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  return wt;
}
