<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed, watchEffect } from "vue";

const route = useRoute();
const themeClass = computed(() => {
  const p = route.path;
  if (p.startsWith("/ekonomika")) return "theme-eko";
  if (p.startsWith("/nehnutelnosti")) return "theme-reality";
  if (p.startsWith("/blog")) return "theme-blog";
  return "theme-demo";
});

// Apply theme class to body for global gradient/accent shifts
if (import.meta.client) {
  watchEffect(() => {
    document.body.classList.remove(
      "theme-demo",
      "theme-eko",
      "theme-reality",
      "theme-blog"
    );
    document.body.classList.add(themeClass.value);
  });
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
