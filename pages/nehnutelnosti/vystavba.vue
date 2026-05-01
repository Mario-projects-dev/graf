<script setup lang="ts">
import { computed } from "vue";
import {
  loadConstruction,
  loadPermits,
  loadDistrictCompletedDwellings,
  type ConstructionPayload,
  type PermitsPayload,
  type DistrictConstructionPayload,
} from "~/composables/useReality";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Nehnuteľnosti · Výstavba",
    title: "Stavebná aktivita a bytový fond SR",
    subtitle:
      "Začaté a dokončené byty v čase plus stavebné povolenia — pipeline budúcej ponuky bývania.",
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
  title: "Výstavba bytov SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Začaté, dokončené byty a stavebné povolenia v SR. Zdroj: DATAcube ŠÚ SR.",
    },
  ],
});

interface Bundle {
  construction: ConstructionPayload | null;
  permits: PermitsPayload | null;
  districts: DistrictConstructionPayload | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "reality.vystavba",
  async () => {
    const [construction, permits, districts] = await Promise.all([
      safeAsync(loadConstruction, null as ConstructionPayload | null, "construction"),
      safeAsync(loadPermits, null as PermitsPayload | null, "permits"),
      safeAsync(
        loadDistrictCompletedDwellings,
        null as DistrictConstructionPayload | null,
        "districtDwellings"
      ),
    ]);
    return { construction, permits, districts, fetchedAt: Date.now() };
  },
  () => ({
    construction: null,
    permits: null,
    districts: null,
    fetchedAt: 0,
  })
);

if (import.meta.client) markDataFetched();

interface Slot<T> { state: "load" | "ok" | "err"; label: string; data: T | null; }
function slot<T>(v: T | null | undefined, src: string, errLabel: string): Slot<T> {
  if (pending.value) return { state: "load", label: "", data: null };
  if (v) return { state: "ok", label: "✓ Zdroj: " + src, data: v };
  return { state: "err", label: "⚠ " + errLabel + ": nedostupné", data: null };
}

const construction = computed(() =>
  slot(data.value?.construction, "DATAcube st3004rr", "Začaté/dokončené byty")
);
const permits = computed(() =>
  slot(data.value?.permits, "DATAcube st2024qs", "Stavebné povolenia")
);
const districts = computed(() =>
  slot(
    data.value?.districts,
    "DATAcube st3004rr (okresy)",
    "Dokončené byty po okresoch"
  )
);

const overall = computed(() => {
  if (pending.value) return { text: "⏳ Sťahujem…", cls: "" };
  const ok = [
    data.value?.construction,
    data.value?.permits,
    data.value?.districts,
  ].filter(Boolean).length;
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (ok === 3) return { text: "✓ Aktualizované · " + stamp, cls: "status-line--ok" };
  if (ok === 0) return { text: "⚠ Žiadne dáta sa nepodarilo načítať.", cls: "status-line--err" };
  return { text: "⚠ " + (3 - ok) + "/3 zdrojov zlyhalo · " + stamp, cls: "status-line--warn" };
});
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <div class="charts-grid">
    <article class="chart-panel chart-panel--full">
      <h2>Začaté a dokončené byty (ročne)</h2>
      <p class="sub">
        DATAcube <a href="https://datacube.statistics.sk/#!/view/sk/vbd_sk_win2/st3004rr/v_st3004rr_00_00_00_sk" target="_blank" rel="noopener">st3004rr</a>
        — pomer „začaté" (rastúca pipeline) ku „dokončené" (aktuálna ponuka).
      </p>
      <SrcBadge :state="construction.state === 'ok' ? 'datacube' : construction.state === 'err' ? 'err' : 'load'" :label="construction.label" />
      <ChartsCompletedDwellingsChart
        v-if="construction.data"
        :payload="construction.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Výstavba sa pripravuje…</span>
      </div>
      <p class="note">
        Po 2008 finančnej kríze klesli dokončené byty z ~17 000 na ~13 000 ročne. Rast od 2014, COVID a energetická kríza opäť spomalili tempo.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Mapa okresov — dokončené byty (najnovší rok)</h2>
      <p class="sub">
        DATAcube <code>st3004rr</code> mapovaná na 79 okresov. Quintile-based farebné pásma — každý okres patrí do jednej z 5 skupín podľa intenzity výstavby.
      </p>
      <SrcBadge :state="districts.state === 'ok' ? 'datacube' : districts.state === 'err' ? 'err' : 'load'" :label="districts.label" />
      <ClientOnly>
        <ChartsDistrictDwellingsMap
          v-if="districts.data"
          :payload="districts.data"
        />
      </ClientOnly>
      <div v-if="!districts.data" class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Okresné dáta sa pripravujú…</span>
      </div>
      <p class="note">
        Stavebná aktivita je <strong>najlepším verejne dostupným proxy pre realitnú dynamiku okresu</strong>. Absolútne ceny €/m² po okresoch nie sú v žiadnom verejnom zdroji.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Stavebné povolenia vs dokončené byty</h2>
      <p class="sub">
        DATAcube <a href="https://datacube.statistics.sk/#!/view/sk/vbd_sk_win2/st2024qs/v_st2024qs_00_00_00_sk" target="_blank" rel="noopener">st2024qs</a>
        (povolenia, kvartálne sčítané do ročného súčtu) vs <code>st3004rr</code> (dokončené, ročné).
      </p>
      <SrcBadge
        :state="permits.state === 'ok' && construction.state === 'ok' ? 'datacube' : (permits.state === 'err' || construction.state === 'err') ? 'err' : 'load'"
        :label="permits.state === 'ok' && construction.state === 'ok' ? '✓ Zdroj: DATAcube st2024qs + st3004rr' : 'Sťahujem…'"
      />
      <ChartsPermitsVsCompletedChart
        v-if="permits.data && construction.data"
        :construction="construction.data"
        :permits="permits.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Povolenia sa pripravujú…</span>
      </div>
      <p class="note">
        Klesajúci pomer „povolenia / dokončené" predikuje budúcu ponuku.
      </p>
    </article>
  </div>
</template>
