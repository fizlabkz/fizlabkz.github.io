/* Firebase баптауы.
   Firebase Console → Project settings → Your apps → Web app → firebaseConfig блогын осында қойыңыз.
   Бұл кілттер құпия емес: олар сайтта ашық тұрады, ал деректерді firestore.rules қорғайды.
   apiKey бос болса, платформа «демо режимде» жұмыс істейді: деректер тек осы браузерде сақталады. */
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* ЖИ-көмекші үшін Gemini моделі (Firebase AI Logic → Gemini Developer API) */
export const AI_MODEL = "gemini-2.5-flash";

/* Firebase JS SDK нұсқасы (www.gstatic.com/firebasejs/...) */
export const FIREBASE_VERSION = "12.0.0";
