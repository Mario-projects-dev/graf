---
title: "Werner a Disaggregated Quantity Theory of Credit — heterodoxný pohľad na peniaze"
description: "Soddy, Chicago Plan, Cantillon a Wernerova rovnica disaggregovaného úveru. Korelácie produktívneho vs asset úveru s reálnou ekonomikou na EA20 dátach."
date: "2026-05-01"
tags: ["ekonomika", "monetárna teória", "Werner", "heterodoxia"]
---

> **Vzdelávacia stránka, nie politické odporúčanie.** Tento článok prezentuje heterodoxné ekonomické školy, ktoré kritizujú alebo reformujú dnešný fiat / fractional reserve systém. Surové dáta z ECB a Eurostatu sú reálne; teoretické interpretácie nad nimi sú stanoviská týchto škôl.

## Úvod — prečo o tom písať

Mainstream učebnica monetárnej ekonómie tvrdí, že banky sú sprostredkovatelia úspor. Werner (2014) v Raiffeisenbank Wildenberg empiricky doložil, že je to mýtus: pri schválení úveru banka **vytvorí súčasne aktívum aj pasívum účtovne**, bez použitia existujúcich peňazí. Tento článok kombinuje heterodoxné pohľady (Soddy, Chicago Plan, Austrian / Cantillon, MMT) s Wernerovou disaggregated quantity theory of credit a otestuje ju na EA20 dátach.

## 1. Soddy a termodynamický pohľad

Frederick Soddy (Nobel za chémiu, neskôr ekonóm) v *Wealth, Virtual Wealth and Debt* (1926) tvrdil, že peniaze sú nárok na fyzickú reálnu hodnotu, ktorej najprirodzenejším proxy je energia. Pri exponenciálnom raste peňažnej zásoby cez úročenie sa fiat odpojí od termodynamicky obmedzenej ekonomiky a vznikne „virtuálne bohatstvo".

::data-panel
---
slug: werner-disaggregated-qtc
datasetKey: energy
component: ChartsEnergyMoneyChart
---
::

**Kritika:** energia nie je jediná reálna hodnota — práca, intelektuálny kapitál, sieťové efekty produkujú HDP bez priameho energetického ekvivalentu.

## 2. Chicago Plan — banky bez tvorby peňazí

V dnešnom fractional reserve systéme komerčné banky tvoria peniaze: keď udelia úver, vytvoria nové vklady „z ničoho". Chicago Plan (Fisher, Simons 1933; IMF Benes & Kumhof 2012) navrhuje **100 % rezervy**.

::data-panel
---
slug: werner-disaggregated-qtc
datasetKey: multiplier
component: ChartsMonetaryMultiplierChart
---
::

V eurozóne tvorí fyzická hotovosť len ~9 % M3. Chicago Plan by tento pomer zredukoval na 1×.

## 3. Z čoho sa skladá M3?

::data-panel
---
slug: werner-disaggregated-qtc
datasetKey: decomp
component: ChartsM3DecompositionChart
---
::

Štyri vrstvy od najtekutejších k najmenej: hotovosť (L10), vklady na požiadanie, krátkodobé vklady, trhové nástroje. Bezhotovostné platby šetria zdroje a sú bezpečnejšie — debata je o tom, **kto** kreditnú zložku tvorí.

## 4. Werner — Disaggregated QTC

Richard A. Werner (Linacre College Oxford) odvodil rozdelenie kvantitatívnej teórie peňazí podľa cieľa transakcií:

```
Mᴿ · Vᴿ = Pᴿ · Y           — real economy (HDP transakcie)
Mᶠ · Vᶠ = Pᶠ · Qᶠ          — financial economy (asset transakcie)
```

Pri V ≈ const v rastových rýchlostiach:

```
g(Mᴿ) ≈ g(nominálne HDP)         — H₁
g(Mᶠ) ≈ g(ceny aktív, HPI)       — H₂
```

Werner ako empirické proxy používa MFI úvery NFC (Mᴿ) a úvery domácnostiam (Mᶠ, ~85 % hypotéky).

### H₁: Produktívny úver vs nominálne HDP

::data-panel
---
slug: werner-disaggregated-qtc
datasetKey: werner
component: ChartsWernerCorrelationChart
propName: payload
---
::

### Štrukturálny posun stocku úveru

::data-panel
---
slug: werner-disaggregated-qtc
datasetKey: credit
component: ChartsCreditByPurposeChart
---
::

Posun smerom k domácnostiam (kde dominujú hypotéky) je podľa Wernera hlavnou príčinou poklesu rastu produktivity v EZ.

## 5. Cantillon — kto dostane prvý

Cantillon (1755), Mises a Hayek opísali, že **noví príjemcovia novovytvorených peňazí získavajú kúpnu silu skôr** než ostatní. Keď ECB pumpuje nové peniaze cez QE, banky kúpia dlhopisy → aktíva rastú → vlastníci aktív bohatnú prv.

::data-panel
---
slug: werner-disaggregated-qtc
datasetKey: cantillon
component: ChartsCantillonGapChart
---
::

V grafe vidno, ako sa **medzera medzi cenami bytov a mzdami otvára** — ceny aktív (HPI) ujdú výrazne dopredu.

## 6. MMT — prečo Slovensko nie je Japonsko

MMT tvrdí, že vláda s vlastnou menou nemôže technicky zbankrotovať. Kľúčový catch pre Slovensko: **SR nemá vlastnú menu**. V eurozóne sa správa ako americký štát Kalifornia voči Fed-u — má fiškálnu autonómiu, ale nie monetárnu.

## Záver

Heterodoxné školy (Soddy, Austrian, MMT, Sovereign Money) sa od mainstream-u odlišujú v predpokladoch, nie nutne v dátach. Pochopiť, že každé euro v M3 nie je „skutočné ECB euro" a že banky úver vyrábajú účtovne podľa vlastnej priority, je cieľom tohto článku.

**Pokračovanie:** v druhom diele <a href="/blog/2026-05-01-werner-replikacia-var-chow">replikujeme Werner (2005) Disaggregated QTC empiricky</a> — distributed-lag OLS, Granger F-test, VAR(4) s Cholesky IRF, Chow break-point scan na EA20 vzorke.

### Odporúčaná literatúra

Soddy — *Wealth, Virtual Wealth and Debt* (1926) · Fisher — *100% Money* (1935) · Hayek — *Denationalisation of Money* (1976) · Werner — *Princes of the Yen* (2003), *New Paradigm in Macroeconomics* (2005), *Can banks individually create money out of nothing?* (Int. Review of Financial Analysis 36, 2014, pp. 1–19) · Benes & Kumhof — *The Chicago Plan Revisited* (IMF WP 2012) · Kelton — *The Deficit Myth* (2020).
