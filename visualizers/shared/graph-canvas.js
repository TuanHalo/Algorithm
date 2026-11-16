/**
 * Algorithm Hub — Interactive Graph Canvas
 * Supports draggable nodes, click-to-select start/target, add node, add edge,
 * delete node/edge, directed/weighted rendering, and two-way text sync.
 */
class GraphCanvas {
  constructor(options) {
    this.stageEl = options.stageEl;
    this.toolbarEl = options.toolbarEl || null;
    this.directed = Boolean(options.directed);
    this.weighted = Boolean(options.weighted);
    this.allowNegative = Boolean(options.allowNegative);
    this.defaultWeight = options.defaultWeight !== undefined ? options.defaultWeight : 1;
    this.weightChoices = options.weightChoices || null; // e.g. [0, 1] for 0-1 BFS
    this.width = options.width || 640;
    this.height = options.height || 248;
    this.nodeRadius = options.nodeRadius || 20;

    this.onChange = options.onChange || (() => {});
    this.onSelectNode = options.onSelectNode || (() => {});

    this.nodes = [];
    this.edges = [];
    this.startNode = null;
    this.mode = 'move'; // 'move' | 'add-node' | 'add-edge' | 'delete'
    this.pendingEdgeFrom = null;
    this.activeWeight = this.defaultWeight;

    this._lastState = {};
    this._drag = null;
    this._positionsCache = new Map();

    this._initDOM();
  }

  static edgeKey(from, to, directed) {
    if (directed) return `${from}->${to}`;
    return from < to ? `${from}-${to}` : `${to}-${from}`;
  }

  static parseEdgeList(text, opts = {}) {
    const directed = Boolean(opts.directed);
    const weighted = Boolean(opts.weighted);
    const defaultWeight = opts.defaultWeight !== undefined ? opts.defaultWeight : 1;

    const nodeSet = new Set();
    const edges = [];
    const seenEdges = new Set();

    const tokens = String(text || '')
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const token of tokens) {
      // Match weighted or unweighted edge: A->B:4, A-B:4, A->B, A-B, or "A B 4"
      let match = token.match(
        /^([A-Za-z0-9_]+)\s*(?:->|--|-)\s*([A-Za-z0-9_]+)(?:\s*[:=]\s*(-?\d+))?$/
      );
      if (!match) {
        match = token.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)(?:\s+(-?\d+))?$/);
      }
      if (match) {
        const from = match[1].toUpperCase();
        const to = match[2].toUpperCase();
        const rawW = match[3] !== undefined ? parseInt(match[3], 10) : defaultWeight;
        const w = Number.isNaN(rawW) ? defaultWeight : rawW;
        nodeSet.add(from);
        nodeSet.add(to);
        if (from !== to) {
          const key = GraphCanvas.edgeKey(from, to, directed);
          if (!seenEdges.has(key)) {
            seenEdges.add(key);
            edges.push(weighted ? { from, to, weight: w } : { from, to });
          }
        }
        continue;
      }

      // Single isolated node
      const single = token.match(/^([A-Za-z0-9_]+)$/);
      if (single) {
        nodeSet.add(single[1].toUpperCase());
      }
    }

    return { nodes: Array.from(nodeSet), edges };
  }

  serialize() {
    const connected = new Set();
    const parts = this.edges.map((e) => {
      connected.add(e.from);
      connected.add(e.to);
      const sep = this.directed ? '->' : '-';
      return this.weighted ? `${e.from}${sep}${e.to}:${e.weight}` : `${e.from}${sep}${e.to}`;
    });
    for (const n of this.nodes) {
      if (!connected.has(n.id)) parts.push(n.id);
    }
    return parts.join(', ');
  }

  setConfig({ directed, weighted }) {
    if (directed !== undefined) this.directed = directed;
    if (weighted !== undefined) this.weighted = weighted;
    this.render(this._lastState);
  }

  loadGraph(nodeIds, edges, customPositions = null, preservePositions = true) {
    const prevMap = preservePositions ? this._positionsCache : new Map();
    const count = Math.max(1, nodeIds.length);
    const cx = this.width / 2;
    const cy = this.height / 2;
    const rx = Math.min(230, Math.max(110, count * 28));
    const ry = Math.min(88, Math.max(55, count * 12));

    this.nodes = nodeIds.map((id, idx) => {
      if (customPositions && customPositions[id]) {
        const pos = { x: customPositions[id].x, y: customPositions[id].y };
        this._positionsCache.set(id, pos);
        return { id, ...pos };
      }
      if (prevMap.has(id)) {
        return { id, ...prevMap.get(id) };
      }
      if (count === 1) {
        const pos = { x: cx, y: cy };
        this._positionsCache.set(id, pos);
        return { id, ...pos };
      }
      const angle = -Math.PI / 2 + (2 * Math.PI * idx) / count;
      const pos = {
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle)),
      };
      this._positionsCache.set(id, pos);
      return { id, ...pos };
    });

    this.edges = edges.map((e) => ({ ...e }));
    if (!this.nodes.some((n) => n.id === this.startNode)) {
      this.startNode = this.nodes.length > 0 ? this.nodes[0].id : null;
    }
    this.pendingEdgeFrom = null;
    this.render(this._lastState);
  }

  autoLayout() {
    const ids = this.nodes.map((n) => n.id);
    this._positionsCache.clear();
    this.loadGraph(ids, this.edges, null, false);
  }

  _initDOM() {
    if (this.toolbarEl) {
      this._renderToolbar();
    }

    this.stageEl.classList.add('g-stage');
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.svg.setAttribute('class', 'g-svg');

    this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this._buildMarkers();
    this.svg.appendChild(this.defs);

    this.edgeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nodeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.edgeLayer);
    this.svg.appendChild(this.nodeLayer);

    this.stageEl.innerHTML = '';
    this.stageEl.appendChild(this.svg);

    this.svg.addEventListener('pointerdown', (e) => this._onStagePointerDown(e));
    window.addEventListener('pointermove', (e) => this._onWindowPointerMove(e));
    window.addEventListener('pointerup', (e) => this._onWindowPointerUp(e));
  }

  _renderToolbar() {
    const weightControl = this.weighted
      ? this.weightChoices
        ? `<label class="g-weight-box">w:
            <select id="gc-weight-select" class="g-weight-input" aria-label="New edge weight">
              ${this.weightChoices
                .map((w) => `<option value="${w}" ${w === this.activeWeight ? 'selected' : ''}>${w}</option>`)
                .join('')}
            </select>
           </label>`
        : `<label class="g-weight-box">w:
            <input id="gc-weight-input" class="g-weight-input" type="number" value="${this.activeWeight}" ${
              this.allowNegative ? '' : 'min="0"'
            } aria-label="New edge weight" />
           </label>`
      : '';

    this.toolbarEl.innerHTML = `
      <div class="g-toolbar__modes">
        <button type="button" class="g-mode-btn g-mode-btn--active" data-mode="move" title="Drag nodes or click a node to pick start">✋ Move / Start</button>
        <button type="button" class="g-mode-btn" data-mode="add-node" title="Click empty canvas to add a node">＋ Node</button>
        <button type="button" class="g-mode-btn" data-mode="add-edge" title="Click two nodes to connect them">🔗 Edge</button>
        ${weightControl}
        <button type="button" class="g-mode-btn" data-mode="delete" title="Click a node or edge to remove it">🗑 Delete</button>
        <button type="button" class="g-mode-btn" data-action="layout" title="Arrange nodes neatly">⟳ Layout</button>
      </div>
      <span class="g-toolbar__hint" id="gc-hint">Drag nodes or click one to set start</span>
    `;

    this.toolbarEl.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
    const layoutBtn = this.toolbarEl.querySelector('[data-action="layout"]');
    if (layoutBtn) {
      layoutBtn.addEventListener('click', () => this.autoLayout());
    }
    const wInput = this.toolbarEl.querySelector('#gc-weight-input');
    if (wInput) {
      wInput.addEventListener('input', () => {
        const val = parseInt(wInput.value, 10);
        if (!Number.isNaN(val)) this.activeWeight = this.allowNegative ? val : Math.max(0, val);
      });
    }
    const wSelect = this.toolbarEl.querySelector('#gc-weight-select');
    if (wSelect) {
      wSelect.addEventListener('change', () => {
        this.activeWeight = parseInt(wSelect.value, 10);
      });
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.pendingEdgeFrom = null;
    this.stageEl.classList.toggle('g-stage--add-node', mode === 'add-node');
    this.stageEl.classList.toggle('g-stage--delete', mode === 'delete');

    if (this.toolbarEl) {
      this.toolbarEl.querySelectorAll('[data-mode]').forEach((btn) => {
        btn.classList.toggle('g-mode-btn--active', btn.dataset.mode === mode);
      });
      const hint = this.toolbarEl.querySelector('#gc-hint');
      if (hint) {
        const hints = {
          move: 'Drag nodes or click one to set start',
          'add-node': 'Click empty canvas to place a node',
          'add-edge': 'Click source node, then target node',
          delete: 'Click any node or edge to delete',
        };
        hint.textContent = hints[mode] || '';
      }
    }
    this.render(this._lastState);
  }

  _buildMarkers() {
    const colors = {
      default: '#8c8296',
      exploring: '#e07a2f',
      relaxed: '#248a61',
      mst: '#248a61',
      cycle: '#d64545',
      bridge: '#d64545',
      skip: '#b0a8b9',
      transposed: '#7a4fa3',
    };
    this.defs.innerHTML = '';
    for (const [name, color] of Object.entries(colors)) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `arrow-${name}`);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '6.5');
      marker.setAttribute('markerHeight', '6.5');
      marker.setAttribute('orient', 'auto-start-reverse');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 0 1.5 L 9 5 L 0 8.5 z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      this.defs.appendChild(marker);
    }
  }

  _clientToSvg(clientX, clientY) {
    const rect = this.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: this.width / 2, y: this.height / 2 };
    const x = ((clientX - rect.left) / rect.width) * this.width;
    const y = ((clientY - rect.top) / rect.height) * this.height;
    return {
      x: Math.max(this.nodeRadius + 8, Math.min(this.width - this.nodeRadius - 8, x)),
      y: Math.max(this.nodeRadius + 16, Math.min(this.height - this.nodeRadius - 10, y)),
    };
  }

  _nextNodeId() {
    const used = new Set(this.nodes.map((n) => n.id));
    for (let code = 65; code <= 90; code++) {
      const ch = String.fromCharCode(code);
      if (!used.has(ch)) return ch;
    }
    let idx = 1;
    while (used.has(`N${idx}`)) idx++;
    return `N${idx}`;
  }

  _onStagePointerDown(e) {
    if (this.mode !== 'add-node') return;
    if (e.target !== this.svg) return;
    const pt = this._clientToSvg(e.clientX, e.clientY);
    const id = this._nextNodeId();
    this._positionsCache.set(id, { x: Math.round(pt.x), y: Math.round(pt.y) });
    this.nodes.push({ id, x: Math.round(pt.x), y: Math.round(pt.y) });
    if (!this.startNode) this.startNode = id;
    this.render(this._lastState);
    this.onChange(this.serialize());
  }

  _onNodePointerDown(e, node) {
    e.stopPropagation();
    if (this.mode === 'delete') {
      this.nodes = this.nodes.filter((n) => n.id !== node.id);
      this.edges = this.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id);
      if (this.startNode === node.id) {
        this.startNode = this.nodes.length ? this.nodes[0].id : null;
      }
      this.render(this._lastState);
      this.onChange(this.serialize());
      return;
    }

    if (this.mode === 'add-edge') {
      if (!this.pendingEdgeFrom) {
        this.pendingEdgeFrom = node.id;
        this.render(this._lastState);
      } else if (this.pendingEdgeFrom === node.id) {
        this.pendingEdgeFrom = null;
        this.render(this._lastState);
      } else {
        this._addOrUpdateEdge(this.pendingEdgeFrom, node.id);
        this.pendingEdgeFrom = null;
        this.render(this._lastState);
        this.onChange(this.serialize());
      }
      return;
    }

    if (this.mode === 'move') {
      this._drag = {
        node,
        startClientX: e.clientX,
        startClientY: e.clientY,
        moved: false,
      };
    }
  }

  _onWindowPointerMove(e) {
    if (!this._drag) return;
    const dx = e.clientX - this._drag.startClientX;
    const dy = e.clientY - this._drag.startClientY;
    if (!this._drag.moved && Math.hypot(dx, dy) > 4) {
      this._drag.moved = true;
    }
    if (!this._drag.moved) return;
    const pt = this._clientToSvg(e.clientX, e.clientY);
    this._drag.node.x = Math.round(pt.x);
    this._drag.node.y = Math.round(pt.y);
    this._positionsCache.set(this._drag.node.id, {
      x: this._drag.node.x,
      y: this._drag.node.y,
    });
    this.render(this._lastState);
  }

  _onWindowPointerUp() {
    if (!this._drag) return;
    const { node, moved } = this._drag;
    this._drag = null;
    if (!moved) {
      this.startNode = node.id;
      this.render(this._lastState);
      this.onSelectNode(node.id);
    }
  }

  _addOrUpdateEdge(from, to) {
    const key = GraphCanvas.edgeKey(from, to, this.directed);
    const existing = this.edges.find(
      (e) => GraphCanvas.edgeKey(e.from, e.to, this.directed) === key
    );
    if (existing) {
      if (this.weighted) existing.weight = this.activeWeight;
      return;
    }
    this.edges.push(this.weighted ? { from, to, weight: this.activeWeight } : { from, to });
  }

  _onEdgeClick(e, edge) {
    e.stopPropagation();
    if (this.mode !== 'delete') return;
    const key = GraphCanvas.edgeKey(edge.from, edge.to, this.directed);
    this.edges = this.edges.filter(
      (item) => GraphCanvas.edgeKey(item.from, item.to, this.directed) !== key
    );
    this.render(this._lastState);
    this.onChange(this.serialize());
  }

  render(state = {}) {
    this._lastState = state;
    const nodeStates = state.nodeStates || {};
    const nodeBadges = state.nodeBadges || {};
    const edgeStates = state.edgeStates || {};
    const edgesToDraw = state.overrideEdges || this.edges;
    const directed = state.overrideDirected !== undefined ? state.overrideDirected : this.directed;

    const posMap = new Map(this.nodes.map((n) => [n.id, n]));
    const pairCounts = new Set(edgesToDraw.map((e) => `${e.from}->${e.to}`));

    this.edgeLayer.innerHTML = '';
    for (const edge of edgesToDraw) {
      const a = posMap.get(edge.from);
      const b = posMap.get(edge.to);
      if (!a || !b) continue;

      const key = GraphCanvas.edgeKey(edge.from, edge.to, directed);
      const eState = edgeStates[key] || edgeStates[`${edge.from}->${edge.to}`] || 'default';
      const hasReverse = directed && pairCounts.has(`${edge.to}->${edge.from}`);

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      const startPad = this.nodeRadius + 2;
      const endPad = this.nodeRadius + (directed ? 6 : 2);

      let pathD = '';
      let labelX = (a.x + b.x) / 2;
      let labelY = (a.y + b.y) / 2;

      if (hasReverse) {
        const nx = -uy;
        const ny = ux;
        const curve = 26;
        const cx = (a.x + b.x) / 2 + nx * curve;
        const cy = (a.y + b.y) / 2 + ny * curve;
        const sx = a.x + ux * startPad + nx * 6;
        const sy = a.y + uy * startPad + ny * 6;
        const ex = b.x - ux * endPad + nx * 6;
        const ey = b.y - uy * endPad + ny * 6;
        pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
        labelX = 0.25 * sx + 0.5 * cx + 0.25 * ex;
        labelY = 0.25 * sy + 0.5 * cy + 0.25 * ey;
      } else {
        const sx = a.x + ux * startPad;
        const sy = a.y + uy * startPad;
        const ex = b.x - ux * endPad;
        const ey = b.y - uy * endPad;
        pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
      }

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'g-edge-group');
      group.addEventListener('pointerdown', (ev) => this._onEdgeClick(ev, edge));

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', pathD);
      hit.setAttribute('class', 'g-edge-hit');
      group.appendChild(hit);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', pathD);
      line.setAttribute('class', `g-edge-line${eState !== 'default' ? ` g-edge-line--${eState}` : ''}`);
      if (directed) {
        line.setAttribute('marker-end', `url(#arrow-${eState})`);
      }
      group.appendChild(line);

      if (this.weighted && edge.weight !== undefined) {
        const wStr = String(edge.weight);
        const boxW = Math.max(18, wStr.length * 7 + 8);
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', labelX - boxW / 2);
        rect.setAttribute('y', labelY - 9);
        rect.setAttribute('width', boxW);
        rect.setAttribute('height', 18);
        rect.setAttribute('rx', 6);
        rect.setAttribute('class', 'g-edge-weight-bg');
        group.appendChild(rect);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('class', 'g-edge-weight-text');
        text.textContent = wStr;
        group.appendChild(text);
      }

      this.edgeLayer.appendChild(group);
    }

    this.nodeLayer.innerHTML = '';
    for (const node of this.nodes) {
      const nState = nodeStates[node.id] || 'default';
      const badge = nodeBadges[node.id];

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'g-node-group');
      group.addEventListener('pointerdown', (ev) => this._onNodePointerDown(ev, node));

      if (this.pendingEdgeFrom === node.id || this.startNode === node.id) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', node.x);
        ring.setAttribute('cy', node.y);
        ring.setAttribute('r', this.nodeRadius + 4.5);
        ring.setAttribute('class', 'g-node-ring');
        if (this.pendingEdgeFrom !== node.id) {
          ring.setAttribute('stroke-dasharray', 'none');
          ring.setAttribute('opacity', '0.45');
        }
        group.appendChild(ring);
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', this.nodeRadius);
      circle.setAttribute(
        'class',
        `g-node-circle${nState !== 'default' ? ` g-node-circle--${nState}` : ''}`
      );
      group.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', node.x);
      label.setAttribute('y', node.y);
      label.setAttribute('class', 'g-node-label');
      label.textContent = node.id;
      group.appendChild(label);

      if (badge !== undefined && badge !== null && badge !== '') {
        const bText = String(badge);
        const bw = Math.max(24, bText.length * 6.2 + 8);
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', node.x - bw / 2);
        bg.setAttribute('y', node.y - this.nodeRadius - 17);
        bg.setAttribute('width', bw);
        bg.setAttribute('height', 15);
        bg.setAttribute('rx', 5);
        bg.setAttribute('class', 'g-node-badge-bg');
        group.appendChild(bg);

        const bt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bt.setAttribute('x', node.x);
        bt.setAttribute('y', node.y - this.nodeRadius - 9.5);
        bt.setAttribute('class', 'g-node-badge-text');
        bt.textContent = bText;
        group.appendChild(bt);
      }

      this.nodeLayer.appendChild(group);
    }
  }
}

window.GraphCanvas = GraphCanvas;
