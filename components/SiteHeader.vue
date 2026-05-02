<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { SectionNavItem } from "./SectionNav.vue";

defineProps<{
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  subNav?: SectionNavItem[];
}>();

const menuOpen = ref(false);
const route = useRoute();
watch(() => route.path, () => {
  menuOpen.value = false;
});
</script>

<template>
  <header class="site-header">
    <nav class="site-nav" aria-label="Hlavná navigácia">
      <div class="site-nav__inner">
        <NuxtLink to="/" class="brand" @click="menuOpen = false">
          <span class="brand-mark" aria-hidden="true">SK</span>
          <span class="brand-name">Slovensko v grafoch</span>
        </NuxtLink>
        <button
          type="button"
          class="nav-toggle"
          :aria-expanded="menuOpen"
          aria-controls="primary-nav"
          aria-label="Otvoriť menu"
          @click="menuOpen = !menuOpen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path v-if="!menuOpen" d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
            <path v-else d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
          </svg>
        </button>
        <div id="primary-nav" class="nav-links" :class="{ 'is-open': menuOpen }">
          <NuxtLink to="/demografia" class="nav-link">Demografia</NuxtLink>
          <NuxtLink to="/ekonomika" class="nav-link">Ekonomika</NuxtLink>
          <NuxtLink to="/nehnutelnosti" class="nav-link">Nehnuteľnosti</NuxtLink>
          <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
        </div>
      </div>
    </nav>
    <div v-if="title" class="hero">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="hero-sub">{{ subtitle }}</p>
      <SectionNav v-if="subNav && subNav.length" :items="subNav" />
    </div>
  </header>
</template>
