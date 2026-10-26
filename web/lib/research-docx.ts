import type { Definition, Nodes } from "mdast";
import type { INumberingOptions, IParagraphOptions, IRunOptions, ParagraphChild } from "docx";
import { RESEARCH_CHANNELS, RESEARCH_CHANNEL_LABELS, RESEARCH_EVIDENCE_LABELS, RESEARCH_SECTIONS, researchSourceLabel, researchSourcePlatform, safeResearchUrl, type ResearchBrief, type ResearchChannel, type ResearchCoverage, type ResearchSource } from "./research";
import { parseResearchMarkdown, prepareResearchSection } from "./research-report";
import { parseResearchVisual, researchVisualPng, type ResearchVisual } from "./research-visuals";

/** Builds only the authorized report snapshot; the writer loads on download. */
export async function buildResearchDocx(brief: ResearchBrief): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, ExternalHyperlink, InternalHyperlink, Bookmark, ImageRun, Table, TableRow, TableCell, HeadingLevel, LevelFormat, WidthType, TableLayoutType } = await import("docx");
  const paragraph = (text: string, options: IParagraphOptions = {}) => new Paragraph({ children: text.split(/\r?\n/u).map((line, index) => new TextRun({ text: line, ...(index ? { break: 1 } : {}) })), ...options });
  const heading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) => paragraph(text, { heading: level });
  const numbering: INumberingOptions["config"][number][] = [];
  const sourceIndex = new Map(brief.sources.map((source, index) => [source.id, index]));
  const icon = (platform: ResearchChannel) => new ImageRun({ type: "png", data: Uint8Array.from(atob(PLATFORM_ICONS[platform]), character => character.charCodeAt(0)), transformation: { width: 16, height: 16 }, altText: { title: RESEARCH_CHANNEL_LABELS[platform], description: RESEARCH_CHANNEL_LABELS[platform], name: platform } });
  const link = (text: string, url: string): ParagraphChild => {
    const safe = safeResearchUrl(url);
    return safe ? new ExternalHyperlink({ link: safe, children: [new TextRun({ text, style: "Hyperlink" })] }) : new TextRun(text);
  };
  function sourceReference(source: ResearchSource) {
    const platform = researchSourcePlatform(source);
    return new Paragraph({ children: [icon(platform), new TextRun(` ${RESEARCH_CHANNEL_LABELS[platform]} · `),
      new InternalHyperlink({ anchor: `source_${sourceIndex.get(source.id)}`, children: [new TextRun({ text: `${researchSourceLabel(source)} — ${source.title}`, style: "Hyperlink" })] })] });
  }
  const figures = new Map<string, { visual: ResearchVisual; image: Awaited<ReturnType<typeof researchVisualPng>> }>();
  const rawFigures = new Set<string>();
  function collectFigures(node: Nodes) {
    if (node.type === "code" && node.lang === "research-visual") rawFigures.add(node.value);
    if ("children" in node) node.children.forEach(collectFigures);
  }
  for (const section of brief.sections) if (section.status !== "skipped") collectFigures(parseResearchMarkdown(section.content));
  for (const raw of rawFigures) {
    const visual = parseResearchVisual(raw, brief.sources);
    if (visual) figures.set(raw, { visual, image: await researchVisualPng(visual) });
  }
  function markdownBlocks(markdown: string) {
    const root = parseResearchMarkdown(markdown);
    const definitions = new Map<string, Definition>();
    function collect(node: Nodes) {
      if (node.type === "definition") definitions.set(node.identifier, node);
      if ("children" in node) node.children.forEach(collect);
    }
    collect(root);
    function inline(node: Nodes, style: IRunOptions = {}): ParagraphChild[] {
      switch (node.type) {
        case "text": return [new TextRun({ ...style, text: node.value.replace(/\n/gu, " ") })];
        case "inlineCode": return [new TextRun({ ...style, text: node.value, font: "Consolas" })];
        case "break": return [new TextRun({ break: 1 })];
        case "image": case "imageReference": return [new TextRun({ ...style, text: node.alt ?? "" })];
        case "html": return [new TextRun({ ...style, text: node.value })];
        case "footnoteReference": return [new TextRun({ ...style, text: `[${node.identifier}]`, superScript: true })];
        case "link": case "linkReference": {
          const url = node.type === "link" ? node.url : definitions.get(node.identifier)?.url;
          const safe = url ? safeResearchUrl(url) : null;
          const children = node.children.flatMap(child => inline(child, { ...style, ...(safe ? { style: "Hyperlink" } : {}) }));
          return safe ? [new ExternalHyperlink({ link: safe, children })] : children;
        }
        default: {
          const next = { ...style, ...(node.type === "strong" ? { bold: true } : node.type === "emphasis" ? { italics: true } : node.type === "delete" ? { strike: true } : {}) };
          return "children" in node ? node.children.flatMap(child => inline(child, next)) : [];
        }
      }
    }
    function blocks(nodes: Nodes[], depth = 0): Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> {
      return nodes.flatMap(node => {
        switch (node.type) {
          case "paragraph": return [new Paragraph({ children: inline(node) })];
          case "heading": return [new Paragraph({ heading: [HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6, HeadingLevel.HEADING_6][node.depth - 1], children: inline(node) })];
          case "code": {
            if (node.lang === "research-visual") {
              const figure = figures.get(node.value);
              if (!figure) return [paragraph("Diagram unavailable: supporting evidence could not be validated.")];
              const { visual, image } = figure;
              return [new Paragraph({ keepNext: true, children: [new ImageRun({ type: "png", data: image.data,
                transformation: { width: image.width, height: image.height },
                altText: { title: visual.title, description: visual.explanation, name: "Research diagram" },
              })] }), paragraph(visual.title, { keepNext: true }), paragraph(visual.explanation),
                paragraph("Editorial schematic from the cited sources. Review the interpretation against the supporting extracts."),
                ...visual.items.flatMap((item, index) => [paragraph(`Evidence ${index + 1}: ${item.label} — ${item.detail}`),
                  paragraph(`Supporting extract: “${item.quote}”`), sourceReference(brief.sources.find(source => source.id === item.sourceId)!)]),
              ];
            }
            return node.value.split("\n").map(line => new Paragraph({ children: [new TextRun({ text: line, font: "Consolas", size: 20 })], spacing: { after: 0 } }));
          }
          case "blockquote": return blocks(node.children, depth);
          case "list": {
            const level = Math.min(depth, 8);
            const reference = `list_${numbering.length}`;
            numbering.push({ reference, levels: Array.from({ length: 9 }, (_, index) => ({ level: index,
              format: node.ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET, text: node.ordered ? `%${index + 1}.` : "•", start: node.start ?? 1,
              style: { paragraph: { indent: { left: 360 * (index + 1), hanging: 240 } } } })) });
            return node.children.flatMap(item => item.children.flatMap((child, index) => {
              if (child.type === "paragraph") return [new Paragraph({ children: [
                ...(index === 0 && typeof item.checked === "boolean" ? [new TextRun(item.checked ? "☑ " : "☐ ")] : []), ...inline(child),
              ], ...(index === 0 ? { numbering: { reference, level } } : { indent: { left: 360 * (level + 1) } }) })];
              return blocks([child], depth + 1);
            }));
          }
          case "table": return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
            rows: node.children.map((row, index) => new TableRow({ tableHeader: index === 0, children: row.children.map((cell, column) => new TableCell({
              width: { size: 100 / row.children.length, type: WidthType.PERCENTAGE },
              ...(index === 0 ? { shading: { fill: "F1F5F9" } } : {}),
              children: [new Paragraph({ alignment: node.align?.[column] ?? "left", children: cell.children.flatMap(child => inline(child, { bold: index === 0 })) })],
            })) })),
          })];
          case "thematicBreak": return [paragraph("—")];
          case "html": return [paragraph(node.value)];
          case "footnoteDefinition": return [paragraph(`[${node.identifier}]`), ...blocks(node.children, depth)];
          default: return [];
        }
      });
    }
    return blocks(root.children);
  }
  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [
    heading(brief.title, HeadingLevel.TITLE), paragraph(`Status: ${brief.status}`),
    ...(brief.status !== "completed" ? [paragraph("Report incomplete — findings and source coverage may be partial.")] : []),
    ...(brief.needsResearch ? [paragraph("Previous report no longer matches the edited inputs. The findings and sources below are retained from the previous scope.")] : []),
    paragraph("Audience context: India · Worldwide research"), heading("Source coverage", HeadingLevel.HEADING_1),
  ];
  const coverageLabels: Record<ResearchCoverage["status"], string> = { pending: "Pending", searching: "Searching", found: "Found", no_results: "No results", unavailable: "Unavailable", failed: "Search failed", budget_limited: "Budget limited" };
  for (const channel of RESEARCH_CHANNELS) {
    const receipt = brief.coverage?.find(item => item.channel === channel);
    const status = receipt ? receipt.status === "found" && !receipt.sourceCount ? "Results found; none retained" : coverageLabels[receipt.status] : "Not recorded";
    children.push(new Paragraph({ children: [icon(channel), new TextRun(` ${RESEARCH_CHANNEL_LABELS[channel]} · ${status}${receipt ? ` · ${receipt.sourceCount} retained ${receipt.sourceCount === 1 ? "source" : "sources"} · ${receipt.method === "web_search" ? "Web search" : "Dedicated tool"}` : ""}`)] }));
  }
  for (const { key, title } of RESEARCH_SECTIONS) {
    const section = brief.sections.find(item => item.key === key);
    if (!section || section.status === "skipped" || !section.content.trim()) continue;
    const prepared = prepareResearchSection(section.content, brief.sources);
    children.push(heading(title, HeadingLevel.HEADING_1), paragraph(`Status: ${section.status}`), ...markdownBlocks(prepared.markdown));
    if (section.status !== "completed") children.push(paragraph("This section is incomplete."));
    if (prepared.citedSources.length) children.push(heading("Section sources", HeadingLevel.HEADING_2), ...prepared.citedSources.map(sourceReference));
  }
  if (brief.sources.length) children.push(heading("Sources", HeadingLevel.HEADING_1));
  for (const [index, source] of brief.sources.entries()) {
    const platform = researchSourcePlatform(source);
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new Bookmark({ id: `source_${index}`, children: [new TextRun(source.title)] })] }),
      new Paragraph({ children: [icon(platform), new TextRun(` ${RESEARCH_CHANNEL_LABELS[platform]} · ${researchSourceLabel(source)}`)] }),
      new Paragraph({ children: [link(safeResearchUrl(source.url) ?? "Link unavailable", source.url)] }),
      paragraph(source.excerpt || (source.kind === "alpha_reference" ? "Episode reference, transcript excerpt unavailable." : "Supporting excerpt unavailable.")),
      paragraph(`${source.publisher ? `${source.publisher} · ` : ""}${source.publishedAt ? `Published ${source.publishedAt} · ` : ""}Retrieved ${source.retrievedAt}`),
      paragraph(`${source.evidenceType ? RESEARCH_EVIDENCE_LABELS[source.evidenceType] : "Evidence type not recorded"}${source.retrievedVia ? ` · Retrieved via ${source.retrievedVia}` : ""}`));
    if (typeof source.timestampSeconds === "number" && Number.isFinite(source.timestampSeconds) && source.timestampSeconds >= 0) children.push(paragraph(`Source timestamp: ${Math.floor(source.timestampSeconds / 60)}:${String(Math.floor(source.timestampSeconds % 60)).padStart(2, "0")}`));
  }
  return Packer.toBlob(new Document({ title: brief.title, creator: "WTF OS", numbering: { config: numbering },
    styles: { default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { after: 160 } } } } },
    sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children }],
  }));
}

// Embedded PNG versions of ResearchSourceBadge's local marks keep Word export offline.
const PLATFORM_ICONS: Record<ResearchChannel, string> = {
  "web": "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEvUlEQVR4nO1ZW4hcRRCdoBj8NvEBQsje7ruT+OkDlOBKfKD4QNSN+AjZWzUZ8mHwT4ggiqgxKxFjsn6KiAbjAxX9EozG+KOC+B0ISjb7mKq7yipmNzHZkbo7j+6eOzN957FZZQoahttd1XWqq6qra3K5AQ1oQD2i8pqgMHedhtKYHqNDCuOfNPJvMuR3CHRQ5lQUb86tJtIY36SRJjTwrEYue41kLU0I70VTPCzwVgX8nbfSTYZCPhYg37Ziig/tmrlSIx/xszTNa5ThAQT4sIqm1/dVeRXRiAKeTlF0USOfN74taKB7a3zI9yff6vOyVnic06DTYVTa0hflg4i2KaSzzqZnNNBejfRh/RstKeAnGsAjP+lY/AMNtM8BJvGxqJBGe668BrrgWP0bHc0OSVax5oA/aiZHIX1qAD0fFjmviqVA4sCRfaFnIDTQra7lFdJ4brR8ybJSvL9uVfpnGHi4qSyMN4nihpzX5PvI8+VLTTnVk+janSRgFdKUkzWeqc7Lxhp5xrDcZ+1kKuQvDQBTVUNUAO5xTmIyLE6t6xhA4qeu5S1l4jttvy493E5miPSoyRMWeKs5r4Ffd0C835HyIfDtrs+b1loGSK8YQfmX2n1ibTu5146eulwD/224yovmfMWdjltJIaKRzACcS+qMBGzKmu8NgF/5ytZIRw3Z37rzAZaUlZ3EeNnLA8v6exuU331irQSa4V7P+cvnF8w7Y/No+bIG+Ujjpg7DwDf4AwB6y9xAgjkF5Cbb/+O7fOUHWLrbUW7YXbMRZ6+yDAR00FN8eY1TmB1JW6UKdJ8djDMbMwBQFm9E96St08gfWxnLS7iUxHbmSb1QFNDThnXOuQHeipJABTpX3yd+KhVAgR6zgBY531Z4Us8bTGnu4/qoQj7pq3ydn381Ms2raWs27ChdbeoSAG/3ACC1TY1pxjNOfu4AwC/GCR5qug8yGan6pfaCgd4xcvTvGviL9EGThuC55uvSR8KDlX0immyxzx+GPm+3BWAGzqob0LxQ/P8AUP91F1JGfbMaglgBc6Yg1hjvWC1pNF+kazKn0eSFZTJFtM3nIpPLqdcXmUJ+PPNFlpQS5iPlIpYSCuiT+inT6VyGcnfC2GBBCquVLuY2yC1sFXN8wBtAuJNvtNMX7Vv5cpqtN3JQ4Ou9AVQE1DsFwIv5AoUpa453/aCBxsfK0Bhp80GjgL7OZSVp91kugnzMDVSF/HJfnpRgvPSQljruTki7zwGx35zXUXyHNV8oPZL1UR84fVGN/IZ9A9O7HSmfAIim10v02wLjPU3bKkifd9VWAXrWUf5Ufvv8FbluSI7PDNbqSVTdyW1stcrVy3eM1dgaNwzhWJ4XApi7uSvlaxsjjbqtRelaSLC5rUXJ3c3kyAm5rcV8gULb55fnNMYP9UR5G0RDR3lB2oPKabcrIHD5pQxwDHA4Ob00mR4Nsi7cqV6FGsqcddvrAfADNT7gB932eoWn7Pp8sLN0S1+UrylTnFqnkd5r3Dxt0LxC+tNj3ZJkm64DNgtJuy9psXsBaan80b79qeFD0jFTyG+6XexWQ1Kz1DZB1vKg3yQFngSrKvABDfGP1b9ZQ+Af5JvMeZbEAxrQgHJ+9C9Hk7hSJ8VgdQAAAABJRU5ErkJggg==",
  "linkedin": "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB6ElEQVR4nO2ZzUoDMRSFZ6Uk0qJrn0pBcOE2sRRbLfoCPoGiC3Fvq+7cKLhMKv5hq4VRCi04oCupFh3Fn6pXEmmt7cxYETqJ5MCBIQnD+SY3mcW1LCPVlNjqRZQnMWX7mPJ7TDmE7HuRBVGeENkCs6Px3UFE2IkCocHLiLJjkdH/yyscHjdBeO7EZ9mEHxB3AkHYRBsAJvwg7GC4Y7M9LwA3/GC8MxPutgOEHYr+zgYA67gDfeMcUpky5B0Xco4LU5mSHNMGYHq1DK0SENoA5BxXhn59e5cWEmPaAOQ9AI7O7/QBSGXaS2gyXdLvEB+d30mL8FodYqyQrW4BRGNZGFqwYX77AtYPr6Tnti/kWDSWVRtgdOkUnMoj+MmpPMo1XQXYLFw3AojnoPlONbvhqA9QfagBK1alxXOrxpbP1AR4rr3LP3h//KvexfPMWlnO1XV58wQD8R31AJIr/v+JyXTp29rhRVstgIr7ApGAmyYSy8o1dYmbSikAUe8/vY8Vq4314opVCsBr/q/rsQEomB0AU0LUHOJPmVuIhnCNqmLLAFCzA2BKqFn6H2KiT4MDEXb7/1pMiPKE1k0+Sza42bEWbdYRu8e/0a0wBApsdNc1YveILRJ1psTBJtzFhO/KsvH78kZWePoAXiPGKtBR2sAAAAAASUVORK5CYII=",
  "youtube": "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABb0lEQVR4nO2YTW7CMBCFn6joDdhwqaKW0BtwllJ6i1atxJbDlJafA7BAqsL+IUuRiJATp3TsTNR50tva75uxnWgAk8lkMpkqROCWwCOBdwIrAkcCjOxjsZfbc+Iy4BoReCCwTRCYAW8I3P8m+A2BFwXBeeE5gV4TAI3hWXjW5NhQuUd1F3ajICAD3nkvdvHasCPOfAAfCoKxod98AN8iiy+X5HAYG2DlA8hFFnc6HMjpNCZA7gOQWbysiN1AEoCI3UAygEjdQHIA4W6gFQDBbqBVAIFuoHWA/Z7Mso4CLBbkYNDBI/THqrNVAIGqsxUAwaozOYBw1RkAkPuZi1R1nv3jA/gSWTxi1Xn2pw/AzWHYEb/6ACYKgrGhxz6APoG1gnAMeFs5rXMTMAUBGfCdN3wJYq4gJCv8VBu+AOgReFYQlheeNRotlkBGSu7EOnhsaiDcxc7cHMa9vWIfu3rnxV5uz7HLcFV4k8lkMv0LnQBt/CbPCBH5RwAAAABJRU5ErkJggg==",
  "instagram": "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",
  "reddit": "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFOklEQVR4nMVaXWxURRQ+JlrkwUQhKSLG+CBIYnjRB02MaWzntoiGWLUtFB4qkhLFFhAMPvgXrcGk1EqgtgZMQeODjQ/+YLEE/Hnhp9hCokixEEUEJaXQulvYbnE/8+1s6b27e3/3bnuSk2xmzpn5zsycM2fOXZEQCEVyO5RUQ8kWKOmCkn4ouQRD4knmb93WlZJZSh2ZSkKJzIQh9TDkCAxBQO5GidRxrMkDvlDuhCHvQ8lIDsCtrCQKQ5pRLHPyB/wBuQlK1sCQSGjAjQxDuChvYqFMCxd8mdwLJcfyBtzIMOQoSmReOOBL5Om8rrph4iemA03PAd98CHTuiOP7z1oATA8O3pAaGDIWCri1DwOD54EfO4DmWmDlfdb+2gXAnyeQQcODfwNYEAT8qlBXd++uTHCDKYO2rgbOnYItDV284GsnksdGybXQwJffBsSuICf6oWObN/Clcg+UDIe6+i31yJk6t8dRKvOdwVdIQV6ize8/TwA58yuw5A7g7QrtrOdPezNgdxvH6mU4tzdAySuhg6fzmom7kS6zfaO7AYxOlFWyITv4YpmTuhGRN+elHzw1I1Nm0TTgj1/swTM6McRq+QjKZHamAUwPwgZffisQG5kAsnenvWytTRhlG/vMskqa0qPOzFBzm3H+YI0VDI+Tl4tsd5vmzSvMK282IGpJAFNZJfLuvKU3hDn+arMBuaTEwZ3XyIGVHNbgy2Q2DEmEbsCGR4HffppwXl5m4c6RQLHMYuisznmw5XcD7y4HPm8Cjn0HnO0DLv0DjF4F4qNAdEi3Hd2vZShLHSPHeUuligZsCaTMcNj2EtB3GIEokQBOHNJjZAut3riZBnT5Ulp8C/DxG3pVw6LoELDrdT22Pz/opAOf9qzw/P2ZWeNYXLNfyqZ34QxQ/5AfA/q5A4OehN9ZAsRjE5NFLgObqoHHCjRvWqbb3MhNLx7TeZI3IwZowKir4LpHrOBJBJEuxzY38qI3Ngq8XOxlB2LuBvAm5MMjfQLmL+xneBwPkY/frPvsyI/exXPZb+EsBjgfodZ13oGwLYgBi2z03C+/ATrxKUeh/l7vR4Hx3Y386J084smJncOo3VOQjseJuXo8AgTmJbT60YuNuBnQ6X6RmdPhbBRmGE2nKxFPF9lS5yPUgymjvm63HajkS2yWYzLXutZ5kqtRHTH80sBfWteJWurck7lUOt3tK4yaqbFGv7y+/QhI/OcOnDJ7dmidxhp7OS4KfcTegIPmF1md74uM1NVulVsxX1camImmEwtsX7cCz86z6nS1Z8oypDIddz7/L6Q/KZ0f9A2VmUY0VGWX5cuLQNcXaeZvu9dYQ5V1TKbgbz3jdvatT8rUMWoOlMzt+wSoKHRbrUyunAXs/zQzmat70Iv+5uBlFaa8O1+zJmC8K77cBtTMdZ+cMl+1WO+XyGWg/VVv6bSSf20/T0HJRs8ryDSAEer4Af04GaezJ4Evtuo+XlJk/qaB7Bsn6hw/oCsXdGiv8ypZnxX89a8wLN/5PQ7L7tJAOxqB3n26AsHIxfNM5m+2sY8ylKWO4XMeJT2OpcW8FXfD4Qi/FDmCNzl0eajl9VxZyTUoWewJvGknaqccuJHkBJSs9AU+L5+Ygq68IasCgTftxJPJ0DX54Id9HxtbI5TMDRSdgoPvYTAJBfx1I4rkxuSH7nzuhkp96K6QglDBWwxhLVXJe6F+DFESZc1/Uv8AkkoAX4SSQwGLw9Q5yDI5SmXGpAHPaowhhSy0phLCPVDSl6x2sGSjmb/7kn2U0bKFYUz+P744zNLGJHg8AAAAAElFTkSuQmCC",
  "x": "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADQ0lEQVR4nNVaTc8ZURQ+8fJ2R2xEbCTs+rElYSPCTxDs+BXY+QNt3qZvsLFmTxCt+gmENn6Br2VbsSKnOWImU8zMvTN3mN7krM6dmecZz5yPewBcrw8A8BkAfgDADgDwwbY7Y3kBgPegsd4AQA0AjjYAjSp2AIBXAHi+Bf67DQAio40uSdRtAAo57YtS83aWDWrI6R2cP1j8T+0TEfiptsHn82Emk2GyVCr1CAJzIvBHbYPL5cLZbIYs63g8YiwWMw0qmUxioVBg3f8b9DYRKALHsogskTYK3u/343q9Pt2r2WyyXqe/qV6vyyB7vd6VfNrttuwvl8uGwD89PeFoNJLvU61WxRFwu924XC5PN97v9xgOh7n8LFatVmXw4/H4REgYAbJcLic/YDAYcPu1LJFI4OFwOF273W4xEAjwXM/+oE6nI4MkwLx+tUi3Wq3kQJBOp3l/PfbNwWAQd7vd6WGbzQa9Xi+X/9IcDgcOh0MjujdGgIw+UmnRx83rF6R7NEzA6XTiZDKRf/J4PM7lF6R7NEyALBKJyLlhPp9fxX49vwDdoykCl7nhVuxX8wvSPZomYDQ3CNI9miZgJDcI1D0KIUDW7/c1Y7/SL4VYIkFFG5gHb54AT24QqHsURoAl9rdaLdm/WCxE6B6FElD2DRQWi8XiP34qjUX3DSCSwK2+4bKeJ1KS32zfAFYQIFmQPKRFsuHNHfBIAsr4zpobQqGQPQhQSJTiuzLiUAjVyg39G/67E7hV13S7Xea+IZvNPo6AWl3DkxvW67Vu32AZAa26plKpaOYGZe6o1Wr3J6BX11BfMJ1OmfuGmPHcIEb3t/ZFo1FTfQNYQYC3nm80Gpqxv67IDaVSyXoCvPW8x+Ph6htC/LlBnO7VLJ/PW3amBKwbzfaxFuYG0N0koo+1MDcAl+7pANZoPa+M/XQgnLk4JKaDY63cYZiAVM/Tm6EjcCPgLZw3AA0JdDfS0EFEHyt43vBLc8RkldE4inV05fP5dEdML/cmINA+wnl8f7ABGOQ0wvxWmhW/2gAQchqNh+VFY/tvNgCFjPYVAFyX/5d4Po/v7Synw/nNX4FXLhrf0wScvnDVGfIdjTAQFvpgZc1L6y8vnpPK4+RXBAAAAABJRU5ErkJggg=="
};
