// High-level loaders for /nehnutelnosti pages.
// Sources:
//   • Eurostat: prc_hpi_q (HPI), ilc_lvho02 (tenure), ilc_lvho05a (overcrowding),
//               prc_hicp_aind (HICP), earn_ses_pub1n (avg wage)
//   • ECB SDW: MIR.M.SK.B.A2C.AM.R.A.2250.EUR.N (mortgage rates)
//   • DATAcube: st3004rr (yearly dwellings), st2024qs (building permits)
//   • Static NBS snapshot for €/m² by kraj (see realityStatic.ts)

import { fetchEurostat } from "./useEurostat";
import { fetchEcbSeries, type EcbSeries } from "./useEcb";
import { fetchDatacube } from "./useDatacube";
import {
  jsonStatGet,
  jsonStatCodes,
  fixOtherDims,
  findTimeDim,
  pickTotalCode,
  pickCodeByLabel,
} from "./jsonStat";
import { DISTRICT_NAMES } from "./districts";
import { memoize } from "./safeAsync";

// ---------- HPI quarterly ----------
export interface HpiSeries {
  times: string[]; // "YYYY-Qn"
  sk: (number | null)[];
  eu: (number | null)[];
}
export async function loadHpi(): Promise<HpiSeries> {
  const stat = await fetchEurostat("prc_hpi_q", {
    geo: ["SK", "EU27_2020"],
    purchase: "TOTAL",
    unit: "I15_Q",
  });
  const times = jsonStatCodes(stat, "time");
  const sk = times.map((t) =>
    jsonStatGet(stat, {
      geo: "SK",
      purchase: "TOTAL",
      unit: "I15_Q",
      time: t,
    })
  );
  const eu = times.map((t) =>
    jsonStatGet(stat, {
      geo: "EU27_2020",
      purchase: "TOTAL",
      unit: "I15_Q",
      time: t,
    })
  );
  return { times, sk, eu };
}

// ---------- HPI deflated by HICP (real prices) ----------
// Use annual HICP averages aligned to quarterly HPI by year prefix.
export interface RealHpi {
  times: string[];
  nominal: (number | null)[];
  real: (number | null)[];
}
export async function loadRealHpi(): Promise<RealHpi> {
  const [hpi, hicp] = await Promise.all([
    fetchEurostat("prc_hpi_q", {
      geo: "SK",
      purchase: "TOTAL",
      unit: "I15_Q",
    }),
    // Annual HICP index, base 2015=100
    fetchEurostat("prc_hicp_aind", {
      geo: "SK",
      coicop: "CP00",
      unit: "INX_A_AVG",
    }),
  ]);
  const times = jsonStatCodes(hpi, "time");
  const nominal = times.map((t) =>
    jsonStatGet(hpi, { geo: "SK", purchase: "TOTAL", unit: "I15_Q", time: t })
  );
  const hicpYears = jsonStatCodes(hicp, "time");
  const hicpMap = new Map<string, number | null>();
  for (const y of hicpYears) {
    hicpMap.set(
      y,
      jsonStatGet(hicp, {
        geo: "SK",
        coicop: "CP00",
        unit: "INX_A_AVG",
        time: y,
      })
    );
  }
  const real = times.map((t, i) => {
    const yr = t.slice(0, 4);
    const cpi = hicpMap.get(yr);
    const nom = nominal[i];
    if (cpi == null || cpi === 0 || nom == null) return null;
    // HPI base 2015=100, HICP base 2015=100 → deflated index also rebased to 2015.
    return (nom / cpi) * 100;
  });
  return { times, nominal, real };
}

// ---------- Mortgage rates (ECB MIR — SK new loans for house purchase) ----------
export async function loadMortgageRate(): Promise<EcbSeries> {
  return fetchEcbSeries("MIR", "M.SK.B.A2C.AM.R.A.2250.EUR.N");
}

// ---------- Annual mortgage rate (averaged from monthly) ----------
export interface YearlySeries {
  years: number[];
  values: (number | null)[];
}
export async function loadAnnualMortgageRate(): Promise<YearlySeries> {
  const monthly = await loadMortgageRate();
  const buckets = new Map<number, { sum: number; count: number }>();
  for (let i = 0; i < monthly.times.length; i++) {
    const yr = Number(monthly.times[i].slice(0, 4));
    const v = monthly.values[i];
    if (!Number.isFinite(yr) || v == null) continue;
    const acc = buckets.get(yr) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    buckets.set(yr, acc);
  }
  const years = Array.from(buckets.keys()).sort((a, b) => a - b);
  const values = years.map((y) => {
    const acc = buckets.get(y)!;
    return acc.count > 0 ? acc.sum / acc.count : null;
  });
  return { years, values };
}

// ---------- Overcrowding rate (Eurostat ilc_lvho05a) ----------
// Uses incgrp=TOTAL, hhtyp=TOTAL where available.
export interface CompareSeries {
  years: number[];
  sk: (number | null)[];
  eu: (number | null)[];
}
export async function loadOvercrowding(): Promise<CompareSeries> {
  // ilc_lvho05a dimensions: freq, unit, incgrp, age, sex, geo, time
  const stat = await fetchEurostat("ilc_lvho05a", {
    geo: ["SK", "EU27_2020"],
    incgrp: "TOTAL",
    age: "TOTAL",
    sex: "T",
    unit: "PC",
  });
  const times = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const years: number[] = [];
  const sk: (number | null)[] = [];
  const eu: (number | null)[] = [];
  for (const t of times) {
    years.push(Number(t));
    sk.push(
      jsonStatGet(stat, {
        geo: "SK",
        incgrp: "TOTAL",
        age: "TOTAL",
        sex: "T",
        unit: "PC",
        time: t,
      })
    );
    eu.push(
      jsonStatGet(stat, {
        geo: "EU27_2020",
        incgrp: "TOTAL",
        age: "TOTAL",
        sex: "T",
        unit: "PC",
        time: t,
      })
    );
  }
  return { years, sk, eu };
}

// ---------- Tenure structure (Eurostat ilc_lvho02) — latest year ----------
export interface TenurePayload {
  year: number;
  owner: number | null;
  ownerLoan: number | null;
  tenant: number | null;
  reduced: number | null;
}
export async function loadTenure(): Promise<TenurePayload> {
  // ilc_lvho02 dimensions: freq, incgrp, hhtyp, tenure, unit, geo, time
  // We need tenure breakdown for total population (incgrp=TOTAL, hhtyp=TOTAL).
  const stat = await fetchEurostat("ilc_lvho02", {
    geo: "SK",
    incgrp: "TOTAL",
    hhtyp: "TOTAL",
    unit: "PC",
  });
  const tenureDim = "tenure";
  const times = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  if (times.length === 0) throw new Error("ilc_lvho02: žiadne ročné dáta");
  // Walk back from latest year until we find one with full data
  // (latest 1–2 years are sometimes pre-publication empty).
  function get(year: string, code: string) {
    return jsonStatGet(stat, {
      geo: "SK",
      incgrp: "TOTAL",
      hhtyp: "TOTAL",
      unit: "PC",
      [tenureDim]: code,
      time: year,
    });
  }
  let useYear = times[times.length - 1];
  for (let i = times.length - 1; i >= 0; i--) {
    const y = times[i];
    if (
      get(y, "OWN_NL") != null ||
      get(y, "OWN_L") != null ||
      get(y, "RENT_MKT") != null
    ) {
      useYear = y;
      break;
    }
  }
  return {
    year: Number(useYear),
    owner: get(useYear, "OWN_NL"),
    ownerLoan: get(useYear, "OWN_L"),
    tenant: get(useYear, "RENT_MKT"),
    reduced: get(useYear, "RENT_FR"),
  };
}

// ---------- Annual avg wage (for price-to-income) ----------
// Eurostat earn_ses_pub1n is structured; simpler: use Eurostat earn_nt_net (annual net)
// or DATAcube average gross wage. We'll use Eurostat tps00067 (mean equivalised
// annual net income) which is reliable for price-to-income.
export async function loadAnnualNetIncome(): Promise<YearlySeries> {
  const stat = await fetchEurostat("ilc_di03", {
    geo: "SK",
    age: "TOTAL",
    sex: "T",
    indic_il: "MED_E",
    unit: "EUR",
  });
  const times = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const years: number[] = [];
  const values: (number | null)[] = [];
  for (const t of times) {
    const v = jsonStatGet(stat, {
      geo: "SK",
      age: "TOTAL",
      sex: "T",
      indic_il: "MED_E",
      unit: "EUR",
      time: t,
    });
    years.push(Number(t));
    values.push(v);
  }
  return { years, values };
}

// ---------- Annual nominal HPI (average of quarterly) for price-to-income ----------
export async function loadAnnualHpi(): Promise<YearlySeries> {
  const hpi = await loadHpi();
  const buckets = new Map<number, { sum: number; count: number }>();
  for (let i = 0; i < hpi.times.length; i++) {
    const yr = Number(hpi.times[i].slice(0, 4));
    const v = hpi.sk[i];
    if (!Number.isFinite(yr) || v == null) continue;
    const acc = buckets.get(yr) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    buckets.set(yr, acc);
  }
  const years = Array.from(buckets.keys()).sort((a, b) => a - b);
  const values = years.map((y) => {
    const acc = buckets.get(y)!;
    return acc.count > 0 ? acc.sum / acc.count : null;
  });
  return { years, values };
}

// ---------- DATAcube: yearly construction (st3004rr, SK0 only) ----------
export interface ConstructionPayload {
  years: number[];
  completed: (number | null)[];
  started: (number | null)[];
  inProgress: (number | null)[];
}
export async function loadConstruction(): Promise<ConstructionPayload> {
  const stat = await fetchDatacube(
    "st3004rr/SK0/all/all"
  );
  const timeDim = findTimeDim(stat);
  if (!timeDim) throw new Error("st3004rr: chýba dim. času");
  const ukazDim = stat.id.find((d) => /ukaz/.test(d));
  if (!ukazDim) throw new Error("st3004rr: chýba ukaz dimension");
  const fixed: Record<string, string> = {};
  for (const d of stat.id) {
    if (d === timeDim || d === ukazDim) continue;
    fixed[d] = pickTotalCode(stat, d);
  }
  const times = jsonStatCodes(stat, timeDim)
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  function series(code: string): (number | null)[] {
    return times.map((t) =>
      jsonStatGet(stat, { ...fixed, [ukazDim]: code, [timeDim]: t })
    );
  }
  return {
    years: times.map((t) => Number(t)),
    completed: series("DOKONC_BYT"),
    started: series("ZAC_BYT"),
    inProgress: series("ROZOST_BYT_KON"),
  };
}

// ---------- DATAcube: regional property price INDEX (sp3801qr) ----------
// Quarterly price index per kraj: same period prior year = 100, so values
// like 102.3 mean +2.3 % YoY. Updated quarterly by ŠÚ SR.
// Dataset code: sp3801qr — "Indexy realizačných cien nehnuteľností - regionálne, štvrťročne".
// Dimensions: nuts13 (territory) · sp3801qr_rok (quarter) · sp3801qr_nakneh (price type) · sp3801qr_stv · sp3801qr_mj (unit/base).
//   sp3801qr_nakneh: TOTAL | DW_NEW | DW_EXST   (we use DW_EXST = existing dwellings)
//   sp3801qr_mj:     b_romr (= same period last year = 100)  ← YoY index
//                    b_predch_obd_f (= prior period = 100)
export interface KrajPriceIndexPayload {
  /** Latest quarter with data, e.g. "2025Q4" */
  quarter: string;
  /** YoY % change per NUTS3 kraj for existing dwellings */
  byNuts3: Record<string, number>;
  /** Same but for new dwellings */
  byNuts3New: Record<string, number>;
}
const KRAJ_NUTS3 = ["SK010", "SK021", "SK022", "SK023", "SK031", "SK032", "SK041", "SK042"];

export async function loadKrajPriceIndex(): Promise<KrajPriceIndexPayload> {
  const stat = await fetchDatacube("sp3801qr/all/all/all/all/b_romr");
  // Dimensions: nuts13 · sp3801qr_rok (year) · sp3801qr_nakneh · sp3801qr_stv (quarter "1. Q.") · sp3801qr_mj · sp3801qr_data
  const territoryDim = stat.id.find((d) => /nuts/i.test(d));
  const nakDim = stat.id.find((d) => /nakneh/i.test(d));
  const rokDim = stat.id.find((d) => /_rok$/i.test(d));
  const stvDim = stat.id.find((d) => /_stv$/i.test(d));
  if (!territoryDim || !nakDim || !rokDim || !stvDim)
    throw new Error("sp3801qr: chýbajú dimenzie");

  const fixed: Record<string, string> = {};
  for (const d of stat.id) {
    if ([territoryDim, nakDim, rokDim, stvDim].includes(d)) continue;
    fixed[d] = pickTotalCode(stat, d);
  }

  const years = jsonStatCodes(stat, rokDim)
    .filter((y) => /^\d{4}$/.test(y))
    .sort();
  const quarters = jsonStatCodes(stat, stvDim); // codes like "1. Q.", "2. Q.", ...
  function quarterIdx(c: string): number {
    const m = c.match(/(\d)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  const quartersSorted = [...quarters].sort(
    (a, b) => quarterIdx(a) - quarterIdx(b)
  );
  // Build chronologically descending list of (year, quarter) pairs
  const periods: { year: string; quarter: string; label: string }[] = [];
  for (let yi = years.length - 1; yi >= 0; yi--) {
    for (let qi = quartersSorted.length - 1; qi >= 0; qi--) {
      const q = quartersSorted[qi];
      periods.push({
        year: years[yi],
        quarter: q,
        label: years[yi] + " Q" + quarterIdx(q),
      });
    }
  }

  function valuesAt(yr: string, q: string, nakCode: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of KRAJ_NUTS3) {
      const v = jsonStatGet(stat, {
        ...fixed,
        [territoryDim]: k,
        [nakDim]: nakCode,
        [rokDim]: yr,
        [stvDim]: q,
      });
      if (v != null) out[k] = Number((v - 100).toFixed(1)); // index 100 → YoY %
    }
    return out;
  }

  // Walk back to latest period with data for at least 6/8 kraje (existing dwellings)
  let chosenLabel = periods[0]?.label || "—";
  let exst: Record<string, number> = {};
  let nw: Record<string, number> = {};
  for (const p of periods) {
    const e = valuesAt(p.year, p.quarter, "DW_EXST");
    if (Object.keys(e).length >= 6) {
      chosenLabel = p.label;
      exst = e;
      nw = valuesAt(p.year, p.quarter, "DW_NEW");
      break;
    }
  }

  return {
    quarter: chosenLabel,
    byNuts3: exst,
    byNuts3New: nw,
  };
}

// ---------- DATAcube: completed dwellings per district (st3004rr) ----------
// Maps DATAcube NUTS4 codes (SK0101 = Okres Bratislava I) to drakh GeoJSON
// IDN3 codes (101) by normalized district name.
export interface DistrictConstructionPayload {
  year: number;
  byIdn3: Record<string, number>; // IDN3 → completed dwellings
  names: Record<string, string>; // IDN3 → display name
}
export async function loadDistrictCompletedDwellings(): Promise<DistrictConstructionPayload> {
  // Find latest year first.
  const probe = await fetchDatacube("st3004rr/SK0/all/DOKONC_BYT");
  const timeDim = findTimeDim(probe);
  if (!timeDim) throw new Error("st3004rr: chýba dim. času");
  const years = jsonStatCodes(probe, timeDim).filter((t) => /^\d{4}$/.test(t)).sort();
  const useYear = years[years.length - 1];

  // Now fetch all districts for that year.
  const stat = await fetchDatacube(`st3004rr/all/${useYear}/DOKONC_BYT`);
  const ter = stat.id.find((d) => /nuts/i.test(d));
  if (!ter) throw new Error("st3004rr: chýba územie");
  const labels = stat.dimension[ter].category.label || {};
  const codes = Object.keys(stat.dimension[ter].category.index);

  // Build name → IDN3 lookup from existing names registry.
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/^okres\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  const nameToIdn3: Record<string, string> = {};
  for (const [id, nm] of Object.entries(DISTRICT_NAMES)) {
    nameToIdn3[norm(nm)] = id;
  }

  const byIdn3: Record<string, number> = {};
  const names: Record<string, string> = {};
  for (const tc of codes) {
    if (!/^SK0[A-Z0-9]{3}$/i.test(tc)) continue; // 6-char NUTS4 districts only
    const v = jsonStatGet(stat, { [ter]: tc });
    if (v == null) continue;
    const lbl = labels[tc] || "";
    const idn3 = nameToIdn3[norm(lbl)];
    if (idn3) {
      byIdn3[idn3] = v;
      names[idn3] = DISTRICT_NAMES[idn3] || lbl;
    }
  }
  return { year: Number(useYear), byIdn3, names };
}

// ---------- DATAcube: building permits (st2024qs) ----------
// Dimensions: rok · stv (quarter "1.Q.") · ukaz1 (permit category) · ukaz2 (unit/total)
// No territory dimension — national stats only.
//   ukaz1 = 21stv1000  → "Počet bytov v nových budovách na bývanie"
//   ukaz2 = 21stv1010  → "Spolu" (across building types)
//   stv: "1.Q." | "2.Q." | "3.Q." | "4.Q." | "1.-4.Q." (annual sum) | "3.Q. (p)" / "4.Q. (p)" (preliminary)
export interface PermitsPayload {
  years: number[];
  permits: (number | null)[];
}
export async function loadPermits(): Promise<PermitsPayload> {
  const stat = await fetchDatacube("st2024qs/all/all/21stv1000/21stv1010");
  const rokDim = stat.id.find((d) => /_rok$/.test(d));
  const stvDim = stat.id.find((d) => /_stv$/.test(d));
  if (!rokDim || !stvDim)
    throw new Error("st2024qs: chýbajú dimenzie rok/stv");
  const fixed: Record<string, string> = {};
  for (const d of stat.id) {
    if (d === rokDim || d === stvDim) continue;
    fixed[d] = pickTotalCode(stat, d);
  }
  const years = jsonStatCodes(stat, rokDim)
    .filter((y) => /^\d{4}$/.test(y))
    .sort();
  const QUARTERS = ["1.Q.", "2.Q.", "3.Q.", "4.Q."];
  const yearsOut: number[] = [];
  const permits: (number | null)[] = [];
  for (const y of years) {
    let sum = 0;
    let count = 0;
    for (const q of QUARTERS) {
      const v = jsonStatGet(stat, { ...fixed, [rokDim]: y, [stvDim]: q });
      if (v != null) {
        sum += v;
        count++;
      }
    }
    yearsOut.push(Number(y));
    // Only show fully-finalised years (all 4 quarters published) — partial
    // YTD sums would mislead the bar chart's annual comparison.
    permits.push(count === 4 ? sum : null);
  }
  return { years: yearsOut, permits };
}
