<script setup lang="ts">
import { computed } from "vue";
import {
  loadHpi,
  loadRealHpi,
  loadAnnualMortgageRate,
  loadKrajPriceIndex,
  type HpiSeries,
  type RealHpi,
  type YearlySeries,
  type KrajPriceIndexPayload,
} from "~/composables/useReality";
import {
  KRAJ_PRICES,
  SR_AVERAGE_PRICE_M2,
  NBS_SNAPSHOT_LABEL,
} from "~/composables/realityStatic";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Nehnuteľnosti · živé dáta",
    title: "Realitný trh a bývanie na Slovensku",
    subtitle:
      "Index cien nehnuteľností, ceny po krajoch, hypotekárne sadzby, dostupnosť bývania a stavebná aktivita — sťahované živo z Eurostatu, ECB SDW a DATAcube ŠÚ SR.",
    subNav: [
      { to: "/nehnutelnosti", label: "Prehľad" },
      { to: "/nehnutelnosti/ceny", label: "Ceny" },
      { to: "/nehnutelnosti/dostupnost", label: "Dostupnosť" },
      { to: "/nehnutelnosti/hypoteky", label: "Hypotéky" },
      { to: "/nehnutelnosti/vystavba", label: "Výstavba" },
    ],
  },
});
useHead({
  title: "Nehnuteľnosti SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Realitný trh SR: Index cien nehnuteľností, ceny po krajoch, hypotéky, dostupnosť. Živé dáta z Eurostatu, ECB SDW a DATAcube.",
    },
  ],
});

interface Bundle {
  hpi: HpiSeries | null;
  realHpi: RealHpi | null;
  mortgage: YearlySeries | null;
  krajIdx: KrajPriceIndexPayload | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "reality.overview",
  async () => {
    const [hpi, realHpi, mortgage, krajIdx] = await Promise.all([
      safeAsync(loadHpi, null as HpiSeries | null, "hpi"),
      safeAsync(loadRealHpi, null as RealHpi | null, "realHpi"),
      safeAsync(loadAnnualMortgageRate, null as YearlySeries | null, "mortgage"),
      safeAsync(
        loadKrajPriceIndex,
        null as KrajPriceIndexPayload | null,
        "krajIdx"
      ),
    ]);
    return { hpi, realHpi, mortgage, krajIdx, fetchedAt: Date.now() };
  },
  () => ({
    hpi: null,
    realHpi: null,
    mortgage: null,
    krajIdx: null,
    fetchedAt: 0,
  })
);

if (import.meta.client) {
  markDataFetched();
}

interface Slot<T> { state: "load" | "ok" | "err"; label: string; data: T | null; }
function slot<T>(value: T | null | undefined, src: string, errLabel: string): Slot<T> {
  if (pending.value) return { state: "load", label: "", data: null };
  if (value) return { state: "ok", label: "✓ Zdroj: " + src, data: value };
  return { state: "err", label: "⚠ " + errLabel + ": nedostupné", data: null };
}

const hpi = computed(() =>
  slot(data.value?.hpi, "Eurostat prc_hpi_q", "HPI")
);
const realHpi = computed(() =>
  slot(data.value?.realHpi, "Eurostat prc_hpi_q + prc_hicp_aind", "Reálny HPI")
);
const mortgage = computed(() =>
  slot(data.value?.mortgage, "ECB MIR (SK)", "Hypotekárne sadzby")
);
const krajIdx = computed(() =>
  slot(data.value?.krajIdx, "DATAcube sp3801qr", "Regionálny cenový index")
);

const krajMostExpensive = computed(() => {
  const top = [...KRAJ_PRICES].sort((a, b) => b.pricePerM2 - a.pricePerM2)[0];
  return top;
});
const hpiYoy = computed(() => {
  const sk = data.value?.hpi?.sk;
  if (!sk || sk.length < 5) return null;
  const last = sk[sk.length - 1];
  const yearAgo = sk[sk.length - 5];
  if (last == null || yearAgo == null || yearAgo === 0) return null;
  return ((last - yearAgo) / yearAgo) * 100;
});
const lastMortgageRate = computed(() => {
  const m = data.value?.mortgage;
  if (!m) return null;
  for (let i = m.values.length - 1; i >= 0; i--) {
    if (m.values[i] != null) return { v: m.values[i] as number, year: m.years[i] };
  }
  return null;
});

const kpi = computed(() => ({
  sr: {
    value: SR_AVERAGE_PRICE_M2.toLocaleString("sk-SK") + " €/m²",
    meta: NBS_SNAPSHOT_LABEL,
  },
  ba: {
    value: krajMostExpensive.value.pricePerM2.toLocaleString("sk-SK") + " €/m²",
    meta: krajMostExpensive.value.name + " · NBS",
  },
  hpi: {
    value:
      hpiYoy.value == null
        ? "—"
        : (hpiYoy.value >= 0 ? "+" : "") + hpiYoy.value.toFixed(1) + " %",
    meta: data.value?.hpi ? "medziročne · Eurostat" : "nedostupné",
  },
  rate: {
    value: lastMortgageRate.value
      ? lastMortgageRate.value.v.toFixed(2) + " %"
      : "—",
    meta: lastMortgageRate.value
      ? "rok " + lastMortgageRate.value.year + " · ECB"
      : "nedostupné",
  },
}));

const overall = computed(() => {
  if (pending.value) {
    return {
      text: "⏳ Sťahujem živé dáta z Eurostatu, ECB a DATAcube…",
      cls: "",
    };
  }
  const ok = [data.value?.hpi, data.value?.realHpi, data.value?.mortgage, data.value?.krajIdx].filter(Boolean).length;
  const total = 4;
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (ok === total) {
    return { text: "✓ Aktualizované zo živých zdrojov · " + stamp, cls: "status-line--ok" };
  }
  if (ok === 0) {
    return { text: "⚠ Žiadne živé dáta sa nepodarilo načítať.", cls: "status-line--err" };
  }
  return {
    text: "⚠ " + (total - ok) + "/" + total + " zdrojov zlyhalo · " + stamp,
    cls: "status-line--warn",
  };
});
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <div class="info-banner" role="note">
    <span class="icon" aria-hidden="true">ℹ️</span>
    <div>
      Ceny <strong>€/m²</strong> sú statický snapshot z poslednej publikácie NBS — aktualizujem manuálne raz za kvartál. Index cien (HPI), regionálne YoY % a hypotekárne sadzby sú <strong>živé</strong> z Eurostatu, DATAcube a ECB. Dáta sa nahrávajú už pri zostavení stránky — žiadne čakanie.
    </div>
  </div>

  <section class="kpi-strip" aria-label="Najnovšie hodnoty">
    <KpiCard label="Priemer SR" :value="kpi.sr.value" :meta="kpi.sr.meta" accent="#f59e0b" />
    <KpiCard label="Najdrahší kraj" :value="kpi.ba.value" :meta="kpi.ba.meta" accent="#fb7185" />
    <KpiCard label="HPI medziročne" :value="kpi.hpi.value" :meta="kpi.hpi.meta" accent="#34d399" />
    <KpiCard label="Hypotekárna sadzba" :value="kpi.rate.value" :meta="kpi.rate.meta" accent="#a78bfa" />
  </section>

  <div class="charts-grid">
    <article class="chart-panel chart-panel--full">
      <h2>House Price Index — SR vs EÚ27</h2>
      <p class="sub">
        Eurostat <a href="https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_q" target="_blank" rel="noopener">prc_hpi_q</a>,
        kvartálne, base 2015 = 100. Slovenský trh za posledných 10 rokov výrazne predbieha EÚ priemer.
      </p>
      <SrcBadge :state="hpi.state === 'ok' ? 'eurostat' : hpi.state === 'err' ? 'err' : 'load'" :label="hpi.label" />
      <ChartsHpiTimeChart
        v-if="hpi.data"
        :times="hpi.data.times"
        :sk="hpi.data.sk"
        :eu="hpi.data.eu"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ HPI sa pripravuje…</span>
      </div>
      <p class="note">
        SR od 2010 ~+90 %, EÚ27 ~+50 %. Bublinu pred 2008 vidno aj prepad 2009–2013, post-COVID raket 2020–2022.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Reálny vs nominálny HPI (deflátor HICP)</h2>
      <p class="sub">
        Po deflácii spotrebiteľskou infláciou (HICP) — koľko ceny <strong>reálne</strong> stúpli. V 2022–2023
        nominálne ceny rástli, ale po inflácii reálne <strong>klesli</strong>.
      </p>
      <SrcBadge :state="realHpi.state === 'ok' ? 'eurostat' : realHpi.state === 'err' ? 'err' : 'load'" :label="realHpi.label" />
      <ChartsRealVsNominalHpiChart
        v-if="realHpi.data"
        :payload="realHpi.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Reálny HPI sa pripravuje…</span>
      </div>
      <p class="note">
        Deflácia: HPI / HICP × 100 (oboje base 2015). Hovorí o kúpnej sile bytového majetku, nie o trhových cenách.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Cenová mapa krajov</h2>
      <p class="sub">
        €/m² existujúcich bytov podľa kraja (NBS snapshot). Tooltip a legenda navyše ukazujú <strong>YoY % zmenu</strong> z DATAcube
        <code>sp3801qr</code> (živé, najnovší kvartál).
      </p>
      <SrcBadge :state="krajIdx.state === 'ok' ? 'datacube' : krajIdx.state === 'err' ? 'err' : 'load'" :label="krajIdx.label" />
      <ClientOnly>
        <ChartsPriceMapKraje
          :live-index="krajIdx.data?.byNuts3"
          :live-quarter="krajIdx.data?.quarter"
        />
      </ClientOnly>
      <p class="note">Detail v <NuxtLink to="/nehnutelnosti/ceny">sekcii Ceny</NuxtLink>.</p>
    </article>
  </div>
</template>
