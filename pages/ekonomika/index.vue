<script setup lang="ts">
import { computed } from "vue";
import {
  loadGdp,
  loadGdpQuarterly,
  loadUnemployment,
  loadUnemploymentMonthly,
  loadInflation,
  loadInflationMonthly,
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
  gdpQ: EconSeries | null;
  une: EconSeries | null;
  uneM: EconSeries | null;
  inf: EconSeries | null;
  infM: EconSeries | null;
  debt: EconSeries | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "ekonomika.overview",
  async () => {
    const [gdp, gdpQ, une, uneM, inf, infM, debt] = await Promise.all([
      safeAsync(loadGdp, null as EconSeries | null, "gdp"),
      safeAsync(loadGdpQuarterly, null as EconSeries | null, "gdpQuarterly"),
      safeAsync(loadUnemployment, null as EconSeries | null, "unemployment"),
      safeAsync(loadUnemploymentMonthly, null as EconSeries | null, "unemploymentMonthly"),
      safeAsync(loadInflation, null as EconSeries | null, "inflation"),
      safeAsync(loadInflationMonthly, null as EconSeries | null, "inflationMonthly"),
      safeAsync(loadDebt, null as EconSeries | null, "debt"),
    ]);
    return { gdp, gdpQ, une, uneM, inf, infM, debt, fetchedAt: Date.now() };
  },
  () => ({
    gdp: null,
    gdpQ: null,
    une: null,
    uneM: null,
    inf: null,
    infM: null,
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
const gdpQ = computed(() => slot(data.value?.gdpQ, "namq_10_gdp", "Rast HDP (kvartálne)"));
const une = computed(() => slot(data.value?.une, "une_rt_a", "Nezamestnanosť ročne"));
const uneM = computed(() => slot(data.value?.uneM, "une_rt_m", "Nezamestnanosť mesačne"));
const inf = computed(() => slot(data.value?.inf, "prc_hicp_aind", "Inflácia ročne"));
const infM = computed(() => slot(data.value?.infM, "prc_hicp_manr", "Inflácia mesačne"));
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
const debtKpi = computed(() => fmtKpi(debt.value, "%"));

function fmtPctSigned(s: Slot, freq: string): { value: string; meta: string } {
  if (s.state === "load") return { value: "–", meta: "načítavam…" };
  if (!s.data?.last) return { value: "—", meta: "nedostupné" };
  const last = s.data.last;
  const sign = last.v > 0 ? "+" : "";
  return {
    value: sign + last.v.toFixed(1) + " %",
    meta: last.year + " · " + freq,
  };
}
function fmtPct(s: Slot, freq: string): { value: string; meta: string } {
  if (s.state === "load") return { value: "–", meta: "načítavam…" };
  if (!s.data?.last) return { value: "—", meta: "nedostupné" };
  const last = s.data.last;
  return {
    value: last.v.toFixed(1) + " %",
    meta: last.year + " · " + freq,
  };
}
const gdpQKpi = computed(() => fmtPctSigned(gdpQ.value, "Eurostat namq_10_gdp"));
const uneMKpi = computed(() => fmtPct(uneM.value, "Eurostat une_rt_m, sez. očistené"));
const infMKpi = computed(() => fmtPctSigned(infM.value, "Eurostat prc_hicp_manr"));

function trendOf(v: number | null, threshold = 0.1): "up" | "down" | "flat" | undefined {
  if (v == null) return undefined;
  if (v > threshold) return "up";
  if (v < -threshold) return "down";
  return "flat";
}
const gdpQTrend = computed(() => trendOf(gdpQ.value.data?.last?.v ?? null, 0.1));
const infMTrend = computed(() => {
  const v = infM.value.data?.last?.v ?? null;
  // For inflation we treat above-target (> 2 %) as "up" (warning), under as "down" (good).
  if (v == null) return undefined;
  if (v > 2.5) return "up";
  if (v < 1.5) return "down";
  return "flat";
});
const uneMTrend = computed(() => {
  // Compare last value with the value 12 months earlier — rising = up (bad).
  const series = uneM.value.data;
  if (!series?.sk || series.sk.length < 13) return undefined;
  const last = series.sk[series.sk.length - 1];
  const yearAgo = series.sk[series.sk.length - 13];
  if (last == null || yearAgo == null) return undefined;
  const delta = last - yearAgo;
  if (delta > 0.2) return "up";
  if (delta < -0.2) return "down";
  return "flat";
});

const overall = computed(() => {
  if (pending.value) return { text: "⏳ Sťahujem živé ekonomické dáta z Eurostatu…", cls: "" };
  const sources = [
    data.value?.gdp,
    data.value?.gdpQ,
    data.value?.une,
    data.value?.uneM,
    data.value?.inf,
    data.value?.infM,
    data.value?.debt,
  ];
  const ok = sources.filter(Boolean).length;
  const total = sources.length;
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (ok === total)
    return { text: "✓ Aktualizované zo živých zdrojov Eurostatu (" + total + " datasetov) · " + stamp, cls: "status-line--ok" };
  if (ok === 0)
    return { text: "⚠ Eurostat nedostupný — žiadne dáta sa nepodarilo načítať.", cls: "status-line--err" };
  return { text: "⚠ " + (total - ok) + "/" + total + " zdrojov zlyhalo · " + stamp, cls: "status-line--warn" };
});

function emptySeries(): EconSeries {
  return { times: [], sk: [], eu: [], last: null };
}
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <section class="kpi-strip kpi-strip--five" aria-label="Najnovšie hodnoty">
    <KpiCard label="HDP / obyvateľa" :value="gdpKpi.value" :meta="gdpKpi.meta" accent="#60a5fa" />
    <KpiCard
      label="Rast HDP r/r (kvartálne)"
      :value="gdpQKpi.value"
      :meta="gdpQKpi.meta"
      accent="#22d3ee"
      :trend="gdpQTrend"
    />
    <KpiCard
      label="Nezamestnanosť (mesačne)"
      :value="uneMKpi.value"
      :meta="uneMKpi.meta"
      accent="#fb7185"
      :trend="uneMTrend"
    />
    <KpiCard
      label="Inflácia HICP (mesačne)"
      :value="infMKpi.value"
      :meta="infMKpi.meta"
      accent="#fbbf24"
      :trend="infMTrend"
    />
    <KpiCard label="Verejný dlh" :value="debtKpi.value" :meta="debtKpi.meta" accent="#a78bfa" />
  </section>

  <div class="charts-grid">
    <article class="chart-panel chart-panel--full">
      <h2>Rast HDP medziročne (kvartálne)</h2>
      <p class="sub">
        Reálny HDP, % zmena oproti rovnakému kvartálu predchádzajúceho roka — najcitlivejší indikátor obratu cyklu. Záporné hodnoty znamenajú medziročný pokles produkcie. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/namq_10_gdp" target="_blank" rel="noopener">Eurostat namq_10_gdp</a> (B1GQ, CLV_PCH_SM, sezónne aj kalendárne očistené).
      </p>
      <SrcBadge :state="gdpQ.state === 'ok' ? 'eurostat' : gdpQ.state === 'err' ? 'err' : 'load'" :label="gdpQ.label" />
      <ChartsEconLineChart
        :times="(gdpQ.data ?? emptySeries()).times"
        :sk="(gdpQ.data ?? emptySeries()).sk"
        :eu="(gdpQ.data ?? emptySeries()).eu"
        y-label="Medziročná zmena (%)"
        :y-percent="true"
        x-label="Štvrťrok"
        color1="#22d3ee"
        :reference-line="0"
        reference-label="0 % — recesná hranica"
        reference-color="#fb7185"
        :rotate-x="true"
        aria-label="Kvartálny rast HDP SR vs EÚ27"
      />
      <p class="note">
        Trvalý pokles pod nulu počas dvoch po sebe nasledujúcich kvartálov je technická definícia recesie. Hodnoty po vrchole 2022 sa stupňovite oslabili — porovnanie s EÚ27 ukazuje, či je problém slovenský alebo európsky.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Inflácia HICP medziročne (mesačne)</h2>
      <p class="sub">
        Harmonizovaný index spotrebiteľských cien, % zmena oproti rovnakému mesiacu pred rokom. Aktualizované každý mesiac, čerstvejšie ako ročný priemer. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr" target="_blank" rel="noopener">Eurostat prc_hicp_manr</a> (CP00, RCH_A).
      </p>
      <SrcBadge :state="infM.state === 'ok' ? 'eurostat' : infM.state === 'err' ? 'err' : 'load'" :label="infM.label" />
      <ChartsEconLineChart
        :times="(infM.data ?? emptySeries()).times"
        :sk="(infM.data ?? emptySeries()).sk"
        :eu="(infM.data ?? emptySeries()).eu"
        y-label="Medziročná zmena (%)"
        :y-percent="true"
        x-label="Mesiac"
        color1="#fbbf24"
        :reference-line="2"
        reference-label="2 % — cieľ ECB"
        reference-color="#34d399"
        :rotate-x="true"
        aria-label="Mesačná inflácia HICP SR vs EÚ27"
      />
      <p class="note">
        Cieľ ECB je 2 % v strednodobom horizonte. Vrchol 2022–2023 odráža energetickú krízu; postpandemický návrat na cieľ je v EÚ27 rýchlejší než na Slovensku.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Miera nezamestnanosti (mesačne, sez. očistená)</h2>
      <p class="sub">
        Mesačná miera nezamestnanosti vek 15+, sezónne očistená — citlivejšia ako ročný priemer. Rastúci trend cez niekoľko mesiacov je skorý signál slabnúceho dopytu po práci. Zdroj:
        <a href="https://ec.europa.eu/eurostat/databrowser/view/une_rt_m" target="_blank" rel="noopener">Eurostat une_rt_m</a> (TOTAL, T, PC_ACT, SA).
      </p>
      <SrcBadge :state="uneM.state === 'ok' ? 'eurostat' : uneM.state === 'err' ? 'err' : 'load'" :label="uneM.label" />
      <ChartsEconLineChart
        :times="(uneM.data ?? emptySeries()).times"
        :sk="(uneM.data ?? emptySeries()).sk"
        :eu="(uneM.data ?? emptySeries()).eu"
        y-label="% pracovnej sily"
        :y-percent="true"
        x-label="Mesiac"
        color1="#fb7185"
        :rotate-x="true"
        aria-label="Mesačná nezamestnanosť SR vs EÚ27"
      />
      <p class="note">
        SK už roky drží štruktúrne nižšiu mieru než EÚ27, ale citlivosť na cyklus rovnaká. Sledujte 3-mesačný kĺzavý trend (Sahmovo pravidlo: nárast o 0,5 p.b. nad 12-mesačné minimum signalizuje začiatok recesie).
      </p>
    </article>

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
