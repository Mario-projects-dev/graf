// High-level loaders for the makroekonomika page.
// Sources: ECB SDW (monetary aggregates, key rates, Euribor) + Eurostat
// (10Y bond yield, HICP for SK, GDP for euro area velocity).
import { fetchEcbSeries, type EcbSeries } from "./useEcb";
import { fetchEurostat } from "./useEurostat";
import { jsonStatGet, jsonStatCodes } from "./jsonStat";

// ---------- Monetary aggregates (euro area) ----------
// BSI dataflow, "Y" = stocks, EUR millions, end-of-period.
// M1: M10, M2: M20, M3: M30
const BSI_KEY = (m: "M10" | "M20" | "M30") =>
  "M.U2.Y.V." + m + ".X.1.U2.2300.Z01.E";

export interface AggregatePayload {
  times: string[];
  m1: (number | null)[];
  m2: (number | null)[];
  m3: (number | null)[];
}
export async function loadMoneyAggregates(): Promise<AggregatePayload> {
  const [m1, m2, m3] = await Promise.all([
    fetchEcbSeries("BSI", BSI_KEY("M10")),
    fetchEcbSeries("BSI", BSI_KEY("M20")),
    fetchEcbSeries("BSI", BSI_KEY("M30")),
  ]);
  // Use M3's time axis as the canonical one and align M1/M2 to it.
  const times = m3.times;
  const m1Map = mapByTime(m1);
  const m2Map = mapByTime(m2);
  const m3Map = mapByTime(m3);
  return {
    times,
    m1: times.map((t) => m1Map.get(t) ?? null),
    m2: times.map((t) => m2Map.get(t) ?? null),
    m3: times.map((t) => m3Map.get(t) ?? null),
  };
}

function mapByTime(s: EcbSeries): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (let i = 0; i < s.times.length; i++) m.set(s.times[i], s.values[i]);
  return m;
}

// ---------- Key interest rates ----------
// FM dataflow.
// MRR_FR: Main refinancing operations rate (fixed rate)
// DFR:    Deposit facility rate
// MLFR:   Marginal lending facility rate
const KEY_RATES: { id: "MRR" | "DFR" | "MLFR"; key: string; label: string }[] = [
  { id: "MRR", key: "B.U2.EUR.4F.KR.MRR_FR.LEV", label: "MRO (refinancovacia)" },
  { id: "DFR", key: "B.U2.EUR.4F.KR.DFR.LEV", label: "Depozitná" },
  { id: "MLFR", key: "B.U2.EUR.4F.KR.MLFR.LEV", label: "Marginálna" },
];

export interface KeyRatesPayload {
  times: string[];
  series: Record<"MRR" | "DFR" | "MLFR", (number | null)[]>;
  labels: Record<"MRR" | "DFR" | "MLFR", string>;
}
export async function loadKeyRates(): Promise<KeyRatesPayload> {
  const fetched = await Promise.all(
    KEY_RATES.map((k) => fetchEcbSeries("FM", k.key))
  );
  // Merge timelines (each rate change is a date; we forward-fill to a common axis).
  const allDates = new Set<string>();
  fetched.forEach((s) => s.times.forEach((t) => allDates.add(t)));
  const times = Array.from(allDates).sort();
  const series: KeyRatesPayload["series"] = {
    MRR: forwardFill(times, fetched[0]),
    DFR: forwardFill(times, fetched[1]),
    MLFR: forwardFill(times, fetched[2]),
  };
  const labels: KeyRatesPayload["labels"] = {
    MRR: KEY_RATES[0].label,
    DFR: KEY_RATES[1].label,
    MLFR: KEY_RATES[2].label,
  };
  return { times, series, labels };
}

function forwardFill(
  axis: string[],
  s: EcbSeries
): (number | null)[] {
  const m = mapByTime(s);
  let last: number | null = null;
  return axis.map((t) => {
    if (m.has(t)) {
      const v = m.get(t);
      if (v != null) last = v;
    }
    return last;
  });
}

// ---------- 3M Euribor ----------
export async function loadEuribor3M(): Promise<EcbSeries> {
  return fetchEcbSeries("FM", "M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA");
}

// ---------- 10Y SK government bond yield (Eurostat) ----------
// irt_lt_mcby_a: long-term interest rate, annual avg, % per annum.
export interface AnnualSeries {
  years: number[];
  values: (number | null)[];
}
export async function loadSk10YYield(): Promise<AnnualSeries> {
  const stat = await fetchEurostat("irt_lt_mcby_a", { geo: "SK" });
  const codes = jsonStatCodes(stat, "time").filter((t) => /^\d{4}$/.test(t));
  const years: number[] = [];
  const values: (number | null)[] = [];
  for (const t of codes.sort()) {
    const v = jsonStatGet(stat, { geo: "SK", time: t });
    years.push(Number(t));
    values.push(typeof v === "number" ? v : null);
  }
  return { years, values };
}

// ---------- HICP annual rate of change for SK (for Fisher) ----------
export async function loadSkInflationAnnual(): Promise<AnnualSeries> {
  const stat = await fetchEurostat("prc_hicp_aind", {
    geo: "SK",
    coicop: "CP00",
    unit: "RCH_A_AVG",
  });
  const codes = jsonStatCodes(stat, "time").filter((t) => /^\d{4}$/.test(t));
  const years: number[] = [];
  const values: (number | null)[] = [];
  for (const t of codes.sort()) {
    const v = jsonStatGet(stat, {
      geo: "SK",
      coicop: "CP00",
      unit: "RCH_A_AVG",
      time: t,
    });
    years.push(Number(t));
    values.push(typeof v === "number" ? v : null);
  }
  return { years, values };
}

// ---------- Velocity: V = nominal GDP (EA) / M2 stock (EA) ----------
// Annual frequency; uses Eurostat nama_10_gdp for euro area + ECB M2 averaged
// to annual.
export interface VelocityPayload {
  years: number[];
  velocity: (number | null)[];
  gdp: (number | null)[];
  m2Avg: (number | null)[];
}
export async function loadVelocity(): Promise<VelocityPayload> {
  const [gdpStat, m2Series] = await Promise.all([
    fetchEurostat("nama_10_gdp", {
      geo: "EA20",
      na_item: "B1GQ",
      unit: "CP_MEUR",
    }),
    fetchEcbSeries("BSI", BSI_KEY("M20")),
  ]);
  const codes = jsonStatCodes(gdpStat, "time").filter((t) => /^\d{4}$/.test(t));
  const years: number[] = [];
  const gdp: (number | null)[] = [];
  for (const t of codes.sort()) {
    const v = jsonStatGet(gdpStat, {
      geo: "EA20",
      na_item: "B1GQ",
      unit: "CP_MEUR",
      time: t,
    });
    years.push(Number(t));
    gdp.push(typeof v === "number" ? v : null);
  }
  // Annualize M2: average of monthly observations within each year.
  const yearly: Map<number, { sum: number; count: number }> = new Map();
  for (let i = 0; i < m2Series.times.length; i++) {
    const t = m2Series.times[i];
    const v = m2Series.values[i];
    const yr = Number(t.slice(0, 4));
    if (!Number.isFinite(yr) || v == null) continue;
    const acc = yearly.get(yr) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    yearly.set(yr, acc);
  }
  const m2Avg: (number | null)[] = years.map((y) => {
    const acc = yearly.get(y);
    return acc && acc.count > 0 ? acc.sum / acc.count : null;
  });
  // GDP is in EUR millions, M2 also in EUR millions → ratio is unitless.
  const velocity: (number | null)[] = years.map((_, i) => {
    const g = gdp[i];
    const m = m2Avg[i];
    if (g == null || m == null || m === 0) return null;
    return g / m;
  });
  return { years, velocity, gdp, m2Avg };
}
