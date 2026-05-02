<script setup lang="ts">
import { computed } from "vue";
import { useDataStamp } from "~/composables/useDataStamp";

const year = new Date().getFullYear();
const stamp = useDataStamp();
const stampLabel = computed(() =>
  stamp.value ? "Dáta načítané: " + stamp.value : "Dáta načítané: —"
);
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col footer-author">
        <h3>Autor</h3>
        <p><strong>Mario Vitek</strong></p>
        <p>
          Otvorený prehľad verejne dostupných štatistík o Slovensku — postupne
          rozširovaný o ďalšie demografické pohľady, ekonomiku a predikcie.
          Pripomienky vítané.
        </p>
        <a
          class="footer-author__contact"
          href="mailto:m.vitek.mv@gmail.com"
          aria-label="Napísať autorovi"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
          <span>m.vitek.mv@gmail.com</span>
        </a>
      </div>
      <div class="footer-col">
        <h3>Zdroje dát</h3>
        <ul>
          <li>
            <a
              href="https://datacube.statistics.sk/"
              target="_blank"
              rel="noopener"
              >DATAcube ŠÚ SR</a
            >
          </li>
          <li>
            <a
              href="https://ec.europa.eu/eurostat/databrowser"
              target="_blank"
              rel="noopener"
              >Eurostat databrowser</a
            >
          </li>
          <li>
            <a
              href="https://data.ecb.europa.eu/"
              target="_blank"
              rel="noopener"
              >ECB Data Portal</a
            >
          </li>
          <li>
            <a
              href="https://github.com/drakh/slovakia-gps-data"
              target="_blank"
              rel="noopener"
              >drakh/slovakia-gps-data</a
            >
          </li>
          <li>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener"
              >© OpenStreetMap</a
            >
            /
            <a href="https://carto.com/" target="_blank" rel="noopener"
              >CARTO</a
            >
          </li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>O stránke</h3>
        <ul>
          <li>Dáta sa pečú do HTML pri builde — žiadne čakanie pri načítaní.</li>
          <li>Žiadne sledovanie, žiadne cookies, žiadne analytiky.</li>
          <li>Postavené na Nuxte 3, Chart.js a Leaflete.</li>
          <li>
            <a
              href="https://github.com/Mario-projects-dev/graf"
              target="_blank"
              rel="noopener"
              >Zdrojový kód na GitHub-e</a
            >
          </li>
        </ul>
      </div>
    </div>
    <div class="footer-meta">
      <span>© {{ year }} Mario Vitek · Obsah len na informačné účely</span>
      <span>{{ stampLabel }}</span>
    </div>
  </footer>
</template>
