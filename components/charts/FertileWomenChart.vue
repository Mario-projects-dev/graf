<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  years: number[];
  total: number[];
  age15_24: number[];
  age25_34: number[];
  age35_49: number[];
}
const props = defineProps<Props>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("sk-SK");
}

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.years,
      datasets: [
        {
          label: "15–24 r.",
          data: props.age15_24,
          backgroundColor: "rgba(244, 114, 182, 0.55)",
          borderColor: "#f472b6",
          borderWidth: 1,
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          stack: "bands",
          order: 3,
        },
        {
          label: "25–34 r. (vrchol plodnosti)",
          data: props.age25_34,
          backgroundColor: "rgba(251, 191, 36, 0.55)",
          borderColor: "#fbbf24",
          borderWidth: 1,
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          stack: "bands",
          order: 2,
        },
        {
          label: "35–49 r.",
          data: props.age35_49,
          backgroundColor: "rgba(96, 165, 250, 0.55)",
          borderColor: "#60a5fa",
          borderWidth: 1,
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          stack: "bands",
          order: 1,
        },
        {
          label: "Spolu 15–49 r.",
          data: props.total,
          borderColor: "#e8eef5",
          backgroundColor: "transparent",
          borderWidth: 2.25,
          borderDash: [],
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 5,
          order: 0,
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
            title: (items) => "Rok " + items[0]?.label,
            label: (c) =>
              " " + c.dataset.label + ": " + fmt(c.parsed.y as number) + " žien",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 14,
          },
          title: { display: true, text: "Rok", color: "#8b9cb3" },
        },
        y: {
          stacked: true,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Number(v).toLocaleString("sk-SK"),
          },
          title: {
            display: true,
            text: "Počet žien",
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
  () => [props.years, props.total, props.age15_24, props.age25_34, props.age35_49],
  () => {
    if (!chart) return;
    chart.data.labels = props.years;
    chart.data.datasets[0].data = props.age15_24;
    chart.data.datasets[1].data = props.age25_34;
    chart.data.datasets[2].data = props.age35_49;
    chart.data.datasets[3].data = props.total;
    chart.update();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-box chart-box--tall">
    <canvas
      ref="canvas"
      height="380"
      role="img"
      aria-label="Počet žien v plodnom veku 15–49 v SR od roku 1960"
    ></canvas>
  </div>
</template>
