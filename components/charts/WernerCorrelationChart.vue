<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  years: number[];
  gCredit: (number | null)[];
  gTarget: (number | null)[];
  creditLabel: string;
  targetLabel: string;
  creditColor?: string;
  targetColor?: string;
  /** Pearson r */
  r: number | null;
  /** OLS slope β: Δtarget per Δcredit */
  beta: number | null;
  /** Number of overlapping observations */
  n: number;
  ariaLabel: string;
}
const props = withDefaults(defineProps<Props>(), {
  creditColor: "#34d399",
  targetColor: "#60a5fa",
});

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const r2 = computed(() => (props.r != null ? props.r * props.r : null));
const sign = computed(() => {
  if (props.r == null) return null;
  if (Math.abs(props.r) > 0.7) return "strong";
  if (Math.abs(props.r) > 0.4) return "moderate";
  return "weak";
});

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.years,
      datasets: [
        {
          label: "g(" + props.creditLabel + ")",
          data: props.gCredit,
          borderColor: props.creditColor,
          backgroundColor: props.creditColor + "26",
          fill: false,
          tension: 0.25,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "g(" + props.targetLabel + ")",
          data: props.gTarget,
          borderColor: props.targetColor,
          backgroundColor: "transparent",
          borderDash: [5, 4],
          fill: false,
          tension: 0.25,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#e8eef5", font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return " " + c.dataset.label + ": " + (v as number).toFixed(2) + " %";
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#8b9cb3" },
          title: { display: true, text: "Rok", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#8b9cb3", callback: (v) => v + " %" },
          title: {
            display: true,
            text: "Medziročná zmena (%)",
            color: "#8b9cb3",
          },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => [props.years, props.gCredit, props.gTarget],
  () => {
    if (!chart) return;
    chart.destroy();
    build();
  },
  { deep: true }
);
</script>

<template>
  <div class="werner-corr">
    <div class="werner-corr__stats">
      <div class="werner-corr__stat">
        <span class="werner-corr__label">Pearson r</span>
        <span :class="['werner-corr__value', sign]">
          {{ r != null ? (r >= 0 ? "+" : "") + r.toFixed(3) : "—" }}
        </span>
      </div>
      <div class="werner-corr__stat">
        <span class="werner-corr__label">R²</span>
        <span class="werner-corr__value">
          {{ r2 != null ? r2.toFixed(3) : "—" }}
        </span>
      </div>
      <div class="werner-corr__stat">
        <span class="werner-corr__label">β (OLS slope)</span>
        <span class="werner-corr__value">
          {{ beta != null ? (beta >= 0 ? "+" : "") + beta.toFixed(3) : "—" }}
        </span>
      </div>
      <div class="werner-corr__stat">
        <span class="werner-corr__label">n</span>
        <span class="werner-corr__value">{{ n }}</span>
      </div>
    </div>
    <div class="chart-box chart-box--tall">
      <canvas
        ref="canvas"
        height="320"
        role="img"
        :aria-label="ariaLabel"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.werner-corr {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.werner-corr__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem 0.95rem;
}
@media (max-width: 720px) {
  .werner-corr__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.werner-corr__stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.werner-corr__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.werner-corr__value {
  font-family: "JetBrains Mono", "Fira Code", Menlo, monospace;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
}
.werner-corr__value.strong { color: #6ee7b7; }
.werner-corr__value.moderate { color: #fcd34d; }
.werner-corr__value.weak { color: #fda4af; }
</style>
