# Молекулалық физика зертханасы

Молекулалық физикаға арналған қазақ тіліндегі цифрлық платформа (магистрлік диссертация аясында ЖИ көмегімен жасалған).

**Мекенжайы:** https://fizlabkz.github.io/molphys/

## Мүмкіндіктері
- 4 интерактивті модель: Максвелл таралуы (3D), Броун қозғалысы, газ заңдары (поршень, изопроцестер), диффузия.
- Әр модельде «болжа – бақыла – түсіндір» жұмыс парағы және ЖИ-көмекші (Gemini, Firebase AI Logic).
- Үш сатылы диагностикалық тест (12 сұрақ, 8 қате түсінік): бастапқы және қорытынды.
- Мұғалім кабинеті: сыныптар (эксперименттік / бақылау), Хейк ⟨g⟩, Коэн d, тәуелді және Уэлч t-критерийі, қате түсініктердің өзгерісі, CSV экспорт, жұмыс парақтары мен ЖИ сұрақтары.

## Firebase қосу
1. console.firebase.google.com → жаңа жоба.
2. Firestore Database → Create database.
3. Authentication → Sign-in method → **Anonymous** және **Email/Password** қосу.
4. AI Logic → Get started → **Gemini Developer API**.
5. Firestore → Rules → `firestore.rules` файлының мәтінін қойып, Publish.
6. Project settings → Your apps → Web app → `firebaseConfig` мәндерін `js/config.js` файлына қою.
7. Authentication → Settings → Authorized domains тізімінде `fizlabkz.github.io` болуы керек.

`js/config.js` ішінде `apiKey` бос болса, платформа демо режимде жұмыс істейді (деректер тек браузерде).

## Құрылымы
- `js/app.js` – беттер мен маршруттар
- `js/content.js` – модельдер, тест, қате түсініктер
- `js/sims-core.js`, `js/sims-tpl.js` – модельдердің коды мен үлгілері
- `js/stats.js` – статистика
- `js/store.js` – Firebase / демо деректер қабаты
- `js/ai.js` – ЖИ-көмекші
