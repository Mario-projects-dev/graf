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
        <p>
          📧 <a href="mailto:m.vitek.mv@gmail.com">m.vitek.mv@gmail.com</a>
        </p>
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
          <li>Dáta sa sťahujú živo pri každom načítaní.</li>
          <li>Žiadne sledovanie, žiadne cookies.</li>
          <li>Postavené na Nuxte 3, Chart.js a Leaflete.</li>
        </ul>
      </div>
    </div>
    <div class="footer-meta">
      <span>© {{ year }} Mario Vitek · Obsah len na informačné účely</span>
      <span>{{ stampLabel }}</span>
    </div>
  </footer>
</template>
