<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  initialNominal?: number;
  initialInflation?: number;
}
const props = withDefaults(defineProps<Props>(), {
  initialNominal: 4,
  initialInflation: 2,
});

const nominal = ref<number>(props.initialNominal);
const inflation = ref<number>(props.initialInflation);

const realExact = computed(
  () => ((1 + nominal.value / 100) / (1 + inflation.value / 100) - 1) * 100
);
const realApprox = computed(() => nominal.value - inflation.value);

function fmt(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(2) + " %";
}
</script>

<template>
  <div class="fisher-calc">
    <div class="fisher-calc__inputs">
      <div class="fisher-calc__field">
        <label for="fisher-i">Nominálna úroková sadzba <strong>i</strong></label>
        <div class="fisher-calc__row">
          <input
            id="fisher-i-range"
            type="range"
            min="-2"
            max="20"
            step="0.1"
            v-model.number="nominal"
            aria-label="Nominálna sadzba (slider)"
          />
          <input
            id="fisher-i"
            type="number"
            min="-2"
            max="20"
            step="0.1"
            v-model.number="nominal"
            class="fisher-calc__num"
          />
          <span class="fisher-calc__unit">%</span>
        </div>
      </div>

      <div class="fisher-calc__field">
        <label for="fisher-pi">Inflácia <strong>π</strong></label>
        <div class="fisher-calc__row">
          <input
            id="fisher-pi-range"
            type="range"
            min="-5"
            max="25"
            step="0.1"
            v-model.number="inflation"
            aria-label="Inflácia (slider)"
          />
          <input
            id="fisher-pi"
            type="number"
            min="-5"
            max="25"
            step="0.1"
            v-model.number="inflation"
            class="fisher-calc__num"
          />
          <span class="fisher-calc__unit">%</span>
        </div>
      </div>
    </div>

    <div class="fisher-calc__output">
      <div class="fisher-calc__formula">
        <code>r = (1 + i) / (1 + π) − 1</code>
      </div>
      <div class="fisher-calc__result">
        <div class="fisher-calc__main">
          <span class="fisher-calc__label">Reálna sadzba <strong>r</strong></span>
          <span
            class="fisher-calc__value"
            :class="realExact >= 0 ? 'is-pos' : 'is-neg'"
            >{{ fmt(realExact) }}</span
          >
        </div>
        <div class="fisher-calc__approx">
          aproximácia (i − π):
          <strong>{{ fmt(realApprox) }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fisher-calc {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.4rem 1.6rem;
}
@media (max-width: 760px) {
  .fisher-calc {
    grid-template-columns: 1fr;
  }
}
.fisher-calc__inputs {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.fisher-calc__field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 0.45rem;
}
.fisher-calc__field strong {
  color: var(--text);
  font-style: italic;
  margin-left: 0.3rem;
}
.fisher-calc__row {
  display: flex;
  gap: 0.7rem;
  align-items: center;
}
.fisher-calc__row input[type="range"] {
  flex: 1;
  accent-color: #34d399;
}
.fisher-calc__num {
  width: 88px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.35rem 0.55rem;
  font-size: 0.95rem;
  font-family: inherit;
}
.fisher-calc__num:focus {
  outline: 2px solid rgba(52, 211, 153, 0.45);
  outline-offset: 1px;
  border-color: rgba(52, 211, 153, 0.5);
}
.fisher-calc__unit {
  color: var(--muted);
  font-size: 0.9rem;
}
.fisher-calc__output {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.95rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--border);
}
@media (max-width: 760px) {
  .fisher-calc__output {
    padding-left: 0;
    padding-top: 1.1rem;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
.fisher-calc__formula {
  font-size: 0.85rem;
  color: var(--muted);
}
.fisher-calc__formula code {
  background: rgba(255, 255, 255, 0.04);
  padding: 0.18rem 0.45rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  font-size: 0.9rem;
}
.fisher-calc__main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.fisher-calc__label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.fisher-calc__value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.fisher-calc__value.is-pos {
  color: #6ee7b7;
}
.fisher-calc__value.is-neg {
  color: #fda4af;
}
.fisher-calc__approx {
  font-size: 0.85rem;
  color: var(--muted);
}
.fisher-calc__approx strong {
  color: var(--text);
}
</style>
