import { loadTitleMap } from "./load-title-map";
import type { TitleMapRow } from "./excel-title-map";
import { isPublicUncutActivated } from "./public-uncut-activation";

export type PublicEpisodeUncutState =
  | {
      kind: "active";
      label: "uncut indexed";
      detail: string;
      row: TitleMapRow | null;
    }
  | {
      kind: "candidate";
      label: "uncut candidate";
      detail: string;
      row: TitleMapRow;
    }
  | {
      kind: "absent";
      label: "uncut not tracked";
      detail: string;
      row: TitleMapRow | null;
    }
  | {
      kind: "excluded";
      label: "uncut excluded";
      detail: string;
      row: TitleMapRow;
    };

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findTitleRow(publicTitle: string): TitleMapRow | null {
  const table = loadTitleMap();
  if (!table) return null;

  const normalizedPublicTitle = normalizeTitle(publicTitle);
  const exact = table.rows.find((row) => normalizeTitle(row.title) === normalizedPublicTitle);
  if (exact) return exact;

  const contained = table.rows
    .filter((row) => {
      const normalizedRowTitle = normalizeTitle(row.title);
      return (
        normalizedRowTitle.length >= 5 &&
        normalizedPublicTitle.includes(normalizedRowTitle)
      );
    })
    .sort((a, b) => b.title.length - a.title.length);

  return contained[0] ?? null;
}

export function resolvePublicEpisodeUncutState(
  publicTitle: string,
  videoId?: string,
): PublicEpisodeUncutState {
  const row = findTitleRow(publicTitle);
  if (videoId && isPublicUncutActivated(videoId)) {
    return {
      kind: "active",
      label: "uncut indexed",
      detail:
        "approved uncut transcript evidence is available to episode-scoped Ask WTF. playback and timeline alignment remain held.",
      row,
    };
  }

  if (!row) {
    return {
      kind: "absent",
      label: "uncut not tracked",
      detail: "no privacy-safe title-map row was found for this public episode.",
      row: null,
    };
  }

  if (row.status === "quarantined" || row.status === "missing-source") {
    return {
      kind: "excluded",
      label: "uncut excluded",
      detail:
        "this title-map row is excluded from activation until source alignment is reviewed.",
      row,
    };
  }

  if (row.uncutPointer === "candidate") {
    return {
      kind: "candidate",
      label: "uncut candidate",
      detail:
        "a clean-cut pointer is tracked in the title map, but uncut activation is still not activated.",
      row,
    };
  }

  return {
    kind: "absent",
    label: "uncut not tracked",
    detail: "the title map is mapped, but no clean-cut pointer is tracked for this episode.",
    row,
  };
}
