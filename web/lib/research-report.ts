import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Nodes } from "mdast";
import type { ResearchSource } from "./research";
import { parseResearchVisual, type ResearchVisual } from "./research-visuals";

const parser = unified().use(remarkParse).use(remarkGfm, { singleTilde: false });
export function parseResearchMarkdown(content: string) { return parser.parse(content); }

type ResearchPart = { kind: "markdown"; content: string } | { kind: "visual"; visual: ResearchVisual | null };

/** Split generated top-level figure fences before touching prose citations. */
export function splitResearchVisuals(content: string, sources: ResearchSource[]): ResearchPart[] {
  const parts: ResearchPart[] = [];
  let cursor = 0;
  for (const node of parseResearchMarkdown(content).children) {
    if (node.type !== "code" || node.lang !== "research-visual") continue;
    const start = node.position!.start.offset!;
    const end = node.position!.end.offset!;
    if (start > cursor) parts.push({ kind: "markdown", content: content.slice(cursor, start) });
    parts.push({ kind: "visual", visual: parseResearchVisual(node.value, sources) });
    cursor = end;
  }
  if (cursor < content.length) parts.push({ kind: "markdown", content: content.slice(cursor) });
  return parts;
}

/** Portable Markdown gets a readable text alternative, not raw figure JSON. */
export function researchVisualText(content: string, sources: ResearchSource[]): string {
  const plain = (value: string) => value.replace(/[\\`*_{}\[\]()<>#!|~]/gu, "\\$&");
  return splitResearchVisuals(content, sources).map(part => {
    if (part.kind === "markdown") return part.content;
    if (!part.visual) return "\n\nDiagram unavailable: supporting evidence could not be validated.\n\n";
    const figure = part.visual;
    return `\n\n### ${plain(figure.title)}\n\nEditorial ${figure.kind === "flow" ? "process diagram (text alternative; steps in order)" : "comparison (text alternative)"}.\n\n${plain(figure.explanation)}\n\n${figure.items.map((item, index) => `${index + 1}. **${plain(item.label)}** — ${plain(item.detail)}\n\n   Supporting extract: “${plain(item.quote)}” [${item.sourceId}]`).join("\n\n")}\n\n`;
  }).join("");
}

export function researchDisplayContent(content: string): string {
  if (!/^Unverified(?: synthesis)?:/mu.test(content)) return content;
  const code: Array<[number, number]> = [];
  function visit(node: Nodes) {
    if (node.type === "code" || node.type === "inlineCode") code.push([node.position!.start.offset!, node.position!.end.offset!]);
    else if ("children" in node) node.children.forEach(visit);
  }
  visit(parseResearchMarkdown(content));
  return content.replace(/^((?:Unverified synthesis:[ \t]*)?Unverified:|Unverified synthesis:)[ \t]*/gmu,
    (match, label: string, offset: number) => code.some(([start, end]) => offset >= start && offset < end) ? match
      : label.endsWith("Unverified:") ? "Not independently confirmed: " : "Review against sources: ");
}

/** Edit only prose/citation AST ranges, leaving raw Markdown, escapes and code intact. */
export function prepareResearchSection(content: string, sources: ResearchSource[]): { markdown: string; citedSources: ResearchSource[] } {
  const known = new Map(sources.map(source => [source.id, source]));
  const cited = new Map<string, ResearchSource>();
  const eligible = new Uint8Array(content.length);
  const links = new Map<number, { end: number; suffix: string; ids: string[] }>();
  function visit(node: Nodes) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    if (node.type === "code" && node.lang === "research-visual") {
      const visual = parseResearchVisual(node.value, sources);
      for (const item of visual?.items ?? []) cited.set(item.sourceId, known.get(item.sourceId)!);
    } else if (node.type === "text") {
      eligible.fill(1, start, end);
      const raw = content.slice(start, end);
      for (const match of raw.matchAll(/\\\[[^\n]*?\\?\]|\\./gu)) {
        eligible.fill(0, start + match.index, start + match.index + match[0].length);
      }
    } else if (node.type === "link" || node.type === "linkReference") {
      const label = node.children.length === 1 && node.children[0].type === "text" ? node.children[0].value : "";
      const ids = label.split(/[ \t]*[,;][ \t]*/u);
      if (ids.every(id => /^[A-Za-z0-9_-]+$/u.test(id)) && content.slice(start, start + label.length + 2) === `[${label}]`) {
        const suffix = node.type === "linkReference" && node.referenceType !== "full"
          ? `[${label}]` : content.slice(start + label.length + 2, end);
        links.set(start, { end, suffix, ids });
        eligible.fill(1, start, end);
      }
    } else if ("children" in node) node.children.forEach(visit);
  }
  visit(parseResearchMarkdown(content));
  type Citation = { end: number; remaining: string; ids: string[] };
  function item(start: number, depth = 0): Citation | null {
    if (!eligible[start] || depth > 16) return null;
    const link = links.get(start);
    if (link) {
      const ids = link.ids.filter(id => known.has(id));
      const unknown = link.ids.filter(id => !known.has(id));
      return { end: link.end, ids, remaining: !ids.length ? content.slice(start, link.end) : unknown.length
        ? `[${unknown.join(", ")}]${link.suffix}` : "" };
    }
    if (content[start] === "[") {
      let cursor = start + 1;
      const parts: Citation[] = [];
      while (cursor < content.length) {
        while (/[ \t]/u.test(content[cursor] ?? "")) cursor++;
        const part = item(cursor, depth + 1);
        if (!part) return null;
        parts.push(part);
        cursor = part.end;
        while (/[ \t]/u.test(content[cursor] ?? "")) cursor++;
        if (!eligible[cursor]) return null;
        if (content[cursor] === "]") {
          const ids = parts.flatMap(part => part.ids);
          const remaining = parts.map(part => part.remaining).filter(Boolean);
          return { end: cursor + 1, ids, remaining: !ids.length ? content.slice(start, cursor + 1) : remaining.length ? `[${remaining.join(", ")}]` : "" };
        }
        if (!/[,;]/u.test(content[cursor])) return null;
        cursor++;
      }
      return null;
    }
    const id = /^[A-Za-z0-9_-]+/u.exec(content.slice(start))?.[0];
    if (!id || !eligible.slice(start, start + id.length).every(Boolean)) return null;
    return { end: start + id.length, remaining: known.has(id) ? "" : id, ids: known.has(id) ? [id] : [] };
  }
  const edits: Array<{ start: number; end: number; value: string }> = [];
  for (let cursor = 0; cursor < content.length;) {
    const bracket = content[cursor] === "[";
    const bare = /^(?:src_|alpha_)/u.test(content.slice(cursor)) && !/[\w-]/u.test(content[cursor - 1] ?? "");
    const citation = bracket || bare ? item(cursor) : null;
    if (citation?.ids.length) {
      for (const id of citation.ids) cited.set(id, known.get(id)!);
      const previous = edits.at(-1);
      if (previous && !previous.value && !citation.remaining && /^[ \t]*[,;]?[ \t]*$/u.test(content.slice(previous.end, cursor))) previous.end = citation.end;
      else edits.push({ start: cursor, end: citation.end, value: citation.remaining });
      cursor = citation.end;
    } else cursor = citation?.end ?? cursor + 1;
  }
  let markdown = content;
  for (const edit of edits.reverse()) {
    let start = edit.start;
    let end = edit.end;
    if (!edit.value) {
      // Only tidy whitespace adjacent to a removed citation, never unrelated prose/code.
      while (content[start - 1] === " " && (end === content.length || /[ \t\n.,;:!?]/u.test(content[end]))) start--;
      if (start === 0 || content[start - 1] === "\n") while (content[end] === " " || content[end] === "\t") end++;
    }
    markdown = markdown.slice(0, start) + edit.value + markdown.slice(end);
  }
  return { markdown: researchDisplayContent(markdown), citedSources: [...cited.values()] };
}
