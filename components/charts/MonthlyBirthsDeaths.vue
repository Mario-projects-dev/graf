<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  labels: string[];
  births: number[];
  deaths: number[];
}
const props = defineProps<Props>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.labels,
      datasets: [
        {
          label: "Živonarodení",
          data: props.births,
          borderColor: "#ec4899",
          backgroundColor: "rgba(236, 72, 153, 0.08)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          order: 2,
        },
        {
          label: "Zomretí",
          data: props.deaths,
          borderColor: "#94a3b8",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          order: 1,
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
            title: (items) => items[0]?.label || "",
            label: (c) =>
              " " + c.dataset.label + ": " + (c.parsed.y as number).toLocaleString("sk-SK"),
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#8b9cb3", maxRotation: 0, autoSkip: true, maxTicksLimit: 18 },
          title: { display: true, text: "Mesiac a rok", color: "#8b9cb3" },
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
  () => [props.labels, props.births, props.deaths],
  () => {
    if (!chart) return;
    chart.data.labels = props.labels;
    chart.data.datasets[0].data = props.births;
    chart.data.datasets[1].data = props.deaths;
    chart.update();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-box chart-box--monthly">
    <canvas
      ref="canvas"
      height="360"
      role="img"
      aria-label="Mesačné počty živonarodených a úmrtí"
    ></canvas>
  </div>
</template>
