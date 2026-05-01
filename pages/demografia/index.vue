<script setup lang="ts">
import { computed } from "vue";
import {
  loadYearly,
  loadMonthly,
  loadPyramid,
  loadDistricts,
  loadDemografiaKpis,
  type SourceTag,
  type YearlyPoint,
  type MonthlyPayload,
  type PyramidPayload,
  type DistrictPayload,
  type ChainResult,
  type DemoKpis,
} from "~/composables/useDemografia";
import {
  DISTRICT_GROW_ESTIMATE,
  DISTRICT_NAMES,
  DISTRICT_ESTIMATE_YEAR,
} from "~/composables/districts";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Demografia · živé dáta",
    title: "Počet živonarodených detí na Slovensku",
    subtitle:
      "Prehľad demografických grafov podľa zdrojov DATAcube ŠÚ SR (OM7017, OM2801, OM7013) a Eurostatu (demo_pjan, demo_gind) — sťahované živo do prehliadača.",
  },
});
useHead({
  title: "Demografia SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Živonarodení, úmrtia, populačná pyramída a prírastok obyvateľov v okresoch Slovenska. Živé dáta z DATAcube ŠÚ SR a Eurostatu.",
    },
  ],
});

interface Bundle {
  yearly: ChainResult<YearlyPoint[]> | null;
  monthly: ChainResult<MonthlyPayload> | null;
  pyramid: ChainResult<PyramidPayload> | null;
  districts: ChainResult<DistrictPayload> | null;
  kpis: DemoKpis | null;
  fetchedAt: number;
}
const FALLBACK_DISTRICT: DistrictPayload = {
  year: DISTRICT_ESTIMATE_YEAR,
  grow: DISTRICT_GROW_ESTIMATE,
  names: DISTRICT_NAMES,
  isEstimate: true,
};

const { data, pending } = useStaticData<Bundle>(
  "demografia.overview",
  async () => {
    const [yearly, monthly, pyramid, districts, kpis] = await Promise.all([
      safeAsync(loadYearly, null as ChainResult<YearlyPoint[]> | null, "yearly"),
      safeAsync(loadMonthly, null as ChainResult<MonthlyPayload> | null, "monthly"),
      safeAsync(loadPyramid, null as ChainResult<PyramidPayload> | null, "pyramid"),
      safeAsync(loadDistricts, null as ChainResult<DistrictPayload> | null, "districts"),
      safeAsync(loadDemografiaKpis, null as DemoKpis | null, "kpis"),
    ]);
    return { yearly, monthly, pyramid, districts, kpis, fetchedAt: Date.now() };
  },
  () => ({
    yearly: null,
    monthly: null,
    pyramid: null,
    districts: null,
    kpis: null,
    fetchedAt: 0,
  })
);

if (import.meta.client) markDataFetched();

interface Slot<T> {
  state: SourceTag;
  label: string;
  data: T | null;
}
function slot<T>(r: ChainResult<T> | null | undefined, label: string): Slot<T> {
  if (pending.value) return { state: "load", label: "", data: null };
  if (r && r.ok && r.data) {
    let kind: SourceTag = "datacube";
    if (r.source.includes("Eurostat")) kind = "eurostat";
    if (r.source.includes("offline")) kind = "offline";
    return {
      state: kind,
      label: "✓ " + label + " · zdroj: " + r.source,
      data: r.data,
    };
  }
  return {
    state: "offline",
    label: "⚠ " + label + " · živé dáta zlyhali",
    data: null,
  };
}

const yearly = computed(() => slot(data.value?.yearly, "Ročný trend"));
const monthly = computed(() =>
  slot(data.value?.monthly, "Mesačné živonarodení/úmrtia")
);
const pyramid = computed(() => slot(data.value?.pyramid, "Populačná pyramída"));
const districtsSlot = computed(() => slot(data.value?.districts, "Prírastok podľa okresov"));

const yearLabels = computed(() =>
  yearly.value.data ? yearly.value.data.map((p) => p.year) : []
);
const yearValues = computed(() =>
  yearly.value.data ? yearly.value.data.map((p) => p.v) : []
);

const monthlyData = computed(
  () => monthly.value.data ?? { labels: [], births: [], deaths: [] }
);
const pyramidData = computed(
  () => pyramid.value.data ?? { year: 2024, bands: [] }
);
const districtsData = computed(
  () => districtsSlot.value.data ?? FALLBACK_DISTRICT
);

function fmtKpi(
  k: { v: number | null; year: string } | undefined,
  suffix: string,
  decimals: number,
  signed = false
): { value: string; meta: string } {
  if (!k || k.v == null) return { value: "—", meta: "nedostupné" };
  const sign = signed && k.v >= 0 ? "+" : "";
  return {
    value: sign + k.v.toFixed(decimals) + (suffix ? " " + suffix : ""),
    meta: "rok " + k.year + " · Eurostat",
  };
}
const kpiTfr = computed(() => fmtKpi(data.value?.kpis?.tfr, "", 2));
const kpiLifeExp = computed(() => fmtKpi(data.value?.kpis?.lifeExp, "rokov", 1));
const kpiMedAge = computed(() => fmtKpi(data.value?.kpis?.medianAge, "rokov", 1));
const kpiNatRate = computed(() =>
  fmtKpi(data.value?.kpis?.naturalRate, "‰", 1, true)
);
const kpiAgeMother = computed(() =>
  fmtKpi(data.value?.kpis?.ageMother1, "rokov", 1)
);

const pyramidYearLabel = computed(() => "1. 1. " + pyramidData.value.year);
const monthlyNote = computed(() => {
  const labels = monthlyData.value.labels;
  if (!labels.length) return "Mesačné živonarodení a úmrtia v SR.";
  return (
    labels[0] +
    " – " +
    labels[labels.length - 1] +
    ". Mesačné dáta zo živého zdroja."
  );
});

const overallStatus = computed(() => {
  if (pending.value)
    return {
      text: "⏳ Sťahujem živé dáta z DATAcube ŠÚ SR (s fallbackom na Eurostat)…",
      cls: "",
    };
  let dc = 0,
    es = 0,
    off = 0;
  for (const r of [
    data.value?.yearly,
    data.value?.monthly,
    data.value?.pyramid,
    data.value?.districts,
  ]) {
    if (!r || !r.ok) {
      off++;
      continue;
    }
    if (r.source.includes("DATAcube")) dc++;
    else if (r.source.includes("Eurostat")) es++;
    else off++;
  }
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  const parts: string[] = [];
  if (dc) parts.push(dc + "× DATAcube ŠÚ SR");
  if (es) parts.push(es + "× Eurostat");
  if (off) parts.push(off + "× offline / odhad");
  let cls = "status-line--ok";
  if (off === 4) cls = "status-line--err";
  else if (off > 0) cls = "status-line--warn";
  const prefix = off === 0 ? "✓ " : "⚠ ";
  return {
    text: prefix + "Zdroje: " + parts.join(" · ") + " · " + stamp,
    cls,
  };
});
</script>

<template>
  <p :class="['status-line', overallStatus.cls]">{{ overallStatus.text }}</p>

  <section class="kpi-strip kpi-strip--demo" aria-label="Demografické ukazovatele">
    <KpiCard
      label="Plodnosť (TFR)"
      :value="kpiTfr.value"
      :meta="kpiTfr.meta"
      accent="#f472b6"
    />
    <KpiCard
      label="Stredná dĺžka života"
      :value="kpiLifeExp.value"
      :meta="kpiLifeExp.meta"
      accent="#34d399"
    />
    <KpiCard
      label="Medián veku"
      :value="kpiMedAge.value"
      :meta="kpiMedAge.meta"
      accent="#60a5fa"
    />
    <KpiCard
      label="Prirodzený prírastok"
      :value="kpiNatRate.value"
      :meta="kpiNatRate.meta"
      accent="#fbbf24"
    />
    <KpiCard
      label="Vek matky pri 1. dieťati"
      :value="kpiAgeMother.value"
      :meta="kpiAgeMother.meta"
      accent="#a78bfa"
    />
  </section>

  <div class="charts-grid">
    <article class="chart-panel">
      <h2>Ročný trend (OM7017RR)</h2>
      <p class="sub">
        Zdrojová databáza:
        <a
          href="https://datacube.statistics.sk/#!/view/sk/vbd_dem/om7017rr/v_om7017rr_00_00_00_sk"
          target="_blank"
          rel="noopener"
          >DATAcube ŠÚ SR – OM7017RR</a
        >.
      </p>
      <SrcBadge :state="yearly.state" :label="yearly.label" />
      <ChartsYearlyBirthsLine v-if="yearly.data" :years="yearLabels" :values="yearValues" />
      <div v-else class="chart-box chart-box--skeleton">
        <span class="skeleton-label">⏳ Ročný trend…</span>
      </div>
      <p class="note">
        Súhrnné ročné počty živonarodených pre SR. Od roku 2012 platí zmenená
        metodika.
      </p>
    </article>

    <article class="chart-panel">
      <h2>Živonarodené podľa rokov (OM7029RR)</h2>
      <p class="sub">
        Stĺpcový pohľad — výkaz
        <a
          href="https://datacube.statistics.sk/#!/view/sk/vbd_dem/om7029rr/v_om7029rr_00_00_00_sk"
          target="_blank"
          rel="noopener"
          >OM7029RR</a
        >.
      </p>
      <SrcBadge :state="yearly.state" :label="yearly.label" />
      <ChartsYearlyBirthsBar v-if="yearly.data" :years="yearLabels" :values="yearValues" />
      <div v-else class="chart-box chart-box--skeleton">
        <span class="skeleton-label">⏳ Ročný stĺpcový…</span>
      </div>
      <p class="note">
        Rovnaké čísla, iný výkaz v DATAcube. Hodnota za posledný rok môže byť
        predbežná.
      </p>
    </article>

    <article class="chart-panel">
      <h2>Živonarodení a úmrtia podľa mesiaca (OM2801MS)</h2>
      <p class="sub">
        Mesačné počty pre SR —
        <a
          href="https://datacube.statistics.sk/#!/view/sk/vbd_slovstat2/om2801ms/v_om2801ms_00_00_00_sk"
          target="_blank"
          rel="noopener"
          >DATAcube – OM2801MS</a
        >, fallback Eurostat
        <a href="https://ec.europa.eu/eurostat/databrowser/view/demo_fmonth" target="_blank" rel="noopener">demo_fmonth</a>
        +
        <a href="https://ec.europa.eu/eurostat/databrowser/view/demo_mmonth" target="_blank" rel="noopener">demo_mmonth</a>.
      </p>
      <SrcBadge :state="monthly.state" :label="monthly.label" />
      <ChartsMonthlyBirthsDeaths
        v-if="monthly.data"
        :labels="monthlyData.labels"
        :births="monthlyData.births"
        :deaths="monthlyData.deaths"
      />
      <div v-else class="chart-box chart-box--monthly chart-box--skeleton">
        <span class="skeleton-label">⏳ Mesačné dáta…</span>
      </div>
      <p class="note">{{ monthlyNote }}</p>
    </article>

    <article class="chart-panel">
      <h2>Populačná pyramída (SR)</h2>
      <p class="sub">
        Počet obyvateľov podľa vekových skupín a pohlavia — stav k
        <strong>{{ pyramidYearLabel }}</strong
        >. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/demo_pjan" target="_blank" rel="noopener">Eurostat demo_pjan</a>.
      </p>
      <SrcBadge :state="pyramid.state" :label="pyramid.label" />
      <ChartsPopulationPyramid v-if="pyramid.data" :bands="pyramidData.bands" />
      <div v-else class="chart-box chart-box--pyramid chart-box--skeleton">
        <span class="skeleton-label">⏳ Pyramída…</span>
      </div>
      <p class="note">Muži vľavo (záporná os), ženy vpravo.</p>
    </article>
  </div>

  <section class="map-section" aria-labelledby="map-heading">
    <h2 id="map-heading">Prírastok obyvateľstva podľa okresov</h2>
    <p class="sub">
      Interaktívna mapa a zoradený stĺpcový graf — celková zmena počtu
      obyvateľov (ukazovateľ podobný výkazu
      <a
        href="https://datacube.statistics.sk/#!/view/sk/vbd_dem/om7013rr/v_om7013rr_00_00_00_sk"
        target="_blank"
        rel="noopener"
        >DATAcube – OM7013RR</a
      >).
    </p>
    <EstimateBanner :visible="districtsData.isEstimate" />
    <SrcBadge :state="districtsSlot.state" :label="districtsSlot.label" />
    <ClientOnly>
      <ChartsDistrictMap :payload="districtsData" />
    </ClientOnly>
    <p class="note">
      Mapový podklad © OpenStreetMap / © CARTO. Hranice okresov:
      <a href="https://github.com/drakh/slovakia-gps-data" target="_blank" rel="noopener">drakh/slovakia-gps-data</a>.
    </p>
  </section>
</template>
