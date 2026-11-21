/** Narration formatting shared by the server-rendered first step and the browser player. */

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Escapes everything, then allows only `**bold**` and `` `code` ``. Paragraphs split on blank lines. */
export function renderNarration(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => {
      const html = escapeHtml(para.trim())
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      return `<p>${html}</p>`;
    })
    .join('');
}
