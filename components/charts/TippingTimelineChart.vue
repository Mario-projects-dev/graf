<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { TippingTimelinePayload } from "~/composables/usePredikcie";

Chart.register(...registerables);

const props = defineProps<{ payload: TippingTimelinePayload }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

const sortedSectors = computed(() =>
  [...props.payload.sectors].sort((a, b) => {
    const ya = a.tippingYear ?? 9999;
    const yb = b.tippingYear ?? 9999;
    return ya - yb;
  })
);

function build() {
  if (!canvas.value) return;
  const labels = sortedSectors.value.map((s) => s.label);
  const values = sortedSectors.value.map((s) => s.tippingYear ?? 2105);
  const colors = sortedSectors.value.map((s) => {
    const y = s.tippingYear;
    if (y == null) return "#6ee7b7";
    if (y < 2040) return "#fb7185";
    if (y < 2055) return "#fbbf24";
    return "#60a5fa";
  });
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Rok prvého kritického deficitu (gap < 0)",
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 0,
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
            label: (c) => {
              const sector = sortedSectors.value[c.dataIndex];
              const y = sector.tippingYear;
              const gap2050 = sector.gapPctAt2050;
              return [
                " " + sector.label,
                "  Tipping rok: " + (y == null ? "po 2100" : y),
                "  Gap v 2050: " + (gap2050 == null ? "—" : (gap2050 >= 0 ? "+" : "") + gap2050.toFixed(1) + " %"),
              ];
            },
          },
        },
      },
      scales: {
        x: {
          min: 2024,
          max: 2105,
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: { display: true, text: "rok kritického deficitu (FTE < required)", color: "#7d8b9e", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#cdd5e0", font: { size: 11 } },
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
  <div>
    <div class="chart-box chart-box--tall">
      <canvas ref="canvas" :height="60 + payload.sectors.length * 32" role="img" aria-label="Tipping point timeline" />
    </div>
    <p class="legend">
      🔴 do 2040 (akútne) · 🟡 2040–2055 (vážne) · 🔵 2055+ (dlhodobé) · 🟢 nikdy v projekcii (po 2100)
    </p>
  </div>
</template>

<style scoped>
.legend {
  font-size: 0.84rem; color: #8b9cb3;
  margin: 0.5rem 0 0; text-align: center;
}
</style>
