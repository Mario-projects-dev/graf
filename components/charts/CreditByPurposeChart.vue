<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { CreditByPurposePayload } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ payload: CreditByPurposePayload }>();
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
          label: "Nefinančné firmy (produktívny úver)",
          data: props.payload.nfc,
          borderColor: "#34d399",
          backgroundColor: "rgba(52, 211, 153, 0.55)",
          fill: "origin",
          stack: "credit",
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "Domácnosti (~85 % hypotéky = aktíva)",
          data: props.payload.households,
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.55)",
          fill: "-1",
          stack: "credit",
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: "Vlády",
          data: props.payload.government,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.55)",
          fill: "-1",
          stack: "credit",
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
          title: {
            display: true,
            text: "Stocky úverov MFI v eurozóne (mld. €)",
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
      height="380"
      role="img"
      aria-label="Stocky bankových úverov v eurozóne podľa účelu — Werner credit guidance"
    ></canvas>
  </div>
</template>
