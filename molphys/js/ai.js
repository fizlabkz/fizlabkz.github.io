/* ЖИ-көмекші: Firebase AI Logic (Gemini Developer API). Кілт сайт кодында сақталмайды. */
import { AI_MODEL, FIREBASE_VERSION } from "./config.js";
import { getFB, isDemo, logAI } from "./store.js";

const SYSTEM = `Сен – 7–10-сынып оқушыларына молекулалық физиканы үйрететін мейірімді көмекшісің.
Ережелер:
1. Тек қазақ тілінде, қысқа жауап бер: 2–5 сөйлем.
2. Дайын жауапты бірден айтпа. Оқушыға бағыттаушы сұрақ қой немесе модельде нені өзгертіп, нені бақылау керегін көрсет (Сократ әдісі).
3. Оқушы қате түсінікті айтса, оны жоққа шығарма, модельмен тексеріп көруді ұсын.
4. Оқушы үш рет сұрағаннан кейін ғана толық түсіндірме бер.
5. Физикалық дәлдікті сақта: молекулалар үнемі қозғалады, олардың өлшемі температураға тәуелді емес, қысым – молекулалардың қабырғаға соғылуының нәтижесі, температура – молекулалардың орташа кинетикалық энергиясының өлшемі.
6. Сабаққа қатысы жоқ сұраққа жауап берме, әдептілікпен тақырыпқа қайтар.
7. Формуланы қарапайым мәтінмен жаз (мысалы: p = nkT, E = 3/2·kT).`;

export class Tutor {
  constructor(modelKey, model) { this.key = modelKey; this.model = model; this.chat = null; }
  async ask(text) {
    if (isDemo) {
      return "ЖИ-көмекші Firebase жобасы қосылғаннан кейін жұмыс істейді. Қазір платформа демо режимде.";
    }
    if (!this.chat) {
      const f = await getFB();
      const M = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-ai.js`);
      const ai = M.getAI(f.app, { backend: new M.GoogleAIBackend() });
      const gm = M.getGenerativeModel(ai, {
        model: AI_MODEL,
        systemInstruction: SYSTEM + `\n\nСабақ тақырыбы: ${this.model.topic}. Оқушы «${this.model.title}» интерактивті моделімен жұмыс істеп отыр.`
      });
      this.chat = gm.startChat();
    }
    const r = await this.chat.sendMessage(text);
    const answer = r.response.text();
    logAI({ model: this.key, question: text, answer }).catch(() => {});
    return answer;
  }
}
