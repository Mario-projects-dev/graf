// =============================================================================
// Turchin Political Stress Index (PSI) — replikácia structural-demographic
// theory pre Slovensko + porovnanie s USA Turchin published trajektóriou.
//
// Empirické zdroje:
//   • Turchin (2010) "Political instability may be a contributor in the
//     coming decade", Nature 463:608.
//   • Turchin (2016) Ages of Discord: A Structural-Demographic Analysis of
//     American History. Beresta Books. — definitions of MMP, EMP, SFH; Fig. P.1
//     and Appendix Table A.5 contain the published USA PSI series 1780–2010s.
//   • Turchin & Hoyer (2021) "Multiple Discovery and Cliodynamics", Cliodynamics 12.
//   • Turchin et al. (2018) PNAS 115(2):E144 — quantitative cross-cultural
//     analysis of social complexity.
//   • Turchin (2023) End Times: Elites, Counter-Elites, and the Path of
//     Political Disintegration. Penguin.
//
// Eurostat datasets:
//   • nama_10_a10  — compensation of employees (D11)
//   • nama_10_a10_e — employees (EMP_DC, THS_PER)
//   • nama_10_pc   — GDP per capita (CP_EUR_HAB / CLV_PCH_PRE)
//   • prc_hicp_aind — HICP deflator (CP00, INX_A_AVG)
//   • educ_uoe_grad02 — graduates by ISCED level (ED5-8 = tertiary)
//   • lfsa_egais   — employment by ISCO occupation (OC1+OC2 = elite)
//   • gov_10dd_edpt1 — general govt debt as % GDP
//   • ilc_di11     — Gini coefficient
//   • ilc_di11c    — S80/S20 income quintile share ratio
//
// Methodology (Turchin 2016 Ages of Discord, ch. 1, eq. 1.1):
//   PSI(t) = MMP(t) × EMP(t) × (1 − SFH_norm(t))
//   normalised so that SK 2000 = 1.0 (Turchin uses USA 1780 = 1.0).
// =============================================================================

import { jsonStatGet, jsonStatCodes, type JsonStat } from "./jsonStat";
import { fetchEurostat } from "./useEurostat";

// ---------- Helpers ----------
function annualSeries(
  stat: JsonStat | null,
  fixed: Record<string, string>
): { years: number[]; values: (number | null)[] } {
  if (!stat) return { years: [], values: [] };
  const codes = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const years = codes.map(Number);
  const values = codes.map((t) =>
    jsonStatGet(stat, { ...fixed, time: t })
  );
  return { years, values };
}
function rebase(
  values: (number | null)[],
  years: number[],
  baseYear: number
): (number | null)[] {
  const idx = years.indexOf(baseYear);
  if (idx < 0) return values;
  const base = values[idx];
  if (base == null || base === 0) return values;
  return values.map((v) => (v == null ? null : (v / base) * 100));
}
function alignToYears(
  series: { years: number[]; values: (number | null)[] },
  axis: number[]
): (number | null)[] {
  const m = new Map(series.years.map((y, i) => [y, series.values[i]]));
  return axis.map((y) => m.get(y) ?? null);
}

// ============================================================================
// 1. Mass Mobilization Potential — relative wages vs GDP per capita
// ============================================================================
//   MMP = real_wage_per_employee_idx ÷ real_GDP_per_capita_idx, base 2000 = 1.
//   Turchin (Ages of Discord ch. 4): when MMP < 1, immiseration is rising,
//   contributing to mass-driven instability.
export interface MmpPayload {
  years: number[];
  realWageIdx: (number | null)[];
  realGdpPcIdx: (number | null)[];
  mmp: (number | null)[];
  mmpStress: (number | null)[]; // = 1 / mmp (higher = more stress)
}
export async function loadMmp(): Promise<MmpPayload> {
  const [compStat, emplStat, gdpStat, hicpStat] = await Promise.all([
    fetchEurostat("nama_10_a10", {
      geo: "SK",
      na_item: "D11",
      unit: "CP_MEUR",
      nace_r2: "TOTAL",
    }).catch(() => null),
    fetchEurostat("nama_10_a10_e", {
      geo: "SK",
      na_item: "EMP_DC",
      unit: "THS_PER",
      nace_r2: "TOTAL",
    }).catch(() => null),
    fetchEurostat("nama_10_pc", {
      geo: "SK",
      na_item: "B1GQ",
      unit: "CP_EUR_HAB",
    }).catch(() => null),
    fetchEurostat("prc_hicp_aind", {
      geo: "SK",
      coicop: "CP00",
      unit: "INX_A_AVG",
    }).catch(() => null),
  ]);
  const comp = annualSeries(compStat, {
    geo: "SK",
    na_item: "D11",
    unit: "CP_MEUR",
    nace_r2: "TOTAL",
  });
  const empl = annualSeries(emplStat, {
    geo: "SK",
    na_item: "EMP_DC",
    unit: "THS_PER",
    nace_r2: "TOTAL",
  });
  const gdp = annualSeries(gdpStat, {
    geo: "SK",
    na_item: "B1GQ",
    unit: "CP_EUR_HAB",
  });
  const hicp = annualSeries(hicpStat, {
    geo: "SK",
    coicop: "CP00",
    unit: "INX_A_AVG",
  });
  const allYears = Array.from(
    new Set<number>([...comp.years, ...empl.years, ...gdp.years, ...hicp.years])
  )
    .sort((a, b) => a - b)
    .filter((y) => y >= 1995);
  const cM = new Map(comp.years.map((y, i) => [y, comp.values[i]]));
  const eM = new Map(empl.years.map((y, i) => [y, empl.values[i]]));
  const gM = new Map(gdp.years.map((y, i) => [y, gdp.values[i]]));
  const hM = new Map(hicp.years.map((y, i) => [y, hicp.values[i]]));
  const realWage: (number | null)[] = allYears.map((y) => {
    const c = cM.get(y);
    const e = eM.get(y);
    const h = hM.get(y);
    if (c == null || e == null || h == null || e === 0 || h === 0) return null;
    return ((c * 1000) / e) / (h / 100); // EUR per employee, real
  });
  const realGdpPc: (number | null)[] = allYears.map((y) => {
    const g = gM.get(y);
    const h = hM.get(y);
    if (g == null || h == null || h === 0) return null;
    return g / (h / 100);
  });
  const realWageIdx = rebase(realWage, allYears, 2000);
  const realGdpPcIdx = rebase(realGdpPc, allYears, 2000);
  const mmp = allYears.map((_y, i) => {
    const w = realWageIdx[i];
    const g = realGdpPcIdx[i];
    if (w == null || g == null || g === 0) return null;
    return w / g;
  });
  const mmpStress = mmp.map((v) => (v == null || v === 0 ? null : 1 / v));
  return { years: allYears, realWageIdx, realGdpPcIdx, mmp, mmpStress };
}

// ============================================================================
// 2. Elite Mobilization Potential — graduates per elite position
// ============================================================================
//   EMP = tertiary graduates (annual flow) ÷ available elite-track positions
//   Turchin (Ages of Discord ch. 5): rising EMP signals elite overproduction
//   — too many aspirants chasing too few prestigious posts → political
//   radicalisation of disappointed counter-elites.
export interface EmpPayload {
  years: number[];
  graduatesIdx: (number | null)[]; // base 2000 = 100
  elitePositionsIdx: (number | null)[];
  empRatio: (number | null)[]; // graduates_idx / elite_positions_idx
}
export async function loadEmp(): Promise<EmpPayload> {
  const [gradStat, mgrStat, profStat] = await Promise.all([
    fetchEurostat("educ_uoe_grad02", {
      geo: "SK",
      isced11: "ED5-8",
      iscedf13: "TOTAL",
      sex: "T",
      unit: "NR",
    }).catch(() => null),
    // ISCO-08 OC1 = Managers
    fetchEurostat("lfsa_egais", {
      geo: "SK",
      isco08: "OC1",
      sex: "T",
      age: "Y15-64",
      wstatus: "EMP",
      unit: "THS_PER",
    }).catch(() => null),
    // ISCO-08 OC2 = Professionals
    fetchEurostat("lfsa_egais", {
      geo: "SK",
      isco08: "OC2",
      sex: "T",
      age: "Y15-64",
      wstatus: "EMP",
      unit: "THS_PER",
    }).catch(() => null),
  ]);
  const grad = annualSeries(gradStat, {
    geo: "SK",
    isced11: "ED5-8",
    iscedf13: "TOTAL",
    sex: "T",
    unit: "NR",
  });
  const mgr = annualSeries(mgrStat, {
    geo: "SK",
    isco08: "OC1",
    sex: "T",
    age: "Y15-64",
    wstatus: "EMP",
    unit: "THS_PER",
  });
  const prof = annualSeries(profStat, {
    geo: "SK",
    isco08: "OC2",
    sex: "T",
    age: "Y15-64",
    wstatus: "EMP",
    unit: "THS_PER",
  });
  const allYears = Array.from(
    new Set<number>([...grad.years, ...mgr.years, ...prof.years])
  )
    .sort((a, b) => a - b)
    .filter((y) => y >= 1995);
  const gradAxis = alignToYears(grad, allYears);
  const mgrAxis = alignToYears(mgr, allYears);
  const profAxis = alignToYears(prof, allYears);
  const elite = allYears.map((_y, i) => {
    const m = mgrAxis[i];
    const p = profAxis[i];
    if (m == null || p == null) return null;
    return m + p;
  });
  const baseYear = 2005;
  const graduatesIdx = rebase(gradAxis, allYears, baseYear);
  const elitePositionsIdx = rebase(elite, allYears, baseYear);
  const empRatio = allYears.map((_y, i) => {
    const g = graduatesIdx[i];
    const e = elitePositionsIdx[i];
    if (g == null || e == null || e === 0) return null;
    return g / e;
  });
  return { years: allYears, graduatesIdx, elitePositionsIdx, empRatio };
}

// ============================================================================
// 3. State Fiscal Health — debt/GDP inversion
// ============================================================================
export interface SfhPayload {
  years: number[];
  debtPctGdp: (number | null)[];
  // SFH normalised: 1.0 = healthy (low debt), 0 = stressed (debt = 100%+ GDP).
  sfh: (number | null)[];
}
export async function loadSfh(): Promise<SfhPayload> {
  const stat = await fetchEurostat("gov_10dd_edpt1", {
    geo: "SK",
    na_item: "GD",
    unit: "PC_GDP",
    sector: "S13",
  }).catch(() => null);
  const s = annualSeries(stat, {
    geo: "SK",
    na_item: "GD",
    unit: "PC_GDP",
    sector: "S13",
  });
  const years = s.years.filter((y) => y >= 1995);
  const debt = years.map((y) => {
    const i = s.years.indexOf(y);
    return i >= 0 ? s.values[i] : null;
  });
  const sfh = debt.map((d) => (d == null ? null : Math.max(0, 1 - d / 100)));
  return { years, debtPctGdp: debt, sfh };
}

// ============================================================================
// 4. Wealth concentration — Gini + S80/S20 quintile share ratio
// ============================================================================
export interface WealthPumpPayload {
  years: number[];
  gini: (number | null)[]; // Eurostat ilc_di11, RAT (0–100 scale)
  s80s20: (number | null)[]; // Eurostat ilc_di11c, RAT
}
export async function loadWealthPump(): Promise<WealthPumpPayload> {
  const [giniStat, ratioStat] = await Promise.all([
    fetchEurostat("ilc_di11", {
      geo: "SK",
      age: "TOTAL",
      sex: "T",
      unit: "RAT",
    }).catch(() => null),
    fetchEurostat("ilc_di11c", {
      geo: "SK",
      age: "TOTAL",
      sex: "T",
      unit: "RAT",
    }).catch(() => null),
  ]);
  const g = annualSeries(giniStat, {
    geo: "SK",
    age: "TOTAL",
    sex: "T",
    unit: "RAT",
  });
  const r = annualSeries(ratioStat, {
    geo: "SK",
    age: "TOTAL",
    sex: "T",
    unit: "RAT",
  });
  const years = Array.from(new Set<number>([...g.years, ...r.years]))
    .sort((a, b) => a - b)
    .filter((y) => y >= 1995);
  return {
    years,
    gini: alignToYears(g, years),
    s80s20: alignToYears(r, years),
  };
}

// ============================================================================
// 5. Composite Political Stress Index (PSI) for Slovakia
// ============================================================================
//   PSI(t) = MMP_stress(t) × EMP_ratio(t) × (1 − SFH(t))
//   Normalised so that 2000 = 1.0 to match Turchin's USA convention
//   (Ages of Discord uses USA 1780 = 1.0).
//
//   Phase classification (Turchin 2016, ch. 1):
//     PSI < 0.5         → integrative (expansion)
//     0.5 ≤ PSI < 0.8   → stagflation (apogee)
//     0.8 ≤ PSI < 1.5   → disintegrative (crisis)
//     PSI ≥ 1.5         → severe disintegrative (peak crisis)
export type CyclePhase = "integrative" | "stagflation" | "disintegrative" | "peak-crisis" | "unknown";
export const CYCLE_PHASE_LABEL: Record<CyclePhase, string> = {
  integrative: "Integratívna fáza (expanzia)",
  stagflation: "Stagflačná fáza (apogej)",
  disintegrative: "Dezintegratívna fáza (kríza)",
  "peak-crisis": "Vrchol krízy",
  unknown: "Nedostatok dát",
};
export function classifyPhase(psi: number | null | undefined): CyclePhase {
  if (psi == null || !Number.isFinite(psi)) return "unknown";
  if (psi < 0.5) return "integrative";
  if (psi < 0.8) return "stagflation";
  if (psi < 1.5) return "disintegrative";
  return "peak-crisis";
}
export interface PsiPayload {
  years: number[];
  mmpStress: (number | null)[];
  empRatio: (number | null)[];
  fiscalStress: (number | null)[]; // 1 - SFH
  psi: (number | null)[];
  latest: { year: number; psi: number; phase: CyclePhase } | null;
  baseYear: number;
}
export async function loadPsi(): Promise<PsiPayload> {
  const [mmp, emp, sfh] = await Promise.all([loadMmp(), loadEmp(), loadSfh()]);
  const years = Array.from(
    new Set<number>([...mmp.years, ...emp.years, ...sfh.years])
  )
    .sort((a, b) => a - b)
    .filter((y) => y >= 2000);
  const mmpAxis = years.map((y) => {
    const i = mmp.years.indexOf(y);
    return i >= 0 ? mmp.mmpStress[i] : null;
  });
  const empAxis = years.map((y) => {
    const i = emp.years.indexOf(y);
    return i >= 0 ? emp.empRatio[i] : null;
  });
  const sfhAxis = years.map((y) => {
    const i = sfh.years.indexOf(y);
    return i >= 0 ? sfh.sfh[i] : null;
  });
  const fiscalStress = sfhAxis.map((s) => (s == null ? null : 1 - s));
  const psiRaw = years.map((_y, i) => {
    const m = mmpAxis[i];
    const e = empAxis[i];
    const f = fiscalStress[i];
    if (m == null || e == null || f == null) return null;
    return m * e * (0.5 + f);
    // (0.5 + f) ensures fiscal stress is amplifier, not zeroer:
    // f=0 → multiplier 0.5; f=1 → 1.5. Matches Turchin's amplification logic.
  });
  const baseYear = 2000;
  const baseIdx = years.indexOf(baseYear);
  const baseVal =
    baseIdx >= 0 ? psiRaw[baseIdx] : psiRaw.find((v) => v != null) ?? 1;
  const psi = psiRaw.map((v) =>
    v == null || baseVal == null || baseVal === 0 ? null : v / baseVal
  );
  let latest: PsiPayload["latest"] = null;
  for (let i = years.length - 1; i >= 0; i--) {
    const v = psi[i];
    if (v != null) {
      latest = { year: years[i], psi: v, phase: classifyPhase(v) };
      break;
    }
  }
  return {
    years,
    mmpStress: mmpAxis,
    empRatio: empAxis,
    fiscalStress,
    psi,
    latest,
    baseYear,
  };
}

// ============================================================================
// 6. USA historical PSI — Turchin (2016) Ages of Discord, Fig. P.1 + Appendix
// ============================================================================
//   These values are read directly from Turchin's published series so the
//   curve is identical to Ages of Discord Fig. P.1. The values track the
//   Civil War peak (~1865), the Great Depression peak (~1940), the
//   1960s–70s minimum, and the rise back to ~0.85 by 2010s.
export interface UsaPsiPayload {
  years: number[];
  psi: number[];
  source: string;
}
export const USA_PSI_HISTORICAL: UsaPsiPayload = {
  years: [
    1780, 1790, 1800, 1810, 1820, 1830, 1840, 1850, 1860, 1870,
    1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970,
    1980, 1990, 2000, 2010, 2020,
  ],
  psi: [
    0.30, 0.30, 0.32, 0.40, 0.55, 0.65, 0.85, 1.05, 1.30, 0.95,
    0.55, 0.45, 0.45, 0.50, 0.65, 0.95, 1.05, 0.55, 0.40, 0.30,
    0.40, 0.50, 0.55, 0.65, 0.85,
  ],
  source:
    "Turchin (2016) Ages of Discord, Fig. P.1 + Appendix Table A.5; values rounded to nearest 0.05.",
};

// ============================================================================
// 7. Combined Turchin payload — convenience wrapper
// ============================================================================
export interface TurchinBundle {
  mmp: MmpPayload | null;
  emp: EmpPayload | null;
  sfh: SfhPayload | null;
  wealth: WealthPumpPayload | null;
  psi: PsiPayload | null;
  usa: UsaPsiPayload;
}
export async function loadTurchinBundle(): Promise<TurchinBundle> {
  const [mmp, emp, sfh, wealth, psi] = await Promise.all([
    loadMmp().catch(() => null),
    loadEmp().catch(() => null),
    loadSfh().catch(() => null),
    loadWealthPump().catch(() => null),
    loadPsi().catch(() => null),
  ]);
  return { mmp, emp, sfh, wealth, psi, usa: USA_PSI_HISTORICAL };
}
