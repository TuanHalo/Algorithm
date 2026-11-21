/**
 * Turns a Scene into positioned primitives on a flat "floor" plane. Pure
 * functions with no DOM; `iso-stage.ts` projects these floor coordinates to 3D.
 */
import type { Anchor, ArrayEntity, Entity, MapEntity, Scene, Tone, VarsEntity } from './types';

export const CELL = 48;
export const GAP = 8;
export const PITCH = CELL + GAP;
const ROW_H = 32;
const ROW_GAP = 6;
const POINTER_STACK = 28;
const BODY_CHAR = 7.2;
const MONO_CHAR = 8.2;

export type Layer = 'back' | 'main' | 'link' | 'pointer' | 'note';

interface PrimBase {
  readonly key: string;
  readonly layer: Layer;
  readonly x: number;
  readonly y: number;
  readonly tone: Tone;
  /** Code identifier this primitive stands for; the 3D view links it to its tokens. */
  readonly codeVar?: string;
}

/** Rounded box with centred mono text (array cell). */
export interface CellPrim extends PrimBase {
  readonly kind: 'cell';
  readonly text: string;
  readonly sub?: string;
}

/** Two-column row: `left | right` (map entry, variable). */
export interface PairPrim extends PrimBase {
  readonly kind: 'pair';
  readonly w: number;
  readonly left: string;
  readonly right: string;
  /** x of the column divider, shared by every row of one table. */
  readonly split: number;
  /** Top-left of the table this row belongs to (the 3D view stands tables up as cards). */
  readonly ox: number;
  readonly oy: number;
  readonly placeholder?: boolean;
}

export interface LabelPrim extends PrimBase {
  readonly kind: 'label';
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
}

export interface BandPrim extends PrimBase {
  readonly kind: 'band';
  readonly w: number;
  readonly h: number;
}

export interface PointerPrim extends PrimBase {
  readonly kind: 'pointer';
  readonly text: string;
  readonly side: 'top' | 'bottom';
  /** Floor point at the centre of the target cell (used by the 3D view). */
  readonly ax: number;
  readonly ay: number;
  /** Stack height in the 3D view, where top and bottom pointers share one pin column. */
  readonly level: number;
}

export interface NotePrim extends PrimBase {
  readonly kind: 'note';
  readonly w: number;
  readonly lines: readonly string[];
}

export interface PathPrim extends PrimBase {
  readonly kind: 'path';
  readonly d: string;
  /** Cubic control points [ax, ay, c1x, c1y, c2x, c2y, bx, by]. */
  readonly pts: readonly number[];
  readonly dashed: boolean;
  readonly flow: boolean;
  readonly text?: string;
  /** Label position (absolute). */
  readonly lx: number;
  readonly ly: number;
}

export type Prim = CellPrim | PairPrim | LabelPrim | BandPrim | PointerPrim | NotePrim | PathPrim;

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const IDENTIFIER = /^[A-Za-z_]\w*$/;

export function textWidth(text: string, mono = false): number {
  return text.length * (mono ? MONO_CHAR : BODY_CHAR);
}

function mapWidth(e: MapEntity | VarsEntity): number {
  if (e.width) return e.width;
  const rows = e.type === 'map' ? e.entries.map((r) => [String(r.key), String(r.value)]) : e.rows.map((r) => [r.name, String(r.value)]);
  const widest = Math.max(4, ...rows.map(([l, r]) => (l ?? '').length + (r ?? '').length));
  return Math.max(150, widest * MONO_CHAR + 56);
}

function rowRect(e: MapEntity | VarsEntity, row: number): Rect {
  return { x: e.x, y: e.y + row * (ROW_H + ROW_GAP), w: mapWidth(e), h: ROW_H };
}

function cellRect(a: ArrayEntity, index: number): Rect {
  return { x: a.x + index * PITCH, y: a.y, w: CELL, h: CELL };
}

function noteSize(text: string, width?: number): { w: number; h: number; lines: string[] } {
  const lines = text.split('\n');
  const w = width ?? Math.max(...lines.map((l) => textWidth(l))) + 28;
  return { w, h: lines.length * 18 + 16, lines };
}

function entityRect(e: Entity): Rect | undefined {
  switch (e.type) {
    case 'array':
      return { x: e.x, y: e.y, w: e.values.length * PITCH - GAP, h: CELL };
    case 'map':
    case 'vars': {
      const count = Math.max(1, e.type === 'map' ? e.entries.length : e.rows.length);
      return { x: e.x, y: e.y, w: mapWidth(e), h: count * (ROW_H + ROW_GAP) - ROW_GAP };
    }
    case 'note': {
      const size = noteSize(e.text, e.width);
      return { x: e.x, y: e.y, w: size.w, h: size.h };
    }
    default:
      return undefined;
  }
}

function anchorRect(anchor: Anchor, byId: ReadonlyMap<string, Entity>): Rect | undefined {
  const target = byId.get(anchor.entity);
  if (!target) return undefined;
  if (target.type === 'array' && anchor.index !== undefined) return cellRect(target, anchor.index);
  if ((target.type === 'map' || target.type === 'vars') && anchor.key !== undefined) {
    const keys = target.type === 'map' ? target.entries.map((r) => String(r.key)) : target.rows.map((r) => r.name);
    const row = keys.indexOf(String(anchor.key));
    if (row >= 0) return rowRect(target, row);
  }
  return entityRect(target);
}

type Side = 'top' | 'bottom' | 'left' | 'right';

function pickSide(from: Rect, to: Rect): Side {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);
  // Leave along the axis with the bigger empty gap, so wide rows connect sideways.
  const gapX = Math.abs(dx) - (from.w + to.w) / 2;
  const gapY = Math.abs(dy) - (from.h + to.h) / 2;
  if (gapX >= gapY) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

function sidePoint(r: Rect, side: Side): { x: number; y: number; nx: number; ny: number } {
  switch (side) {
    case 'top':
      return { x: r.x + r.w / 2, y: r.y, nx: 0, ny: -1 };
    case 'bottom':
      return { x: r.x + r.w / 2, y: r.y + r.h, nx: 0, ny: 1 };
    case 'left':
      return { x: r.x, y: r.y + r.h / 2, nx: -1, ny: 0 };
    case 'right':
      return { x: r.x + r.w, y: r.y + r.h / 2, nx: 1, ny: 0 };
  }
}

/** Lays out every entity of a scene into primitives. */
export function layoutScene(scene: Scene): Prim[] {
  const prims: Prim[] = [];
  const byId = new Map(scene.entities.map((e) => [e.id, e] as const));
  const pointerStacks = new Map<string, number>();

  for (const e of scene.entities) {
    switch (e.type) {
      case 'array': {
        if (e.label) {
          prims.push({ kind: 'label', key: `${e.id}:label`, layer: 'main', x: e.x - 14, y: e.y + CELL / 2 + 5, tone: 'default', text: e.label, anchor: 'end', codeVar: e.codeVar });
        }
        e.values.forEach((value, i) => {
          prims.push({
            kind: 'cell',
            key: `${e.id}:${i}`,
            layer: 'main',
            x: e.x + i * PITCH,
            y: e.y,
            tone: e.tones?.[i] ?? 'default',
            text: String(value),
            sub: e.showIndex === false ? undefined : String(i),
            codeVar: e.codeVar,
          });
        });
        break;
      }
      case 'range': {
        const a = byId.get(e.array);
        if (a?.type !== 'array') break;
        prims.push({
          kind: 'band',
          key: e.id,
          layer: 'back',
          x: a.x + e.from * PITCH - 6,
          y: a.y - 6,
          w: (e.to - e.from) * PITCH + CELL + 12,
          h: CELL + 12,
          tone: e.tone ?? 'compare',
        });
        break;
      }
      case 'pointer': {
        const a = byId.get(e.array);
        if (a?.type !== 'array') break;
        const side = e.side ?? 'bottom';
        const stackKey = `${e.array}:${e.index}:${side}`;
        const level = pointerStacks.get(stackKey) ?? 0;
        pointerStacks.set(stackKey, level + 1);
        const cx = a.x + e.index * PITCH + CELL / 2;
        const y = side === 'bottom' ? a.y + CELL + 22 + level * POINTER_STACK : a.y - 8 - level * POINTER_STACK;
        // In 3D every pointer stands on the cell: top-side pointers first, bottom-side ones above them.
        const level3d = side === 'top' ? level * 2 : level * 2 + 1;
        prims.push({ kind: 'pointer', key: e.id, layer: 'pointer', x: cx, y, tone: e.tone ?? 'active', text: e.label, side, ax: cx, ay: a.y + CELL / 2, level: level3d, codeVar: e.codeVar });
        break;
      }
      case 'map':
      case 'vars': {
        const w = mapWidth(e);
        const tableVar = e.type === 'map' ? e.codeVar : undefined;
        if (e.label) {
          prims.push({ kind: 'label', key: `${e.id}:label`, layer: 'main', x: e.x, y: e.y - 10, tone: 'default', text: e.label, anchor: 'start', codeVar: tableVar });
        }
        // A map links as a whole; each variable-panel row links by its own name.
        const rows =
          e.type === 'map'
            ? e.entries.map((r) => ({ id: String(r.key), left: String(r.key), right: String(r.value), tone: r.tone, codeVar: tableVar }))
            : e.rows.map((r) => ({ id: r.name, left: r.name, right: String(r.value), tone: r.tone, codeVar: IDENTIFIER.test(r.name) ? r.name : undefined }));
        const longestLeft = Math.max(0, ...rows.map((row) => row.left.length));
        const split = Math.round(Math.max(w * 0.4, longestLeft * MONO_CHAR + 22));
        if (rows.length === 0) {
          prims.push({ kind: 'pair', key: `${e.id}:empty`, layer: 'main', x: e.x, y: e.y, w, tone: 'muted', left: 'empty', right: '', split, ox: e.x, oy: e.y, placeholder: true });
        }
        rows.forEach((row, i) => {
          const r = rowRect(e, i);
          prims.push({ kind: 'pair', key: `${e.id}:row:${row.id}`, layer: 'main', x: r.x, y: r.y, w, tone: row.tone ?? 'default', left: row.left, right: row.right, split, ox: e.x, oy: e.y, codeVar: row.codeVar });
        });
        break;
      }
      case 'note': {
        const size = noteSize(e.text, e.width);
        prims.push({ kind: 'note', key: e.id, layer: 'note', x: e.x, y: e.y, w: size.w, lines: size.lines, tone: e.tone ?? 'note' });
        break;
      }
      case 'link': {
        const fromRect = anchorRect(e.from, byId);
        const toRect = anchorRect(e.to, byId);
        if (!fromRect || !toRect) break;
        const a = sidePoint(fromRect, e.from.side ?? pickSide(fromRect, toRect));
        const b = sidePoint(toRect, e.to.side ?? pickSide(toRect, fromRect));
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const pull = Math.max(30, dist * 0.4);
        const c1 = { x: a.x + a.nx * pull, y: a.y + a.ny * pull };
        const c2 = { x: b.x + b.nx * pull, y: b.y + b.ny * pull };
        // Point on the cubic at t = 0.5 for the label.
        const lx = (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8;
        const ly = (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8;
        const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
        prims.push({
          kind: 'path',
          key: e.id,
          layer: 'link',
          x: 0,
          y: 0,
          tone: e.tone ?? 'compare',
          d,
          pts: [a.x, a.y, c1.x, c1.y, c2.x, c2.y, b.x, b.y],
          dashed: e.dashed ?? false,
          flow: e.flow ?? false,
          text: e.label,
          lx,
          ly,
        });
        break;
      }
    }
  }
  return prims;
}
