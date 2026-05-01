<script setup lang="ts">
import { computed } from "vue";

interface Props {
  state: "load" | "datacube" | "eurostat" | "offline" | "err";
  label?: string;
}
const props = withDefaults(defineProps<Props>(), {
  state: "load",
  label: "",
});

const text = computed(() => {
  if (props.state === "load") return "⏳ Sťahujem…";
  if (props.label) return props.label;
  return "";
});
const cls = computed(() => "src-badge src-badge--" + props.state);
</script>

<template>
  <div :class="cls">{{ text }}</div>
</template>
