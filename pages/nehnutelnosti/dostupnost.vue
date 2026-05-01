<script setup lang="ts">
import { computed } from "vue";
import {
  loadOvercrowding,
  loadTenure,
  loadAnnualHpi,
  loadAnnualNetIncome,
  type CompareSeries,
  type TenurePayload,
  type YearlySeries,
} from "~/composables/useReality";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Nehnuteľnosti · Dostupnosť",
    title: "Dostupnosť bývania na Slovensku",
    subtitle:
      "Koľko ročných príjmov stojí byt, akú časť populácie tlačí preľudnenie a aká je štruktúra vlastníctva bývania.",
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
  title: "Dostupnosť bývania SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Pomer ceny bytu k príjmu, preľudnenosť bývania a štruktúra vlastníctva. Zdroj: Eurostat.",
    },
  ],
});

interface Bundle {
  overcrowding: CompareSeries | null;
  tenure: TenurePayload | null;
  hpi: YearlySeries | null;
  income: YearlySeries | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "reality.dostupnost",
  async () => {
    const [overcrowding, tenure, hpi, income] = await Promise.all([
      safeAsync(loadOvercrowding, null as CompareSeries | null, "overcrowding"),
      safeAsync(loadTenure, null as TenurePayload | null, "tenure"),
      safeAsync(loadAnnualHpi, null as YearlySeries | null, "annualHpi"),
      safeAsync(loadAnnualNetIncome, null as YearlySeries | null, "income"),
    ]);
    return { overcrowding, tenure, hpi, income, fetchedAt: Date.now() };
  },
  () => ({
    overcrowding: null,
    tenure: null,
    hpi: null,
    income: null,
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

const overcrowding = computed(() =>
  slot(data.value?.overcrowding, "Eurostat ilc_lvho05a", "Preľudnenosť")
);
const tenure = computed(() =>
  slot(data.value?.tenure, "Eurostat ilc_lvho02", "Štruktúra vlastníctva")
);
const hpi = computed(() =>
  slot(data.value?.hpi, "Eurostat prc_hpi_q", "HPI ročný")
);
const income = computed(() =>
  slot(data.value?.income, "Eurostat ilc_di03", "Mediánový príjem")
);

const overall = computed(() => {
  if (pending.value) return { text: "⏳ Sťahujem…", cls: "" };
  const ok = [
    data.value?.overcrowding,
    data.value?.tenure,
    data.value?.hpi,
    data.value?.income,
  ].filter(Boolean).length;
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (ok === 4) return { text: "✓ Aktualizované · " + stamp, cls: "status-line--ok" };
  if (ok === 0) return { text: "⚠ Nepodarilo sa načítať žiadne dáta.", cls: "status-line--err" };
  return { text: "⚠ " + (4 - ok) + "/4 zdrojov zlyhalo · " + stamp, cls: "status-line--warn" };
});
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <div class="charts-grid">
    <article class="chart-panel chart-panel--full">
      <h2>Pomer ceny bytu k príjmu (price-to-income)</h2>
      <p class="sub">
        Koľko mediánových <strong>ročných čistých príjmov</strong> stojí 70 m² byt
        za priemerné €/m² ceny SR. Vychádza z Eurostat HPI a Eurostat
        <a href="https://ec.europa.eu/eurostat/databrowser/view/ilc_di03" target="_blank" rel="noopener">ilc_di03</a>.
      </p>
      <SrcBadge
        :state="hpi.state === 'ok' && income.state === 'ok' ? 'eurostat' : (hpi.state === 'err' || income.state === 'err') ? 'err' : 'load'"
        :label="hpi.state === 'ok' && income.state === 'ok' ? '✓ Zdroj: Eurostat (HPI + ilc_di03)' : 'Sťahujem…'"
      />
      <ChartsPriceToIncomeChart
        v-if="hpi.data && income.data"
        :hpi="hpi.data"
        :income="income.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ HPI a príjmy sa pripravujú…</span>
      </div>
      <p class="note">
        Hrubé porovnanie — používa SR priemernú cenu €/m² škálovanú podľa HPI v čase.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Preľudnenosť bývania</h2>
      <p class="sub">
        Eurostat <a href="https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho05a" target="_blank" rel="noopener">ilc_lvho05a</a> — % populácie žijúcej v preľudnenom byte. SR patrí dlhodobo medzi najhoršie v EÚ.
      </p>
      <SrcBadge :state="overcrowding.state === 'ok' ? 'eurostat' : overcrowding.state === 'err' ? 'err' : 'load'" :label="overcrowding.label" />
      <ChartsOvercrowdingChart
        v-if="overcrowding.data"
        :payload="overcrowding.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Preľudnenosť sa pripravuje…</span>
      </div>
      <p class="note">
        Vysoká preľudnenosť koreluje s tým, že mladí Slováci ostávajú dlho u rodičov.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Štruktúra vlastníctva bývania</h2>
      <p class="sub">
        Eurostat <a href="https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho02" target="_blank" rel="noopener">ilc_lvho02</a> — najnovší dostupný rok. SR má jeden z najvyšších podielov vlastníckeho bývania v EÚ (~92 %).
      </p>
      <SrcBadge :state="tenure.state === 'ok' ? 'eurostat' : tenure.state === 'err' ? 'err' : 'load'" :label="tenure.label" />
      <ChartsTenureStructureChart
        v-if="tenure.data"
        :payload="tenure.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Vlastníctvo sa pripravuje…</span>
      </div>
      <p class="note">
        Nemecko má pre porovnanie ~50 % nájomné, Švajčiarsko ~60 %.
      </p>
    </article>
  </div>
</template>
