# Slovensko v grafoch

Nuxt 3 projekt s interaktívnymi grafmi o demografii a ekonomike SR. Dáta sa
sťahujú živo z verejných API (DATAcube ŠÚ SR + Eurostat).

## Vývoj

```bash
npm install
npm run dev      # http://localhost:3000
```

## Statický export (deploy)

```bash
npm run generate
# výstup: .output/public/  → upload na Cloudflare Pages / Netlify / GitHub Pages
```

## Štruktúra

```
assets/css/      design tokens, base styly
components/      Vue komponenty (charts/, KpiCard, EstimateBanner, ...)
composables/     data-fetch + transformácie (useDatacube, useEurostat, ...)
content/blog/    markdown články (cez @nuxt/content)
layouts/         default.vue (header + footer)
pages/           routes (index, demografia, ekonomika, blog/[...slug])
public/data/     statické JSON fallbacky
legacy/          pôvodné HTML stránky (referencia)
```

## Autor

Mario Vitek · m.vitek.mv@gmail.com
