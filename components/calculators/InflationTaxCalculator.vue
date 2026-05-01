<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { HicpAnnualSeries } from "~/composables/useMonetarnaReforma";

interface Props {
  hicp: HicpAnnualSeries;
}
const props = defineProps<Props>();

const startYear = ref<number>(2010);
const amount = ref<number>(10000);

// Latest available HICP year
const latestYear = computed(() => {
  for (let i = props.hicp.years.length - 1; i >= 0; i--) {
    if (props.hicp.index[i] != null) return props.hicp.years[i];
  }
  return new Date().getFullYear();
});
const earliestYear = computed(() => props.hicp.years[0] || 2000);

watch(latestYear, (yr) => {
  if (startYear.value >= yr) startYear.value = yr - 1;
});

function indexFor(year: number): number | null {
  const i = props.hicp.years.indexOf(year);
  if (i < 0) return null;
  return props.hicp.index[i];
}

const startIdx = computed(() => indexFor(startYear.value));
const endIdx = computed(() => indexFor(latestYear.value));

const realToday = computed<number | null>(() => {
  const s = startIdx.value;
  const e = endIdx.value;
  if (s == null || e == null || s === 0) return null;
  // amount.value at startYear → real value today
  return amount.value * (s / e);
});
const lossEur = computed<number | null>(() => {
  if (realToday.value == null) return null;
  return amount.value - realToday.value;
});
const lossPct = computed<number | null>(() => {
  if (realToday.value == null || amount.value === 0) return null;
  return ((amount.value - realToday.value) / amount.value) * 100;
});
const yearsBetween = computed(() => latestYear.value - startYear.value);
const annualizedInflation = computed<number | null>(() => {
  const s = startIdx.value;
  const e = endIdx.value;
  const n = yearsBetween.value;
  if (s == null || e == null || s === 0 || n <= 0) return null;
  return (Math.pow(e / s, 1 / n) - 1) * 100;
});

function fmtEur(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("sk-SK") + " €";
}
function fmtPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1) + " %";
}

const cls = computed(() => {
  const p = lossPct.value;
  if (p == null) return "";
  if (p < 10) return "is-mild";
  if (p < 30) return "is-medium";
  return "is-severe";
});
</script>

<template>
  <div class="inflation-calc">
    <div class="inflation-calc__inputs">
      <div class="inflation-calc__field">
        <label for="if-amount">Suma pri ktorej začínaš</label>
        <div class="inflation-calc__row">
          <input
            id="if-amount-r"
            type="range"
            min="100"
            max="200000"
            step="100"
            v-model.number="amount"
            aria-label="Suma (slider)"
          />
          <input
            id="if-amount"
            type="number"
            min="0"
            step="100"
            v-model.number="amount"
            class="inflation-calc__num"
          />
          <span class="inflation-calc__unit">€</span>
        </div>
      </div>
      <div class="inflation-calc__field">
        <label for="if-year">Štartovací rok</label>
        <div class="inflation-calc__row">
          <input
            id="if-year-r"
            type="range"
            :min="earliestYear"
            :max="latestYear - 1"
            step="1"
            v-model.number="startYear"
            aria-label="Rok (slider)"
          />
          <input
            id="if-year"
            type="number"
            :min="earliestYear"
            :max="latestYear - 1"
            step="1"
            v-model.number="startYear"
            class="inflation-calc__num"
          />
          <span class="inflation-calc__unit">→ {{ latestYear }}</span>
        </div>
      </div>
    </div>

    <div class="inflation-calc__output">
      <div class="inflation-calc__main">
        <span class="inflation-calc__label">Reálna kúpna sila dnes</span>
        <span :class="['inflation-calc__value', cls]">{{ fmtEur(realToday) }}</span>
      </div>
      <div class="inflation-calc__grid">
        <div>
          <span class="inflation-calc__small-label">Strata na inflácii</span>
          <span class="inflation-calc__small-value">{{ fmtEur(lossEur) }}</span>
        </div>
        <div>
          <span class="inflation-calc__small-label">% strata</span>
          <span class="inflation-calc__small-value">{{ fmtPct(lossPct) }}</span>
        </div>
        <div>
          <span class="inflation-calc__small-label">Priemerná inflácia p.a.</span>
          <span class="inflation-calc__small-value">{{ fmtPct(annualizedInflation) }}</span>
        </div>
        <div>
          <span class="inflation-calc__small-label">Roky</span>
          <span class="inflation-calc__small-value">{{ yearsBetween }} r.</span>
        </div>
      </div>
      <p class="inflation-calc__note">
        💡 Údaj počíta cez ročný HICP index Eurostatu (CP00). Pre roky pred 2009 sú dáta uvedené v EUR ekvivalente cez SKK paritu, takže po 2009 je porovnanie najpresnejšie.
      </p>
    </div>
  </div>
</template>

<style scoped>
.inflation-calc {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.4rem 1.6rem;
}
@media (max-width: 880px) {
  .inflation-calc {
    grid-template-columns: 1fr;
  }
}
.inflation-calc__inputs {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.inflation-calc__field label {
  display: block;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.inflation-calc__row {
  display: flex;
  gap: 0.7rem;
  align-items: center;
}
.inflation-calc__row input[type="range"] {
  flex: 1;
  accent-color: #fbbf24;
}
.inflation-calc__num {
  width: 100px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.32rem 0.55rem;
  font-size: 0.92rem;
  font-family: inherit;
}
.inflation-calc__num:focus {
  outline: 2px solid rgba(251, 191, 36, 0.45);
  outline-offset: 1px;
  border-color: rgba(251, 191, 36, 0.5);
}
.inflation-calc__unit {
  color: var(--muted);
  font-size: 0.85rem;
  min-width: 48px;
}
.inflation-calc__output {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--border);
}
@media (max-width: 880px) {
  .inflation-calc__output {
    padding-left: 0;
    padding-top: 1.1rem;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
.inflation-calc__main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.inflation-calc__label {
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.inflation-calc__value {
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--text);
}
.inflation-calc__value.is-mild { color: #fcd34d; }
.inflation-calc__value.is-medium { color: #fbbf24; }
.inflation-calc__value.is-severe { color: #fda4af; }
.inflation-calc__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}
.inflation-calc__grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.inflation-calc__small-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.inflation-calc__small-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}
.inflation-calc__note {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.5;
}
</style>
