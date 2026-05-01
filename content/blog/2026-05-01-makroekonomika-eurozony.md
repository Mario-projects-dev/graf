---
title: "Makroekonomické ukazovatele eurozóny a Slovenska"
description: "Menové agregáty M1/M2/M3, kľúčové sadzby ECB, Euribor 3M, 10Y výnosy slovenských dlhopisov a Fisherova rovnica — frozen snapshot zo živých zdrojov ECB a Eurostatu."
date: "2026-05-01"
tags: ["ekonomika", "makroekonomika", "ECB", "monetárne agregáty"]
---

> **Frozen snapshot.** Tento článok zachytáva makroekonomické ukazovatele v deň publikácie. Pre najaktuálnejšie hodnoty pozri zdrojové ECB SDW a Eurostat datasety.

## Menové agregáty M1 / M2 / M3

Tri vrstvy peňazí podľa likvidity:
- **M1** — hotovosť + vklady na požiadanie (najtekutejšie)
- **M2 − M1** — krátkodobé termínované vklady
- **M3 − M2** — repo, fondy peňažného trhu, krátkodobé dlhopisy

::data-panel
---
slug: makroekonomika-eurozony
datasetKey: aggregates
component: ChartsMoneyAggregatesChart
---
::

ECB v eurozóne reportuje M3 ako primárny agregát monetárnej politiky. Rast M3 nad ~5 % YoY signalizuje uvoľnenú politiku; pod ~2 % reštriktívnu.

## Kľúčové sadzby ECB + Euribor

::data-panel
---
slug: makroekonomika-eurozony
datasetKey: keyRates
component: ChartsInterestRatesChart
---
::

ECB cez svoje tri kľúčové sadzby (deposit facility, main refinancing operations, marginal lending facility) ovplyvňuje krátky koniec krivky. Euribor 3M je trhová sadzba ktorou banky požičiavajú medzi sebou — sleduje deposit facility s úzkym spreadom.

## Reálne vs nominálne výnosy

10-ročné výnosy slovenských štátnych dlhopisov vs HICP inflácia. Reálny výnos = nominálny − očakávaná inflácia (Fisher rovnica).

::data-panel
---
slug: makroekonomika-eurozony
datasetKey: yields
component: ChartsRealVsNominalChart
propName: nominal
extraKeys:
  inflation: inflation
---
::

Pri zápornom reálnom výnose (sadzby pod infláciou) drží majiteľ dlhopisu reálnu stratu — typické pre roky 2020–2022 v EZ.

## Velocity peňazí — Fisherova rovnica

Klasická Fisherova rovnica: **M · V = P · Y**. Velocity peňazí (V) = nominálne HDP / M3.

::data-panel
---
slug: makroekonomika-eurozony
datasetKey: velocity
component: ChartsVelocityChart
---
::

V eurozóne velocity klesá od 2008 — peniaze sa „točia" pomalšie, čo často indikuje uvoľnenú monetárnu politiku bez priameho prelivu do reálnej ekonomiky. Werner v <a href="/blog/2026-05-01-werner-disaggregated-qtc">disaggregated QTC</a> argumentuje, že to je dôkaz štrukturálneho posunu úveru z produktívnych do asset transakcií.

## Záver

Tieto agregátne ukazovatele sú **kontext** — jednotlivé čísla nehovoria o smerovaní hospodárstva, ale ich vzájomné polohy (M3 rast vs HICP, reálny výnos, velocity) odhaľujú monetárny režim. Pre podrobnejšiu interpretáciu pozri:

- <a href="/blog/2026-05-01-werner-disaggregated-qtc">Werner a Disaggregated QTC</a> — heterodoxný pohľad na M3
- <a href="/blog/2026-05-01-werner-replikacia-var-chow">Werner replikácia VAR/Chow</a> — empirický test úverového kanála na EA20

### Zdroje

ECB Statistical Data Warehouse (BSI, FM datasety) · Eurostat `prc_hicp_aind`, `irt_lt_mcby_a`, `nama_10_gdp` · Frozen snapshot z dátumu publikácie.
