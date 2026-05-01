<script setup lang="ts">
import { computed } from "vue";
import {
  CYCLE_PHASE_LABEL,
  type PsiPayload,
  type CyclePhase,
} from "~/composables/useTurchin";

const props = defineProps<{ psi: PsiPayload }>();

interface PhaseDef {
  key: CyclePhase;
  label: string;
  range: string;
  description: string;
  color: string;
}

const PHASES: PhaseDef[] = [
  {
    key: "integrative",
    label: "Integratívna",
    range: "PSI < 0.5",
    description:
      "Expanzia, kohézia, populačný rast. Inštitúcie majú vysokú legitimitu, real wages rastú s GDP.",
    color: "#34d399",
  },
  {
    key: "stagflation",
    label: "Stagflačná",
    range: "0.5–0.8",
    description:
      "Apogej. Spomalenie rastu, rastúca nerovnosť, elite overproduction sa rozbieha. Politická polarizácia začína.",
    color: "#fbbf24",
  },
  {
    key: "disintegrative",
    label: "Dezintegratívna",
    range: "0.8–1.5",
    description:
      "Kríza. Inštitúcie strácajú legitimitu, counter-elity vznikajú, real wages stagnujú/klesajú. Pravdepodobné parametrické reformy alebo politický chaos.",
    color: "#fb7185",
  },
  {
    key: "peak-crisis",
    label: "Vrchol krízy",
    range: "PSI ≥ 1.5",
    description:
      "Občianska vojna / revolúcia / disolúcia štátu. Historicky (USA 1860, 1930s; Rusko 1917; Francúzsko 1789) signál pre štruktúrnu reformu shora alebo zdola.",
    color: "#dc2626",
  },
];

const currentPhase = computed(() => props.psi.latest?.phase ?? "unknown");
const currentPsi = computed(() => props.psi.latest?.psi ?? null);
const currentYear = computed(() => props.psi.latest?.year ?? null);

// Compute PSI peak in series and trend (last 5 years vs 5 before)
const trend = computed(() => {
  const series = props.psi.psi.filter((v): v is number => v != null);
  if (series.length < 5) return null;
  const recent = series.slice(-5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlier = series.slice(-10, -5);
  if (!earlier.length) return null;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  return recentAvg - earlierAvg;
});

const peak = computed(() => {
  let max = -Infinity;
  let idx = -1;
  for (let i = 0; i < props.psi.psi.length; i++) {
    const v = props.psi.psi[i];
    if (v != null && v > max) {
      max = v;
      idx = i;
    }
  }
  return idx >= 0 ? { year: props.psi.years[idx], psi: max } : null;
});
</script>

<template>
  <div class="phase-block">
    <div class="phase-current">
      <div class="phase-header">
        <span class="phase-eyebrow">Aktuálna fáza ({{ currentYear ?? "—" }})</span>
        <h4>{{ CYCLE_PHASE_LABEL[currentPhase] }}</h4>
      </div>
      <div class="phase-psi">
        PSI = <strong>{{ currentPsi != null ? currentPsi.toFixed(2) : "—" }}</strong>
      </div>
      <div v-if="trend !== null" class="phase-trend">
        Trend posledných 5 r. vs predchádzajúcich 5:
        <strong :class="trend > 0 ? 'up' : 'down'">
          {{ trend > 0 ? "+" : "" }}{{ trend.toFixed(2) }}
        </strong>
        ({{ trend > 0.1 ? "rastie napätie" : trend < -0.1 ? "klesá napätie" : "stabilný" }})
      </div>
      <div v-if="peak" class="phase-peak">
        Maximum v sérii: PSI = {{ peak.psi.toFixed(2) }} ({{ peak.year }})
      </div>
    </div>

    <div class="phase-ladder">
      <div
        v-for="ph in PHASES"
        :key="ph.key"
        :class="['phase-row', { active: ph.key === currentPhase }]"
      >
        <div class="phase-color" :style="{ background: ph.color }"></div>
        <div class="phase-info">
          <strong>{{ ph.label }}</strong>
          <span class="range">{{ ph.range }}</span>
          <p>{{ ph.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phase-block {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}
@media (min-width: 800px) {
  .phase-block { grid-template-columns: 320px 1fr; }
}
.phase-current {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 0.5rem;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.phase-eyebrow {
  font-size: 0.78rem;
  color: #8b9cb3;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.phase-current h4 {
  margin: 0.15rem 0 0;
  font-size: 1.2rem;
  color: #93c5fd;
}
.phase-psi {
  font-size: 0.95rem;
  color: #cdd5e0;
}
.phase-psi strong {
  font-size: 1.4rem;
  color: #60a5fa;
  font-family: ui-monospace, "SF Mono", monospace;
}
.phase-trend, .phase-peak {
  font-size: 0.85rem;
  color: #aab4c4;
}
.phase-trend strong.up { color: #fb7185; }
.phase-trend strong.down { color: #34d399; }
.phase-ladder {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.phase-row {
  display: grid;
  grid-template-columns: 6px 1fr;
  gap: 0.7rem;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.4rem;
  padding: 0.55rem 0.75rem;
  transition: all 0.15s;
}
.phase-row.active {
  background: rgba(96, 165, 250, 0.10);
  border-color: rgba(96, 165, 250, 0.4);
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.15);
}
.phase-color { width: 6px; border-radius: 3px; }
.phase-info strong { color: #cdd5e0; font-size: 0.95rem; }
.phase-info .range {
  font-size: 0.8rem;
  color: #8b9cb3;
  font-family: ui-monospace, "SF Mono", monospace;
  margin-left: 0.5rem;
}
.phase-info p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #aab4c4;
}
.phase-row.active .phase-info strong { color: #93c5fd; }
</style>
