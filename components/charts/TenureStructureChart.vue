<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { TenurePayload } from "~/composables/useReality";

Chart.register(...registerables);

const props = defineProps<{ payload: TenurePayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const data = computed(() => {
  const { owner, ownerLoan, tenant, reduced } = props.payload;
  const items = [
    { label: "Vlastník bez úveru", value: owner ?? 0, color: "#34d399" },
    { label: "Vlastník s hypotékou", value: ownerLoan ?? 0, color: "#60a5fa" },
    { label: "Nájomca trh. ceny", value: tenant ?? 0, color: "#f59e0b" },
    { label: "Bezúplatne / znížený nájom", value: reduced ?? 0, color: "#a78bfa" },
  ].filter((d) => d.value > 0);
  return items;
});

function build() {
  if (!canvas.value) return;
  const items = data.value;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "doughnut",
    data: {
      labels: items.map((d) => d.label),
      datasets: [
        {
          data: items.map((d) => d.value),
          backgroundColor: items.map((d) => d.color),
          borderColor: "#0f1419",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#e8eef5", font: { size: 12 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed as number;
              return " " + c.label + ": " + v.toFixed(1) + " %";
            },
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
  <div class="chart-box chart-box--tall" style="min-height: 360px">
    <canvas
      ref="canvas"
      height="360"
      role="img"
      aria-label="Štruktúra vlastníctva bývania v SR"
    ></canvas>
  </div>
</template>
