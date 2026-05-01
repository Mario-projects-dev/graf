<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  KRAJ_PRICES,
  SR_AVERAGE_PRICE_M2,
  KRAJ_GEOJSON_URL,
} from "~/composables/realityStatic";

interface Props {
  /** Optional live YoY % change per NUTS3 kraj (DATAcube sp3801qr). */
  liveIndex?: Record<string, number>;
  /** Quarter label, e.g. "2025Q4" — shown in legend. */
  liveQuarter?: string;
}
const props = defineProps<Props>();

const mapEl = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let geoLayer: L.GeoJSON | null = null;
let legend: L.Control | null = null;
let geojson: GeoJSON.FeatureCollection | null = null;

// Rank-based color: each kraj gets a distinct shade regardless of price spread.
function colorByRank(rank: number, total: number): string {
  const t = total > 1 ? rank / (total - 1) : 0.5;
  const h = 50 - t * 50; // 50deg amber → 0deg red
  const s = 72 + t * 10;
  const l = 52 - t * 24;
  return `hsl(${h}deg ${s}% ${l}%)`;
}

interface Ranked {
  nuts3: string;
  idn4: number;
  name: string;
  price: number;
  rank: number;
  color: string;
}
const ranked: Ranked[] = [...KRAJ_PRICES]
  .sort((a, b) => a.pricePerM2 - b.pricePerM2)
  .map((k, i, arr) => ({
    nuts3: k.nuts3,
    idn4: k.idn4,
    name: k.name,
    price: k.pricePerM2,
    rank: i,
    color: colorByRank(i, arr.length),
  }));

// Lookup by IDN4 (drakh GeoJSON property), with NUTS3 + name fallbacks.
const byIdn4 = new Map<number, Ranked>();
const byNuts3 = new Map<string, Ranked>();
const byName = new Map<string, Ranked>();
for (const r of ranked) {
  byIdn4.set(r.idn4, r);
  byNuts3.set(r.nuts3, r);
  byNuts3.set(r.nuts3.toLowerCase(), r);
  byName.set(r.name.toLowerCase(), r);
}

function lookupFromFeature(feature: GeoJSON.Feature): Ranked | undefined {
  const p = feature?.properties || {};
  if (p.IDN4 != null) {
    const r = byIdn4.get(Number(p.IDN4));
    if (r) return r;
  }
  if (p.NUTS3) {
    const r = byNuts3.get(String(p.NUTS3));
    if (r) return r;
  }
  if (p.NM4) {
    const r = byName.get(String(p.NM4).toLowerCase());
    if (r) return r;
  }
  if (p.NM3) {
    const r = byName.get(
      String(p.NM3)
        .toLowerCase()
        .replace(/\s+kraj$/i, "")
    );
    if (r) return r;
  }
  return undefined;
}

function fmtYoy(v: number | undefined | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return sign + v.toFixed(1) + " %";
}
function colorYoy(v: number | undefined | null): string {
  if (v == null || !Number.isFinite(v)) return "#94a3b8";
  if (v > 1) return "#fda4af";
  if (v < -1) return "#86efac";
  return "#fcd34d";
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

  geoLayer = L.geoJSON(geojson, {
    style(feature) {
      const entry = feature ? lookupFromFeature(feature) : undefined;
      return {
        fillColor: entry?.color || "#1a2332",
        weight: 1,
        opacity: 1,
        color: "rgba(255,255,255,0.28)",
        fillOpacity: 0.9,
      };
    },
    onEachFeature(feature, lyr) {
      const entry = lookupFromFeature(feature);
      const fallbackName =
        feature?.properties?.NM4 || feature?.properties?.NM3 || "Kraj";
      if (entry) {
        const diff =
          ((entry.price - SR_AVERAGE_PRICE_M2) / SR_AVERAGE_PRICE_M2) * 100;
        const sign = diff >= 0 ? "+" : "";
        const rankText =
          entry.rank === 0
            ? "najlacnejší"
            : entry.rank === ranked.length - 1
            ? "najdrahší"
            : entry.rank + 1 + ". najlacnejší";
        const yoy = props.liveIndex?.[entry.nuts3];
        const yoyHtml =
          yoy != null
            ? `<br/><span style="color:${colorYoy(yoy)}"><strong>${fmtYoy(yoy)}</strong> medziročne</span> <span style="color:#94a3b8">· DATAcube ${props.liveQuarter ?? ""}</span>`
            : "";
        lyr.bindTooltip(
          `<strong>${entry.name} kraj</strong><br/>` +
            `<span style="font-size:1.1em;color:#fef3c7">${entry.price.toLocaleString(
              "sk-SK"
            )} €/m²</span> <span style="color:#94a3b8">· existujúce byty (NBS)</span><br/>` +
            `<span style="color:#94a3b8">${sign}${diff.toFixed(0)} % oproti SR priemeru ${SR_AVERAGE_PRICE_M2.toLocaleString(
              "sk-SK"
            )} €/m²</span><br/>` +
            `<span style="color:#94a3b8">${rankText} z ${ranked.length} krajov</span>` +
            yoyHtml,
          { sticky: true, direction: "auto", className: "dist-tip" }
        );
      } else {
        lyr.bindTooltip(`<strong>${fallbackName}</strong>`, {
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
    let html = `<div style="color:#e8eef5;margin-bottom:0.4rem;font-weight:600">€/m² · existujúce byty <span style="color:#94a3b8;font-weight:400">(NBS snapshot)</span></div>`;
    const sorted = [...ranked].sort((a, b) => b.rank - a.rank);
    for (const r of sorted) {
      const diff =
        ((r.price - SR_AVERAGE_PRICE_M2) / SR_AVERAGE_PRICE_M2) * 100;
      const sign = diff >= 0 ? "+" : "";
      const yoy = props.liveIndex?.[r.nuts3];
      const yoyChip =
        yoy != null
          ? ` <span style="color:${colorYoy(yoy)}">${fmtYoy(yoy)}</span>`
          : "";
      html += `<div class="row"><i style="background:${r.color}"></i> <strong style="color:#e8eef5">${r.price.toLocaleString(
        "sk-SK"
      )}</strong> · ${r.name} <span style="color:#94a3b8">(${sign}${diff.toFixed(
        0
      )} %)</span>${yoyChip}</div>`;
    }
    if (props.liveQuarter && props.liveIndex && Object.keys(props.liveIndex).length) {
      html += `<div style="margin-top:0.45rem;color:#94a3b8;font-size:0.72rem">YoY % zmena cien · DATAcube ${props.liveQuarter} (živé)</div>`;
    }
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
    const r = await fetch(KRAJ_GEOJSON_URL);
    if (!r.ok) throw new Error("regions geojson " + r.status);
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
        '<p style="padding:1rem;color:#f87171">Mapu sa nepodarilo načítať (GeoJSON).</p>';
    }
  }
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(
  () => [props.liveIndex, props.liveQuarter],
  () => build(),
  { deep: true }
);
</script>

<template>
  <div ref="mapEl" class="district-map" role="region" aria-label="Mapa krajov SR s cenami €/m²"></div>
</template>
