/**
 * Minimal inline markdown for Omar's replies.
 *
 * Omar writes **bold**; the chat used to render it raw, so visitors saw the
 * literal asterisks (JA, 2026-07-26). This parses a deliberately tiny subset
 * into plain data that ChatMessages renders as React elements.
 *
 * It returns DATA, never HTML, and there is no dangerouslySetInnerHTML on the
 * render side: model output is untrusted, so anything unrecognised (including
 * embedded HTML) must end up as literal text.
 */

export type MarkdownNode = {
  type: "text" | "bold" | "italic" | "link" | "break";
  value: string;
  href?: string;
};

// Order matters: bold before italic so ** wins over *.
const PATTERN = /(\*\*(?=\S)(.+?)(?<=\S)\*\*)|(\*(?=\S)([^*\n]+?)(?<=\S)\*)|(https?:\/\/[^\s<]+)|(\n)/;

export function parseInline(text: string): MarkdownNode[] {
  if (!text) return [];
  const nodes: MarkdownNode[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = PATTERN.exec(rest);
    if (!match || match.index === undefined) {
      nodes.push({ type: "text", value: rest });
      break;
    }
    if (match.index > 0) {
      nodes.push({ type: "text", value: rest.slice(0, match.index) });
    }
    const [full, , boldInner, , italicInner, url, newline] = match;
    if (boldInner !== undefined) {
      nodes.push({ type: "bold", value: boldInner });
    } else if (italicInner !== undefined) {
      nodes.push({ type: "italic", value: italicInner });
    } else if (url !== undefined) {
      nodes.push({ type: "link", value: url, href: url });
    } else if (newline !== undefined) {
      nodes.push({ type: "break", value: "" });
    }
    rest = rest.slice(match.index + full.length);
  }

  return nodes;
}
