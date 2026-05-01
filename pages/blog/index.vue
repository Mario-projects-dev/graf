<script setup lang="ts">
definePageMeta({
  hero: {
    eyebrow: "Blog · zápisky",
    title: "Krátke poznámky ku grafom a metodike",
    subtitle:
      "Postupne pribúdajúce komentáre k tomu, čo dáta o Slovensku skutočne hovoria — a kde si treba dať pozor.",
  },
});
useHead({
  title: "Blog — Slovensko v grafoch",
  meta: [
    {
      name: "description",
      content:
        "Krátke články o demografii, ekonomike a metodike. Slovensko v grafoch.",
    },
  ],
});

const { data: posts } = await useAsyncData("blog-posts", () =>
  queryCollection("content")
    .where("path", "LIKE", "/blog/%")
    .order("date", "DESC")
    .all()
);
</script>

<template>
  <div v-if="posts && posts.length" class="blog-list">
    <NuxtLink
      v-for="post in posts"
      :key="post.path"
      :to="post.path"
      class="blog-card"
    >
      <div class="meta">
        <span v-if="post.date">{{ post.date }}</span>
        <span v-if="post.tags && post.tags.length"
          > · {{ post.tags.join(", ") }}</span
        >
      </div>
      <h3>{{ post.title || post.path }}</h3>
      <p v-if="post.description">{{ post.description }}</p>
    </NuxtLink>
  </div>
  <p v-else class="sub">Zatiaľ tu nič nie je. Prvý článok pribudne čoskoro.</p>
</template>
