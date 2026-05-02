<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";

Chart.register(...registerables);

interface Props {
  times: string[];
  sk: (number | null)[];
  eu: (number | null)[];
  yLabel: string;
  yPercent: boolean;
  color1: string;
  color2?: string;
  ariaLabel: string;
  /** X-axis title. Defaults to "Rok"; override for "Štvrťrok", "Mesiac", etc. */
  xLabel?: string;
  /** Optional horizontal reference line value (e.g. 0 for recession line, 2 for ECB target). */
  referenceLine?: number | null;
  /** Label rendered to the right of the reference line. */
  referenceLabel?: string;
  /** Reference line stroke colour (default warm yellow). */
  referenceColor?: string;
  /** When true, x-axis ticks rotate; useful for long quarterly/monthly time labels. */
  rotateX?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  color2: "#94a3b8",
  xLabel: "Rok",
  referenceLine: null,
  referenceLabel: "",
  referenceColor: "#fbbf24",
  rotateX: false,
});

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: ChartType | null = null;

function refLinePlugin() {
  // Lightweight inline plugin — draws a horizontal dashed reference line at
  // a given y-value with an optional label tag. We avoid a hard dependency on
  // chartjs-plugin-annotation to keep the bundle slim.
  return {
    id: "refLine",
    afterDatasetsDraw(c: ChartType) {
      if (props.referenceLine == null) return;
      const yScale = c.scales.y;
      if (!yScale) return;
      const y = yScale.getPixelForValue(props.referenceLine);
      const xLeft = c.chartArea.left;
      const xRight = c.chartArea.right;
      const ctx = c.ctx;
      ctx.save();
      ctx.strokeStyle = props.referenceColor;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(xLeft, y);
      ctx.lineTo(xRight, y);
      ctx.stroke();
      if (props.referenceLabel) {
        ctx.setLineDash([]);
        ctx.fillStyle = props.referenceColor;
        ctx.font = "600 11px Inter, system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(props.referenceLabel, xRight - 6, y - 4);
      }
      ctx.restore();
    },
  };
}

function build() {
  if (!canvas.value) return;
  chart = new Chart(canvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: props.times,
      datasets: [
        {
          label: "Slovensko",
          data: props.sk,
          borderColor: props.color1,
          backgroundColor: props.color1 + "22",
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          spanGaps: true,
        },
        {
          label: "EÚ27",
          data: props.eu,
          borderColor: props.color2,
          backgroundColor: "transparent",
          borderDash: [5, 4],
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          spanGaps: true,
        },
      ],
    },
    plugins: [refLinePlugin()],
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
              const formatted = props.yPercent
                ? (v as number).toFixed(1) + " %"
                : Math.round(v as number).toLocaleString("sk-SK") + " €";
              return " " + c.dataset.label + ": " + formatted;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            maxRotation: props.rotateX ? 45 : 0,
            autoSkip: true,
            maxTicksLimit: props.rotateX ? 16 : 14,
          },
          title: { display: true, text: props.xLabel, color: "#8b9cb3" },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            callback: (v) =>
              props.yPercent ? v + " %" : Number(v).toLocaleString("sk-SK"),
          },
          title: { display: true, text: props.yLabel, color: "#8b9cb3" },
        },
      },
    },
  });
}

onMounted(build);
onBeforeUnmount(() => chart?.destroy());
watch(
  () => [props.times, props.sk, props.eu],
  () => {
    if (!chart) return;
    chart.data.labels = props.times;
    chart.data.datasets[0].data = props.sk;
    chart.data.datasets[1].data = props.eu;
    chart.update();
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
      :aria-label="ariaLabel"
    ></canvas>
  </div>
</template>
