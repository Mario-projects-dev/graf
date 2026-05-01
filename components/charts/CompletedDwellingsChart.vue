<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { ConstructionPayload } from "~/composables/useReality";

Chart.register(...registerables);

const props = defineProps<{ payload: ConstructionPayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels: props.payload.years,
      datasets: [
        {
          label: "Dokončené byty",
          data: props.payload.completed,
          backgroundColor: "rgba(52, 211, 153, 0.55)",
          borderColor: "#34d399",
          borderWidth: 1,
          borderRadius: 4,
          stack: "x",
        },
        {
          label: "Začaté byty",
          data: props.payload.started,
          backgroundColor: "rgba(96, 165, 250, 0.45)",
          borderColor: "#60a5fa",
          borderWidth: 1,
          borderRadius: 4,
          type: "line",
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
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
                Math.round(v as number).toLocaleString("sk-SK")
              );
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8b9cb3", maxRotation: 45 },
          title: { display: true, text: "Rok", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Number(v).toLocaleString("sk-SK"),
          },
          title: { display: true, text: "Počet bytov", color: "#8b9cb3" },
          beginAtZero: true,
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
      aria-label="Začaté a dokončené byty v SR ročne"
    ></canvas>
  </div>
</template>
