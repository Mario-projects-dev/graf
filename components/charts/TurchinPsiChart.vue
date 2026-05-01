<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { PsiPayload, UsaPsiPayload } from "~/composables/useTurchin";

Chart.register(...registerables);

const props = defineProps<{
  psi: PsiPayload;
  usa: UsaPsiPayload;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  // Combine all years on a single axis for X labels
  const allYears = Array.from(new Set([...props.psi.years, ...props.usa.years])).sort(
    (a, b) => a - b
  );
  const skMap = new Map(props.psi.years.map((y, i) => [y, props.psi.psi[i]]));
  const usaMap = new Map(props.usa.years.map((y, i) => [y, props.usa.psi[i]]));
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: allYears,
      datasets: [
        {
          label: "USA — Turchin (2016) Ages of Discord, Fig. P.1",
          data: allYears.map((y) => usaMap.get(y) ?? null),
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 1.5,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Slovensko — vlastný výpočet (báza 2000 = 1.0)",
          data: allYears.map((y) => skMap.get(y) ?? null),
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 3,
          pointRadius: 2,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Stagflačný prah (0.5)",
          data: allYears.map(() => 0.5),
          borderColor: "rgba(251, 191, 36, 0.4)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [3, 3],
        },
        {
          label: "Krízový prah (0.8)",
          data: allYears.map(() => 0.8),
          borderColor: "rgba(251, 113, 133, 0.5)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [3, 3],
        },
        {
          label: "Vrchol krízy (1.5)",
          data: allYears.map(() => 1.5),
          borderColor: "rgba(220, 38, 38, 0.5)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [3, 3],
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
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e", maxTicksLimit: 12 },
          title: { display: true, text: "rok", color: "#7d8b9e", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: {
            display: true,
            text: "PSI (Political Stress Index)",
            color: "#7d8b9e",
            font: { size: 11 },
          },
          beginAtZero: true,
        },
      },
    },
  });
}
onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(() => [props.psi, props.usa], () => { chart?.destroy(); build(); }, { deep: true });
</script>

<template>
  <div class="chart-box chart-box--tall">
    <canvas ref="canvas" height="320" role="img" aria-label="Turchin PSI: SK vs USA historical" />
  </div>
</template>
