<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { CompareSeries } from "~/composables/useReality";

Chart.register(...registerables);

const props = defineProps<{ payload: CompareSeries }>();
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
          label: "Slovensko",
          data: props.payload.sk,
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.18)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "EÚ27",
          data: props.payload.eu,
          borderColor: "#94a3b8",
          backgroundColor: "transparent",
          borderDash: [5, 4],
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#e8eef5", font: { size: 13 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return " " + c.dataset.label + ": " + (v as number).toFixed(1) + " %";
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
          title: { display: true, text: "% populácie", color: "#8b9cb3" },
          beginAtZero: true,
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => props.payload,
  () => {
    if (!chart) return;
    chart.data.labels = props.payload.years;
    chart.data.datasets[0].data = props.payload.sk;
    chart.data.datasets[1].data = props.payload.eu;
    chart.update();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-box chart-box--tall">
    <canvas
      ref="canvas"
      height="360"
      role="img"
      aria-label="Miera preľudnenosti bývania SR vs EÚ27"
    ></canvas>
  </div>
</template>
