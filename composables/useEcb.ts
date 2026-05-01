// ECB Statistical Data Warehouse — REST API client.
// Returns SDMX-JSON; we flatten to a simple { time[], value[] } shape.
//
// Reference: https://data.ecb.europa.eu/help/api/data
// Example URL: https://data-api.ecb.europa.eu/service/data/<dataflow>/<key>?format=jsondata
//   <dataflow> = e.g. "BSI", "FM", "ICP"
//   <key>      = dot-separated dimension values, e.g. "M.U2.Y.V.M30.X.1.U2.2300.Z01.E"

import { memoize } from "./safeAsync";

const ECB_BASE = "https://data-api.ecb.europa.eu/service/data/";

export interface EcbSeries {
  times: string[];
  values: (number | null)[];
}

interface SdmxObservationDimensionValue {
  id: string;
}
interface SdmxStructure {
  dimensions: {
    observation: { id: string; values: SdmxObservationDimensionValue[] }[];
  };
}
interface SdmxSeriesEntry {
  observations: Record<string, [number | null, ...unknown[]]>;
}
interface SdmxResponse {
  dataSets: { series: Record<string, SdmxSeriesEntry> }[];
  structure: SdmxStructure;
}

/**
 * Fetch a single series from ECB SDW.
 * @param dataflow e.g. "BSI" (Balance Sheet Items), "FM" (Financial Markets)
 * @param key dot-separated key, e.g. "M.U2.Y.V.M30.X.1.U2.2300.Z01.E"
 * @param lastN optional — only return last N observations
 */
export function fetchEcbSeries(
  dataflow: string,
  key: string,
  lastN?: number
): Promise<EcbSeries> {
  const url =
    ECB_BASE +
    dataflow +
    "/" +
    key +
    "?format=jsondata" +
    (lastN ? "&lastNObservations=" + lastN : "");
  return memoize("ecb:" + url, () => fetchEcbSeriesUncached(dataflow, url));
}

async function fetchEcbSeriesUncached(
  dataflow: string,
  url: string
): Promise<EcbSeries> {
  const r = await fetch(url, { mode: "cors" });
  if (!r.ok) throw new Error("ECB " + dataflow + ": HTTP " + r.status);
  const json = (await r.json()) as SdmxResponse;
  const ds = json.dataSets?.[0];
  if (!ds || !ds.series) throw new Error("ECB " + dataflow + ": empty dataSet");
  const seriesEntries = Object.values(ds.series);
  if (seriesEntries.length === 0)
    throw new Error("ECB " + dataflow + ": no series");
  const series = seriesEntries[0];
  const timeValues =
    json.structure.dimensions.observation[0]?.values || [];
  const times: string[] = [];
  const values: (number | null)[] = [];
  for (let i = 0; i < timeValues.length; i++) {
    const obs = series.observations[String(i)];
    if (!obs) continue;
    const v = obs[0];
    times.push(timeValues[i].id);
    values.push(typeof v === "number" ? v : null);
  }
  return { times, values };
}
