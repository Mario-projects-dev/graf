<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { AgeStructureSnapshot } from "~/composables/usePredikcie";

Chart.register(...registerables);

const props = defineProps<{ snapshots: AgeStructureSnapshot[] }>();
const selectedYear = ref<number>(props.snapshots[0]?.year ?? 2024);

const active = computed(
  () => props.snapshots.find((s) => s.year === selectedYear.value) ?? props.snapshots[0]
);

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function build() {
  if (!canvas.value || !active.value) return;
  const a = active.value;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels: a.bands,
      datasets: [
        {
          label: "Muži",
          data: a.males.map((v) => (v == null ? null : -v)),
          backgroundColor: "rgba(96, 165, 250, 0.7)",
          borderColor: "#60a5fa",
          borderWidth: 1,
        },
        {
          label: "Ženy",
          data: a.females,
          backgroundColor: "rgba(244, 114, 182, 0.7)",
          borderColor: "#f472b6",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#cdd5e0" }, position: "bottom" },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = Math.abs(c.parsed.x as number);
              return " " + c.dataset.label + ": " + v.toLocaleString("sk-SK") + " os.";
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#7d8b9e",
            callback: (v) => Math.abs(v as number).toLocaleString("sk-SK"),
          },
          title: { display: true, text: "počet osôb", color: "#7d8b9e", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          stacked: false,
          reverse: false,
          title: { display: true, text: "veková skupina", color: "#7d8b9e", font: { size: 11 } },
        },
      },
    },
  });
}

async function rebuild() {
  chart?.destroy();
  chart = null;
  await nextTick();
  build();
}
onMounted(rebuild);
onBeforeUnmount(() => chart?.destroy());
watch(() => active.value, rebuild);
</script>

<template>
  <div class="pyramid-block">
    <div class="year-tabs">
      <button
        v-for="s in snapshots"
        :key="s.year"
        :class="['year-tab', { active: s.year === selectedYear }]"
        @click="selectedYear = s.year"
      >
        {{ s.year }}
      </button>
    </div>
    <div class="chart-box chart-box--tall">
      <canvas ref="canvas" height="420" role="img" aria-label="Populačná pyramída — projekcia" />
    </div>
  </div>
</template>

<style scoped>
.pyramid-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.year-tabs {
  display: flex;
  gap: 0.4rem;
}
.year-tab {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cdd5e0;
  padding: 0.45rem 1rem;
  border-radius: 0.4rem;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.15s;
}
.year-tab:hover { background: rgba(15, 23, 42, 0.85); }
.year-tab.active {
  background: rgba(96, 165, 250, 0.15);
  border-color: #60a5fa;
  color: #93c5fd;
  font-weight: 600;
}
</style>
