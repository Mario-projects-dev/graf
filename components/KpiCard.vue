<script setup lang="ts">
import { computed } from "vue";

interface Props {
  label: string;
  value: string;
  meta: string;
  accent?: string;
  /** Optional small emoji or single character icon. Use sparingly. */
  icon?: string;
  /** Trend hint shown next to meta. "up" / "down" / "flat" or omit. */
  trend?: "up" | "down" | "flat";
  /** Optional label for the trend pill (e.g. "+2.4 %"). */
  trendLabel?: string;
}
const props = withDefaults(defineProps<Props>(), { accent: "#60a5fa" });

const trendArrow = computed(() => {
  if (props.trend === "up") return "↑";
  if (props.trend === "down") return "↓";
  if (props.trend === "flat") return "→";
  return "";
});
const trendCls = computed(() =>
  props.trend ? "kpi-trend kpi-trend--" + props.trend : ""
);
</script>

<template>
  <div class="kpi-card" :style="{ '--kpi-accent': accent }">
    <div class="kpi-card__head">
      <span v-if="icon" class="kpi-card__icon" aria-hidden="true">{{ icon }}</span>
      <div class="kpi-label">{{ label }}</div>
    </div>
    <div class="kpi-value">{{ value }}</div>
    <div class="kpi-meta">
      <span>{{ meta }}</span>
      <span v-if="trend" :class="trendCls">
        <span aria-hidden="true">{{ trendArrow }}</span>
        <span v-if="trendLabel">{{ trendLabel }}</span>
      </span>
    </div>
  </div>
</template>
