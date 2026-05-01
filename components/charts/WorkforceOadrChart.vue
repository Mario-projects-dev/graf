<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { WorkforceProjectionPayload } from "~/composables/usePredikcie";

Chart.register(...registerables);

const props = defineProps<{ payload: WorkforceProjectionPayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const THRESHOLDS = [
  { val: 30, label: "súčasný EÚ priemer" },
  { val: 60, label: "OECD prah pre nutnú reformu" },
];

function build() {
  if (!canvas.value) return;
  const yrs = props.payload.years;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: yrs,
      datasets: [
        {
          label: "OADR — Baseline",
          data: props.payload.scenarios.base.oadr,
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "OADR — Vysoká migrácia",
          data: props.payload.scenarios.high.oadr,
          borderColor: "#34d399",
          backgroundColor: "transparent",
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.25,
          borderDash: [5, 4],
          spanGaps: true,
        },
        {
          label: "OADR — Nízka migrácia",
          data: props.payload.scenarios.low.oadr,
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.25,
          borderDash: [5, 4],
          spanGaps: true,
        },
        ...THRESHOLDS.map((t) => ({
          label: t.label + " (" + t.val + " %)",
          data: yrs.map(() => t.val),
          borderColor: t.val >= 60 ? "rgba(251, 113, 133, 0.5)" : "rgba(251, 191, 36, 0.5)",
          backgroundColor: "transparent",
          borderWidth: 1.2,
          pointRadius: 0,
          borderDash: [3, 3],
        })),
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
            title: (items) => "Rok " + items[0].label,
            label: (c) => " " + c.dataset.label + ": " + (c.parsed.y as number).toFixed(1) + " %",
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d8b9e", maxTicksLimit: 10 } },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e", callback: (v) => v + " %" },
          title: { display: true, text: "Old-age dependency ratio = pop(65+) / pop(20–64) × 100", color: "#7d8b9e", font: { size: 11 } },
        },
      },
    },
  });
}
onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(() => props.payload, () => { chart?.destroy(); build(); }, { deep: true });
</script>

<template>
  <div class="chart-box chart-box--tall">
    <canvas ref="canvas" height="320" role="img" aria-label="Old-age dependency ratio projekcia" />
  </div>
</template>
