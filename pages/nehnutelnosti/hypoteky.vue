<script setup lang="ts">
import { computed } from "vue";
import { loadMortgageRate } from "~/composables/useReality";
import type { EcbSeries } from "~/composables/useEcb";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

definePageMeta({
  hero: {
    eyebrow: "Nehnuteľnosti · Hypotéky",
    title: "Hypotekárne sadzby a kalkulačka splátky",
    subtitle:
      "Aktuálne a historické sadzby na nové úvery na bývanie v SR plus interaktívny výpočet mesačnej splátky.",
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
  title: "Hypotéky SR — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Hypotekárne sadzby v SR z ECB SDW plus kalkulačka mesačnej splátky.",
    },
  ],
});

interface Bundle {
  rate: EcbSeries | null;
  fetchedAt: number;
}
const { data, pending } = useStaticData<Bundle>(
  "reality.hypoteky",
  async () => {
    const rate = await safeAsync(
      loadMortgageRate,
      null as EcbSeries | null,
      "mortgageRate"
    );
    return { rate, fetchedAt: Date.now() };
  },
  () => ({ rate: null, fetchedAt: 0 })
);

if (import.meta.client) markDataFetched();

interface Slot<T> { state: "load" | "ok" | "err"; label: string; data: T | null; }
const rate = computed<Slot<EcbSeries>>(() => {
  if (pending.value) return { state: "load", label: "", data: null };
  if (data.value?.rate)
    return {
      state: "ok",
      label: "✓ Zdroj: ECB SDW · MIR (SK new loans for house purchase)",
      data: data.value.rate,
    };
  return { state: "err", label: "⚠ ECB MIR: nedostupné", data: null };
});

const overall = computed(() => {
  if (pending.value) return { text: "⏳ Sťahujem…", cls: "" };
  const stamp = data.value?.fetchedAt
    ? new Date(data.value.fetchedAt).toLocaleString("sk-SK")
    : "";
  if (data.value?.rate)
    return { text: "✓ Aktualizované · " + stamp, cls: "status-line--ok" };
  return {
    text: "⚠ Nepodarilo sa načítať sadzby z ECB.",
    cls: "status-line--err",
  };
});

const latestRate = computed<number>(() => {
  const r = data.value?.rate;
  if (!r) return 4.0;
  for (let i = r.values.length - 1; i >= 0; i--) {
    if (r.values[i] != null) return r.values[i] as number;
  }
  return 4.0;
});
const latestRateInfo = computed(() => {
  const r = data.value?.rate;
  if (!r) return null;
  for (let i = r.values.length - 1; i >= 0; i--) {
    if (r.values[i] != null) return { v: r.values[i] as number, time: r.times[i] };
  }
  return null;
});
</script>

<template>
  <p :class="['status-line', overall.cls]">{{ overall.text }}</p>

  <div class="charts-grid">
    <article class="chart-panel chart-panel--full">
      <h2>Hypotekárne sadzby v čase (SR)</h2>
      <p class="sub">
        ECB SDW · MIR — vážený priemer úrokových sadzieb na nové úvery na bývanie
        v SR, mesačná frekvencia od 2003.
      </p>
      <p
        v-if="latestRateInfo"
        class="note"
        style="margin: 0 0 0.85rem; font-size: 0.85rem"
      >
        💡 Posledná hodnota: <strong>{{ latestRateInfo.v.toFixed(2) }} %</strong>
        ({{ latestRateInfo.time }})
      </p>
      <SrcBadge :state="rate.state === 'ok' ? 'eurostat' : rate.state === 'err' ? 'err' : 'load'" :label="rate.label" />
      <ChartsMortgageRatesChart
        v-if="rate.data"
        :series="rate.data"
      />
      <div v-else class="chart-box chart-box--tall chart-box--skeleton">
        <span class="skeleton-label">⏳ Sadzby sa pripravujú…</span>
      </div>
      <p class="note">
        Pokles z 6 % v 2008 → 0.79 % v 2021 → 4.5 %+ v 2023 po prudkom uťahovaní ECB.
      </p>
    </article>

    <article class="chart-panel chart-panel--full">
      <h2>Kalkulačka mesačnej splátky</h2>
      <p class="sub">
        Vstupy: cena nehnuteľnosti, vlastné zdroje, doba splatnosti, úrok, čistý
        príjem. Default úrok = aktuálny ECB priemer.
      </p>
      <CalculatorsMortgageCalculator
        :initial-rate="latestRate"
      />
      <p class="note">
        Vzorec anuitnej splátky:
        <code>m = P · r · (1+r)ⁿ / ((1+r)ⁿ − 1)</code>. NBS limit DSTI = 60 % čistého príjmu.
      </p>
    </article>
  </div>
</template>
