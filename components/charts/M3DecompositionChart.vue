<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { M3DecompositionPayload } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ payload: M3DecompositionPayload }>();
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
          label: "Hotovosť (L10)",
          data: props.payload.cash,
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.55)",
          fill: "origin",
          stack: "m3",
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "Vklady na požiadanie (M1 − L10)",
          data: props.payload.overnight,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.55)",
          fill: "-1",
          stack: "m3",
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "Krátkodobé vklady (M2 − M1)",
          data: props.payload.shortTerm,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.55)",
          fill: "-1",
          stack: "m3",
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "Trhové nástroje (M3 − M2)",
          data: props.payload.marketable,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.55)",
          fill: "-1",
          stack: "m3",
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#e8eef5", font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return (
                " " +
                c.dataset.label +
                ": " +
                Math.round((v as number) / 1000).toLocaleString("sk-SK") +
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
          title: { display: true, text: "Mesiac", color: "#8b9cb3" },
        },
        y: {
          stacked: true,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) =>
              Math.round(Number(v) / 1000).toLocaleString("sk-SK") + " mld.",
          },
          title: { display: true, text: "Komponenty M3 (mld. €)", color: "#8b9cb3" },
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
      height="380"
      role="img"
      aria-label="Dekompozícia M3 — hotovosť, vklady, trhové nástroje"
    ></canvas>
  </div>
</template>
