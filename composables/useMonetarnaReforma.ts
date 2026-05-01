// Loaders for the experimental "Monetárna reforma" page.
//
// The data here is real (ECB SDW + Eurostat); the theoretical interpretations
// belong to specific schools (Soddy, Chicago Plan, Austrian school, MMT). The
// composable just delivers the numbers in shapes the charts can plot.

import { jsonStatGet, jsonStatCodes, type JsonStat } from "./jsonStat";
import { fetchEurostat } from "./useEurostat";
import { fetchEcbSeries, type EcbSeries } from "./useEcb";
import {
  distributedLagOls,
  grangerCausality,
  fitVar,
  varIrf,
  varIrfBootstrap,
  wernerCounterfactual,
  wernerHardRule,
  rollingChow,
  type DistributedLagResult,
  type GrangerResult,
  type ChowResult,
  type Mat,
} from "./useWernerEconometrics";

// ---------- Currency in circulation (eurozone, BSI L10) ----------
//   M3 / Currency in circulation = the broad-money multiplier; in the eurozone
//   it sits around 11–12×, meaning every physical ECB-issued euro corresponds
//   to ~11 € of bank-created deposits in M3.
function bsi(component: string): string {
  return "M.U2.Y.V." + component + ".X.1.U2.2300.Z01.E";
}
export async function loadCurrencyInCirculation(): Promise<EcbSeries> {
  return fetchEcbSeries("BSI", bsi("L10"));
}

// ---------- Monetary multiplier M3 / Currency ----------
export interface MultiplierPayload {
  times: string[];
  m3: (number | null)[];
  currency: (number | null)[];
  multiplier: (number | null)[];
}
export async function loadMonetaryMultiplier(): Promise<MultiplierPayload> {
  const [m3, currency] = await Promise.all([
    fetchEcbSeries("BSI", bsi("M30")),
    fetchEcbSeries("BSI", bsi("L10")),
  ]);
  const m3Map = new Map<string, number | null>();
  m3.times.forEach((t, i) => m3Map.set(t, m3.values[i]));
  const cMap = new Map<string, number | null>();
  currency.times.forEach((t, i) => cMap.set(t, currency.values[i]));
  // Use M3's time axis as canonical (M3 is published least often).
  const times = m3.times;
  const m3v: (number | null)[] = [];
  const cv: (number | null)[] = [];
  const mult: (number | null)[] = [];
  for (const t of times) {
    const a = m3Map.get(t) ?? null;
    const b = cMap.get(t) ?? null;
    m3v.push(a);
    cv.push(b);
    mult.push(a != null && b != null && b > 0 ? a / b : null);
  }
  return { times, m3: m3v, currency: cv, multiplier: mult };
}

// ---------- M3 decomposition ----------
//   We split M3 into liquidity tiers using BSI components:
//     L10 = currency in circulation (cash)
//     M1 - L10  = overnight deposits
//     M2 - M1   = short-term deposits + deposits redeemable at notice
//     M3 - M2   = repos + money market funds + short-term debt securities
//   Stacked area chart visualises the actual structure of "money".
export interface M3DecompositionPayload {
  times: string[];
  cash: (number | null)[];
  overnight: (number | null)[];
  shortTerm: (number | null)[];
  marketable: (number | null)[];
}
export async function loadM3Decomposition(): Promise<M3DecompositionPayload> {
  const [cash, m1, m2, m3] = await Promise.all([
    fetchEcbSeries("BSI", bsi("L10")),
    fetchEcbSeries("BSI", bsi("M10")),
    fetchEcbSeries("BSI", bsi("M20")),
    fetchEcbSeries("BSI", bsi("M30")),
  ]);
  const align = (s: EcbSeries) => {
    const m = new Map<string, number | null>();
    s.times.forEach((t, i) => m.set(t, s.values[i]));
    return m;
  };
  const aCash = align(cash);
  const aM1 = align(m1);
  const aM2 = align(m2);
  const aM3 = align(m3);
  const times = m3.times;
  const out: M3DecompositionPayload = {
    times,
    cash: [],
    overnight: [],
    shortTerm: [],
    marketable: [],
  };
  for (const t of times) {
    const c = aCash.get(t) ?? null;
    const m1v = aM1.get(t) ?? null;
    const m2v = aM2.get(t) ?? null;
    const m3v = aM3.get(t) ?? null;
    out.cash.push(c);
    out.overnight.push(m1v != null && c != null ? m1v - c : null);
    out.shortTerm.push(m1v != null && m2v != null ? m2v - m1v : null);
    out.marketable.push(m2v != null && m3v != null ? m3v - m2v : null);
  }
  return out;
}

// ---------- Cantillon gap: HICP vs HPI vs nominal wages, rebased ----------
export interface CantillonPayload {
  years: number[];
  hicp: (number | null)[]; // index, base = first year of overlap
  hpi: (number | null)[];
  wages: (number | null)[];
  baseYear: number;
}
export async function loadCantillonGap(): Promise<CantillonPayload> {
  // Annual HICP for SK (CP00, INX_A_AVG, base 2015=100).
  const hicpStat = await fetchEurostat("prc_hicp_aind", {
    geo: "SK",
    coicop: "CP00",
    unit: "INX_A_AVG",
  });
  const hicpYears = jsonStatCodes(hicpStat, "time").filter((t) => /^\d{4}$/.test(t)).sort();
  const hicpMap = new Map<number, number | null>();
  for (const y of hicpYears) {
    hicpMap.set(
      Number(y),
      jsonStatGet(hicpStat, {
        geo: "SK",
        coicop: "CP00",
        unit: "INX_A_AVG",
        time: y,
      })
    );
  }

  // HPI quarterly → annual average.
  const hpiStat = await fetchEurostat("prc_hpi_q", {
    geo: "SK",
    purchase: "TOTAL",
    unit: "I15_Q",
  });
  const hpiBuckets = new Map<number, { sum: number; count: number }>();
  for (const t of jsonStatCodes(hpiStat, "time")) {
    const v = jsonStatGet(hpiStat, {
      geo: "SK",
      purchase: "TOTAL",
      unit: "I15_Q",
      time: t,
    });
    const yr = Number(t.slice(0, 4));
    if (!Number.isFinite(yr) || v == null) continue;
    const acc = hpiBuckets.get(yr) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    hpiBuckets.set(yr, acc);
  }
  const hpiMap = new Map<number, number | null>();
  for (const [yr, acc] of hpiBuckets) {
    hpiMap.set(yr, acc.count > 0 ? acc.sum / acc.count : null);
  }

  // Net wages SK — annual EUR (case AW100, no children).
  const wageStat = await fetchEurostat("earn_nt_net", {
    geo: "SK",
    currency: "EUR",
    estruct: "NET",
    ecase: "P1_NCH_AW100",
  });
  const wageYears = jsonStatCodes(wageStat, "time").filter((t) => /^\d{4}$/.test(t)).sort();
  const wageMap = new Map<number, number | null>();
  for (const y of wageYears) {
    wageMap.set(
      Number(y),
      jsonStatGet(wageStat, {
        geo: "SK",
        currency: "EUR",
        estruct: "NET",
        ecase: "P1_NCH_AW100",
        time: y,
      })
    );
  }

  // Find common-overlap base year. We want a year where all three are defined
  // and use it as base = 100 for rebasing.
  const allYears = Array.from(
    new Set([
      ...hicpMap.keys(),
      ...hpiMap.keys(),
      ...wageMap.keys(),
    ])
  ).sort((a, b) => a - b);
  let baseYear = allYears[0];
  for (const y of allYears) {
    if (
      hicpMap.get(y) != null &&
      hpiMap.get(y) != null &&
      wageMap.get(y) != null
    ) {
      baseYear = y;
      break;
    }
  }
  const hicpBase = hicpMap.get(baseYear) || 100;
  const hpiBase = hpiMap.get(baseYear) || 100;
  const wageBase = wageMap.get(baseYear) || 100;

  function rebase(map: Map<number, number | null>, base: number) {
    return (year: number): number | null => {
      const v = map.get(year);
      if (v == null || base === 0) return null;
      return (v / base) * 100;
    };
  }
  const rH = rebase(hicpMap, hicpBase);
  const rHpi = rebase(hpiMap, hpiBase);
  const rW = rebase(wageMap, wageBase);

  return {
    years: allYears,
    hicp: allYears.map(rH),
    hpi: allYears.map(rHpi),
    wages: allYears.map(rW),
    baseYear,
  };
}

// ---------- Energy money: Soddy index ----------
//   Energy intensity = real GDP / energy consumption.
//   Soddy "kWh per €" = inverse of household electricity price.
export interface EnergyMoneyPayload {
  years: number[];
  // GDP / energy ratio (Eurostat units; we plot index 2010=100)
  energyIntensity: (number | null)[];
  // kWh you get for 1 € (inverse of household price)
  kwhPerEuro: (number | null)[];
  // raw price (€/kWh)
  pricePerKwh: (number | null)[];
}
export async function loadEnergyMoney(): Promise<EnergyMoneyPayload> {
  const [energyStat, gdpStat, priceStat] = await Promise.all([
    fetchEurostat("nrg_bal_c", {
      geo: "SK",
      nrg_bal: "GIC",
      siec: "TOTAL",
      unit: "KTOE",
    }),
    fetchEurostat("nama_10_gdp", {
      geo: "SK",
      na_item: "B1GQ",
      unit: "CP_MEUR",
    }),
    fetchEurostat("nrg_pc_204", {
      geo: "SK",
      siec: "E7000",
      nrg_cons: "TOT_KWH",
      unit: "KWH",
      tax: "I_TAX",
      currency: "EUR",
    }),
  ]);

  const energyYears = jsonStatCodes(energyStat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const energyMap = new Map<number, number | null>();
  for (const y of energyYears) {
    energyMap.set(
      Number(y),
      jsonStatGet(energyStat, {
        geo: "SK",
        nrg_bal: "GIC",
        siec: "TOTAL",
        unit: "KTOE",
        time: y,
      })
    );
  }

  const gdpYears = jsonStatCodes(gdpStat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const gdpMap = new Map<number, number | null>();
  for (const y of gdpYears) {
    gdpMap.set(
      Number(y),
      jsonStatGet(gdpStat, {
        geo: "SK",
        na_item: "B1GQ",
        unit: "CP_MEUR",
        time: y,
      })
    );
  }

  // Household electricity price: semi-annual ("YYYY-S1" / "YYYY-S2"). Average to annual.
  const priceBuckets = new Map<number, { sum: number; count: number }>();
  for (const t of jsonStatCodes(priceStat, "time")) {
    const yr = Number(t.slice(0, 4));
    const v = jsonStatGet(priceStat, {
      geo: "SK",
      siec: "E7000",
      nrg_cons: "TOT_KWH",
      unit: "KWH",
      tax: "I_TAX",
      currency: "EUR",
      time: t,
    });
    if (!Number.isFinite(yr) || v == null) continue;
    const acc = priceBuckets.get(yr) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    priceBuckets.set(yr, acc);
  }
  const priceMap = new Map<number, number | null>();
  for (const [yr, acc] of priceBuckets) {
    priceMap.set(yr, acc.count > 0 ? acc.sum / acc.count : null);
  }

  // Energy intensity = GDP / energy. Rebase to first overlap year = 100.
  const allYears = Array.from(
    new Set([
      ...energyMap.keys(),
      ...gdpMap.keys(),
      ...priceMap.keys(),
    ])
  ).sort((a, b) => a - b);

  const intensityRaw = new Map<number, number | null>();
  for (const y of allYears) {
    const e = energyMap.get(y);
    const g = gdpMap.get(y);
    if (e == null || g == null || e === 0) {
      intensityRaw.set(y, null);
      continue;
    }
    intensityRaw.set(y, g / e); // EUR mil per ktoe
  }
  let baseYear = allYears[0];
  for (const y of allYears) {
    if (intensityRaw.get(y) != null) {
      baseYear = y;
      break;
    }
  }
  const baseIntensity = intensityRaw.get(baseYear) || 1;

  return {
    years: allYears,
    energyIntensity: allYears.map((y) => {
      const v = intensityRaw.get(y);
      return v != null ? (v / baseIntensity) * 100 : null;
    }),
    pricePerKwh: allYears.map((y) => priceMap.get(y) ?? null),
    kwhPerEuro: allYears.map((y) => {
      const p = priceMap.get(y);
      if (p == null || p === 0) return null;
      return 1 / p;
    }),
  };
}

// ---------- Credit by sector (Werner's "credit guidance" thesis) ----------
//   Werner's Quantity Theory of Credit: money created for productive use
//   (NFC investment) → real GDP grows. Money created for asset purchases
//   (households for housing) → asset prices grow. ECB BSI A20 by counterpart
//   sector lets us decompose loans:
//     2240 — Non-financial corporations (productive)
//     2250 — Households (~85 % is for house purchase = asset/speculation)
//     2270 — General government
//   Stacked area shows the structural shift Werner argues happened post-1980.
export interface CreditByPurposePayload {
  times: string[];
  nfc: (number | null)[]; // mil EUR
  households: (number | null)[];
  government: (number | null)[];
  productiveShare: (number | null)[]; // NFC / (NFC + HH + Gov), %
}
export async function loadCreditByPurpose(): Promise<CreditByPurposePayload> {
  const [nfc, households, government] = await Promise.all([
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2240.Z01.E"),
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2250.Z01.E"),
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2270.Z01.E"),
  ]);
  const align = (s: EcbSeries) => {
    const m = new Map<string, number | null>();
    s.times.forEach((t, i) => m.set(t, s.values[i]));
    return m;
  };
  // Use NFC as the canonical time axis (typically the longest available).
  const aN = align(nfc);
  const aH = align(households);
  const aG = align(government);
  const allTimes = new Set<string>([...nfc.times, ...households.times, ...government.times]);
  const times = Array.from(allTimes).sort();
  const nfcSeries: (number | null)[] = [];
  const hhSeries: (number | null)[] = [];
  const govSeries: (number | null)[] = [];
  const share: (number | null)[] = [];
  for (const t of times) {
    const n = aN.get(t) ?? null;
    const h = aH.get(t) ?? null;
    const g = aG.get(t) ?? null;
    nfcSeries.push(n);
    hhSeries.push(h);
    govSeries.push(g);
    if (n != null && h != null && g != null) {
      const total = n + h + g;
      share.push(total > 0 ? (n / total) * 100 : null);
    } else {
      share.push(null);
    }
  }
  return { times, nfc: nfcSeries, households: hhSeries, government: govSeries, productiveShare: share };
}

// ============================================================================
// Werner — empirical test of Disaggregated Quantity Theory of Credit (QTC)
// ============================================================================
//
// Werner's disaggregated quantity equations (Werner 1997, 2005, 2012):
//
//   (1)  Mᴿ · Vᴿ = Pᴿ · Y         — real economy (GDP transactions)
//   (2)  Mᶠ · Vᶠ = Pᶠ · Qᶠ        — financial economy (asset transactions)
//
// In growth rates with V ≈ const (Werner's empirical assumption):
//
//   g(Mᴿ) ≈ g(P_GDP · Y) = g(nominal GDP)
//   g(Mᶠ) ≈ g(asset prices × asset turnover)
//
// Empirical proxies (Werner & Ryan-Collins 2012; Werner 2014):
//   Mᴿ ≈ MFI loans to NFCs (productive credit)
//   Mᶠ ≈ MFI loans to households (~85 % is mortgages = asset purchases)
//
// Predicted correlations:
//   ρ[g(NFC credit), g(GDPnom)]      → high  (productive ↔ real economy)
//   ρ[g(HH credit),  g(HPI)]         → high  (asset ↔ asset prices)
//   ρ[g(NFC credit), g(HPI)]         → lower (cross-check)
//   ρ[g(HH credit),  g(GDPnom)]      → lower (cross-check)

// Pearson product-moment correlation. Returns r, β (slope of OLS y on x), n.
function pearsonStats(
  x: (number | null)[],
  y: (number | null)[]
): { r: number | null; beta: number | null; n: number } {
  const pairs: [number, number][] = [];
  const len = Math.min(x.length, y.length);
  for (let i = 0; i < len; i++) {
    if (x[i] != null && y[i] != null) {
      pairs.push([x[i] as number, y[i] as number]);
    }
  }
  const n = pairs.length;
  if (n < 3) return { r: null, beta: null, n };
  const mx = pairs.reduce((s, [a]) => s + a, 0) / n;
  const my = pairs.reduce((s, [, b]) => s + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (const [a, b] of pairs) {
    const da = a - mx;
    const db = b - my;
    num += da * db;
    dx2 += da * da;
    dy2 += db * db;
  }
  const denom = Math.sqrt(dx2 * dy2);
  const r = denom > 0 ? num / denom : null;
  const beta = dx2 > 0 ? num / dx2 : null;
  return { r, beta, n };
}

// Convert monthly EcbSeries → annual YoY growth rates (Dec / Dec − 1 × 100).
function yoyGrowthAnnualFromMonthly(s: EcbSeries): {
  years: number[];
  growth: (number | null)[];
} {
  const decValues = new Map<number, number>();
  for (let i = 0; i < s.times.length; i++) {
    const t = s.times[i];
    const v = s.values[i];
    if (v == null) continue;
    if (t.endsWith("-12")) {
      decValues.set(Number(t.slice(0, 4)), v);
    }
  }
  const years = Array.from(decValues.keys()).sort();
  const growth: (number | null)[] = [];
  for (let i = 0; i < years.length; i++) {
    if (i === 0) {
      growth.push(null);
      continue;
    }
    const cur = decValues.get(years[i])!;
    const prev = decValues.get(years[i - 1]);
    growth.push(prev != null && prev > 0 ? ((cur - prev) / prev) * 100 : null);
  }
  return { years, growth };
}

// Convert annual numeric series → YoY growth rates.
function yoyGrowthAnnual(
  years: number[],
  values: (number | null)[]
): { years: number[]; growth: (number | null)[] } {
  const growth: (number | null)[] = [];
  for (let i = 0; i < years.length; i++) {
    if (i === 0) {
      growth.push(null);
      continue;
    }
    const cur = values[i];
    const prev = values[i - 1];
    if (cur == null || prev == null || prev === 0) {
      growth.push(null);
      continue;
    }
    growth.push(((cur - prev) / prev) * 100);
  }
  return { years, growth };
}

export interface WernerEmpirical {
  years: number[];
  gNfcCredit: (number | null)[]; // YoY %
  gHouseholdCredit: (number | null)[];
  gNominalGdp: (number | null)[];
  gRealGdp: (number | null)[];
  gHpi: (number | null)[];
  corr: {
    nfcGdpNom: { r: number | null; beta: number | null; n: number };
    hhHpi: { r: number | null; beta: number | null; n: number };
    nfcHpi: { r: number | null; beta: number | null; n: number };
    hhGdpNom: { r: number | null; beta: number | null; n: number };
  };
  latest: {
    year: number;
    gNfcCredit: number | null;
    gHhCredit: number | null;
    gRealGdp: number | null;
    /** Werner-optimal: g(C_R) target = g(real GDP) + π_target (2 %) */
    wernerOptimal: number | null;
  } | null;
}

export async function loadWernerEmpirical(): Promise<WernerEmpirical> {
  // Fetch ECB credit (monthly stocks) + Eurostat GDP nom/real (annual) + HPI (quarterly).
  const [nfc, households, gdpNomStat, gdpRealStat, hpiStat] = await Promise.all([
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2240.Z01.E"),
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2250.Z01.E"),
    fetchEurostat("nama_10_gdp", {
      geo: "EA20",
      na_item: "B1GQ",
      unit: "CP_MEUR",
    }),
    fetchEurostat("nama_10_gdp", {
      geo: "EA20",
      na_item: "B1GQ",
      unit: "CLV20_MEUR",
    }),
    fetchEurostat("prc_hpi_q", {
      geo: "EA20",
      purchase: "TOTAL",
      unit: "I15_Q",
    }),
  ]);

  // 1. ECB credit → annual YoY growth (Dec values)
  const gNfc = yoyGrowthAnnualFromMonthly(nfc);
  const gHh = yoyGrowthAnnualFromMonthly(households);

  // 2. GDP annual (already annual frequency)
  function annualSeriesFromEurostat(stat: typeof gdpNomStat): {
    years: number[];
    values: (number | null)[];
  } {
    const codes = jsonStatCodes(stat, "time")
      .filter((t) => /^\d{4}$/.test(t))
      .sort();
    const years: number[] = [];
    const values: (number | null)[] = [];
    for (const t of codes) {
      years.push(Number(t));
      // dimensions vary by query; reconstruct filter automatically
      const filter: Record<string, string> = {};
      for (const dim of stat.id) {
        if (dim === "time") {
          filter[dim] = t;
          continue;
        }
        const codes2 = Object.keys(stat.dimension[dim].category.index);
        if (codes2.length === 1) filter[dim] = codes2[0];
      }
      values.push(jsonStatGet(stat, filter));
    }
    return { years, values };
  }
  const gdpNom = annualSeriesFromEurostat(gdpNomStat);
  const gdpReal = annualSeriesFromEurostat(gdpRealStat);
  const gGdpNom = yoyGrowthAnnual(gdpNom.years, gdpNom.values);
  const gGdpReal = yoyGrowthAnnual(gdpReal.years, gdpReal.values);

  // 3. HPI quarterly → annual averages → YoY growth
  const hpiBuckets = new Map<number, { sum: number; count: number }>();
  for (const t of jsonStatCodes(hpiStat, "time")) {
    const v = jsonStatGet(hpiStat, {
      geo: "EA20",
      purchase: "TOTAL",
      unit: "I15_Q",
      time: t,
    });
    const yr = Number(t.slice(0, 4));
    if (!Number.isFinite(yr) || v == null) continue;
    const acc = hpiBuckets.get(yr) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    hpiBuckets.set(yr, acc);
  }
  const hpiYears = Array.from(hpiBuckets.keys()).sort();
  const hpiAnnual = hpiYears.map((y) => {
    const a = hpiBuckets.get(y)!;
    return a.count > 0 ? a.sum / a.count : null;
  });
  const gHpi = yoyGrowthAnnual(hpiYears, hpiAnnual);

  // 4. Align all series on overlapping year window
  const allYears = Array.from(
    new Set<number>([
      ...gNfc.years,
      ...gHh.years,
      ...gGdpNom.years,
      ...gGdpReal.years,
      ...gHpi.years,
    ])
  ).sort((a, b) => a - b);
  function alignTo<T>(years: number[], src: { years: number[]; growth: (T | null)[] }): (T | null)[] {
    const m = new Map<number, T | null>();
    src.years.forEach((y, i) => m.set(y, src.growth[i]));
    return years.map((y) => m.get(y) ?? null);
  }
  const aNfc = alignTo<number>(allYears, gNfc);
  const aHh = alignTo<number>(allYears, gHh);
  const aGdpNom = alignTo<number>(allYears, gGdpNom);
  const aGdpReal = alignTo<number>(allYears, gGdpReal);
  const aHpi = alignTo<number>(allYears, gHpi);

  // 5. Compute Pearson correlations on overlap
  const corr = {
    nfcGdpNom: pearsonStats(aNfc, aGdpNom),
    hhHpi: pearsonStats(aHh, aHpi),
    nfcHpi: pearsonStats(aNfc, aHpi),
    hhGdpNom: pearsonStats(aHh, aGdpNom),
  };

  // 6. Latest-year Werner-optimal vs actual
  let latest: WernerEmpirical["latest"] = null;
  for (let i = allYears.length - 1; i >= 0; i--) {
    const yr = allYears[i];
    const realG = aGdpReal[i];
    if (realG != null) {
      latest = {
        year: yr,
        gNfcCredit: aNfc[i],
        gHhCredit: aHh[i],
        gRealGdp: realG,
        wernerOptimal: realG + 2, // ECB π_target = 2 %
      };
      break;
    }
  }

  return {
    years: allYears,
    gNfcCredit: aNfc,
    gHouseholdCredit: aHh,
    gNominalGdp: aGdpNom,
    gRealGdp: aGdpReal,
    gHpi: aHpi,
    corr,
    latest,
  };
}

// ---------- HICP cumulative for inflation tax calculator ----------
export interface HicpAnnualSeries {
  years: number[];
  index: (number | null)[]; // base 2015 = 100
}
export async function loadHicpAnnualIndex(): Promise<HicpAnnualSeries> {
  const stat = await fetchEurostat("prc_hicp_aind", {
    geo: "SK",
    coicop: "CP00",
    unit: "INX_A_AVG",
  });
  const codes = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const years: number[] = [];
  const idx: (number | null)[] = [];
  for (const t of codes) {
    years.push(Number(t));
    idx.push(
      jsonStatGet(stat, {
        geo: "SK",
        coicop: "CP00",
        unit: "INX_A_AVG",
        time: t,
      })
    );
  }
  return { years, index: idx };
}

// ---------- MMT: debt/GDP comparison ----------
//
//   Eurostat gov_10dd_edpt1 covers EU members only. For Japan, USA, and global
//   benchmarks we hardcode the most recent IMF WEO snapshot — values change
//   slowly and the point is qualitative (SR has no own currency, can't print
//   to service debt; Japan has its own currency so MMT logic differs).
export interface MmtComparison {
  label: string;
  country: string;
  debtPctGdp: number;
  ownsCurrency: boolean;
  note: string;
}
export const MMT_DEBT_SNAPSHOT: MmtComparison[] = [
  {
    label: "Japonsko",
    country: "JP",
    debtPctGdp: 252,
    ownsCurrency: true,
    note: "Vlastný JPY, Bank of Japan drží ~50 % vládnych dlhopisov. MMT-isti tvrdia, že nezbankrotuje.",
  },
  {
    label: "USA",
    country: "US",
    debtPctGdp: 123,
    ownsCurrency: true,
    note: "Vlastný USD, svetová rezervná mena. Fed má veľký balance sheet po QE.",
  },
  {
    label: "Taliansko",
    country: "IT",
    debtPctGdp: 137,
    ownsCurrency: false,
    note: "Eurozóna — nemá vlastnú menu. Závisí od ECB monetárnej politiky.",
  },
  {
    label: "Slovensko",
    country: "SK",
    debtPctGdp: 60,
    ownsCurrency: false,
    note: "Eurozóna od 2009 — fiškálna autonómia bez monetárnej. MMT logika neplatí.",
  },
  {
    label: "Eurozóna (EÚ27)",
    country: "EA",
    debtPctGdp: 88,
    ownsCurrency: true,
    note: "Spoločná mena spravovaná ECB; jednotliví členovia ju ovládať nevedia.",
  },
  {
    label: "Maastrichtský strop",
    country: "—",
    debtPctGdp: 60,
    ownsCurrency: false,
    note: "Limit stanovený v eurozónových zmluvách (referenčný).",
  },
];

// ============================================================================
// (Naive WernerCounterfactual was removed. Replaced by the three Werner-
// faithful loaders below: distributed-lag + Granger (NPM 2005 ch. 14),
// VAR(4) + Cholesky IRF + counterfactual via shock cleansing (Princes of
// the Yen 2003 ch. 6), and Chow break-test scan.)
// ============================================================================

// MMT note: debt/GDP for SK from Eurostat live, others hardcoded above.
export async function loadSkDebtToGdp(): Promise<{
  year: string;
  pct: number | null;
}> {
  const stat = await fetchEurostat("gov_10dd_edpt1", {
    geo: "SK",
    na_item: "GD",
    unit: "PC_GDP",
    sector: "S13",
  });
  const codes = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  for (let i = codes.length - 1; i >= 0; i--) {
    const t = codes[i];
    const v = jsonStatGet(stat, {
      geo: "SK",
      na_item: "GD",
      unit: "PC_GDP",
      sector: "S13",
      time: t,
    });
    if (v != null) return { year: t, pct: v };
  }
  return { year: "", pct: null };
}

// ============================================================================
// Werner faithful replication on EA20 quarterly data.
// References:
//   • Werner (1997) Kredit und Kapital 30:276–309
//   • Werner (2003) Princes of the Yen, ch. 6
//   • Werner (2005) New Paradigm in Macroeconomics, ch. 14
//   • Voutsinas & Werner (2011) IRFA 25:54–65
// All series are seasonally and calendar-adjusted (S_ADJ = SCA where Eurostat
// supports it). All regressors are first differences of natural logarithms
// — Δln(x_t) = ln(x_t) − ln(x_{t−1}) — the canonical Werner specification.
// ============================================================================

// ---------- Helper: monthly EcbSeries → end-of-quarter values ----------
function ecbMonthlyToQuarterly(s: EcbSeries): {
  quarters: string[];
  values: (number | null)[];
} {
  const map = new Map<string, number | null>();
  for (let i = 0; i < s.times.length; i++) {
    const t = s.times[i]; // "YYYY-MM"
    const month = Number(t.slice(5, 7));
    if (![3, 6, 9, 12].includes(month)) continue;
    const q = Math.ceil(month / 3);
    map.set(t.slice(0, 4) + "-Q" + q, s.values[i]);
  }
  const quarters = Array.from(map.keys()).sort();
  const values = quarters.map((q) => map.get(q) ?? null);
  return { quarters, values };
}
// ---------- Helper: Eurostat quarterly time codes "YYYY-Qq" or "YYYYQq" ----------
function eurostatQuarterlySeries(
  stat: JsonStat,
  fixed: Record<string, string>
): { quarters: string[]; values: (number | null)[] } {
  const codes = jsonStatCodes(stat, "time");
  // Eurostat usually emits "YYYY-Qq" but historical encoding "YYYYQq" exists.
  const map = new Map<string, number | null>();
  for (const t of codes) {
    const m = t.match(/^(\d{4})[-]?Q?([1-4])$/);
    if (!m) continue;
    const key = m[1] + "-Q" + m[2];
    map.set(key, jsonStatGet(stat, { ...fixed, time: t }));
  }
  const quarters = Array.from(map.keys()).sort();
  const values = quarters.map((q) => map.get(q) ?? null);
  return { quarters, values };
}
// ---------- Helper: align several quarterly series on intersection axis ----------
function alignQuarterly(
  series: { quarters: string[]; values: (number | null)[] }[]
): { quarters: string[]; cols: (number | null)[][] } {
  const all = new Set<string>();
  for (const s of series) for (const q of s.quarters) all.add(q);
  const quarters = Array.from(all).sort();
  const cols = series.map((s) => {
    const m = new Map(s.quarters.map((q, i) => [q, s.values[i]]));
    return quarters.map((q) => m.get(q) ?? null);
  });
  return { quarters, cols };
}
// ---------- Helper: first difference of natural log (Werner specification) ----------
function dlogOf(values: (number | null)[]): (number | null)[] {
  const out: (number | null)[] = [null];
  for (let i = 1; i < values.length; i++) {
    const a = values[i];
    const b = values[i - 1];
    if (a == null || b == null || a <= 0 || b <= 0) {
      out.push(null);
      continue;
    }
    out.push(Math.log(a / b));
  }
  return out;
}

// ---------- Quarterly bundle for Werner regressions ----------
//   c_R: stock of MFI loans to NFCs (productive credit proxy, BSI 2240)
//   c_F: stock of MFI loans to households (asset credit proxy, BSI 2250)
//   nGDP, rGDP: nominal & chain-linked real GDP (Eurostat namq_10_gdp)
//   HPI: residential house price index (Eurostat prc_hpi_q)
//   HICP: harmonised index of consumer prices, quarterly average from monthly
//   PROD: real labour productivity per person (Eurostat namq_10_lp_ulc)
async function loadWernerQuarterly(): Promise<{
  quarters: string[];
  dlnCR: (number | null)[];
  dlnCF: (number | null)[];
  dlnNGdp: (number | null)[];
  dlnRGdp: (number | null)[];
  dlnHpi: (number | null)[];
  dlnHicp: (number | null)[];
  dlnProd: (number | null)[];
}> {
  const [
    nfcMonthly,
    hhMonthly,
    nGdpStat,
    rGdpStat,
    hpiStat,
    hicpMidx,
    prodStat,
  ] = await Promise.all([
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2240.Z01.E"),
    fetchEcbSeries("BSI", "M.U2.N.A.A20.A.1.U2.2250.Z01.E"),
    fetchEurostat("namq_10_gdp", {
      geo: "EA20",
      na_item: "B1GQ",
      unit: "CP_MEUR",
      s_adj: "SCA",
    }),
    fetchEurostat("namq_10_gdp", {
      geo: "EA20",
      na_item: "B1GQ",
      unit: "CLV20_MEUR",
      s_adj: "SCA",
    }),
    fetchEurostat("prc_hpi_q", {
      geo: "EA20",
      purchase: "TOTAL",
      unit: "I15_Q",
    }),
    fetchEurostat("prc_hicp_midx", {
      geo: "EA20",
      coicop: "CP00",
      unit: "I15",
    }),
    fetchEurostat("namq_10_lp_ulc", {
      geo: "EA20",
      na_item: "RLPR_PER",
      unit: "I20",
      s_adj: "SCA",
    }),
  ]);

  const cR = ecbMonthlyToQuarterly(nfcMonthly);
  const cF = ecbMonthlyToQuarterly(hhMonthly);
  const nGdp = eurostatQuarterlySeries(nGdpStat, {
    geo: "EA20",
    na_item: "B1GQ",
    unit: "CP_MEUR",
    s_adj: "SCA",
  });
  const rGdp = eurostatQuarterlySeries(rGdpStat, {
    geo: "EA20",
    na_item: "B1GQ",
    unit: "CLV20_MEUR",
    s_adj: "SCA",
  });
  const hpi = eurostatQuarterlySeries(hpiStat, {
    geo: "EA20",
    purchase: "TOTAL",
    unit: "I15_Q",
  });
  // HICP is monthly index — average to quarter.
  const hicpBuckets = new Map<string, { sum: number; count: number }>();
  for (const t of jsonStatCodes(hicpMidx, "time")) {
    const m = t.match(/^(\d{4})-(\d{2})$/);
    if (!m) continue;
    const month = Number(m[2]);
    const q = Math.ceil(month / 3);
    const key = m[1] + "-Q" + q;
    const v = jsonStatGet(hicpMidx, {
      geo: "EA20",
      coicop: "CP00",
      unit: "I15",
      time: t,
    });
    if (v == null) continue;
    const acc = hicpBuckets.get(key) || { sum: 0, count: 0 };
    acc.sum += v;
    acc.count += 1;
    hicpBuckets.set(key, acc);
  }
  const hicpQ = Array.from(hicpBuckets.keys()).sort();
  const hicp = {
    quarters: hicpQ,
    values: hicpQ.map((q) => {
      const a = hicpBuckets.get(q)!;
      return a.count > 0 ? a.sum / a.count : null;
    }),
  };
  const prod = eurostatQuarterlySeries(prodStat, {
    geo: "EA20",
    na_item: "RLPR_PER",
    unit: "I20",
    s_adj: "SCA",
  });

  const aligned = alignQuarterly([cR, cF, nGdp, rGdp, hpi, hicp, prod]);
  return {
    quarters: aligned.quarters,
    dlnCR: dlogOf(aligned.cols[0]),
    dlnCF: dlogOf(aligned.cols[1]),
    dlnNGdp: dlogOf(aligned.cols[2]),
    dlnRGdp: dlogOf(aligned.cols[3]),
    dlnHpi: dlogOf(aligned.cols[4]),
    dlnHicp: dlogOf(aligned.cols[5]),
    dlnProd: dlogOf(aligned.cols[6]),
  };
}

// ============================================================================
// PR1 — Distributed-lag OLS (Werner NPM 2005 eq. 14.5/14.6) + Granger F-test
// ============================================================================
//
// H₁ (Werner eq. 14.5): Δln(P_R Y)_t = α + Σᵢ₌₀..₄ βᵢ Δln(C_R)_{t−i} + ε_t
// H₂ (Werner eq. 14.6): Δln(P_F)_t   = α + Σᵢ₌₀..₄ βᵢ Δln(C_F)_{t−i} + ε_t
//
// Cross-checks (must be weak per Werner's prediction):
//   nGDP on lags of C_F   — asset credit ↛ real economy
//   HPI  on lags of C_R   — productive credit ↛ asset prices
//
// Granger F-test in both directions following Werner (2005, p. 208).
export interface WernerLagAndGrangerPayload {
  startQuarter: string;
  endQuarter: string;
  // H₁: nGDP ← lags of C_R
  h1: DistributedLagResult;
  h1GrangerForward: GrangerResult; // C_R Granger-causes nGDP
  h1GrangerReverse: GrangerResult; // nGDP Granger-causes C_R
  // H₂: HPI ← lags of C_F
  h2: DistributedLagResult;
  h2GrangerForward: GrangerResult;
  h2GrangerReverse: GrangerResult;
  // Cross-checks
  cross1: DistributedLagResult; // nGDP ← lags of C_F
  cross2: DistributedLagResult; // HPI ← lags of C_R
  lags: number;
}
export async function loadWernerLagAndGranger(): Promise<WernerLagAndGrangerPayload> {
  const q = await loadWernerQuarterly();
  const lags = 4;
  const h1 = distributedLagOls(q.dlnCR, q.dlnNGdp, lags);
  const h2 = distributedLagOls(q.dlnCF, q.dlnHpi, lags);
  const cross1 = distributedLagOls(q.dlnCF, q.dlnNGdp, lags);
  const cross2 = distributedLagOls(q.dlnCR, q.dlnHpi, lags);
  if (!h1 || !h2 || !cross1 || !cross2) {
    throw new Error("Insufficient overlap to estimate Werner lag regressions.");
  }
  const h1GrangerForward = grangerCausality(
    q.dlnCR,
    q.dlnNGdp,
    lags,
    "Δln C_R → Δln nGDP"
  );
  const h1GrangerReverse = grangerCausality(
    q.dlnNGdp,
    q.dlnCR,
    lags,
    "Δln nGDP → Δln C_R"
  );
  const h2GrangerForward = grangerCausality(
    q.dlnCF,
    q.dlnHpi,
    lags,
    "Δln C_F → Δln HPI"
  );
  const h2GrangerReverse = grangerCausality(
    q.dlnHpi,
    q.dlnCF,
    lags,
    "Δln HPI → Δln C_F"
  );
  if (
    !h1GrangerForward ||
    !h1GrangerReverse ||
    !h2GrangerForward ||
    !h2GrangerReverse
  ) {
    throw new Error("Granger test failed (insufficient sample).");
  }
  // Find first / last quarter with all four series present
  let firstIdx = 0;
  for (let i = 0; i < q.quarters.length; i++) {
    if (
      q.dlnCR[i] != null &&
      q.dlnCF[i] != null &&
      q.dlnNGdp[i] != null &&
      q.dlnHpi[i] != null
    ) {
      firstIdx = i;
      break;
    }
  }
  return {
    startQuarter: q.quarters[firstIdx],
    endQuarter: q.quarters[q.quarters.length - 1],
    h1,
    h1GrangerForward,
    h1GrangerReverse,
    h2,
    h2GrangerForward,
    h2GrangerReverse,
    cross1,
    cross2,
    lags,
  };
}

// ============================================================================
// PR2 — VAR(4) + orthogonal IRF + counterfactual via shock cleansing
//        (Princes of the Yen 2003 ch. 6.4)
// ============================================================================
//
// Variable ordering (Cholesky): [Δln C_R, Δln C_F, Δln nGDP, Δln HPI]
//   — Werner (2003, p. 215) argues banks decide credit allocation first;
//   real and financial economy variables react contemporaneously.
//
// Counterfactual experiment: zero the orthogonalised C_F shock from a chosen
// quarter onwards. Holds the other three structural shocks at their actual
// historical values. Shocks are propagated through the estimated VAR. The
// resulting Δln paths are converted back to index levels (base = 100 at the
// counterfactual start quarter).
export interface WernerVarPayload {
  variables: string[]; // ["dlnCR", "dlnCF", "dlnNGdp", "dlnHpi"]
  variableLabels: string[];
  quartersEffective: string[]; // length T
  quartersFull: string[]; // length p + T
  K: number;
  p: number;
  Y: Mat; // T × K
  Y0: Mat; // p × K
  coef: Mat;
  sigma: Mat;
  chol: Mat;
  irf: number[][][]; // [horizon+1][i][j]
  irfBands: { lower: number[][][]; upper: number[][][]; median: number[][][] };
  horizon: number;
  // Cumulative response (Δln converted to % level deviation)
  // for each variable when the C_F shock = 0 from the candidate index.
  // Provided as a default snapshot; the front-end recomputes per slider position.
  defaultCounterfactualStartIdx: number;
  cfShockIdx: number; // = 1 (the C_F = household credit equation)
}
export async function loadWernerVar(): Promise<WernerVarPayload> {
  const q = await loadWernerQuarterly();
  // Build aligned matrix dropping rows with any missing value (VAR demands balanced panel).
  const cols: (number | null)[][] = [
    q.dlnCR,
    q.dlnCF,
    q.dlnNGdp,
    q.dlnHpi,
  ];
  const variables = ["dlnCR", "dlnCF", "dlnNGdp", "dlnHpi"];
  const variableLabels = [
    "Δln C_R (úver NFC)",
    "Δln C_F (úver HH)",
    "Δln nGDP",
    "Δln HPI",
  ];
  const Yfull: Mat = [];
  const quartersFull: string[] = [];
  for (let i = 0; i < q.quarters.length; i++) {
    const row = cols.map((c) => c[i]);
    if (row.some((v) => v == null)) continue;
    Yfull.push(row as number[]);
    quartersFull.push(q.quarters[i]);
  }
  const p = 4;
  const model = fitVar(Yfull, p);
  if (!model) {
    throw new Error("VAR(4) estimation failed for EA20 sample.");
  }
  const horizon = 16; // 4 years
  const irf = varIrf(model, horizon);
  const irfBands = varIrfBootstrap(model, horizon, 250, 0.05);
  return {
    variables,
    variableLabels,
    quartersEffective: quartersFull.slice(p),
    quartersFull,
    K: model.K,
    p,
    Y: model.Y,
    Y0: model.Y0,
    coef: model.coef,
    sigma: model.sigma,
    chol: model.chol,
    irf,
    irfBands,
    horizon,
    cfShockIdx: 1,
    defaultCounterfactualStartIdx:
      Math.max(0, model.Y.length - 32) /* ~8 years from end */,
  };
}

// Reusable accessor for the front-end to compute a counterfactual path on demand.
// Front-end receives the model bytes via WernerVarPayload and rebuilds the
// model object for the wernerCounterfactual routine (no need to ship the full
// fitVar). For simplicity the loader exposes a baseline counterfactual which
// the chart uses as a starting point.
export function buildWernerVarModelFromPayload(p: WernerVarPayload) {
  return {
    K: p.K,
    p: p.p,
    T: p.Y.length,
    coef: p.coef,
    sigma: p.sigma,
    chol: p.chol,
    resid: (() => {
      // Recompute residuals from coef + Y so the front-end can run shock cleansing.
      // resid_t = Y_t − (c + Σ_l A_l Y_{t-l})
      const out: Mat = [];
      const Y = [...p.Y0, ...p.Y];
      for (let t = p.p; t < Y.length; t++) {
        const pred = new Array(p.K).fill(0).map((_, i) => p.coef[i][0]);
        for (let l = 1; l <= p.p; l++)
          for (let i = 0; i < p.K; i++)
            for (let j = 0; j < p.K; j++)
              pred[i] += p.coef[i][1 + (l - 1) * p.K + j] * Y[t - l][j];
        const r = new Array(p.K)
          .fill(0)
          .map((_, i) => Y[t][i] - pred[i]);
        out.push(r);
      }
      return out;
    })(),
    Y: p.Y,
    Y0: p.Y0,
  };
}

export type CounterfactualMode = "shock-cleansing" | "hard-rule";

export interface CounterfactualOptions {
  mode: CounterfactualMode;
  /** Quarterly Δln target for the controlled variable when mode = "hard-rule".
   *  Werner NPM 2005 ch. 17 prescribes ≈ 0. */
  hardRuleTarget?: number;
}

export function runCounterfactual(
  payload: WernerVarPayload,
  startIdx: number,
  options: CounterfactualOptions = { mode: "shock-cleansing" }
): { paths: Mat; cumPct: number[][]; quarters: string[] } {
  const model = buildWernerVarModelFromPayload(payload);
  const Yc =
    options.mode === "hard-rule"
      ? wernerHardRule(
          model,
          payload.cfShockIdx,
          startIdx,
          options.hardRuleTarget ?? 0
        )
      : wernerCounterfactual(model, payload.cfShockIdx, startIdx);
  // Convert Δln paths to cumulative % deviations from a base (= startIdx).
  const T = Yc.length;
  const cumPct: number[][] = Array.from({ length: T }, () =>
    new Array(payload.K).fill(0)
  );
  // Build cumulative log-level for both actual and cf, anchored at startIdx.
  const Yact = payload.Y;
  for (let i = 0; i < payload.K; i++) {
    let actLog = 0;
    let cfLog = 0;
    for (let t = 0; t < T; t++) {
      if (t < startIdx) {
        cumPct[t][i] = 0;
        continue;
      }
      actLog += Yact[t][i];
      cfLog += Yc[t][i];
      // Convert cumulative log-difference to a true % level deviation:
      //   ln(L_cf / L_act) = Σ Δln_cf − Σ Δln_act
      //   ⇒ %Δ = (exp(ln L_cf / L_act) − 1) × 100
      // For small differences this collapses to (cfLog − actLog) × 100; for
      // larger ones the exponential correction matters.
      cumPct[t][i] = (Math.exp(cfLog - actLog) - 1) * 100;
    }
  }
  return { paths: Yc, cumPct, quarters: payload.quartersEffective };
}

// ============================================================================
// PR3 — Rolling Chow break-point scan
// ============================================================================
//
// For each candidate breakpoint b in the trimmed centre of the sample, fit
// the H₁ distributed-lag specification (nGDP on 4 lags of C_R) on [0,b) and
// [b,T) separately and the pooled regression on [0,T). The Chow F-test
// rejects parameter constancy where the F-statistic peaks.
//
// Werner (2005, p. 213) flags 1985, 2001 as candidates for Japan. We let the
// data speak for the EA20 sample; the chart visualises -log10(p) so that
// peaks are easy to spot.
export interface WernerChowPayload {
  channel: "H1" | "H2";
  lags: number;
  quarters: string[];
  scan: { quarter: string; f: number; pValue: number; logP: number }[];
}
export async function loadWernerChowH1(): Promise<WernerChowPayload> {
  const q = await loadWernerQuarterly();
  const lags = 4;
  const scan = rollingChow(q.dlnCR, q.dlnNGdp, lags, 0.15);
  return {
    channel: "H1",
    lags,
    quarters: q.quarters,
    scan: scan.map((r) => ({
      quarter: q.quarters[r.breakIdx],
      f: r.f,
      pValue: r.pValue,
      logP: -Math.log10(Math.max(1e-12, r.pValue)),
    })),
  };
}
export async function loadWernerChowH2(): Promise<WernerChowPayload> {
  const q = await loadWernerQuarterly();
  const lags = 4;
  const scan = rollingChow(q.dlnCF, q.dlnHpi, lags, 0.15);
  return {
    channel: "H2",
    lags,
    quarters: q.quarters,
    scan: scan.map((r) => ({
      quarter: q.quarters[r.breakIdx],
      f: r.f,
      pValue: r.pValue,
      logP: -Math.log10(Math.max(1e-12, r.pValue)),
    })),
  };
}
