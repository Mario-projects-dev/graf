<script setup lang="ts">
export interface SectionNavItem {
  to: string;
  label: string;
}
defineProps<{ items: SectionNavItem[] }>();
</script>

<template>
  <nav class="section-nav" aria-label="Pod-navigácia sekcie">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="section-nav__link"
      exact-active-class="is-active"
      >{{ item.label }}</NuxtLink
    >
  </nav>
</template>
