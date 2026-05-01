<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import { KRAJ_PRICES, SR_AVERAGE_PRICE_M2 } from "~/composables/realityStatic";

Chart.register(...registerables);

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const sorted = [...KRAJ_PRICES].sort((a, b) => b.pricePerM2 - a.pricePerM2);
const labels = sorted.map((k) => k.name);
const values = sorted.map((k) => k.pricePerM2);

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "€/m²",
          data: values,
          backgroundColor: "rgba(245, 158, 11, 0.45)",
          borderColor: "#f59e0b",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.x as number;
              const diff = ((v - SR_AVERAGE_PRICE_M2) / SR_AVERAGE_PRICE_M2) * 100;
              const sign = diff >= 0 ? "+" : "";
              return (
                " " +
                v.toLocaleString("sk-SK") +
                " €/m² (" +
                sign +
                diff.toFixed(0) +
                " % oproti SR priemeru)"
              );
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Number(v).toLocaleString("sk-SK") + " €",
          },
          title: { display: true, text: "€/m²", color: "#8b9cb3" },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#a8b8cc", font: { size: 12 } },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div class="chart-box chart-box--tall" style="height: 380px">
    <canvas
      ref="canvas"
      role="img"
      aria-label="Ceny €/m² podľa kraja, zoradené"
    ></canvas>
  </div>
</template>
