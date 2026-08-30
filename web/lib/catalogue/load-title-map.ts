import rawTitleMap from "./title-map.json";
import { parseTitleMapTable, type TitleMapTable } from "./excel-title-map";

export function loadTitleMap(): TitleMapTable | null {
  return parseTitleMapTable(rawTitleMap);
}
