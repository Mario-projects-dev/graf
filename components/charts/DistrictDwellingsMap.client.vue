<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DistrictConstructionPayload } from "~/composables/useReality";

interface Props {
  payload: DistrictConstructionPayload;
}
const props = defineProps<Props>();

const GEOJSON_DISTRICTS_URL =
  "https://cdn.jsdelivr.net/gh/drakh/slovakia-gps-data@master/GeoJSON/epsg_4326/districts_epsg_4326.geojson";

const mapEl = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let geoLayer: L.GeoJSON | null = null;
let legend: L.Control | null = null;
let geojson: GeoJSON.FeatureCollection | null = null;

// Quintile-based coloring with 5 distinct bands.
function quintileBreaks(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let q = 0.2; q < 1.0; q += 0.2) {
    const idx = Math.floor(q * (sorted.length - 1));
    breaks.push(sorted[idx]);
  }
  return breaks;
}

const palette = [
  "hsl(48deg 70% 50%)", // very low (cream-amber)
  "hsl(36deg 75% 46%)",
  "hsl(24deg 78% 42%)",
  "hsl(12deg 80% 38%)",
  "hsl(0deg 82% 34%)", // very high (deep red)
];

function colorFor(v: number, breaks: number[]): string {
  for (let i = 0; i < breaks.length; i++) {
    if (v <= breaks[i]) return palette[i];
  }
  return palette[palette.length - 1];
}

function build() {
  if (!map || !geojson) return;
  if (geoLayer) {
    map.removeLayer(geoLayer);
    geoLayer = null;
  }
  if (legend) {
    map.removeControl(legend);
    legend = null;
  }
  const values = Object.values(props.payload.byIdn3);
  const breaks = quintileBreaks(values);
  const sortedAll = [...Object.entries(props.payload.byIdn3)].sort(
    (a, b) => b[1] - a[1]
  );
  const top3 = sortedAll.slice(0, 3);
  const bottom3 = sortedAll.slice(-3).reverse();

  geoLayer = L.geoJSON(geojson, {
    style(feature) {
      const id = String(feature?.properties?.IDN3 ?? "");
      const v = props.payload.byIdn3[id];
      if (v == null) {
        return {
          fillColor: "#1a2332",
          weight: 1,
          opacity: 1,
          color: "rgba(255,255,255,0.18)",
          fillOpacity: 0.7,
        };
      }
      return {
        fillColor: colorFor(v, breaks),
        weight: 1,
        opacity: 1,
        color: "rgba(255,255,255,0.25)",
        fillOpacity: 0.9,
      };
    },
    onEachFeature(feature, lyr) {
      const id = String(feature?.properties?.IDN3 ?? "");
      const v = props.payload.byIdn3[id];
      const name =
        props.payload.names[id] || feature?.properties?.NM3 || "Okres";
      if (v != null) {
        lyr.bindTooltip(
          `<strong>${name}</strong><br/><span style="font-size:1.1em;color:#fef3c7">${v.toLocaleString(
            "sk-SK"
          )}</span> dokončených bytov v ${props.payload.year}`,
          { sticky: true, direction: "auto", className: "dist-tip" }
        );
      } else {
        lyr.bindTooltip(`<strong>${name}</strong><br/>nedostupné`, {
          sticky: true,
          direction: "auto",
          className: "dist-tip",
        });
      }
      lyr.on("mouseover", (e) => {
        const l = e.target as L.Path;
        l.setStyle({ weight: 2.5, color: "#fef3c7", fillOpacity: 1 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          (l as L.Path & { bringToFront: () => void }).bringToFront();
        }
      });
      lyr.on("mouseout", (e) => {
        geoLayer?.resetStyle(e.target);
      });
    },
  }).addTo(map);

  legend = new L.Control({ position: "bottomright" });
  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "map-legend");
    let html = `<div style="color:#e8eef5;margin-bottom:0.4rem;font-weight:600">Dokončené byty (${props.payload.year})</div>`;
    // Quintile bands
    const bandLabels = [
      `≤ ${Math.round(breaks[0]).toLocaleString("sk-SK")}`,
      `${Math.round(breaks[0] + 1).toLocaleString("sk-SK")} – ${Math.round(breaks[1]).toLocaleString("sk-SK")}`,
      `${Math.round(breaks[1] + 1).toLocaleString("sk-SK")} – ${Math.round(breaks[2]).toLocaleString("sk-SK")}`,
      `${Math.round(breaks[2] + 1).toLocaleString("sk-SK")} – ${Math.round(breaks[3]).toLocaleString("sk-SK")}`,
      `> ${Math.round(breaks[3]).toLocaleString("sk-SK")}`,
    ];
    for (let i = palette.length - 1; i >= 0; i--) {
      html += `<div class="row"><i style="background:${palette[i]}"></i> ${bandLabels[i]}</div>`;
    }
    html += `<div style="margin-top:0.45rem;color:#94a3b8;font-size:0.72rem">Top 3: ${top3.map(([id]) => props.payload.names[id]).join(", ")}</div>`;
    html += `<div style="color:#94a3b8;font-size:0.72rem">Bottom 3: ${bottom3.map(([id]) => props.payload.names[id]).join(", ")}</div>`;
    div.innerHTML = html;
    return div;
  };
  legend.addTo(map);
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

  try {
    const r = await fetch(GEOJSON_DISTRICTS_URL);
    if (!r.ok) throw new Error("districts geojson " + r.status);
    geojson = (await r.json()) as GeoJSON.FeatureCollection;
    build();
    if (geoLayer) {
      map.fitBounds(geoLayer.getBounds(), { padding: [24, 24], maxZoom: 8 });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (mapEl.value) {
      mapEl.value.innerHTML =
        '<p style="padding:1rem;color:#f87171">Mapu okresov sa nepodarilo načítať.</p>';
    }
  }
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(() => props.payload, build, { deep: true });
</script>

<template>
  <div ref="mapEl" class="district-map" role="region" aria-label="Mapa okresov SR — dokončené byty"></div>
</template>
