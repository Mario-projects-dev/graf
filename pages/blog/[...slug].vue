<script setup lang="ts">
import { useRoute } from "vue-router";

definePageMeta({
  hero: {
    eyebrow: "Blog",
    title: "",
  },
});

const route = useRoute();

const { data: page } = await useAsyncData(`blog-${route.path}`, () =>
  queryCollection("content").path(route.path).first()
);

useHead(() => ({
  title: page.value?.title
    ? `${page.value.title} — Slovensko v grafoch`
    : "Blog — Slovensko v grafoch",
  meta: page.value?.description
    ? [{ name: "description", content: page.value.description }]
    : [],
}));
</script>

<template>
  <article v-if="page" class="blog-article">
    <h1>{{ page.title }}</h1>
    <p class="post-meta">
      <span v-if="page.date">{{ page.date }}</span>
      <span v-if="page.tags && page.tags.length">
        · {{ page.tags.join(", ") }}</span
      >
    </p>
    <ContentRenderer :value="page" />
  </article>
  <p v-else class="sub">Článok sa nenašiel.</p>
</template>
