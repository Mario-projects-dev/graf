// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-04-01",
  devtools: { enabled: true },

  modules: ["@nuxt/content"],

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      htmlAttrs: { lang: "sk" },
      title: "Slovensko v grafoch — demografia a ekonomika",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Interaktívne grafy o Slovensku: demografia, ekonomika, predikcie. Živé dáta z DATAcube ŠÚ SR a Eurostatu.",
        },
        { name: "author", content: "Mario Vitek" },
        { name: "theme-color", content: "#0f1419" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:title", content: "Slovensko v grafoch" },
        {
          property: "og:description",
          content: "Demografia a ekonomika Slovenska v živých grafoch.",
        },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [
        {
          rel: "icon",
          href:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%233b82f6'/%3E%3Ctext x='50%25' y='54%25' font-family='system-ui,sans-serif' font-size='28' font-weight='700' fill='white' text-anchor='middle' dominant-baseline='middle'%3ESK%3C/text%3E%3C/svg%3E",
        },
        {
          rel: "apple-touch-icon",
          href:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%233b82f6'/%3E%3Ctext x='50%25' y='54%25' font-family='system-ui,sans-serif' font-size='80' font-weight='700' fill='white' text-anchor='middle' dominant-baseline='middle'%3ESK%3C/text%3E%3C/svg%3E",
        },
      ],
    },
  },

  // Static site generation: `npm run generate` produces ./.output/public
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        "/",
        "/demografia",
        "/ekonomika",
        "/nehnutelnosti",
        "/nehnutelnosti/ceny",
        "/nehnutelnosti/dostupnost",
        "/nehnutelnosti/hypoteky",
        "/nehnutelnosti/vystavba",
        "/blog",
      ],
    },
  },

  typescript: {
    strict: false,
    typeCheck: false,
  },
});
