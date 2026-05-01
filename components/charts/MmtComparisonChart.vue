<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { MmtComparison } from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ items: MmtComparison[] }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value) return;
  // Color: green if owns currency (MMT-friendly), amber if doesn't
  const sorted = [...props.items].sort((a, b) => b.debtPctGdp - a.debtPctGdp);
  const colors = sorted.map((item) =>
    item.country === "—"
      ? "rgba(148, 163, 184, 0.6)"
      : item.ownsCurrency
      ? "rgba(52, 211, 153, 0.6)"
      : "rgba(251, 113, 133, 0.6)"
  );
  const borders = sorted.map((item) =>
    item.country === "—"
      ? "#94a3b8"
      : item.ownsCurrency
      ? "#34d399"
      : "#fb7185"
  );
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels: sorted.map((s) => s.label),
      datasets: [
        {
          label: "Verejný dlh % HDP",
          data: sorted.map((s) => s.debtPctGdp),
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => " " + (c.parsed.x as number).toFixed(0) + " % HDP",
            afterLabel: (c) => {
              const item = sorted[c.dataIndex];
              return [
                "",
                item.ownsCurrency ? "✓ Vlastná mena" : "✗ Bez vlastnej meny",
                item.note,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) => v + " %",
          },
          title: {
            display: true,
            text: "% HDP",
            color: "#8b9cb3",
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#a8b8cc", font: { size: 12 } },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div class="chart-box chart-box--tall" style="height: 360px">
    <canvas
      ref="canvas"
      role="img"
      aria-label="Porovnanie verejného dlhu k HDP — krajiny s vlastnou menou vs eurozóna"
    ></canvas>
  </div>
</template>
