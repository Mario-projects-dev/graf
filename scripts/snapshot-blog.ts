// Snapshot script — fetches all live data needed for blog articles and freezes
// it into static JSON files under `public/data/blog/<slug>.json`.
//
// Run:  npm run snapshot:blog
//
// The blog articles read these JSONs at runtime via `<DataPanel>` so the
// numbers in the article text stay in sync with the embedded charts even if
// upstream Eurostat / ECB datasets change later. To refresh a snapshot,
// re-run this script — git diff will show what moved.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/data/blog");

// We import composables directly. They are plain ESM with no Nuxt-specific
// runtime dependencies (only `fetch` and an in-memory memoize cache).
import {
  loadMonetaryMultiplier,
  loadM3Decomposition,
  loadCreditByPurpose,
  loadWernerEmpirical,
  loadWernerLagAndGranger,
  loadWernerVar,
  loadWernerChowH1,
  loadWernerChowH2,
  loadCantillonGap,
  loadEnergyMoney,
  loadHicpAnnualIndex,
  loadSkDebtToGdp,
} from "../composables/useMonetarnaReforma";
import {
  loadPopulationProjection,
  loadAgeStructureProjection,
  loadWorkforceProjection,
  loadSectoralWorkforce,
  loadTippingTimeline,
  loadKoreaComparison,
} from "../composables/usePredikcie";
import { loadTurchinBundle } from "../composables/useTurchin";
import {
  loadMoneyAggregates,
  loadKeyRates,
  loadEuribor3M,
  loadSk10YYield,
  loadSkInflationAnnual,
  loadVelocity,
} from "../composables/useMakro";

interface SnapshotJob {
  slug: string;
  description: string;
  build: () => Promise<Record<string, unknown>>;
}

const JOBS: SnapshotJob[] = [
  {
    slug: "werner-disaggregated-qtc",
    description: "Werner part 1: heterodox theory + correlations + Cantillon",
    async build() {
      const [multiplier, decomp, credit, werner, cantillon, energy, hicp, skDebt] =
        await Promise.all([
          safe(loadMonetaryMultiplier),
          safe(loadM3Decomposition),
          safe(loadCreditByPurpose),
          safe(loadWernerEmpirical),
          safe(loadCantillonGap),
          safe(loadEnergyMoney),
          safe(loadHicpAnnualIndex),
          safe(loadSkDebtToGdp),
        ]);
      return { multiplier, decomp, credit, werner, cantillon, energy, hicp, skDebt };
    },
  },
  {
    slug: "werner-replikacia-var-chow",
    description: "Werner part 2: distributed-lag, VAR(4), Chow scan",
    async build() {
      const [lagGranger, varModel, chowH1, chowH2] = await Promise.all([
        safe(loadWernerLagAndGranger),
        safe(loadWernerVar),
        safe(loadWernerChowH1),
        safe(loadWernerChowH2),
      ]);
      return { lagGranger, varModel, chowH1, chowH2 };
    },
  },
  {
    slug: "projekcia-do-2100",
    description: "Demographic projection: population, pyramid, OADR, sectoral, Korea",
    async build() {
      const [pop, age, workforce, sectoral, tipping, korea] = await Promise.all([
        safe(loadPopulationProjection),
        safe(() => loadAgeStructureProjection([2024, 2050, 2100], "base")),
        safe(loadWorkforceProjection),
        safe(loadSectoralWorkforce),
        safe(loadTippingTimeline),
        safe(loadKoreaComparison),
      ]);
      return { pop, age, workforce, sectoral, tipping, korea };
    },
  },
  {
    slug: "turchin-psi-replikacia",
    description: "Turchin Political Stress Index replication for SK",
    async build() {
      const turchin = await safe(loadTurchinBundle);
      return { turchin };
    },
  },
  {
    slug: "makroekonomika-eurozony",
    description: "Eurozone macro: M aggregates, key rates, EURIBOR, yields, inflation, velocity",
    async build() {
      const [aggregates, keyRates, euribor, yields, inflation, velocity] =
        await Promise.all([
          safe(loadMoneyAggregates),
          safe(loadKeyRates),
          safe(loadEuribor3M),
          safe(loadSk10YYield),
          safe(loadSkInflationAnnual),
          safe(loadVelocity),
        ]);
      return { aggregates, keyRates, euribor, yields, inflation, velocity };
    },
  },
];

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn(" ! ", (e as Error).message);
    return null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("📦 Snapshotting", JOBS.length, "blog articles to", OUT_DIR);
  for (const job of JOBS) {
    process.stdout.write("  • " + job.slug + " ... ");
    const t0 = Date.now();
    const data = await job.build();
    const out = {
      slug: job.slug,
      description: job.description,
      generatedAt: new Date().toISOString(),
      data,
    };
    const path = resolve(OUT_DIR, job.slug + ".json");
    await writeFile(path, JSON.stringify(out, null, 2));
    const ms = Date.now() - t0;
    const size = (JSON.stringify(out).length / 1024).toFixed(1);
    console.log("✓ " + ms + " ms, " + size + " KB");
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
