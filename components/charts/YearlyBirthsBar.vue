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
    type: "bar",
    data: {
      labels: props.years,
      datasets: [
        {
          label: "Živonarodení (SR, ročne)",
          data: props.values,
          backgroundColor: "rgba(34, 197, 94, 0.45)",
          borderColor: "#22c55e",
          borderWidth: 1,
          borderRadius: 4,
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
            label: (c) =>
              " " + (c.parsed.y as number).toLocaleString("sk-SK") + " živonarodených",
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
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
          beginAtZero: true,
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
      aria-label="Stĺpcový graf živonarodených podľa rokov"
    ></canvas>
  </div>
</template>
