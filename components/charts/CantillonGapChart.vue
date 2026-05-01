<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { CantillonPayload } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ payload: CantillonPayload }>();
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
          label: "Ceny nehnuteľností (HPI)",
          data: props.payload.hpi,
          borderColor: "#f472b6",
          backgroundColor: "rgba(244, 114, 182, 0.16)",
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "Spotrebiteľské ceny (HICP)",
          data: props.payload.hicp,
          borderColor: "#fbbf24",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          spanGaps: true,
        },
        {
          label: "Čisté mzdy",
          data: props.payload.wages,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.10)",
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
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
            title: (items) =>
              "Rok " +
              items[0].label +
              " · base " +
              props.payload.baseYear +
              " = 100",
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return (
                " " + c.dataset.label + ": " + (v as number).toFixed(0) + " idx"
              );
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
          ticks: { color: "#8b9cb3" },
          title: {
            display: true,
            text: "Index (" + props.payload.baseYear + " = 100)",
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
      aria-label="Cantillon efekt — ceny aktív vs spotrebiteľské ceny vs mzdy"
    ></canvas>
  </div>
</template>
