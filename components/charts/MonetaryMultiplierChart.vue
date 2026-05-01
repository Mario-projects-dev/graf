<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { MultiplierPayload } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ payload: MultiplierPayload }>();
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
          label: "M3 / Hotovosť v obehu (násobok)",
          data: props.payload.multiplier,
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.18)",
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
              if (v == null) return " —";
              return " " + (v as number).toFixed(2) + " ×";
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
          title: { display: true, text: "Mesiac", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Number(v).toFixed(1) + " ×",
          },
          title: {
            display: true,
            text: "Násobok M3 nad fyzickou hotovosťou",
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
      aria-label="Monetárny multiplikátor M3 ku hotovosti v obehu"
    ></canvas>
  </div>
</template>
