/**
 * Keyed SVG renderers. Each primitive key maps to one `<g>`; between steps the
 * group is updated in place, so CSS transitions animate moves and recolours.
 * New keys fade in and dropped keys fade out.
 *
 * `KeyedStage` owns that reconciliation; `IsoStage` (`iso-stage.ts`) decides
 * how each primitive is drawn in 3D.
 */
import { layoutScene, type Layer, type Prim } from './layout';
import type { Scene, Tone } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAYERS: readonly Layer[] = ['back', 'main', 'link', 'pointer', 'note'];
const TONES: readonly Tone[] = ['default', 'active', 'compare', 'found', 'miss', 'muted', 'done', 'note'];
const LEAVE_MS = 320;

export function svgEl<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export function setText(el: SVGTextElement | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

export interface StageNode {
  readonly el: SVGGElement;
  prim: Prim;
}

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** What the player needs from any renderer. */
export interface Renderer {
  fit(scenes: readonly Scene[]): ViewBox;
  setViewBox(vb: ViewBox): void;
  clear(): void;
  render(scene: Scene, instant?: boolean): void;
}

export interface LinkDrawing {
  readonly d: string;
  readonly tone: Tone;
  readonly dashed: boolean;
  readonly flow: boolean;
  readonly text?: string;
  readonly lx: number;
  readonly ly: number;
}

export abstract class KeyedStage implements Renderer {
  protected readonly svg: SVGSVGElement;
  protected readonly uid: string;
  protected readonly reducedMotion: boolean;
  protected readonly layers = new Map<Layer, SVGGElement>();
  private readonly nodes = new Map<string, StageNode>();

  constructor(svg: SVGSVGElement, uid: string) {
    this.svg = svg;
    this.uid = uid;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    svg.replaceChildren(this.buildDefs());
    for (const layer of LAYERS) {
      const g = svgEl('g', { class: `wt-layer wt-layer--${layer}` });
      this.layers.set(layer, g);
      svg.appendChild(g);
    }
  }

  abstract fit(scenes: readonly Scene[]): ViewBox;
  /** Builds the empty child elements for a new primitive. */
  protected abstract build(el: SVGGElement, prim: Prim): void;
  /** Writes a primitive's current state into its elements. */
  protected abstract paint(node: StageNode, prim: Prim, fresh: boolean): void;
  /** Group position, applied as a CSS transform so it can transition. */
  protected abstract position(prim: Prim): { x: number; y: number };
  /** Hook for renderers that need draw-order sorting (isometric depth). `skipMotion` is true for instant renders. */
  protected afterRender(_skipMotion: boolean): void {}

  setViewBox(vb: ViewBox): void {
    this.svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }

  clear(): void {
    for (const node of this.nodes.values()) node.el.remove();
    this.nodes.clear();
  }

  render(scene: Scene, instant = false): void {
    const skipMotion = instant || this.reducedMotion;
    if (skipMotion) this.svg.classList.add('wt-instant');
    const seen = new Set<string>();
    for (const prim of layoutScene(scene)) {
      seen.add(prim.key);
      const existing = this.nodes.get(prim.key);
      if (existing && existing.prim.kind === prim.kind) {
        this.update(existing, prim, false);
      } else {
        if (existing) existing.el.remove();
        this.nodes.set(prim.key, this.create(prim, skipMotion));
      }
    }
    for (const [key, node] of this.nodes) {
      if (seen.has(key)) continue;
      this.nodes.delete(key);
      if (skipMotion) {
        node.el.remove();
      } else {
        node.el.classList.add('wt-leaving');
        window.setTimeout(() => node.el.remove(), LEAVE_MS);
      }
    }
    this.afterRender(skipMotion);
    if (skipMotion) {
      // Flush styles with transitions off, then turn them back on.
      void this.svg.getBoundingClientRect();
      requestAnimationFrame(() => this.svg.classList.remove('wt-instant'));
    }
  }

  private create(prim: Prim, skipMotion: boolean): StageNode {
    const el = svgEl('g');
    this.build(el, prim);
    const node: StageNode = { el, prim };
    this.update(node, prim, true);
    if (!skipMotion) {
      el.classList.add('wt-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('wt-entering')));
    }
    this.layers.get(prim.layer)?.appendChild(el);
    return node;
  }

  private update(node: StageNode, prim: Prim, fresh: boolean): void {
    const { el } = node;
    node.prim = prim;
    el.setAttribute('class', `wt-node wt-${prim.kind} wt-tone-${prim.tone}${el.classList.contains('wt-entering') ? ' wt-entering' : ''}`);
    if (prim.codeVar) el.dataset['var'] = prim.codeVar;
    else delete el.dataset['var'];
    const pos = this.position(prim);
    el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    this.paint(node, prim, fresh);
  }

  private buildDefs(): SVGDefsElement {
    const defs = svgEl('defs');
    for (const tone of TONES) {
      const marker = svgEl('marker', {
        id: `${this.uid}-arrow-${tone}`,
        viewBox: '0 0 10 10',
        refX: 8,
        refY: 5,
        markerWidth: 7,
        markerHeight: 7,
        orient: 'auto-start-reverse',
      });
      marker.appendChild(svgEl('path', { d: 'M0,0 L10,5 L0,10 Z', class: `wt-arrowhead wt-tone-${tone}` }));
      defs.appendChild(marker);
    }
    return defs;
  }

  /** Draws (or redraws, when it changed) an arrow with optional label and moving packet. */
  protected paintLink(el: SVGGElement, link: LinkDrawing, fresh: boolean): void {
    const signature = `${link.d}|${link.text ?? ''}|${link.flow}|${link.dashed}|${link.tone}`;
    if (!fresh && el.dataset['d'] === signature) return;
    el.dataset['d'] = signature;
    const children: SVGElement[] = [
      svgEl('path', {
        class: `wt-link-path${link.dashed ? ' wt-dashed' : ''}`,
        d: link.d,
        'marker-end': `url(#${this.uid}-arrow-${link.tone})`,
      }),
    ];
    if (link.flow && !this.reducedMotion) {
      const dot = svgEl('circle', { class: 'wt-flow', r: 4.5 });
      dot.appendChild(svgEl('animateMotion', { dur: '1.6s', repeatCount: 'indefinite', path: link.d }));
      children.push(dot);
    }
    if (link.text) {
      const w = link.text.length * 7 + 16;
      const label = svgEl('g', { class: 'wt-link-label', transform: `translate(${link.lx}, ${link.ly})` });
      label.append(svgEl('rect', { x: -w / 2, y: -11, width: w, height: 22, rx: 11 }));
      const t = svgEl('text', { y: 4, 'text-anchor': 'middle' });
      t.textContent = link.text;
      label.appendChild(t);
      children.push(label);
    }
    el.replaceChildren(...children);
  }

  /** Multi-line callout card. */
  protected paintNote(el: SVGGElement, w: number, lines: readonly string[]): void {
    const rect = el.querySelector('rect');
    rect?.setAttribute('width', String(w));
    rect?.setAttribute('height', String(lines.length * 18 + 16));
    const text = el.querySelector('text');
    text?.replaceChildren(
      ...lines.map((line, i) => {
        const tspan = svgEl('tspan', { x: 14, y: 22 + i * 18 });
        tspan.textContent = line;
        return tspan;
      }),
    );
  }
}
