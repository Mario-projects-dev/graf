<script setup lang="ts">
import { computed } from "vue";
import { loadGdp, loadInflation, type EconSeries } from "~/composables/useEkonomika";
import { loadDemografiaKpis, type DemoKpis } from "~/composables/useDemografia";
import { SR_AVERAGE_PRICE_M2, NBS_SNAPSHOT_LABEL } from "~/composables/realityStatic";
import { safeAsync } from "~/composables/safeAsync";
import { markDataFetched } from "~/composables/useDataStamp";

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

interface HomeBundle {
  gdp: EconSeries | null;
  inflation: EconSeries | null;
  kpis: DemoKpis | null;
  fetchedAt: number;
}
const { data: home } = useStaticData<HomeBundle>(
  "home.featured",
  async () => {
    const [gdp, inflation, kpis] = await Promise.all([
      safeAsync(loadGdp, null as EconSeries | null, "homeGdp"),
      safeAsync(loadInflation, null as EconSeries | null, "homeInflation"),
      safeAsync(loadDemografiaKpis, null as DemoKpis | null, "homeKpis"),
    ]);
    return { gdp, inflation, kpis, fetchedAt: Date.now() };
  },
  () => ({ gdp: null, inflation: null, kpis: null, fetchedAt: 0 })
);

if (import.meta.client) markDataFetched();

const featured = computed(() => {
  const gdpLast = home.value?.gdp?.last;
  const infLast = home.value?.inflation?.last;
  const tfr = home.value?.kpis?.tfr;
  return {
    gdp: {
      value: gdpLast ? Math.round(gdpLast.v).toLocaleString("sk-SK") + " €" : "—",
      meta: gdpLast ? "rok " + gdpLast.year + " · Eurostat" : "Eurostat nama_10_pc",
    },
    inflation: {
      value: infLast ? infLast.v.toFixed(1) + " %" : "—",
      meta: infLast ? "rok " + infLast.year + " · HICP" : "Eurostat prc_hicp",
    },
    tfr: {
      value: tfr?.v != null ? tfr.v.toFixed(2) : "—",
      meta: tfr?.year ? "rok " + tfr.year + " · demo_find" : "Eurostat demo_find",
    },
    price: {
      value: SR_AVERAGE_PRICE_M2.toLocaleString("sk-SK") + " €/m²",
      meta: NBS_SNAPSHOT_LABEL,
    },
  };
});

const { data: posts } = await useAsyncData("home-blog-feed", () =>
  queryCollection("content")
    .where("path", "LIKE", "/blog/%")
    .order("date", "DESC")
    .limit(3)
    .all()
);
</script>

<template>
  <section class="home-featured" aria-label="Vybrané ukazovatele">
    <header class="home-featured__head">
      <span class="home-featured__eyebrow">Najnovšie čísla</span>
      <h2 class="home-featured__title">Slovensko v štyroch ukazovateľoch</h2>
    </header>
    <div class="kpi-strip">
      <KpiCard
        label="HDP / obyvateľa"
        :value="featured.gdp.value"
        :meta="featured.gdp.meta"
        accent="#60a5fa"
      />
      <KpiCard
        label="Inflácia HICP"
        :value="featured.inflation.value"
        :meta="featured.inflation.meta"
        accent="#fbbf24"
      />
      <KpiCard
        label="Plodnosť (TFR)"
        :value="featured.tfr.value"
        :meta="featured.tfr.meta"
        accent="#f472b6"
      />
      <KpiCard
        label="Priemer SR €/m²"
        :value="featured.price.value"
        :meta="featured.price.meta"
        accent="#34d399"
      />
    </div>
  </section>

  <section class="home-section">
    <header class="home-section__header">
      <div>
        <h2 class="home-section__title">Sekcie</h2>
        <p class="home-section__hint">Tri tematické okruhy s živými grafmi a komentárom.</p>
      </div>
    </header>
    <div class="sections-grid">
      <NuxtLink to="/demografia" class="section-card section-card--demo">
        <div class="section-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="7" r="3" />
            <path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M14 18c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5" />
          </svg>
        </div>
        <h3>Demografia</h3>
        <p>Pôrodnosť, úmrtia, populačná pyramída a regionálne zmeny obyvateľstva SR.</p>
        <ul class="section-card__bullets">
          <li>Ročný trend živonarodených</li>
          <li>Populačná pyramída a projekcie</li>
          <li>Mapa 79 okresov</li>
        </ul>
        <span class="section-card__cta">
          Otvoriť demografiu
          <span class="section-card__cta-arrow" aria-hidden="true">→</span>
        </span>
      </NuxtLink>

      <NuxtLink to="/ekonomika" class="section-card section-card--eko">
        <div class="section-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18" />
            <rect x="6" y="13" width="3" height="7" rx="0.5" />
            <rect x="11" y="8" width="3" height="12" rx="0.5" />
            <rect x="16" y="4" width="3" height="16" rx="0.5" />
          </svg>
        </div>
        <h3>Ekonomika</h3>
        <p>HDP, miera nezamestnanosti, inflácia a verejný dlh — SR vs EÚ27, plus monetárna reforma.</p>
        <ul class="section-card__bullets">
          <li>4 makro ukazovatele s porovnaním EÚ</li>
          <li>Werner replikácia + VAR simulácia</li>
          <li>Inflačná daň a Cantillon efekty</li>
        </ul>
        <span class="section-card__cta">
          Otvoriť ekonomiku
          <span class="section-card__cta-arrow" aria-hidden="true">→</span>
        </span>
      </NuxtLink>

      <NuxtLink to="/nehnutelnosti" class="section-card section-card--reality">
        <div class="section-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M10 20v-6h4v6" />
          </svg>
        </div>
        <h3>Nehnuteľnosti</h3>
        <p>Ceny bytov, dostupnosť bývania, hypotéky a stavebná aktivita — kraje aj okresy.</p>
        <ul class="section-card__bullets">
          <li>Cenová mapa krajov + YoY %</li>
          <li>Hypotekárna kalkulačka s NBS DSTI</li>
          <li>Mapa 79 okresov pre stavebnú aktivitu</li>
        </ul>
        <span class="section-card__cta">
          Otvoriť nehnuteľnosti
          <span class="section-card__cta-arrow" aria-hidden="true">→</span>
        </span>
      </NuxtLink>
    </div>
  </section>

  <section class="home-section">
    <header class="home-section__header">
      <div>
        <h2 class="home-section__title">Najnovšie zápisky</h2>
        <p class="home-section__hint">Krátke poznámky ku grafom a metodike.</p>
      </div>
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
          <span v-if="post.tags && post.tags.length">
            · {{ post.tags.join(", ") }}</span
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
.home-featured { margin: 0.25rem 0 2.4rem; }
.home-featured__head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0 0 0.95rem;
  flex-wrap: wrap;
}
.home-featured__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theme-2);
  padding: 0.28rem 0.7rem;
  background: var(--theme-soft);
  border: 1px solid var(--theme-bd);
  border-radius: 999px;
}
.home-featured__eyebrow::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--theme);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme) 18%, transparent);
}
.home-featured__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-2);
  margin: 0;
}
.home-section { margin: 2.4rem 0; }
.home-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.05rem;
  gap: 1rem;
}
.home-section__title {
  font-size: 1.35rem;
  margin: 0 0 0.18rem;
  color: var(--text);
  letter-spacing: -0.018em;
  font-weight: 700;
}
.home-section__hint {
  margin: 0;
  font-size: 0.88rem;
  color: var(--muted);
}
.home-section__more {
  font-size: 0.9rem;
  color: var(--theme-2);
  text-decoration: none;
  white-space: nowrap;
}
.home-section__more:hover { text-decoration: underline; }

@media (max-width: 600px) {
  .home-section__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
