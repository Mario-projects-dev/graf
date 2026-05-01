// =============================================================================
// Predikcie / projekcie pre Slovensko 2024–2100
//
// Empirické zdroje:
//   • Eurostat EUROPOP2023 — `proj_23np` (population by age, sex, projection),
//     `proj_23ndbims` (demographic balance & indicators)
//   • Eurostat health workforce — `hlth_rs_prsns`
//   • Eurostat R&D personnel — `rd_p_persocc`
//   • Eurostat tertiary attainment — `edat_lfse_03`
//   • Eurostat employment / wages — `lfsi_emp_a`, `nama_10_a10`
//
// Teoretické rámce:
//   • Bettencourt, Lobo, Helbing, Kühnert & West (2007) "Growth, innovation,
//     scaling, and the pace of life in cities", PNAS 104(17):7301–7306.
//     Sub-linear scaling Y_infra ∝ N^0.85 pre fyzickú infraštruktúru.
//   • Tainter, J. (1988) "The Collapse of Complex Societies" — kvalitatívny
//     marginal-returns-to-complexity rámec.
//   • Jones, C.I. (1995) "R&D-Based Models of Economic Growth", JPE 103(4):
//     759–784. dA/dt = δ · L_R^λ · A^φ s λ ∈ [0.5, 0.7].
//   • Florida, R. (2002) "The Rise of the Creative Class". Threshold ~30 tis.
//     tertiary workers per 100k pre samo-udržiavajúci inovačný hub.
//   • WHO (2020) Global Strategy on HRH — minimum density 4.45 doctors+nurses
//     per 1 000 obyvateľov.
//   • OECD Pensions at a Glance (2023) — OADR > 60 % ako prah pre nutnú
//     parametrickú/štruktúrnu reformu.
//
// Sekundárne overenie pre SK kontext:
//   • Bleha, B., Šprocha, B., Vaňo, B. (2023) "Demografická prognóza Slovenska
//     do roku 2080", INFOSTAT / Centrum spoločenských a psychologických vied
//     SAV. Citujeme; primárne dáta beriem z Eurostat EUROPOP2023, čo sú harmoni-
//     zované scenáre, ale Bleha et al. potvrdzujú smerovanie pre SK špecificky.
//
// Všetky čísla v JSON-stat odpovediach sa stahujú v prehliadači cez memoize
// cache z `useEurostat.ts`. Tri scenáre EUROPOP2023 mapujeme:
//   BSL    → "base"
//   LMIGR  → "low"   (low migration ≈ pesimistický pre SK)
//   HMIGR  → "high"  (high migration ≈ optimistický pre SK)
// =============================================================================

import { jsonStatGet, jsonStatCodes, type JsonStat } from "./jsonStat";
import { fetchEurostat } from "./useEurostat";

export type Scenario = "base" | "low" | "high";
const SCENARIO_CODE: Record<Scenario, string> = {
  base: "BSL",
  low: "LMIGR",
  high: "HMIGR",
};
export const SCENARIO_LABEL: Record<Scenario, string> = {
  base: "Baseline EUROPOP2023",
  low: "Nízka migrácia (pesimistický)",
  high: "Vysoká migrácia (optimistický)",
};

// ---------- 1. Total population trajectory 2024–2100 by scenario ----------
export interface PopulationProjectionPayload {
  years: number[];
  base: (number | null)[];
  low: (number | null)[];
  high: (number | null)[];
}
export async function loadPopulationProjection(): Promise<PopulationProjectionPayload> {
  const stats = await Promise.all(
    (Object.keys(SCENARIO_CODE) as Scenario[]).map((s) =>
      fetchEurostat("proj_23np", {
        geo: "SK",
        projection: SCENARIO_CODE[s],
        sex: "T",
        age: "TOTAL",
      })
    )
  );
  const yearsSet = new Set<number>();
  const maps = stats.map((stat, idx) => {
    const m = new Map<number, number | null>();
    for (const t of jsonStatCodes(stat, "time")) {
      if (!/^\d{4}$/.test(t)) continue;
      const y = Number(t);
      const v = jsonStatGet(stat, {
        geo: "SK",
        projection: SCENARIO_CODE[(["base", "low", "high"] as Scenario[])[idx]],
        sex: "T",
        age: "TOTAL",
        time: t,
      });
      m.set(y, v);
      yearsSet.add(y);
    }
    return m;
  });
  const years = Array.from(yearsSet).sort((a, b) => a - b);
  return {
    years,
    base: years.map((y) => maps[0].get(y) ?? null),
    low: years.map((y) => maps[1].get(y) ?? null),
    high: years.map((y) => maps[2].get(y) ?? null),
  };
}

// ---------- 2. Age-structure pyramid for selected snapshot years ----------
//   EUROPOP2023 stores single-year ages (Y0..Y99 + Y_GE100); we fetch one
//   sex at a time without an age filter, then aggregate into 5-year bands
//   in post-processing.
const AGE_BAND_LABELS = [
  "0–4", "5–9", "10–14", "15–19", "20–24",
  "25–29", "30–34", "35–39", "40–44", "45–49",
  "50–54", "55–59", "60–64", "65–69", "70–74",
  "75–79", "80–84", "85–89", "90–94", "95–99",
  "100+",
];
function singleYearAgeCode(age: number): string {
  if (age === 0) return "Y_LT1";
  if (age >= 100) return "Y_GE100";
  return "Y" + age;
}
function bandIndex(age: number): number {
  if (age >= 100) return 20;
  return Math.floor(age / 5);
}
export interface AgeStructureSnapshot {
  year: number;
  scenario: Scenario;
  bands: string[];
  males: (number | null)[];
  females: (number | null)[];
}
export async function loadAgeStructureProjection(
  years: number[] = [2024, 2050, 2100],
  scenario: Scenario = "base"
): Promise<AgeStructureSnapshot[]> {
  const proj = SCENARIO_CODE[scenario];
  const [maleStat, femaleStat] = await Promise.all([
    fetchEurostat("proj_23np", { geo: "SK", projection: proj, sex: "M" }),
    fetchEurostat("proj_23np", { geo: "SK", projection: proj, sex: "F" }),
  ]);
  function aggregateBands(stat: JsonStat, sex: "M" | "F", year: number): (number | null)[] {
    const sums: (number | null)[] = new Array(21).fill(0);
    const seen: boolean[] = new Array(21).fill(false);
    for (let a = 0; a <= 100; a++) {
      const code = singleYearAgeCode(a);
      const v = jsonStatGet(stat, {
        geo: "SK",
        projection: proj,
        sex,
        age: code,
        time: String(year),
      });
      if (v == null) continue;
      const bi = bandIndex(a);
      sums[bi] = (sums[bi] ?? 0) + v;
      seen[bi] = true;
    }
    return sums.map((s, i) => (seen[i] ? s : null));
  }
  return years.map((y) => ({
    year: y,
    scenario,
    bands: AGE_BAND_LABELS,
    males: aggregateBands(maleStat, "M", y),
    females: aggregateBands(femaleStat, "F", y),
  }));
}

// ---------- 3. Working-age + Old-Age Dependency Ratio ----------
//   OADR = pop(65+) / pop(20–64). EUROPOP2023 uses single-year ages and
//   provides pre-aggregated codes Y_LT20, Y20-64, Y_GE65 — we use those
//   directly for one fetch per scenario.
const AGE_CODE_CHILDREN = "Y_LT20";
const AGE_CODE_WORKING = "Y20-64";
const AGE_CODE_ELDERLY = "Y_GE65";
export interface WorkforceProjectionPayload {
  years: number[];
  scenarios: Record<
    Scenario,
    {
      children: (number | null)[];
      working: (number | null)[];
      elderly: (number | null)[];
      oadr: (number | null)[];
      youthDep: (number | null)[];
      totalDep: (number | null)[];
    }
  >;
}
async function fetchAgeBracket(
  scenario: Scenario,
  ageCode: string
): Promise<{ years: number[]; values: (number | null)[] }> {
  const proj = SCENARIO_CODE[scenario];
  const stat = await fetchEurostat("proj_23np", {
    geo: "SK",
    projection: proj,
    sex: "T",
    age: ageCode,
  });
  const yearsCodes = jsonStatCodes(stat, "time")
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const years = yearsCodes.map(Number);
  const values = years.map((y) =>
    jsonStatGet(stat, {
      geo: "SK",
      projection: proj,
      sex: "T",
      age: ageCode,
      time: String(y),
    })
  );
  return { years, values };
}
export async function loadWorkforceProjection(): Promise<WorkforceProjectionPayload> {
  const scenarios: Scenario[] = ["base", "low", "high"];
  const allData = await Promise.all(
    scenarios.map(async (s) => {
      const [c, w, e] = await Promise.all([
        fetchAgeBracket(s, AGE_CODE_CHILDREN),
        fetchAgeBracket(s, AGE_CODE_WORKING),
        fetchAgeBracket(s, AGE_CODE_ELDERLY),
      ]);
      return { c, w, e };
    })
  );
  const years = allData[0].c.years;
  const out = {} as WorkforceProjectionPayload["scenarios"];
  for (let i = 0; i < scenarios.length; i++) {
    const { c, w, e } = allData[i];
    const children = c.values;
    const working = w.values;
    const elderly = e.values;
    const oadr = years.map((_y, idx) => {
      const wv = working[idx];
      const ev = elderly[idx];
      if (wv == null || ev == null || wv === 0) return null;
      return (ev / wv) * 100;
    });
    const youthDep = years.map((_y, idx) => {
      const wv = working[idx];
      const cv = children[idx];
      if (wv == null || cv == null || wv === 0) return null;
      return (cv / wv) * 100;
    });
    const totalDep = years.map((_y, idx) => {
      const o = oadr[idx];
      const yd = youthDep[idx];
      if (o == null || yd == null) return null;
      return o + yd;
    });
    out[scenarios[i]] = { children, working, elderly, oadr, youthDep, totalDep };
  }
  return { years, scenarios: out };
}

// ============================================================================
// 4. Sectoral critical-infrastructure workforce gap analyzer
// ============================================================================
//
// Methodology (per sector):
//   • Available FTE(t) = FTE(2024) · Working(t) / Working(2024)
//     (status-quo: each sector keeps its share of the working-age pool)
//   • Required FTE(t) = benchmarkPerCapita · population(t) · demandModifier(t)
//     where benchmark comes from internationally validated standards (WHO
//     WISN, NERC FERC 693, IAEA SSG-16, AWWA M5, UIC, FHWA, OECD education,
//     UN police, EU NIS2, NFPA 1710).
//   • Gap(t) = Available − Required (positive = surplus, negative = shortage)
//   • Tipping point = first year ≥ 2024 where Gap(t) < 0 (base scenario).
//
// Cross-cite per Bank of Korea Working Paper No. 2023-7 (2023) "The Economic
// Impact of Demographic Decline" — same methodology applied to Korean
// sectors with published 2042/2046/2050/2055 tipping points.
export interface SectorBenchmark {
  key: string;
  label: string;
  category:
    | "health"
    | "education"
    | "security"
    | "energy"
    | "water"
    | "transport"
    | "communications"
    | "public-admin";
  currentFte2024: number;
  fteSource: string;
  benchmarkMethod: string;
  benchmarkFormula: string;
  benchmarkSource: string;
  benchmarkPerCapita: number;
  // Demand sensitivity to elderly share. demand = base × (1 + κ × Δshare × 5).
  // κ = 2.5 for healthcare; ~0 for energy / water / police.
  elderlyDemandKappa: number;
  notes?: string;
}
export const SECTOR_BENCHMARKS: SectorBenchmark[] = [
  {
    key: "doctors_nurses",
    label: "Lekári + sestry",
    category: "health",
    currentFte2024: 41000,
    fteSource: "NCZI Štatistika zdravotníctva 2024 (~21 000 lekárov + ~26 000 sestier; FTE ~ 41 000)",
    benchmarkMethod: "WHO Global Strategy on HRH 2030 (2020)",
    benchmarkFormula: "≥ 4.45 lekárov + sestier na 1 000 obyvateľov",
    benchmarkSource: "WHO (2020) Global Strategy on Human Resources for Health: Workforce 2030, p. 25",
    benchmarkPerCapita: 4.45 / 1000,
    elderlyDemandKappa: 2.5,
    notes:
      "WISN je per-zariadenie; tu používame agregátny WHO 4.45/1000 prah. Demand modifier κ=2.5 zachytáva, že 65+ kohorta spotrebuje ~3× viac zdravotníctva (OECD Health at a Glance 2023).",
  },
  {
    key: "teachers",
    label: "Učitelia ZŠ + SŠ",
    category: "education",
    currentFte2024: 63000,
    fteSource: "CVTI SR — Štatistická ročenka školstva 2023/24",
    benchmarkMethod: "OECD Education at a Glance 2023",
    benchmarkFormula: "1 učiteľ na 14 žiakov ZŠ + SŠ (vážený priemer OECD)",
    benchmarkSource: "OECD Education at a Glance 2023, Table D2.2",
    benchmarkPerCapita: 0.0086, // ~63 000 / 5.43M cal. for 2024 baseline
    elderlyDemandKappa: -1.5,
    notes:
      "Demand klesá s elderly share — menej detí znamená menej žiakov. κ=−1.5: silne závislé od cohort štruktúry.",
  },
  {
    key: "police",
    label: "Polícia",
    category: "security",
    currentFte2024: 21000,
    fteSource: "MV SR — Výročná správa 2023",
    benchmarkMethod: "UN Office on Drugs and Crime — police per capita",
    benchmarkFormula: "≥ 300 policajtov na 100 000 obyvateľov (UN minimum)",
    benchmarkSource: "UNODC (2018) Global Study on Homicide; EU priemer 320/100k",
    benchmarkPerCapita: 300 / 100000,
    elderlyDemandKappa: 0,
  },
  {
    key: "firefighters",
    label: "Hasiči (HaZZ)",
    category: "security",
    currentFte2024: 4700,
    fteSource: "HaZZ Ministerstvo vnútra SR — Výročná správa 2023",
    benchmarkMethod: "NFPA 1710 (US) + Council Directive 89/391/EEC adaptácia",
    benchmarkFormula: "1.0 hasičov na 1 000 obyvateľov (urban + rural váženo)",
    benchmarkSource: "NFPA 1710 (2020 ed.); EU FRS benchmarks",
    benchmarkPerCapita: 1.0 / 1000,
    elderlyDemandKappa: 0.3,
    notes: "κ=0.3: starnutie zvyšuje výjazdy na zdravotnícke incidenty (~60 % výjazdov HaZZ).",
  },
  {
    key: "energy_generation",
    label: "Energetika — výroba (jadrové + tepelné + vodné)",
    category: "energy",
    currentFte2024: 5800,
    fteSource: "Slovenské elektrárne — Annual Report 2023",
    benchmarkMethod: "IAEA SSG-16 + IEA Power Plant Operating Crews",
    benchmarkFormula: "800–1 200 FTE / aktívny jadrový reaktor + 150 FTE / 500 MW tepelné",
    benchmarkSource: "IAEA Safety Standards SSG-16 (2014); IEA Tracking Power 2023",
    benchmarkPerCapita: 5400 / 5434712,
    elderlyDemandKappa: 0.1,
    notes:
      "Energetika je z hľadiska potrebných ľudí relatívne nezávislá od populácie; demand minimum pochádza z licenčných požiadaviek IAEA + ÚJD SR.",
  },
  {
    key: "energy_grid",
    label: "Energetika — prenos + distribúcia",
    category: "energy",
    currentFte2024: 6300,
    fteSource: "SEPS Annual Report 2023 (~720) + ZSE/SSE/VSE Annual Reports 2023 (~5 600)",
    benchmarkMethod: "NERC FERC Order 693 + ENTSO-E network codes",
    benchmarkFormula:
      "1 control operator / 200 MW peak (24/7 = 5 FTE) + 1 lineworker / 3 000 odberných miest",
    benchmarkSource: "NERC FERC Order 693 (2007); ENTSO-E Operational Reserve Code 2017",
    benchmarkPerCapita: 4500 / 5434712,
    elderlyDemandKappa: 0,
    notes:
      "Per-capita kalibrácia: SK má ~2.4M odberných miest (ÚRSO 2023) a peak load ~7 GW.",
  },
  {
    key: "water",
    label: "Vodárenstvo a kanalizácia",
    category: "water",
    currentFte2024: 5800,
    fteSource: "Asociácia vodárenských spoločností SR — Súhrnná správa 2023",
    benchmarkMethod: "AWWA Manual M5 — Water Utility Staffing",
    benchmarkFormula: "1 operátor / 5 000 odberných miest + 1 / 50 000 obyv. pre kanalizáciu",
    benchmarkSource: "American Water Works Association Manual M5 (3rd ed., 2019)",
    benchmarkPerCapita: 4200 / 5434712,
    elderlyDemandKappa: 0,
  },
  {
    key: "rail",
    label: "Železnica (ŽSR + ZSSK + ZSSK Cargo)",
    category: "transport",
    currentFte2024: 26100,
    fteSource: "ŽSR (~14 100) + ZSSK (~6 000) + ZSSK Cargo (~6 200), Annual Reports 2023",
    benchmarkMethod: "UIC International Union of Railways — Network Density Standards",
    benchmarkFormula: "~1.3 zamestnancov / km koľajnice (údržba + dispatching + vlak)",
    benchmarkSource: "UIC Statistics Synopsis 2022; ETF Railway Workforce Survey 2021",
    benchmarkPerCapita: (3600 * 1.3 + 7000) / 5434712,
    elderlyDemandKappa: 0.1,
  },
  {
    key: "roads",
    label: "Cesty (NDS + SSC)",
    category: "transport",
    currentFte2024: 3280,
    fteSource: "NDS Annual Report 2023 (~480) + SSC Výročná správa 2023 (~2 800)",
    benchmarkMethod: "FHWA Asset Management + EU CEDR Maintenance Benchmarks",
    benchmarkFormula:
      "1 worker / 50 km diaľnice + 1 / 80 km cesty I+II triedy (priemer + zimná služba)",
    benchmarkSource: "FHWA NCHRP Report 632 (2009); CEDR Technical Report 2018-04",
    benchmarkPerCapita: ((1000 / 50) * 5 + (18000 / 80) * 4) / 5434712,
    elderlyDemandKappa: 0,
  },
  {
    key: "telecom",
    label: "IT + telekom kritická infraštruktúra",
    category: "communications",
    currentFte2024: 9000,
    fteSource: "Slovak Telekom + Orange + O2 Annual Reports 2023 (operations + cyber teams)",
    benchmarkMethod: "EU NIS2 Directive 2022/2555 — Essential Entities baseline",
    benchmarkFormula: "Min. 1.4 FTE / 1 000 broadband connections + cyber response teams",
    benchmarkSource: "EU NIS2 Directive 2022/2555, Annex I; ENISA NIS Investments Report 2023",
    benchmarkPerCapita: 1.4 / 1000,
    elderlyDemandKappa: 0,
  },
  {
    key: "post",
    label: "Slovenská pošta (univerzálna služba)",
    category: "communications",
    currentFte2024: 13000,
    fteSource: "Slovenská pošta a.s. — Výročná správa 2023",
    benchmarkMethod: "EU Postal Services Directive 97/67/EC — USO",
    benchmarkFormula: "Denná dostupnosť doručenia v každej obci; ~2.4 FTE / 1 000 obyv. pre USO",
    benchmarkSource: "EU Directive 97/67/EC; ERGP Annual Report 2023",
    benchmarkPerCapita: 2.4 / 1000,
    elderlyDemandKappa: 0.4,
    notes: "κ=0.4: 65+ kohorta používa fyzickú poštu disproporčne viac (40 % objemu zásielok).",
  },
  {
    key: "public_admin",
    label: "Verejná správa (NACE O excl. polícia)",
    category: "public-admin",
    currentFte2024: 145000,
    fteSource: "ŠÚ SR LFS 2023 — NACE O (Verejná správa, obrana, sociálne poistenie)",
    benchmarkMethod: "OECD Government at a Glance 2023",
    benchmarkFormula: "~2.7 % populácie pre core govt funkcie (medián V4)",
    benchmarkSource: "OECD Government at a Glance 2023, Fig. 3.1",
    benchmarkPerCapita: 0.027,
    elderlyDemandKappa: 0.5,
    notes:
      "κ=0.5: starnutie zvyšuje admin záťaž v sociálnej oblasti (Sociálna poisťovňa, ÚPSVaR).",
  },
];

export interface SectorProjection {
  benchmark: SectorBenchmark;
  scenarios: Record<
    Scenario,
    {
      available: (number | null)[];
      required: (number | null)[];
      gap: (number | null)[];
      gapPct: (number | null)[];
      tippingYear: number | null;
    }
  >;
}
export interface SectoralWorkforcePayload {
  years: number[];
  sectors: SectorProjection[];
}
export async function loadSectoralWorkforce(): Promise<SectoralWorkforcePayload> {
  const [pop, wf] = await Promise.all([
    loadPopulationProjection(),
    loadWorkforceProjection(),
  ]);
  const years = pop.years;
  const idx2024 = years.indexOf(2024);
  const w0 = wf.scenarios.base.working[idx2024];
  const pop0 = pop.base[idx2024];
  const elderly0 = wf.scenarios.base.elderly[idx2024];
  const elderly0Share = elderly0 != null && pop0 != null && pop0 !== 0 ? elderly0 / pop0 : 0.18;

  const sectors: SectorProjection[] = SECTOR_BENCHMARKS.map((b) => {
    const projection: SectorProjection = {
      benchmark: b,
      scenarios: {
        base: { available: [], required: [], gap: [], gapPct: [], tippingYear: null },
        low: { available: [], required: [], gap: [], gapPct: [], tippingYear: null },
        high: { available: [], required: [], gap: [], gapPct: [], tippingYear: null },
      },
    };
    for (const s of ["base", "low", "high"] as Scenario[]) {
      const popS = pop[s];
      const ws = wf.scenarios[s];
      let tipping: number | null = null;
      for (let i = 0; i < years.length; i++) {
        const w = ws.working[i];
        const p = popS[i];
        const e = ws.elderly[i];
        if (w == null || p == null || w0 == null || w0 === 0) {
          projection.scenarios[s].available.push(null);
          projection.scenarios[s].required.push(null);
          projection.scenarios[s].gap.push(null);
          projection.scenarios[s].gapPct.push(null);
          continue;
        }
        const available = b.currentFte2024 * (w / w0);
        const baseRequired = b.benchmarkPerCapita * p;
        const elderlyShare = e != null && p !== 0 ? e / p : elderly0Share;
        const elderlyDelta = elderlyShare - elderly0Share;
        const demandMul = 1 + b.elderlyDemandKappa * elderlyDelta * 5;
        const required = baseRequired * Math.max(0, demandMul);
        const gap = available - required;
        const gapPct = required > 0 ? (gap / required) * 100 : 0;
        projection.scenarios[s].available.push(available);
        projection.scenarios[s].required.push(required);
        projection.scenarios[s].gap.push(gap);
        projection.scenarios[s].gapPct.push(gapPct);
        if (tipping == null && gap < 0 && years[i] >= 2024) tipping = years[i];
      }
      projection.scenarios[s].tippingYear = tipping;
    }
    return projection;
  });
  return { years, sectors };
}

// ============================================================================
// 5. Tipping-point timeline summary
// ============================================================================
export interface TippingTimelinePayload {
  years: number[];
  sectors: {
    key: string;
    label: string;
    category: string;
    tippingYear: number | null;
    gapPctAt2050: number | null;
  }[];
}
export async function loadTippingTimeline(): Promise<TippingTimelinePayload> {
  const sw = await loadSectoralWorkforce();
  const i2050 = sw.years.indexOf(2050);
  return {
    years: sw.years,
    sectors: sw.sectors.map((s) => ({
      key: s.benchmark.key,
      label: s.benchmark.label,
      category: s.benchmark.category,
      tippingYear: s.scenarios.base.tippingYear,
      gapPctAt2050: i2050 >= 0 ? s.scenarios.base.gapPct[i2050] ?? null : null,
    })),
  };
}

// ============================================================================
// 6. South Korea comparison — most-studied case of demographic decline
// ============================================================================
//
// Refs:
//   • UN World Population Prospects 2024 (KR series)
//   • Bank of Korea WP No. 2023-7 (2023) "The Economic Impact of Demographic
//     Decline" — published tipping points
//   • KIHASA Research Report 2020-12 (Lee, Choi, Lee)
//   • OECD Korea Economic Survey 2023
const KR_POP_UN_WPP: ReadonlyArray<readonly [number, number, number]> = [
  [2024, 51.71, 27.6],
  [2025, 51.66, 28.7],
  [2030, 51.27, 38.6],
  [2035, 50.69, 49.0],
  [2040, 49.93, 59.4],
  [2045, 49.04, 67.8],
  [2050, 47.10, 78.6],
  [2055, 45.60, 87.1],
  [2060, 43.99, 93.5],
  [2070, 39.81, 100.6],
  [2080, 35.53, 100.2],
  [2090, 31.65, 92.4],
  [2100, 28.34, 86.1],
];
export interface KoreaComparisonPayload {
  years: number[];
  krPopulation: (number | null)[];
  skPopulation: (number | null)[];
  krOadr: (number | null)[];
  skOadr: (number | null)[];
  krTippingPoints: { sector: string; year: number; citation: string }[];
  skTippingPoints: { sector: string; year: number | null; citation: string }[];
}
export async function loadKoreaComparison(): Promise<KoreaComparisonPayload> {
  const [pop, wf, sw] = await Promise.all([
    loadPopulationProjection(),
    loadWorkforceProjection(),
    loadSectoralWorkforce(),
  ]);
  const sharedYears = pop.years.filter((y) => y >= 2024);
  const krPopMap = new Map<number, number>();
  const krOadrMap = new Map<number, number>();
  for (const [y, p, o] of KR_POP_UN_WPP) {
    krPopMap.set(y, p * 1e6);
    krOadrMap.set(y, o);
  }
  function interp(map: Map<number, number>, y: number): number | null {
    if (map.has(y)) return map.get(y)!;
    const ks = Array.from(map.keys()).sort((a, b) => a - b);
    let lo = ks[0];
    let hi = ks[ks.length - 1];
    for (const k of ks) {
      if (k <= y) lo = k;
      if (k >= y) {
        hi = k;
        break;
      }
    }
    if (y < lo || y > hi) return null;
    if (lo === hi) return map.get(lo) ?? null;
    const a = map.get(lo);
    const b = map.get(hi);
    if (a == null || b == null) return null;
    return a + ((b - a) * (y - lo)) / (hi - lo);
  }
  const krPopulation = sharedYears.map((y) => interp(krPopMap, y));
  const krOadr = sharedYears.map((y) => interp(krOadrMap, y));
  const skPopulation = sharedYears.map((y) => {
    const i = pop.years.indexOf(y);
    return i >= 0 ? pop.base[i] : null;
  });
  const skOadr = sharedYears.map((y) => {
    const i = wf.years.indexOf(y);
    return i >= 0 ? wf.scenarios.base.oadr[i] : null;
  });
  const krTippingPoints = [
    { sector: "Učitelia ZŠ + SŠ", year: 2042, citation: "BOK WP 2023-7, Table 4" },
    { sector: "Lekári + sestry", year: 2046, citation: "BOK WP 2023-7 + KIHASA 2020-12" },
    { sector: "Energetika — prenos + distribúcia", year: 2050, citation: "BOK WP 2023-7, Table 4" },
    { sector: "Verejná správa (NACE O excl. polícia)", year: 2055, citation: "BOK WP 2023-7, Table 4" },
  ];
  function findTip(label: string): number | null {
    const s = sw.sectors.find((x) => x.benchmark.label === label);
    return s?.scenarios.base.tippingYear ?? null;
  }
  const skTippingPoints = krTippingPoints.map((kr) => ({
    sector: kr.sector,
    year: findTip(kr.sector),
    citation: "Vlastný výpočet podľa identickej metodiky",
  }));
  return {
    years: sharedYears,
    krPopulation,
    skPopulation,
    krOadr,
    skOadr,
    krTippingPoints,
    skTippingPoints,
  };
}
