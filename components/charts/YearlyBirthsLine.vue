<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  years: number[];
  values: number[];
}
const props = defineProps<Props>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.years,
      datasets: [
        {
          label: "Živonarodení (počet)",
          data: props.values,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
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
            label: (c) => " " + (c.parsed.y as number).toLocaleString("sk-SK") + " detí",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#8b9cb3", maxRotation: 45, minRotation: 0 },
          title: { display: true, text: "Rok", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Number(v).toLocaleString("sk-SK"),
          },
          title: { display: true, text: "Počet", color: "#8b9cb3" },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => [props.years, props.values],
  () => {
    if (!chart) return;
    chart.data.labels = props.years;
    chart.data.datasets[0].data = props.values;
    chart.update();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-box">
    <canvas
      ref="canvas"
      height="280"
      role="img"
      aria-label="Ročný trend živonarodených detí na Slovensku"
    ></canvas>
  </div>
</template>
