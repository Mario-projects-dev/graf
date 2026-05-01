<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { EmpPayload } from "~/composables/useTurchin";

Chart.register(...registerables);

const props = defineProps<{ payload: EmpPayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  const p = props.payload;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: p.years,
      datasets: [
        {
          label: "Tertiary absolventi (idx 2005=100)",
          data: p.graduatesIdx,
          borderColor: "#a78bfa",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 1.5,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Elite pozície ISCO OC1+OC2 (idx 2005=100)",
          data: p.elitePositionsIdx,
          borderColor: "#34d399",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 1.5,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "EMP ratio = absolventi / elite pozície",
          data: p.empRatio,
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.10)",
          borderWidth: 2,
          pointRadius: 1.5,
          tension: 0.25,
          spanGaps: true,
          yAxisID: "y2",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { color: "#cdd5e0", font: { size: 11 } }, position: "bottom" },
        tooltip: {
          callbacks: {
            title: (items) => "Rok " + items[0].label,
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return " " + c.dataset.label + ": " + (v as number).toFixed(2);
            },
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d8b9e", maxTicksLimit: 10 } },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: { display: true, text: "index (2005 = 100)", color: "#7d8b9e", font: { size: 11 } },
          position: "left",
        },
        y2: {
          grid: { display: false },
          ticks: { color: "#fb7185" },
          title: { display: true, text: "EMP ratio", color: "#fb7185", font: { size: 11 } },
          position: "right",
        },
      },
    },
  });
}
onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(() => props.payload, () => { chart?.destroy(); build(); }, { deep: true });
</script>

<template>
  <div class="chart-box chart-box--tall">
    <canvas ref="canvas" height="280" role="img" aria-label="Elite overproduction: graduates vs ISCO OC1+OC2 positions" />
  </div>
</template>
