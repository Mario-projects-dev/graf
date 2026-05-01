<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { WealthPumpPayload } from "~/composables/useTurchin";

Chart.register(...registerables);

const props = defineProps<{ payload: WealthPumpPayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  const p = props.payload;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: p.years,
      datasets: [
        {
          label: "Gini koeficient (Eurostat ilc_di11)",
          data: p.gini,
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 2,
          tension: 0.25,
          spanGaps: true,
          yAxisID: "y",
        },
        {
          label: "S80/S20 quintile share ratio (ilc_di11c)",
          data: p.s80s20,
          borderColor: "#fbbf24",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.25,
          spanGaps: true,
          yAxisID: "y2",
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
            title: (items) => "Rok " + items[0].label,
            label: (c) =>
              c.parsed.y == null
                ? " " + c.dataset.label + ": —"
                : " " + c.dataset.label + ": " + (c.parsed.y as number).toFixed(1),
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d8b9e", maxTicksLimit: 10 } },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#fb7185" },
          title: { display: true, text: "Gini (0–100)", color: "#fb7185", font: { size: 11 } },
          position: "left",
        },
        y2: {
          grid: { display: false },
          ticks: { color: "#fbbf24" },
          title: { display: true, text: "S80/S20 ratio", color: "#fbbf24", font: { size: 11 } },
          position: "right",
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
    <canvas ref="canvas" height="280" role="img" aria-label="Wealth pump: Gini and S80/S20 in time" />
  </div>
</template>
