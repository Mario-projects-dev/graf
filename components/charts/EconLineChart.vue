<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  times: string[];
  sk: (number | null)[];
  eu: (number | null)[];
  yLabel: string;
  yPercent: boolean;
  color1: string;
  color2?: string;
  ariaLabel: string;
}
const props = withDefaults(defineProps<Props>(), {
  color2: "#94a3b8",
});

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
          label: "Slovensko",
          data: props.sk,
          borderColor: props.color1,
          backgroundColor: props.color1 + "22",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "EÚ27",
          data: props.eu,
          borderColor: props.color2,
          backgroundColor: "transparent",
          borderDash: [5, 4],
          fill: false,
          tension: 0.25,
          pointRadius: 0,
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
              const formatted = props.yPercent
                ? (v as number).toFixed(1) + " %"
                : Math.round(v as number).toLocaleString("sk-SK") + " €";
              return " " + c.dataset.label + ": " + formatted;
            },
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
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) =>
              props.yPercent ? v + " %" : Number(v).toLocaleString("sk-SK"),
          },
          title: { display: true, text: props.yLabel, color: "#8b9cb3" },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => [props.times, props.sk, props.eu],
  () => {
    if (!chart) return;
    chart.data.labels = props.times;
    chart.data.datasets[0].data = props.sk;
    chart.data.datasets[1].data = props.eu;
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
      :aria-label="ariaLabel"
    ></canvas>
  </div>
</template>
