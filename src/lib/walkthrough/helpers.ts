/**
 * Authoring helpers. Walkthrough files import these instead of writing raw
 * entity objects, which keeps scenes short and readable.
 */
import type {
  Anchor,
  ArrayEntity,
  LinkEntity,
  MapEntity,
  MapEntry,
  NoteEntity,
  PointerEntity,
  RangeEntity,
  ScalarValue,
  Tone,
  VarRow,
  VarsEntity,
  Walkthrough,
} from './types';

/** Identity function that gives walkthrough files full type checking. */
export function defineWalkthrough(walkthrough: Walkthrough): Walkthrough {
  return walkthrough;
}

type Options<T, K extends keyof T> = Partial<Omit<T, K | 'type' | 'id'>>;

export function arr(
  id: string,
  x: number,
  y: number,
  values: readonly ScalarValue[],
  options: Options<ArrayEntity, 'x' | 'y' | 'values'> = {},
): ArrayEntity {
  return { type: 'array', id, x, y, values, ...options };
}

export function ptr(
  id: string,
  array: string,
  index: number,
  label: string,
  options: Options<PointerEntity, 'array' | 'index' | 'label'> = {},
): PointerEntity {
  return { type: 'pointer', id, array, index, label, ...options };
}

export function range(id: string, array: string, from: number, to: number, tone: Tone = 'compare'): RangeEntity {
  return { type: 'range', id, array, from, to, tone };
}

export function map(
  id: string,
  x: number,
  y: number,
  label: string,
  entries: readonly MapEntry[],
  options: Options<MapEntity, 'x' | 'y' | 'label' | 'entries'> = {},
): MapEntity {
  return { type: 'map', id, x, y, label, entries, ...options };
}

export function vars(
  id: string,
  x: number,
  y: number,
  rows: readonly VarRow[],
  options: Options<VarsEntity, 'x' | 'y' | 'rows'> = {},
): VarsEntity {
  return { type: 'vars', id, x, y, rows, ...options };
}

export function note(id: string, x: number, y: number, text: string, options: Options<NoteEntity, 'x' | 'y' | 'text'> = {}): NoteEntity {
  return { type: 'note', id, x, y, text, tone: 'note', ...options };
}

export function link(id: string, from: Anchor, to: Anchor, options: Options<LinkEntity, 'from' | 'to'> = {}): LinkEntity {
  return { type: 'link', id, from, to, ...options };
}

/** Builds an array `tones` map: `tones([0, 1], 'muted', [4], 'active')`. */
export function tones(...pairs: readonly (readonly number[] | Tone)[]): Record<number, Tone> {
  const out: Record<number, Tone> = {};
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const indices = pairs[i];
    const tone = pairs[i + 1];
    if (Array.isArray(indices) && typeof tone === 'string') {
      for (const index of indices) out[index] = tone;
    }
  }
  return out;
}

/** Inclusive integer range helper: `span(2, 4)` → `[2, 3, 4]`. */
export function span(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}
