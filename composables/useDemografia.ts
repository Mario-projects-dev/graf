// High-level loaders for the demografia page. Each returns a normalized
// payload + a SourceTag so the UI can render a badge.
import {
  fixOtherDims,
  findMonthDim,
  findTimeDim,
  jsonStatCodes,
  jsonStatGet,
  monthIndexFromCode,
  pickCodeByLabel,
  pickTotalCode,
} from "./jsonStat";
import { fetchDatacube, DC_PATHS } from "./useDatacube";
import { fetchEurostat } from "./useEurostat";
import { DISTRICT_NAMES } from "./districts";

export type SourceTag = "datacube" | "eurostat" | "offline" | "err";

export interface ChainResult<T> {
  ok: boolean;
  data?: T;
  source: string;
  tag: SourceTag;
  errors?: string[];
}

export interface YearlyPoint {
  year: number;
  v: number;
}

export interface MonthlyPayload {
  labels: string[];
  births: number[];
  deaths: number[];
}

export interface PyramidBand {
  label: string;
  m: number;
  f: number;
}

export interface PyramidPayload {
  year: number;
  bands: PyramidBand[];
}

export interface DistrictPayload {
  year: number;
  grow: Record<string, number>;
  names: Record<string, string>;
  isEstimate: boolean;
}

const SK_MON = ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"];

// ============================ DATAcube loaders ============================

let _yearlyDcPromise: Promise<YearlyPoint[]> | null = null;
async function dcYearly(): Promise<YearlyPoint[]> {
  if (_yearlyDcPromise) return _yearlyDcPromise;
  _yearlyDcPromise = (async () => {
    const stat = await fetchDatacube(DC_PATHS.yearly);
    const timeDim = findTimeDim(stat);
    if (!timeDim) throw new Error("om7017rr: chýba dim. času");
    const fixed: Record<string, string> = {};
    for (const d of stat.id) {
      if (d === timeDim) continue;
      if (/_vit$/.test(d)) {
        fixed[d] = pickCodeByLabel(stat, d, /^živé$/i) || pickTotalCode(stat, d);
      } else {
        fixed[d] = pickTotalCode(stat, d);
      }
    }
    return jsonStatCodes(stat, timeDim)
      .filter((t) => /^\d{4}$/.test(t))
      .map((t) => ({
        year: Number(t),
        v: jsonStatGet(stat, { ...fixed, [timeDim]: t }) as number,
      }))
      .filter((r) => r.v != null && Number.isFinite(r.year))
      .sort((a, b) => a.year - b.year);
  })();
  return _yearlyDcPromise;
}

async function dcMonthly(): Promise<MonthlyPayload> {
  const stat = await fetchDatacube(DC_PATHS.monthly);
  const timeDim = findTimeDim(stat);
  const monthDim = findMonthDim(stat);
  if (!timeDim || !monthDim) throw new Error("om2801ms: chýba dim. času/mesiaca");
  let indicDim: string | null = null;
  let birthCode: string | null = null;
  let deathCode: string | null = null;
  for (const d of stat.id) {
    if (d === timeDim || d === monthDim) continue;
    const labels = stat.dimension[d].category.label || {};
    const idx = stat.dimension[d].category.index;
    for (const c of Object.keys(idx)) {
      const lbl = (labels[c] || "").toLowerCase();
      if (!birthCode && lbl.includes("živonarod")) {
        indicDim = d;
        birthCode = c;
      }
      if (!deathCode && lbl.includes("zomret")) {
        indicDim = d;
        deathCode = c;
      }
    }
  }
  if (!birthCode && !deathCode)
    throw new Error("om2801ms: chýbajú indikátory živonarod./zomret.");
  const exclude = [timeDim, monthDim];
  if (indicDim) exclude.push(indicDim);
  const fixed = fixOtherDims(stat, exclude);
  const times = jsonStatCodes(stat, timeDim).filter((t) => /^\d{4}$/.test(t)).sort();
  const months = jsonStatCodes(stat, monthDim)
    .slice()
    .sort((a, b) => monthIndexFromCode(a) - monthIndexFromCode(b));
  const labels: string[] = [];
  const births: number[] = [];
  const deaths: number[] = [];
  for (const y of times) {
    for (let i = 0; i < Math.min(12, months.length); i++) {
      const m = months[i];
      const mi = monthIndexFromCode(m);
      const bv = birthCode && indicDim
        ? jsonStatGet(stat, { ...fixed, [indicDim]: birthCode, [timeDim]: y, [monthDim]: m })
        : null;
      const dv = deathCode && indicDim
        ? jsonStatGet(stat, { ...fixed, [indicDim]: deathCode, [timeDim]: y, [monthDim]: m })
        : null;
      if (bv == null && dv == null) continue;
      labels.push(SK_MON[mi - 1] + " " + y);
      births.push(bv as number);
      deaths.push(dv as number);
    }
  }
  return { labels, births, deaths };
}

async function dcDistricts(): Promise<DistrictPayload> {
  const stat = await fetchDatacube(DC_PATHS.districts);
  const timeDim = findTimeDim(stat);
  if (!timeDim) throw new Error("om7013rr: chýba dim. času");
  const territoryDim = stat.id.find(
    (d) =>
      d !== timeDim && Object.keys(stat.dimension[d].category.index).length >= 50
  );
  if (!territoryDim) throw new Error("om7013rr: chýba dim. územia");
  const exclude = [timeDim, territoryDim];
  const fixed = fixOtherDims(stat, exclude);
  const times = jsonStatCodes(stat, timeDim).filter((t) => /^\d{4}$/.test(t)).sort();
  const useYear = times[times.length - 1];
  fixed[timeDim] = useYear;
  const territoryCodes = Object.keys(stat.dimension[territoryDim].category.index);
  const territoryLabels = stat.dimension[territoryDim].category.label || {};
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
  const grow: Record<string, number> = {};
  const names: Record<string, string> = {};
  for (const tc of territoryCodes) {
    if (!/^SK0[A-Z0-9]{3}$/i.test(tc)) continue;
    const v = jsonStatGet(stat, { ...fixed, [territoryDim]: tc });
    if (v == null) continue;
    const lbl = territoryLabels[tc] || "";
    const idn3 = nameToIdn3[norm(lbl)];
    if (idn3) {
      grow[idn3] = v;
      names[idn3] = DISTRICT_NAMES[idn3] || lbl;
    }
  }
  const expected = Object.keys(DISTRICT_NAMES).length;
  if (Object.keys(grow).length < expected * 0.7) {
    throw new Error(
      "om7013rr: namapovaných " +
        Object.keys(grow).length +
        "/" +
        expected +
        " okresov"
    );
  }
  return { year: Number(useYear), grow, names, isEstimate: false };
}

// ============================ Eurostat fallbacks ============================

async function esYearly(): Promise<YearlyPoint[]> {
  const stat = await fetchEurostat("demo_gind", { geo: "SK", indic_de: "NATBIR" });
  return jsonStatCodes(stat, "time")
    .map((t) => ({
      year: Number(t),
      v: jsonStatGet(stat, { geo: "SK", indic_de: "NATBIR", time: t }) as number,
    }))
    .filter((r) => Number.isFinite(r.year) && r.v != null)
    .sort((a, b) => a.year - b.year);
}

async function esMonthly(): Promise<MonthlyPayload> {
  const [bs, ds] = await Promise.all([
    fetchEurostat("demo_fmonth", { geo: "SK", sex: "T" }),
    fetchEurostat("demo_mmonth", { geo: "SK", sex: "T" }),
  ]);
  const months = ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12"];
  const yearsAll = Array.from(
    new Set([...jsonStatCodes(bs, "time"), ...jsonStatCodes(ds, "time")])
  )
    .filter((t) => /^\d{4}$/.test(t))
    .sort();
  const labels: string[] = [];
  const births: number[] = [];
  const deaths: number[] = [];
  for (const y of yearsAll) {
    for (let i = 0; i < 12; i++) {
      const bv = jsonStatGet(bs, { geo: "SK", sex: "T", month: months[i], time: y });
      const dv = jsonStatGet(ds, { geo: "SK", sex: "T", month: months[i], time: y });
      if (bv == null && dv == null) continue;
      labels.push(SK_MON[i] + " " + y);
      births.push(bv as number);
      deaths.push(dv as number);
    }
  }
  return { labels, births, deaths };
}

async function esPyramid(): Promise<PyramidPayload> {
  const stat = await fetchEurostat("demo_pjan", { geo: "SK" });
  const times = jsonStatCodes(stat, "time");
  const useYear = times[times.length - 1];
  const bands: PyramidBand[] = [];
  for (let start = 0; start < 100; start += 5) {
    let m = 0;
    let f = 0;
    let ok = false;
    for (let a = start; a < start + 5; a++) {
      const code = a === 0 ? "Y_LT1" : "Y" + a;
      const mv = jsonStatGet(stat, { geo: "SK", sex: "M", age: code, time: useYear });
      const fv = jsonStatGet(stat, { geo: "SK", sex: "F", age: code, time: useYear });
      if (mv != null) {
        m += mv;
        ok = true;
      }
      if (fv != null) {
        f += fv;
        ok = true;
      }
    }
    if (ok) bands.push({ label: start + "–" + (start + 4), m, f });
  }
  const m100 = jsonStatGet(stat, { geo: "SK", sex: "M", age: "Y_OPEN", time: useYear });
  const f100 = jsonStatGet(stat, { geo: "SK", sex: "F", age: "Y_OPEN", time: useYear });
  if (m100 != null || f100 != null)
    bands.push({ label: "100+", m: m100 || 0, f: f100 || 0 });
  return { year: Number(useYear), bands };
}

// ============================ chain executor ============================

interface ChainStep<T> {
  name: string;
  tag: SourceTag;
  fn: () => Promise<T>;
}

async function runChain<T>(steps: ChainStep<T>[]): Promise<ChainResult<T>> {
  const errors: string[] = [];
  for (const step of steps) {
    try {
      const data = await step.fn();
      return { ok: true, data, source: step.name, tag: step.tag };
    } catch (e: unknown) {
      errors.push(
        step.name + ": " + (e instanceof Error ? e.message : String(e))
      );
      // eslint-disable-next-line no-console
      console.warn(step.name + " zlyhal:", e);
    }
  }
  return { ok: false, source: "offline", tag: "offline", errors };
}

// ============================ public API ============================

export function loadYearly(): Promise<ChainResult<YearlyPoint[]>> {
  return runChain([
    { name: "DATAcube om7017rr", tag: "datacube", fn: dcYearly },
    { name: "Eurostat demo_gind", tag: "eurostat", fn: esYearly },
  ]);
}

export function loadMonthly(): Promise<ChainResult<MonthlyPayload>> {
  return runChain([
    { name: "DATAcube om2801ms", tag: "datacube", fn: dcMonthly },
    { name: "Eurostat demo_fmonth+demo_mmonth", tag: "eurostat", fn: esMonthly },
  ]);
}

export function loadPyramid(): Promise<ChainResult<PyramidPayload>> {
  return runChain([
    { name: "Eurostat demo_pjan", tag: "eurostat", fn: esPyramid },
  ]);
}

export function loadDistricts(): Promise<ChainResult<DistrictPayload>> {
  return runChain([
    { name: "DATAcube om7013rr", tag: "datacube", fn: dcDistricts },
  ]);
}

// ============================ KPI strip ============================

export interface DemoKpi {
  v: number | null;
  year: string;
}
export interface DemoKpis {
  tfr: DemoKpi;
  lifeExp: DemoKpi;
  medianAge: DemoKpi;
  naturalRate: DemoKpi;
  ageMother1: DemoKpi;
}

async function latestFromEurostat(
  dataset: string,
  filters: Record<string, string>
): Promise<DemoKpi> {
  const stat = await fetchEurostat(dataset, filters);
  const times = jsonStatCodes(stat, "time").filter((t) => /^\d{4}$/.test(t)).sort();
  for (let i = times.length - 1; i >= 0; i--) {
    const t = times[i];
    const v = jsonStatGet(stat, { ...filters, time: t });
    if (v != null) return { v, year: t };
  }
  return { v: null, year: times[times.length - 1] || "" };
}

export async function loadDemografiaKpis(): Promise<DemoKpis> {
  const [tfr, lifeExp, medianAge, naturalRate, ageMother1] = await Promise.all([
    latestFromEurostat("demo_find", { geo: "SK", indic_de: "TOTFERRT" }),
    latestFromEurostat("demo_mlexpec", {
      geo: "SK",
      sex: "T",
      age: "Y_LT1",
      unit: "YR",
    }),
    latestFromEurostat("demo_pjanind", {
      geo: "SK",
      indic_de: "MEDAGEPOP",
    }),
    latestFromEurostat("demo_gind", { geo: "SK", indic_de: "NATGROWRT" }),
    latestFromEurostat("demo_find", { geo: "SK", indic_de: "AGEMOTH1" }),
  ]);
  return { tfr, lifeExp, medianAge, naturalRate, ageMother1 };
}
