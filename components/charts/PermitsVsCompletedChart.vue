<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type {
  ConstructionPayload,
  PermitsPayload,
} from "~/composables/useReality";

Chart.register(...registerables);

const props = defineProps<{
  construction: ConstructionPayload;
  permits: PermitsPayload;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const merged = computed(() => {
  const compMap = new Map<number, number | null>();
  props.construction.years.forEach((y, i) =>
    compMap.set(y, props.construction.completed[i])
  );
  const permMap = new Map<number, number | null>();
  props.permits.years.forEach((y, i) =>
    permMap.set(y, props.permits.permits[i])
  );
  const allYears = Array.from(
    new Set([...props.construction.years, ...props.permits.years])
  ).sort((a, b) => a - b);
  return {
    years: allYears,
    completed: allYears.map((y) => compMap.get(y) ?? null),
    permits: allYears.map((y) => permMap.get(y) ?? null),
  };
});

function build() {
  if (!canvas.value) return;
  const m = merged.value;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels: m.years,
      datasets: [
        {
          label: "Stavebné povolenia (počet bytov)",
          data: m.permits,
          backgroundColor: "rgba(96, 165, 250, 0.45)",
          borderColor: "#60a5fa",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Dokončené byty",
          data: m.completed,
          backgroundColor: "rgba(52, 211, 153, 0.55)",
          borderColor: "#34d399",
          borderWidth: 1,
          borderRadius: 4,
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
      aria-label="Stavebné povolenia vs dokončené byty"
    ></canvas>
  </div>
</template>
