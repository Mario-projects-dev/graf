<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed } from "vue";
import type { SectionNavItem } from "~/components/SectionNav.vue";

interface HeroData {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  subNav?: SectionNavItem[];
}

const route = useRoute();
const hero = computed<HeroData>(() => {
  const m = (route.meta || {}) as { hero?: HeroData };
  return m.hero || {};
});
</script>

<template>
  <div>
    <a class="visually-hidden" href="#main">Preskočiť na obsah</a>
    <SiteHeader
      :eyebrow="hero.eyebrow"
      :title="hero.title"
      :subtitle="hero.subtitle"
      :sub-nav="hero.subNav"
    />
    <main id="main" class="wrap">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
