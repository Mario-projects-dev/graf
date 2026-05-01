<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { RealHpi } from "~/composables/useReality";

Chart.register(...registerables);

const props = defineProps<{ payload: RealHpi }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.payload.times,
      datasets: [
        {
          label: "Nominálny HPI",
          data: props.payload.nominal,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.10)",
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "Reálny HPI (deflátor HICP)",
          data: props.payload.real,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.18)",
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
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
        legend: { labels: { color: "#e8eef5", font: { size: 13 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return " " + c.dataset.label + ": " + (v as number).toFixed(1);
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#8b9cb3", maxRotation: 0, autoSkip: true, maxTicksLimit: 14 },
          title: { display: true, text: "Kvartál", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#8b9cb3" },
          title: {
            display: true,
            text: "Index (2015 = 100)",
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
  () => props.payload,
  () => {
    if (!chart) return;
    chart.destroy();
    build();
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
      aria-label="Reálny vs nominálny House Price Index SR"
    ></canvas>
  </div>
</template>
