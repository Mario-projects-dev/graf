<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { Chart, registerables, type Chart as ChartType } from "chart.js";
import {
  runCounterfactual,
  type WernerVarPayload,
  type CounterfactualMode,
} from "~/composables/useMonetarnaReforma";

Chart.register(...registerables);

const props = defineProps<{ payload: WernerVarPayload }>();

const cfStartIdx = ref<number>(props.payload.defaultCounterfactualStartIdx);
const cfMode = ref<CounterfactualMode>("shock-cleansing");
// Target Δln C_F per quarter, expressed as % (slider). Werner ch. 17 prescribes
// ~0 % (no asset credit creation); we let the user explore 0 % to +1.5 % q/q.
const hardRuleTargetPct = ref<number>(0);

const cfData = computed(() =>
  runCounterfactual(props.payload, cfStartIdx.value, {
    mode: cfMode.value,
    hardRuleTarget: hardRuleTargetPct.value / 100,
  })
);

const startQuarter = computed(
  () => props.payload.quartersEffective[cfStartIdx.value] || ""
);

// Variable IRF chart wiring — show only response of nGDP (idx 2) and HPI (idx 3)
// to a unit orthogonalised C_F shock (idx 1) with bootstrap 95 % bands.
const irfChartCanvas = ref<HTMLCanvasElement | null>(null);
let irfChart: ChartType | null = null;

function buildIrfChart() {
  if (!irfChartCanvas.value) return;
  const p = props.payload;
  const horizons = Array.from({ length: p.horizon + 1 }, (_, h) => h);
  const shock = p.cfShockIdx;
  // Cumulative IRF (response of variable i to shock j, summed over h).
  function cumIrf(i: number): {
    point: number[];
    lower: number[];
    upper: number[];
  } {
    const point: number[] = [];
    const lower: number[] = [];
    const upper: number[] = [];
    let sP = 0;
    let sL = 0;
    let sU = 0;
    for (let h = 0; h <= p.horizon; h++) {
      sP += p.irf[h][i][shock];
      sL += p.irfBands.lower[h][i][shock];
      sU += p.irfBands.upper[h][i][shock];
      point.push(sP * 100);
      lower.push(sL * 100);
      upper.push(sU * 100);
    }
    return { point, lower, upper };
  }
  const ngdp = cumIrf(2);
  const hpi = cumIrf(3);
  irfChart = new Chart(irfChartCanvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: horizons.map((h) => "h+" + h),
      datasets: [
        {
          label: "kumulatívna odozva nGDP (%)",
          data: ngdp.point,
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 1.5,
          tension: 0.2,
        },
        {
          label: "95 % CI nGDP (lower)",
          data: ngdp.lower,
          borderColor: "rgba(96, 165, 250, 0.4)",
          backgroundColor: "rgba(96, 165, 250, 0.1)",
          borderWidth: 1,
          pointRadius: 0,
          fill: "+1",
          borderDash: [3, 3],
        },
        {
          label: "95 % CI nGDP (upper)",
          data: ngdp.upper,
          borderColor: "rgba(96, 165, 250, 0.4)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [3, 3],
        },
        {
          label: "kumulatívna odozva HPI (%)",
          data: hpi.point,
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 1.5,
          tension: 0.2,
        },
        {
          label: "95 % CI HPI (lower)",
          data: hpi.lower,
          borderColor: "rgba(251, 113, 133, 0.4)",
          backgroundColor: "rgba(251, 113, 133, 0.1)",
          borderWidth: 1,
          pointRadius: 0,
          fill: "+1",
          borderDash: [3, 3],
        },
        {
          label: "95 % CI HPI (upper)",
          data: hpi.upper,
          borderColor: "rgba(251, 113, 133, 0.4)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [3, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          labels: {
            color: "#cdd5e0",
            font: { size: 11 },
            filter: (item) => !item.text!.includes("(lower)") && !item.text!.includes("(upper)"),
          },
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            title: (items) => "Horizon " + items[0].label,
            label: (c) => " " + c.dataset.label + ": " + (c.parsed.y as number).toFixed(2) + " %",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: {
            display: true,
            text: "kvartálov po C_F shocku",
            color: "#7d8b9e",
            font: { size: 11 },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: {
            display: true,
            text: "kumulatívna odozva (% level)",
            color: "#7d8b9e",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

// Counterfactual path chart — shows cumulative % deviation since cfStartIdx
// for nGDP (idx 2) and HPI (idx 3).
const pathCanvas = ref<HTMLCanvasElement | null>(null);
let pathChart: ChartType | null = null;
function buildPathChart() {
  if (!pathCanvas.value) return;
  const cf = cfData.value;
  pathChart = new Chart(pathCanvas.value.getContext("2d")!, {
    type: "line",
    data: {
      labels: cf.quarters,
      datasets: [
        {
          label: "Δ nGDP — counterfactual (Werner credit guidance)",
          data: cf.cumPct.map((row) => row[2]),
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "Δ HPI — counterfactual",
          data: cf.cumPct.map((row) => row[3]),
          borderColor: "#fb7185",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "Δ Δln C_F — counterfactual (cleansed shock)",
          data: cf.cumPct.map((row) => row[1]),
          borderColor: "#a78bfa",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          borderDash: [4, 3],
        },
        {
          label: "Δ Δln C_R — counterfactual",
          data: cf.cumPct.map((row) => row[0]),
          borderColor: "#34d399",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.2,
          borderDash: [4, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          labels: { color: "#cdd5e0", font: { size: 11 } },
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            title: (items) => "Q " + items[0].label,
            label: (c) => " " + c.dataset.label + ": " + (c.parsed.y as number).toFixed(2) + " %",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e", maxTicksLimit: 8 },
          title: {
            display: true,
            text: "kvartál",
            color: "#7d8b9e",
            font: { size: 11 },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7d8b9e" },
          title: {
            display: true,
            text: "kumulatívna odchýlka level (% vs actual)",
            color: "#7d8b9e",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

async function rebuildAll() {
  irfChart?.destroy();
  pathChart?.destroy();
  irfChart = null;
  pathChart = null;
  await nextTick();
  buildIrfChart();
  buildPathChart();
}
onMounted(rebuildAll);
onBeforeUnmount(() => {
  irfChart?.destroy();
  pathChart?.destroy();
});
watch([cfStartIdx, cfMode, hardRuleTargetPct, () => props.payload], rebuildAll);

// KPI block: cumulative % deviation by the end of the sample.
const finalDeltas = computed(() => {
  const cf = cfData.value;
  const last = cf.cumPct[cf.cumPct.length - 1] || [];
  return {
    nGdp: last[2] ?? 0,
    hpi: last[3] ?? 0,
    cR: last[0] ?? 0,
    cF: last[1] ?? 0,
  };
});
function fmtDelta(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + " %";
}
</script>

<template>
  <div class="var-sim">
    <div class="var-meta">
      <p>
        Estimated VAR(<strong>{{ payload.p }}</strong>) on
        <strong>{{ payload.K }}</strong> EA20 quarterly variables
        (Δln C_R, Δln C_F, Δln nGDP, Δln HPI) over
        <strong>{{ payload.quartersEffective[0] }}</strong> –
        <strong>{{ payload.quartersEffective[payload.quartersEffective.length - 1] }}</strong>,
        T = <strong>{{ payload.Y.length }}</strong>. Cholesky ordering podľa
        Werner (2003 p. 215): banks decide credit allocation first.
      </p>
      <p class="footnote">
        Bootstrap CI okolo IRF: 250 replicates s residual resampling. Counterfactual
        shock cleansing podľa <em>Princes of the Yen</em> (2003) ch. 6.4 — orthogonálny
        shock C_F sa vynuluje od zvoleného kvartálu, ostatné štruktúrne shocky držíme
        na historických hodnotách.
      </p>
    </div>

    <div class="var-block">
      <h5>1. Impulse response — kumulatívna odozva na unit C_F shock</h5>
      <div class="canvas-wrap">
        <canvas
          ref="irfChartCanvas"
          height="280"
          aria-label="VAR(4) impulse response: nGDP and HPI to a unit orthogonal shock in household credit"
        ></canvas>
      </div>
    </div>

    <div class="var-block">
      <header class="cf-header">
        <h5>2. Counterfactual: vynulovať C_F od kvartálu</h5>

        <!-- Mode selector ─────────────────────────────────────────── -->
        <fieldset class="cf-mode">
          <legend>Režim</legend>
          <label :class="{ active: cfMode === 'shock-cleansing' }">
            <input
              type="radio"
              name="cf-mode"
              value="shock-cleansing"
              :checked="cfMode === 'shock-cleansing'"
              @change="cfMode = 'shock-cleansing'"
            />
            <span class="mode-title">Shock cleansing</span>
            <span class="mode-sub">
              Princes of the Yen 2003 ch. 6.4 — vynuluje iba <em>orthogonálny
              shock</em> C_F (predikovateľná zložka rastu hypoték prejde).
            </span>
          </label>
          <label :class="{ active: cfMode === 'hard-rule' }">
            <input
              type="radio"
              name="cf-mode"
              value="hard-rule"
              :checked="cfMode === 'hard-rule'"
              @change="cfMode = 'hard-rule'"
            />
            <span class="mode-title">Hard rule (NPM 2005 ch. 17)</span>
            <span class="mode-sub">
              Wernerova normatívna preskripcia — Δln C_F vynútená na cieľovú
              hodnotu každý kvartál (silnejší zásah, ale Lucas critique platí
              o to viac).
            </span>
          </label>
        </fieldset>

        <div class="cf-slider">
          <label for="var-cf-start">
            Štart Werner-režimu:
            <strong>{{ startQuarter }}</strong>
          </label>
          <input
            id="var-cf-start"
            type="range"
            :min="0"
            :max="payload.quartersEffective.length - 1"
            :value="cfStartIdx"
            step="1"
            @input="(e) => (cfStartIdx = Number((e.target as HTMLInputElement).value))"
          />
          <div class="cf-marks">
            <span>{{ payload.quartersEffective[0] }}</span>
            <span>{{ payload.quartersEffective[payload.quartersEffective.length - 1] }}</span>
          </div>
        </div>

        <!-- Hard-rule target slider (visible only in hard-rule mode) -->
        <div v-if="cfMode === 'hard-rule'" class="cf-slider cf-slider--target">
          <label for="var-cf-target">
            Cieľová Δln C_F na kvartál:
            <strong>{{ hardRuleTargetPct.toFixed(2) }} %</strong>
            <span class="cf-target-hint">
              (Werner odporúča ≈ 0 %; pre porovnanie skús 0.5 %, 1 %, 1.5 %)
            </span>
          </label>
          <input
            id="var-cf-target"
            type="range"
            min="-0.5"
            max="1.5"
            step="0.05"
            :value="hardRuleTargetPct"
            @input="(e) => (hardRuleTargetPct = Number((e.target as HTMLInputElement).value))"
          />
          <div class="cf-marks">
            <span>−0.5 %</span>
            <span>0 %</span>
            <span>+1.5 %</span>
          </div>
        </div>
      </header>

      <div class="kpi-row">
        <div class="kpi-cell">
          <div class="kpi-label">Δ nGDP (kumulatívne k posl. Q)</div>
          <div :class="['kpi-val', finalDeltas.nGdp >= 0 ? 'pos' : 'neg']">
            {{ fmtDelta(finalDeltas.nGdp) }}
          </div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-label">Δ HPI</div>
          <div :class="['kpi-val', finalDeltas.hpi <= 0 ? 'pos' : 'neg']">
            {{ fmtDelta(finalDeltas.hpi) }}
          </div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-label">Δ úver C_F (HH)</div>
          <div :class="['kpi-val', finalDeltas.cF <= 0 ? 'pos' : 'neg']">
            {{ fmtDelta(finalDeltas.cF) }}
          </div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-label">Δ úver C_R (NFC)</div>
          <div :class="['kpi-val', finalDeltas.cR >= 0 ? 'pos' : 'neg']">
            {{ fmtDelta(finalDeltas.cR) }}
          </div>
        </div>
      </div>

      <div class="canvas-wrap">
        <canvas
          ref="pathCanvas"
          height="320"
          aria-label="Counterfactual path: cumulative % deviation of nGDP, HPI, credit since cleansing start"
        ></canvas>
      </div>
    </div>

    <p class="caveat">
      ⚠️ <strong>Lucas critique</strong>: VAR β-koeficienty sú odhadnuté na
      historickom režime (ECB s OMT, QE post-2015, bez credit guidance).
      Pod alternatívnym režimom (aktívna kvótovaná alokácia úveru) by sa
      koeficienty samotných agentov mohli zmeniť. Counterfactual je preto
      <em>obhájiteľný iba na 4–8 kvartálov</em>; dlhšie horizonty zobrazujeme len
      pre úplnosť IRF.
      <span v-if="cfMode === 'hard-rule'">
        <strong>V režime „hard rule" platí o to viac:</strong> vynútená trajektória
        C_F je silnejší zásah ako shock cleansing, model však počíta s tým, že
        ostatní agenti reagujú podľa historických vzorcov — v praxi by sa asset
        dopyt presunul mimo bankového úveru (kapitálové trhy, zahraničné financovanie).
      </span>
    </p>
  </div>
</template>

<style scoped>
.var-sim {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-top: 0.5rem;
}
.var-meta {
  font-size: 0.92rem;
  color: #b8c5d6;
  background: rgba(15, 23, 42, 0.4);
  border-left: 3px solid rgba(96, 165, 250, 0.45);
  padding: 0.7rem 0.95rem;
  border-radius: 0 0.4rem 0.4rem 0;
}
.var-meta .footnote {
  font-size: 0.82rem;
  color: #8b9cb3;
  margin: 0.4rem 0 0;
}
.var-block {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem 0.7rem;
}
.var-block h5 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
  color: #cdd5e0;
}
.canvas-wrap {
  position: relative;
  height: 300px;
}
.cf-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.cf-slider {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cf-slider label {
  font-size: 0.92rem;
  color: #cdd5e0;
}
.cf-slider strong {
  color: #60a5fa;
  font-weight: 700;
}
.cf-slider input[type="range"] {
  width: 100%;
  accent-color: #60a5fa;
}
.cf-marks {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #7d8b9e;
}
.cf-mode {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.45rem;
  padding: 0.55rem 0.7rem 0.4rem;
  margin: 0 0 0.4rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.4rem;
}
.cf-mode legend {
  font-size: 0.78rem;
  color: #8b9cb3;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0 0.35rem;
}
.cf-mode label {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.55rem;
  align-items: start;
  padding: 0.45rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.cf-mode label:hover {
  background: rgba(15, 23, 42, 0.7);
}
.cf-mode label.active {
  border-color: rgba(96, 165, 250, 0.6);
  background: rgba(96, 165, 250, 0.10);
}
.cf-mode input[type="radio"] {
  grid-row: 1 / span 2;
  margin-top: 0.25rem;
  accent-color: #60a5fa;
}
.cf-mode .mode-title {
  font-size: 0.93rem;
  color: #cdd5e0;
  font-weight: 600;
}
.cf-mode .mode-sub {
  font-size: 0.82rem;
  color: #8b9cb3;
  line-height: 1.4;
}
.cf-mode label.active .mode-title { color: #93c5fd; }
.cf-slider--target {
  margin-top: 0.3rem;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}
.cf-slider--target input[type="range"] {
  accent-color: #fbbf24;
}
.cf-slider--target strong {
  color: #fcd34d;
}
.cf-target-hint {
  font-size: 0.78rem;
  color: #8b9cb3;
  margin-left: 0.35rem;
}
@media (min-width: 640px) {
  .cf-mode { grid-template-columns: 1fr 1fr; }
  .cf-mode legend { grid-column: 1 / -1; }
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 0.7rem 0;
}
.kpi-cell {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.4rem;
  padding: 0.55rem 0.75rem;
}
.kpi-label {
  font-size: 0.74rem;
  color: #8b9cb3;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.kpi-val {
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 0.15rem;
}
.kpi-val.pos { color: #34d399; }
.kpi-val.neg { color: #fb7185; }
.caveat {
  font-size: 0.86rem;
  line-height: 1.55;
  color: #aab4c4;
  background: rgba(251, 113, 133, 0.06);
  border-left: 3px solid rgba(251, 113, 133, 0.4);
  padding: 0.7rem 0.95rem;
  border-radius: 0 0.4rem 0.4rem 0;
  margin: 0;
}
@media (min-width: 720px) {
  .kpi-row { grid-template-columns: repeat(4, 1fr); }
}
</style>
