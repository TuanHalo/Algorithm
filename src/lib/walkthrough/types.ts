/**
 * Walkthrough data model.
 *
 * A walkthrough is a list of narrated steps. Each step carries a full `Scene`
 * (what the stage should look like), and the renderer animates the difference
 * between consecutive scenes. Entities are keyed by `id`, so an entity that
 * keeps its id across steps slides/recolours instead of popping in and out.
 */

/** Visual state of a cell, row, pointer, link or note. */
export type Tone =
  | 'default'
  | 'active'
  | 'compare'
  | 'found'
  | 'miss'
  | 'muted'
  | 'done'
  | 'note';

export type ScalarValue = number | string;

/** A row of boxes (array, string, window...). Cells are 48px with 8px gaps. */
export interface ArrayEntity {
  readonly type: 'array';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly values: readonly ScalarValue[];
  readonly label?: string;
  /** Per-index tone overrides; missing indices use `default`. */
  readonly tones?: Readonly<Record<number, Tone>>;
  /** Show the 0-based index under each cell (default true). */
  readonly showIndex?: boolean;
  /**
   * Text under each cell instead of its 0-based index, parallel to `values`
   * (e.g. a heap tree node shows its slot in the array).
   */
  readonly indexLabels?: readonly ScalarValue[];
  /** Code identifier this array stands for; links the blocks to its tokens in the code panel. */
  readonly codeVar?: string;
  /**
   * Stable identity per cell, parallel to `values` (unique). A cell keeps its key
   * wherever its value moves, so swaps and shifts animate as blocks sliding to
   * their new slots. Without it, cells are keyed by index and only their numbers change.
   */
  readonly itemKeys?: readonly (string | number)[];
}

/** A labelled arrow that points at one cell of an array. */
export interface PointerEntity {
  readonly type: 'pointer';
  readonly id: string;
  readonly array: string;
  readonly index: number;
  readonly label: string;
  readonly tone?: Tone;
  readonly side?: 'top' | 'bottom';
  readonly codeVar?: string;
}

/** A tinted band behind a contiguous run of cells (search window, sliding window). */
export interface RangeEntity {
  readonly type: 'range';
  readonly id: string;
  readonly array: string;
  readonly from: number;
  readonly to: number;
  readonly tone?: Tone;
}

export interface MapEntry {
  readonly key: ScalarValue;
  readonly value: ScalarValue;
  readonly tone?: Tone;
}

/** A key → value table (hash map, dict, counter). */
export interface MapEntity {
  readonly type: 'map';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly entries: readonly MapEntry[];
  readonly width?: number;
  readonly codeVar?: string;
}

/** A watched variable. A `name` that is a code identifier links to its tokens automatically. */
export interface VarRow {
  readonly name: string;
  readonly value: ScalarValue;
  readonly tone?: Tone;
}

/** A small "watch" panel of named variables. */
export interface VarsEntity {
  readonly type: 'vars';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label?: string;
  readonly rows: readonly VarRow[];
  readonly width?: number;
}

/** A callout box. Use `\n` for line breaks. */
export interface NoteEntity {
  readonly type: 'note';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly tone?: Tone;
  readonly width?: number;
}

/**
 * Where a link starts or ends. `index` targets an array cell, `key` targets a
 * map entry or a vars row; with neither, the whole entity is the target.
 */
export interface Anchor {
  readonly entity: string;
  readonly index?: number;
  readonly key?: ScalarValue;
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
}

/** A curved arrow between two anchors. `flow` animates a dot along it. */
export interface LinkEntity {
  readonly type: 'link';
  readonly id: string;
  readonly from: Anchor;
  readonly to: Anchor;
  readonly label?: string;
  readonly tone?: Tone;
  readonly dashed?: boolean;
  readonly flow?: boolean;
}

export type Entity =
  | ArrayEntity
  | PointerEntity
  | RangeEntity
  | MapEntity
  | VarsEntity
  | NoteEntity
  | LinkEntity;

export interface Scene {
  readonly entities: readonly Entity[];
}

/** The five story chapters, always in this order (see `.migration-contract.md` §3). */
export const CHAPTERS = ['problem', 'idea', 'build', 'run', 'why'] as const;
export type ChapterId = (typeof CHAPTERS)[number];

/**
 * What the code panel shows in a step (`.migration-contract.md` §4.2).
 * `lines` are highlighted; they are final-code line numbers, except in a
 * `snapshot` view where they number the snapshot's own lines.
 */
export type CodeView =
  | { readonly view: 'signature'; readonly lines?: readonly number[] }
  | { readonly view: 'snapshot'; readonly id: string; readonly lines?: readonly number[] }
  | { readonly view: 'reveal'; readonly reveal: readonly number[]; readonly lines?: readonly number[] }
  | { readonly view: 'final'; readonly lines?: readonly number[] };

export interface Step {
  readonly chapter: ChapterId;
  /** One or two words for the step rail (max 14 characters). */
  readonly short: string;
  readonly title: string;
  /** Narration. Supports `**bold**` and `` `code` ``; everything else is escaped. */
  readonly body: string;
  readonly code: CodeView;
  /** Inline values shown as ghost comments after a line, keyed by the same line numbers as `code.lines`. */
  readonly values?: Readonly<Record<number, string>>;
  readonly metrics?: Readonly<Record<string, ScalarValue>>;
  /** Short "what changed" bullets shown under the narration. */
  readonly changes?: readonly string[];
  readonly scene: Scene;
}

export interface MetricDef {
  readonly key: string;
  readonly label: string;
}

export interface LegendItem {
  readonly tone: Tone;
  readonly label: string;
}

export interface Goal {
  readonly text: string;
  /** 1-based step that teaches this goal. */
  readonly step: number;
}

export interface TraceInput {
  readonly name: string;
  readonly label: string;
  readonly kind: 'numbers' | 'number';
  /** Default text for the input field, e.g. "1, 3, 5". */
  readonly default: string;
  /** Accept decimals such as 0.42 (default: whole numbers only). */
  readonly decimals?: boolean;
}

export interface TracePreset {
  readonly label: string;
  readonly values: Readonly<Record<string, string>>;
}

export type TraceValues = Readonly<Record<string, number | readonly number[]>>;

/** "Try your own input" mode: runs the algorithm and records a step per operation. */
export interface TraceConfig {
  readonly title: string;
  readonly inputs: readonly TraceInput[];
  readonly presets?: readonly TracePreset[];
  /** Max items accepted by a `numbers` input (default 12). */
  readonly maxItems?: number;
  readonly run: (values: TraceValues) => readonly Step[];
}

export interface Walkthrough {
  /** Must equal the file path under `src/walkthroughs/` without `.ts`. */
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly minutes?: number;
  /** The solution: the single source of truth for code on the page. */
  readonly code: { readonly lang: 'python'; readonly source: string };
  /** Other listings the story shows, e.g. `{ brute: '...' }` for the `idea` chapter. */
  readonly snapshots?: Readonly<Record<string, string>>;
  readonly metrics?: readonly MetricDef[];
  readonly legend?: readonly LegendItem[];
  readonly goals?: readonly Goal[];
  readonly steps: readonly Step[];
  readonly trace?: TraceConfig;
}
