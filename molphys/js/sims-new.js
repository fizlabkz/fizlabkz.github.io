/* Жаңа модельдер: агрегаттық күйлер, жылуөткізгіштік, термодинамикалық цикл, жылулық сәулелену */
import { prep, axes, COL, fmt, $ } from "./sims-core.js";

const mono = () => getComputedStyle(document.body).getPropertyValue("--f-mono");

/* =================== 5. АГРЕГАТТЫҚ КҮЙЛЕР (Леннард-Джонс) =================== */
export const TPL_states = {
  stage: `<div class="stage">
    <div class="screen"><span class="tag">Бөлшектер · 2D модель</span><canvas id="stBox" width="640" height="390"></canvas></div>
    <div class="screen"><span class="tag">Бір бөлшекке келетін энергия</span><canvas id="stGraph" width="640" height="170"></canvas></div>
    <div class="legend"><span><i style="background:var(--hot)"></i>орташа кинетикалық энергия (температура)</span><span><i style="background:var(--accent)"></i>өзара әсерлесудің потенциалдық энергиясы</span></div>
  </div>`,
  panel: `<div class="panel">
    <h2>Заттың агрегаттық күйлері</h2>
    <div class="goal"><span class="chip">7 · §21</span><span class="chip">8.3.1.4</span><span class="chip">8.3.1.5</span><span class="chip">10 · §27, §47</span></div>
    <p style="margin:0;font-size:14px;color:var(--muted)">Бөлшектердің өзара тартылуы мен жылулық қозғалысы заттың қатты, сұйық және газ күйлерін қалай анықтайды. Балқу мен булану кезінде энергия қайда жұмсалады.</p>
    <div class="ctrl"><label for="stT">Температура (жылыту / суыту)</label><output id="stTo">0,15</output><input id="stT" type="range" min="0.05" max="2" step="0.01" value="0.15"></div>
    <label class="check"><input type="checkbox" id="stBonds" checked> Көрші бөлшектердің байланысын көрсету</label>
    <div class="btns"><button class="primary" id="stReset">Кристалдан бастау</button><button id="stPause">Тоқтату</button></div>
    <dl class="readout">
      <dt>Күйі (бөлшектердің орналасуы бойынша)</dt><dd id="stPhase">–</dd>
      <dt>Бір бөлшектің орташа көрші саны</dt><dd id="stNb">–</dd>
      <dt>Нақты температура (модельде)</dt><dd id="stTr">–</dd>
    </dl>
    <p class="muted small" style="margin:0">Температура шартты бірлікпен берілген (kT/ε). Шамамен 0,4-тен төмен – кристалл, 0,45–0,9 – сұйық, одан жоғары – газ.</p>
  </div>`
};
export function mountStates() {
  const box = prep($("stBox")), gr = prep($("stGraph"));
  const N = 110, Lx = 36, Ly = 22, rc = 2.5, rc2 = rc * rc, g = 0.05, dt = 0.004, SUB = 12, tau = 0.4;
  const sc = box.W / Lx;
  let T0 = 0.15, paused = false, x, y, vx, vy, ax, ay, pe = 0, histK = [], histU = [], track = [], fc = 0, nbAvg = 0, phase = "–";
  function forces() {
    ax.fill(0); pe = 0;
    for (let i = 0; i < N; i++) ay[i] = -g;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = x[j] - x[i], dy = y[j] - y[i], r2 = dx * dx + dy * dy;
      if (r2 > rc2) continue;
      const r2c = Math.max(r2, 0.64), ir2 = 1 / r2c, ir6 = ir2 * ir2 * ir2;
      const f = 24 * ir2 * ir6 * (2 * ir6 - 1);
      ax[i] -= f * dx; ay[i] -= f * dy; ax[j] += f * dx; ay[j] += f * dy;
      pe += 4 * ir6 * (ir6 - 1);
    }
  }
  function init() {
    x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N); ax = new Float64Array(N); ay = new Float64Array(N);
    const a = 1.12, cols = 11; let k = 0;
    for (let r = 0; k < N; r++) for (let c = 0; c < cols && k < N; c++, k++) {
      x[k] = Lx / 2 - (cols - 1) * a / 2 + c * a + (r % 2 ? a / 2 : 0); y[k] = 0.6 + r * a * 0.866;
      vx[k] = (Math.random() - 0.5) * 0.3; vy[k] = (Math.random() - 0.5) * 0.3;
    }
    forces(); histK = []; histU = []; track = [];
  }
  function kinT() { let s = 0; for (let i = 0; i < N; i++) s += vx[i] * vx[i] + vy[i] * vy[i]; return s / (2 * N); }
  function step() {
    for (let s = 0; s < SUB; s++) {
      for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * ax[i]; vy[i] += 0.5 * dt * ay[i]; x[i] += dt * vx[i]; y[i] += dt * vy[i];
        if (x[i] < 0.5) { x[i] = 0.5; vx[i] = Math.abs(vx[i]); } else if (x[i] > Lx - 0.5) { x[i] = Lx - 0.5; vx[i] = -Math.abs(vx[i]); }
        if (y[i] < 0.5) { y[i] = 0.5; vy[i] = Math.abs(vy[i]); } else if (y[i] > Ly - 0.5) { y[i] = Ly - 0.5; vy[i] = -Math.abs(vy[i]); } }
      forces();
      for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * ax[i]; vy[i] += 0.5 * dt * ay[i]; }
      const Tk = kinT(), lam = Math.sqrt(Math.max(0.8, Math.min(1.25, 1 + dt / tau * (T0 / Math.max(Tk, 1e-4) - 1))));
      for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; }
    }
    histK.push(kinT()); histU.push(pe / N); if (histK.length > 600) { histK.shift(); histU.shift(); }
  }
  let snap = null, snapT = 0, mob = 0;
  function analyse() {
    let nb = 0, iso = 0; const cnt = new Uint8Array(N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = x[j] - x[i], dy = y[j] - y[i]; if (dx * dx + dy * dy < 2.25) { cnt[i]++; cnt[j]++; } }
    for (let i = 0; i < N; i++) { nb += cnt[i]; if (cnt[i] <= 1) iso++; }
    nbAvg = nb / N;
    if (!snap || fc - snapT > 120) {
      if (snap) { let mx = 0, my = 0, n = 0; for (let i = 0; i < N; i++) if (cnt[i] >= 3) { mx += x[i] - snap[0][i]; my += y[i] - snap[1][i]; n++; }
        mx /= n || 1; my /= n || 1; let d = 0;
        for (let i = 0; i < N; i++) if (cnt[i] >= 3) d += Math.hypot(x[i] - snap[0][i] - mx, y[i] - snap[1][i] - my);
        mob = n ? d / n : 9; }
      snap = [Float64Array.from(x), Float64Array.from(y)]; snapT = fc;
    }
    const fg = iso / N;
    if (fg > 0.6) phase = "газ";
    else { phase = (mob < 0.5 ? "қатты (кристалл)" : "сұйық"); if (fg > 0.12) phase += " + бу"; }
  }
  function draw() {
    const { ctx, W, H } = box; ctx.fillStyle = COL["sim-bg"]; ctx.fillRect(0, 0, W, H);
    const X = v => v * sc, Y = v => H - v * sc;
    if ($("stBonds").checked) { ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const dx = x[j] - x[i], dy = y[j] - y[i]; if (dx * dx + dy * dy < 1.69) { ctx.moveTo(X(x[i]), Y(y[i])); ctx.lineTo(X(x[j]), Y(y[j])); } } ctx.stroke(); }
    for (let i = 0; i < N; i++) { const s = Math.hypot(vx[i], vy[i]) / Math.sqrt(2 * Math.max(T0, 0.05));
      ctx.fillStyle = s > 1.3 ? COL.hot : COL.accent; ctx.beginPath(); ctx.arc(X(x[i]), Y(y[i]), 0.46 * sc, 0, Math.PI * 2); ctx.fill(); }
    const G = gr.ctx, L = 46, Tp = 20, Wd = gr.W - L - 14, Ht = gr.H - Tp - 26; G.fillStyle = COL["sim-bg"]; G.fillRect(0, 0, gr.W, gr.H);
    const lo = -3, hi = 2;
    axes(G, L, Tp, Wd, Ht, { min: 0, max: 10, ticks: 5, f: v => fmt(v) }, { min: lo, max: hi, ticks: 5, f: v => fmt(v, 0) }, "t, с", "E/ε");
    const line = (arr, c) => { G.strokeStyle = c; G.lineWidth = 2; G.beginPath(); arr.forEach((v, i) => { const px = L + i / 600 * Wd, py = Tp + Ht - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * Ht; i ? G.lineTo(px, py) : G.moveTo(px, py); }); G.stroke(); };
    line(histK, COL.hot); line(histU, COL.accent);
  }
  $("stT").addEventListener("input", e => { T0 = +e.target.value; $("stTo").textContent = fmt(T0, 2); });
  $("stReset").addEventListener("click", () => { T0 = 0.15; $("stT").value = 0.15; $("stTo").textContent = "0,15"; init(); });
  $("stPause").addEventListener("click", e => { paused = !paused; e.target.textContent = paused ? "Жалғастыру" : "Тоқтату"; });
  init();
  return { frame() { if (!paused) step(); fc++; if (fc % 10 === 0) { analyse(); $("stPhase").textContent = phase; $("stNb").textContent = fmt(nbAvg, 1); $("stTr").textContent = fmt(kinT(), 2); } draw(); } };
}

/* =================== 6. ЖЫЛУӨТКІЗГІШТІК =================== */
const MAT = {
  felt: { n: "Киіз", k: 0.045, rho: 300, c: 1700 },
  foam: { n: "Пенопласт", k: 0.035, rho: 25, c: 1400 },
  wood: { n: "Ағаш (қарағай)", k: 0.15, rho: 500, c: 2300 },
  brick: { n: "Кірпіш", k: 0.7, rho: 1800, c: 880 },
  concrete: { n: "Бетон", k: 1.5, rho: 2300, c: 880 },
  steel: { n: "Болат", k: 50, rho: 7800, c: 460 }
};
const matOpts = sel => Object.entries(MAT).map(([k, m]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${m.n} (λ = ${String(m.k).replace(".", ",")} Вт/(м·К))</option>`).join("");
export const TPL_heat = {
  stage: `<div class="stage">
    <div class="screen"><span class="tag">Қабырғаның қимасы · ішкі жағы ыстық</span><canvas id="htBox" width="640" height="300"></canvas></div>
    <div class="screen"><span class="tag">Сыртқы беттің температурасы, уақыт бойынша</span><canvas id="htGraph" width="640" height="200"></canvas></div>
    <div class="legend"><span><i style="background:var(--accent)"></i>А материалы</span><span><i style="background:var(--hot)"></i>Б материалы</span></div>
  </div>`,
  panel: `<div class="panel">
    <h2>Жылуөткізгіштік</h2>
    <div class="goal"><span class="chip">8.3.2.2</span><span class="chip">8.3.2.3</span><span class="chip">10 · §35</span></div>
    <p style="margin:0;font-size:14px;color:var(--muted)">Екі материалдан жасалған қабырға қатар салыстырылады. Ішкі беті ыстық (мысалы, ыстық суы бар ыдыс), сыртқы беті ауамен салқындайды. Есептеу жылуөткізгіштік теңдеуі бойынша, материалдардың нақты қасиеттерімен жүргізіледі.</p>
    <div><label class="label" for="htA">А материалы</label><select id="htA">${matOpts("felt")}</select></div>
    <div><label class="label" for="htB">Б материалы</label><select id="htB">${matOpts("steel")}</select></div>
    <div class="ctrl"><label for="htD">Қабырғаның қалыңдығы</label><output id="htDo">3 см</output><input id="htD" type="range" min="1" max="20" step="1" value="3"></div>
    <div class="ctrl"><label for="htTi">Ішкі беттің температурасы</label><output id="htTio">80 °C</output><input id="htTi" type="range" min="30" max="100" step="1" value="80"></div>
    <div class="ctrl"><label for="htTa">Сыртқы ауаның температурасы</label><output id="htTao">20 °C</output><input id="htTa" type="range" min="-30" max="25" step="1" value="20"></div>
    <div><label class="label" for="htSp">Уақыт жылдамдығы</label><select id="htSp"><option value="60">1 секундта 1 минут</option><option value="600" selected>1 секундта 10 минут</option><option value="3600">1 секундта 1 сағат</option></select></div>
    <div class="btns"><button class="primary" id="htReset">Қайта бастау</button></div>
    <dl class="readout">
      <dt>Уақыт</dt><dd id="htTime">–</dd>
      <dt style="color:var(--accent)">А: сыртқы бет / жылу ағыны</dt><dd id="htA1">–</dd>
      <dt style="color:var(--hot)">Б: сыртқы бет / жылу ағыны</dt><dd id="htB1">–</dd>
    </dl>
  </div>`
};
export function mountHeat() {
  const box = prep($("htBox")), gr = prep($("htGraph"));
  const M = 60, h = 10;
  let d = 0.03, Ti = 80, Ta = 20, speed = 600, t = 0, slabs, hist;
  function mk(key) { return { m: MAT[key], T: new Float64Array(M).fill(Ta), hist: [] }; }
  function reset() { slabs = [mk($("htA").value), mk($("htB").value)]; t = 0; }
  function solve(s, dts) {
    const { k, rho, c } = s.m, a = k / (rho * c), dx = d / (M - 1), r = a * dts / (dx * dx);
    const A = new Float64Array(M), B = new Float64Array(M), C = new Float64Array(M), D = new Float64Array(M);
    B[0] = 1; D[0] = Ti;
    for (let i = 1; i < M - 1; i++) { A[i] = -r; B[i] = 1 + 2 * r; C[i] = -r; D[i] = s.T[i]; }
    const Bi = h * dx / k; // сыртқы шекара: жартылай ұяшық
    A[M - 1] = -2 * r; B[M - 1] = 1 + 2 * r + 2 * r * Bi; D[M - 1] = s.T[M - 1] + 2 * r * Bi * Ta;
    for (let i = 1; i < M; i++) { const w = A[i] / B[i - 1]; B[i] -= w * C[i - 1]; D[i] -= w * D[i - 1]; }
    s.T[M - 1] = D[M - 1] / B[M - 1];
    for (let i = M - 2; i >= 0; i--) s.T[i] = (D[i] - C[i] * s.T[i + 1]) / B[i];
  }
  const flux = s => h * (s.T[M - 1] - Ta);
  const steady = s => (Ti - Ta) / (d / s.m.k + 1 / h);
  function color(T) {
    const lo = Math.min(Ta, 0), u = Math.max(0, Math.min(1, (T - lo) / (100 - lo)));
    const r = Math.round(40 + 215 * u), g = Math.round(90 + 110 * Math.sin(u * Math.PI) - 40 * u), b = Math.round(200 * (1 - u) + 30);
    return `rgb(${r},${g},${b})`;
  }
  function step() {
    const simDt = speed / 60, n = 4;
    for (const s of slabs) { for (let i = 0; i < n; i++) solve(s, simDt / n); if (fcount % 3 === 0) { s.hist.push(s.T[M - 1]); if (s.hist.length > 1200) s.hist.shift(); } }
    t += simDt;
  }
  let fcount = 0;
  function tfmt(s) { return s < 3600 ? fmt(s / 60, 0) + " мин" : fmt(s / 3600, 1) + " сағ"; }
  function draw() {
    const { ctx, W, H } = box; ctx.fillStyle = COL["sim-bg"]; ctx.fillRect(0, 0, W, H);
    const L = 110, R = W - 30, top = 52, bh = 86, gap = 38, cw = (R - L) / M;
    ctx.font = "600 12px " + mono(); ctx.textBaseline = "middle";
    slabs.forEach((s, si) => {
      const y0 = top + si * (bh + gap);
      ctx.fillStyle = COL.hot; ctx.fillRect(L - 14, y0, 10, bh);
      for (let i = 0; i < M; i++) { ctx.fillStyle = color(s.T[i]); ctx.fillRect(L + i * cw, y0, cw + 0.6, bh); }
      ctx.strokeStyle = si ? COL.hot : COL.accent; ctx.lineWidth = 2; ctx.strokeRect(L, y0, R - L, bh);
      ctx.fillStyle = COL.ink; ctx.textAlign = "right"; ctx.fillText((si ? "Б: " : "А: ") + s.m.n, L - 20, y0 + bh / 2 - 8);
      ctx.fillStyle = COL.muted; ctx.font = "11px " + mono(); ctx.fillText(fmt(s.T[M - 1], 1) + " °C", L - 20, y0 + bh / 2 + 10); ctx.font = "600 12px " + mono();
      // температура профилі
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < M; i++) { const px = L + (i + 0.5) * cw, py = y0 + bh - 6 - (s.T[i] - Math.min(Ta, 0)) / (100 - Math.min(Ta, 0)) * (bh - 12); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    });
    ctx.fillStyle = COL.muted; ctx.textAlign = "left"; ctx.font = "11px " + mono();
    ctx.fillText("ішкі жағы " + Ti + " °C", L - 14, 36); ctx.textAlign = "right"; ctx.fillText("сыртқы ауа " + Ta + " °C", R, 36);
    ctx.textAlign = "center"; ctx.fillText("қалыңдығы " + fmt(d * 100, 0) + " см", (L + R) / 2, H - 14);
    const G = gr.ctx, Lg = 46, Tp = 20, Wd = gr.W - Lg - 14, Ht = gr.H - Tp - 26; G.fillStyle = COL["sim-bg"]; G.fillRect(0, 0, gr.W, gr.H);
    const tmax = 1200 * 3 * speed / 60, lo = Math.floor(Math.min(Ta, 0) / 10) * 10, hi = 100;
    axes(G, Lg, Tp, Wd, Ht, { min: 0, max: tmax, ticks: 4, f: v => tfmt(v) }, { min: lo, max: hi, ticks: 4, f: v => fmt(v) }, "t", "T, °C");
    slabs.forEach((s, si) => { G.strokeStyle = si ? COL.hot : COL.accent; G.lineWidth = 2; G.beginPath();
      s.hist.forEach((v, i) => { const px = Lg + i / 1200 * Wd, py = Tp + Ht - (v - lo) / (hi - lo) * Ht; i ? G.lineTo(px, py) : G.moveTo(px, py); }); G.stroke(); });
  }
  const upd = () => { $("htDo").textContent = fmt(d * 100) + " см"; $("htTio").textContent = Ti + " °C"; $("htTao").textContent = Ta + " °C"; };
  $("htD").addEventListener("input", e => { d = +e.target.value / 100; upd(); reset(); });
  $("htTi").addEventListener("input", e => { Ti = +e.target.value; upd(); });
  $("htTa").addEventListener("input", e => { Ta = +e.target.value; upd(); });
  $("htSp").addEventListener("change", e => { speed = +e.target.value; reset(); });
  ["htA", "htB"].forEach(id => $(id).addEventListener("change", reset));
  $("htReset").addEventListener("click", reset);
  reset();
  return { frame() { step(); fcount++; draw(); if (fcount % 6 === 0) {
    $("htTime").textContent = tfmt(t);
    const s0 = slabs[0], s1 = slabs[1];
    $("htA1").textContent = fmt(s0.T[M - 1], 1) + " °C / " + fmt(flux(s0), 0) + " Вт/м²";
    $("htB1").textContent = fmt(s1.T[M - 1], 1) + " °C / " + fmt(flux(s1), 0) + " Вт/м²";
  } } };
}

/* =================== 7. ТЕРМОДИНАМИКАЛЫҚ ЦИКЛ =================== */
export const TPL_cycle = {
  stage: `<div class="stage">
    <div class="screen"><span class="tag">p–V диаграммасы · 1 моль бір атомды идеал газ</span><canvas id="cyGraph" width="640" height="400"></canvas></div>
    <div class="panel" style="padding:12px 14px">
      <span class="label">Цикл процестері</span>
      <div class="tablewrap"><table id="cyTable"><thead><tr><th class="l">Процесс</th><th>A, Дж</th><th>Q, Дж</th><th>ΔU, Дж</th></tr></thead><tbody></tbody></table></div>
    </div>
  </div>`,
  panel: `<div class="panel">
    <h2>Термодинамикалық цикл және ПӘК</h2>
    <div class="goal"><span class="chip">10 · §34–§40</span></div>
    <p style="margin:0;font-size:14px;color:var(--muted)">Газдың жұмысы p–V диаграммасындағы аудан ретінде. Термодинамиканың бірінші заңы Q = ΔU + A әр процеске қолданылады.</p>
    <div><label class="label" for="cyType">Цикл</label><select id="cyType"><option value="rect">2 изохора және 2 изобара</option><option value="carnot">Карно циклі</option></select></div>
    <div id="cyRect">
      <div class="ctrl"><label for="cyV1">V₁</label><output id="cyV1o"></output><input id="cyV1" type="range" min="5" max="20" step="1" value="10"></div>
      <div class="ctrl"><label for="cyV2">V₂</label><output id="cyV2o"></output><input id="cyV2" type="range" min="10" max="40" step="1" value="25"></div>
      <div class="ctrl"><label for="cyP1">p₁</label><output id="cyP1o"></output><input id="cyP1" type="range" min="50" max="200" step="10" value="100"></div>
      <div class="ctrl"><label for="cyP2">p₂</label><output id="cyP2o"></output><input id="cyP2" type="range" min="100" max="400" step="10" value="250"></div>
    </div>
    <div id="cyCarnot" hidden>
      <div class="ctrl"><label for="cyT1">Қыздырғыштың температурасы T₁</label><output id="cyT1o"></output><input id="cyT1" type="range" min="350" max="1000" step="10" value="600"></div>
      <div class="ctrl"><label for="cyT2">Суытқыштың температурасы T₂</label><output id="cyT2o"></output><input id="cyT2" type="range" min="250" max="600" step="10" value="300"></div>
      <div class="ctrl"><label for="cyK">Изотермиялық ұлғаю, V₂/V₁</label><output id="cyKo"></output><input id="cyK" type="range" min="1.2" max="4" step="0.1" value="2"></div>
    </div>
    <dl class="readout">
      <dt>Цикл ішіндегі толық жұмыс</dt><dd id="cyA">–</dd>
      <dt>Қыздырғыштан алынған жылу</dt><dd id="cyQ">–</dd>
      <dt>Циклдің ПӘК-і, η = A/Q₁</dt><dd id="cyEta">–</dd>
      <dt>Сол температуралардағы Карно ПӘК-і</dt><dd id="cyEtaC">–</dd>
    </dl>
  </div>`
};
export function mountCycle() {
  const gr = prep($("cyGraph"));
  const R = 8.314, g = 5 / 3;
  let type = "rect", segs = [], path = [], u = 0;
  function build() {
    segs = [];
    if (type === "rect") {
      const V1 = +$("cyV1").value, V2 = Math.max(+$("cyV2").value, V1 + 2), p1 = +$("cyP1").value, p2 = Math.max(+$("cyP2").value, p1 + 20);
      $("cyV1o").textContent = V1 + " л"; $("cyV2o").textContent = V2 + " л"; $("cyP1o").textContent = p1 + " кПа"; $("cyP2o").textContent = p2 + " кПа";
      const line = (a, b) => Array.from({ length: 41 }, (_, i) => [a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40]);
      segs.push({ n: "1→2 изохоралық қыздыру", pts: line([V1, p1], [V1, p2]), A: 0, dU: 1.5 * (p2 - p1) * V1 });
      segs.push({ n: "2→3 изобаралық ұлғаю", pts: line([V1, p2], [V2, p2]), A: p2 * (V2 - V1), dU: 1.5 * p2 * (V2 - V1) });
      segs.push({ n: "3→4 изохоралық суыту", pts: line([V2, p2], [V2, p1]), A: 0, dU: 1.5 * (p1 - p2) * V2 });
      segs.push({ n: "4→1 изобаралық сығу", pts: line([V2, p1], [V1, p1]), A: p1 * (V1 - V2), dU: 1.5 * p1 * (V1 - V2) });
    } else {
      const T1 = +$("cyT1").value, T2 = Math.min(+$("cyT2").value, T1 - 20), k = +$("cyK").value, V1 = 5, V2 = V1 * k;
      const f = Math.pow(T1 / T2, 1 / (g - 1)), V3 = V2 * f, V4 = V1 * f;
      $("cyT1o").textContent = T1 + " К"; $("cyT2o").textContent = T2 + " К"; $("cyKo").textContent = fmt(k, 1);
      const iso = (T, a, b) => Array.from({ length: 41 }, (_, i) => { const V = a + (b - a) * i / 40; return [V, R * T / V]; });
      const adi = (Va, Ta, Vb) => { const C = R * Ta / Va * Math.pow(Va, g); return Array.from({ length: 41 }, (_, i) => { const V = Va + (Vb - Va) * i / 40; return [V, C / Math.pow(V, g)]; }); };
      segs.push({ n: "1→2 изотермиялық ұлғаю (T₁)", pts: iso(T1, V1, V2), A: R * T1 * Math.log(V2 / V1), dU: 0 });
      segs.push({ n: "2→3 адиабаталық ұлғаю", pts: adi(V2, T1, V3), A: 1.5 * R * (T1 - T2), dU: 1.5 * R * (T2 - T1) });
      segs.push({ n: "3→4 изотермиялық сығу (T₂)", pts: iso(T2, V3, V4), A: R * T2 * Math.log(V4 / V3), dU: 0 });
      segs.push({ n: "4→1 адиабаталық сығу", pts: adi(V4, T2, V1), A: -1.5 * R * (T1 - T2), dU: 1.5 * R * (T1 - T2) });
    }
    segs.forEach(s => s.Q = s.A + s.dU);
    path = segs.flatMap(s => s.pts);
    const A = segs.reduce((a, s) => a + s.A, 0), Q1 = segs.reduce((a, s) => a + Math.max(0, s.Q), 0);
    const Ts = path.map(([V, p]) => p * V / R), Tmax = Math.max(...Ts), Tmin = Math.min(...Ts);
    $("cyA").textContent = fmt(A, 0) + " Дж"; $("cyQ").textContent = fmt(Q1, 0) + " Дж";
    $("cyEta").textContent = fmt(100 * A / Q1, 1) + " %"; $("cyEtaC").textContent = fmt(100 * (1 - Tmin / Tmax), 1) + " %";
    $("cyTable").querySelector("tbody").innerHTML = segs.map(s => `<tr><td class="l">${s.n}</td><td>${fmt(s.A, 0)}</td><td>${fmt(s.Q, 0)}</td><td>${fmt(s.dU, 0)}</td></tr>`).join("") +
      `<tr><td class="l"><b>Цикл бойынша</b></td><td><b>${fmt(A, 0)}</b></td><td><b>${fmt(segs.reduce((a, s) => a + s.Q, 0), 0)}</b></td><td><b>0</b></td></tr>`;
  }
  function draw() {
    const { ctx, W, H } = gr; ctx.fillStyle = COL["sim-bg"]; ctx.fillRect(0, 0, W, H);
    const L = 56, Tp = 24, Wd = W - L - 20, Ht = H - Tp - 34;
    const Vmax = Math.ceil(Math.max(...path.map(q => q[0])) * 1.15 / 5) * 5, pmax = Math.ceil(Math.max(...path.map(q => q[1])) * 1.15 / 50) * 50;
    axes(ctx, L, Tp, Wd, Ht, { min: 0, max: Vmax, ticks: 5, f: v => fmt(v) }, { min: 0, max: pmax, ticks: 5, f: v => fmt(v) }, "V, л", "p, кПа");
    const X = v => L + v / Vmax * Wd, Y = p => Tp + Ht - p / pmax * Ht;
    ctx.beginPath(); path.forEach(([v, p], i) => i ? ctx.lineTo(X(v), Y(p)) : ctx.moveTo(X(v), Y(p))); ctx.closePath();
    ctx.fillStyle = COL["accent-soft"]; ctx.fill();
    segs.forEach(s => { const heat = s.Q > 1e-6; ctx.strokeStyle = heat ? COL.hot : COL.cold; ctx.lineWidth = 2.5; ctx.beginPath();
      s.pts.forEach(([v, p], i) => i ? ctx.lineTo(X(v), Y(p)) : ctx.moveTo(X(v), Y(p))); ctx.stroke();
      const m = s.pts[20], m2 = s.pts[22]; const an = Math.atan2(Y(m2[1]) - Y(m[1]), X(m2[0]) - X(m[0]));
      ctx.save(); ctx.translate(X(m[0]), Y(m[1])); ctx.rotate(an); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.fill(); ctx.restore(); });
    ctx.font = "600 12px " + mono(); ctx.fillStyle = COL.ink; ctx.textAlign = "left";
    segs.forEach((s, i) => { const [v, p] = s.pts[0]; ctx.fillText(String(i + 1), X(v) + 6, Y(p) - 6); });
    u = (u + 0.0025) % 1; const k = Math.floor(u * path.length), [pv, pp] = path[k];
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(X(pv), Y(pp), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.muted; ctx.font = "11px " + mono(); ctx.textAlign = "right";
    ctx.fillText("қызыл – газ жылу алады, көк – жылу береді; боялған аудан – цикл жұмысы", W - 20, Tp + 4);
  }
  $("cyType").addEventListener("change", e => { type = e.target.value; $("cyRect").hidden = type !== "rect"; $("cyCarnot").hidden = type !== "carnot"; build(); });
  ["cyV1", "cyV2", "cyP1", "cyP2", "cyT1", "cyT2", "cyK"].forEach(id => $(id).addEventListener("input", build));
  build();
  return { frame: draw };
}

/* =================== 8. ЖЫЛУЛЫҚ СӘУЛЕЛЕНУ =================== */
export const TPL_rad = {
  stage: `<div class="stage">
    <div class="screen"><span class="tag">Абсолют қара дененің сәулелену спектрі</span><canvas id="rdGraph" width="640" height="380"></canvas></div>
    <div class="legend"><span><i style="background:var(--hot)"></i>таңдалған температура</span><span><i style="background:var(--muted)"></i>салыстыру: Күн, 5800 К</span></div>
  </div>`,
  panel: `<div class="panel">
    <h2>Жылулық сәулелену</h2>
    <div class="goal"><span class="chip">11 · §31</span><span class="chip">10 · §29, §35</span></div>
    <p style="margin:0;font-size:14px;color:var(--muted)">Кез келген дене өз температурасына сәйкес сәуле шығарады. Сәулелену жылу берілудің үшінші түрі және молекулалар мен атомдардың жылулық қозғалысымен байланысты.</p>
    <div class="ctrl"><label for="rdT">Дененің температурасы</label><output id="rdTo">310 К</output><input id="rdT" type="range" min="250" max="10000" step="10" value="310"></div>
    <div class="btns">
      <button data-t="310">Адам, 310 К</button><button data-t="900">Плита, 900 К</button><button data-t="2800">Шам қылы, 2800 К</button><button data-t="5800">Күн, 5800 К</button><button data-t="10000">Көк жұлдыз</button>
    </div>
    <label class="check"><input type="checkbox" id="rdNorm" checked> Әр қисықты өз максимумына қалыпқа келтіру</label>
    <dl class="readout">
      <dt>Максимумның толқын ұзындығы (Вин заңы)</dt><dd id="rdL">–</dd>
      <dt>1 м² беттен шығатын қуат (Стефан–Больцман)</dt><dd id="rdP">–</dd>
      <dt>Көрінетін жарықтың үлесі</dt><dd id="rdV">–</dd>
      <dt>Көзге көрінетін түсі</dt><dd><span id="rdC" style="display:inline-block;width:46px;height:16px;border-radius:4px;border:1px solid var(--line);vertical-align:middle"></span> <span id="rdCt"></span></dd>
    </dl>
  </div>`
};
export function mountRadiation() {
  const gr = prep($("rdGraph"));
  const h = 6.626e-34, c = 2.998e8, k = 1.381e-23, sigma = 5.67e-8, b = 2898;
  let T = 310;
  const M = (lum, TT) => { const l = lum * 1e-6; return 2 * Math.PI * h * c * c / Math.pow(l, 5) / (Math.exp(h * c / (l * k * TT)) - 1) * 1e-6; }; // Вт/(м²·мкм)
  function visFrac(TT) { let tot = sigma * TT ** 4, s = 0; for (let l = 0.38; l < 0.78; l += 0.002) s += M(l, TT) * 0.002; return s / tot; }
  function bbColor(TT) {
    if (TT < 800) return null;
    const t = TT / 100; let r, g, bl;
    r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755);
    bl = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
    const cl = v => Math.max(0, Math.min(255, Math.round(v)));
    const dim = Math.min(1, Math.max(0.15, (TT - 800) / 900));
    return `rgb(${cl(r * dim)},${cl(g * dim)},${cl(bl * dim)})`;
  }
  function draw() {
    const { ctx, W, H } = gr; ctx.fillStyle = COL["sim-bg"]; ctx.fillRect(0, 0, W, H);
    const L = 60, Tp = 24, Wd = W - L - 20, Ht = H - Tp - 34;
    const lmax = Math.min(30, Math.max(3, 4 * b / T)), norm = $("rdNorm").checked;
    const peak = TT => M(b / TT, TT);
    const ymax = norm ? 1.1 : peak(T) * 1.15;
    axes(ctx, L, Tp, Wd, Ht, { min: 0, max: lmax, ticks: 6, f: v => fmt(v, lmax < 6 ? 1 : 0) }, { min: 0, max: ymax, ticks: 4, f: v => norm ? fmt(v, 1) : v.toExponential(1) }, "λ, мкм", norm ? "M/Mmax" : "M, Вт/(м²·мкм)");
    const X = l => L + l / lmax * Wd, Y = v => Tp + Ht - Math.min(v, ymax) / ymax * Ht;
    const vis = ctx.createLinearGradient(X(0.38), 0, X(0.78), 0);
    ["#7a00ff", "#0040ff", "#00c8ff", "#00e040", "#ffe000", "#ff7a00", "#ff0000"].forEach((cc, i) => vis.addColorStop(i / 6, cc));
    ctx.globalAlpha = 0.25; ctx.fillStyle = vis; ctx.fillRect(X(0.38), Tp, X(0.78) - X(0.38), Ht); ctx.globalAlpha = 1;
    ctx.fillStyle = COL.muted; ctx.font = "11px " + mono(); ctx.textAlign = "left"; ctx.fillText("көрінетін жарық", X(0.8) + 4, Tp + 12);
    const curve = (TT, col, dash) => { const pk = peak(TT); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(dash); ctx.beginPath();
      for (let i = 1; i <= 400; i++) { const l = lmax * i / 400, v = norm ? M(l, TT) / pk : M(l, TT); i > 1 ? ctx.lineTo(X(l), Y(v)) : ctx.moveTo(X(l), Y(v)); } ctx.stroke(); ctx.setLineDash([]); };
    if (norm && T !== 5800) curve(5800, COL.muted, [5, 4]);
    curve(T, COL.hot, []);
    const lp = b / T; if (lp < lmax) { ctx.strokeStyle = COL.ink; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(X(lp), Tp); ctx.lineTo(X(lp), Tp + Ht); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.ink; ctx.fillText("λmax", X(lp) + 4, Tp + 26); }
  }
  function upd() {
    $("rdTo").textContent = fmt(T) + " К";
    const lp = b / T; $("rdL").textContent = (lp >= 1 ? fmt(lp, 2) + " мкм" : fmt(lp * 1000, 0) + " нм") + (lp > 0.78 ? " (инфрақызыл)" : lp < 0.38 ? " (ультракүлгін)" : " (көрінетін)");
    const P = sigma * T ** 4; $("rdP").textContent = P >= 1e6 ? fmt(P / 1e6, 1) + " МВт" : P >= 1e3 ? fmt(P / 1e3, 1) + " кВт" : fmt(P, 0) + " Вт";
    $("rdV").textContent = fmt(100 * visFrac(T), T < 1500 ? 4 : 1) + " %";
    const col = bbColor(T); const sw = $("rdC"); sw.style.background = col || "transparent"; sw.title = col ? "" : "көрінбейді";
    $("rdCt").textContent = col ? "" : "көрінбейді";
  }
  $("rdT").addEventListener("input", e => { T = +e.target.value; upd(); });
  document.querySelectorAll("[data-t]").forEach(bt => bt.addEventListener("click", () => { T = +bt.dataset.t; $("rdT").value = T; upd(); }));
  upd();
  return { frame: draw };
}
