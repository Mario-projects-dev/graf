import type { JsonStat } from "./jsonStat";
import { memoize } from "./safeAsync";

const DATACUBE_BASE = "https://data.statistics.sk/api/v2/dataset/";

export function fetchDatacube(path: string): Promise<JsonStat> {
  const url = DATACUBE_BASE + path + "?lang=sk";
  return memoize("datacube:" + url, async () => {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("DATAcube " + path + ": HTTP " + r.status);
    return (await r.json()) as JsonStat;
  });
}

export const DC_PATHS = {
  yearly: "om7017rr/SK0/all/all/all/all/all",
  monthly: "om2801ms/all/all/all",
  districts: "om7013rr/all/all/IN010082/all",
};

export function useDatacube() {
  return { fetchDatacube, DC_PATHS };
}
