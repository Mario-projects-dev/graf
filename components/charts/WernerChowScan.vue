<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { WernerChowPayload } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{
  h1: WernerChowPayload;
  h2: WernerChowPayload;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

// 5 % critical line: -log10(0.05) ≈ 1.301
const SIG_LINE_5PCT = -Math.log10(0.05);
const SIG_LINE_1PCT = -Math.log10(0.01);

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.h1.scan.map((s) => s.quarter),
      datasets: [
        {
          label: "H₁ kanál (nGDP ← C_R)",
          data: props.h1.scan.map((s) => s.logP),
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.10)",
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          tension: 0.2,
          fill: false,
        },
        {
          label: "H₂ kanál (HPI ← C_F)",
          data: props.h2.scan.map((s) => s.logP),
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.10)",
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          tension: 0.2,
          fill: false,
        },
        {
          label: "kritická hranica 5 %",
          data: props.h1.scan.map(() => SIG_LINE_5PCT),
          borderColor: "rgba(251, 191, 36, 0.5)",
          backgroundColor: "transparent",
          borderWidth: 1.2,
          borderDash: [5, 4],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: "kritická hranica 1 %",
          data: props.h1.scan.map(() => SIG_LINE_1PCT),
          borderColor: "rgba(251, 113, 133, 0.5)",
          backgroundColor: "transparent",
          borderWidth: 1.2,
          borderDash: [5, 4],
          pointRadius: 0,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#cdd5e0", font: { size: 11 } }, position: "bottom" },
        tooltip: {
          callbacks: {
            title: (items) => "Break candidate: " + items[0].label,
            label: (c) => {
              const v = c.parsed.y as number;
              const p = Math.pow(10, -v);
              return " " + c.dataset.label + ": -log₁₀(p) = " + v.toFixed(2) + " (p = " + (p < 0.001 ? "< 0.001" : p.toFixed(3)) + ")";
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e", maxTicksLimit: 12 },
          title: { display: true, text: "kvartál (kandidátny break)", color: "#7d8b9e", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: {
            display: true,
            text: "-log₁₀(p) Chow F-test",
            color: "#7d8b9e",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

async function rebuild() {
  chart?.destroy();
  chart = null;
  await nextTick();
  build();
}
onMounted(rebuild);
onBeforeUnmount(() => chart?.destroy());
watch([() => props.h1, () => props.h2], rebuild);

const peakH1 = computed(() => {
  let best = props.h1.scan[0];
  for (const s of props.h1.scan) if (s.logP > best.logP) best = s;
  return best;
});
const peakH2 = computed(() => {
  let best = props.h2.scan[0];
  for (const s of props.h2.scan) if (s.logP > best.logP) best = s;
  return best;
});
</script>

<template>
  <div class="chow-block">
    <p class="chow-meta">
      Chow break-point F-test (Werner 2005, p. 213): pre každý kandidátny
      kvartál b rozdelíme vzorku, odhadneme distributed-lag regresiu na oboch
      poloviciach a porovnáme so spojeným modelom. Vysoké -log₁₀(p) hodnoty =
      štruktúrny zlom v koeficientoch (β nie je konštantná). Trim 15 % okrajov
      vzorky podľa Andrewsa (1993).
    </p>
    <div class="chow-canvas">
      <canvas
        ref="canvas"
        height="300"
        aria-label="Rolling Chow break-point F-test for H1 and H2 channels"
      ></canvas>
    </div>
    <div class="peaks">
      <div class="peak peak-h1">
        <strong>H₁ peak break:</strong>
        <span>{{ peakH1.quarter }}</span>
        <span class="meta">
          F = {{ peakH1.f.toFixed(2) }}, p = {{ peakH1.pValue < 0.001 ? "< 0.001" : peakH1.pValue.toFixed(3) }}
        </span>
      </div>
      <div class="peak peak-h2">
        <strong>H₂ peak break:</strong>
        <span>{{ peakH2.quarter }}</span>
        <span class="meta">
          F = {{ peakH2.f.toFixed(2) }}, p = {{ peakH2.pValue < 0.001 ? "< 0.001" : peakH2.pValue.toFixed(3) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chow-block {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.chow-meta {
  font-size: 0.9rem;
  color: #b8c5d6;
  background: rgba(15, 23, 42, 0.4);
  border-left: 3px solid rgba(251, 191, 36, 0.45);
  padding: 0.7rem 0.95rem;
  border-radius: 0 0.4rem 0.4rem 0;
  margin: 0;
}
.chow-canvas {
  position: relative;
  height: 320px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  padding: 0.6rem;
}
.peaks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.5rem;
}
.peak {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.4rem;
  padding: 0.55rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.peak-h1 strong { color: #93c5fd; }
.peak-h2 strong { color: #fda4af; }
.peak span.meta {
  font-size: 0.78rem;
  color: #8b9cb3;
}
</style>
