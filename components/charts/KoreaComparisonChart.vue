<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { KoreaComparisonPayload } from "~/composables/usePredikcie";

Chart.register(...registerables);

const props = defineProps<{ payload: KoreaComparisonPayload }>();

const popCanvas = ref<HTMLCanvasElement | null>(null);
const oadrCanvas = ref<HTMLCanvasElement | null>(null);
let popChart: ChartType | null = null;
let oadrChart: ChartType | null = null;

function buildPop() {
  if (!popCanvas.value) return;
  popChart = new Chart(popCanvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.payload.years,
      datasets: [
        {
          label: "Slovensko (Eurostat EUROPOP2023)",
          data: props.payload.skPopulation,
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Južná Kórea (UN WPP 2024)",
          data: props.payload.krPopulation,
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
          yAxisID: "y2",
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
            label: (c) => {
              const v = c.parsed.y;
              if (v == null) return " " + c.dataset.label + ": —";
              return " " + c.dataset.label + ": " + ((v as number) / 1e6).toFixed(2) + " mil.";
            },
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d8b9e", maxTicksLimit: 10 } },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#60a5fa", callback: (v) => ((v as number) / 1e6).toFixed(1) + " mil." },
          title: { display: true, text: "SK populácia", color: "#60a5fa", font: { size: 11 } },
          position: "left",
        },
        y2: {
          grid: { display: false },
          ticks: { color: "#fb7185", callback: (v) => ((v as number) / 1e6).toFixed(0) + " mil." },
          title: { display: true, text: "KR populácia", color: "#fb7185", font: { size: 11 } },
          position: "right",
        },
      },
    },
  });
}
function buildOadr() {
  if (!oadrCanvas.value) return;
  oadrChart = new Chart(oadrCanvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.payload.years,
      datasets: [
        {
          label: "Slovensko OADR (%)",
          data: props.payload.skOadr,
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "Južná Kórea OADR (%)",
          data: props.payload.krOadr,
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.25,
          spanGaps: true,
        },
        {
          label: "OECD krízový prah 60 %",
          data: props.payload.years.map(() => 60),
          borderColor: "rgba(251, 191, 36, 0.5)",
          backgroundColor: "transparent",
          borderWidth: 1.2,
          pointRadius: 0,
          borderDash: [4, 3],
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
            label: (c) =>
              c.parsed.y == null
                ? " " + c.dataset.label + ": —"
                : " " + c.dataset.label + ": " + (c.parsed.y as number).toFixed(0) + " %",
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d8b9e", maxTicksLimit: 10 } },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e", callback: (v) => v + " %" },
          title: { display: true, text: "OADR — pop(65+) / pop(20–64) × 100", color: "#7d8b9e", font: { size: 11 } },
        },
      },
    },
  });
}

async function rebuild() {
  popChart?.destroy();
  oadrChart?.destroy();
  popChart = null;
  oadrChart = null;
  await nextTick();
  buildPop();
  buildOadr();
}
onMounted(rebuild);
onBeforeUnmount(() => {
  popChart?.destroy();
  oadrChart?.destroy();
});
watch(() => props.payload, rebuild, { deep: true });
</script>

<template>
  <div class="kr-block">
    <div class="kr-twin">
      <div class="kr-panel">
        <h5>Populácia (millionov) — SK vs KR, dvojitá os</h5>
        <div class="canvas-wrap">
          <canvas ref="popCanvas" height="240" />
        </div>
      </div>
      <div class="kr-panel">
        <h5>OADR (%) — SK vs KR</h5>
        <div class="canvas-wrap">
          <canvas ref="oadrCanvas" height="240" />
        </div>
      </div>
    </div>

    <div class="tipping-comparison">
      <h5>Tipping points: Bank of Korea WP 2023-7 (KR) vs vlastný výpočet (SK)</h5>
      <table>
        <thead>
          <tr>
            <th>Sektor</th>
            <th class="num">KR — publikovaný tipping</th>
            <th class="num">SK — vlastný výpočet</th>
            <th class="num">Δ rokov</th>
            <th>Citácia KR</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(kr, i) in payload.krTippingPoints" :key="i">
            <td>{{ kr.sector }}</td>
            <td class="num">{{ kr.year }}</td>
            <td class="num">{{ payload.skTippingPoints[i].year ?? "po 2100" }}</td>
            <td class="num">
              <span
                v-if="payload.skTippingPoints[i].year != null"
                :class="['delta-pill', payload.skTippingPoints[i].year! < kr.year ? 'sooner' : payload.skTippingPoints[i].year! > kr.year ? 'later' : 'same']"
              >
                {{ payload.skTippingPoints[i].year! - kr.year >= 0 ? "+" : "" }}{{ payload.skTippingPoints[i].year! - kr.year }} r.
              </span>
              <span v-else class="delta-pill later">N/A</span>
            </td>
            <td class="src">{{ kr.citation }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">
        🔴 SK skoršie ako KR · 🟢 SK neskoršie ako KR · 🟡 rovnaké
      </p>
    </div>
  </div>
</template>

<style scoped>
.kr-block { display: flex; flex-direction: column; gap: 1rem; }
.kr-twin {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.7rem;
}
@media (min-width: 800px) {
  .kr-twin { grid-template-columns: 1fr 1fr; }
}
.kr-panel {
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem 0.7rem;
}
.kr-panel h5 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #cdd5e0;
}
.canvas-wrap { height: 260px; position: relative; }
.tipping-comparison {
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
}
.tipping-comparison h5 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
  color: #cdd5e0;
}
.tipping-comparison table {
  width: 100%; border-collapse: collapse; font-size: 0.9rem;
}
.tipping-comparison th {
  text-align: left; padding: 0.45rem 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #8b9cb3; font-weight: 600;
}
.tipping-comparison td { padding: 0.45rem 0.65rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
.tipping-comparison .num { text-align: right; font-family: ui-monospace, "SF Mono", monospace; }
.tipping-comparison .src { font-size: 0.78rem; color: #7d8b9e; }
.delta-pill {
  display: inline-block; padding: 0.1rem 0.5rem; border-radius: 0.3rem;
  font-size: 0.83rem; font-weight: 600;
}
.delta-pill.sooner { background: rgba(251, 113, 133, 0.18); color: #fda4af; }
.delta-pill.later  { background: rgba(52, 211, 153, 0.18); color: #6ee7b7; }
.delta-pill.same   { background: rgba(251, 191, 36, 0.18); color: #fcd34d; }
.note {
  margin: 0.5rem 0 0; font-size: 0.82rem; color: #8b9cb3;
}
</style>
