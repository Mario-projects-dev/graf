<script setup lang="ts">
defineProps<{ visible: boolean }>();
</script>

<template>
  <div v-if="visible" class="estimate-banner" role="note">
    <span class="icon" aria-hidden="true">⚠️</span>
    <div>
      <strong>Pozor — okresné rozdelenie je odhad.</strong>
      Živé sťahovanie z DATAcube ŠÚ SR zlyhalo, takže krajské čísla sú
      rozpočítané na okresy podľa <code>√(plocha okresu)</code> tak, aby
      súčet zodpovedal medziročnému poklesu stavu obyvateľstva SR (−8 315).
      <strong>Konkrétne hodnoty pri okresoch v tomto fallbacku nie sú oficiálne</strong>
      — overené čísla nájdete v
      <a
        href="https://datacube.statistics.sk/#!/view/sk/vbd_dem/om7013rr/v_om7013rr_00_00_00_sk"
        target="_blank"
        rel="noopener"
        >DATAcube OM7013RR</a
      >.
    </div>
  </div>
</template>
