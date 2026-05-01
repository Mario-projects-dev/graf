<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import type { DistrictPayload } from "~/composables/useDemografia";
import { GEOJSON_DISTRICTS_URL } from "~/composables/districts";

Chart.register(...registerables);

interface Props {
  payload: DistrictPayload;
}
const props = defineProps<Props>();

const mapEl = ref<HTMLDivElement | null>(null);
const barCanvas = ref<HTMLCanvasElement | null>(null);
const barInner = ref<HTMLDivElement | null>(null);

let map: L.Map | null = null;
let geoLayer: L.GeoJSON | null = null;
let legend: L.Control | null = null;
let geoJson: GeoJSON.FeatureCollection | null = null;
let bar: ChartType | null = null;

function colorFor(v: number, vmin: number, vmax: number): string {
  if (vmin >= 0) {
    const t = vmax > vmin ? (v - vmin) / (vmax - vmin) : 0.5;
    const h = 48 + t * 95;
    return `hsl(${h}deg 62% ${32 + t * 16}%)`;
  }
  if (vmax <= 0) {
    const t = vmax > vmin ? (v - vmin) / (vmax - vmin) : 0.5;
    const h = t * 44;
    return `hsl(${h}deg 68% ${28 + t * 16}%)`;
  }
  if (v >= 0) {
    const t = vmax > 0 ? v / vmax : 0;
    const h = 48 + t * 96;
    return `hsl(${h}deg ${62 + t * 12}% ${36 + t * 14}%)`;
  }
  const t = vmin < 0 ? v / vmin : 0;
  const h = 48 * (1 - t);
  return `hsl(${h}deg ${66 + t * 14}% ${32 + (1 - t) * 12}%)`;
}

function minMax(): { vmin: number; vmax: number } {
  const vals = Object.values(props.payload.grow).map(Number);
  return { vmin: Math.min(...vals), vmax: Math.max(...vals) };
}

function rebuildLegend() {
  if (!map) return;
  if (legend) map.removeControl(legend);
  legend = new L.Control({ position: "bottomright" });
  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "map-legend");
    const { vmin, vmax } = minMax();
    const steps = 5;
    const tag = props.payload.isEstimate ? " · ⚠ ODHAD" : "";
    let html = `<div style="color:#e8eef5;margin-bottom:0.35rem;font-weight:600">${props.payload.year} · zmena počtu obyvateľov${tag}</div>`;
    for (let i = 0; i <= steps; i++) {
      const v = Math.round(vmin + ((vmax - vmin) * i) / steps);
      const c = colorFor(v, vmin, vmax);
      const sign = v > 0 ? "+" : "";
      html += `<div class="row"><i style="background:${c}"></i> ${sign}${v.toLocaleString("sk-SK")}</div>`;
    }
    div.innerHTML = html;
    return div;
  };
  legend.addTo(map);
}

function rebuildGeoLayer() {
  if (!map || !geoJson) return;
  if (geoLayer) {
    map.removeLayer(geoLayer);
    geoLayer = null;
  }
  const { vmin, vmax } = minMax();
  const grow = props.payload.grow;
  const names = props.payload.names;
  const year = props.payload.year;
  const estTag = props.payload.isEstimate
    ? "<br/><em style='color:#fcd34d'>⚠ odhadovaná hodnota</em>"
    : "";
  geoLayer = L.geoJSON(geoJson, {
    style(feature) {
      const id = String(feature?.properties?.IDN3);
      const v = grow[id] ?? 0;
      return {
        fillColor: colorFor(v, vmin, vmax),
        weight: 1,
        opacity: 1,
        color: "rgba(255,255,255,0.22)",
        fillOpacity: 0.88,
      };
    },
    onEachFeature(feature, lyr) {
      const id = String(feature?.properties?.IDN3);
      const n = grow[id] ?? 0;
      const nm = names[id] || feature?.properties?.NM3 || id;
      const sign = n > 0 ? "+" : "";
      lyr.bindTooltip(
        `<strong>${nm}</strong><br/>${year}: <strong>${sign}${n.toLocaleString("sk-SK")}</strong> osôb${estTag}`,
        { sticky: true, direction: "auto", className: "dist-tip" }
      );
      lyr.on("mouseover", (e) => {
        const l = e.target as L.Path;
        l.setStyle({ weight: 2.5, color: "#f8fafc", fillOpacity: 0.95 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          (l as L.Path & { bringToFront: () => void }).bringToFront();
        }
      });
      lyr.on("mouseout", (e) => {
        geoLayer?.resetStyle(e.target);
      });
    },
  }).addTo(map);
}

function rebuildBar() {
  const grow = props.payload.grow;
  const names = props.payload.names;
  const year = props.payload.year;
  const sorted = Object.keys(grow)
    .map((id) => ({ id, v: grow[id], name: names[id] || id }))
    .sort((a, b) => b.v - a.v);
  if (barInner.value) {
    barInner.value.style.height = Math.max(520, sorted.length * 14 + 40) + "px";
  }
  const labelFn = (c: { parsed: { x: number } }) => {
    const v = c.parsed.x;
    const sign = v > 0 ? "+" : "";
    const tag = props.payload.isEstimate ? " (odhad)" : "";
    return " " + sign + v.toLocaleString("sk-SK") + " osôb (" + year + ")" + tag;
  };
  if (bar) {
    bar.data.labels = sorted.map((x) => x.name);
    bar.data.datasets[0].data = sorted.map((x) => x.v);
    if (bar.options.plugins?.tooltip?.callbacks) {
      (bar.options.plugins.tooltip.callbacks as { label: typeof labelFn }).label = labelFn;
    }
    bar.update();
    return;
  }
  if (!barCanvas.value) return;
  bar = new Chart(barCanvas.value.getContext("2d")!, {
    type: "bar",
    data: {
      labels: sorted.map((x) => x.name),
      datasets: [
        {
          label: "Zmena počtu obyvateľov",
          data: sorted.map((x) => x.v),
          backgroundColor: (ctx) => {
            const x = ctx.raw as number;
            if (typeof x !== "number") return "rgba(148, 163, 184, 0.4)";
            return x >= 0 ? "rgba(52, 211, 153, 0.45)" : "rgba(251, 113, 133, 0.5)";
          },
          borderColor: (ctx) => {
            const x = ctx.raw as number;
            if (typeof x !== "number") return "#94a3b8";
            return x >= 0 ? "#34d399" : "#fb7185";
          },
          borderWidth: 1,
          barThickness: 10,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: labelFn } },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#8b9cb3",
            maxTicksLimit: 10,
            callback: (v) =>
              (Number(v) > 0 ? "+" : "") + Number(v).toLocaleString("sk-SK"),
          },
          title: {
            display: true,
            text: "Zmena počtu obyvateľov (osoby)",
            color: "#8b9cb3",
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#a8b8cc", font: { size: 9 }, autoSkip: false },
        },
      },
    },
  });
}

function rebuildAll() {
  rebuildLegend();
  rebuildGeoLayer();
  rebuildBar();
}

onMounted(async () => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, { scrollWheelZoom: true }).setView([48.73, 19.35], 7.15);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);
  rebuildLegend();
  rebuildBar();

  try {
    const r = await fetch(GEOJSON_DISTRICTS_URL);
    if (!r.ok) throw new Error("GeoJSON " + r.status);
    geoJson = await r.json();
    rebuildGeoLayer();
    if (geoLayer) {
      map.fitBounds(geoLayer.getBounds(), { padding: [24, 24], maxZoom: 8 });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (mapEl.value) {
      mapEl.value.innerHTML =
        '<p style="padding:1rem;color:#f87171">Mapu sa nepodarilo načítať (GeoJSON). Skúste obnoviť stránku.</p>';
    }
  }
});

onBeforeUnmount(() => {
  bar?.destroy();
  if (map) {
    map.remove();
    map = null;
  }
});

watch(() => props.payload, rebuildAll, { deep: true });
</script>

<template>
  <div class="map-layout">
    <div>
      <div ref="mapEl" class="district-map" role="region" aria-label="Mapa okresov"></div>
    </div>
    <div class="district-chart-wrap">
      <div ref="barInner" class="district-chart-inner">
        <canvas
          ref="barCanvas"
          role="img"
          aria-label="Zoradený stĺpcový graf zmeny obyvateľov podľa okresov"
        ></canvas>
      </div>
    </div>
  </div>
</template>
