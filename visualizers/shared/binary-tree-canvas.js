/**
 * Algorithm Hub — Binary & Prefix Tree Canvas
 * Shared SVG tree renderer with overlap-free left/right slot positioning,
 * node badges, edge highlights, clickable selection, and N-ary/Trie mode.
 */
class BinaryTreeCanvas {
  /**
   * @param {object} config
   * @param {HTMLElement} config.containerEl - Scrollable stage wrapper
   * @param {number} [config.nodeRadius=20]
   * @param {number} [config.levelGap=72]
   * @param {number} [config.siblingGap=54]
   * @param {function} [config.onSelectNode] - (node) => void
   */
  constructor(config) {
    this.containerEl = config.containerEl;
    this.nodeRadius = config.nodeRadius || 20;
    this.levelGap = config.levelGap || 72;
    this.siblingGap = config.siblingGap || 54;
    this.onSelectNode = config.onSelectNode || null;
  }

  /**
   * Parse level-order text like "10, 5, 15, 2, 7, null, 20" into a binary tree.
   * Returns { root, nodesById }.
   */
  static parseLevelOrder(text) {
    const tokens = String(text || '')
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!tokens.length) return { root: null, nodesById: {} };

    const isNull = (tok) => /^(null|none|nil|-|x)$/i.test(tok);
    if (isNull(tokens[0])) return { root: null, nodesById: {} };

    const parseVal = (tok) => {
      const num = Number(tok);
      return Number.isNaN(num) ? tok : num;
    };

    let nextId = 0;
    const nodesById = {};
    const makeNode = (tok) => {
      const id = `n${nextId++}`;
      const node = { id, val: parseVal(tok), left: null, right: null };
      nodesById[id] = node;
      return node;
    };

    const root = makeNode(tokens[0]);
    const queue = [root];
    let idx = 1;

    while (queue.length > 0 && idx < tokens.length) {
      const curr = queue.shift();
      if (idx < tokens.length) {
        if (!isNull(tokens[idx])) {
          curr.left = makeNode(tokens[idx]);
          queue.push(curr.left);
        }
        idx += 1;
      }
      if (idx < tokens.length) {
        if (!isNull(tokens[idx])) {
          curr.right = makeNode(tokens[idx]);
          queue.push(curr.right);
        }
        idx += 1;
      }
    }

    return { root, nodesById };
  }

  /**
   * Parse an integer list like "10, 5, 15, 2, 7, 20" into numbers.
   */
  static parseNumberList(text) {
    return String(text || '')
      .split(/[\s,;]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }

  /**
   * Deep-clone a binary tree so steps remain immutable snapshots.
   */
  static cloneBinary(node) {
    if (!node) return null;
    const copy = { ...node };
    copy.left = BinaryTreeCanvas.cloneBinary(node.left);
    copy.right = BinaryTreeCanvas.cloneBinary(node.right);
    return copy;
  }

  /**
   * Render a binary tree snapshot.
   * @param {object|null} root - { id, val, label?, sub?, left, right }
   * @param {object} [state]
   * @param {object} [state.nodeStates] - { [id]: 'active'|'visited'|'queued'|'pivot'|'violation' }
   * @param {object} [state.nodeBadges] - { [id]: string | { text, warn? } }
   * @param {object} [state.edgeStates] - { ["from->to"]: 'exploring'|'active'|'path'|'violation' }
   * @param {boolean} [state.pillNodes] - Use rounded pill boxes instead of circles (for Segment Tree)
   */
  renderBinary(root, state = {}) {
    if (!root) {
      this.containerEl.innerHTML = '<div class="t-empty" style="text-align:center;padding:2rem;">Empty tree</div>';
      return;
    }

    const nodeStates = state.nodeStates || {};
    const nodeBadges = state.nodeBadges || {};
    const edgeStates = state.edgeStates || {};
    const pillNodes = Boolean(state.pillNodes);

    const minSep = pillNodes ? Math.max(this.siblingGap + 24, 78) : this.siblingGap;
    const halfSkew = minSep * 0.58;

    // Overlap-free recursive subtree layout preserving strict left/right orientation
    const layout = (node) => {
      if (!node.left && !node.right) {
        return {
          items: [{ node, relX: 0, depth: 0 }],
          leftBound: [0],
          rightBound: [0],
        };
      }

      const leftL = node.left ? layout(node.left) : null;
      const rightL = node.right ? layout(node.right) : null;

      let leftShift = 0;
      let rightShift = 0;

      if (leftL && rightL) {
        const sharedDepths = Math.min(leftL.rightBound.length, rightL.leftBound.length);
        let needed = minSep;
        for (let d = 0; d < sharedDepths; d++) {
          const dist = leftL.rightBound[d] - rightL.leftBound[d] + minSep;
          if (dist > needed) needed = dist;
        }
        leftShift = -needed / 2;
        rightShift = needed / 2;
      } else if (leftL) {
        // Parent sits clearly to the right of its sole left child
        leftShift = -halfSkew;
      } else if (rightL) {
        // Parent sits clearly to the left of its sole right child
        rightShift = halfSkew;
      }

      const items = [{ node, relX: 0, depth: 0 }];
      const leftBound = [0];
      const rightBound = [0];

      const mergeSub = (sub, shift) => {
        for (const it of sub.items) {
          const d = it.depth + 1;
          const rx = it.relX + shift;
          items.push({ node: it.node, relX: rx, depth: d });
          if (leftBound[d] === undefined || rx < leftBound[d]) leftBound[d] = rx;
          if (rightBound[d] === undefined || rx > rightBound[d]) rightBound[d] = rx;
        }
      };

      if (leftL) mergeSub(leftL, leftShift);
      if (rightL) mergeSub(rightL, rightShift);

      return { items, leftBound, rightBound };
    };

    const placed = layout(root);
    let minX = Infinity;
    let maxX = -Infinity;
    let maxDepth = 0;
    const posMap = new Map();

    for (const item of placed.items) {
      if (item.relX < minX) minX = item.relX;
      if (item.relX > maxX) maxX = item.relX;
      if (item.depth > maxDepth) maxDepth = item.depth;
    }

    const padX = pillNodes ? 56 : 44;
    const padY = 34;
    const contentW = maxX - minX + padX * 2;
    const width = Math.max(460, contentW);
    const offsetX = (width - (maxX - minX)) / 2 - minX;
    const height = Math.max(180, (maxDepth + 1) * this.levelGap + padY * 2 - 14);

    for (const item of placed.items) {
      posMap.set(item.node.id, {
        node: item.node,
        x: item.relX + offsetX,
        y: padY + item.depth * this.levelGap,
      });
    }

    const edges = [];
    const collectEdges = (node) => {
      if (node.left) {
        edges.push({ from: node.id, to: node.left.id });
        collectEdges(node.left);
      }
      if (node.right) {
        edges.push({ from: node.id, to: node.right.id });
        collectEdges(node.right);
      }
    };
    collectEdges(root);

    this._drawSVG({
      width,
      height,
      nodes: Array.from(posMap.values()),
      edges,
      posMap,
      nodeStates,
      nodeBadges,
      edgeStates,
      pillNodes,
    });
  }

  /**
   * Render a general N-ary tree (used for Trie with character-labeled edges).
   * @param {object|null} root - { id, label, endOfWord?, children: [{ edgeLabel?, node }] }
   * @param {object} [state]
   */
  renderNary(root, state = {}) {
    if (!root) {
      this.containerEl.innerHTML = '<div class="t-empty" style="text-align:center;padding:2rem;">Empty tree</div>';
      return;
    }

    const nodeStates = state.nodeStates || {};
    const nodeBadges = state.nodeBadges || {};
    const edgeStates = state.edgeStates || {};

    const slotWidth = Math.max(54, this.nodeRadius * 2 + 16);
    let maxDepth = 0;

    const measure = (node, depth) => {
      if (depth > maxDepth) maxDepth = depth;
      if (!node.children || node.children.length === 0) {
        return 1;
      }
      let sum = 0;
      for (const ch of node.children) {
        sum += measure(ch.node, depth + 1);
      }
      return sum;
    };

    const totalLeaves = measure(root, 0);
    const padX = 34;
    const padY = 32;
    const width = Math.max(460, totalLeaves * slotWidth + padX * 2);
    const height = Math.max(190, (maxDepth + 1) * this.levelGap + padY * 2 - 14);

    let leafCursor = 0;
    const posMap = new Map();
    const edges = [];

    const place = (node, depth) => {
      let x;
      if (!node.children || node.children.length === 0) {
        x = padX + leafCursor * slotWidth + slotWidth / 2;
        leafCursor += 1;
      } else {
        const xs = node.children.map((ch) => {
          const cx = place(ch.node, depth + 1);
          edges.push({ from: node.id, to: ch.node.id, label: ch.edgeLabel || '' });
          return cx;
        });
        x = (xs[0] + xs[xs.length - 1]) / 2;
      }
      const y = padY + depth * this.levelGap;
      posMap.set(node.id, { node, x, y });
      return x;
    };

    place(root, 0);

    this._drawSVG({
      width,
      height,
      nodes: Array.from(posMap.values()),
      edges,
      posMap,
      nodeStates,
      nodeBadges,
      edgeStates,
      pillNodes: false,
    });
  }

  _drawSVG({ width, height, nodes, edges, posMap, nodeStates, nodeBadges, edgeStates, pillNodes }) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 't-svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    for (const e of edges) {
      const p = posMap.get(e.from);
      const c = posMap.get(e.to);
      if (!p || !c) continue;
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(p.x));
      line.setAttribute('y1', String(p.y));
      line.setAttribute('x2', String(c.x));
      line.setAttribute('y2', String(c.y));
      const key = `${e.from}->${e.to}`;
      const st = edgeStates[key];
      line.setAttribute('class', st ? `t-edge t-edge--${st}` : 't-edge');
      svg.appendChild(line);

      if (e.label) {
        const mx = (p.x + c.x) / 2;
        const my = (p.y + c.y) / 2;
        const bg = document.createElementNS(svgNS, 'rect');
        bg.setAttribute('x', String(mx - 10));
        bg.setAttribute('y', String(my - 9));
        bg.setAttribute('width', '20');
        bg.setAttribute('height', '18');
        bg.setAttribute('rx', '6');
        bg.setAttribute('class', 't-edge-label-bg');
        svg.appendChild(bg);

        const txt = document.createElementNS(svgNS, 'text');
        txt.setAttribute('x', String(mx));
        txt.setAttribute('y', String(my));
        txt.setAttribute('class', 't-edge-label');
        txt.textContent = e.label;
        svg.appendChild(txt);
      }
    }

    let activePos = null;
    for (const item of nodes) {
      const { node, x, y } = item;
      const st = nodeStates[node.id] || 'default';
      if (st === 'active') activePos = { x, y };

      const g = document.createElementNS(svgNS, 'g');
      const clickableClass = this.onSelectNode ? ' t-node--clickable' : '';
      g.setAttribute('class', `t-node t-node--${st}${clickableClass}`);

      if (pillNodes) {
        const mainText = String(node.label !== undefined ? node.label : node.val);
        const subText = node.sub ? String(node.sub) : '';
        const w = Math.max(58, Math.max(mainText.length, subText.length) * 7.2 + 18);
        const h = subText ? 36 : 28;
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', String(x - w / 2));
        rect.setAttribute('y', String(y - h / 2));
        rect.setAttribute('width', String(w));
        rect.setAttribute('height', String(h));
        rect.setAttribute('rx', '12');
        rect.setAttribute('class', 't-node-shape');
        g.appendChild(rect);

        const lbl = document.createElementNS(svgNS, 'text');
        lbl.setAttribute('x', String(x));
        lbl.setAttribute('y', String(subText ? y - 6 : y));
        lbl.setAttribute('class', 't-node-label');
        lbl.textContent = mainText;
        g.appendChild(lbl);

        if (subText) {
          const sub = document.createElementNS(svgNS, 'text');
          sub.setAttribute('x', String(x));
          sub.setAttribute('y', String(y + 9));
          sub.setAttribute('class', 't-node-sub');
          sub.textContent = subText;
          g.appendChild(sub);
        }
      } else {
        const r = this.nodeRadius;
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', String(r));
        circle.setAttribute('class', 't-node-shape');
        g.appendChild(circle);

        if (node.endOfWord) {
          const ring = document.createElementNS(svgNS, 'circle');
          ring.setAttribute('cx', String(x));
          ring.setAttribute('cy', String(y));
          ring.setAttribute('r', String(r - 4));
          ring.setAttribute('class', 't-node-ring');
          g.appendChild(ring);
        }

        const lbl = document.createElementNS(svgNS, 'text');
        lbl.setAttribute('x', String(x));
        lbl.setAttribute('y', String(y));
        lbl.setAttribute('class', 't-node-label');
        lbl.textContent = String(node.label !== undefined ? node.label : node.val);
        g.appendChild(lbl);
      }

      const badge = nodeBadges[node.id];
      if (badge !== undefined && badge !== null && badge !== '') {
        const badgeText = typeof badge === 'string' ? badge : badge.text;
        const isWarn = typeof badge === 'object' && Boolean(badge.warn);
        const bw = Math.max(26, badgeText.length * 6.2 + 10);
        const by = y + (pillNodes ? 24 : this.nodeRadius + 10);

        const bg = document.createElementNS(svgNS, 'rect');
        bg.setAttribute('x', String(x - bw / 2));
        bg.setAttribute('y', String(by - 8));
        bg.setAttribute('width', String(bw));
        bg.setAttribute('height', '16');
        bg.setAttribute('rx', '6');
        bg.setAttribute('class', 't-badge-bg');
        g.appendChild(bg);

        const bt = document.createElementNS(svgNS, 'text');
        bt.setAttribute('x', String(x));
        bt.setAttribute('y', String(by));
        bt.setAttribute('class', isWarn ? 't-badge-text t-badge-text--warn' : 't-badge-text');
        bt.textContent = badgeText;
        g.appendChild(bt);
      }

      if (this.onSelectNode) {
        g.addEventListener('click', () => this.onSelectNode(node));
      }
      svg.appendChild(g);
    }

    this.containerEl.innerHTML = '';
    this.containerEl.appendChild(svg);

    if (activePos && this.containerEl.scrollWidth > this.containerEl.clientWidth) {
      const targetLeft = Math.max(0, activePos.x - this.containerEl.clientWidth / 2);
      this.containerEl.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }
}

window.BinaryTreeCanvas = BinaryTreeCanvas;
