import type { JsonStat } from "./jsonStat";
import { memoize } from "./safeAsync";

const EUROSTAT_BASE =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/";

export type EurostatParams = Record<string, string | string[]>;

export function fetchEurostat(
  dataset: string,
  params: EurostatParams = {}
): Promise<JsonStat> {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
    else usp.append(k, v);
  }
  usp.append("format", "JSON");
  usp.append("lang", "EN");
  const url = EUROSTAT_BASE + dataset + "?" + usp.toString();
  return memoize("eurostat:" + url, async () => {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("Eurostat " + dataset + ": HTTP " + r.status);
    return (await r.json()) as JsonStat;
  });
}

export function useEurostat() {
  return { fetchEurostat };
}
