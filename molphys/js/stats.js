/* Статистика: орташа, стандартты ауытқу, Хейк бойынша нормаланған өсім,
   Коэн d, Стьюдент және Уэлч t-критерийлері (екі жақты p-мән) */
export const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
export function sd(a) { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); }

/* Хейк (1998): <g> = (<post> − <pre>) / (100 − <pre>) */
export function hakeG(preMean, postMean) { return (postMean - preMean) / (100 - preMean); }

/* Коэн d, біріктірілген стандартты ауытқу */
export function cohenD(a, b) {
  const na = a.length, nb = b.length; if (na < 2 || nb < 2) return NaN;
  const sp = Math.sqrt(((na - 1) * sd(a) ** 2 + (nb - 1) * sd(b) ** 2) / (na + nb - 2));
  return (mean(a) - mean(b)) / sp;
}
/* Тәуелді таңдамалар үшін d_z (дейін/кейін) */
export function cohenDz(pre, post) { const d = post.map((x, i) => x - pre[i]); return mean(d) / sd(d); }

/* Толымсыз бета-функция (Numerical Recipes, betacf) */
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015;
  for (let j = 0; j < 6; j++) s += c[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function ibeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/* Стьюдент таралуы бойынша екі жақты p-мән */
export function pTwoTailed(t, df) { return ibeta(df / 2, 0.5, df / (df + t * t)); }

/* Тәуелді таңдамалар үшін t-критерий (бір сыныптың дейін/кейін нәтижесі) */
export function pairedT(pre, post) {
  const d = post.map((x, i) => x - pre[i]); const n = d.length; if (n < 2) return { t: NaN, df: NaN, p: NaN };
  const t = mean(d) / (sd(d) / Math.sqrt(n)); return { t, df: n - 1, p: pTwoTailed(t, n - 1) };
}
/* Уэлч t-критерийі (екі тәуелсіз топ) */
export function welchT(a, b) {
  const na = a.length, nb = b.length; if (na < 2 || nb < 2) return { t: NaN, df: NaN, p: NaN };
  const va = sd(a) ** 2 / na, vb = sd(b) ** 2 / nb;
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va * va / (na - 1) + vb * vb / (nb - 1));
  return { t, df, p: pTwoTailed(t, df) };
}
