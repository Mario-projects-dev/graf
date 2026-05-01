<script setup lang="ts">
import type { SectionNavItem } from "./SectionNav.vue";

defineProps<{
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  subNav?: SectionNavItem[];
}>();
</script>

<template>
  <header class="site-header">
    <nav class="site-nav" aria-label="Hlavná navigácia">
      <NuxtLink to="/" class="brand">
        <span class="brand-mark" aria-hidden="true">SK</span>
        <span class="brand-name">Slovensko v grafoch</span>
      </NuxtLink>
      <div class="nav-links">
        <NuxtLink to="/demografia" class="nav-link">Demografia</NuxtLink>
        <NuxtLink to="/ekonomika" class="nav-link">Ekonomika</NuxtLink>
        <NuxtLink to="/nehnutelnosti" class="nav-link">Nehnuteľnosti</NuxtLink>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
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
