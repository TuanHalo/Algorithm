/**
 * Algorithm Hub — Recursion Tree Canvas
 * Shared SVG tree renderer for backtracking decision trees.
 */

class TreeCanvas {
  /**
   * @param {object} config
   * @param {HTMLElement} config.containerEl - Scrollable wrapper element
   * @param {number} [config.nodeWidth=74]
   * @param {number} [config.nodeHeight=28]
   * @param {number} [config.gapX=16]
   * @param {number} [config.levelGap=66]
   */
  constructor(config) {
    this.containerEl = config.containerEl;
    this.nodeWidth = config.nodeWidth || 74;
    this.nodeHeight = config.nodeHeight || 28;
    this.gapX = config.gapX || 16;
    this.levelGap = config.levelGap || 66;
  }

  /**
   * Render a tree snapshot.
   * @param {object|null} root - { id, label, edgeLabel?, state?, children: [...] }
   */
  render(root) {
    if (!root) {
      this.containerEl.innerHTML = '';
      return;
    }

    const slotWidth = this.nodeWidth + this.gapX;
    let maxDepth = 0;

    const measure = (node, depth) => {
      if (depth > maxDepth) maxDepth = depth;
      if (!node.children || node.children.length === 0) {
        node._leaves = 1;
        return 1;
      }
      let sum = 0;
      for (const child of node.children) {
        sum += measure(child, depth + 1);
      }
      node._leaves = sum;
      return sum;
    };

    const totalLeaves = measure(root, 0);
    const padX = 24;
    const padY = 22;
    const width = Math.max(420, totalLeaves * slotWidth + padX * 2);
    const height = (maxDepth + 1) * this.levelGap + padY * 2;

    const nodes = [];
    const edges = [];
    let leafCursor = 0;

    const posMap = new Map();
    const placeAndMap = (node, depth, parent) => {
      let x;
      if (!node.children || node.children.length === 0) {
        x = padX + leafCursor * slotWidth + slotWidth / 2;
        leafCursor += 1;
      } else {
        const xs = node.children.map((c) => placeAndMap(c, depth + 1, node));
        x = (xs[0] + xs[xs.length - 1]) / 2;
      }
      const y = padY + depth * this.levelGap;
      posMap.set(node.id, { x, y, node });
      nodes.push({ node, x, y });
      if (parent) {
        edges.push({ fromId: parent.id, toId: node.id, edgeLabel: node.edgeLabel || '', state: node.state || 'default' });
      }
      return x;
    };

    placeAndMap(root, 0, null);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'bt-tree-svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const halfH = this.nodeHeight / 2;
    let activePos = null;

    for (const edge of edges) {
      const p = posMap.get(edge.fromId);
      const c = posMap.get(edge.toId);
      const x1 = p.x;
      const y1 = p.y + halfH;
      const x2 = c.x;
      const y2 = c.y - halfH;
      const midY = (y1 + y2) / 2;

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
      const edgeClass = edge.state && edge.state !== 'default' && edge.state !== 'backtracked'
        ? `bt-edge bt-edge--${edge.state}`
        : 'bt-edge';
      path.setAttribute('class', edgeClass);
      svg.appendChild(path);

      if (edge.edgeLabel) {
        const lx = (x1 + x2) / 2;
        const ly = (y1 + y2) / 2;
        const pillW = Math.max(24, edge.edgeLabel.length * 7 + 10);
        const bg = document.createElementNS(svgNS, 'rect');
        bg.setAttribute('x', String(lx - pillW / 2));
        bg.setAttribute('y', String(ly - 8));
        bg.setAttribute('width', String(pillW));
        bg.setAttribute('height', '16');
        bg.setAttribute('rx', '6');
        bg.setAttribute('class', 'bt-edge-label-bg');
        svg.appendChild(bg);

        const txt = document.createElementNS(svgNS, 'text');
        txt.setAttribute('x', String(lx));
        txt.setAttribute('y', String(ly));
        txt.setAttribute('class', 'bt-edge-label');
        txt.textContent = edge.edgeLabel;
        svg.appendChild(txt);
      }
    }

    for (const item of nodes) {
      const { node, x, y } = item;
      const w = Math.max(this.nodeWidth, (node.label || '').length * 7 + 16);
      const h = this.nodeHeight;
      const state = node.state || 'default';
      if (state === 'active') activePos = { x, y };

      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', `bt-node bt-node--${state}`);

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', String(x - w / 2));
      rect.setAttribute('y', String(y - h / 2));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', '10');
      rect.setAttribute('class', 'bt-node-rect');
      g.appendChild(rect);

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y));
      text.setAttribute('class', 'bt-node-label');
      text.textContent = node.label;
      g.appendChild(text);

      svg.appendChild(g);
    }

    this.containerEl.innerHTML = '';
    this.containerEl.appendChild(svg);

    if (activePos) {
      const targetLeft = Math.max(0, activePos.x - this.containerEl.clientWidth / 2);
      const targetTop = Math.max(0, activePos.y - this.containerEl.clientHeight / 2);
      this.containerEl.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
    }
  }
}

window.TreeCanvas = TreeCanvas;
