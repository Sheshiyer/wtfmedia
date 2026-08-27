/**
 * SourcePanel — collapsible source citations for chat responses.
 *
 * UI-SPEC §chat: sources shown as expandable list with episode links.
 * Public projection: only PUBLIC_CHAT_SOURCE_FIELDS exposed.
 */

interface Source {
  episodeId?: string;
  title?: string;
  url?: string;
  chunk?: string;
  score?: number;
  [key: string]: unknown;
}

interface SourcePanelProps {
  sources: Source[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <details className="text-xs text-text-ink/40" data-testid="source-panel">
      <summary className="cursor-pointer hover:text-text-ink/61 transition-colors">
        {sources.length} source{sources.length !== 1 ? "s" : ""}
      </summary>
      <ul className="mt-1 space-y-1 pl-4">
        {sources.map((src, j) => (
          <li key={j}>
            {src.url ? (
              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-text-ink/30 hover:decoration-text-ink/60 transition-colors"
              >
                {src.title || src.episodeId || src.url}
              </a>
            ) : (
              <span>{src.title || src.episodeId || "Unknown"}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
