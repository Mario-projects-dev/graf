<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface Props {
  initialPrice?: number;
  initialDownPayment?: number;
  initialTerm?: number;
  initialRate?: number;
  /** Optional reference net monthly income (€) for affordability metric. */
  monthlyNetIncome?: number;
}
const props = withDefaults(defineProps<Props>(), {
  initialPrice: 200000,
  initialDownPayment: 40000,
  initialTerm: 30,
  initialRate: 4.0,
  monthlyNetIncome: 1200,
});

const price = ref<number>(props.initialPrice);
const downPayment = ref<number>(props.initialDownPayment);
const term = ref<number>(props.initialTerm);
const rate = ref<number>(props.initialRate);
const income = ref<number>(props.monthlyNetIncome);

watch(
  () => props.initialRate,
  (v) => {
    if (Number.isFinite(v)) rate.value = v;
  }
);

const principal = computed(() => Math.max(0, price.value - downPayment.value));
const monthsTotal = computed(() => Math.max(1, term.value * 12));
const monthlyRate = computed(() => rate.value / 100 / 12);

const monthlyPayment = computed(() => {
  const P = principal.value;
  const r = monthlyRate.value;
  const n = monthsTotal.value;
  if (P <= 0) return 0;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
});

const totalPaid = computed(() => monthlyPayment.value * monthsTotal.value);
const totalInterest = computed(() => Math.max(0, totalPaid.value - principal.value));
const ltv = computed(() =>
  price.value > 0 ? (principal.value / price.value) * 100 : 0
);
const burdenPct = computed(() =>
  income.value > 0 ? (monthlyPayment.value / income.value) * 100 : 0
);

function fmtEur(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("sk-SK") + " €";
}
function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(1) + " %";
}

const burdenClass = computed(() => {
  if (burdenPct.value < 30) return "is-good";
  if (burdenPct.value < 45) return "is-warn";
  return "is-bad";
});
</script>

<template>
  <div class="mort-calc">
    <div class="mort-calc__inputs">
      <div class="mort-calc__field">
        <label for="m-price">Cena nehnuteľnosti</label>
        <div class="mort-calc__row">
          <input
            id="m-price-r"
            type="range"
            min="50000"
            max="800000"
            step="5000"
            v-model.number="price"
            aria-label="Cena (slider)"
          />
          <input
            id="m-price"
            type="number"
            min="0"
            step="1000"
            v-model.number="price"
            class="mort-calc__num"
          />
          <span class="mort-calc__unit">€</span>
        </div>
      </div>
      <div class="mort-calc__field">
        <label for="m-down">Vlastné zdroje</label>
        <div class="mort-calc__row">
          <input
            id="m-down-r"
            type="range"
            min="0"
            :max="price"
            step="1000"
            v-model.number="downPayment"
            aria-label="Vlastné zdroje (slider)"
          />
          <input
            id="m-down"
            type="number"
            min="0"
            step="500"
            v-model.number="downPayment"
            class="mort-calc__num"
          />
          <span class="mort-calc__unit">€</span>
        </div>
      </div>
      <div class="mort-calc__field">
        <label for="m-term">Doba splatnosti</label>
        <div class="mort-calc__row">
          <input
            id="m-term-r"
            type="range"
            min="5"
            max="40"
            step="1"
            v-model.number="term"
            aria-label="Doba splatnosti (slider)"
          />
          <input
            id="m-term"
            type="number"
            min="1"
            max="40"
            step="1"
            v-model.number="term"
            class="mort-calc__num"
          />
          <span class="mort-calc__unit">rokov</span>
        </div>
      </div>
      <div class="mort-calc__field">
        <label for="m-rate">Úroková sadzba (p.a.)</label>
        <div class="mort-calc__row">
          <input
            id="m-rate-r"
            type="range"
            min="0"
            max="10"
            step="0.05"
            v-model.number="rate"
            aria-label="Úroková sadzba (slider)"
          />
          <input
            id="m-rate"
            type="number"
            min="0"
            max="20"
            step="0.05"
            v-model.number="rate"
            class="mort-calc__num"
          />
          <span class="mort-calc__unit">%</span>
        </div>
      </div>
      <div class="mort-calc__field">
        <label for="m-inc">Mesačný čistý príjem</label>
        <div class="mort-calc__row">
          <input
            id="m-inc-r"
            type="range"
            min="500"
            max="5000"
            step="50"
            v-model.number="income"
            aria-label="Príjem (slider)"
          />
          <input
            id="m-inc"
            type="number"
            min="0"
            step="50"
            v-model.number="income"
            class="mort-calc__num"
          />
          <span class="mort-calc__unit">€</span>
        </div>
      </div>
    </div>

    <div class="mort-calc__output">
      <div class="mort-calc__main">
        <span class="mort-calc__label">Mesačná splátka</span>
        <span class="mort-calc__value">{{ fmtEur(monthlyPayment) }}</span>
      </div>
      <div class="mort-calc__grid">
        <div>
          <span class="mort-calc__small-label">Výška úveru</span>
          <span class="mort-calc__small-value">{{ fmtEur(principal) }}</span>
        </div>
        <div>
          <span class="mort-calc__small-label">LTV</span>
          <span class="mort-calc__small-value">{{ fmtPct(ltv) }}</span>
        </div>
        <div>
          <span class="mort-calc__small-label">Celkom zaplatené</span>
          <span class="mort-calc__small-value">{{ fmtEur(totalPaid) }}</span>
        </div>
        <div>
          <span class="mort-calc__small-label">Z toho úroky</span>
          <span class="mort-calc__small-value">{{ fmtEur(totalInterest) }}</span>
        </div>
        <div :class="['mort-calc__burden', burdenClass]">
          <span class="mort-calc__small-label">Splátka / príjem</span>
          <span class="mort-calc__small-value">{{ fmtPct(burdenPct) }}</span>
          <small v-if="burdenClass === 'is-bad'" class="mort-calc__hint"
            >NBS limit 60 % DSTI prekročený</small
          >
          <small v-else-if="burdenClass === 'is-warn'" class="mort-calc__hint"
            >Pomerne vysoké zaťaženie</small
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mort-calc {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.4rem 1.6rem;
}
@media (max-width: 880px) {
  .mort-calc {
    grid-template-columns: 1fr;
  }
}
.mort-calc__inputs {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}
.mort-calc__field label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 0.35rem;
}
.mort-calc__row {
  display: flex;
  gap: 0.65rem;
  align-items: center;
}
.mort-calc__row input[type="range"] {
  flex: 1;
  accent-color: #fb7185;
}
.mort-calc__num {
  width: 100px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.32rem 0.55rem;
  font-size: 0.92rem;
  font-family: inherit;
}
.mort-calc__num:focus {
  outline: 2px solid rgba(251, 113, 133, 0.45);
  outline-offset: 1px;
  border-color: rgba(251, 113, 133, 0.5);
}
.mort-calc__unit {
  color: var(--muted);
  font-size: 0.85rem;
  min-width: 38px;
}
.mort-calc__output {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--border);
}
@media (max-width: 880px) {
  .mort-calc__output {
    padding-left: 0;
    padding-top: 1.1rem;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
.mort-calc__main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.mort-calc__label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.mort-calc__value {
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: #fda4af;
}
.mort-calc__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem 1.1rem;
}
.mort-calc__grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.mort-calc__small-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.mort-calc__small-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}
.mort-calc__burden {
  grid-column: 1 / -1;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
}
.mort-calc__burden.is-good {
  border-color: rgba(52, 211, 153, 0.40);
  background: rgba(52, 211, 153, 0.08);
}
.mort-calc__burden.is-good .mort-calc__small-value {
  color: #6ee7b7;
}
.mort-calc__burden.is-warn {
  border-color: rgba(251, 191, 36, 0.40);
  background: rgba(251, 191, 36, 0.08);
}
.mort-calc__burden.is-warn .mort-calc__small-value {
  color: #fcd34d;
}
.mort-calc__burden.is-bad {
  border-color: rgba(251, 113, 133, 0.45);
  background: rgba(251, 113, 133, 0.10);
}
.mort-calc__burden.is-bad .mort-calc__small-value {
  color: #fda4af;
}
.mort-calc__hint {
  display: block;
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 0.2rem;
}
</style>
