<script setup lang="ts">
import { ref, computed } from "vue";
import type {
  SectoralWorkforcePayload,
  Scenario,
} from "~/composables/usePredikcie";

const props = defineProps<{ payload: SectoralWorkforcePayload }>();

const scenario = ref<Scenario>("base");
const targetYear = ref<number>(2050);
const expandedKey = ref<string | null>(null);

const idx = computed(() => props.payload.years.indexOf(targetYear.value));
const idx2024 = computed(() => props.payload.years.indexOf(2024));

function fmtFte(v: number | null | undefined): string {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("sk-SK");
}
function fmtGapPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(1) + " %";
}
function gapPctClass(v: number | null | undefined): string {
  if (v == null) return "";
  if (v >= 5) return "gap-good";
  if (v >= -5) return "gap-tight";
  return "gap-bad";
}
function tippingClass(y: number | null | undefined): string {
  if (y == null) return "tip-none";
  if (y < 2040) return "tip-soon";
  if (y < 2055) return "tip-mid";
  return "tip-late";
}
function fmtTipping(y: number | null | undefined): string {
  return y == null ? "po 2100" : String(y);
}
function categoryIcon(cat: string): string {
  return (
    {
      health: "🏥",
      education: "🎓",
      security: "🛡️",
      energy: "⚡",
      water: "💧",
      transport: "🚆",
      communications: "📡",
      "public-admin": "🏛️",
    } as Record<string, string>
  )[cat] || "•";
}
function toggleExpand(key: string) {
  expandedKey.value = expandedKey.value === key ? null : key;
}
</script>

<template>
  <div class="sect-block">
    <div class="sect-controls">
      <label>
        Rok:
        <select v-model.number="targetYear">
          <option v-for="y in [2030, 2040, 2050, 2060, 2070, 2100]" :key="y" :value="y">{{ y }}</option>
        </select>
      </label>
      <label>
        Scenár:
        <select v-model="scenario">
          <option value="base">Baseline</option>
          <option value="high">Vysoká migrácia</option>
          <option value="low">Nízka migrácia</option>
        </select>
      </label>
      <span class="legend-info">
        🟢 surplus &gt; 5 % · 🟡 ±5 % · 🔴 deficit &gt; 5 %
      </span>
    </div>

    <table class="sect-table">
      <thead>
        <tr>
          <th>Sektor</th>
          <th class="num">Aktuálne FTE</th>
          <th class="num">Potreba 2024</th>
          <th class="num">FTE {{ targetYear }}</th>
          <th class="num">Potreba {{ targetYear }}</th>
          <th class="num">Gap %</th>
          <th class="num">Tipping rok</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="s in payload.sectors" :key="s.benchmark.key">
          <tr :class="['sect-row', { expanded: expandedKey === s.benchmark.key }]">
            <td>
              <span class="cat-icon">{{ categoryIcon(s.benchmark.category) }}</span>
              {{ s.benchmark.label }}
            </td>
            <td class="num">{{ fmtFte(s.benchmark.currentFte2024) }}</td>
            <td class="num">{{ fmtFte(s.scenarios[scenario].required[idx2024]) }}</td>
            <td class="num">{{ fmtFte(s.scenarios[scenario].available[idx]) }}</td>
            <td class="num">{{ fmtFte(s.scenarios[scenario].required[idx]) }}</td>
            <td class="num">
              <span :class="['gap-pill', gapPctClass(s.scenarios[scenario].gapPct[idx])]">
                {{ fmtGapPct(s.scenarios[scenario].gapPct[idx]) }}
              </span>
            </td>
            <td class="num">
              <span :class="['tip-pill', tippingClass(s.scenarios[scenario].tippingYear)]">
                {{ fmtTipping(s.scenarios[scenario].tippingYear) }}
              </span>
            </td>
            <td>
              <button class="expand-btn" @click="toggleExpand(s.benchmark.key)">
                {{ expandedKey === s.benchmark.key ? "−" : "+" }}
              </button>
            </td>
          </tr>
          <tr v-if="expandedKey === s.benchmark.key" class="sect-detail">
            <td colspan="8">
              <div class="detail-grid">
                <div>
                  <strong>Metodika:</strong> {{ s.benchmark.benchmarkMethod }}
                </div>
                <div>
                  <strong>Vzorec:</strong> <code>{{ s.benchmark.benchmarkFormula }}</code>
                </div>
                <div>
                  <strong>Citácia benchmark:</strong> {{ s.benchmark.benchmarkSource }}
                </div>
                <div>
                  <strong>FTE zdroj:</strong> {{ s.benchmark.fteSource }}
                </div>
                <div v-if="s.benchmark.notes" class="detail-note">
                  📝 {{ s.benchmark.notes }}
                </div>
                <div>
                  <strong>Demand elasticita (κ):</strong>
                  <code>{{ s.benchmark.elderlyDemandKappa.toFixed(1) }}</code>
                  — pomer zmeny dopytu pri starnutí populácie.
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <p class="caveat">
      ⚠️ <strong>Poctivosť:</strong> Aktuálne FTE čísla pochádzajú z verejne
      publikovaných výročných správ slovenských inštitúcií (NCZI, MV SR, SE,
      SEPS, ZSE/SSE/VSE, ŽSR, ZSSK, NDS, SSC, MŠVVaŠ, ŠÚ SR LFS).
      Benchmarky pochádzajú z medzinárodne validovaných štandardov (WHO WISN,
      UN UNODC, NFPA, IAEA SSG-16, NERC FERC, AWWA, UIC, FHWA, OECD, NIS2).
      Projekcia status-quo predpokladá, že každý sektor si udrží svoj podiel
      pracujúcej populácie — žiadna automatizácia ani migrácia mimo Eurostat
      EUROPOP2023 scenáre. Reálne adaptácie (robotizácia, EU pracovná
      mobilita, parametrické reformy) môžu tieto čísla zmierniť.
    </p>
  </div>
</template>

<style scoped>
.sect-block { display: flex; flex-direction: column; gap: 0.8rem; }
.sect-controls {
  display: flex; gap: 1.1rem; flex-wrap: wrap; align-items: center;
  background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.7rem 0.95rem; border-radius: 0.5rem;
}
.sect-controls label { font-size: 0.92rem; color: #cdd5e0; display: flex; gap: 0.45rem; align-items: center; }
.sect-controls select {
  background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cdd5e0; padding: 0.3rem 0.55rem; border-radius: 0.3rem;
}
.legend-info { font-size: 0.82rem; color: #8b9cb3; margin-left: auto; }
.sect-table {
  width: 100%; border-collapse: collapse; font-size: 0.91rem; font-variant-numeric: tabular-nums;
}
.sect-table th {
  text-align: left; padding: 0.55rem 0.65rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #8b9cb3; font-weight: 600; font-size: 0.85rem;
}
.sect-table td { padding: 0.5rem 0.65rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); vertical-align: middle; }
.sect-table .num { text-align: right; font-family: ui-monospace, "SF Mono", monospace; }
.cat-icon { display: inline-block; margin-right: 0.4rem; }
.gap-pill, .tip-pill {
  display: inline-block; padding: 0.1rem 0.55rem; border-radius: 0.3rem;
  font-size: 0.83rem; font-weight: 600;
}
.gap-good   { background: rgba(52, 211, 153, 0.18); color: #6ee7b7; }
.gap-tight  { background: rgba(251, 191, 36, 0.18); color: #fcd34d; }
.gap-bad    { background: rgba(251, 113, 133, 0.18); color: #fda4af; }
.tip-none   { background: rgba(52, 211, 153, 0.12); color: #86efac; }
.tip-soon   { background: rgba(251, 113, 133, 0.18); color: #fda4af; }
.tip-mid    { background: rgba(251, 191, 36, 0.18); color: #fcd34d; }
.tip-late   { background: rgba(96, 165, 250, 0.18); color: #93c5fd; }
.expand-btn {
  background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cdd5e0; width: 1.6rem; height: 1.6rem; border-radius: 0.3rem;
  cursor: pointer; font-size: 1rem; line-height: 1;
}
.expand-btn:hover { background: rgba(96, 165, 250, 0.15); border-color: #60a5fa; }
.sect-detail td {
  background: rgba(15, 23, 42, 0.65);
  padding: 0.85rem 1rem !important;
  border-bottom: 1px solid rgba(96, 165, 250, 0.15);
}
.detail-grid {
  display: flex; flex-direction: column; gap: 0.4rem;
  font-size: 0.88rem; line-height: 1.55; color: #cdd5e0;
}
.detail-grid strong { color: #93c5fd; }
.detail-grid code {
  background: rgba(0, 0, 0, 0.35); padding: 0.1rem 0.35rem; border-radius: 0.25rem;
  font-size: 0.85em;
}
.detail-note {
  background: rgba(251, 191, 36, 0.06); border-left: 3px solid rgba(251, 191, 36, 0.4);
  padding: 0.5rem 0.7rem; border-radius: 0 0.3rem 0.3rem 0; font-size: 0.86rem; color: #fef3c7;
}
.caveat {
  font-size: 0.85rem; line-height: 1.55; color: #aab4c4;
  background: rgba(251, 113, 133, 0.06); border-left: 3px solid rgba(251, 113, 133, 0.4);
  padding: 0.7rem 0.95rem; border-radius: 0 0.4rem 0.4rem 0; margin: 0;
}
</style>
