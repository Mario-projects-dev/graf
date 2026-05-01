<script setup lang="ts">
import { computed } from "vue";
import {
  loadGdp,
  loadUnemployment,
  loadInflation,
  loadDebt,
  type EconSeries,
} from "~/composables/useEkonomika";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Ekonomika · živé dáta",
    title: "Ekonomika Slovenska v kľúčových ukazovateľoch",
    subtitle:
      "HDP na obyvateľa, miera nezamestnanosti, ročná inflácia HICP a hrubý verejný dlh — všetko sťahované živo z verejného Eurostat REST API.",
  },
});
useHead({
  title: "Ekonomika SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "HDP na obyvateľa, miera nezamestnanosti, inflácia HICP a verejný dlh SR vs EÚ27. Živé dáta z Eurostatu.",
    },
  ],
});

interface Bundle {
  gdp: EconSeries | null;
  une: EconSeries | null;
  inf: EconSeries | null;
  debt: EconSeries | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "ekonomika.overview",
  async () => {
    const [gdp, une, inf, debt] = await Promise.all([
      safeAsync(loadGdp, null as EconSeries | null, "gdp"),
      safeAsync(loadUnemployment, null as EconSeries | null, "unemployment"),
      safeAsync(loadInflation, null as EconSeries | null, "inflation"),
      safeAsync(loadDebt, null as EconSeries | null, "debt"),
    ]);
    return { gdp, une, inf, debt, fetchedAt: Date.now() };
  },
  () => ({
    gdp: null,
    une: null,
    inf: null,
    debt: null,
    fetchedAt: 0,
  })
);

if (import.meta.client) markDataFetched();

interface Slot { state: "load" | "ok" | "err"; label: string; data: EconSeries | null; }
function slot(v: EconSeries | null | undefined, dataset: string, errLabel: string): Slot {
  if (pending.value) return { state: "load", label: "", data: null };
  if (v) return { state: "ok", label: "✓ Zdroj: Eurostat " + dataset, data: v };
  return { state: "err", label: "⚠ " + errLabel + ": Eurostat nedostupný", data: null };
}

const gdp = computed(() => slot(data.value?.gdp, "nama_10_pc", "HDP"));
const une = computed(() => slot(data.value?.une, "une_rt_a", "Nezamestnanosť"));
const inf = computed(() => slot(data.value?.inf, "prc_hicp_aind", "Inflácia"));
const debt = computed(() => slot(data.value?.debt, "gov_10dd_edpt1", "Verejný dlh"));

function fmtKpi(s: Slot, suffix: "€" | "%"): { value: string; meta: string } {
  if (s.state === "load") return { value: "–", meta: "načítavam…" };
  if (!s.data?.last) return { value: "—", meta: "nedostupné" };
  const last = s.data.last;
  const value =
    suffix === "€"
      ? Math.round(last.v).toLocaleString("sk-SK") + " €"
      : last.v.toFixed(1) + " " + suffix;
  return { value, meta: "rok " + last.year + " · Eurostat" };
}

const gdpKpi = computed(() => fmtKpi(gdp.value, "€"));
const uneKpi = computed(() => fmtKpi(une.value, "%"));
const infKpi = computed(() => fmtKpi(inf.value, "%"));
const debtKpi = computed(() => fmtKpi(debt.value, "%"));

const overall = computed(() => {
  if (pending.value) return { text: "⏳ Sťahujem živé ekonomické dáta z Eurostatu…", cls: "" };
  const ok = [
    data.value?.gdp,
    data.value?.une,
    data.value?.inf,
    data.value?.debt,
  ].filter(Boolean).length;
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (ok === 4)
    return { text: "✓ Aktualizované zo živých zdrojov Eurostatu (4 datasety) · " + stamp, cls: "status-line--ok" };
  if (ok === 0)
    return { text: "⚠ Eurostat nedostupný — žiadne dáta sa nepodarilo načítať.", cls: "status-line--err" };
  return { text: "⚠ " + (4 - ok) + "/4 zdrojov zlyhalo · " + stamp, cls: "status-line--warn" };
});

function emptySeries(): EconSeries {
  return { times: [], sk: [], eu: [], last: null };
}
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <section class="kpi-strip" aria-label="Najnovšie hodnoty">
    <KpiCard label="HDP / obyvateľa" :value="gdpKpi.value" :meta="gdpKpi.meta" accent="#60a5fa" />
    <KpiCard label="Nezamestnanosť" :value="uneKpi.value" :meta="uneKpi.meta" accent="#fb7185" />
    <KpiCard label="Inflácia (HICP)" :value="infKpi.value" :meta="infKpi.meta" accent="#fbbf24" />
    <KpiCard label="Verejný dlh" :value="debtKpi.value" :meta="debtKpi.meta" accent="#a78bfa" />
  </section>

  <div class="charts-grid">
    <article class="chart-panel">
      <h2>HDP na obyvateľa (EUR)</h2>
      <p class="sub">
        Hrubý domáci produkt v bežných cenách na obyvateľa. SR vs priemer EÚ27.
        Zdroj: <a href="https://ec.europa.eu/eurostat/databrowser/view/nama_10_pc" target="_blank" rel="noopener">Eurostat nama_10_pc</a> (B1GQ, CP_EUR_HAB).
      </p>
      <SrcBadge :state="gdp.state === 'ok' ? 'eurostat' : gdp.state === 'err' ? 'err' : 'load'" :label="gdp.label" />
      <ChartsEconLineChart
        :times="(gdp.data ?? emptySeries()).times"
        :sk="(gdp.data ?? emptySeries()).sk"
        :eu="(gdp.data ?? emptySeries()).eu"
        y-label="EUR / obyvateľa"
        :y-percent="false"
        color1="#60a5fa"
        aria-label="HDP na obyvateľa SR vs EÚ27"
      />
      <p class="note">Modrá: SR. Sivá: EÚ27 (od 2020). Predbežné hodnoty sa môžu meniť.</p>
    </article>

    <article class="chart-panel">
      <h2>Miera nezamestnanosti (%)</h2>
      <p class="sub">
        Ročná miera nezamestnanosti, vek 15–74, obe pohlavia, % aktívnej populácie. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/une_rt_a" target="_blank" rel="noopener">Eurostat une_rt_a</a>.
      </p>
      <SrcBadge :state="une.state === 'ok' ? 'eurostat' : une.state === 'err' ? 'err' : 'load'" :label="une.label" />
      <ChartsEconLineChart
        :times="(une.data ?? emptySeries()).times"
        :sk="(une.data ?? emptySeries()).sk"
        :eu="(une.data ?? emptySeries()).eu"
        y-label="% aktívnej populácie"
        :y-percent="true"
        color1="#fb7185"
        aria-label="Miera nezamestnanosti SR vs EÚ27"
      />
      <p class="note">SR vs EÚ27. Vyznačuje sa pokles po 2013 a pandemický šok 2020.</p>
    </article>

    <article class="chart-panel">
      <h2>Ročná inflácia HICP (%)</h2>
      <p class="sub">
        Harmonizovaný index spotrebiteľských cien. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind" target="_blank" rel="noopener">Eurostat prc_hicp_aind</a> (CP00, RCH_A_AVG).
      </p>
      <SrcBadge :state="inf.state === 'ok' ? 'eurostat' : inf.state === 'err' ? 'err' : 'load'" :label="inf.label" />
      <ChartsEconLineChart
        :times="(inf.data ?? emptySeries()).times"
        :sk="(inf.data ?? emptySeries()).sk"
        :eu="(inf.data ?? emptySeries()).eu"
        y-label="Medziročná zmena (%)"
        :y-percent="true"
        color1="#fbbf24"
        aria-label="Ročná inflácia HICP SR vs EÚ27"
      />
      <p class="note">Špička 2022–2023 odráža energetickú krízu po vojne na Ukrajine.</p>
    </article>

    <article class="chart-panel">
      <h2>Hrubý verejný dlh (% HDP)</h2>
      <p class="sub">
        Konsolidovaný verejný dlh sektora vlády (S13) v % HDP. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1" target="_blank" rel="noopener">Eurostat gov_10dd_edpt1</a> (GD, PC_GDP, S13).
      </p>
      <SrcBadge :state="debt.state === 'ok' ? 'eurostat' : debt.state === 'err' ? 'err' : 'load'" :label="debt.label" />
      <ChartsEconLineChart
        :times="(debt.data ?? emptySeries()).times"
        :sk="(debt.data ?? emptySeries()).sk"
        :eu="(debt.data ?? emptySeries()).eu"
        y-label="% HDP"
        :y-percent="true"
        color1="#a78bfa"
        aria-label="Hrubý verejný dlh SR vs EÚ27"
      />
      <p class="note">Pre porovnanie aj priemer EÚ27. Maastrichtský strop je 60 %.</p>
    </article>
  </div>
</template>
