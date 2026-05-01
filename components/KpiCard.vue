<script setup lang="ts">
interface Props {
  label: string;
  value: string;
  meta: string;
  accent?: string;
}
withDefaults(defineProps<Props>(), { accent: "#3b82f6" });
</script>

<template>
  <div class="kpi-card" :style="{ '--kpi-accent': accent }">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value">{{ value }}</div>
    <div class="kpi-meta">{{ meta }}</div>
  </div>
</template>
