<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { EnergyMoneyPayload } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ payload: EnergyMoneyPayload }>();
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
          label: "Energetická efektivita HDP/energia (idx)",
          data: props.payload.energyIntensity,
          yAxisID: "y",
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.18)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "Soddy index: kWh za 1 €",
          data: props.payload.kwhPerEuro,
          yAxisID: "y1",
          borderColor: "#fbbf24",
          backgroundColor: "transparent",
          borderDash: [5, 4],
          fill: false,
          tension: 0.25,
          pointRadius: 3,
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
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              if (c.datasetIndex === 0)
                return " " + c.dataset.label + ": " + (v as number).toFixed(0);
              return (
                " " +
                c.dataset.label +
                ": " +
                (v as number).toFixed(2) +
                " kWh/€"
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
          position: "left",
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#34d399" },
          title: {
            display: true,
            text: "Efektivita HDP/energia (idx)",
            color: "#34d399",
          },
        },
        y1: {
          position: "right",
          grid: { display: false },
          ticks: {
            color: "#fbbf24",
            callback: (v) => Number(v).toFixed(1),
          },
          title: {
            display: true,
            text: "kWh za 1 € (Soddy)",
            color: "#fbbf24",
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
      aria-label="Soddy index a energetická efektivita HDP"
    ></canvas>
  </div>
</template>
