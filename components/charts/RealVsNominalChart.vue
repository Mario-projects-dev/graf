<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { AnnualSeries } from "~/composables/useMakro";

Chart.register(...registerables);

interface Props {
  yields: AnnualSeries;
  inflation: AnnualSeries;
}
const props = defineProps<Props>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const merged = computed(() => {
  const yMap = new Map<number, number | null>();
  props.yields.years.forEach((y, i) => yMap.set(y, props.yields.values[i]));
  const iMap = new Map<number, number | null>();
  props.inflation.years.forEach((y, i) => iMap.set(y, props.inflation.values[i]));
  const allYears = Array.from(
    new Set([...props.yields.years, ...props.inflation.years])
  ).sort((a, b) => a - b);
  const yields: (number | null)[] = [];
  const inflation: (number | null)[] = [];
  const real: (number | null)[] = [];
  for (const yr of allYears) {
    const y = yMap.get(yr) ?? null;
    const inf = iMap.get(yr) ?? null;
    yields.push(y);
    inflation.push(inf);
    if (y != null && inf != null) {
      // Fisher: (1+i)/(1+π) - 1
      real.push(((1 + y / 100) / (1 + inf / 100) - 1) * 100);
    } else {
      real.push(null);
    }
  }
  return { years: allYears, yields, inflation, real };
});

function build() {
  if (!canvas.value) return;
  const { years, yields, inflation, real } = merged.value;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Nominálna 10Y",
          data: yields,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.08)",
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "Inflácia HICP",
          data: inflation,
          borderColor: "#fbbf24",
          backgroundColor: "transparent",
          fill: false,
          borderDash: [5, 4],
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          spanGaps: true,
        },
        {
          label: "Reálna sadzba",
          data: real,
          borderColor: "#f472b6",
          backgroundColor: "rgba(244, 114, 182, 0.18)",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
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
              return " " + c.dataset.label + ": " + (v as number).toFixed(2) + " %";
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
          ticks: { color: "#8b9cb3", callback: (v) => v + " %" },
          title: { display: true, text: "%", color: "#8b9cb3" },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  merged,
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
      aria-label="Reálna vs nominálna úroková miera SR"
    ></canvas>
  </div>
</template>
