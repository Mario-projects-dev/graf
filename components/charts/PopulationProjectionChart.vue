<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { PopulationProjectionPayload } from "~/composables/usePredikcie";

Chart.register(...registerables);

const props = defineProps<{ payload: PopulationProjectionPayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.payload.years,
      datasets: [
        {
          label: "Vysoká migrácia (optimistický)",
          data: props.payload.high,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.10)",
          borderWidth: 2,
          fill: "+1",
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Baseline EUROPOP2023",
          data: props.payload.base,
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Nízka migrácia (pesimistický)",
          data: props.payload.low,
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          borderDash: [4, 4],
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#cdd5e0", font: { size: 12 } }, position: "bottom" },
        tooltip: {
          callbacks: {
            title: (items) => "Rok " + items[0].label,
            label: (c) =>
              " " + c.dataset.label + ": " + ((c.parsed.y as number) / 1e6).toFixed(2) + " mil.",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e", maxTicksLimit: 10 },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#7d8b9e",
            callback: (v) => ((v as number) / 1e6).toFixed(1) + " mil.",
          },
          title: {
            display: true,
            text: "Populácia SR",
            color: "#7d8b9e",
            font: { size: 11 },
          },
        },
      },
    },
  });
}
onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(() => props.payload, () => {
  chart?.destroy();
  build();
}, { deep: true });
</script>

<template>
  <div class="chart-box chart-box--tall">
    <canvas ref="canvas" height="320" role="img" aria-label="Populácia SR — projekcie EUROPOP2023" />
  </div>
</template>
