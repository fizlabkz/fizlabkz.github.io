/* Деректер қабаты: Firebase (Auth + Firestore) немесе демо режим (localStorage) */
import { firebaseConfig, FIREBASE_VERSION } from "./config.js";

export const isDemo = !firebaseConfig.apiKey;
const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
let fb = null;

export async function getFB() {
  if (isDemo) return null;
  if (fb) return fb;
  const [A, AU, F] = await Promise.all([
    import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`)
  ]);
  const app = A.initializeApp(firebaseConfig);
  fb = { app, AU, F, auth: AU.getAuth(app), db: F.getFirestore(app) };
  await new Promise(res => { const off = AU.onAuthStateChanged(fb.auth, () => { off(); res(); }); });
  return fb;
}

/* ---------- демо қойма ---------- */
const LKEY = "mp.demo.db";
function ldb() { try { return JSON.parse(localStorage.getItem(LKEY)) || { classes: {}, results: [], worksheets: [], aiLogs: [] }; } catch { return { classes: {}, results: [], worksheets: [], aiLogs: [] }; } }
function lsave(d) { try { localStorage.setItem(LKEY, JSON.stringify(d)); } catch {} }
function rid() { return Math.random().toString(36).slice(2, 10); }
function lget(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lset(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ---------- оқушы сессиясы ---------- */
export function getSession() { return lget("mp.session"); }
function setSession(s) { lset("mp.session", s); }

async function studentUid() {
  if (isDemo) { let u = lget("mp.demo.uid"); if (!u) { u = "s_" + rid(); lset("mp.demo.uid", u); } return u; }
  const f = await getFB();
  if (!f.auth.currentUser) await f.AU.signInAnonymously(f.auth);
  return f.auth.currentUser.uid;
}

export async function getClass(code) {
  code = code.trim().toUpperCase();
  if (isDemo) return ldb().classes[code] || null;
  const f = await getFB();
  if (!f.auth.currentUser) await f.AU.signInAnonymously(f.auth);
  const s = await f.F.getDoc(f.F.doc(f.db, "classes", code));
  return s.exists() ? { code, ...s.data() } : null;
}

export async function joinClass(code, no) {
  const c = await getClass(code);
  if (!c) throw new Error("Мұндай сынып коды табылмады. Кодты мұғалімнен қайта сұраңыз.");
  const uid = await studentUid();
  const s = { classCode: c.code, className: c.name, group: c.group, teacherUid: c.teacherUid, studentNo: String(no), uid };
  setSession(s);
  return s;
}

export async function leaveClass() {
  setSession(null);
  if (!isDemo) { const f = await getFB(); if (f.auth.currentUser && f.auth.currentUser.isAnonymous) await f.AU.signOut(f.auth); }
}

function stamp(s, obj) {
  return { ...obj, classCode: s.classCode, studentNo: s.studentNo, group: s.group, teacherUid: s.teacherUid, uid: s.uid };
}
async function addTo(coll, data) {
  if (isDemo) { const d = ldb(); d[coll].push({ id: rid(), ...data, createdAt: Date.now() }); lsave(d); return; }
  const f = await getFB();
  if (!f.auth.currentUser) await f.AU.signInAnonymously(f.auth);
  const s = getSession();
  if (s && s.uid !== f.auth.currentUser.uid) { s.uid = f.auth.currentUser.uid; setSession(s); data.uid = s.uid; }
  await f.F.addDoc(f.F.collection(f.db, coll), { ...data, createdAt: f.F.serverTimestamp() });
}
export async function saveResult(r) { const s = getSession(); await addTo("results", stamp(s, r)); }
export async function saveWorksheet(w) { const s = getSession(); await addTo("worksheets", stamp(s, w)); }
export async function logAI(l) { const s = getSession(); if (s) await addTo("aiLogs", stamp(s, l)); }

export async function myRecords(coll) {
  const s = getSession(); if (!s) return [];
  if (isDemo) return ldb()[coll].filter(r => r.classCode === s.classCode && r.studentNo === s.studentNo);
  const f = await getFB();
  if (!f.auth.currentUser) return [];
  const q = f.F.query(f.F.collection(f.db, coll), f.F.where("uid", "==", f.auth.currentUser.uid),
    f.F.where("classCode", "==", s.classCode), f.F.where("studentNo", "==", s.studentNo));
  return (await f.F.getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ---------- мұғалім ---------- */
export async function teacher() {
  if (isDemo) return lget("mp.demo.teacher");
  const f = await getFB(); const u = f.auth.currentUser;
  return u && !u.isAnonymous ? { uid: u.uid, email: u.email } : null;
}
export async function teacherSignIn(email, pw, create) {
  if (isDemo) { const t = { uid: "t_demo", email }; lset("mp.demo.teacher", t); return t; }
  const f = await getFB();
  if (f.auth.currentUser && f.auth.currentUser.isAnonymous) await f.AU.signOut(f.auth);
  const fn = create ? f.AU.createUserWithEmailAndPassword : f.AU.signInWithEmailAndPassword;
  const c = await fn(f.auth, email, pw);
  return { uid: c.user.uid, email: c.user.email };
}
export async function teacherSignOut() {
  if (isDemo) { lset("mp.demo.teacher", null); return; }
  const f = await getFB(); await f.AU.signOut(f.auth);
}
function newCode() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
export async function createClass({ name, grade, group }) {
  const t = await teacher(); const code = newCode();
  const data = { name, grade, group, teacherUid: t.uid };
  if (isDemo) { const d = ldb(); d.classes[code] = { code, ...data, createdAt: Date.now() }; lsave(d); return code; }
  const f = await getFB();
  await f.F.setDoc(f.F.doc(f.db, "classes", code), { ...data, createdAt: f.F.serverTimestamp() });
  return code;
}
export async function teacherData() {
  const t = await teacher();
  if (isDemo) { const d = ldb(); const cls = Object.values(d.classes).filter(c => c.teacherUid === t.uid);
    const own = r => r.teacherUid === t.uid;
    return { classes: cls, results: d.results.filter(own), worksheets: d.worksheets.filter(own), aiLogs: d.aiLogs.filter(own) }; }
  const f = await getFB();
  const by = coll => f.F.getDocs(f.F.query(f.F.collection(f.db, coll), f.F.where("teacherUid", "==", t.uid)))
    .then(s => s.docs.map(x => ({ id: x.id, code: x.id, ...x.data(), createdAt: x.data().createdAt?.toMillis?.() || 0 })));
  const [classes, results, worksheets, aiLogs] = await Promise.all(["classes", "results", "worksheets", "aiLogs"].map(by));
  return { classes, results, worksheets, aiLogs };
}

/* Демо режимге мысал деректер: 2 сынып × 24 оқушы, дейін және кейін тест */
export function seedDemo(TEST, tierOf) {
  const d = ldb(); const t = lget("mp.demo.teacher"); if (!t) return;
  const mk = (code, name, group, gain) => {
    d.classes[code] = { code, name, grade: "8", group, teacherUid: t.uid, createdAt: Date.now() };
    for (let n = 1; n <= 24; n++) {
      const ability = 0.25 + Math.random() * 0.35;
      for (const type of ["pre", "post"]) {
        const p = type === "pre" ? ability : Math.min(0.97, ability + gain * (0.6 + Math.random() * 0.8));
        const items = TEST.map(q => {
          const ok = Math.random() < p;
          const wrong = q.opts.map((o, i) => [o, i]).filter(([o]) => o[1] !== "ok");
          const choice = ok ? q.opts.findIndex(o => o[1] === "ok") : wrong[Math.floor(Math.random() * wrong.length)][1];
          const confident = Math.random() < (ok ? 0.7 : 0.55);
          return { id: q.id, choice, correct: ok, tag: q.opts[choice][1], confident, tier: tierOf(ok, confident), reason: "" };
        });
        const score = Math.round(100 * items.filter(i => i.correct).length / items.length);
        d.results.push({ id: rid(), type, score, items, classCode: code, studentNo: String(n), group, teacherUid: t.uid, uid: "demo", createdAt: Date.now(), demo: true });
      }
    }
  };
  mk("DEMO8A", "8 «А» (мысал)", "exp", 0.32);
  mk("DEMO8B", "8 «Ә» (мысал)", "ctrl", 0.16);
  lsave(d);
}
export function clearDemo() { lsave({ classes: {}, results: [], worksheets: [], aiLogs: [] }); }
