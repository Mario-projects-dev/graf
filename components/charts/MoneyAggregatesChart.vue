<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  times: string[];
  m1: (number | null)[];
  m2: (number | null)[];
  m3: (number | null)[];
}
const props = defineProps<Props>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.times,
      datasets: [
        {
          label: "M1",
          data: props.m1,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.10)",
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          spanGaps: true,
        },
        {
          label: "M2",
          data: props.m2,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.10)",
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          spanGaps: true,
        },
        {
          label: "M3",
          data: props.m3,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.18)",
          fill: true,
          tension: 0.2,
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
              return (
                " " +
                c.dataset.label +
                ": " +
                Math.round(v / 1000).toLocaleString("sk-SK") +
                " mld. €"
              );
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#8b9cb3",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 14,
          },
          title: { display: true, text: "Mesiac a rok", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) =>
              Math.round(Number(v) / 1000).toLocaleString("sk-SK") + " mld.",
          },
          title: { display: true, text: "Stocks (mld. €)", color: "#8b9cb3" },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => [props.times, props.m1, props.m2, props.m3],
  () => {
    if (!chart) return;
    chart.data.labels = props.times;
    chart.data.datasets[0].data = props.m1;
    chart.data.datasets[1].data = props.m2;
    chart.data.datasets[2].data = props.m3;
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
      aria-label="Menové agregáty M1, M2, M3 v eurozóne"
    ></canvas>
  </div>
</template>
