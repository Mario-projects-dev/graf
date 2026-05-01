<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { EcbSeries } from "~/composables/useEcb";
import type { KeyRatesPayload } from "~/composables/useMakro";

Chart.register(...registerables);

interface Props {
  rates: KeyRatesPayload;
  euribor: EcbSeries;
}
const props = defineProps<Props>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function buildLabels(): string[] {
  // Merge timelines (rate change dates + euribor monthly observations).
  const set = new Set<string>([...props.rates.times, ...props.euribor.times]);
  return Array.from(set).sort();
}

function alignTo(times: string[], src: { times: string[]; values: (number | null)[] }) {
  const m = new Map<string, number | null>();
  for (let i = 0; i < src.times.length; i++) m.set(src.times[i], src.values[i]);
  let last: number | null = null;
  return times.map((t) => {
    if (m.has(t)) {
      const v = m.get(t);
      if (v != null) last = v;
    }
    return last;
  });
}

function build() {
  if (!canvas.value) return;
  const times = buildLabels();
  const datasets = [
    {
      label: "MRO",
      data: alignTo(times, { times: props.rates.times, values: props.rates.series.MRR }),
      borderColor: "#60a5fa",
      backgroundColor: "rgba(96, 165, 250, 0.08)",
      fill: false,
      stepped: true as const,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      spanGaps: true,
    },
    {
      label: "Depozitná",
      data: alignTo(times, { times: props.rates.times, values: props.rates.series.DFR }),
      borderColor: "#fbbf24",
      backgroundColor: "transparent",
      fill: false,
      stepped: true as const,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      spanGaps: true,
    },
    {
      label: "Marginálna",
      data: alignTo(times, { times: props.rates.times, values: props.rates.series.MLFR }),
      borderColor: "#fb7185",
      backgroundColor: "transparent",
      fill: false,
      stepped: true as const,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      spanGaps: true,
    },
    {
      label: "Euribor 3M",
      data: alignTo(times, props.euribor),
      borderColor: "#a78bfa",
      backgroundColor: "rgba(167, 139, 250, 0.10)",
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      borderDash: [5, 4],
      spanGaps: true,
    },
  ];
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: { labels: times, datasets },
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
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#8b9cb3", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
          title: { display: true, text: "Dátum", color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#8b9cb3", callback: (v) => v + " %" },
          title: { display: true, text: "% p.a.", color: "#8b9cb3" },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => [props.rates, props.euribor],
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
      aria-label="ECB kľúčové sadzby a 3M Euribor"
    ></canvas>
  </div>
</template>
