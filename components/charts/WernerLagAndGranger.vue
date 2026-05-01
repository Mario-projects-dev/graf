<script setup lang="ts">
import { computed } from "vue";
import type {
  WernerLagAndGrangerPayload,
} from "~/composables/useMonetarnaReforma";
import type {
  DistributedLagResult,
  GrangerResult,
} from "~/composables/useWernerEconometrics";

const props = defineProps<{ payload: WernerLagAndGrangerPayload }>();

function fmtNum(v: number | null | undefined, dec = 3): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(dec);
}
function fmtP(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  if (p < 0.001) return "< 0.001";
  if (p < 0.01) return p.toFixed(3);
  return p.toFixed(2);
}
function pBadge(p: number): string {
  if (p < 0.001) return "p-strong";
  if (p < 0.01) return "p-strong";
  if (p < 0.05) return "p-mid";
  if (p < 0.1) return "p-weak";
  return "p-fail";
}
function asterisks(p: number): string {
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  if (p < 0.1) return "·";
  return "";
}

interface LagRow {
  label: string;
  beta: number;
  se: number;
  t: number;
  p: number;
}

function lagRows(d: DistributedLagResult): LagRow[] {
  const out: LagRow[] = [];
  out.push({
    label: "α (intercept)",
    beta: d.ols.coef[0],
    se: d.ols.se[0],
    t: d.ols.tStat[0],
    p: d.ols.pValue[0],
  });
  for (let i = 0; i <= d.lags; i++) {
    out.push({
      label: "β" + sub(i),
      beta: d.ols.coef[i + 1],
      se: d.ols.se[i + 1],
      t: d.ols.tStat[i + 1],
      p: d.ols.pValue[i + 1],
    });
  }
  return out;
}
function sub(i: number): string {
  const subs = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈"];
  return subs[i] || String(i);
}

const h1Rows = computed(() => lagRows(props.payload.h1));
const h2Rows = computed(() => lagRows(props.payload.h2));
const cross1Rows = computed(() => lagRows(props.payload.cross1));
const cross2Rows = computed(() => lagRows(props.payload.cross2));

function verdict(d: DistributedLagResult): {
  text: string;
  cls: string;
} {
  const p = d.jointPValue;
  if (p < 0.01)
    return {
      text: "joint F = " + d.jointF.toFixed(2) + ", p < 0.01 — joint significance prijatá",
      cls: "verdict-strong",
    };
  if (p < 0.05)
    return {
      text:
        "joint F = " + d.jointF.toFixed(2) + ", p = " + p.toFixed(3) + " — signifikantná na 5 %",
      cls: "verdict-mid",
    };
  if (p < 0.1)
    return {
      text:
        "joint F = " + d.jointF.toFixed(2) + ", p = " + p.toFixed(3) + " — marginálna",
      cls: "verdict-weak",
    };
  return {
    text:
      "joint F = " + d.jointF.toFixed(2) + ", p = " + p.toFixed(3) + " — joint significance neprijatá",
    cls: "verdict-fail",
  };
}

function grangerVerdict(g: GrangerResult): {
  text: string;
  cls: string;
} {
  if (g.pValue < 0.05) {
    return {
      text: g.direction + ": F = " + g.f.toFixed(2) + ", p = " + fmtP(g.pValue) + " — H₀ ZAMIETNUTÁ (kauzálny smer prijatý)",
      cls: "verdict-strong",
    };
  }
  if (g.pValue < 0.1) {
    return {
      text: g.direction + ": F = " + g.f.toFixed(2) + ", p = " + fmtP(g.pValue) + " — marginálna",
      cls: "verdict-mid",
    };
  }
  return {
    text: g.direction + ": F = " + g.f.toFixed(2) + ", p = " + fmtP(g.pValue) + " — H₀ neZAMIETNUTÁ (kauzálny smer neidentifikovaný)",
    cls: "verdict-fail",
  };
}

const h1V = computed(() => verdict(props.payload.h1));
const h2V = computed(() => verdict(props.payload.h2));
const c1V = computed(() => verdict(props.payload.cross1));
const c2V = computed(() => verdict(props.payload.cross2));

const h1GFwd = computed(() => grangerVerdict(props.payload.h1GrangerForward));
const h1GRev = computed(() => grangerVerdict(props.payload.h1GrangerReverse));
const h2GFwd = computed(() => grangerVerdict(props.payload.h2GrangerForward));
const h2GRev = computed(() => grangerVerdict(props.payload.h2GrangerReverse));
</script>

<template>
  <div class="lag-block">
    <header class="lag-header">
      <p>
        Vzorka: kvartálne EA20 dáta od <strong>{{ payload.startQuarter }}</strong>
        po <strong>{{ payload.endQuarter }}</strong>, n =
        <strong>{{ payload.h1.ols.n }}</strong> (H₁) /
        <strong>{{ payload.h2.ols.n }}</strong> (H₂) po log-difference + 4 lag
        truncation. Wernerova špecifikácia (NPM 2005, eq. 14.5/14.6):
        <code>Δln(y)<sub>t</sub> = α + Σ<sub>i=0..4</sub> β<sub>i</sub> Δln(x)<sub>t−i</sub> + ε<sub>t</sub></code>.
      </p>
    </header>

    <!-- H₁ ─────────────────────────────────────────────────────────── -->
    <div class="lag-card">
      <h5>H₁: nominálne HDP ← 4 lagy produktívneho úveru (C_R)</h5>
      <p class="caption">
        Δln(nGDP)<sub>t</sub> = α + Σ β<sub>i</sub> Δln(C<sub>R</sub>)<sub>t−i</sub>
      </p>
      <table class="lag-table">
        <thead>
          <tr>
            <th>parameter</th>
            <th>β̂</th>
            <th>SE</th>
            <th>t</th>
            <th>p</th>
            <th>sig.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in h1Rows" :key="r.label">
            <td>{{ r.label }}</td>
            <td class="num">{{ fmtNum(r.beta, 4) }}</td>
            <td class="num">{{ fmtNum(r.se, 4) }}</td>
            <td class="num">{{ fmtNum(r.t, 2) }}</td>
            <td class="num"><span :class="['p-pill', pBadge(r.p)]">{{ fmtP(r.p) }}</span></td>
            <td class="num sig">{{ asterisks(r.p) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="meta">
              R² = {{ payload.h1.ols.r2.toFixed(3) }} ·
              adj. R² = {{ payload.h1.ols.adjR2.toFixed(3) }} ·
              n = {{ payload.h1.ols.n }} ·
              Σβ = {{ fmtNum(payload.h1.cumBeta, 3) }}
              ± {{ payload.h1.cumBetaSE.toFixed(3) }} (long-run multiplier)
            </td>
          </tr>
        </tfoot>
      </table>
      <p :class="['verdict', h1V.cls]">{{ h1V.text }}</p>
      <div class="granger">
        <p :class="['granger-line', h1GFwd.cls]">{{ h1GFwd.text }}</p>
        <p :class="['granger-line', h1GRev.cls]">{{ h1GRev.text }}</p>
      </div>
    </div>

    <!-- H₂ ─────────────────────────────────────────────────────────── -->
    <div class="lag-card">
      <h5>H₂: HPI ← 4 lagy asset úveru (C_F)</h5>
      <p class="caption">
        Δln(HPI)<sub>t</sub> = α + Σ β<sub>i</sub> Δln(C<sub>F</sub>)<sub>t−i</sub>
      </p>
      <table class="lag-table">
        <thead>
          <tr>
            <th>parameter</th>
            <th>β̂</th>
            <th>SE</th>
            <th>t</th>
            <th>p</th>
            <th>sig.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in h2Rows" :key="r.label">
            <td>{{ r.label }}</td>
            <td class="num">{{ fmtNum(r.beta, 4) }}</td>
            <td class="num">{{ fmtNum(r.se, 4) }}</td>
            <td class="num">{{ fmtNum(r.t, 2) }}</td>
            <td class="num"><span :class="['p-pill', pBadge(r.p)]">{{ fmtP(r.p) }}</span></td>
            <td class="num sig">{{ asterisks(r.p) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="meta">
              R² = {{ payload.h2.ols.r2.toFixed(3) }} ·
              adj. R² = {{ payload.h2.ols.adjR2.toFixed(3) }} ·
              n = {{ payload.h2.ols.n }} ·
              Σβ = {{ fmtNum(payload.h2.cumBeta, 3) }}
              ± {{ payload.h2.cumBetaSE.toFixed(3) }} (long-run multiplier)
            </td>
          </tr>
        </tfoot>
      </table>
      <p :class="['verdict', h2V.cls]">{{ h2V.text }}</p>
      <div class="granger">
        <p :class="['granger-line', h2GFwd.cls]">{{ h2GFwd.text }}</p>
        <p :class="['granger-line', h2GRev.cls]">{{ h2GRev.text }}</p>
      </div>
    </div>

    <!-- Cross-check ───────────────────────────────────────────────── -->
    <div class="lag-card lag-card--small">
      <h5>Cross-validácia (mali by byť slabé per Werner)</h5>
      <div class="cross-grid">
        <div>
          <strong>nGDP ← C_F:</strong>
          <span :class="['mini-verdict', c1V.cls]">{{ c1V.text }}</span>
        </div>
        <div>
          <strong>HPI ← C_R:</strong>
          <span :class="['mini-verdict', c2V.cls]">{{ c2V.text }}</span>
        </div>
      </div>
      <p class="caption">
        Logika Wernerovej Disaggregated QTC: úver smerujúci do reálnej ekonomiky
        by mal predikovať reálnu ekonomiku (nGDP), nie asset trhy. Ak by joint F
        bol silne signifikantný aj v cross-checku, model by sa <em>nepotvrdil</em>.
      </p>
    </div>

    <p class="footer-note">
      ★ <em>Sig. legenda</em>: *** p &lt; 0.001 · ** p &lt; 0.01 · * p &lt; 0.05 · · p &lt; 0.10
      &nbsp;|&nbsp; <em>Granger F-test</em>: H₀ ⇒ x neGranger-spôsobuje y;
      špecifikácia per Werner (2005) p. 208 — VAR(4) restricted vs unrestricted.
    </p>
  </div>
</template>

<style scoped>
.lag-block {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.lag-header {
  font-size: 0.92rem;
  color: #b8c5d6;
}
.lag-header code {
  background: rgba(15, 23, 42, 0.6);
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
.lag-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.5rem;
  padding: 1rem 1.1rem;
}
.lag-card--small {
  padding: 0.85rem 1rem;
}
.lag-card h5 {
  margin: 0 0 0.25rem;
  font-size: 1.02rem;
  color: #cdd5e0;
}
.caption {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  color: #8b9cb3;
  font-family: ui-monospace, "SF Mono", monospace;
}
.lag-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}
.lag-table th {
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #8b9cb3;
  font-weight: 600;
}
.lag-table td {
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.lag-table .num {
  text-align: right;
  font-family: ui-monospace, "SF Mono", monospace;
}
.lag-table .sig {
  font-weight: 700;
  color: #fbbf24;
}
.lag-table tfoot td {
  font-size: 0.82rem;
  color: #8b9cb3;
  padding-top: 0.55rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.p-pill {
  display: inline-block;
  padding: 0.05rem 0.45rem;
  border-radius: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
}
.p-strong { background: rgba(52, 211, 153, 0.18); color: #6ee7b7; }
.p-mid    { background: rgba(96, 165, 250, 0.18); color: #93c5fd; }
.p-weak   { background: rgba(251, 191, 36, 0.18); color: #fcd34d; }
.p-fail   { background: rgba(148, 163, 184, 0.18); color: #cbd5e1; }

.verdict {
  margin: 0.85rem 0 0;
  padding: 0.55rem 0.8rem;
  border-radius: 0.4rem;
  font-size: 0.92rem;
  font-weight: 500;
}
.verdict-strong { background: rgba(52, 211, 153, 0.12); border-left: 3px solid #34d399; color: #d1fae5; }
.verdict-mid    { background: rgba(96, 165, 250, 0.12); border-left: 3px solid #60a5fa; color: #dbeafe; }
.verdict-weak   { background: rgba(251, 191, 36, 0.12); border-left: 3px solid #fbbf24; color: #fef3c7; }
.verdict-fail   { background: rgba(251, 113, 133, 0.10); border-left: 3px solid #fb7185; color: #fee2e2; }

.granger {
  margin-top: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.granger-line {
  margin: 0;
  font-size: 0.88rem;
  padding: 0.4rem 0.65rem;
  border-radius: 0.3rem;
}
.cross-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.cross-grid > div {
  font-size: 0.9rem;
}
.mini-verdict {
  display: inline-block;
  margin-left: 0.4rem;
  font-size: 0.85rem;
}
.mini-verdict.verdict-strong { color: #6ee7b7; }
.mini-verdict.verdict-mid    { color: #93c5fd; }
.mini-verdict.verdict-weak   { color: #fcd34d; }
.mini-verdict.verdict-fail   { color: #fda4af; }

.footer-note {
  font-size: 0.82rem;
  color: #7d8b9e;
  margin: 0.4rem 0 0;
}
@media (min-width: 720px) {
  .cross-grid { grid-template-columns: 1fr 1fr; }
}
</style>
