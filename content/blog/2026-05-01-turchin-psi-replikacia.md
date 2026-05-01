---
title: "Turchin Political Stress Index — replikácia Ages of Discord pre Slovensko"
description: "Cliodynamics + structural-demographic theory aplikovaná na SK. PSI = MMP × EMP × (0.5 + FiscalStress) z Eurostat dát, porovnaná s Turchinovou USA trajektóriou 1780–2020."
date: "2026-05-01"
tags: ["demografia", "Turchin", "cliodynamics", "PSI"]
---

> **Pokračovanie** článku <a href="/blog/2026-05-01-projekcia-do-2100">Slovensko 2024–2100</a>. Tu replikujeme Turchinov *Political Stress Index* (PSI) z *Ages of Discord* (2016) na slovenských dátach a porovnávame s Turchinovou publikovanou USA trajektóriou 1780–2020.

## Kontext — Turchinova predikcia z 2010

Peter Turchin (Linacre College Oxford; spoluzakladateľ *Seshat: Global History Databank*) v *Nature* 463:608 (2010) krátko predpovedal, že **USA dosiahne peak instability v ranných 2020s** na základe 50-ročného cyklu (1870, 1920, 1970, 2020). Indikátory: stagnácia real wages, elite overproduction, fragmentácia inštitúcií, klesajúca dôvera. **Verifikované**: Charlottesville 2017, BLM 2020, Capitol 6.1.2021, polarizácia.

V *Ages of Discord* (2016) rozšíril aparát na kvantitatívny PSI:

```
PSI(t) = MMP(t) × EMP(t) × (0.5 + FiscalStress(t))

MMP — Mass Mobilization Potential = 1 / (real_wage / GDP_per_capita)
      (immiseration: rastie keď mzdy stagnujú vs HDP rast)
EMP — Elite Mobilization Potential = graduates / elite_positions (idx)
      (elite overproduction: priveľa aspirantov vs prestiž pozícií)
FiscalStress = debt/GDP

Cyklická fáza:
  PSI < 0.5     → integratívna (expanzia)
  0.5–0.8       → stagflačná (apogej)
  0.8–1.5       → dezintegratívna (kríza)
  PSI ≥ 1.5     → vrchol krízy
```

## 1. PSI: SK vs USA Turchin trajektória

USA krivka pochádza priamo z *Ages of Discord* Fig. P.1 + Appendix Table A.5. SK krivka je vlastný výpočet podľa identického vzorca z Eurostat dát (`nama_10_a10`, `nama_10_pc`, `prc_hicp_aind`, `educ_uoe_grad02`, `lfsa_egais`, `gov_10dd_edpt1`).

::data-panel
---
slug: turchin-psi-replikacia
datasetKey: turchin
component: ChartsTurchinPsiChart
propName: psi
extraKeys:
  usa: turchin
---
::

> **Pozn.:** komponent prijíma dva sliců z toho istého Turchin bundlu — `psi` pre SK a `usa` pre Turchinovu publikovanú sériu.

## 2. Kde v cykle sa Slovensko nachádza?

::data-panel
---
slug: turchin-psi-replikacia
datasetKey: turchin
component: ChartsCyclePhaseIndicator
propName: psi
---
::

Aktuálna fáza, trend posledných 5 rokov, peak v sérii. SK má štruktúrne **integratívne / early-stagflation** PSI hodnoty — euro-fiskálny rámec stabilizuje SFH, malá populácia obmedzuje elite overproduction, EU pracovná mobilita absorbuje časť napätia (slovenskí PhD odchádzajú do Nemecka / Rakúska / Česka).

## 3. Wealth pump — Gini + S80/S20

Turchin & Hoyer (2021) v *Cliodynamics* 12 ukázali historický threshold: **top-1 % share > 50–60 %** je „pred-revolučná zóna". Tu meriame Gini (0–100, vyššie = väčšia nerovnosť) a S80/S20 ratio.

::data-panel
---
slug: turchin-psi-replikacia
datasetKey: turchin
component: ChartsWealthPumpChart
---
::

## 4. Elite overproduction — absolventi vs ISCO OC1+OC2

Turchin v *Ages of Discord* ch. 5: keď tertiary absolventi rastú rýchlejšie ako počet manažérskych a profesionálnych pozícií, rastie populácia frustrovaných counter-elít — historicky najsilnejší prediktor radikalizácie.

::data-panel
---
slug: turchin-psi-replikacia
datasetKey: turchin
component: ChartsEliteOverproductionChart
---
::

SK proxy: ED5–8 absolventi (`educ_uoe_grad02`) vs ISCO-08 OC1 (Managers) + OC2 (Professionals) z LFS (`lfsa_egais`). Báza 2005 = 100.

## 5. Iné Turchinove predikcie

Pre úplnosť, hlavné body Turchinovho framework-u:

| Mechanizmus | Popis |
|---|---|
| **Wealth pump** | Nerovnosť ↑ → elity získavajú disproporčne → stredná trieda eroduje → counter-elity → instability |
| **Elite overproduction** | Aspirujúcich pozícií rastie nad počet elite-track → konkurencia → political extremism |
| **Population pressure** | Populácia > nosná kapacita → real wages ↓ → social unrest |
| **Asabiya decline** | Spoločenská kohézia (Ibn Khaldun) klesá v starých štátoch |
| **State fiscal stress** | Vojenské výdavky + ústup od daní bohatých → fiškálny tlak → krátkozraké rozhodnutia |

Pre Európu v *End Times* (2023) Turchin predpovedá **peak instability okolo 2030–2035** (~5–10 ročný delay za USA), s migráciou ako amplifier napätia.

## 6. Slabé miesta replikácie

Turchinov framework bol kalibrovaný na **veľké štáty** (USA, Rímska ríša, Capetian France, Romanov Russia). Malé post-socialistické krajiny v EÚ majú iný profil:

- **Fiškálne obmedzenia EÚ** stabilizujú SFH (debt/GDP cap),
- **Eurová mena** obmedzuje monetárne riziká,
- **EU pracovná mobilita** absorbuje časť elite overproduction.

To znižuje Turchinov nominálny PSI, ale presúva napätie inde — emigrácia a brain drain sú samé osebe formy adaptácie, ktoré PSI metrika nezachytáva. Turchin je tiež **kontroverzný** — viacerí historici odmietajú jeho redukcionistický nárok na kvantitatívne zákony spoločenského správania.

### Odporúčaná literatúra

Turchin (2003) *Historical Dynamics: Why States Rise and Fall* Princeton · Turchin & Nefedov (2009) *Secular Cycles* Princeton · Turchin (2010) *Nature* 463:608 · Turchin (2016) *Ages of Discord* Beresta Books · Turchin et al. (2018) *PNAS* 115(2):E144 · Turchin & Hoyer (2021) *Cliodynamics* 12 · Turchin (2023) *End Times* Penguin · Tainter (1988) *The Collapse of Complex Societies* Cambridge.
