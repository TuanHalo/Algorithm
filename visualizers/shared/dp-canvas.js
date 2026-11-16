/**
 * Algorithm Hub — Dynamic Programming Canvas Helpers
 * Shared 1D strip, 2D matrix grid, recursion tree, and code highlight renderers.
 */
class DPCanvas {
  static escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  static formatValue(val) {
    if (val === null || val === undefined) return '·';
    if (val === Infinity || val === 'INF') return '∞';
    if (val === -Infinity || val === '-INF') return '-∞';
    if (typeof val === 'boolean') return val ? 'T' : 'F';
    return String(val);
  }

  static renderCode(codeEl, lines, activeLine = -1) {
    if (!codeEl) return;
    codeEl.innerHTML = lines
      .map((line, i) => {
        const active = i === activeLine ? ' vis-code__line--active' : '';
        return `<span class="vis-code__line${active}"><span class="vis-code__line-number">${i + 1}</span>${DPCanvas.escapeHtml(line)}</span>`;
      })
      .join('');
  }

  /**
   * Render a 1D DP strip with optional index labels, pointer tags, and cell highlights.
   */
  static render1D(containerEl, opts) {
    if (!containerEl) return;
    const values = opts.values || [];
    const labels = opts.labels || values.map((_, i) => `dp[${i}]`);
    const activeSet = new Set(opts.active || []);
    const depSet = new Set(opts.deps || []);
    const updatedSet = new Set(opts.updated || []);
    const pathSet = new Set(opts.path || []);
    const computedUpTo = opts.computedUpTo !== undefined ? opts.computedUpTo : values.length - 1;
    const tags = opts.tags || {};

    const cellsHtml = values
      .map((val, i) => {
        let cls = 'dp-cell';
        if (pathSet.has(i)) cls += ' dp-cell--path';
        else if (updatedSet.has(i)) cls += ' dp-cell--updated';
        else if (activeSet.has(i)) cls += ' dp-cell--active';
        else if (depSet.has(i)) cls += ' dp-cell--dependency';
        else if (val === null || val === undefined || i > computedUpTo) cls += ' dp-cell--uncomputed';
        else cls += ' dp-cell--computed';

        const tagHtml = tags[i] ? `<div class="dp-cell__tag">${DPCanvas.escapeHtml(tags[i])}</div>` : '';
        return `
          <div class="${cls}">
            <div class="dp-cell__val">${DPCanvas.escapeHtml(DPCanvas.formatValue(val))}</div>
            <div class="dp-cell__idx">${DPCanvas.escapeHtml(labels[i])}</div>
            ${tagHtml}
          </div>`;
      })
      .join('');

    const titleHtml = opts.title
      ? `<div class="dp-section-label">${DPCanvas.escapeHtml(opts.title)}</div>`
      : '';
    containerEl.innerHTML = `${titleHtml}<div class="dp-strip-wrap"><div class="dp-strip">${cellsHtml}</div></div>`;
  }

  /**
   * Render a 2D DP matrix with row/column headers, dependency highlights, and traceback path.
   */
  static render2D(containerEl, opts) {
    if (!containerEl) return;
    const matrix = opts.matrix || [];
    const rowHeaders = opts.rowHeaders || matrix.map((_, r) => String(r));
    const colHeaders = opts.colHeaders || (matrix[0] ? matrix[0].map((_, c) => String(c)) : []);
    const cornerLabel = opts.cornerLabel !== undefined ? opts.cornerLabel : 'r\\c';

    const key = (r, c) => `${r},${c}`;
    const activeSet = new Set((opts.active || []).map(([r, c]) => key(r, c)));
    const depSet = new Set((opts.deps || []).map(([r, c]) => key(r, c)));
    const updatedSet = new Set((opts.updated || []).map(([r, c]) => key(r, c)));
    const pathSet = new Set((opts.path || []).map(([r, c]) => key(r, c)));
    const blockedSet = new Set((opts.blocked || []).map(([r, c]) => key(r, c)));
    const unusedFn = opts.isUnused || null;

    const thead = `<thead><tr><th>${DPCanvas.escapeHtml(cornerLabel)}</th>${colHeaders
      .map((h) => `<th>${DPCanvas.escapeHtml(h)}</th>`)
      .join('')}</tr></thead>`;

    const tbody = matrix
      .map((row, r) => {
        const cells = row
          .map((val, c) => {
            const k = key(r, c);
            let cls = 'dp-grid-cell';
            if (unusedFn && unusedFn(r, c)) {
              cls += ' dp-grid-cell--unused';
              return `<td class="${cls}"></td>`;
            }
            if (blockedSet.has(k)) cls += ' dp-grid-cell--blocked';
            else if (pathSet.has(k)) cls += ' dp-grid-cell--path';
            else if (updatedSet.has(k)) cls += ' dp-grid-cell--updated';
            else if (activeSet.has(k)) cls += ' dp-grid-cell--active';
            else if (depSet.has(k)) cls += ' dp-grid-cell--dependency';
            else if (val === null || val === undefined) cls += ' dp-grid-cell--uncomputed';

            const display = blockedSet.has(k) ? '✕' : DPCanvas.formatValue(val);
            return `<td class="${cls}">${DPCanvas.escapeHtml(display)}</td>`;
          })
          .join('');
        return `<tr><th class="dp-row-header">${DPCanvas.escapeHtml(rowHeaders[r] ?? String(r))}</th>${cells}</tr>`;
      })
      .join('');

    const titleHtml = opts.title
      ? `<div class="dp-section-label">${DPCanvas.escapeHtml(opts.title)}</div>`
      : '';
    containerEl.innerHTML = `${titleHtml}<div class="dp-grid-wrap"><table class="dp-grid">${thead}<tbody>${tbody}</tbody></table></div>`;
  }

  /**
   * Render a compact SVG recursion call tree for Top-Down Memoization.
   */
  static renderCallTree(containerEl, opts) {
    if (!containerEl) return;
    const nodes = opts.nodes || [];
    const edges = opts.edges || [];
    const width = opts.width || 680;
    const height = opts.height || 235;
    const boxW = opts.boxW || 62;
    const boxH = opts.boxH || 28;

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const edgesSvg = edges
      .map((e) => {
        const from = nodeById.get(e.from);
        const to = nodeById.get(e.to);
        if (!from || !to) return '';
        const cls = e.active ? 'dp-tree-edge dp-tree-edge--active' : 'dp-tree-edge';
        return `<line class="${cls}" x1="${from.x}" y1="${from.y + boxH / 2}" x2="${to.x}" y2="${to.y - boxH / 2}" />`;
      })
      .join('');

    const nodesSvg = nodes
      .map((n) => {
        const status = n.status || 'pending';
        const label = n.label || '';
        return `
          <g class="dp-tree-node dp-tree-node--${status}" transform="translate(${n.x - boxW / 2}, ${n.y - boxH / 2})">
            <rect width="${boxW}" height="${boxH}" />
            <text x="${boxW / 2}" y="${boxH / 2}">${DPCanvas.escapeHtml(label)}</text>
          </g>`;
      })
      .join('');

    containerEl.innerHTML = `<div class="dp-tree-wrap"><svg class="dp-tree-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${edgesSvg}${nodesSvg}</svg></div>`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DPCanvas };
} else {
  window.DPCanvas = DPCanvas;
}
