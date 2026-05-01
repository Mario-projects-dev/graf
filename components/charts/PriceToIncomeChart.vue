<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { YearlySeries } from "~/composables/useReality";

Chart.register(...registerables);

interface Props {
  hpi: YearlySeries; // index 2015=100
  income: YearlySeries; // EUR per year
}
const props = defineProps<Props>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

// Compute "rokov mediánového príjmu na 70 m² byt v BA-priemerných cenách 2015"
// Use SR_AVERAGE_PRICE_M2 baseline at index 100, then scale by HPI in time.
import { SR_AVERAGE_PRICE_M2 } from "~/composables/realityStatic";

const computedSeries = computed(() => {
  const incomeMap = new Map<number, number | null>();
  props.income.years.forEach((y, i) => incomeMap.set(y, props.income.values[i]));
  const out: { year: number; ratio: number | null }[] = [];
  for (let i = 0; i < props.hpi.years.length; i++) {
    const yr = props.hpi.years[i];
    const idx = props.hpi.values[i];
    const inc = incomeMap.get(yr);
    if (idx == null || inc == null || inc === 0) {
      out.push({ year: yr, ratio: null });
      continue;
    }
    // Approximate price for 70m² apartment at SR average:
    // price2015 = SR_AVERAGE_PRICE_M2 * 70 (approximation: use current average as 2015 baseline)
    // We instead use index ratio: price(year) = price(now) * (idx_year / idx_latest).
    // For simplicity, baseline_price = SR_AVERAGE_PRICE_M2 × 70 and scale by idx/100.
    const apartmentPrice = (SR_AVERAGE_PRICE_M2 * 70 * idx) / 100;
    const yearsOfIncome = apartmentPrice / inc;
    out.push({ year: yr, ratio: yearsOfIncome });
  }
  return out;
});

function build() {
  if (!canvas.value) return;
  const series = computedSeries.value;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: series.map((s) => s.year),
      datasets: [
        {
          label: "Roky mediánového čistého príjmu na 70 m² byt",
          data: series.map((s) => s.ratio),
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.18)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 6,
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
              return " " + (v as number).toFixed(1) + " ročných príjmov";
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
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Number(v).toFixed(1),
          },
          title: { display: true, text: "Roky príjmu", color: "#8b9cb3" },
          beginAtZero: true,
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  computedSeries,
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
      aria-label="Pomer ceny bytu k priemernému príjmu"
    ></canvas>
  </div>
</template>
