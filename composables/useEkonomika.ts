// Eurostat-only loaders for the economy page (GDP / unemployment / HICP / debt).
import { jsonStatGet, jsonStatCodes } from "./jsonStat";
import type { JsonStat } from "./jsonStat";
import { fetchEurostat } from "./useEurostat";

export interface EconSeries {
  times: string[];
  sk: (number | null)[];
  eu: (number | null)[];
  last: { v: number; year: string } | null;
}

function jsonStatTimes(stat: JsonStat): string[] {
  const idx = stat.dimension.time.category.index;
  return Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
}

function timeSeriesByGeo(
  stat: JsonStat,
  geoCodes: string[],
  fixedExtra: Record<string, string>
): { times: string[]; series: Record<string, (number | null)[]> } {
  const times = jsonStatTimes(stat);
  const series: Record<string, (number | null)[]> = {};
  for (const g of geoCodes) {
    series[g] = times.map((t) =>
      jsonStatGet(stat, { ...fixedExtra, geo: g, time: t })
    );
  }
  return { times, series };
}

function lastDefined(values: (number | null)[], times: string[]) {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) return { v: values[i] as number, year: times[i] };
  }
  return null;
}

async function makeSeries(
  dataset: string,
  fixed: Record<string, string>
): Promise<EconSeries> {
  const stat = await fetchEurostat(dataset, {
    geo: ["SK", "EU27_2020"],
    ...fixed,
  });
  const { times, series } = timeSeriesByGeo(stat, ["SK", "EU27_2020"], fixed);
  return {
    times,
    sk: series.SK,
    eu: series.EU27_2020,
    last: lastDefined(series.SK, times),
  };
}

export function loadGdp() {
  return makeSeries("nama_10_pc", { na_item: "B1GQ", unit: "CP_EUR_HAB" });
}
export function loadUnemployment() {
  return makeSeries("une_rt_a", { age: "Y15-74", sex: "T", unit: "PC_ACT" });
}
export function loadInflation() {
  return makeSeries("prc_hicp_aind", { coicop: "CP00", unit: "RCH_A_AVG" });
}
export function loadDebt() {
  return makeSeries("gov_10dd_edpt1", {
    na_item: "GD",
    unit: "PC_GDP",
    sector: "S13",
  });
}
