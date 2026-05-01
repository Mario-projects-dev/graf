// =============================================================================
// Werner econometrics — replicating NPM (2005) ch. 14 and Princes of the Yen
// (2003) ch. 6 methodology in pure TypeScript.
//
// All routines here are dependency-free and tuned for ≤6 variables × ≤4 lags
// (Werner's disaggregated VAR dimensions). Closed-form Gauss-Jordan inverse and
// manual Cholesky are sufficient at this scale; we avoid pulling in numeric.js.
//
// Sources implemented:
//   • Werner (1997) "Towards a new monetary paradigm: a quantity theorem of
//     disaggregated credit", Kredit und Kapital 30(3):276–309 — eq. system
//   • Werner (2003) Princes of the Yen, M.E. Sharpe, ch. 6 — VAR(4) +
//     orthogonalised IRF + counterfactual via shock cleansing
//   • Werner (2005) New Paradigm in Macroeconomics, Palgrave, ch. 14 —
//     distributed-lag specification (eq. 14.5/14.6) + Granger F-test (p. 208)
//   • Voutsinas & Werner (2011) "Credit supply and corporate capital
//     structure", IRFA 25:54–65 — Granger 4-lag on JP firms
//   • Numerical Recipes (Press et al., 3rd ed.) — F-distribution CDF via
//     regularized incomplete beta
// =============================================================================

export type Vec = number[];
export type Mat = number[][];

// ---------- Vector / matrix primitives ----------
export function vecMean(v: Vec): number {
  let s = 0;
  for (const x of v) s += x;
  return s / v.length;
}
export function vecSub(a: Vec, b: Vec): Vec {
  return a.map((x, i) => x - b[i]);
}
export function matT(A: Mat): Mat {
  const r = A.length;
  const c = A[0].length;
  const O: Mat = Array.from({ length: c }, () => new Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) O[j][i] = A[i][j];
  return O;
}
export function matMul(A: Mat, B: Mat): Mat {
  const r = A.length;
  const c = B[0].length;
  const k = B.length;
  const O: Mat = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
      O[i][j] = s;
    }
  return O;
}
export function matVec(A: Mat, x: Vec): Vec {
  const r = A.length;
  const c = x.length;
  const o = new Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0;
    for (let j = 0; j < c; j++) s += A[i][j] * x[j];
    o[i] = s;
  }
  return o;
}
// Gauss-Jordan inverse with partial pivoting. Returns null if singular.
export function matInv(A: Mat): Mat | null {
  const n = A.length;
  const M: Mat = A.map((row, i) => [
    ...row,
    ...new Array(n).fill(0).map((_, j) => (i === j ? 1 : 0)),
  ]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    if (Math.abs(M[maxRow][i]) < 1e-12) return null;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    const piv = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= piv;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = M[k][i];
      for (let j = 0; j < 2 * n; j++) M[k][j] -= factor * M[i][j];
    }
  }
  return M.map((row) => row.slice(n));
}
// Cholesky decomposition Σ = LL'. Lower-triangular. Returns null if Σ not PD.
export function cholesky(S: Mat): Mat | null {
  const n = S.length;
  const L: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) {
        const v = S[i][i] - s;
        if (v <= 0) return null;
        L[i][j] = Math.sqrt(v);
      } else {
        if (Math.abs(L[j][j]) < 1e-12) return null;
        L[i][j] = (S[i][j] - s) / L[j][j];
      }
    }
  }
  return L;
}

// ---------- F-distribution CDF (Numerical Recipes, §6.4) ----------
function gammaln(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of cof) ser += c / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammaln(a + b) -
      gammaln(a) -
      gammaln(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}
// One-sided p-value for F(d1, d2): P(F ≥ f) under H₀.
export function fPValue(f: number, d1: number, d2: number): number {
  if (!Number.isFinite(f) || f <= 0) return 1;
  return betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}

// ---------- OLS regression ----------
export interface OlsResult {
  coef: Vec; // [intercept, β₁, ..., β_k]
  se: Vec;
  tStat: Vec;
  pValue: Vec; // two-sided
  rss: number;
  tss: number;
  r2: number;
  adjR2: number;
  n: number;
  k: number; // # regressors excluding intercept
  fitted: Vec;
  residuals: Vec;
}
export function ols(X: Mat, y: Vec): OlsResult | null {
  const n = X.length;
  if (n === 0) return null;
  const k = X[0].length - 1;
  const Xt = matT(X);
  const XtX = matMul(Xt, X);
  const inv = matInv(XtX);
  if (!inv) return null;
  const Xty = matVec(Xt, y);
  const beta = matVec(inv, Xty);
  const fitted = matVec(X, beta);
  const residuals = vecSub(y, fitted);
  const rss = residuals.reduce((s, e) => s + e * e, 0);
  const yMean = vecMean(y);
  const tss = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
  const r2 = tss > 0 ? 1 - rss / tss : 0;
  const dof = n - k - 1;
  const sigma2 = dof > 0 ? rss / dof : NaN;
  const adjR2 =
    tss > 0 && dof > 0 ? 1 - rss / dof / (tss / (n - 1)) : 0;
  const seArr = inv.map((row, i) => Math.sqrt(Math.max(0, sigma2 * row[i])));
  const tStat = beta.map((b, i) => (seArr[i] > 0 ? b / seArr[i] : 0));
  const pValue = tStat.map((t) => {
    if (!Number.isFinite(t) || dof <= 0) return 1;
    return fPValue(t * t, 1, dof); // two-sided t² ~ F(1,dof)
  });
  return {
    coef: beta,
    se: seArr,
    tStat,
    pValue,
    rss,
    tss,
    r2,
    adjR2,
    n,
    k,
    fitted,
    residuals,
  };
}

// ---------- Distributed-lag OLS (Werner NPM 2005 eq. 14.5/14.6) ----------
//   Specification: y_t = α + Σᵢ₌₀..L βᵢ x_{t−i} + ε_t
//
// Returns the full OLS result, plus a joint F-test for
// H₀: β₀ = β₁ = ... = β_L = 0 (Werner explicitly tests this on p. 209).
export interface DistributedLagResult {
  ols: OlsResult;
  jointF: number;
  jointPValue: number;
  lags: number;
  cumBeta: number;
  cumBetaSE: number;
}
export function distributedLagOls(
  x: (number | null)[],
  y: (number | null)[],
  lags: number
): DistributedLagResult | null {
  const rows: { yi: number; xs: number[] }[] = [];
  for (let t = lags; t < x.length; t++) {
    const yi = y[t];
    if (yi == null || !Number.isFinite(yi)) continue;
    const xs: number[] = [];
    let ok = true;
    for (let i = 0; i <= lags; i++) {
      const xv = x[t - i];
      if (xv == null || !Number.isFinite(xv)) {
        ok = false;
        break;
      }
      xs.push(xv);
    }
    if (!ok) continue;
    rows.push({ yi, xs });
  }
  if (rows.length < 2 * (lags + 2)) return null;
  const Xu: Mat = rows.map((r) => [1, ...r.xs]);
  const yArr = rows.map((r) => r.yi);
  const u = ols(Xu, yArr);
  if (!u) return null;
  // Restricted: y = α only (TSS = restricted RSS)
  const rssR = u.tss;
  const q = lags + 1;
  const dof = u.n - u.k - 1;
  const f = (rssR - u.rss) / q / (u.rss / dof);
  const p = fPValue(f, q, dof);
  // Long-run multiplier Σ β_i + delta-method SE.
  const Xt = matT(Xu);
  const XtX = matMul(Xt, Xu);
  const inv = matInv(XtX);
  let cumSE = NaN;
  if (inv) {
    const sigma2 = u.rss / dof;
    let varSum = 0;
    for (let i = 1; i <= lags + 1; i++)
      for (let j = 1; j <= lags + 1; j++) varSum += sigma2 * inv[i][j];
    cumSE = Math.sqrt(Math.max(0, varSum));
  }
  const cumBeta = u.coef.slice(1).reduce((s, b) => s + b, 0);
  return { ols: u, jointF: f, jointPValue: p, lags, cumBeta, cumBetaSE: cumSE };
}

// ---------- Granger causality F-test (Werner NPM 2005, p. 208) ----------
// H₀: x does not Granger-cause y.
//   Restricted:   y_t = α + Σᵢ aᵢ y_{t−i}
//   Unrestricted: y_t = α + Σᵢ aᵢ y_{t−i} + Σⱼ bⱼ x_{t−j}
//   F = ((SSR_r − SSR_u) / p) / (SSR_u / (n − 2p − 1))
export interface GrangerResult {
  f: number;
  pValue: number;
  lags: number;
  n: number;
  direction: string;
}
export function grangerCausality(
  x: (number | null)[],
  y: (number | null)[],
  lags: number,
  direction = "x → y"
): GrangerResult | null {
  const rows: { yi: number; ys: number[]; xs: number[] }[] = [];
  for (let t = lags; t < y.length; t++) {
    const yi = y[t];
    if (yi == null || !Number.isFinite(yi)) continue;
    const ys: number[] = [];
    const xs: number[] = [];
    let ok = true;
    for (let i = 1; i <= lags; i++) {
      const yv = y[t - i];
      const xv = x[t - i];
      if (
        yv == null ||
        xv == null ||
        !Number.isFinite(yv) ||
        !Number.isFinite(xv)
      ) {
        ok = false;
        break;
      }
      ys.push(yv);
      xs.push(xv);
    }
    if (!ok) continue;
    rows.push({ yi, ys, xs });
  }
  if (rows.length < 2 * lags + 4) return null;
  const yArr = rows.map((r) => r.yi);
  const Xr: Mat = rows.map((r) => [1, ...r.ys]);
  const Xu: Mat = rows.map((r) => [1, ...r.ys, ...r.xs]);
  const r = ols(Xr, yArr);
  const u = ols(Xu, yArr);
  if (!r || !u) return null;
  const dof = u.n - u.k - 1;
  const f = (r.rss - u.rss) / lags / (u.rss / dof);
  return { f, pValue: fPValue(f, lags, dof), lags, n: rows.length, direction };
}

// ---------- VAR(p) estimation ----------
export interface VarModel {
  K: number;
  p: number;
  T: number;
  coef: Mat; // K × (1 + K·p)
  sigma: Mat;
  chol: Mat;
  resid: Mat; // T × K
  Y: Mat; // full effective Y after dropping initial p (T × K)
  Y0: Mat; // initial p observations (kept for bootstrap/forecast continuity)
}
export function fitVar(Y: Mat, p: number): VarModel | null {
  const Tfull = Y.length;
  const K = Y[0].length;
  if (Tfull <= p + K * p + 2) return null;
  const X: Mat = [];
  const Yt: Mat = [];
  for (let t = p; t < Tfull; t++) {
    const row: number[] = [1];
    let allOk = true;
    for (let l = 1; l <= p; l++) {
      for (let j = 0; j < K; j++) {
        const v = Y[t - l][j];
        if (!Number.isFinite(v)) {
          allOk = false;
          break;
        }
        row.push(v);
      }
      if (!allOk) break;
    }
    if (!allOk) continue;
    const yt = Y[t];
    if (yt.some((v) => !Number.isFinite(v))) continue;
    X.push(row);
    Yt.push(yt);
  }
  const Tu = X.length;
  if (Tu <= K * p + 2) return null;
  const Xt = matT(X);
  const XtX = matMul(Xt, X);
  const inv = matInv(XtX);
  if (!inv) return null;
  const coef: Mat = [];
  const resid: Mat = Array.from({ length: Tu }, () => new Array(K).fill(0));
  const sigma: Mat = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let i = 0; i < K; i++) {
    const yArr = Yt.map((row) => row[i]);
    const Xty = matVec(Xt, yArr);
    const beta = matVec(inv, Xty);
    coef.push(beta);
    const fitted = matVec(X, beta);
    for (let t = 0; t < Tu; t++) resid[t][i] = yArr[t] - fitted[t];
  }
  const dof = Tu - K * p - 1;
  for (let i = 0; i < K; i++)
    for (let j = 0; j < K; j++) {
      let s = 0;
      for (let t = 0; t < Tu; t++) s += resid[t][i] * resid[t][j];
      sigma[i][j] = s / dof;
    }
  const L = cholesky(sigma);
  if (!L) return null;
  return { K, p, T: Tu, coef, sigma, chol: L, resid, Y: Yt, Y0: Y.slice(0, p) };
}

// ---------- Orthogonal IRF ----------
//   Φ(0) = I; Φ(h) = Σ_l A_l Φ(h−l) for h > 0  (reduced-form Wold MA)
//   Θ(h) = Φ(h) · L                            (orthogonalised)
export function varIrf(model: VarModel, horizon: number): number[][][] {
  const { K, p, coef, chol } = model;
  const A: Mat[] = [];
  for (let l = 0; l < p; l++) {
    const Al: Mat = Array.from({ length: K }, () => new Array(K).fill(0));
    for (let i = 0; i < K; i++)
      for (let j = 0; j < K; j++) Al[i][j] = coef[i][1 + l * K + j];
    A.push(Al);
  }
  const Phi: Mat[] = [];
  for (let h = 0; h <= horizon; h++) {
    if (h === 0) {
      const I: Mat = Array.from({ length: K }, (_, i) =>
        Array.from({ length: K }, (_, j) => (i === j ? 1 : 0))
      );
      Phi.push(I);
      continue;
    }
    const Ph: Mat = Array.from({ length: K }, () => new Array(K).fill(0));
    for (let l = 1; l <= Math.min(p, h); l++) {
      const prod = matMul(A[l - 1], Phi[h - l]);
      for (let i = 0; i < K; i++)
        for (let j = 0; j < K; j++) Ph[i][j] += prod[i][j];
    }
    Phi.push(Ph);
  }
  const irf: number[][][] = [];
  for (let h = 0; h <= horizon; h++) irf.push(matMul(Phi[h], chol));
  return irf;
}

// ---------- Werner counterfactual via shock cleansing ----------
//   Princes of the Yen (2003) ch. 6.4: identify orthogonalised shocks from
//   reduced-form residuals (u_orth = L^{-1} u), zero out the chosen shock for
//   t ≥ startIdx, then re-multiply by L and propagate forward through the
//   estimated VAR. Other shocks are kept at their historical values.
//
// Returns counterfactual Y^cf with the same row count as model.Y (pre-sample
// rows are kept identical to the actual ones in model.Y0).
export function wernerCounterfactual(
  model: VarModel,
  shockIdx: number,
  startIdx: number
): Mat {
  const { K, p, coef, chol } = model;
  const invL = matInv(chol);
  if (!invL) return model.Y.map((row) => [...row]);
  const Yc: Mat = [
    ...model.Y0.map((r) => [...r]),
    ...model.Y.map((r) => [...r]),
  ];
  for (let t = p; t < Yc.length; t++) {
    const pred = new Array(K).fill(0).map((_, i) => coef[i][0]);
    for (let l = 1; l <= p; l++)
      for (let i = 0; i < K; i++)
        for (let j = 0; j < K; j++)
          pred[i] += coef[i][1 + (l - 1) * K + j] * Yc[t - l][j];
    const uActual = model.resid[t - p];
    const uOrth = matVec(invL, uActual);
    if (t - p >= startIdx) uOrth[shockIdx] = 0;
    const uMod = matVec(chol, uOrth);
    for (let i = 0; i < K; i++) Yc[t][i] = pred[i] + uMod[i];
  }
  return Yc.slice(p);
}

// ---------- Werner hard rule counterfactual ----------
//   Werner NPM (2005) ch. 17 normative prescription: g(C_F)* ≈ 0 (no asset
//   credit creation). Unlike `wernerCounterfactual` which only cleanses
//   orthogonalised shocks (the unpredictable component), this routine fixes
//   the entire growth path of one variable to a chosen target. The other
//   variables keep their historical reduced-form residuals u_i (so all
//   non-credit shocks — productivity, demand, energy — flow through), but
//   they propagate through *modified* lag matrices because the controlled
//   variable's history has been overwritten.
//
//   Caveat (Lucas critique): this is a stronger structural assumption than
//   shock cleansing. The estimated A_l matrices were learned in a regime
//   where banks did issue mortgage credit; under hard control, agents would
//   re-optimise (e.g. funnel asset demand through equity markets) and the
//   true response would differ. The output should be read as the *partial-
//   equilibrium* answer to "what if Δln C_F had literally been the target
//   each quarter?" — useful for ordering of magnitude, not point forecasts.
export function wernerHardRule(
  model: VarModel,
  varIdx: number,
  startIdx: number,
  targetGrowth: number
): Mat {
  const { K, p, coef, resid } = model;
  const Yc: Mat = [
    ...model.Y0.map((r) => [...r]),
    ...model.Y.map((r) => [...r]),
  ];
  for (let t = p; t < Yc.length; t++) {
    const pred = new Array(K).fill(0).map((_, i) => coef[i][0]);
    for (let l = 1; l <= p; l++)
      for (let i = 0; i < K; i++)
        for (let j = 0; j < K; j++)
          pred[i] += coef[i][1 + (l - 1) * K + j] * Yc[t - l][j];
    const uActual = resid[t - p];
    for (let i = 0; i < K; i++) {
      if (i === varIdx && t - p >= startIdx) {
        Yc[t][i] = targetGrowth; // hard control
      } else {
        Yc[t][i] = pred[i] + uActual[i];
      }
    }
  }
  return Yc.slice(p);
}

// ---------- Bootstrap CI for IRF (residual resampling) ----------
export interface IrfBands {
  lower: number[][][];
  upper: number[][][];
  median: number[][][];
}
export function varIrfBootstrap(
  model: VarModel,
  horizon: number,
  iterations: number,
  alpha = 0.05
): IrfBands {
  const { K, p, T, resid, coef } = model;
  const all: number[][][][] = [];
  for (let it = 0; it < iterations; it++) {
    const newResid: Mat = [];
    for (let t = 0; t < T; t++) {
      const idx = Math.floor(Math.random() * T);
      newResid.push([...resid[idx]]);
    }
    const Ystar: Mat = [...model.Y0.map((r) => [...r])];
    for (let t = 0; t < T; t++) {
      const row = new Array(K).fill(0).map((_, i) => coef[i][0]);
      for (let l = 1; l <= p; l++)
        for (let i = 0; i < K; i++)
          for (let j = 0; j < K; j++)
            row[i] += coef[i][1 + (l - 1) * K + j] * Ystar[Ystar.length - l][j];
      for (let i = 0; i < K; i++) row[i] += newResid[t][i];
      Ystar.push(row);
    }
    const m = fitVar(Ystar, p);
    if (!m) continue;
    all.push(varIrf(m, horizon));
  }
  const lower: number[][][] = Array.from({ length: horizon + 1 }, () =>
    Array.from({ length: K }, () => new Array(K).fill(0))
  );
  const upper: number[][][] = Array.from({ length: horizon + 1 }, () =>
    Array.from({ length: K }, () => new Array(K).fill(0))
  );
  const median: number[][][] = Array.from({ length: horizon + 1 }, () =>
    Array.from({ length: K }, () => new Array(K).fill(0))
  );
  if (!all.length) return { lower, upper, median };
  for (let h = 0; h <= horizon; h++)
    for (let i = 0; i < K; i++)
      for (let j = 0; j < K; j++) {
        const arr = all.map((s) => s[h][i][j]).sort((a, b) => a - b);
        const lo = arr[Math.floor((alpha / 2) * arr.length)];
        const hi = arr[Math.min(arr.length - 1, Math.floor((1 - alpha / 2) * arr.length))];
        const md = arr[Math.floor(0.5 * arr.length)];
        lower[h][i][j] = lo;
        upper[h][i][j] = hi;
        median[h][i][j] = md;
      }
  return { lower, upper, median };
}

// ---------- Chow break-point test ----------
//   Specification (single regressor with `lags` lags):
//     y_t = α + Σᵢ₌₀..L βᵢ x_{t−i}
//   At candidate break b: estimate two separate regressions on [0,b) and
//   [b,T) and one pooled. Compare:
//     F = ((SSR_pooled − (SSR_a + SSR_b)) / k) / ((SSR_a + SSR_b) / (n − 2k))
export interface ChowResult {
  breakIdx: number;
  f: number;
  pValue: number;
  ssrPooled: number;
  ssrSplit: number;
}
export function chowBreak(
  x: (number | null)[],
  y: (number | null)[],
  breakIdx: number,
  lags: number
): ChowResult | null {
  function build(start: number, end: number): { X: Mat; y: Vec } | null {
    const rows: { yi: number; xs: number[] }[] = [];
    for (let t = Math.max(start, lags); t < end; t++) {
      const yi = y[t];
      if (yi == null || !Number.isFinite(yi)) continue;
      const xs: number[] = [];
      let ok = true;
      for (let i = 0; i <= lags; i++) {
        const xv = x[t - i];
        if (xv == null || !Number.isFinite(xv)) {
          ok = false;
          break;
        }
        xs.push(xv);
      }
      if (!ok) continue;
      rows.push({ yi, xs });
    }
    if (!rows.length) return null;
    return { X: rows.map((r) => [1, ...r.xs]), y: rows.map((r) => r.yi) };
  }
  const a = build(0, breakIdx);
  const b = build(breakIdx, x.length);
  const all = build(0, x.length);
  if (!a || !b || !all) return null;
  const ra = ols(a.X, a.y);
  const rb = ols(b.X, b.y);
  const r0 = ols(all.X, all.y);
  if (!ra || !rb || !r0) return null;
  const ssrSplit = ra.rss + rb.rss;
  const k = lags + 2; // intercept + lag coefficients
  const n = all.y.length;
  const dof = n - 2 * k;
  if (dof <= 0) return null;
  const f = (r0.rss - ssrSplit) / k / (ssrSplit / dof);
  return {
    breakIdx,
    f,
    pValue: fPValue(f, k, dof),
    ssrPooled: r0.rss,
    ssrSplit,
  };
}
export function rollingChow(
  x: (number | null)[],
  y: (number | null)[],
  lags: number,
  trimFraction = 0.15
): ChowResult[] {
  const n = x.length;
  const start = Math.max(lags + 4, Math.floor(n * trimFraction));
  const end = Math.min(n - lags - 4, Math.floor(n * (1 - trimFraction)));
  const out: ChowResult[] = [];
  for (let b = start; b <= end; b++) {
    const r = chowBreak(x, y, b, lags);
    if (r) out.push(r);
  }
  return out;
}
