/* Молекулалық физика зертханасы: бір беттік қолданба (hash маршруттары) */
import { MODELS, MISCONCEPTIONS, TIERS, tierOf, testFor, modelsFor, CURRICULUM, TESTS, BANK } from "./content.js";
import * as S from "./store.js";
import * as ST from "./stats.js";
import { Tutor } from "./ai.js";

const app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n1 = (x, d = 1) => Number.isFinite(x) ? x.toLocaleString("kk-KZ", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–";
const pfmt = p => !Number.isFinite(p) ? "–" : p < 0.001 ? "< 0,001" : n1(p, 3);
const GROUP = { exp: "Эксперименттік", ctrl: "Бақылау" };
let sim = null;

function render(html) { sim = null; app.innerHTML = html; window.scrollTo(0, 0); }
function loop() { if (sim) sim.frame(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

/* ---------------- маршрутизатор ---------------- */
async function route() {
  const parts = (location.hash.replace(/^#\/?/, "") || "home").split("/");
  const navKey = parts[0] === "g" ? "g" + parts[1] : parts[0] === "lab" && parts[2] ? "g" + parts[2] : parts[0];
  document.querySelectorAll("header nav a").forEach(a => a.setAttribute("aria-current", a.dataset.r === navKey ? "page" : "false"));
  try {
    switch (parts[0]) {
      case "models": return viewModels();
      case "g": return viewGrade(parts[1]);
      case "grades": return viewGrade(parts[1]);
      case "lab": return viewLab(parts[1], parts[2]);
      case "student": return viewStudent();
      case "test": return viewTest(parts[1]);
      case "teacher": return viewTeacher(parts[1] || "classes");
      default: return viewHome();
    }
  } catch (e) { console.error(e); render(`<div class="panel"><h2>Қате шықты</h2><p>${esc(e.message)}</p></div>`); }
}
window.addEventListener("hashchange", route);

/* ---------------- басты бет ---------------- */
const GRADES = [7, 8, 9, 10, 11];
const curOf = g => CURRICULUM.find(c => c.grade === +g);
const topicCount = g => (curOf(g)?.chapters || []).reduce((n, ch) => n + ch.items.length, 0);
function viewHome() {
  render(`
  <section class="hero">
    <p class="eyebrow">7–11-сыныптар · Жылу физикасы және молекулалық физика</p>
    <h1>Молекулалық физиканы <span>көзбен көріп</span> үйрену</h1>
    <p class="lede">Әр сыныптың өз бөлімі бар: оқулықтағы тақырыптар, сол тақырыптарға арналған интерактивті модельдер, жұмыс парақтары және диагностикалық тест. Барлығы қазақ тілінде.</p>
    <div class="btns"><a class="btn primary" href="#/student">Оқушы ретінде кіру</a><a class="btn" href="#/teacher">Мұғалім кабинеті</a></div>
  </section>
  <section class="gtiles">${GRADES.map(g => gradeTile(g)).join("")}</section>
  <section class="grid3">
    <div class="panel"><span class="label">1-қадам</span><h2>Бастапқы тест</h2><p>Әр сыныптың өз тесті бар. Әр сұрақ үш бөліктен тұрады: жауап, негіздеме, сенімділік. Тест оқушының қай қате түсінігі бар екенін анықтайды.</p></div>
    <div class="panel"><span class="label">2-қадам</span><h2>Виртуалды зертхана</h2><p>Модельдер оқулық параграфтарына байланған. Әр модельде жұмыс парағы мен ЖИ-көмекші бар.</p></div>
    <div class="panel"><span class="label">3-қадам</span><h2>Қорытынды тест және талдау</h2><p>Мұғалім кабинеті Хейк бойынша нормаланған өсімді, Коэн d әсер мөлшерін, t-критерийді және қате түсініктердің өзгерісін есептейді.</p></div>
  </section>`);
}
function gradeTile(g) {
  const ms = modelsFor(g), tc = topicCount(g);
  return `<a class="gtile" href="#/g/${g}"><span class="gnum">${g}</span><span class="glabel">сынып</span>
    <span class="small muted">${tc ? tc + " тақырып · " : g === 9 ? "8-сыныпты қайталау · " : ""}${ms.length} модель · ${testFor(g).length} сұрақ</span>
    <span class="gmodels">${ms.map(([, m]) => esc(m.title)).join(", ")}</span></a>`;
}
function modelCard(k, m, g) {
  return `<a class="mcard" href="#/lab/${k}${g ? "/" + g : ""}"><span class="label">${esc(m.grade)}</span><strong>${esc(m.title)}</strong>
    <span class="chips">${m.codes.map(c => `<span class="chip">${c}</span>`).join("")}</span>
    <span class="muted small">${m.mis.map(x => esc(MISCONCEPTIONS[x])).join("; ")}</span></a>`;
}
function viewModels() {
  render(`<section class="panel"><h2>Барлық интерактивті модельдер</h2>
    <p class="muted">Әр модель үлгілік бағдарламаның оқу мақсатына және оқушылардың жиі кездесетін қате түсініктеріне сүйенеді.</p>
    <div class="cards">${Object.entries(MODELS).map(([k, m]) => modelCard(k, m)).join("")}</div></section>`);
}

/* ---------------- сынып бөлімі ---------------- */
function viewGrade(g) {
  g = GRADES.includes(+g) ? +g : 7;
  const cur = curOf(g), ms = modelsFor(g), test = testFor(g);
  render(`
  <nav class="subnav gradenav">${GRADES.map(x => `<a href="#/g/${x}" aria-current="${x === g ? "page" : "false"}">${x}-сынып</a>`).join("")}</nav>
  <section class="ghero">
    <div class="gbig">${g}<span>-сынып</span></div>
    <div><p class="eyebrow">Молекулалық физика бөлімі</p>
      <p class="lede" style="margin:4px 0 0">${esc(cur.book)}</p>
      <div class="gstats"><span><b>${topicCount(g)}</b> тақырып</span><span><b>${ms.length}</b> модель</span><span><b>${test.length}</b> тест сұрағы</span></div></div>
  </section>
  ${cur.note ? `<p class="note">${esc(cur.note)}</p>` : ""}
  ${cur.chapters.length ? `<section class="panel"><h2>Тараулар мен тақырыптар</h2>
    ${cur.chapters.map(ch => `<div class="chap"><h3>${esc(ch.ch)}</h3><ul class="topics">${ch.items.map(([t, mk]) => `<li><span>${esc(t)}</span><span class="tlinks">${mk.map(k => `<a class="pill" href="#/lab/${k}/${g}">${esc(MODELS[k].title)}</a>`).join("")}</span></li>`).join("")}</ul></div>`).join("")}
  </section>` : ""}
  <section class="panel"><h2>${g}-сыныпқа арналған модельдер</h2>
    <div class="cards">${ms.map(([k, m]) => modelCard(k, m, g)).join("")}</div></section>
  <section class="panel">
    <div class="row between flexwrap"><h2>${g}-сыныптың диагностикалық тесті</h2><a class="btn primary" href="#/student">Тестті тапсыру</a></div>
    <p class="muted small">Бастапқы және қорытынды тестте бірдей сұрақтар беріледі. Әр жалған нұсқа белгілі бір қате түсінікке сәйкес келеді. Мұғалім кабинетінде сыныпты «${g}» деп ашқанда оқушыларға осы тест пен осы модельдер ашылады.</p>
    <ol class="tlist">${test.map(q => `<li><strong>${esc(q.text)}</strong> <span class="muted small">(${esc(q.topic)}${[...new Set(q.opts.map(o => o[1]).filter(t => MISCONCEPTIONS[t]))].length ? "; қате түсініктер: " + [...new Set(q.opts.map(o => o[1]).filter(t => MISCONCEPTIONS[t]))].join(", ") : ""})</span></li>`).join("")}</ol>
  </section>`);
}

/* ---------------- зертхана ---------------- */
async function viewLab(key, g) {
  const m = MODELS[key]; if (!m) return viewModels();
  const s = S.getSession();
  const mine = s ? (await S.myRecords("worksheets")).filter(w => w.model === key).sort((a, b) => (b.createdAt?.seconds || b.createdAt || 0) - (a.createdAt?.seconds || a.createdAt || 0))[0] : null;
  render(`
  <p class="crumbs">${g ? `<a href="#/g/${esc(g)}">${esc(g)}-сынып</a>` : `<a href="#/models">Модельдер</a>`} / ${esc(m.title)}</p>
  <div class="lab">
    ${m.tpl.stage}
    <div class="side">
      ${m.tpl.panel}
      <div class="panel">
        <div class="mis"><b>Тексерілетін қате түсініктер</b>${m.mis.map(x => esc(MISCONCEPTIONS[x])).join("; ")}.</div>
        <span class="label">Жұмыс парағы: болжа – бақыла – түсіндір</span>
        <form id="ws" class="ws">
          ${["Болжа", "Бақыла", "Түсіндір"].map((t, i) => `
            <label for="ws${i}"><strong>${i + 1}. ${t}.</strong> ${esc(m.poe[i])}</label>
            <textarea id="ws${i}" rows="3" ${s ? "" : "disabled"}>${esc(mine?.answers?.[i] || "")}</textarea>`).join("")}
          ${s ? `<button class="primary" type="submit">Жұмыс парағын сақтау</button><span id="wsMsg" class="muted small" role="status"></span>`
              : `<p class="muted small">Жауапты сақтау үшін <a href="#/student">сыныпқа кіріңіз</a>.</p>`}
        </form>
      </div>
      <div class="panel">
        <span class="label">ЖИ-көмекші</span>
        <p class="muted small" style="margin:0">Модель туралы сұрақ қойыңыз. Көмекші дайын жауап бермейді, ойлануға бағыт береді.</p>
        <div id="chat" class="chat" aria-live="polite"></div>
        <form id="ask" class="ask"><input id="q" autocomplete="off" placeholder="Мысалы: неге бөлшектің жылдамдығы өзгеріп тұр?" aria-label="Сұрақ"><button class="primary" type="submit">Сұрау</button></form>
      </div>
    </div>
  </div>`);
  sim = m.mount();
  const tutor = new Tutor(key, m);
  const chat = document.getElementById("chat");
  const add = (who, text) => { const d = document.createElement("div"); d.className = "msg " + who; d.textContent = text; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d; };
  document.getElementById("ask").addEventListener("submit", async e => {
    e.preventDefault(); const q = document.getElementById("q"); const text = q.value.trim(); if (!text) return;
    q.value = ""; add("me", text); const w = add("ai", "Ойланып жатыр…");
    try { w.textContent = await tutor.ask(text); } catch (err) { console.error(err); w.textContent = "Көмекшіге қосылу мүмкін болмады. Интернет байланысын тексеріп, қайталап көріңіз."; }
  });
  const ws = document.getElementById("ws");
  if (s) ws.addEventListener("submit", async e => {
    e.preventDefault(); const msg = document.getElementById("wsMsg");
    const answers = [0, 1, 2].map(i => document.getElementById("ws" + i).value.trim());
    if (answers.every(a => !a)) { msg.textContent = "Кемінде бір жауап жазыңыз."; return; }
    msg.textContent = "Сақталуда…";
    try { await S.saveWorksheet({ model: key, answers }); msg.textContent = "Сақталды."; } catch (err) { console.error(err); msg.textContent = "Сақталмады: " + err.message; }
  });
}

/* ---------------- оқушы ---------------- */
async function viewStudent() {
  const s = S.getSession();
  if (!s) {
    render(`<section class="panel narrow">
      <h2>Сыныпқа кіру</h2>
      <p class="muted">Сынып кодын мұғалім береді. Аты-жөніңіз сақталмайды, тек журналдағы нөміріңіз жазылады.</p>
      <form id="join" class="form">
        <label for="code">Сынып коды</label><input id="code" required maxlength="8" autocomplete="off" style="text-transform:uppercase" placeholder="Мысалы: K7M2QX">
        <label for="no">Журналдағы нөміріңіз</label><input id="no" type="number" min="1" max="60" required>
        <button class="primary" type="submit">Кіру</button><p id="jmsg" class="err" role="alert"></p>
      </form>
      ${S.isDemo ? `<p class="muted small">Демо режим: мұғалім кабинетінде сынып ашып, оның кодын осында енгізіңіз.</p>` : ""}
    </section>`);
    document.getElementById("join").addEventListener("submit", async e => {
      e.preventDefault(); const m = document.getElementById("jmsg"); m.textContent = "";
      try { await S.joinClass(document.getElementById("code").value, document.getElementById("no").value); route(); } catch (err) { m.textContent = err.message; }
    });
    return;
  }
  const [res, wss] = await Promise.all([S.myRecords("results"), S.myRecords("worksheets")]);
  const pre = res.find(r => r.type === "pre"), post = res.find(r => r.type === "post");
  const mine = modelsFor(s.grade), done = new Set(wss.map(w => w.model).filter(k => mine.some(([m]) => m === k)));
  const exp = s.group !== "ctrl";
  render(`<section class="panel">
    <div class="row between"><div><span class="label">${esc(s.className)} · №${esc(s.studentNo)}</span><h2>Менің жұмысым</h2></div><button id="out">Шығу</button></div>
    <ol class="steps">
      <li class="${pre ? "done" : ""}"><div><strong>Бастапқы тест</strong><span class="muted small">${pre ? `Тапсырылды: ${pre.score}%` : "Тақырыпты оқымас бұрын тапсырылады"}</span></div>${pre ? `<span class="pill ok">Дайын</span>` : `<a class="btn primary" href="#/test/pre">Бастау</a>`}</li>
      ${exp ? `<li class="${done.size === mine.length ? "done" : ""}"><div><strong>Виртуалды зертхана · ${esc(s.grade)}-сынып</strong><span class="muted small">Жұмыс парағы толтырылған модельдер: ${done.size} / ${mine.length}</span>
        <div class="cards tight">${mine.map(([k, m]) => `<a class="mcard sm" href="#/lab/${k}/${esc(s.grade)}"><strong>${esc(m.title)}</strong><span class="pill ${done.has(k) ? "ok" : ""}">${done.has(k) ? "Толтырылды" : "Ашу"}</span></a>`).join("")}</div></div></li>`
      : `<li><div><strong>Сабақтар</strong><span class="muted small">Сіздің сыныбыңыз тақырыпты әдеттегі сабақтарда оқиды.</span></div></li>`}
      <li class="${post ? "done" : ""}"><div><strong>Қорытынды тест</strong><span class="muted small">${post ? `Тапсырылды: ${post.score}%` : "Мұғалім рұқсат бергенде, тақырып аяқталған соң тапсырылады"}</span></div>${post ? `<span class="pill ok">Дайын</span>` : pre ? `<a class="btn primary" href="#/test/post">Бастау</a>` : `<span class="pill">Алдымен бастапқы тест</span>`}</li>
    </ol>
  </section>`);
  document.getElementById("out").addEventListener("click", async () => { await S.leaveClass(); route(); });
}

/* ---------------- тест ---------------- */
async function viewTest(phase) {
  if (phase !== "pre" && phase !== "post") return viewStudent();
  const s = S.getSession(); if (!s) { location.hash = "#/student"; return; }
  const res = await S.myRecords("results");
  if (res.find(r => r.type === phase)) { location.hash = "#/student"; return; }
  const TEST = testFor(s.grade);
  render(`<section class="panel narrow">
    <span class="label">${esc(s.grade)}-сынып · ${phase === "pre" ? "Бастапқы тест" : "Қорытынды тест"} · ${TEST.length} сұрақ</span>
    <h2>Молекулалық физика: диагностикалық тест</h2>
    <p class="muted">Әр сұраққа: 1) бір жауапты таңдаңыз, 2) неге солай ойлайтыныңызды қысқаша жазыңыз, 3) жауабыңызға сенімді ме екеніңізді белгілеңіз. Бұл баға емес, мұғалімге сіздің түсінігіңізді көрсетеді.</p>
  </section>
  <form id="test" class="testform">
    ${TEST.map((q, i) => `
    <fieldset class="panel q" id="f_${q.id}">
      <legend><span class="qn">${i + 1}</span> ${esc(q.text)}</legend>
      <div class="opts">${q.opts.map((o, j) => `<label class="opt"><input type="radio" name="${q.id}" value="${j}"> <span>${"АӘБВ"[j]}) ${esc(o[0])}</span></label>`).join("")}</div>
      <label for="r_${q.id}" class="small muted">Жауабыңызды негіздеңіз</label>
      <textarea id="r_${q.id}" rows="2"></textarea>
      <div class="conf"><span class="small">Жауабыңызға сенімдісіз бе?</span>
        <label><input type="radio" name="c_${q.id}" value="1"> Иә, сенімдімін</label>
        <label><input type="radio" name="c_${q.id}" value="0"> Жоқ, сенімді емеспін</label></div>
    </fieldset>`).join("")}
    <div class="panel narrow"><button class="primary" type="submit">Тестті аяқтау</button><p id="tmsg" class="err" role="alert"></p></div>
  </form>`);
  document.getElementById("test").addEventListener("submit", async e => {
    e.preventDefault(); const msg = document.getElementById("tmsg");
    const f = e.target; const missing = [];
    const items = TEST.map((q, i) => {
      const ch = f.querySelector(`input[name="${q.id}"]:checked`), cf = f.querySelector(`input[name="c_${q.id}"]:checked`);
      if (!ch || !cf) missing.push(i + 1);
      const choice = ch ? +ch.value : -1, correct = choice >= 0 && q.opts[choice][1] === "ok", confident = cf ? cf.value === "1" : false;
      return { id: q.id, choice, correct, tag: choice >= 0 ? q.opts[choice][1] : "", confident, tier: tierOf(correct, confident), reason: document.getElementById("r_" + q.id).value.trim() };
    });
    if (missing.length) { msg.textContent = `Мына сұрақтарда жауап не сенімділік белгіленбеген: ${missing.join(", ")}.`; document.getElementById("f_" + TEST[missing[0] - 1].id).scrollIntoView({ behavior: "smooth" }); return; }
    const score = Math.round(100 * items.filter(i => i.correct).length / items.length);
    msg.textContent = "Сақталуда…";
    try {
      await S.saveResult({ type: phase, score, items, grade: String(s.grade || "") });
      render(`<section class="panel narrow"><span class="label">Тест аяқталды</span><h2>Нәтижеңіз: ${score}%</h2>
        <p>Дұрыс жауаптар: ${items.filter(i => i.correct).length} / ${items.length}.</p>
        <p class="muted">${phase === "pre" ? "Енді мұғалімнің нұсқауымен виртуалды зертханаға өтіңіз." : "Рақмет! Мұғалім нәтижелерді сыныппен бірге талқылайды."}</p>
        <a class="btn primary" href="#/student">Менің жұмысыма оралу</a></section>`);
    } catch (err) { console.error(err); msg.textContent = "Сақталмады: " + err.message; }
  });
}

/* ---------------- мұғалім ---------------- */
async function viewTeacher(tab) {
  const t = await S.teacher();
  if (!t) {
    render(`<section class="panel narrow"><h2>Мұғалім кабинеті</h2>
      <p class="muted">Электрондық пошта мен құпиясөз арқылы кіріңіз. Алғаш рет болса, «Тіркелу» батырмасын басыңыз.</p>
      ${S.isDemo ? `<p class="note">Демо режим: Firebase әлі қосылмаған, деректер тек осы браузерде сақталады. Кез келген пошта мен құпиясөз жарайды.</p>` : ""}
      <form id="tl" class="form">
        <label for="em">Электрондық пошта</label><input id="em" type="email" required autocomplete="username">
        <label for="pw">Құпиясөз</label><input id="pw" type="password" minlength="6" required autocomplete="current-password">
        <div class="btns"><button class="primary" type="submit" data-m="in">Кіру</button><button type="submit" data-m="up">Тіркелу</button></div>
        <p id="tmsg" class="err" role="alert"></p></form></section>`);
    let mode = "in"; document.querySelectorAll("#tl button").forEach(b => b.addEventListener("click", () => mode = b.dataset.m));
    document.getElementById("tl").addEventListener("submit", async e => {
      e.preventDefault(); const m = document.getElementById("tmsg"); m.textContent = "";
      try { await S.teacherSignIn(document.getElementById("em").value, document.getElementById("pw").value, mode === "up"); route(); }
      catch (err) { m.textContent = authErr(err); }
    });
    return;
  }
  const data = await S.teacherData();
  const tabs = { classes: "Сыныптар", analytics: "Нәтижелер талдауы", work: "Жұмыс парақтары", ai: "ЖИ-көмекші сұрақтары" };
  render(`<section class="row between flexwrap"><div><span class="label">${esc(t.email)}</span><h2 class="h1">Мұғалім кабинеті</h2></div><button id="lo">Шығу</button></section>
    <nav class="subnav">${Object.entries(tabs).map(([k, v]) => `<a href="#/teacher/${k}" aria-current="${k === tab ? "page" : "false"}">${v}</a>`).join("")}</nav>
    <div id="tv"></div>`);
  document.getElementById("lo").addEventListener("click", async () => { await S.teacherSignOut(); route(); });
  const tv = document.getElementById("tv");
  if (tab === "analytics") tv.innerHTML = analytics(data);
  else if (tab === "work") tv.innerHTML = worksheets(data);
  else if (tab === "ai") tv.innerHTML = aiLogs(data);
  else { tv.innerHTML = classes(data); bindClasses(); }
  if (tab === "analytics") bindAnalytics(data);
}
function authErr(e) {
  const c = e.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Пошта немесе құпиясөз қате.";
  if (c.includes("email-already-in-use")) return "Бұл пошта тіркелген. «Кіру» батырмасын басыңыз.";
  if (c.includes("weak-password")) return "Құпиясөз кемінде 6 таңбадан тұруы керек.";
  return e.message;
}
function classes(d) {
  const cnt = code => new Set(d.results.filter(r => r.classCode === code).map(r => r.studentNo)).size;
  return `<div class="grid2">
  <section class="panel"><h2>Менің сыныптарым</h2>
    ${d.classes.length ? `<div class="tablewrap"><table><thead><tr><th>Сынып</th><th>Код</th><th>Параллель</th><th>Топ</th><th>Оқушылар</th></tr></thead><tbody>
    ${d.classes.map(c => `<tr><td class="l">${esc(c.name)}</td><td><code class="code">${esc(c.code)}</code></td><td>${esc(c.grade)}</td><td class="l">${GROUP[c.group] || "–"}</td><td>${cnt(c.code)}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted">Әзірге сынып жоқ. Оң жақтағы форма арқылы сынып ашыңыз, оқушыларға оның кодын беріңіз.</p>`}
    ${S.isDemo ? `<div class="note">Демо режим. Талдауды көру үшін мысал деректерді жүктеуге болады (2 сынып, 24 оқушыдан).<div class="btns"><button id="seed">Мысал деректерді жүктеу</button><button id="unseed">Барлық деректі өшіру</button></div></div>` : ""}
  </section>
  <section class="panel"><h2>Жаңа сынып ашу</h2>
    <form id="nc" class="form">
      <label for="cn">Сынып атауы</label><input id="cn" required placeholder="Мысалы: 8 «А»">
      <label for="cg">Сынып</label><select id="cg"><option>7</option><option selected>8</option><option>9</option><option>10</option><option>11</option></select>
      <label for="cgr">Эксперименттегі рөлі</label><select id="cgr"><option value="exp">Эксперименттік топ (платформамен оқиды)</option><option value="ctrl">Бақылау тобы (тек тест тапсырады)</option></select>
      <button class="primary" type="submit">Сынып ашу</button><p id="ncm" class="small" role="status"></p>
    </form>
    <p class="muted small">Оқушылар сайттың «Оқушы» бөліміне кіріп, сынып коды мен журналдағы нөмірін енгізеді.</p>
  </section></div>`;
}
function bindClasses() {
  document.getElementById("nc").addEventListener("submit", async e => {
    e.preventDefault(); const m = document.getElementById("ncm");
    try { const code = await S.createClass({ name: document.getElementById("cn").value.trim(), grade: document.getElementById("cg").value, group: document.getElementById("cgr").value });
      m.textContent = "Сынып ашылды. Коды: " + code; setTimeout(route, 900); } catch (err) { m.textContent = "Қате: " + err.message; }
  });
  const sd = document.getElementById("seed"); if (sd) sd.addEventListener("click", () => { S.seedDemo(testFor(8), tierOf); location.hash = "#/teacher/analytics"; });
  const ud = document.getElementById("unseed"); if (ud) ud.addEventListener("click", () => { S.clearDemo(); route(); });
}

/* ---------------- талдау ---------------- */
function latest(rs) { return rs.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]; }
function buildRows(d, codes) {
  const cls = Object.fromEntries(d.classes.map(c => [c.code, c]));
  const by = {};
  d.results.filter(r => codes.has(r.classCode)).forEach(r => { const k = r.classCode + "|" + r.studentNo; (by[k] ||= { pre: [], post: [] })[r.type]?.push(r); });
  return Object.entries(by).map(([k, v]) => {
    const [code, no] = k.split("|"); const pre = latest(v.pre), post = latest(v.post);
    const group = cls[code]?.group || pre?.group || post?.group;
    return { code, cls: cls[code]?.name || code, no, group, pre, post };
  }).sort((a, b) => a.cls.localeCompare(b.cls) || (+a.no - +b.no));
}
function groupStats(rows, g) {
  const pr = rows.filter(r => r.group === g && r.pre && r.post);
  const pre = pr.map(r => r.pre.score), post = pr.map(r => r.post.score);
  return { n: pr.length, pre, post, gain: post.map((x, i) => x - pre[i]),
    preM: ST.mean(pre), preS: ST.sd(pre), postM: ST.mean(post), postS: ST.sd(post),
    g: ST.hakeG(ST.mean(pre), ST.mean(post)), t: ST.pairedT(pre, post), dz: ST.cohenDz(pre, post) };
}
const gLevel = g => !Number.isFinite(g) ? "" : g < 0.3 ? "төмен өсім" : g < 0.7 ? "орташа өсім" : "жоғары өсім";
const dLevel = d => { const a = Math.abs(d); return !Number.isFinite(d) ? "" : a < 0.2 ? "мардымсыз әсер" : a < 0.5 ? "аз әсер" : a < 0.8 ? "орташа әсер" : "үлкен әсер"; };
function misRate(rows, g, phase, tag) {
  const rs = rows.filter(r => r.group === g && r[phase]).map(r => r[phase]); if (!rs.length) return NaN;
  return 100 * rs.filter(r => r.items.some(i => i.tag === tag)).length / rs.length;
}
function tierRate(rows, g, phase) {
  const it = rows.filter(r => r.group === g && r[phase]).flatMap(r => r[phase].items); const o = {};
  Object.keys(TIERS).forEach(k => o[k] = it.length ? 100 * it.filter(i => i.tier === k).length / it.length : NaN); return o;
}
function bars(cats, series, max = 100, unit = "%") {
  const W = 640, H = 230, L = 40, B = 46, T = 14, pw = W - L - 10, ph = H - B - T, cw = pw / cats.length, bw = Math.min(28, (cw - 14) / series.length);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">`;
  for (let i = 0; i <= 4; i++) { const y = T + ph - ph * i / 4; s += `<line x1="${L}" x2="${W - 10}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="ax">${Math.round(max * i / 4)}</text>`; }
  cats.forEach((c, ci) => {
    const x0 = L + ci * cw + (cw - bw * series.length) / 2;
    series.forEach((se, si) => { const v = se.values[ci]; if (!Number.isFinite(v)) return; const h = ph * Math.min(v, max) / max;
      s += `<rect x="${x0 + si * bw}" y="${T + ph - h}" width="${bw - 3}" height="${h}" rx="2" style="fill:${se.color}"><title>${esc(se.name)}: ${n1(v)}${unit}</title></rect>`; });
    const lines = String(c).split("\n");
    lines.forEach((ln, li) => s += `<text x="${L + ci * cw + cw / 2}" y="${T + ph + 16 + li * 13}" text-anchor="middle" class="ax">${esc(ln)}</text>`);
  });
  return s + `</svg><div class="legend">${series.map(se => `<span><i style="background:${se.color}"></i>${esc(se.name)}</span>`).join("")}</div>`;
}
function analytics(d) {
  if (!d.classes.length) return `<section class="panel"><p class="muted">Алдымен «Сыныптар» бөлімінде сынып ашыңыз.</p></section>`;
  const sel = new Set((sessionStorage.getItem("mp.sel") || d.classes.map(c => c.code).join(",")).split(",").filter(Boolean));
  const rows = buildRows(d, sel);
  const E = groupStats(rows, "exp"), C = groupStats(rows, "ctrl");
  const W = ST.welchT(E.gain, C.gain), dPost = ST.cohenD(E.post, C.post), dGain = ST.cohenD(E.gain, C.gain);
  const preCmp = ST.welchT(E.pre, C.pre);
  const sumRow = (name, X) => `<tr><td class="l">${name}</td><td>${X.n}</td><td>${n1(X.preM)} ± ${n1(X.preS)}</td><td>${n1(X.postM)} ± ${n1(X.postS)}</td><td>${n1(X.g, 2)}</td><td>${n1(X.t.t, 2)}</td><td>${pfmt(X.t.p)}</td><td>${n1(X.dz, 2)}</td></tr>`;
  const usedIds = new Set(d.classes.filter(c => sel.has(c.code)).flatMap(c => TESTS[+c.grade] || TESTS[8]));
  const mtags = Object.keys(MISCONCEPTIONS).filter(m => [...usedIds].some(id => BANK[id].opts.some(o => o[1] === m)));
  const tE0 = tierRate(rows, "exp", "pre"), tE1 = tierRate(rows, "exp", "post"), tC0 = tierRate(rows, "ctrl", "pre"), tC1 = tierRate(rows, "ctrl", "post");
  const concl = [];
  if (E.n && C.n) {
    concl.push(`Бастапқы тестте топтардың айырмасы ${preCmp.p < 0.05 ? "статистикалық тұрғыда мәнді (p = " + pfmt(preCmp.p) + "), сондықтан топтар бастапқыда тең емес" : "мәнді емес (p = " + pfmt(preCmp.p) + "), яғни топтар бастапқыда тең деуге болады"}.`);
    concl.push(`Эксперименттік топта нормаланған өсім ⟨g⟩ = ${n1(E.g, 2)} (${gLevel(E.g)}), бақылау тобында ⟨g⟩ = ${n1(C.g, 2)} (${gLevel(C.g)}).`);
    concl.push(`Топтардың өсімін салыстырғанда Уэлч t = ${n1(W.t, 2)}, p = ${pfmt(W.p)}; ${W.p < 0.05 ? "айырма статистикалық тұрғыда мәнді" : "айырма статистикалық тұрғыда мәнді емес"}. Әсер мөлшері d = ${n1(dGain, 2)} (${dLevel(dGain)}).`);
  }
  return `
  <section class="panel">
    <span class="label">Талдауға кіретін сыныптар</span>
    <div class="chips">${d.classes.map(c => `<label class="check"><input type="checkbox" class="selc" value="${esc(c.code)}" ${sel.has(c.code) ? "checked" : ""}> ${esc(c.name)} <span class="muted small">(${GROUP[c.group]})</span></label>`).join("")}</div>
  </section>
  <section class="panel">
    <h2>Оқу жетістіктері: дейін және кейін</h2>
    <p class="muted small">Тек екі тестті де тапсырған оқушылар есептеледі. Балл – дұрыс жауаптардың пайызы. ⟨g⟩ – Хейк бойынша нормаланған өсім, d<sub>z</sub> – тәуелді таңдамалар үшін Коэн әсер мөлшері.</p>
    <div class="tablewrap"><table><thead><tr><th class="l">Топ</th><th>n</th><th>Дейін, %</th><th>Кейін, %</th><th>⟨g⟩</th><th>t</th><th>p</th><th>d<sub>z</sub></th></tr></thead>
    <tbody>${sumRow("Эксперименттік", E)}${sumRow("Бақылау", C)}</tbody></table></div>
    ${bars(["Эксперименттік", "Бақылау"], [{ name: "Бастапқы тест", color: "var(--muted)", values: [E.preM, C.preM] }, { name: "Қорытынды тест", color: "var(--accent)", values: [E.postM, C.postM] }])}
    <div class="concl">${concl.length ? concl.map(x => `<p>${x}</p>`).join("") : `<p class="muted">Қорытынды шығару үшін екі топта да екі тестті тапсырған оқушылар болуы керек.</p>`}</div>
  </section>
  <section class="panel">
    <h2>Қате түсініктердің өзгерісі</h2>
    <p class="muted small">Тестте осы қате түсінікке сәйкес жалған нұсқаны кемінде бір рет таңдаған оқушылардың үлесі.</p>
    <div class="tablewrap"><table><thead><tr><th class="l">Қате түсінік</th><th>Эксп. дейін</th><th>Эксп. кейін</th><th>Бақ. дейін</th><th>Бақ. кейін</th></tr></thead><tbody>
    ${mtags.map(m => `<tr><td class="l">${esc(MISCONCEPTIONS[m])}</td><td>${n1(misRate(rows, "exp", "pre", m), 0)}%</td><td><b>${n1(misRate(rows, "exp", "post", m), 0)}%</b></td><td>${n1(misRate(rows, "ctrl", "pre", m), 0)}%</td><td>${n1(misRate(rows, "ctrl", "post", m), 0)}%</td></tr>`).join("")}
    </tbody></table></div>
    ${bars(mtags, [{ name: "Эксп. дейін", color: "var(--muted)", values: mtags.map(m => misRate(rows, "exp", "pre", m)) }, { name: "Эксп. кейін", color: "var(--accent)", values: mtags.map(m => misRate(rows, "exp", "post", m)) }, { name: "Бақ. кейін", color: "var(--hot)", values: mtags.map(m => misRate(rows, "ctrl", "post", m)) }])}
  </section>
  <section class="panel">
    <h2>Үш сатылы тест бойынша жауап санаттары</h2>
    <p class="muted small">Барлық жауаптардың ішіндегі үлесі. «Тұрақты қате түсінік» – қате жауапты сеніммен таңдау.</p>
    ${bars(Object.values(TIERS).map(x => x.replace(" (", "\n(")), [{ name: "Эксп. дейін", color: "var(--muted)", values: Object.keys(TIERS).map(k => tE0[k]) }, { name: "Эксп. кейін", color: "var(--accent)", values: Object.keys(TIERS).map(k => tE1[k]) }, { name: "Бақ. дейін", color: "var(--line)", values: Object.keys(TIERS).map(k => tC0[k]) }, { name: "Бақ. кейін", color: "var(--hot)", values: Object.keys(TIERS).map(k => tC1[k]) }])}
  </section>
  <section class="panel">
    <div class="row between flexwrap"><h2>Оқушылар бойынша</h2><div class="btns"><button id="csv1">Нәтижелер (CSV)</button><button id="csv2">Барлық жауаптар (CSV)</button></div></div>
    <div class="tablewrap"><table><thead><tr><th class="l">Сынып</th><th>№</th><th class="l">Топ</th><th>Дейін, %</th><th>Кейін, %</th><th>Өсім</th><th>g</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td class="l">${esc(r.cls)}</td><td>${esc(r.no)}</td><td class="l">${GROUP[r.group] || ""}</td><td>${r.pre?.score ?? "–"}</td><td>${r.post?.score ?? "–"}</td><td>${r.pre && r.post ? r.post.score - r.pre.score : "–"}</td><td>${r.pre && r.post && r.pre.score < 100 ? n1((r.post.score - r.pre.score) / (100 - r.pre.score), 2) : "–"}</td></tr>`).join("")}
    </tbody></table></div>
  </section>`;
}
function download(name, rows) {
  const csv = "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function bindAnalytics(d) {
  document.querySelectorAll(".selc").forEach(c => c.addEventListener("change", () => {
    sessionStorage.setItem("mp.sel", [...document.querySelectorAll(".selc:checked")].map(x => x.value).join(",")); route(); }));
  const rows = buildRows(d, new Set([...document.querySelectorAll(".selc:checked")].map(x => x.value)));
  document.getElementById("csv1").addEventListener("click", () => download("natizheler.csv",
    [["Сынып", "Код", "№", "Топ", "Дейін %", "Кейін %", "Өсім", "g"]].concat(rows.map(r => [r.cls, r.code, r.no, GROUP[r.group], r.pre?.score, r.post?.score,
      r.pre && r.post ? r.post.score - r.pre.score : "", r.pre && r.post && r.pre.score < 100 ? ((r.post.score - r.pre.score) / (100 - r.pre.score)).toFixed(3) : ""]))));
  document.getElementById("csv2").addEventListener("click", () => {
    const out = [["Сынып", "№", "Топ", "Тест", "Сұрақ", "Таңдау", "Дұрыс", "Қате түсінік", "Сенімді", "Санат", "Негіздеме"]];
    rows.forEach(r => ["pre", "post"].forEach(ph => r[ph]?.items.forEach(i => out.push([r.cls, r.no, GROUP[r.group], ph === "pre" ? "дейін" : "кейін", i.id, i.choice >= 0 ? "АӘБВ"[i.choice] : "", i.correct ? 1 : 0, i.tag === "ok" ? "" : i.tag, i.confident ? 1 : 0, TIERS[i.tier], i.reason]))));
    download("zhauaptar.csv", out);
  });
}
function worksheets(d) {
  const cls = Object.fromEntries(d.classes.map(c => [c.code, c.name]));
  if (!d.worksheets.length) return `<section class="panel"><p class="muted">Әзірге оқушылар жұмыс парағын сақтамаған.</p></section>`;
  return Object.entries(MODELS).map(([k, m]) => { const ws = d.worksheets.filter(w => w.model === k); if (!ws.length) return "";
    return `<section class="panel"><h2>${esc(m.title)} <span class="muted small">(${ws.length})</span></h2>
    ${ws.map(w => `<details class="ws-item"><summary>${esc(cls[w.classCode] || w.classCode)} · №${esc(w.studentNo)}</summary>
      ${["Болжа", "Бақыла", "Түсіндір"].map((t, i) => `<p><strong>${t}:</strong> ${esc(w.answers?.[i] || "–")}</p>`).join("")}</details>`).join("")}</section>`; }).join("");
}
function aiLogs(d) {
  if (!d.aiLogs.length) return `<section class="panel"><p class="muted">Әзірге ЖИ-көмекшіге сұрақ қойылмаған.</p></section>`;
  const cls = Object.fromEntries(d.classes.map(c => [c.code, c.name]));
  return `<section class="panel"><h2>Оқушылардың ЖИ-көмекшіге қойған сұрақтары</h2>
    <p class="muted small">Бұл сұрақтар оқушылардың қай жерде қиналатынын көрсетеді және сапалық талдауға қолданылады.</p>
    ${d.aiLogs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(l => `<details class="ws-item"><summary>${esc(cls[l.classCode] || l.classCode)} · №${esc(l.studentNo)} · ${esc(MODELS[l.model]?.title || l.model)}: ${esc(l.question)}</summary><p>${esc(l.answer)}</p></details>`).join("")}</section>`;
}

/* ---------------- бастау ---------------- */
if (S.isDemo) document.getElementById("demo").hidden = false;
route();
