/**
 * Isometric 3D view of the same scenes. The flat layout's x/y become floor
 * coordinates, projected at 30°: cells become blocks, pointers become pins,
 * links become lifted arcs with moving packets. Tables (maps, variables) stand
 * up as readable cards at their floor position, like panels in a diorama.
 * Nothing here changes the data model, so every walkthrough gets this view free.
 */
import { CELL, layoutScene, textWidth, type Prim } from './layout';
import { KeyedStage, setText, svgEl, type StageNode, type ViewBox } from './stage';
import type { Scene, Tone } from './types';

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const BLOCK_H = 22;
const ROW_H = 32;
const PIN_BASE = 30;
const PIN_STEP = 27;
const NOTE_LIFT = 10;
const PIN_SHIFT = 13;
/** Room above a table's first row for its label. */
const CARD_HEAD = 24;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Projects a floor point (x right, y down) to the screen. */
export function iso(x: number, y: number, z = 0): Point {
  return { x: (x - y) * COS, y: (x + y) * SIN - z };
}

function pts(points: readonly Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** Top, right (+x) and front (+y) faces of a box with footprint w×d and height h. */
function boxFaces(w: number, d: number, h: number): { top: string; right: string; front: string } {
  const a = iso(0, 0);
  const b = iso(w, 0);
  const c = iso(w, d);
  const e = iso(0, d);
  const up = (p: Point): Point => ({ x: p.x, y: p.y - h });
  return {
    top: pts([up(a), up(b), up(c), up(e)]),
    right: pts([up(b), up(c), c, b]),
    front: pts([up(e), up(c), c, e]),
  };
}

/** Blocks that matter right now float up a little. */
function lift(tone: Tone): number {
  if (tone === 'found') return 14;
  if (tone === 'active') return 10;
  if (tone === 'compare') return 4;
  return 0;
}

function pointsRect(points: readonly Point[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Notes stand centred on their floor footprint, like table cards. */
function noteOrigin(p: Extract<Prim, { kind: 'note' }>): Point {
  const h = p.lines.length * 18 + 16;
  const c = iso(p.x + p.w / 2, p.y + h / 2);
  return { x: c.x - p.w / 2, y: c.y - h / 2 - NOTE_LIFT };
}

function pinHeight(level: number): number {
  return PIN_BASE + level * PIN_STEP;
}

interface CardRegion {
  readonly ox: number;
  readonly oy: number;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * Maps floor coordinates to the screen for one scene. Points inside a table's
 * floor area land on that table's upright card; everything else is projected.
 */
class Projector {
  private readonly cards: readonly CardRegion[];

  constructor(prims: readonly Prim[]) {
    const byOrigin = new Map<string, { ox: number; oy: number; x1: number; y1: number }>();
    for (const p of prims) {
      if (p.kind !== 'pair') continue;
      const key = `${p.ox},${p.oy}`;
      const region = byOrigin.get(key) ?? { ox: p.ox, oy: p.oy, x1: p.ox, y1: p.oy };
      region.x1 = Math.max(region.x1, p.x + p.w);
      region.y1 = Math.max(region.y1, p.y + ROW_H);
      byOrigin.set(key, region);
    }
    this.cards = [...byOrigin.values()].map((r) => ({ ox: r.ox, oy: r.oy, x0: r.ox - 2, y0: r.oy - CARD_HEAD, x1: r.x1 + 2, y1: r.y1 + 2 }));
  }

  /** A card is centred on the projected centre of its table's floor area. */
  private cardOrigin(card: CardRegion): Point {
    const w = card.x1 - card.x0;
    const h = card.y1 - card.oy;
    const c = iso(card.ox + w / 2, card.oy + h / 2);
    return { x: c.x - w / 2, y: c.y - h / 2 };
  }

  point(x: number, y: number, z = 0): Point {
    const card = this.cards.find((c) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);
    if (!card) return iso(x, y, z);
    const o = this.cardOrigin(card);
    return { x: o.x + (x - card.ox), y: o.y + (y - card.oy) };
  }

  inCard(x: number, y: number): boolean {
    return this.cards.some((c) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);
  }
}

/** Arc between two anchor points, lifted above the blocks. */
function arc(prim: Extract<Prim, { kind: 'path' }>, proj: Projector): { d: string; a: Point; b: Point; c: Point; mid: Point } {
  const [ax = 0, ay = 0, , , , , bx = 0, by = 0] = prim.pts;
  const a = proj.point(ax, ay, BLOCK_H);
  const b = proj.point(bx, by, BLOCK_H);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 30 - dist * 0.16 };
  const mid = { x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y };
  return { d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`, a, b, c, mid };
}

/** Screen-space bounding box of one primitive in the 3D view. */
function isoBounds(p: Prim, proj: Projector): Rect {
  switch (p.kind) {
    case 'cell':
      return pointsRect([iso(p.x, p.y, BLOCK_H + 14), iso(p.x + CELL, p.y, BLOCK_H + 14), iso(p.x, p.y + CELL + 20), iso(p.x + CELL, p.y + CELL)]);
    case 'pair': {
      const o = proj.point(p.x, p.y);
      return { x: o.x, y: o.y, w: p.w, h: ROW_H };
    }
    case 'band':
      return pointsRect([iso(p.x, p.y), iso(p.x + p.w, p.y), iso(p.x, p.y + p.h), iso(p.x + p.w, p.y + p.h)]);
    case 'label': {
      const o = proj.inCard(p.x, p.y) ? proj.point(p.x, p.y) : iso(p.x - 40, p.y - 8);
      const w = textWidth(p.text) + 4;
      const x = p.anchor === 'end' ? o.x - w : p.anchor === 'middle' ? o.x - w / 2 : o.x;
      return { x, y: o.y - 14, w, h: 18 };
    }
    case 'pointer': {
      const o = iso(p.ax + PIN_SHIFT, p.ay - PIN_SHIFT, BLOCK_H + 6 + pinHeight(p.level) + 21);
      const w = textWidth(p.text, true) + 20;
      return { x: o.x - w / 2, y: o.y, w, h: 22 };
    }
    case 'note': {
      const o = noteOrigin(p);
      return { x: o.x, y: o.y, w: p.w, h: p.lines.length * 18 + 16 };
    }
    case 'path': {
      const { a, b, c, mid } = arc(p, proj);
      const r = pointsRect([a, b, { x: mid.x, y: (mid.y + c.y) / 2 }]);
      if (!p.text) return r;
      const w = textWidth(p.text) + 16;
      return pointsRect([{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: mid.x - w / 2, y: mid.y - 12 }, { x: mid.x + w / 2, y: mid.y + 12 }]);
    }
  }
}

/** Painter's-order depth: things further back (smaller x + y) are drawn first. */
function depthOf(p: Prim): number {
  switch (p.kind) {
    case 'cell':
      return p.x + p.y + CELL;
    case 'pair':
      // Cards stand at their corner; draw a whole table at one depth, rows in order.
      return p.ox + p.oy + 0.001 * (p.y - p.oy);
    default:
      return p.x + p.y;
  }
}

export class IsoStage extends KeyedStage {
  private proj = new Projector([]);

  fit(scenes: readonly Scene[], padding = 28): ViewBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const scene of scenes) {
      const prims = layoutScene(scene);
      const proj = new Projector(prims);
      for (const prim of prims) {
        const r = isoBounds(prim, proj);
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w);
        maxY = Math.max(maxY, r.y + r.h);
      }
    }
    if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 400, h: 200 };
    return { x: minX - padding, y: minY - padding, w: maxX - minX + padding * 2, h: maxY - minY + padding * 2 };
  }

  override render(scene: Scene, instant = false): void {
    this.proj = new Projector(layoutScene(scene));
    super.render(scene, instant);
  }

  protected position(prim: Prim): { x: number; y: number } {
    switch (prim.kind) {
      case 'cell': {
        const p = iso(prim.x, prim.y);
        return { x: p.x, y: p.y - lift(prim.tone) };
      }
      case 'pair':
        return this.proj.point(prim.x, prim.y);
      case 'label':
        // Array labels sit left of the first block; table labels ride on their card.
        return this.proj.inCard(prim.x, prim.y) ? this.proj.point(prim.x, prim.y) : iso(prim.x - 40, prim.y - 8);
      case 'pointer':
        // Stand the pin beside the block's value, not on top of it.
        return iso(prim.ax + PIN_SHIFT, prim.ay - PIN_SHIFT, BLOCK_H + 6);
      case 'note':
        return noteOrigin(prim);
      case 'path':
        return { x: 0, y: 0 };
      case 'band':
        return iso(prim.x, prim.y);
    }
  }

  protected build(el: SVGGElement, prim: Prim): void {
    switch (prim.kind) {
      case 'cell': {
        const faces = boxFaces(CELL, CELL, BLOCK_H);
        const top = iso(CELL / 2, CELL / 2, BLOCK_H);
        const base = iso(CELL / 2, CELL / 2);
        const sub = iso(CELL / 2, CELL + 16);
        el.append(
          svgEl('ellipse', { class: 'wt-iso-shadow', cx: base.x, cy: base.y, rx: 40, ry: 22 }),
          svgEl('polygon', { class: 'wt-face wt-face--right', points: faces.right }),
          svgEl('polygon', { class: 'wt-face wt-face--front', points: faces.front }),
          svgEl('polygon', { class: 'wt-face wt-face--top', points: faces.top }),
          svgEl('text', { class: 'wt-iso-value', x: top.x, y: top.y + 6, 'text-anchor': 'middle' }),
          svgEl('text', { class: 'wt-iso-sub', x: sub.x, y: sub.y, 'text-anchor': 'middle' }),
        );
        break;
      }
      case 'pair':
        // Upright card row: same drawing as the flat view, so tables stay readable.
        el.append(
          svgEl('rect', { class: 'wt-shape wt-iso-card', height: ROW_H, rx: 9 }),
          svgEl('line', { class: 'wt-divider', y1: 6, y2: 26 }),
          svgEl('text', { class: 'wt-key', x: 12, y: 21 }),
          svgEl('text', { class: 'wt-val', y: 21 }),
        );
        break;
      case 'label':
        el.append(svgEl('text', { class: 'wt-label wt-iso-label' }));
        break;
      case 'band':
        el.append(svgEl('polygon', { class: 'wt-band-rect' }));
        break;
      case 'pointer':
        el.append(
          svgEl('ellipse', { class: 'wt-pin-base', rx: 7, ry: 4 }),
          svgEl('line', { class: 'wt-pin-stem', x1: 0, y1: 0, x2: 0 }),
          svgEl('rect', { class: 'wt-pill', height: 21, rx: 10.5 }),
          svgEl('text', { class: 'wt-pill-text', 'text-anchor': 'middle' }),
        );
        break;
      case 'note':
        el.append(svgEl('rect', { class: 'wt-shape wt-iso-card', rx: 12 }), svgEl('text', { class: 'wt-note-text' }));
        break;
      case 'path':
        break;
    }
  }

  protected paint(node: StageNode, prim: Prim, fresh: boolean): void {
    const { el } = node;
    el.dataset['depth'] = String(depthOf(prim));
    switch (prim.kind) {
      case 'cell':
        setText(el.querySelector<SVGTextElement>('.wt-iso-value'), prim.text);
        setText(el.querySelector<SVGTextElement>('.wt-iso-sub'), prim.sub ?? '');
        break;
      case 'pair': {
        const divider = el.querySelector('line');
        const val = el.querySelector<SVGTextElement>('.wt-val');
        el.querySelector('rect')?.setAttribute('width', String(prim.w));
        el.classList.toggle('wt-placeholder', prim.placeholder === true);
        divider?.setAttribute('x1', String(prim.split));
        divider?.setAttribute('x2', String(prim.split));
        divider?.setAttribute('visibility', prim.placeholder ? 'hidden' : 'visible');
        val?.setAttribute('x', String(prim.split + 12));
        setText(el.querySelector<SVGTextElement>('.wt-key'), prim.left);
        setText(val, prim.right);
        break;
      }
      case 'label': {
        const text = el.querySelector('text');
        text?.setAttribute('text-anchor', prim.anchor);
        setText(text, prim.text);
        break;
      }
      case 'band':
        el.querySelector('polygon')?.setAttribute('points', pts([iso(0, 0), iso(prim.w, 0), iso(prim.w, prim.h), iso(0, prim.h)]));
        break;
      case 'pointer': {
        const height = pinHeight(prim.level);
        const w = Math.max(30, prim.text.length * 8.2 + 18);
        el.querySelector('line')?.setAttribute('y2', String(-height));
        const pill = el.querySelector('rect');
        pill?.setAttribute('x', String(-w / 2));
        pill?.setAttribute('y', String(-height - 21));
        pill?.setAttribute('width', String(w));
        const text = el.querySelector<SVGTextElement>('text');
        text?.setAttribute('y', String(-height - 6));
        setText(text, prim.text);
        break;
      }
      case 'note':
        this.paintNote(el, prim.w, prim.lines);
        break;
      case 'path': {
        const { d, mid } = arc(prim, this.proj);
        this.paintLink(el, { d, tone: prim.tone, dashed: prim.dashed, flow: prim.flow, text: prim.text, lx: mid.x, ly: mid.y }, fresh);
        break;
      }
    }
  }

  /** Keeps blocks in painter's order; only touches the DOM when the order is wrong. */
  protected override afterRender(): void {
    const layer = this.layers.get('main');
    if (!layer) return;
    const children = [...layer.children] as SVGGElement[];
    const depth = (el: SVGGElement): number => Number(el.dataset['depth'] ?? 0);
    const sorted = [...children].sort((a, b) => depth(a) - depth(b));
    if (sorted.every((el, i) => el === children[i])) return;
    for (const el of sorted) layer.appendChild(el);
  }
}
