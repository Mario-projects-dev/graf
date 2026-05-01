<script setup lang="ts">
definePageMeta({
  hero: {
    eyebrow: "Slovensko · živé dáta + zápisky",
    title: "Demografia, ekonomika, nehnuteľnosti — a poznámky k tomu",
    subtitle:
      "Otvorený prehľad verejne dostupných štatistík o Slovensku plus dlhšie texty o tom, čo dáta hovoria a kde sa treba mať na pozore. Sťahované živo z DATAcube ŠÚ SR a Eurostatu.",
  },
});
useHead({
  title: "Slovensko v grafoch",
});

const { data: posts } = await useAsyncData("home-blog-feed", () =>
  queryCollection("content")
    .where("path", "LIKE", "/blog/%")
    .order("date", "DESC")
    .limit(5)
    .all()
);
</script>

<template>
  <section class="home-section">
    <h2 class="home-section__title">Sekcie</h2>
    <div class="charts-grid">
      <article class="chart-panel">
        <h3>Demografia</h3>
        <p class="sub">
          Pôrodnosť, úmrtia, populačná pyramída a regionálne zmeny obyvateľstva
          SR.
        </p>
        <NuxtLink
          to="/demografia"
          class="nav-link is-active"
          style="display:inline-block;margin-top:0.4rem"
          >Otvoriť demografiu →</NuxtLink
        >
      </article>
      <article class="chart-panel">
        <h3>Ekonomika</h3>
        <p class="sub">
          HDP, miera nezamestnanosti, inflácia a verejný dlh — SR vs EÚ27.
        </p>
        <NuxtLink
          to="/ekonomika"
          class="nav-link is-active"
          style="display:inline-block;margin-top:0.4rem"
          >Otvoriť ekonomiku →</NuxtLink
        >
      </article>
      <article class="chart-panel">
        <h3>Nehnuteľnosti</h3>
        <p class="sub">
          Ceny bytov, dostupnosť bývania, hypotéky a výstavba.
        </p>
        <NuxtLink
          to="/nehnutelnosti"
          class="nav-link is-active"
          style="display:inline-block;margin-top:0.4rem"
          >Otvoriť nehnuteľnosti →</NuxtLink
        >
      </article>
    </div>
  </section>

  <section class="home-section">
    <header class="home-section__header">
      <h2 class="home-section__title">Najnovšie zápisky</h2>
      <NuxtLink to="/blog" class="home-section__more">Všetky články →</NuxtLink>
    </header>
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
  </section>
</template>

<style scoped>
.home-section { margin: 2rem 0; }
.home-section__header {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 0.85rem;
}
.home-section__title {
  font-size: 1.4rem;
  margin: 0 0 0.85rem;
  color: #cdd5e0;
}
.home-section__more {
  font-size: 0.92rem;
  color: #93c5fd;
  text-decoration: none;
}
.home-section__more:hover { text-decoration: underline; }
</style>
