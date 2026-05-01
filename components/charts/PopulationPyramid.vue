<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { PyramidBand } from "~/composables/useDemografia";

Chart.register(...registerables);

interface Props {
  bands: PyramidBand[];
}
const props = defineProps<Props>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function axisMaxFor(bands: PyramidBand[]): number {
  let m = 0;
  for (const b of bands) m = Math.max(m, b.m, b.f);
  return m + Math.ceil(m * 0.04);
}

function build() {
  if (!canvas.value) return;
  const max = axisMaxFor(props.bands);
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels: props.bands.map((b) => b.label),
      datasets: [
        {
          label: "Muži",
          data: props.bands.map((b) => -b.m),
          backgroundColor: "rgba(56, 189, 248, 0.5)",
          borderColor: "#38bdf8",
          borderWidth: 1,
          barThickness: 12,
        },
        {
          label: "Ženy",
          data: props.bands.map((b) => b.f),
          backgroundColor: "rgba(244, 114, 182, 0.48)",
          borderColor: "#f472b6",
          borderWidth: 1,
          barThickness: 12,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#e8eef5", font: { size: 13 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const n = Math.abs(c.parsed.x as number);
              return " " + c.dataset.label + ": " + n.toLocaleString("sk-SK");
            },
          },
        },
      },
      scales: {
        x: {
          min: -max,
          max: max,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => Math.abs(Number(v)).toLocaleString("sk-SK"),
          },
          title: {
            display: true,
            text: "Počet obyvateľov (muži ←  |  → ženy)",
            color: "#8b9cb3",
          },
        },
        y: {
          reverse: true,
          grid: { display: false },
          ticks: { color: "#a8b8cc", font: { size: 11 } },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => props.bands,
  () => {
    if (!chart) return;
    const max = axisMaxFor(props.bands);
    chart.data.labels = props.bands.map((b) => b.label);
    chart.data.datasets[0].data = props.bands.map((b) => -b.m);
    chart.data.datasets[1].data = props.bands.map((b) => b.f);
    if (chart.options.scales?.x) {
      (chart.options.scales.x as { min: number; max: number }).min = -max;
      (chart.options.scales.x as { min: number; max: number }).max = max;
    }
    chart.update();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-box chart-box--pyramid">
    <canvas
      ref="canvas"
      height="480"
      role="img"
      aria-label="Populačná pyramída Slovenska"
    ></canvas>
  </div>
</template>
