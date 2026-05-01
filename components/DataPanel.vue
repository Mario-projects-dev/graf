<script setup lang="ts">
// Universal embed wrapper for blog articles. Reads a frozen JSON snapshot from
// `/data/blog/<slug>.json` and renders one of the chart / table components
// with the appropriate slice of the snapshot.
//
// MDC syntax in markdown:
//   ::data-panel{slug="werner-replikacia-var-chow" datasetKey="lagGranger" component="ChartsWernerLagAndGranger"}
//   ::
//
// Two-prop variants exist for components that need multiple keys (e.g. Korea
// comparison takes h1+h2; PSI chart takes psi+usa). Use `extraKeys` for those.
import { ref, computed, onMounted } from "vue";
import { resolveComponent } from "vue";

const props = defineProps<{
  slug: string;
  datasetKey: string;
  component: string;
  /** Map prop-name → datasetKey for components that need multiple slices. */
  extraKeys?: Record<string, string>;
  /** Pass-through for components like KoreaComparison that bind h1/h2 directly. */
  propName?: string;
}>();

const snapshot = ref<any>(null);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const r = await fetch(`/data/blog/${props.slug}.json`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    snapshot.value = j.data ?? j;
  } catch (e) {
    error.value = (e as Error).message;
  }
});

const payload = computed(() => snapshot.value?.[props.datasetKey] ?? null);
const extraProps = computed(() => {
  if (!snapshot.value || !props.extraKeys) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props.extraKeys)) {
    out[k] = snapshot.value[v];
  }
  return out;
});

const Component = computed(() => resolveComponent(props.component));
const mainPropName = computed(() => props.propName || "payload");
</script>

<template>
  <div class="data-panel">
    <component
      v-if="payload"
      :is="Component"
      v-bind="{ [mainPropName]: payload, ...extraProps }"
    />
    <div v-else-if="error" class="data-panel__error">
      ⚠ Frozen snapshot pre <code>{{ slug }}</code> sa nepodarilo načítať: {{ error }}
    </div>
    <div v-else class="data-panel__loading">
      ⏳ Načítavam frozen snapshot…
    </div>
  </div>
</template>

<style scoped>
.data-panel { margin: 1rem 0; }
.data-panel__error {
  background: rgba(251, 113, 133, 0.08);
  border-left: 3px solid rgba(251, 113, 133, 0.5);
  padding: 0.7rem 1rem;
  border-radius: 0 0.4rem 0.4rem 0;
  color: #fda4af;
  font-size: 0.92rem;
}
.data-panel__loading {
  padding: 1rem;
  color: #8b9cb3;
  font-size: 0.92rem;
  text-align: center;
}
</style>
