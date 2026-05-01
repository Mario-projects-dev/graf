---
title: "Werner replikácia: distributed-lag OLS, VAR(4) a Chow break-point scan na EA20"
description: "Replikujeme Werner (2005) NPM ch. 14 a Princes of the Yen ch. 6 metodológiu na eurozónových kvartálnych dátach. Joint F-test, Granger kauzalita oboma smermi, orthogonalised IRF s 95 % bootstrap CI, structural break detection."
date: "2026-05-01"
tags: ["ekonomika", "Werner", "ekonometria", "VAR", "Chow"]
---

> **Kontext:** prvý diel <a href="/blog/2026-05-01-werner-disaggregated-qtc">Werner a Disaggregated Quantity Theory of Credit</a> predstavil teoretický rámec a súbežné korelácie. Tento diel ho replikuje pomocou Wernerovej vlastnej metodológie z *NPM* (2005) ch. 14 a *Princes of the Yen* (2003) ch. 6 — distributed-lag OLS, Granger F-test, VAR(4) s Cholesky identifikáciou, IRF s bootstrap CI, Chow break scan.

## Prečo replikujeme

Súbežné Pearson korelácie z prvého dielu sú užitočné pre vizuálnu intuíciu, ale **Werner sám** v *NPM* (2005) ch. 14 robí iný typ regresie — **distributed-lag OLS so 4 kvartálnymi lagmi** na log-difference dátach a separátne testuje **Granger kauzalitu obomi smermi**. Tento diel implementuje rovnaký aparát na EA20 kvartálnu vzorku (ECB BSI mesačné agregované na Q-end + Eurostat `namq_10_gdp` SCA + `prc_hpi_q` + `prc_hicp_midx`).

## 1. Distributed-lag regresia — Werner NPM 2005, eq. 14.5/14.6

```
H₁:  Δln(P_R · Y)_t = α + Σ_{i=0..4} β_i · Δln(C_R)_{t-i} + ε_t
H₂:  Δln(P_F)_t     = α + Σ_{i=0..4} β_i · Δln(C_F)_{t-i} + ε_t

Joint F-test: H₀: β₀ = β₁ = β₂ = β₃ = β₄ = 0
Granger F-test: H₀: x neGranger-spôsobuje y
```

::data-panel
---
slug: werner-replikacia-var-chow
datasetKey: lagGranger
component: ChartsWernerLagAndGranger
---
::

H₁ kanál (nGDP ← C_R) vyšiel **silne signifikantný** (joint F ≈ 11, p < 0.001), H₂ (HPI ← C_F) **signifikantný** (F ≈ 7). Cross-validácie vyšli **slabé**, ako Werner predpovedá: produktívny úver má slabý vzťah k cenám bytov a hypotekárny úver slabý vzťah k HDP — model sa potvrdzuje.

## 2. VAR(4) + Cholesky IRF + counterfactual

Werner v *Princes of the Yen* (2003) ch. 6.4 robí **identický experiment**: odhadne 4-premenný VAR(4) s Cholesky ordering [C_R, C_F, nGDP, asset price index], identifikuje orthogonálny shock asset úveru a v 1986–1991 ho retroaktívne vynuluje. Tu replikujeme ten istý postup na EZ.

```
Y_t = c + A₁ Y_{t-1} + A₂ Y_{t-2} + A₃ Y_{t-3} + A₄ Y_{t-4} + u_t
Σ_u = L · L'                        (Cholesky)
v_t = L⁻¹ u_t                       (orthogonal shocks)
Counterfactual: v_t[C_F] = 0 for t ≥ t* ; u_t^cf = L · v_t^cf
```

Komponent ponúka **dva režimy**:
- **Shock cleansing** (*Princes* 2003) — vynuluje len orthogonálny shock C_F (predikovateľná zložka prejde)
- **Hard rule** (NPM 2005 ch. 17) — Δln C_F vynútená na cieľ (typicky 0 % q/q)

::data-panel
---
slug: werner-replikacia-var-chow
datasetKey: varModel
component: ChartsWernerVarSimulator
---
::

> ⚠️ **Lucas critique** platí: VAR β-koeficienty sú odhadnuté na historickom režime. Pod alternatívnym režimom (aktívna kvótovaná alokácia úveru) by sa koeficienty samotných agentov mohli zmeniť. Counterfactual je obhájiteľný iba na 4–8 kvartálov; dlhšie horizonty sú len pre úplnosť IRF.

## 3. Chow break-point scan — NPM 2005 p. 213

Werner v *NPM* (2005, p. 213) explicitne testuje **parametrickú konstantnosť** v japonských regresiách cez Chow F-test pri kandidátnych zlomoch (1985 — finančná deregulácia, 1991 — bublina). Tu skenujeme všetky kandidátne kvartály v centrálnej časti EA20 vzorky (trim 15 % per Andrews 1993).

::data-panel
---
slug: werner-replikacia-var-chow
datasetKey: chowH1
component: ChartsWernerChowScan
propName: h1
extraKeys:
  h2: chowH2
---
::

Vrchol −log₁₀(p) označuje miesto najpravdepodobnejšieho štruktúrneho zlomu v koeficientoch. Pre EZ to typicky vychádza okolo 2008 (Lehman) a 2015 (start ECB QE).

## 4. Záver — čo z výpočtov pre laika vyplýva

- **Banky tvoria peniaze** (Werner 2014 experiment) — nie sú sprostredkovatelia.
- **Ekonomika nerastie sama od seba** — H₁ test (joint F ≈ 11, istota > 99 %) hovorí, že úver firmám predikuje rast HDP.
- **Ceny bytov nie sú primárne demografia** — H₂ test ukazuje silnú väzbu na hypotekárny úver.
- **Eurozóna prešla režimovým zlomom** — Chow scan to potvrdzuje, lineárna „extrapolácia ako keby nič" by tu narazila.

### Limity

(1) Lucas critique platí naprieč všetkým — koeficienty odhadnuté v jednom režime sa zmenia, keď sa režim zmení. (2) VAR shock-cleansing v EZ dáva malé čísla, lebo EZ má tichý shock proces; väčšiu zmenu by zachytila len hard-rule simulácia (alebo makroprudenciálne LTV/DTI capy v reálnom svete). (3) Granger nedokazuje kauzalitu, len štatistickú prednosť. Pre čistý kauzálny výrok by bolo treba IV stratégiu (napr. nemecká reunifikácia ako exogénny shock) alebo DSGE.

### Odporúčaná literatúra

Werner (1997) *Kredit und Kapital* 30:276–309 · Werner (2003) *Princes of the Yen* M.E. Sharpe · Werner (2005) *New Paradigm in Macroeconomics* Palgrave · Lyonnet & Werner (2012) *Int. Rev. Fin. Analysis* 25:94–105 · Werner (2014) *Int. Rev. Fin. Analysis* 36:1–19 · Lutkepohl (2005) *New Introduction to Multiple Time Series Analysis* · Granger (1969) *Econometrica* 37:424–438 · Sims (1980) *Econometrica* 48:1–48 · Andrews (1993) *Econometrica* 61:821–856.
