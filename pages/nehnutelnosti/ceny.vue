<script setup lang="ts">
import { computed } from "vue";
import {
  loadHpi,
  loadKrajPriceIndex,
  type HpiSeries,
  type KrajPriceIndexPayload,
} from "~/composables/useReality";
import {
  NBS_SNAPSHOT_LABEL,
  NBS_SNAPSHOT_NOTE,
} from "~/composables/realityStatic";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Nehnuteľnosti · Ceny",
    title: "Ceny bývania na Slovensku — kraje a vývoj v čase",
    subtitle:
      "Detailný pohľad na regionálne rozdiely cien €/m² a vývoj indexu cien nehnuteľností v čase.",
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
  title: "Ceny nehnuteľností SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Ceny €/m² po krajoch SR a vývoj House Price Indexu. Zdroje: NBS, Eurostat, DATAcube.",
    },
  ],
});

interface Bundle {
  hpi: HpiSeries | null;
  krajIdx: KrajPriceIndexPayload | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "reality.ceny",
  async () => {
    const [hpi, krajIdx] = await Promise.all([
      safeAsync(loadHpi, null as HpiSeries | null, "hpi"),
      safeAsync(loadKrajPriceIndex, null as KrajPriceIndexPayload | null, "krajIdx"),
    ]);
    return { hpi, krajIdx, fetchedAt: Date.now() };
  },
  () => ({ hpi: null, krajIdx: null, fetchedAt: 0 })
);

if (import.meta.client) markDataFetched();

interface Slot<T> { state: "load" | "ok" | "err"; label: string; data: T | null; }
function slot<T>(value: T | null | undefined, src: string, errLabel: string): Slot<T> {
  if (pending.value) return { state: "load", label: "", data: null };
  if (value) return { state: "ok", label: "✓ Zdroj: " + src, data: value };
  return { state: "err", label: "⚠ " + errLabel + ": nedostupné", data: null };
}

const hpi = computed(() => slot(data.value?.hpi, "Eurostat prc_hpi_q", "HPI"));
const krajIdx = computed(() =>
  slot(data.value?.krajIdx, "DATAcube sp3801qr", "Regionálny cenový index")
);

const overall = computed(() => {
  if (pending.value) return { text: "⏳ Sťahujem…", cls: "" };
  const ok = [data.value?.hpi, data.value?.krajIdx].filter(Boolean).length;
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (ok === 2) return { text: "✓ Aktualizované · " + stamp, cls: "status-line--ok" };
  if (ok === 0) return { text: "⚠ Nepodarilo sa načítať dáta.", cls: "status-line--err" };
  return { text: "⚠ " + (2 - ok) + "/2 zdrojov zlyhalo · " + stamp, cls: "status-line--warn" };
});
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <div class="estimate-banner" role="note">
    <span class="icon" aria-hidden="true">📊</span>
    <div>
      <strong>{{ NBS_SNAPSHOT_LABEL }}</strong> — €/m² hodnoty po krajoch sú statický
      snapshot. {{ NBS_SNAPSHOT_NOTE }} YoY % zmeny po kvartáloch sú živé z DATAcube.
    </div>
  </div>

  <div class="charts-grid">
    <article class="chart-panel chart-panel--full">
      <h2>Mapa krajov — €/m²</h2>
      <p class="sub">
        Existujúce byty, priemerná cena za m². Tooltip pri prejdení myšou ukáže
        konkrétne číslo plus odchýlku od SR priemeru a YoY % zmenu z DATAcube.
      </p>
      <SrcBadge :state="krajIdx.state === 'ok' ? 'datacube' : krajIdx.state === 'err' ? 'err' : 'load'" :label="krajIdx.label" />
      <ClientOnly>
        <ChartsPriceMapKraje
          :live-index="krajIdx.data?.byNuts3"
          :live-quarter="krajIdx.data?.quarter"
        />
      </ClientOnly>
      <p class="note">
        Farba reflektuje absolútne ceny €/m² (NBS snapshot). YoY % zmena cien existujúcich bytov v poslednom kvartáli sa vykreslí v tooltipe a v legende — DATAcube <code>sp3801qr</code>, aktualizované štvrťročne.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Zoradený rebríček — kraje</h2>
      <p class="sub">
        Bratislavský kraj je výrazne najdrahší (~3 050 €/m²), Banskobystrický je
        najlacnejší (~1 500 €/m²) — rozdiel cez 100 %.
      </p>
      <ChartsPriceByRegionRankChart />
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Prečo nie ceny po okresoch?</h2>
      <p class="sub">
        Pretože verejný zdroj <strong>neexistuje</strong>. NBS publikuje Index
        cien nehnuteľností iba na úrovni 8 krajov (NUTS3) — okresné členenie nie
        je v ich metodológii. Reálne transakčné ceny sú v katastri (ÚGKK), ale
        bulk export nie je verejný. Komerční agregátori (Nehnuteľnosti.sk,
        Reality.sk) majú detailné údaje, ale za paywall a bez API.
      </p>
      <p class="sub">
        Najlepší verejne dostupný <strong>proxy pre okresnú realitnú aktivitu</strong>
        je počet dokončených bytov a stavebných povolení v danom okrese — to máme
        v sekcii
        <NuxtLink to="/nehnutelnosti/vystavba">Výstavba</NuxtLink>
        ako mapu 79 okresov.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Index cien v čase (HPI, kvartálne)</h2>
      <p class="sub">
        Eurostat <a href="https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_q" target="_blank" rel="noopener">prc_hpi_q</a>,
        base 2015 = 100. Pre absolútne €/m² po krajoch je referencia NBS, ale
        relatívny vývoj indexu zachytáva celú dynamiku trhu.
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
    </article>
  </div>
</template>
