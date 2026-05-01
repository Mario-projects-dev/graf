// Minimal JSON-stat 2.0 helpers shared by Eurostat + DATAcube fetchers.

export interface JsonStat {
  id: string[];
  size: number[];
  dimension: Record<
    string,
    {
      category: {
        index: Record<string, number>;
        label?: Record<string, string>;
      };
    }
  >;
  value: number[] | Record<string, number>;
}

export function jsonStatGet(
  stat: JsonStat,
  codes: Record<string, string>
): number | null {
  let linear = 0;
  for (let i = 0; i < stat.id.length; i++) {
    const dim = stat.id[i];
    let code = codes[dim];
    if (code === undefined) {
      const idxMap = stat.dimension[dim].category.index;
      code = Object.keys(idxMap).sort((a, b) => idxMap[a] - idxMap[b])[0];
    }
    const idx = stat.dimension[dim].category.index[code];
    if (idx === undefined) return null;
    linear = linear * stat.size[i] + idx;
  }
  const v = Array.isArray(stat.value)
    ? stat.value[linear]
    : (stat.value as Record<string, number>)[String(linear)];
  return typeof v === "number" ? v : null;
}

export function jsonStatCodes(stat: JsonStat, dim: string): string[] {
  const idx = stat.dimension[dim].category.index;
  return Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
}

export function findTimeDim(stat: JsonStat): string | undefined {
  return stat.id.find((d) => {
    const codes = Object.keys(stat.dimension[d].category.index);
    return codes.length > 1 && codes.every((c) => /^\d{4}$/.test(c));
  });
}

export function findMonthDim(stat: JsonStat): string | undefined {
  return stat.id.find((d) => {
    const codes = Object.keys(stat.dimension[d].category.index);
    if (codes.length < 12 || codes.length > 14) return false;
    return codes.every((c) => /^\d{1,2}\.?$/.test(c) || /^M\d{2}$/i.test(c));
  });
}

export function monthIndexFromCode(c: string): number {
  const m = String(c).match(/^M?(\d{1,2})\.?$/i);
  return m ? parseInt(m[1], 10) : NaN;
}

export function pickTotalCode(stat: JsonStat, dim: string): string {
  const labels = stat.dimension[dim].category.label || {};
  const idx = stat.dimension[dim].category.index;
  const codes = Object.keys(idx);
  const chosen =
    codes.find((c) =>
      /^(spolu|total|t)$/i.test((labels[c] || "").trim())
    ) ||
    codes.find((c) => /^(spolu|total|t)$/i.test(c)) ||
    codes.find((c) => (labels[c] || "").toLowerCase() === "hodnota") ||
    codes.find((c) => (labels[c] || "").toLowerCase().includes("spolu"));
  return chosen || codes[0];
}

export function pickCodeByLabel(
  stat: JsonStat,
  dim: string,
  regex: RegExp
): string | null {
  const labels = stat.dimension[dim].category.label || {};
  const idx = stat.dimension[dim].category.index;
  return Object.keys(idx).find((c) => regex.test(labels[c] || "")) || null;
}

export function fixOtherDims(
  stat: JsonStat,
  exclude: string[]
): Record<string, string> {
  const fixed: Record<string, string> = {};
  for (const d of stat.id) {
    if (exclude.includes(d)) continue;
    fixed[d] = pickTotalCode(stat, d);
  }
  return fixed;
}
