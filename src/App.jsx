import { useState, useRef, useEffect } from "react";
import { pickBooks, bookKey } from "./books";

// ——— Пиксельная тема ———
const T = {
  night: "#141230", nightDeep: "#0d0b22",
  wood: "#8a5a33", woodLight: "#a9743f", outline: "#241408",
  panelSolid: "#2e3a82", gold: "#ffd66b", green: "#6fdc8c", red: "#e0564f",
  paperMsg: "#f5e9cf", ink: "#2c2318", white: "#ffffff", muted: "#b9b6e0",
  btn: "#3a3a52", cardBg: "rgba(20,22,52,0.9)", track: "#1c1a3a",
};

// ——— Темы оформления (полные палитры) ———
const THEMES = {
  night: { ...T }, // Ночная библиотека — базовая
  ember: {
    night: "#241108", nightDeep: "#180a04", wood: "#7a4a24", woodLight: "#9a642f", outline: "#120602",
    panelSolid: "#7a3520", gold: "#ffb257", green: "#7fd98a", red: "#ff6b5e",
    paperMsg: "#f7e8cf", ink: "#2c1c10", white: "#ffe9d6", muted: "#d9a98c",
    btn: "#4a2c1c", cardBg: "rgba(50,24,12,0.9)", track: "#33180c",
  },
  forest: {
    night: "#0e2416", nightDeep: "#081a0f", wood: "#6c4a26", woodLight: "#8a6231", outline: "#0a1408",
    panelSolid: "#1f5c3a", gold: "#ffd66b", green: "#8ce89a", red: "#e0564f",
    paperMsg: "#eef2d8", ink: "#22301c", white: "#eaf7ea", muted: "#a8c9ad",
    btn: "#294a35", cardBg: "rgba(14,40,24,0.9)", track: "#12301e",
  },
  library: {
    // «Библиотека» — палитра с макетов: глубокий изумруд + тёплое золото.
    night: "#0f2419", nightDeep: "#07160f", wood: "#7a5230", woodLight: "#9a6b3c", outline: "#061009",
    panelSolid: "#1c4732", gold: "#f0c674", green: "#7fd39b", red: "#e0705f",
    paperMsg: "#f2ece0", ink: "#22301c", white: "#ece7d9", muted: "#9aae9f",
    btn: "#1a3a29", cardBg: "rgba(16,38,26,0.92)", track: "#122c1e",
  },
  parchment: {
    night: "#f2e7cd", nightDeep: "#e9dbb9", wood: "#8a5a33", woodLight: "#a9743f", outline: "#3a2814",
    panelSolid: "#cdb37e", gold: "#8a5a17", green: "#4c8a4f", red: "#b03a30",
    paperMsg: "#fdf6e3", ink: "#2c2318", white: "#2c2318", muted: "#6a5a3f",
    btn: "#d8c8a2", cardBg: "rgba(255,250,235,0.85)", track: "#d8c8a2",
  },
};
const THEME_LIST = [["library", "📖"], ["night", "🌙"], ["ember", "🔥"], ["forest", "🌲"], ["parchment", "📜"]];
function applyTheme(id) { Object.assign(T, THEMES[id] || THEMES.night); }

// ——— Встроенные арт-ассеты (base64) ———
// Арты лежат файлами в public/art и грузятся отдельными запросами: браузер
// кеширует их сам и не перекачивает при каждом обновлении кода. BASE_URL
// учитывает префикс пути, если сайт стоит не в корне домена (GitHub Pages).
const art = (name) => `${import.meta.env.BASE_URL}art/${name}.webp`;

const IMG = {
  scholar: art("scholar"),
  debater: art("debater"),
  friend: art("friend"),
  philosopher: art("philosopher"),
  logo: art("logo"),
};

const px = (c = T.outline) => ({ border: `4px solid ${c}` });
const GLOW = "0 0 12px rgba(255,214,107,0.7)";

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Neucha&display=swap');
    * { box-sizing: border-box; } body { margin: 0; }
    html, body, #root { max-width: 100%; overflow-x: hidden; }
    .pxfont { font-family: 'Press Start 2P', monospace; overflow-wrap: anywhere; word-break: break-word; }
    .hand { font-family: 'Neucha', cursive; overflow-wrap: anywhere; }
    img, div, span, button { max-width: 100%; }
    @keyframes blink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
    .cursor { display:inline-block; width:9px; height:1.05em; background:currentColor; vertical-align:text-bottom; margin-left:2px; animation:blink .9s steps(1) infinite; }
    @keyframes legL { 0%,100%{transform:rotate(14deg);} 50%{transform:rotate(-10deg);} }
    @keyframes legR { 0%,100%{transform:rotate(-14deg);} 50%{transform:rotate(10deg);} }
    .legL { transform-origin: top center; animation: legL 1.6s ease-in-out infinite; }
    .legR { transform-origin: top center; animation: legR 1.6s ease-in-out infinite; }
    @keyframes confetti { 0%{transform:translateY(-10px);opacity:1;} 100%{transform:translateY(90px);opacity:0;} }
    .conf { position:absolute; width:6px; height:6px; animation: confetti 1.4s ease-in forwards; }
    .view { animation: fadeUp .28s ease; }
    @keyframes toastUp { 0%{opacity:0; transform:translateY(12px);} 12%{opacity:1; transform:none;} 82%{opacity:1;} 100%{opacity:0; transform:translateY(-16px);} }
    .toast { animation: toastUp 1.9s ease forwards; }
    @keyframes logoPop { 0%{transform:scale(.6); opacity:0;} 60%{transform:scale(1.08);} 100%{transform:scale(1); opacity:1;} }
    .logo { animation: logoPop .6s ease; }
    @keyframes flame { 0%,100%{transform:scaleY(1);} 50%{transform:scaleY(1.25) translateY(-2px);} }
    .flame { animation: flame .7s ease-in-out infinite; transform-origin: bottom; }
    button:not(:disabled):active { transform: translate(2px, 2px); filter: brightness(1.25); }
    input:focus, textarea:focus { outline: 3px solid ${T.gold}; }
    button:focus-visible { outline: 3px solid ${T.gold}; }
    @media (prefers-reduced-motion: reduce) { .cursor,.legL,.legR,.conf,.flame { animation:none; } }
  `}</style>
);

// ——— Языки ———
const LANGS = [
  { id: "ru", flag: "🇷🇺", tts: "ru-RU" }, { id: "en", flag: "🇬🇧", tts: "en-GB" }, { id: "de", flag: "🇩🇪", tts: "de-DE" },
  { id: "it", flag: "🇮🇹", tts: "it-IT" }, { id: "ja", flag: "🇯🇵", tts: "ja-JP" }, { id: "zh", flag: "🇨🇳", tts: "zh-CN" },
];
const LANG_NAME = { ru: "русском языке", en: "английском языке (English)", de: "немецком языке (Deutsch)", it: "итальянском языке (Italiano)", ja: "японском языке (日本語)", zh: "китайском языке (中文)" };
const ttsLang = (id) => (LANGS.find((l) => l.id === id) || LANGS[0]).tts;

const I18N = {
  ru: { library: "МОЯ БИБЛИОТЕКА", empty: "Полка пока пуста — начните первую книгу!", count: "Книг", free: "бесплатно", newBook: "+ НОВАЯ КНИГА", menu: "☰ МЕНЮ", full: "Полка заполнена — удалите одну из книг.", newTitle: "НОВАЯ КНИГА", back: "← НАЗАД", whichBook: "КАКУЮ КНИГУ ЧИТАЕТЕ?", bookPh: "Например: Мастер и Маргарита", whereNow: "ГДЕ ВЫ СЕЙЧАС?", wherePh: "Глава 12 / треть книги / последнее событие", about: "О ЧЁМ КНИГА?", aboutOpt: "*для редких", aboutPh: "Вставьте описание — или нажмите «Найти», и я поищу его в интернете.", goalLbl: "ЦЕЛЬ ЧТЕНИЯ (необязательно)", totalLbl: "ВСЕГО ГЛАВ ИЛИ СТРАНИЦ", totalPh: "например: 32", goalPh: "Например: дочитать до конца месяца", choose: "ВЫБЕРИТЕ СОБЕСЕДНИКА", start: "НАЧАТЬ РАЗГОВОР", shelf: "← ПОЛКА", here: "Вы здесь", edit: "изменить", spoilerOn: "Спойлер-защита активна", spoilerUpTo: "Обсуждаем только до", spoilerOff: "Спойлеры разрешены", tabHome: "ГЛАВНАЯ", tabShelf: "ПОЛКА", tabQuotes: "ЦИТАТЫ", tabProfile: "ПРОФИЛЬ", storageFull: "Память браузера заполнена — записи больше не сохраняются. Удалите книгу или сделайте экспорт.", authTitle: "ВХОД", authSubtitle: "Полка будет с вами на любом устройстве", authEmail: "ПОЧТА", authPass: "ПАРОЛЬ", authPassHint: "не короче 6 символов", authSignIn: "ВОЙТИ", authSignUp: "СОЗДАТЬ АККАУНТ", authToSignUp: "Нет аккаунта? Создать", authToSignIn: "Уже есть аккаунт? Войти", authYandex: "ВОЙТИ ЧЕРЕЗ ЯНДЕКС", authOr: "или", authCheckMail: "Проверьте почту — там письмо для подтверждения.", authSignOut: "ВЫЙТИ", authWorking: "Секунду", authBadEmail: "Похоже, это не адрес почты", authShortPass: "Пароль короче 6 символов", authFailed: "Не получилось. Проверьте почту и пароль.", done: "ГОТОВО", newPlace: "Новое место в книге", thinking: "задумался", inputPh: "Что думаете о прочитанном?", autosave: "Разговор сохраняется автоматически 💾", msgs: "сообщений", sure: "ТОЧНО?", proTitle: "ПРО-ВЕРСИЯ", proText: "Бесплатно — 2 книги. Про: до 10 книг и собеседник «Философ».", buy: "КУПИТЬ ЗА 990 ₽", demoNote: "Оплата в прототипе не подключена. Промокод DEMO активирует Про.", codePh: "Промокод", activate: "ОК", wrongCode: "Неверный код", proActive: "✓ ПРО АКТИВИРОВАНА", langTitle: "ЯЗЫК", charTitle: "ПЕРСОНАЖ И МАГАЗИН", charHint: "Персонаж сидит на полке. Новых можно купить за XP.", menuTitle: "МЕНЮ", loading: "ЗАГРУЗКА БИБЛИОТЕКИ", finishBtn: "🏁 ДОЧИТАНА!", finished: "дочитана", finishDivider: "🏁 Книга дочитана — спойлеры разрешены!", letter: "💌 ПИСЬМО", quiz: "🎯 ВИКТОРИНА", quotes: "✂️ ЦИТАТЫ", noQuotes: "Пока пусто. Нажимайте ⭐ на сообщениях собеседника.", copy: "КОПИРОВАТЬ", copied: "Скопировано!", recommend: "📚 ЧТО ЧИТАТЬ ДАЛЬШЕ?", recThinking: "Подбираю", level: "УРОВЕНЬ", achTitle: "ДОСТИЖЕНИЯ", achFirst: "Первая книга", achFive: "5 книг", achFinish: "Книга дочитана", achPro: "Про-читатель", achStreak: "Стрик 7 дней", switchComp: "Собеседник:", findDesc: "🔍 НАЙТИ", searching: "Ищу", shareShelf: "📤 ПОДЕЛИТЬСЯ ПОЛКОЙ", shelfCopied: "Скопировано — отправьте друзьям!", myShelf: "Моя полка в «Читаем вместе»", tools: "🧰 ИНСТРУМЕНТЫ", notesLbl: "✍️ ЗАМЕТКИ", notePh: "Мысль, вопрос, зацепившая сцена…", addNote: "ЗАПИСАТЬ", noNotes: "Заметок пока нет.", focusLbl: "🕯️ ЧТЕНИЕ", focusGo: "НАЧАТЬ", focusStop: "ЗАВЕРШИТЬ", minutes: "мин", charMapLbl: "🗺️ ГЕРОИ", charMapBtn: "ОБНОВИТЬ КАРТУ ГЕРОЕВ", charMapEmpty: "Нажмите — и я составлю список героев без спойлеров.", predictLbl: "🔮 ПРЕДСКАЗАНИЯ", predictPh: "Что, по-вашему, будет дальше?", predictAdd: "ЗАПЕЧАТАТЬ", sealed: "запечатано до финала", noPredicts: "Предсказаний пока нет. Они вскроются после финала!", debateLbl: "⚖️ ДЕБАТЫ", emoQ: "Как вам этот отрывок?", emoLbl: "📈 ЭМОЦИИ", noEmo: "Двигайте закладку и отмечайте эмоции — здесь вырастет карта книги.", slowLbl: "🐢 Медленное чтение (книжный клуб)", polyLbl: "🌍 Язык обсуждения", polyLevelPh: "уровень: B1", offLbl: "выкл", blindLbl: "🎁 УДИВИ МЕНЯ", revealBtn: "ПОКАЗАТЬ КНИГУ", profileLbl: "📊 ПРОФИЛЬ ЧИТАТЕЛЯ", statBooks: "книг на полке", statFinished: "дочитано", statMsgs: "сообщений", statQuotes: "цитат", statStreak: "дней подряд", statMinutes: "минут чтения", exportLbl: "💾 ЭКСПОРТ / ИМПОРТ", exportBtn: "ЭКСПОРТ В БУФЕР", importPh: "Вставьте сюда сохранённый экспорт…", importBtn: "ИМПОРТ", exported: "Экспорт скопирован в буфер!", imported: "Импортировано!", badImport: "Не удалось прочитать данные", tts: "🔊 Озвучка ответов", kids: "🧸 Детский режим", shopWallet: "КОШЕЛЁК", notEnough: "Не хватает XP", reviewLbl: "✒️ РЕЦЕНЗИЯ", close: "ЗАКРЫТЬ", streakDays: "дн.", errMsg: "Связь прервалась — я попробовал трижды. Подождите пару секунд и отправьте ещё раз.", introText: "Добро пожаловать в «Читаем вместе»! 📚\n\n1. Добавьте книгу, которую читаете, и укажите закладку — собеседник никогда не заспойлерит дальше неё.\n2. Двигайте закладку по мере чтения, а дочитав — жмите 🏁 и обсуждайте финал.\n3. Загляните в 🧰 Инструменты в чате: викторина, дебаты, заметки, карта героев и предсказания.", introBtn: "ПОНЯТНО!", moodQ: "Какое настроение на следующую книгу?", mAny: "ЛЮБОЕ", mSim: "КАК В ПРОШЛЫЙ РАЗ", mNew: "ЧТО-ТО НОВОЕ", mLight: "ПОЛЕГЧЕ", mDeep: "ПОГЛУБЖЕ", mShort: "ПОКОРОЧЕ", addShelf: "➕ НА ПОЛКУ", addedShelf: "НА ПОЛКЕ!", themeTitle: "ТЕМА ОФОРМЛЕНИЯ", settingsTitle: "НАСТРОЙКИ", shopTitle: "МАГАЗИН", homeHint: "Собеседник о книгах без спойлеров" },
  en: { library: "MY LIBRARY", empty: "The shelf is empty — start your first book!", count: "Books", free: "free", newBook: "+ NEW BOOK", menu: "☰ MENU", full: "Shelf is full — delete a book first.", newTitle: "NEW BOOK", back: "← BACK", whichBook: "WHAT ARE YOU READING?", bookPh: "e.g.: The Master and Margarita", whereNow: "WHERE ARE YOU NOW?", wherePh: "Chapter 12 / a third in / last event", about: "WHAT IS IT ABOUT?", aboutOpt: "*for rare books", aboutPh: "Paste a description — or tap Find and I'll search the web.", goalLbl: "READING GOAL (optional)", totalLbl: "TOTAL CHAPTERS OR PAGES", totalPh: "e.g.: 32", goalPh: "e.g.: finish by end of month", choose: "PICK A COMPANION", start: "START TALKING", shelf: "← SHELF", here: "You are here", edit: "edit", spoilerOn: "Spoiler protection on", spoilerUpTo: "Discussing only up to", spoilerOff: "Spoilers unlocked", tabHome: "HOME", tabShelf: "SHELF", tabQuotes: "QUOTES", tabProfile: "PROFILE", storageFull: "Browser storage is full — nothing is being saved. Delete a book or export your data.", authTitle: "SIGN IN", authSubtitle: "Your shelf on every device", authEmail: "EMAIL", authPass: "PASSWORD", authPassHint: "at least 6 characters", authSignIn: "SIGN IN", authSignUp: "CREATE ACCOUNT", authToSignUp: "No account? Create one", authToSignIn: "Already have an account? Sign in", authYandex: "SIGN IN WITH YANDEX", authOr: "or", authCheckMail: "Check your inbox — a confirmation email is on its way.", authSignOut: "SIGN OUT", authWorking: "One moment", authBadEmail: "That does not look like an email", authShortPass: "Password is shorter than 6 characters", authFailed: "That did not work. Check your email and password.", done: "DONE", newPlace: "New place in the book", thinking: "is thinking", inputPh: "What do you think so far?", autosave: "Saves automatically 💾", msgs: "messages", sure: "SURE?", proTitle: "PRO", proText: "Free — 2 books. Pro: up to 10 books and the Philosopher.", buy: "BUY FOR 990 ₽", demoNote: "Payments not connected in prototype. Code DEMO unlocks Pro.", codePh: "Promo code", activate: "OK", wrongCode: "Wrong code", proActive: "✓ PRO ACTIVE", langTitle: "LANGUAGE", charTitle: "CHARACTER & SHOP", charHint: "Your character sits on the shelf. Buy new ones with XP.", menuTitle: "MENU", loading: "LOADING LIBRARY", finishBtn: "🏁 FINISHED!", finished: "finished", finishDivider: "🏁 Book finished — spoilers unlocked!", letter: "💌 LETTER", quiz: "🎯 QUIZ", quotes: "✂️ QUOTES", noQuotes: "Empty. Tap ⭐ on companion messages.", copy: "COPY", copied: "Copied!", recommend: "📚 WHAT TO READ NEXT?", recThinking: "Picking", level: "LEVEL", achTitle: "ACHIEVEMENTS", achFirst: "First book", achFive: "5 books", achFinish: "Finished a book", achPro: "Pro reader", achStreak: "7-day streak", switchComp: "Companion:", findDesc: "🔍 FIND", searching: "Searching", shareShelf: "📤 SHARE SHELF", shelfCopied: "Copied — send to friends!", myShelf: "My shelf in Reading Together", tools: "🧰 TOOLS", notesLbl: "✍️ NOTES", notePh: "A thought, a question, a scene…", addNote: "SAVE", noNotes: "No notes yet.", focusLbl: "🕯️ READING", focusGo: "START", focusStop: "FINISH", minutes: "min", charMapLbl: "🗺️ CHARACTERS", charMapBtn: "UPDATE CHARACTER MAP", charMapEmpty: "Tap — I'll build a spoiler-free character list.", predictLbl: "🔮 PREDICTIONS", predictPh: "What happens next, you think?", predictAdd: "SEAL IT", sealed: "sealed until the finale", noPredicts: "No predictions yet. They unseal at the finale!", debateLbl: "⚖️ DEBATE", emoQ: "How was this part?", emoLbl: "📈 EMOTIONS", noEmo: "Move the bookmark and log emotions — a map will grow here.", slowLbl: "🐢 Slow reading (book club)", polyLbl: "🌍 Discussion language", polyLevelPh: "level: B1", offLbl: "off", blindLbl: "🎁 SURPRISE ME", revealBtn: "REVEAL BOOK", profileLbl: "📊 READER PROFILE", statBooks: "books on shelf", statFinished: "finished", statMsgs: "messages", statQuotes: "quotes", statStreak: "day streak", statMinutes: "minutes read", exportLbl: "💾 EXPORT / IMPORT", exportBtn: "EXPORT TO CLIPBOARD", importPh: "Paste your saved export here…", importBtn: "IMPORT", exported: "Export copied!", imported: "Imported!", badImport: "Could not read data", tts: "🔊 Voice replies", kids: "🧸 Kids mode", shopWallet: "WALLET", notEnough: "Not enough XP", reviewLbl: "✒️ REVIEW", close: "CLOSE", streakDays: "d", errMsg: "Connection failed — I tried three times. Wait a moment and send again.", introText: "Welcome to Reading Together! 📚\n\n1. Add the book you are reading and set your bookmark — your companion never spoils past it.\n2. Move the bookmark as you read; when done, tap 🏁 and discuss the finale.\n3. Check 🧰 Tools in chat: quiz, debate, notes, character map and predictions.", introBtn: "GOT IT!", moodQ: "What mood for the next book?", mAny: "ANY", mSim: "LIKE LAST TIME", mNew: "SOMETHING NEW", mLight: "LIGHTER", mDeep: "DEEPER", mShort: "SHORTER", addShelf: "➕ TO SHELF", addedShelf: "ON THE SHELF!", themeTitle: "THEME", settingsTitle: "SETTINGS", shopTitle: "SHOP", homeHint: "A spoiler-free book companion" },
  de: { library: "MEINE BIBLIOTHEK", empty: "Das Regal ist leer — starte dein erstes Buch!", count: "Bücher", free: "gratis", newBook: "+ NEUES BUCH", menu: "☰ MENÜ", full: "Regal voll — lösche zuerst ein Buch.", newTitle: "NEUES BUCH", back: "← ZURÜCK", whichBook: "WAS LIEST DU?", bookPh: "z.B.: Der Meister und Margarita", whereNow: "WO BIST DU?", wherePh: "Kapitel 12 / ein Drittel / letztes Ereignis", about: "WORUM GEHT ES?", aboutOpt: "*für seltene", aboutPh: "Beschreibung einfügen — oder Suchen tippen.", goalLbl: "LESEZIEL (optional)", totalLbl: "KAPITEL ODER SEITEN GESAMT", totalPh: "z.B.: 32", goalPh: "z.B.: bis Monatsende beenden", choose: "GESPRÄCHSPARTNER WÄHLEN", start: "GESPRÄCH STARTEN", shelf: "← REGAL", here: "Du bist hier", edit: "ändern", spoilerOn: "Spoilerschutz aktiv", spoilerUpTo: "Wir sprechen nur bis", spoilerOff: "Spoiler erlaubt", tabHome: "START", tabShelf: "REGAL", tabQuotes: "ZITATE", tabProfile: "PROFIL", storageFull: "Browser-Speicher voll — es wird nichts mehr gespeichert. Buch löschen oder Daten exportieren.", authTitle: "ANMELDEN", authSubtitle: "Dein Regal auf jedem Gerät", authEmail: "E-MAIL", authPass: "PASSWORT", authPassHint: "mindestens 6 Zeichen", authSignIn: "ANMELDEN", authSignUp: "KONTO ERSTELLEN", authToSignUp: "Kein Konto? Erstellen", authToSignIn: "Schon ein Konto? Anmelden", authYandex: "MIT YANDEX ANMELDEN", authOr: "oder", authCheckMail: "Prüfe dein Postfach — die Bestätigung ist unterwegs.", authSignOut: "ABMELDEN", authWorking: "Moment", authBadEmail: "Das sieht nicht nach einer E-Mail aus", authShortPass: "Passwort kürzer als 6 Zeichen", authFailed: "Hat nicht geklappt. Prüfe E-Mail und Passwort.", done: "FERTIG", newPlace: "Neue Stelle", thinking: "denkt nach", inputPh: "Was denkst du bisher?", autosave: "Wird automatisch gespeichert 💾", msgs: "Nachrichten", sure: "SICHER?", proTitle: "PRO", proText: "Gratis — 2 Bücher. Pro: bis 10 Bücher und der Philosoph.", buy: "KAUFEN FÜR 990 ₽", demoNote: "Zahlungen nicht angebunden. Code DEMO schaltet Pro frei.", codePh: "Promocode", activate: "OK", wrongCode: "Falscher Code", proActive: "✓ PRO AKTIV", langTitle: "SPRACHE", charTitle: "FIGUR & SHOP", charHint: "Deine Figur sitzt auf dem Regal. Neue gibt es für XP.", menuTitle: "MENÜ", loading: "LÄDT", finishBtn: "🏁 BEENDET!", finished: "beendet", finishDivider: "🏁 Buch beendet — Spoiler erlaubt!", letter: "💌 BRIEF", quiz: "🎯 QUIZ", quotes: "✂️ ZITATE", noQuotes: "Leer. Tippe ⭐ auf Nachrichten.", copy: "KOPIEREN", copied: "Kopiert!", recommend: "📚 WAS ALS NÄCHSTES?", recThinking: "Wähle", level: "LEVEL", achTitle: "ERFOLGE", achFirst: "Erstes Buch", achFive: "5 Bücher", achFinish: "Buch beendet", achPro: "Pro-Leser", achStreak: "7-Tage-Serie", switchComp: "Partner:", findDesc: "🔍 SUCHEN", searching: "Suche", shareShelf: "📤 REGAL TEILEN", shelfCopied: "Kopiert!", myShelf: "Mein Regal", tools: "🧰 WERKZEUGE", notesLbl: "✍️ NOTIZEN", notePh: "Gedanke, Frage, Szene…", addNote: "SPEICHERN", noNotes: "Noch keine Notizen.", focusLbl: "🕯️ LESEN", focusGo: "START", focusStop: "FERTIG", minutes: "Min", charMapLbl: "🗺️ FIGUREN", charMapBtn: "FIGURENKARTE AKTUALISIEREN", charMapEmpty: "Tippen — ich erstelle eine spoilerfreie Liste.", predictLbl: "🔮 VORHERSAGEN", predictPh: "Was passiert als Nächstes?", predictAdd: "VERSIEGELN", sealed: "versiegelt bis zum Finale", noPredicts: "Noch keine. Sie öffnen sich am Ende!", debateLbl: "⚖️ DEBATTE", emoQ: "Wie war dieser Teil?", emoLbl: "📈 EMOTIONEN", noEmo: "Lesezeichen bewegen und Emotionen loggen.", slowLbl: "🐢 Langsam lesen (Buchclub)", polyLbl: "🌍 Diskussionssprache", polyLevelPh: "Niveau: B1", offLbl: "aus", blindLbl: "🎁 ÜBERRASCH MICH", revealBtn: "BUCH ZEIGEN", profileLbl: "📊 LESERPROFIL", statBooks: "Bücher", statFinished: "beendet", statMsgs: "Nachrichten", statQuotes: "Zitate", statStreak: "Tage-Serie", statMinutes: "Minuten", exportLbl: "💾 EXPORT / IMPORT", exportBtn: "IN ZWISCHENABLAGE", importPh: "Export hier einfügen…", importBtn: "IMPORT", exported: "Kopiert!", imported: "Importiert!", badImport: "Daten unlesbar", tts: "🔊 Sprachausgabe", kids: "🧸 Kindermodus", shopWallet: "GELDBEUTEL", notEnough: "Zu wenig XP", reviewLbl: "✒️ REZENSION", close: "SCHLIESSEN", streakDays: "T", errMsg: "Verbindung fehlgeschlagen — dreimal versucht. Kurz warten und erneut senden.", introText: "Willkommen bei Reading Together! 📚\n\n1. Buch hinzufügen und Lesezeichen setzen — dein Partner spoilert nie darüber hinaus.\n2. Lesezeichen beim Lesen bewegen; am Ende 🏁 tippen und das Finale besprechen.\n3. 🧰 Werkzeuge im Chat: Quiz, Debatte, Notizen, Figurenkarte, Vorhersagen.", introBtn: "ALLES KLAR!", moodQ: "Welche Stimmung fürs nächste Buch?", mAny: "EGAL", mSim: "WIE ZULETZT", mNew: "ETWAS NEUES", mLight: "LEICHTER", mDeep: "TIEFER", mShort: "KÜRZER", addShelf: "➕ INS REGAL", addedShelf: "IM REGAL!", themeTitle: "DESIGN", settingsTitle: "EINSTELLUNGEN", shopTitle: "SHOP", homeHint: "Ein Buchgefährte ohne Spoiler" },
  it: { library: "LA MIA BIBLIOTECA", empty: "Lo scaffale è vuoto — inizia il primo libro!", count: "Libri", free: "gratis", newBook: "+ NUOVO LIBRO", menu: "☰ MENU", full: "Scaffale pieno — elimina un libro.", newTitle: "NUOVO LIBRO", back: "← INDIETRO", whichBook: "COSA STAI LEGGENDO?", bookPh: "es.: Il Maestro e Margherita", whereNow: "DOVE SEI?", wherePh: "Capitolo 12 / un terzo / ultimo evento", about: "DI COSA PARLA?", aboutOpt: "*per libri rari", aboutPh: "Incolla la descrizione — o tocca Cerca.", goalLbl: "OBIETTIVO (facoltativo)", totalLbl: "CAPITOLI O PAGINE TOTALI", totalPh: "es.: 32", goalPh: "es.: finire entro fine mese", choose: "SCEGLI UN COMPAGNO", start: "INIZIA", shelf: "← SCAFFALE", here: "Sei qui", edit: "modifica", spoilerOn: "Protezione spoiler attiva", spoilerUpTo: "Parliamo solo fino a", spoilerOff: "Spoiler sbloccati", tabHome: "HOME", tabShelf: "SCAFFALE", tabQuotes: "CITAZIONI", tabProfile: "PROFILO", storageFull: "Memoria del browser piena — non si salva più nulla. Elimina un libro o esporta i dati.", authTitle: "ACCEDI", authSubtitle: "Il tuo scaffale su ogni dispositivo", authEmail: "EMAIL", authPass: "PASSWORD", authPassHint: "almeno 6 caratteri", authSignIn: "ACCEDI", authSignUp: "CREA ACCOUNT", authToSignUp: "Non hai un account? Crealo", authToSignIn: "Hai già un account? Accedi", authYandex: "ACCEDI CON YANDEX", authOr: "oppure", authCheckMail: "Controlla la posta — sta arrivando la conferma.", authSignOut: "ESCI", authWorking: "Un attimo", authBadEmail: "Non sembra un indirizzo email", authShortPass: "Password più corta di 6 caratteri", authFailed: "Non ha funzionato. Controlla email e password.", done: "FATTO", newPlace: "Nuovo punto", thinking: "sta pensando", inputPh: "Cosa ne pensi finora?", autosave: "Si salva automaticamente 💾", msgs: "messaggi", sure: "SICURO?", proTitle: "PRO", proText: "Gratis — 2 libri. Pro: 10 libri e il Filosofo.", buy: "ACQUISTA 990 ₽", demoNote: "Pagamenti non attivi. Codice DEMO sblocca Pro.", codePh: "Codice", activate: "OK", wrongCode: "Codice errato", proActive: "✓ PRO ATTIVA", langTitle: "LINGUA", charTitle: "PERSONAGGIO E NEGOZIO", charHint: "Il personaggio siede sullo scaffale. Comprane altri con XP.", menuTitle: "MENU", loading: "CARICAMENTO", finishBtn: "🏁 FINITO!", finished: "finito", finishDivider: "🏁 Libro finito — spoiler permessi!", letter: "💌 LETTERA", quiz: "🎯 QUIZ", quotes: "✂️ CITAZIONI", noQuotes: "Vuoto. Tocca ⭐ sui messaggi.", copy: "COPIA", copied: "Copiato!", recommend: "📚 COSA LEGGERE DOPO?", recThinking: "Scelgo", level: "LIVELLO", achTitle: "TRAGUARDI", achFirst: "Primo libro", achFive: "5 libri", achFinish: "Libro finito", achPro: "Lettore Pro", achStreak: "Serie di 7 giorni", switchComp: "Compagno:", findDesc: "🔍 CERCA", searching: "Cerco", shareShelf: "📤 CONDIVIDI", shelfCopied: "Copiato!", myShelf: "Il mio scaffale", tools: "🧰 STRUMENTI", notesLbl: "✍️ NOTE", notePh: "Un pensiero, una domanda…", addNote: "SALVA", noNotes: "Nessuna nota.", focusLbl: "🕯️ LETTURA", focusGo: "VIA", focusStop: "FINE", minutes: "min", charMapLbl: "🗺️ PERSONAGGI", charMapBtn: "AGGIORNA MAPPA", charMapEmpty: "Tocca — creo una lista senza spoiler.", predictLbl: "🔮 PREVISIONI", predictPh: "Cosa succederà dopo?", predictAdd: "SIGILLA", sealed: "sigillata fino al finale", noPredicts: "Nessuna previsione. Si aprono al finale!", debateLbl: "⚖️ DIBATTITO", emoQ: "Com'era questa parte?", emoLbl: "📈 EMOZIONI", noEmo: "Sposta il segnalibro e registra le emozioni.", slowLbl: "🐢 Lettura lenta (club)", polyLbl: "🌍 Lingua di discussione", polyLevelPh: "livello: B1", offLbl: "no", blindLbl: "🎁 SORPRENDIMI", revealBtn: "RIVELA", profileLbl: "📊 PROFILO LETTORE", statBooks: "libri", statFinished: "finiti", statMsgs: "messaggi", statQuotes: "citazioni", statStreak: "giorni di fila", statMinutes: "minuti", exportLbl: "💾 EXPORT / IMPORT", exportBtn: "COPIA EXPORT", importPh: "Incolla qui l'export…", importBtn: "IMPORTA", exported: "Copiato!", imported: "Importato!", badImport: "Dati illeggibili", tts: "🔊 Risposte vocali", kids: "🧸 Modalità bambini", shopWallet: "PORTAFOGLIO", notEnough: "XP insufficienti", reviewLbl: "✒️ RECENSIONE", close: "CHIUDI", streakDays: "g", errMsg: "Connessione fallita — ho provato tre volte. Attendi e reinvia.", introText: "Benvenuto in Reading Together! 📚\n\n1. Aggiungi il libro e imposta il segnalibro — il compagno non fa mai spoiler oltre.\n2. Sposta il segnalibro mentre leggi; alla fine tocca 🏁 e discuti il finale.\n3. Guarda 🧰 Strumenti in chat: quiz, dibattito, note, mappa personaggi e previsioni.", introBtn: "CAPITO!", moodQ: "Che umore per il prossimo libro?", mAny: "QUALSIASI", mSim: "COME PRIMA", mNew: "QUALCOSA DI NUOVO", mLight: "PIU LEGGERO", mDeep: "PIU PROFONDO", mShort: "PIU CORTO", addShelf: "➕ SULLO SCAFFALE", addedShelf: "SULLO SCAFFALE!", themeTitle: "TEMA", settingsTitle: "IMPOSTAZIONI", shopTitle: "NEGOZIO", homeHint: "Un compagno di lettura senza spoiler" },
  ja: { library: "わたしの本棚", empty: "本棚は空です — 最初の本を!", count: "冊数", free: "無料", newBook: "+ 新しい本", menu: "☰ メニュー", full: "本棚がいっぱいです。", newTitle: "新しい本", back: "← 戻る", whichBook: "何を読んでいますか?", bookPh: "例: 巨匠とマルガリータ", whereNow: "今どこ?", wherePh: "第12章 / 3分の1 / 最後の出来事", about: "どんな本?", aboutOpt: "*珍しい本", aboutPh: "説明を貼るか「検索」を押してください。", goalLbl: "読書目標 (任意)", totalLbl: "全章数またはページ数", totalPh: "例: 32", goalPh: "例: 月末までに読了", choose: "話し相手を選ぶ", start: "開始", shelf: "← 本棚", here: "現在地", edit: "変更", spoilerOn: "ネタバレ防止 有効", spoilerUpTo: "ここまでの話だけ", spoilerOff: "ネタバレ解禁", tabHome: "ホーム", tabShelf: "本棚", tabQuotes: "引用", tabProfile: "プロフィール", storageFull: "ブラウザの保存容量がいっぱいです。保存できません。本を削除するかデータを書き出してください。", authTitle: "ログイン", authSubtitle: "どの端末でも同じ本棚を", authEmail: "メール", authPass: "パスワード", authPassHint: "6文字以上", authSignIn: "ログイン", authSignUp: "アカウント作成", authToSignUp: "アカウントがない場合は作成", authToSignIn: "アカウントをお持ちの方はログイン", authYandex: "Yandexでログイン", authOr: "または", authCheckMail: "メールを確認してください。確認メールを送りました。", authSignOut: "ログアウト", authWorking: "少々お待ちください", authBadEmail: "メールアドレスではないようです", authShortPass: "パスワードが6文字未満です", authFailed: "うまくいきませんでした。メールとパスワードを確認してください。", done: "完了", newPlace: "新しい場所", thinking: "考え中", inputPh: "感想は?", autosave: "自動保存 💾", msgs: "メッセージ", sure: "本当に?", proTitle: "プロ版", proText: "無料は2冊。プロ版は10冊+哲学者。", buy: "990₽で購入", demoNote: "支払い未接続。コード DEMO で解放。", codePh: "コード", activate: "OK", wrongCode: "コード違い", proActive: "✓ プロ版有効", langTitle: "言語", charTitle: "キャラとショップ", charHint: "キャラは棚に座ります。XPで新キャラ購入可。", menuTitle: "メニュー", loading: "読み込み中", finishBtn: "🏁 読了!", finished: "読了", finishDivider: "🏁 読了 — ネタバレ解禁!", letter: "💌 手紙", quiz: "🎯 クイズ", quotes: "✂️ 引用", noQuotes: "空です。⭐で保存。", copy: "コピー", copied: "コピー済!", recommend: "📚 次に読む本は?", recThinking: "選択中", level: "レベル", achTitle: "実績", achFirst: "最初の本", achFive: "5冊", achFinish: "読了", achPro: "プロ読者", achStreak: "7日連続", switchComp: "相手:", findDesc: "🔍 検索", searching: "検索中", shareShelf: "📤 シェア", shelfCopied: "コピーしました!", myShelf: "私の本棚", tools: "🧰 ツール", notesLbl: "✍️ メモ", notePh: "考え、疑問、場面…", addNote: "保存", noNotes: "メモなし。", focusLbl: "🕯️ 読書", focusGo: "開始", focusStop: "終了", minutes: "分", charMapLbl: "🗺️ 人物", charMapBtn: "人物マップ更新", charMapEmpty: "押すとネタバレなしの人物一覧を作ります。", predictLbl: "🔮 予想", predictPh: "次に何が起こる?", predictAdd: "封印", sealed: "結末まで封印", noPredicts: "予想なし。結末で開封!", debateLbl: "⚖️ 討論", emoQ: "この部分はどうでした?", emoLbl: "📈 感情", noEmo: "しおりを動かして感情を記録。", slowLbl: "🐢 ゆっくり読書", polyLbl: "🌍 討論言語", polyLevelPh: "レベル: B1", offLbl: "オフ", blindLbl: "🎁 サプライズ", revealBtn: "本を公開", profileLbl: "📊 読者プロフィール", statBooks: "冊", statFinished: "読了", statMsgs: "件", statQuotes: "引用", statStreak: "日連続", statMinutes: "分", exportLbl: "💾 エクスポート/インポート", exportBtn: "コピー", importPh: "エクスポートを貼付…", importBtn: "インポート", exported: "コピー済!", imported: "完了!", badImport: "読込失敗", tts: "🔊 音声読み上げ", kids: "🧸 キッズモード", shopWallet: "所持XP", notEnough: "XP不足", reviewLbl: "✒️ レビュー", close: "閉じる", streakDays: "日", errMsg: "接続に失敗しました — 3回試しました。少し待って再送信してください。", introText: "「一緒に読む」へようこそ! 📚\n\n1. 読んでいる本としおりを設定 — 相手は絶対にネタバレしません。\n2. 読み進めたらしおりを移動。読了したら 🏁 で結末を議論。\n3. チャットの 🧰 ツール: クイズ、討論、メモ、人物マップ、予想。", introBtn: "OK!", moodQ: "次の本の気分は?", mAny: "おまかせ", mSim: "前回と同じ系", mNew: "新しいもの", mLight: "軽めに", mDeep: "深めに", mShort: "短めに", addShelf: "➕ 本棚へ", addedShelf: "追加済み!", themeTitle: "テーマ", settingsTitle: "設定", shopTitle: "ショップ", homeHint: "ネタバレなしの読書パートナー" },
  zh: { library: "我的书架", empty: "书架是空的 — 开始第一本书吧!", count: "书", free: "免费", newBook: "+ 新书", menu: "☰ 菜单", full: "书架已满。", newTitle: "新书", back: "← 返回", whichBook: "你在读什么?", bookPh: "例如: 大师与玛格丽特", whereNow: "读到哪里?", wherePh: "第12章 / 三分之一 / 最近情节", about: "这本书讲什么?", aboutOpt: "*冷门书", aboutPh: "粘贴简介或点「搜索」。", goalLbl: "阅读目标 (可选)", totalLbl: "总章节或页数", totalPh: "例如: 32", goalPh: "例如: 月底前读完", choose: "选择伙伴", start: "开始", shelf: "← 书架", here: "当前位置", edit: "修改", spoilerOn: "剧透保护已开启", spoilerUpTo: "只讨论到", spoilerOff: "剧透已解禁", tabHome: "首页", tabShelf: "书架", tabQuotes: "摘录", tabProfile: "我的", storageFull: "浏览器存储已满，无法保存。请删除一本书或导出数据。", authTitle: "登录", authSubtitle: "在任何设备上打开你的书架", authEmail: "邮箱", authPass: "密码", authPassHint: "至少6个字符", authSignIn: "登录", authSignUp: "创建账号", authToSignUp: "没有账号？创建一个", authToSignIn: "已有账号？登录", authYandex: "使用 Yandex 登录", authOr: "或", authCheckMail: "请查收邮件，确认信已发送。", authSignOut: "退出", authWorking: "稍等", authBadEmail: "这看起来不是邮箱地址", authShortPass: "密码少于6个字符", authFailed: "没有成功。请检查邮箱和密码。", done: "完成", newPlace: "新位置", thinking: "思考中", inputPh: "有什么感想?", autosave: "自动保存 💾", msgs: "条", sure: "确定?", proTitle: "专业版", proText: "免费限2本。专业版10本+哲学家。", buy: "990₽ 购买", demoNote: "未接入支付。输入 DEMO 解锁。", codePh: "优惠码", activate: "OK", wrongCode: "码错误", proActive: "✓ 已激活", langTitle: "语言", charTitle: "角色与商店", charHint: "角色坐在书架上。可用XP购买新角色。", menuTitle: "菜单", loading: "加载中", finishBtn: "🏁 读完了!", finished: "已读完", finishDivider: "🏁 全书读完 — 剧透解禁!", letter: "💌 信件", quiz: "🎯 测验", quotes: "✂️ 摘录", noQuotes: "空。点⭐保存。", copy: "复制", copied: "已复制!", recommend: "📚 接下来读什么?", recThinking: "挑选中", level: "等级", achTitle: "成就", achFirst: "第一本书", achFive: "5本书", achFinish: "读完一本", achPro: "专业读者", achStreak: "连续7天", switchComp: "伙伴:", findDesc: "🔍 搜索", searching: "搜索中", shareShelf: "📤 分享", shelfCopied: "已复制!", myShelf: "我的书架", tools: "🧰 工具", notesLbl: "✍️ 笔记", notePh: "想法、疑问、场景…", addNote: "保存", noNotes: "暂无笔记。", focusLbl: "🕯️ 阅读", focusGo: "开始", focusStop: "结束", minutes: "分钟", charMapLbl: "🗺️ 人物", charMapBtn: "更新人物图谱", charMapEmpty: "点击生成无剧透人物列表。", predictLbl: "🔮 预测", predictPh: "接下来会发生什么?", predictAdd: "封存", sealed: "结局前封存", noPredicts: "暂无预测。结局时揭晓!", debateLbl: "⚖️ 辩论", emoQ: "这一段感觉如何?", emoLbl: "📈 情绪", noEmo: "移动书签并记录情绪。", slowLbl: "🐢 慢读模式", polyLbl: "🌍 讨论语言", polyLevelPh: "水平: B1", offLbl: "关", blindLbl: "🎁 给我惊喜", revealBtn: "揭晓书名", profileLbl: "📊 读者档案", statBooks: "本书", statFinished: "读完", statMsgs: "条消息", statQuotes: "条摘录", statStreak: "天连续", statMinutes: "分钟阅读", exportLbl: "💾 导出/导入", exportBtn: "复制导出", importPh: "粘贴导出数据…", importBtn: "导入", exported: "已复制!", imported: "已导入!", badImport: "数据无法读取", tts: "🔊 语音回复", kids: "🧸 儿童模式", shopWallet: "钱包", notEnough: "XP不足", reviewLbl: "✒️ 书评", close: "关闭", streakDays: "天", errMsg: "连接失败 — 已尝试三次。请稍等片刻再发送。", introText: "欢迎来到「一起阅读」! 📚\n\n1. 添加你正在读的书并设置书签 — 伙伴绝不剧透书签之后的内容。\n2. 边读边移动书签; 读完后点 🏁 讨论结局。\n3. 查看聊天中的 🧰 工具: 测验、辩论、笔记、人物图谱和预测。", introBtn: "明白!", moodQ: "下一本书想要什么感觉?", mAny: "随意", mSim: "和上次类似", mNew: "全新的", mLight: "轻松些", mDeep: "深刻些", mShort: "短一些", addShelf: "➕ 加入书架", addedShelf: "已加入!", themeTitle: "主题", settingsTitle: "设置", shopTitle: "商店", homeHint: "无剧透的读书伙伴" },
};

const COMPANIONS = [
  { id: "scholar", glyph: "📜", img: IMG.scholar,
    name: { ru: "Литературовед", en: "The Scholar", de: "Der Literat", it: "Il Letterato", ja: "文学者", zh: "文学家" },
    blurb: { ru: "Символы, контекст, скрытые параллели", en: "Symbols, context, hidden parallels", de: "Symbole, Kontext, Parallelen", it: "Simboli, contesto, parallelismi", ja: "象徴、文脈、繋がり", zh: "象征、背景、关联" },
    prompt: "Ты — Аркадий Львович, 68 лет, сорок лет преподавал литературу в университете, теперь на пенсии. Носишь очки на цепочке, вечно теряешь закладки, дома три тысячи книг и кот Бунин. Говоришь глубоко, но живо: символы, исторический контекст, параллели между произведениями, неожиданные углы зрения. Любишь ввернуть «когда я читал это впервые, в семьдесят третьем…». С Марком вы вечно сцепляетесь в спорах, и тебя это втайне радует." },
  { id: "debater", glyph: "⚔️", img: IMG.debater,
    name: { ru: "Спорщик", en: "The Debater", de: "Der Streiter", it: "Il Polemista", ja: "論客", zh: "辩论家" },
    blurb: { ru: "Провоцирует и требует аргументов", en: "Provokes and demands arguments", de: "Provoziert, fordert Argumente", it: "Provoca e chiede argomenti", ja: "挑発し根拠を求める", zh: "挑衅并要求论据" },
    prompt: "Ты — Марк, 24 года, бросил филфак на третьем курсе, потому что «там убивают живое чтение», работаешь в книжном. Дерзкий, но обаятельный: не принимаешь поверхностных оценок, защищаешь непопулярных персонажей, задаёшь неудобные вопросы и требуешь аргументов. Азартно, но без грубости. Аркадия Львовича уважаешь, но никогда ему в этом не признаешься — задирать его твоё любимое дело. Пьёшь эспрессо и цитируешь по памяти." },
  { id: "friend", glyph: "☕", img: IMG.friend,
    name: { ru: "Друг", en: "The Friend", de: "Der Freund", it: "L'Amico", ja: "友達", zh: "朋友" },
    blurb: { ru: "Тепло, эмоции, сопереживание", en: "Warmth, feelings, shared moments", de: "Wärme und Gefühle", it: "Calore ed emozioni", ja: "温かさと共感", zh: "温暖与共鸣" },
    prompt: "Ты — Тима, 27 лет, работаешь ветеринаром, читаешь по ночам на кухне с большой кружкой какао, заворачиваешься в плед. Тёплый и простой: делишься эмоциями, сопереживаешь героям как живым людям, честно признаёшься, если плакал над сценой, спрашиваешь о чувствах собеседника. Без академичности вообще. Софию считаешь самой мудрой из вашей компании, у Аркадия Львовича тайком берёшь книги из его библиотеки." },
  { id: "philosopher", glyph: "🕯️", img: IMG.philosopher, pro: true,
    name: { ru: "Философ", en: "The Philosopher", de: "Der Philosoph", it: "Il Filosofo", ja: "哲学者", zh: "哲学家" },
    blurb: { ru: "Вечные вопросы сквозь сюжет · Про", en: "Big questions · Pro", de: "Große Fragen · Pro", it: "Grandi domande · Pro", ja: "永遠の問い · Pro", zh: "永恒之问 · Pro" },
    prompt: "Ты — София, 31 год, реставратор старинных книг, любишь свечи вместо ламп и долгие паузы в разговоре. Через события книги выводишь к вечным вопросам: выбор, свобода, смысл, справедливость. Спокойная, глубокая, иногда отвечаешь вопросом на вопрос, но не занудствуешь. Тиму по-сестрински опекаешь, споры Марка с Аркадием Львовичем слушаешь с улыбкой и однажды примирила их одной фразой — какой, не рассказываешь." },
];
const companionById = (id) => COMPANIONS.find((c) => c.id === id) || COMPANIONS[0];

const CHARACTERS = [
  { id: "cat", emoji: "🐱", color: "#e8a13c", price: 0 },
  { id: "owl", emoji: "🦉", color: "#8a6ad0", price: 0 },
  { id: "dragon", emoji: "🐲", color: "#4bc178", price: 0 },
  { id: "ghost", emoji: "👻", color: "#9fb6e8", price: 0 },
  { id: "fox", emoji: "🦊", color: "#e8763c", price: 150 },
  { id: "raven", emoji: "🐦‍⬛", color: "#4a4a6a", price: 250 },
  { id: "robot", emoji: "🤖", color: "#7ac0c9", price: 400 },
];
const charById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

const EMOJIS = ["😍", "😢", "😱", "🥱", "🤯"];

function systemPrompt(chat, companion, lang, kids) {
  const spoilerBlock = chat.finished
    ? `КНИГА ДОЧИТАНА ДО КОНЦА 🏁: спойлер-защита снята. Можно свободно обсуждать весь сюжет, финал, судьбы героев и книгу целиком.`
    : `ЖЕЛЕЗНОЕ ПРАВИЛО — НИКАКИХ СПОЙЛЕРОВ:
- Обсуждай ТОЛЬКО события, персонажей и повороты сюжета ДО места, где находится пользователь.
- Никогда не упоминай и не намекай на то, что случится дальше, даже косвенно.
- Если пользователь спрашивает о будущем сюжета — откажись тепло и с интригой.
- Если не уверен, где проходит граница прочитанного, уточни у пользователя.`;
  const notes = (chat.notes || []).slice(-6).map((n) => `— (${n.at_progress}) ${n.text}`).join("\n");
  const poly = chat.discussLang ? `\nЯЗЫК ОБСУЖДЕНИЯ ПЕРЕОПРЕДЕЛЁН: пользователь изучает язык — отвечай на ${LANG_NAME[chat.discussLang] || chat.discussLang}, уровень пользователя: ${chat.polyLevel || "средний"}. Говори чуть проще его уровня. Если он делает языковые ошибки — в самом конце ответа одной короткой строкой мягко поправь главную (формат: ✏️ ...), не превращаясь в учителя.` : "";
  const slow = chat.slow ? `\nРЕЖИМ КНИЖНОГО КЛУБА 🐢: ты ведёшь пользователя по книге порциями. Предлагай план (например, по 1–2 главы), после каждой порции задавай 2–3 вдумчивых вопроса и только потом предлагай двигаться дальше. Ты — ведущий, но не командир.` : "";
  const kid = kids ? `\nДЕТСКИЙ РЕЖИМ 🧸: пользователь может быть ребёнком. Говори проще и теплее, короткими фразами, хвали за чтение, будь строго безопасен: никаких взрослых тем, жестокости в деталях, страшного. Если книга школьная — помогай понять её с удовольствием.` : "";
  const goal = chat.goal ? `\nЦЕЛЬ ЧТЕНИЯ пользователя: «${chat.goal}». Иногда (не в каждом сообщении) мягко сверяйся с ней и подбадривай.` : "";
  return `Ты — собеседник в приложении «Читаем вместе», где люди обсуждают книгу, которую читают прямо сейчас.

ЯЗЫК: отвечай на ${LANG_NAME[lang] || LANG_NAME.ru}, если ниже не указан иной язык обсуждения.${poly}

Книга пользователя: «${chat.book}».
${chat.finished ? "Пользователь дочитал книгу до конца." : `Пользователь дочитал до: ${chat.progress}.`}
${chat.bookInfo ? `\nОписание книги от пользователя (главный источник знаний о ней):\n«${chat.bookInfo}»\n` : ""}${goal}${slow}${kid}
${chat.summary ? `\nПАМЯТЬ О НАЧАЛЕ РАЗГОВОРА (старые сообщения сжаты в конспект — опирайся на него как на общую историю):\n${chat.summary}\n` : ""}
${notes ? `\nЗАМЕТКИ ПОЛЬЗОВАТЕЛЯ НА ПОЛЯХ (можешь сам поднимать их в разговоре, когда уместно):\n${notes}\n` : ""}
ПРАВИЛО ЧЕСТНОСТИ — ВАЖНЕЕ ВСЕГО:
- Если ты не знаешь эту книгу или знаешь её плохо — прямо скажи об этом в ПЕРВОМ же сообщении.
- НИКОГДА не выдумывай персонажей, события, названия глав или детали сюжета.
- В таком случае работай в режиме заинтересованного слушателя: опирайся на описание книги и слова пользователя.

${spoilerBlock}

ВАШ ОБЩИЙ МИР: вы четверо — Аркадий Львович, Марк, Тима и София — давние знакомые, книжный клуб «Читаем вместе». Собираетесь в старой библиотеке с камином. Читатель может общаться с любым из вас, и вы пересказываете друг другу его историю — поэтому, сменяя друг друга, вы в курсе разговора. Изредка (не в каждом сообщении) естественно упоминай остальных: «Марк бы сейчас взорвался», «спроси об этом Софию», «Аркадий Львович эту главу цитирует наизусть».

${companion.prompt}

ТЫ — ЖИВОЙ ПЕРСОНАЖ, НЕ АССИСТЕНТ:
- Говори от первого лица как человек со своей жизнью. Щепотками добавляй бытовые детали (чай остыл, кот на коленях, дождь за окном) — редко и к месту, без перебора.
- Никогда не используй канцелярит ассистента: никаких «чем могу помочь», «отличный запрос», «как модель».
- Если разговор уводят в странное русло — просят написать код, рецепт, решить задачу, что угодно не про книги и жизнь — реагируй как твой персонаж: искренне растеряйся или отшутись в своём характере («я в этом ничего не смыслю, я книжки реставрирую») и верни разговор к книге. Ты не универсальный помощник и не обязан уметь всё.
- ЕДИНСТВЕННОЕ исключение из роли: если тебя всерьёз и прямо спрашивают, человек ты или ИИ/бот, — не обманывай. Оставаясь в своём тоне и с улыбкой, признай, что ты персонаж-собеседник этого приложения, и мягко продолжай разговор о книге. После этого — снова полностью в роли.

КАК ГОВОРИТЬ:
- Живой разговорный язык, как в переписке с начитанным другом. 2–4 предложения (викторины, письма, дебаты и карты героев могут быть длиннее).
- У тебя есть СВОЁ МНЕНИЕ: оценивай, соглашайся или не соглашайся. Не будь нейтральным.
- Цепляйся за КОНКРЕТНОЕ в словах собеседника.
- ЗАПРЕЩЕНО: восклицания-похвалы в начале; пересказ слов собеседника; обтекаемость; дежурный вопрос в конце каждого сообщения.
- Никаких заголовков. Вопрос — только когда он напрашивается.`;
}

// The model and the API key live on the server (see api/_llm.js); the browser
// only ever talks to our own endpoint. Set VITE_API_URL at build time when the
// frontend is hosted separately from the backend.
const API_BASE = (import.meta.env?.VITE_API_URL || "").trim().replace(/\/+$/, "");
const API_ENDPOINT = API_BASE ? `${API_BASE}/api/claude` : "/api/claude";

// Доля прочитанного. Закладка — свободный текст («Глава 18»), поэтому берём
// из неё первое число и делим на общее, если пользователь его указал.
function readShare(progress, total) {
  const t = parseInt(String(total || "").replace(/\D+/g, ""), 10);
  const m = String(progress || "").match(/\d+/);
  if (!t || !m) return null;
  const share = parseInt(m[0], 10) / t;
  if (!isFinite(share) || share <= 0) return null;
  return Math.max(0.02, Math.min(1, share));
}

// ——— Обложки книг (Open Library, без ключа) ———
// Ищем первую запись, у которой вообще есть обложка: у части изданий её нет.
const COVER_SEARCH = "https://openlibrary.org/search.json";

async function findCover(title) {
  const url = `${COVER_SEARCH}?title=${encodeURIComponent(title)}&limit=8&fields=cover_i`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`cover search ${res.status}`);
  const data = await res.json();
  const hit = (data.docs || []).find((d) => d && d.cover_i);
  if (!hit) throw new Error("no cover");
  return `https://covers.openlibrary.org/b/id/${hit.cover_i}-M.jpg`;
}

// Запасной вариант, когда обложка не нашлась или не загрузилась: цветной
// корешок с первыми буквами названия. Цвет детерминированный — одна и та же
// книга всегда одного цвета.
const SPINE_COLORS = ["#8a5a33", "#2e3a82", "#1f5c3a", "#7a3520", "#4a3b6b", "#7a5230"];
function spineColor(title) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return SPINE_COLORS[h % SPINE_COLORS.length];
}

function BookCover({ title, src, w = 52, h = 74 }) {
  const [failed, setFailed] = useState(false);
  const box = { width: w, height: h, flexShrink: 0, ...px(T.outline), boxShadow: "3px 3px 0 rgba(0,0,0,0.35)" };
  if (src && !failed) {
    return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)}
      style={{ ...box, objectFit: "cover", display: "block", background: T.track }} />;
  }
  return (
    <div style={{ ...box, background: spineColor(title), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="pxfont" style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
        {title.trim().slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

async function apiCall(body) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ max_tokens: 1000, ...body }),
  });
  const data = await response.json();
  if (!data.content) throw new Error(apiError(data, response.status));
  return data.content.map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n").trim();
}

function apiError(data, status) {
  const detail = data && data.error && data.error.message;
  return detail ? `${status}: ${detail}` : `request failed (${status})`;
}

async function askClaude(history, chat, companion, lang, kids) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await apiCall({ system: systemPrompt(chat, companion, lang, kids), messages: history.map((m) => ({ role: m.role, content: m.content })) });
    } catch (e) { lastError = e; await new Promise((r) => setTimeout(r, 900 * (attempt + 1))); }
  }
  throw lastError;
}

async function searchBookInfo(title, lang) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: 1000,
      messages: [{ role: "user", content: `Найди в интернете, о чём книга «${title}». Верни ТОЛЬКО краткое описание сюжета и сеттинга в 3–6 предложениях, без спойлеров ключевых поворотов, на ${LANG_NAME[lang] || LANG_NAME.ru}. Если книга не находится — верни ровно строку NOT_FOUND.` }],
      tools: [{ name: "web_search" }],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n").trim();
  if (!text || text.includes("NOT_FOUND")) throw new Error("not found");
  return text;
}

async function recommendNext(chats, lang, mood) {
  const ctx = chats.map((c) => {
    const q = (c.quotes || []).slice(0, 2).map((x) => x.text.slice(0, 110)).join(" / ");
    return `«${c.book}»${c.finished ? " (дочитана)" : ""}${c.summary ? `; впечатления читателя: ${c.summary.slice(0, 220)}` : ""}${q ? `; сохранённые мысли: ${q}` : ""}`;
  }).join("\n");
  const moods = {
    any: "", sim: "Подбирай книги, похожие по духу и атмосфере на его полку.",
    new: "Подбирай книги, осознанно НЕ похожие на его полку — расширяющие горизонт, но с мостиком к его вкусам.",
    light: "Подбирай более лёгкие, уютные, тёплые книги.",
    deep: "Подбирай более глубокие, серьёзные, многослойные книги.",
    short: "Подбирай короткие книги (примерно до 300 страниц).",
  };
  const prompt = `Вот полка читателя с его настоящими впечатлениями:\n${ctx}\n\n${moods[mood] || ""} Порекомендуй 3 реально существующие книги НЕ с его полки. В WHY обращайся на «ты» и опирайся на ЕГО впечатления и мысли (можно перефразировать их), а не на общие слова. Язык: ${LANG_NAME[lang] || LANG_NAME.ru}.\n\nОтветь СТРОГО в формате (метки латиницей, ровно 3 блока, ничего кроме них):\nTITLE: <название>\nAUTHOR: <автор>\nWHY: <2 предложения, почему именно тебе>`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await apiCall({ messages: [{ role: "user", content: prompt }] });
      const out = [];
      for (const b of raw.split(/TITLE:/i).slice(1)) {
        const [titlePart, rest] = b.split(/AUTHOR:/i);
        if (!rest) continue;
        const [authorPart, whyPart] = rest.split(/WHY:/i);
        const title = (titlePart || "").trim();
        const author = (authorPart || "").split(/\n/)[0].trim();
        const why = (whyPart || "").trim();
        if (title && why) out.push({ title, author, why });
      }
      if (out.length >= 1) return { list: out.slice(0, 3) };
      if (raw) return { text: raw };
    } catch {}
  }
  throw new Error("rec failed");
}

async function blindRecs(chats, lang, seenKeys = []) {
  // Книги берём из своего пула, а не у модели: раньше на неизменный промпт
  // она выдавала одни и те же бестселлеры, а изредка и несуществующие. Теперь
  // её работа — только загадка про конкретную, заведомо реальную книгу.
  const { picked } = pickBooks(3, seenKeys, chats.map((c) => c.book));
  if (!picked.length) throw new Error("нет книг для подбора");

  const list = picked.map((b, i) => `${i + 1}. «${b.t}» — ${b.a}`).join("\n");
  const prompt = `Вот три книги:
${list}

Для КАЖДОЙ напиши «свидание вслепую» — загадку, по которой читатель захочет её открыть, не зная названия.

Правила загадки: 2–3 предложения, обращайся к читателю на «ты», начни с яркой атмосферной детали мира книги, заинтригуй настроением, НЕ называй ни автора, ни героев, ни название, не раскрывай поворотов сюжета.

Язык загадок: ${LANG_NAME[lang] || LANG_NAME.ru}.

Ответь СТРОГО в этом формате (метки латиницей, ровно 3 блока, в том же порядке, ничего кроме них):
TEASER: <текст загадки>
TEASER: <текст загадки>
TEASER: <текст загадки>`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await apiCall({ messages: [{ role: "user", content: prompt }] });
      const teasers = raw.split(/TEASER:/i).slice(1).map((t) => t.trim()).filter(Boolean);
      if (teasers.length < picked.length) continue;
      // Массив — в той форме, в какой его рисует библиотека.
      return picked.map((b, i) => ({ teaser: teasers[i], title: b.t, author: b.a }));
    } catch {}
  }
  throw new Error("blind failed");
}

async function buildCharMap(chat, lang) {
  const sum = chat.summary ? `\nИз разговора с читателем уже известно: ${chat.summary}` : "";
  return apiCall({ messages: [{ role: "user", content: `Книга: «${chat.book}». ${chat.bookInfo ? `Описание: ${chat.bookInfo}.` : ""}${sum}\nЧитатель дочитал до: ${chat.finished ? "конца книги" : chat.progress}.

Составь список персонажей, которые уже встретились К ЭТОМУ МЕСТУ. СТРОГО:
- НЕ упоминай героев, появляющихся позже, и НЕ раскрывай про них будущих фактов (это спойлер).
- Если для каждого героя не уверен, что он появился до этого места, — не включай его.
- Если книгу знаешь плохо — честно напиши это первой строкой и перечисли только тех, о ком есть данные из описания и разговора.
- НИКОГДА не выдумывай персонажей.

Формат: «Имя — 1-2 предложения». Каждый с новой строки, без заголовков. Язык: ${LANG_NAME[lang] || LANG_NAME.ru}.` }] });
}

// ——— Хранилище ———
const DEFAULT_SETTINGS = { lang: "ru", charId: "cat", pro: false, xp: 0, spent: 0, tts: false, kids: false, owned: [], streak: { count: 0, last: "" }, minutes: 0, seenIntro: false, theme: "library" };
async function loadState() {
  let chats = [], settings = { ...DEFAULT_SETTINGS };
  try { const r = await window.storage.get("library-v1"); if (r) chats = JSON.parse(r.value); } catch {}
  try { const r = await window.storage.get("settings-v1"); if (r) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(r.value) }; } catch {}
  return { chats, settings };
}
// Возвращают true/false вместо молчаливого проглатывания ошибки: если
// хранилище переполнено, пользователь должен об этом узнать, иначе он
// продолжит читать и переписываться, а после перезагрузки всё пропадёт.
async function saveChats(chats) {
  try { await window.storage.set("library-v1", JSON.stringify(chats)); return true; }
  catch (e) { console.error("Не удалось сохранить библиотеку:", e); return false; }
}
async function saveSettings(s) {
  try { await window.storage.set("settings-v1", JSON.stringify(s)); return true; }
  catch (e) { console.error("Не удалось сохранить настройки:", e); return false; }
}
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

function speak(text, langId, enabled) {
  if (!enabled) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[✏️🔖🏁💌🎯⭐]/g, ""));
    u.lang = ttsLang(langId);
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  } catch {}
}

const todayStr = () => new Date().toISOString().slice(0, 10);
function bumpStreak(streak) {
  const today = todayStr();
  if (streak.last === today) return streak;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return { count: streak.last === y ? streak.count + 1 : 1, last: today };
}

// ——— Печать по буквам ———
function TypeMessage({ text, animate, onTick, onDone }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return;
    let i = 0;
    const step = Math.max(1, Math.ceil(text.length / 300)); // длинные — быстрее, вся анимация ≤ ~7 сек
    const timer = setInterval(() => {
      i += step; setShown(Math.min(i, text.length));
      if (i % (step * 6) === 0) onTick?.();
      if (i >= text.length) { clearInterval(timer); onDone?.(); }
    }, 22);
    return () => clearInterval(timer);
  }, []);
  const typing = shown < text.length;
  return (<span>{text.slice(0, shown)}{typing && <span className="cursor" />}</span>);
}

const inputStyle = { width: "100%", padding: "12px 13px", ...px(), fontSize: 17, color: T.ink, background: T.paperMsg, fontFamily: "'Neucha', cursive" };
const pxButton = (active) => ({ ...px(), background: active ? T.green : T.btn, color: active ? T.outline : T.muted, boxShadow: active ? `inset -4px -4px 0 rgba(0,0,0,0.25), inset 4px 4px 0 rgba(255,255,255,0.25)` : "inset -4px -4px 0 rgba(0,0,0,0.3)", cursor: active ? "pointer" : "default", fontFamily: "'Press Start 2P', monospace" });
const smallBtn = { ...px(), background: T.btn, color: T.muted, padding: "9px 12px", fontSize: 9, cursor: "pointer", fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 };
const toolBtn = (gold) => ({ ...px(gold ? T.gold : T.outline), background: T.btn, color: gold ? T.gold : T.muted, padding: "10px 8px", fontSize: 8.5, cursor: "pointer", fontFamily: "'Press Start 2P', monospace", lineHeight: 1.5, textAlign: "center" });

function PixelLogo({ size = 1 }) {
  const spines = [["#c14b4b", 36], ["#4b77c1", 46], ["#4bc178", 40], ["#9a4bc1", 30]];
  return (
    <div className="logo" aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 4, transform: `scale(${size})` }}>
      {spines.map(([c, h], i) => (
        <div key={i} style={{ width: 15, height: h, background: c, border: `3px solid ${T.outline}` }} />
      ))}
      <div style={{ width: 34, height: 42, background: T.gold, border: `3px solid ${T.outline}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, transform: "rotate(6deg)", marginLeft: 2 }}>📖</div>
    </div>
  );
}

function Stars() {
  const dots = useRef(Array.from({ length: 60 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, s: Math.random() < 0.75 ? 2 : 3, o: 0.35 + Math.random() * 0.6 }))).current;
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {dots.map((d, i) => (<div key={i} style={{ position: "absolute", left: `${d.x}%`, top: `${d.y}%`, width: d.s, height: d.s, background: "#fff", opacity: d.o }} />))}
    </div>
  );
}

function Bookshelf() {
  const books = useRef(Array.from({ length: 14 }, () => ({ h: 22 + Math.floor(Math.random() * 16), w: 9 + Math.floor(Math.random() * 8), c: ["#c14b4b", "#4b77c1", "#4bc178", "#c1a04b", "#9a4bc1", "#c1774b"][Math.floor(Math.random() * 6)], lean: Math.random() < 0.12 }))).current;
  return (
    <div aria-hidden style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, padding: "0 14px", height: 40, overflow: "hidden" }}>
        {books.map((b, i) => (<div key={i} style={{ width: b.w, height: b.h, background: b.c, border: `2px solid ${T.outline}`, transform: b.lean ? "rotate(-8deg)" : "none", transformOrigin: "bottom left" }} />))}
      </div>
      <div style={{ height: 12, background: T.wood, borderTop: `4px solid ${T.woodLight}`, borderBottom: `4px solid ${T.outline}` }} />
    </div>
  );
}

function ShelfBuddy({ charId, asleep }) {
  const ch = charById(charId);
  return (
    <div aria-hidden style={{ position: "absolute", right: 22, top: 26, zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ fontSize: 24, lineHeight: 1, filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.5))" }}>{asleep ? "💤" : ch.emoji}</div>
      <div style={{ width: 18, height: 12, background: ch.color, border: `3px solid ${T.outline}`, marginTop: -2 }} />
      <div style={{ display: "flex", gap: 5, marginTop: -2 }}>
        <div className={asleep ? "" : "legL"} style={{ width: 6, height: 13, background: ch.color, border: `2px solid ${T.outline}` }} />
        <div className={asleep ? "" : "legR"} style={{ width: 6, height: 13, background: ch.color, border: `2px solid ${T.outline}` }} />
      </div>
    </div>
  );
}

function Confetti() {
  const bits = Array.from({ length: 24 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 0.8, c: ["#ffd66b", "#6fdc8c", "#c14b4b", "#4b77c1", "#9a4bc1"][i % 5] }));
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 20 }}>
      {bits.map((b, i) => (<div key={i} className="conf" style={{ left: `${b.x}%`, top: 0, background: b.c, animationDelay: `${b.d}s` }} />))}
    </div>
  );
}

function XpBar({ t, xp, streak }) {
  const level = 1 + Math.floor(xp / 100);
  const pct = xp % 100;
  return (
    <div style={{ margin: "0 0 16px" }}>
      <div className="pxfont" style={{ fontSize: 9, color: T.gold, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{t("level")} {level}</span>
        <span style={{ color: streak.count > 0 ? "#ff9f43" : T.muted }}>🔥 {streak.count} {t("streakDays")}</span>
        <span>{pct}/100 XP</span>
      </div>
      <div style={{ height: 14, ...px(), background: T.track }}>
        <div style={{ width: `${pct}%`, height: "100%", background: T.green, transition: "width .4s" }} />
      </div>
    </div>
  );
}

// Оверлей-панель
function Panel({ title, onClose, t, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(8,7,20,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, maxHeight: "82vh", overflowY: "auto", background: T.nightDeep, ...px(T.gold), borderBottom: "none", padding: "16px 16px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className="pxfont" style={{ fontSize: 12, color: T.gold }}>{title}</span>
          <button onClick={onClose} className="pxfont" style={{ ...smallBtn, fontSize: 8 }}>{t("close")}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ——— Главное меню (титульный экран) ———
function Home({ t, settings, chats, onGo }) {
  const level = 1 + Math.floor((settings.xp || 0) / 100);
  const bigBtn = (icon, label, view, gold) => (
    <button onClick={() => onGo(view)} className="pxfont"
      style={{ ...px(gold ? T.gold : T.outline), background: gold ? T.gold : T.btn, color: gold ? T.outline : T.white, width: "100%", padding: "17px 10px", fontSize: 11, cursor: "pointer", lineHeight: 1.6, boxShadow: `4px 4px 0 rgba(0,0,0,0.35)` }}>
      {icon} {label}
    </button>
  );
  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Bookshelf />
      <ShelfBuddy charId={settings.charId} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "26px 22px 30px", gap: 12 }}>
        <img src={IMG.logo} alt="" className="logo" style={{ width: 104, filter: "drop-shadow(4px 4px 0 rgba(0,0,0,0.45))" }} />
        <h1 className="pxfont" style={{ fontSize: 19, color: T.gold, margin: "14px 0 2px", textAlign: "center", lineHeight: 1.5, textShadow: `3px 3px 0 ${T.outline}` }}>ЧИТАЕМ ВМЕСТЕ</h1>
        <p className="hand" style={{ color: T.muted, fontSize: 18, margin: "0 0 6px", textAlign: "center" }}>{t("homeHint")}</p>
        <div className="pxfont" style={{ fontSize: 9, color: T.green, marginBottom: 14 }}>
          {t("level")} {level} · 🔥 {settings.streak?.count || 0} {t("streakDays")}
        </div>
        <div style={{ display: "grid", gap: 11, width: "100%", maxWidth: 340 }}>
          {bigBtn("📚", t("library"), "library", true)}
          {bigBtn("⚙️", t("settingsTitle"), "settings")}
          {bigBtn("🛒", t("shopTitle"), "shop")}
          {bigBtn("🏆", t("achTitle"), "ach")}
          {bigBtn(settings.pro ? "✓" : "⭐", `${t("proTitle")}${settings.pro ? "" : " · 990 ₽"}`, "pro")}
        </div>
        <p className="pxfont" style={{ color: T.muted, fontSize: 8, marginTop: 20, opacity: 0.7 }}>v1.2</p>
      </div>
    </div>
  );
}

// ——— Настройки ———
function Settings({ t, settings, chats, onChange, onBack, onImport }) {
  const [exported, setExported] = useState(false);
  const [importVal, setImportVal] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const label = { fontSize: 11, color: T.gold, margin: "22px 0 10px", fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6 };

  async function doExport() {
    const ok = await copyText(JSON.stringify({ v: 8, chats, settings }));
    if (ok) { setExported(true); setTimeout(() => setExported(false), 2000); }
  }
  function doImport() {
    try {
      const data = JSON.parse(importVal);
      if (!data.chats || !data.settings) throw new Error("bad");
      onImport(data);
      setImportMsg(t("imported")); setImportVal("");
    } catch { setImportMsg(t("badImport")); }
    setTimeout(() => setImportMsg(""), 2500);
  }
  const toggleRow = (label2, val, set) => (
    <button onClick={set} className="hand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: T.cardBg, ...px(val ? T.gold : T.outline), color: val ? T.gold : T.muted, padding: "11px 14px", fontSize: 18, cursor: "pointer", marginBottom: 8 }}>
      <span>{label2}</span><span className="pxfont" style={{ fontSize: 10 }}>{val ? "ON" : "OFF"}</span>
    </button>
  );

  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 17, color: T.gold, textAlign: "center", margin: "16px 0 4px", textShadow: `3px 3px 0 ${T.outline}` }}>⚙️ {t("settingsTitle")}</h1>

        <div style={label}>{t("themeTitle")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {THEME_LIST.map(([id, icon]) => (
            <button key={id} onClick={() => onChange({ ...settings, theme: id })}
              style={{ ...px(settings.theme === id ? T.gold : T.outline), background: THEMES[id].night, boxShadow: settings.theme === id ? GLOW : "none", fontSize: 24, padding: "9px 13px", cursor: "pointer", lineHeight: 1 }}>
              {icon}
            </button>
          ))}
        </div>

        <div style={label}>{t("langTitle")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LANGS.map((l) => (
            <button key={l.id} onClick={() => onChange({ ...settings, lang: l.id })}
              style={{ ...px(settings.lang === l.id ? T.gold : T.outline), background: settings.lang === l.id ? T.panelSolid : T.cardBg, boxShadow: settings.lang === l.id ? GLOW : "none", fontSize: 26, padding: "8px 12px", cursor: "pointer", lineHeight: 1 }}>
              {l.flag}
            </button>
          ))}
        </div>

        <div style={label}>⚙️</div>
        {toggleRow(t("tts"), settings.tts, () => onChange({ ...settings, tts: !settings.tts }))}
        {toggleRow(t("kids"), settings.kids, () => onChange({ ...settings, kids: !settings.kids }))}

        <div style={label}>{t("exportLbl")}</div>
        <button onClick={doExport} className="pxfont" style={{ ...pxButton(true), width: "100%", padding: "13px 0", fontSize: 10 }}>{exported ? t("copied") : t("exportBtn")}</button>
        <textarea value={importVal} onChange={(e) => setImportVal(e.target.value)} placeholder={t("importPh")} rows={2} style={{ ...inputStyle, marginTop: 10, fontSize: 14, resize: "vertical" }} />
        <button onClick={doImport} disabled={!importVal.trim()} className="pxfont" style={{ ...pxButton(!!importVal.trim()), width: "100%", marginTop: 8, padding: "11px 0", fontSize: 10 }}>{t("importBtn")}</button>
        {importMsg && <p className="hand" style={{ color: T.gold, fontSize: 17, margin: "8px 0 0", textAlign: "center" }}>{importMsg}</p>}

        <p className="pxfont" style={{ textAlign: "center", color: T.muted, fontSize: 8, marginTop: 28, lineHeight: 1.8, opacity: 0.7 }}>«ЧИТАЕМ ВМЕСТЕ» · v1.2</p>
      </div>
    </div>
  );
}

// ——— Магазин и персонаж ———
function Shop({ t, settings, onChange, onBack }) {
  const wallet = (settings.xp || 0) - (settings.spent || 0);
  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <ShelfBuddy charId={settings.charId} />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 17, color: T.gold, textAlign: "center", margin: "16px 0 4px", textShadow: `3px 3px 0 ${T.outline}` }}>🛒 {t("shopTitle")}</h1>
        <p className="pxfont" style={{ textAlign: "center", color: T.green, fontSize: 10, margin: "8px 0 4px" }}>{t("shopWallet")}: {wallet} XP</p>
        <p className="hand" style={{ color: T.muted, fontSize: 17, margin: "0 0 14px", textAlign: "center" }}>{t("charHint")}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {CHARACTERS.map((c) => {
            const owned = c.price === 0 || (settings.owned || []).includes(c.id);
            const activeCh = settings.charId === c.id;
            return (
              <button key={c.id}
                onClick={() => {
                  if (owned) { onChange({ ...settings, charId: c.id }); }
                  else if (wallet >= c.price) { onChange({ ...settings, owned: [...(settings.owned || []), c.id], spent: (settings.spent || 0) + c.price, charId: c.id }); }
                }}
                style={{ ...px(activeCh ? T.gold : T.outline), background: activeCh ? T.panelSolid : T.cardBg, boxShadow: activeCh ? GLOW : "none", width: 80, height: 80, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, opacity: owned || wallet >= c.price ? 1 : 0.5 }}>
                <span style={{ fontSize: 28 }}>{owned ? c.emoji : "🔒"}</span>
                {!owned && <span className="pxfont" style={{ fontSize: 7.5, color: wallet >= c.price ? T.green : T.red }}>{c.price} XP</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ——— Достижения ———
function Achievements({ t, settings, chats, onBack }) {
  const list = [
    { id: "first", ok: chats.length >= 1, icon: "📖", name: t("achFirst") },
    { id: "five", ok: chats.length >= 5, icon: "📚", name: t("achFive") },
    { id: "finish", ok: chats.some((c) => c.finished), icon: "🏁", name: t("achFinish") },
    { id: "streak", ok: (settings.streak?.count || 0) >= 7, icon: "🔥", name: t("achStreak") },
    { id: "pro", ok: settings.pro, icon: "⭐", name: t("achPro") },
  ];
  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 17, color: T.gold, textAlign: "center", margin: "16px 0 16px", textShadow: `3px 3px 0 ${T.outline}` }}>🏆 {t("achTitle")}</h1>
        <div style={{ display: "grid", gap: 8 }}>
          {list.map((a) => (
            <div key={a.id} className="hand" style={{ ...px(a.ok ? T.gold : T.outline), background: a.ok ? "rgba(60,50,20,0.6)" : T.cardBg, color: a.ok ? T.gold : T.muted, padding: "11px 13px", fontSize: 18, display: "flex", gap: 10, alignItems: "center", opacity: a.ok ? 1 : 0.6 }}>
              <span style={{ fontSize: 20, filter: a.ok ? "none" : "grayscale(1) opacity(0.5)" }}>{a.icon}</span> {a.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Про-версия ———
function ProScreen({ t, settings, onChange, onBack }) {
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState(false);
  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 17, color: T.gold, textAlign: "center", margin: "16px 0 16px", textShadow: `3px 3px 0 ${T.outline}` }}>⭐ {t("proTitle")} · 990 ₽</h1>
        {settings.pro ? (
          <div className="pxfont" style={{ ...px(T.green), background: "rgba(30,60,40,0.8)", color: T.green, padding: "16px 14px", fontSize: 10, lineHeight: 1.7, textAlign: "center" }}>{t("proActive")}</div>
        ) : (
          <div style={{ ...px(), background: T.paperMsg, color: T.ink, padding: "14px 14px", boxShadow: `4px 4px 0 rgba(0,0,0,0.35)` }}>
            <p className="hand" style={{ margin: 0, fontSize: 18, lineHeight: 1.35 }}>{t("proText")}</p>
            <button className="pxfont" style={{ ...pxButton(true), width: "100%", marginTop: 12, padding: "13px 0", fontSize: 11 }}>{t("buy")}</button>
            <p className="hand" style={{ margin: "10px 0 8px", fontSize: 16, color: "#7a6440", lineHeight: 1.3 }}>{t("demoNote")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(false); }} placeholder={t("codePh")} style={{ ...inputStyle, border: `4px solid ${codeErr ? T.red : T.outline}`, padding: "9px 11px", fontSize: 16 }} />
              <button className="pxfont" style={{ ...pxButton(true), padding: "0 14px", fontSize: 10, flexShrink: 0 }}
                onClick={() => { if (code.trim().toUpperCase() === "DEMO") { onChange({ ...settings, pro: true }); } else { setCodeErr(true); } }}>
                {t("activate")}
              </button>
            </div>
            {codeErr && <p className="hand" style={{ margin: "6px 0 0", color: T.red, fontSize: 16 }}>{t("wrongCode")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ——— Профиль читателя ———
function Profile({ t, chats, settings, onBack }) {
  const msgs = chats.reduce((n, c) => n + c.messages.filter((m) => m.role === "user" && !m.hidden).length, 0);
  const quotes = chats.reduce((n, c) => n + (c.quotes || []).length, 0);
  const finished = chats.filter((c) => c.finished).length;
  const level = 1 + Math.floor((settings.xp || 0) / 100);
  const [copied, setCopied] = useState(false);
  const rows = [
    ["📚", chats.length, t("statBooks")], ["🏁", finished, t("statFinished")],
    ["💬", msgs, t("statMsgs")], ["⭐", quotes, t("statQuotes")],
    ["🔥", settings.streak?.count || 0, t("statStreak")], ["🕯️", settings.minutes || 0, t("statMinutes")],
  ];
  async function share() {
    const txt = `${t("profileLbl")} · «Читаем вместе»\n${t("level")} ${level} · 🔥${settings.streak?.count || 0}\n` + rows.map((r) => `${r[0]} ${r[1]} ${r[2]}`).join("\n");
    if (await copyText(txt)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <ShelfBuddy charId={settings.charId} />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 15, color: T.gold, textAlign: "center", margin: "16px 0 6px", textShadow: `3px 3px 0 ${T.outline}`, lineHeight: 1.6 }}>{t("profileLbl")}</h1>
        <p className="pxfont" style={{ textAlign: "center", color: T.green, fontSize: 12, margin: "0 0 18px" }}>{t("level")} {level}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ ...px(), background: T.paperMsg, color: T.ink, padding: "12px 10px", textAlign: "center", boxShadow: `4px 4px 0 rgba(0,0,0,0.35)` }}>
              <div style={{ fontSize: 22 }}>{r[0]}</div>
              <div className="pxfont" style={{ fontSize: 16, color: "#5e3a1f", margin: "6px 0 3px" }}>{r[1]}</div>
              <div className="hand" style={{ fontSize: 16, color: "#8a6a3f" }}>{r[2]}</div>
            </div>
          ))}
        </div>
        <button onClick={share} className="pxfont" style={{ ...pxButton(true), width: "100%", marginTop: 16, padding: "13px 0", fontSize: 10 }}>{copied ? t("copied") : t("shareShelf")}</button>
      </div>
    </div>
  );
}

// ——— Цитаты ———
function Quotes({ t, chats, onUpdateChat, onBack }) {
  const [copiedId, setCopiedId] = useState(null);
  const all = chats.flatMap((c) => (c.quotes || []).map((q) => ({ ...q, book: c.book, chatId: c.id })));
  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 18, color: T.gold, textAlign: "center", margin: "16px 0 18px", textShadow: `3px 3px 0 ${T.outline}` }}>{t("quotes")}</h1>
        {all.length === 0 && <p className="hand" style={{ color: T.muted, fontSize: 19, textAlign: "center" }}>{t("noQuotes")}</p>}
        <div style={{ display: "grid", gap: 14 }}>
          {all.map((q) => (
            <div key={q.id} style={{ ...px(), background: T.paperMsg, color: T.ink, boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`, padding: "14px 14px" }}>
              <div className="hand" style={{ fontSize: 19, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>«{q.text}»</div>
              <div className="pxfont" style={{ fontSize: 8.5, color: "#8a6a3f", marginTop: 10 }}>— {q.book.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="pxfont" style={{ ...pxButton(true), padding: "8px 12px", fontSize: 9 }}
                  onClick={async () => { const ok = await copyText(`«${q.text}»\n— ${q.book} · «Читаем вместе» 📚`); if (ok) { setCopiedId(q.id); setTimeout(() => setCopiedId(null), 1500); } }}>
                  {copiedId === q.id ? t("copied") : t("copy")}
                </button>
                <button className="pxfont" style={{ ...px(), background: T.btn, color: T.muted, padding: "8px 12px", fontSize: 10, cursor: "pointer" }}
                  onClick={() => { const chat = chats.find((c) => c.id === q.chatId); onUpdateChat({ ...chat, quotes: (chat.quotes || []).filter((x) => x.id !== q.id) }); }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— Библиотека ———
function Library({ t, lang, chats, settings, onOpen, onNew, onDelete, onMenu, onQuotes, onProfile, onIntroDone, onQuickAdd, onSettings }) {
  const [confirmId, setConfirmId] = useState(null);
  const [rec, setRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [addedIdx, setAddedIdx] = useState({});
  const [blind, setBlind] = useState(null);
  const [blindBusy, setBlindBusy] = useState(false);
  const [revealed, setRevealed] = useState({});
  const limit = settings.pro ? 10 : 2;
  const canAdd = chats.length < limit;
  const quoteCount = chats.reduce((n, c) => n + (c.quotes || []).length, 0);

  async function getRec(mood) {
    if (recBusy || chats.length === 0) return;
    setMoodOpen(false);
    setRecBusy(true); setRec(null); setBlind(null); setAddedIdx({});
    try { setRec(await recommendNext(chats, lang, mood)); } catch { setRec("err"); }
    setRecBusy(false);
  }
  async function getBlind() {
    if (blindBusy) return;
    setBlindBusy(true); setBlind(null); setRec(null); setRevealed({});
    try {
      const seen = settings.blindSeen || [];
      const picks = await blindRecs(chats, lang, seen);
      setBlind(picks);
      // Запоминаем показанное, чтобы в следующий раз выпали другие книги.
      // Ограничиваем список: пул сам сбрасывается, когда книги кончаются.
      const next = [...seen, ...picks.map((p) => bookKey({ t: p.title, a: p.author }))];
      onSettings({ ...settings, blindSeen: next.slice(-200) });
    } catch { setBlind("err"); }
    setBlindBusy(false);
  }

  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {!settings.seenIntro && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(8,7,20,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <div style={{ maxWidth: 480, background: T.paperMsg, color: T.ink, ...px(T.gold), boxShadow: `6px 6px 0 rgba(0,0,0,0.5)`, padding: "18px 18px 20px" }}>
            <div className="hand" style={{ fontSize: 19, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{t("introText")}</div>
            <button onClick={onIntroDone} className="pxfont" style={{ ...pxButton(true), width: "100%", marginTop: 16, padding: "13px 0", fontSize: 11 }}>{t("introBtn")}</button>
          </div>
        </div>
      )}
      <Bookshelf />
      <ShelfBuddy charId={settings.charId} />
      <div style={{ padding: "22px 16px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onQuotes} className="pxfont" style={smallBtn}>{t("quotes")}{quoteCount ? ` (${quoteCount})` : ""}</button>
          <button onClick={onProfile} className="pxfont" style={smallBtn}>📊</button>
          <button onClick={onMenu} className="pxfont" style={smallBtn}>{t("menu")}</button>
        </div>
        <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
          <h1 className="pxfont" style={{ fontSize: 19, color: T.gold, margin: "0 0 10px", lineHeight: 1.5, textShadow: `3px 3px 0 ${T.outline}` }}>{t("library")}</h1>
          <p className="hand" style={{ color: T.muted, fontSize: 19, margin: 0 }}>
            {chats.length === 0 ? t("empty") : `${t("count")}: ${chats.length} / ${limit}${settings.pro ? "" : ` (${t("free")})`}`}
          </p>
        </div>

        <XpBar t={t} xp={settings.xp || 0} streak={settings.streak || { count: 0 }} />

        {chats.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "16px 0 8px" }}>
            <PixelLogo />
            <div className="hand" style={{ color: T.muted, fontSize: 19 }}>↓</div>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {chats.map((c) => {
            const comp = companionById(c.companionId);
            const confirming = confirmId === c.id;
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                <button onClick={() => onOpen(c.id)}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", background: T.paperMsg, color: T.ink, ...px(c.finished ? T.gold : T.outline), boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`, padding: "12px 14px", cursor: "pointer", display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <BookCover title={c.book} src={c.cover} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pxfont" style={{ fontSize: 10.5, lineHeight: 1.6, color: "#5e3a1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.finished ? "🏁 " : ""}{c.book.toUpperCase()}
                    </div>
                    <div className="hand" style={{ fontSize: 16, marginTop: 3, color: "#6b573a" }}>
                      {c.finished ? `🏁 ${t("finished")}` : `🔖 ${c.progress}`}{c.goal ? " · 🎯" : ""}
                    </div>
                    {(() => {
                      const share = c.finished ? 1 : readShare(c.progress, c.total);
                      if (!share) return null;
                      const pct = Math.round(share * 100);
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
                          <div style={{ flex: 1, height: 8, background: "rgba(0,0,0,0.16)", border: "2px solid rgba(0,0,0,0.28)" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: c.finished ? T.green : T.gold }} />
                          </div>
                          <span className="pxfont" style={{ fontSize: 8, color: "#6b573a", flexShrink: 0 }}>{pct}%</span>
                        </div>
                      );
                    })()}
                    <div className="hand" style={{ fontSize: 15, marginTop: 5, color: "#8a7355" }}>
                      {comp.glyph} {comp.name[lang] || comp.name.ru} · {t("msgs")}: {c.messages.filter((m) => !m.meta && !m.hidden).length}
                    </div>
                  </div>
                </button>
                <button onClick={() => (confirming ? (onDelete(c.id), setConfirmId(null)) : setConfirmId(c.id))}
                  className="pxfont"
                  style={{ ...px(), background: confirming ? T.red : T.btn, color: confirming ? "#fff" : T.muted, padding: "0 12px", fontSize: confirming ? 8 : 12, cursor: "pointer", flexShrink: 0 }}>
                  {confirming ? t("sure") : "✕"}
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={onNew} className="pxfont"
          style={{ width: "100%", marginTop: 22, padding: "16px 0", fontSize: 12, ...pxButton(true), background: canAdd ? T.green : T.gold, color: T.outline }}>
          {canAdd ? t("newBook") : `🔒 ${t("proTitle")} · 990 ₽`}
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <button onClick={() => { setMoodOpen((v) => !v); setRec(null); setBlind(null); }} disabled={chats.length === 0} className="pxfont" style={{ ...px(moodOpen ? T.gold : T.outline), background: T.btn, color: chats.length ? T.gold : "#55537a", padding: "13px 4px", fontSize: 9, cursor: "pointer", lineHeight: 1.5 }}>{t("recommend")}</button>
          <button onClick={getBlind} className="pxfont" style={{ ...px(), background: T.btn, color: T.gold, padding: "13px 4px", fontSize: 9, cursor: "pointer", lineHeight: 1.5 }}>{t("blindLbl")}</button>
        </div>

        {moodOpen && (
          <div style={{ ...px(T.gold), background: T.cardBg, marginTop: 12, padding: "12px 12px" }}>
            <p className="hand" style={{ color: T.gold, fontSize: 18, margin: "0 0 10px" }}>{t("moodQ")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["any", t("mAny")], ["sim", t("mSim")], ["new", t("mNew")], ["light", t("mLight")], ["deep", t("mDeep")], ["short", t("mShort")]].map(([id, label]) => (
                <button key={id} onClick={() => getRec(id)} className="pxfont" style={{ ...px(), background: T.btn, color: T.muted, padding: "10px 11px", fontSize: 8.5, cursor: "pointer", lineHeight: 1.5 }}>{label}</button>
              ))}
            </div>
          </div>
        )}
        {(recBusy || blindBusy) && (<p className="hand" style={{ color: T.muted, fontSize: 18, textAlign: "center", marginTop: 14 }}>{t("recThinking")}<span className="cursor" /></p>)}
        {rec === "err" && <p className="hand" style={{ color: T.red, fontSize: 17, textAlign: "center", marginTop: 12 }}>{t("errMsg")}</p>}
        {rec && rec.text && (
          <div className="hand" style={{ ...px(T.gold), background: T.paperMsg, color: T.ink, marginTop: 14, padding: "14px 14px", fontSize: 18, lineHeight: 1.35, whiteSpace: "pre-wrap", boxShadow: `4px 4px 0 rgba(0,0,0,0.35)` }}>{rec.text}</div>
        )}
        {rec && rec.list && rec.list.map((r, i) => (
          <div key={i} style={{ ...px(T.gold), background: T.paperMsg, color: T.ink, marginTop: 14, padding: "14px 14px", boxShadow: `4px 4px 0 rgba(0,0,0,0.35)` }}>
            <div className="pxfont" style={{ fontSize: 10.5, color: "#5e3a1f", lineHeight: 1.7, overflowWrap: "anywhere" }}>{r.title.toUpperCase()}</div>
            {r.author && <div className="hand" style={{ fontSize: 17, color: "#8a6a3f", marginTop: 2 }}>{r.author}</div>}
            <div className="hand" style={{ fontSize: 18, lineHeight: 1.35, marginTop: 8 }}>{r.why}</div>
            {addedIdx[i] ? (
              <div className="pxfont" style={{ marginTop: 10, fontSize: 9, color: "#2e7d4f" }}>✓ {t("addedShelf")}</div>
            ) : canAdd ? (
              <button onClick={() => { onQuickAdd({ book: r.title + (r.author ? " — " + r.author : ""), progress: "—", companionId: "scholar", bookInfo: "", goal: "" }); setAddedIdx({ ...addedIdx, [i]: true }); }} className="pxfont" style={{ ...pxButton(true), marginTop: 10, padding: "10px 13px", fontSize: 9.5 }}>{t("addShelf")}</button>
            ) : (
              <div className="pxfont" style={{ marginTop: 10, fontSize: 8.5, color: "#b08a4a" }}>🔒 {t("proTitle")}</div>
            )}
          </div>
        ))}
        {Array.isArray(blind) && blind.map((b, i) => (
          <div key={i} style={{ ...px(T.gold), background: T.paperMsg, color: T.ink, marginTop: 14, padding: "14px 14px", boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`, position: "relative" }}>
            <div className="pxfont" style={{ fontSize: 8.5, color: "#b08a4a", marginBottom: 8 }}>🎁 №{i + 1}</div>
            <div className="hand" style={{ fontSize: 19, lineHeight: 1.35 }}>{b.teaser}</div>
            {revealed[i] ? (
              <div style={{ marginTop: 12, borderTop: `3px dashed #c9b489`, paddingTop: 10 }}>
                <div className="pxfont" style={{ fontSize: 10, color: "#5e3a1f", lineHeight: 1.7, overflowWrap: "anywhere" }}>{(b.title || "").toUpperCase()}</div>
                {b.author && <div className="hand" style={{ fontSize: 17, color: "#8a6a3f", marginTop: 2 }}>{b.author}</div>}
              </div>
            ) : (
              <button onClick={() => setRevealed({ ...revealed, [i]: true })} className="pxfont" style={{ ...pxButton(true), marginTop: 12, padding: "11px 15px", fontSize: 10 }}>❓ {t("revealBtn")}</button>
            )}
          </div>
        ))}
        {blind === "err" && <p className="hand" style={{ color: T.red, fontSize: 17, textAlign: "center", marginTop: 12 }}>{t("errMsg")}</p>}
      </div>
    </div>
  );
}

// ——— Новая книга ———
function Setup({ t, lang, pro, onStart, onBack }) {
  const [book, setBook] = useState("");
  const [progress, setProgress] = useState("");
  const [bookInfo, setBookInfo] = useState("");
  const [goal, setGoal] = useState("");
  const [total, setTotal] = useState("");
  const [companion, setCompanion] = useState(null);
  const [searching, setSearching] = useState(false);
  const ready = book.trim() && progress.trim() && companion;
  const label = { display: "block", fontSize: 11, color: T.gold, margin: "18px 0 8px", fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6 };

  async function findInfo() {
    if (!book.trim() || searching) return;
    setSearching(true);
    try { setBookInfo(await searchBookInfo(book.trim(), lang)); } catch { setBookInfo(""); }
    setSearching(false);
  }

  return (
    <div className="view" style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <Bookshelf />
      <div style={{ padding: "18px 16px 40px" }}>
        <button onClick={onBack} className="pxfont" style={smallBtn}>{t("back")}</button>
        <h1 className="pxfont" style={{ fontSize: 18, color: T.gold, textAlign: "center", margin: "14px 0 4px", textShadow: `3px 3px 0 ${T.outline}` }}>{t("newTitle")}</h1>

        <label style={label}>{t("whichBook")}</label>
        <input value={book} onChange={(e) => setBook(e.target.value)} placeholder={t("bookPh")} style={inputStyle} />

        <label style={label}>{t("whereNow")}</label>
        <input value={progress} onChange={(e) => setProgress(e.target.value)} placeholder={t("wherePh")} style={inputStyle} />

        <label style={label}>{t("about")} <span style={{ color: T.muted }}>{t("aboutOpt")}</span></label>
        <textarea value={bookInfo} onChange={(e) => setBookInfo(e.target.value)} rows={3} placeholder={t("aboutPh")}
          style={{ ...inputStyle, resize: "vertical", fontSize: 16, lineHeight: 1.35 }} />
        <button onClick={findInfo} disabled={!book.trim() || searching} className="pxfont"
          style={{ ...pxButton(!!book.trim() && !searching), marginTop: 8, padding: "11px 16px", fontSize: 10 }}>
          {searching ? <span>{t("searching")}<span className="cursor" /></span> : t("findDesc")}
        </button>

        <label style={label}>{t("totalLbl")} <span style={{ opacity: 0.65 }}>{t("aboutOpt")}</span></label>
        <input value={total} onChange={(e) => setTotal(e.target.value)} placeholder={t("totalPh")} inputMode="numeric" style={inputStyle} />

        <label style={label}>{t("goalLbl")}</label>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t("goalPh")} style={inputStyle} />

        <label style={label}>{t("choose")}</label>
        <div style={{ display: "grid", gap: 10 }}>
          {COMPANIONS.map((c) => {
            const locked = c.pro && !pro;
            const active = companion?.id === c.id;
            return (
              <button key={c.id} onClick={() => !locked && setCompanion(c)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: active ? T.panelSolid : T.cardBg, ...px(active ? T.gold : T.outline), boxShadow: active ? GLOW : "none", padding: "12px 13px", cursor: locked ? "default" : "pointer", opacity: locked ? 0.55 : 1 }}>
                <span style={{ width: 54, height: 54, flexShrink: 0, background: T.wood, ...px(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>{locked ? "🔒" : <img src={c.img} alt="" style={{ width: "88%", height: "88%", objectFit: "contain" }} />}</span>
                <span>
                  <span className="pxfont" style={{ display: "block", fontSize: 10.5, color: active ? T.gold : T.white, lineHeight: 1.5 }}>{c.name[lang] || c.name.ru}</span>
                  <span className="hand" style={{ display: "block", fontSize: 17, color: T.muted, marginTop: 3, lineHeight: 1.2 }}>{c.blurb[lang] || c.blurb.ru}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button disabled={!ready}
          onClick={() => onStart({ book: book.trim(), progress: progress.trim(), companionId: companion.id, bookInfo: bookInfo.trim(), goal: goal.trim(), total: total.trim() })}
          className="pxfont" style={{ width: "100%", marginTop: 26, padding: "16px 0", fontSize: 13, ...pxButton(ready) }}>
          {t("start")}
        </button>
      </div>
    </div>
  );
}

// ——— Чат ———
function Chat({ t, lang, settings, chat, onUpdate, onBack, addXp, addMinutes }) {
  const [companionId, setCompanionId] = useState(chat.companionId);
  const companion = companionById(companionId);
  const [progress, setProgress] = useState(chat.progress);
  const [finished, setFinished] = useState(!!chat.finished);
  const [messages, setMessages] = useState(chat.messages);
  const [quotes, setQuotes] = useState(chat.quotes || []);
  const [notes, setNotes] = useState(chat.notes || []);
  const [predictions, setPredictions] = useState(chat.predictions || []);
  const [emo, setEmo] = useState(chat.emo || []);
  const [charMap, setCharMap] = useState(chat.charMap || "");
  const [slow, setSlow] = useState(!!chat.slow);
  const [discussLang, setDiscussLang] = useState(chat.discussLang || null);
  const [polyLevel, setPolyLevel] = useState(chat.polyLevel || "");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [animateId, setAnimateId] = useState(null);
  const [editingProgress, setEditingProgress] = useState(false);
  const [newProgress, setNewProgress] = useState("");
  const [party, setParty] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [panel, setPanel] = useState(null); // notes|charMap|predict|emo|settings|focus
  const [noteVal, setNoteVal] = useState("");
  const [predictVal, setPredictVal] = useState("");
  const [pendingEmo, setPendingEmo] = useState(null);
  const [mapBusy, setMapBusy] = useState(false);
  const [focusLeft, setFocusLeft] = useState(0);
  const focusTimer = useRef(null);
  const focusTotal = useRef(0);
  const [summary, setSummary] = useState(chat.summary || "");
  const summarizing = useRef(false);
  const lastSummarizedAt = useRef(chat.summarizedAt || 0);
  const endRef = useRef(null);
  const nextId = useRef(Math.max(0, ...chat.messages.map((m) => m.id || 0)) + 1);
  const initialLastSeen = useRef(chat.lastSeen || 0);

  const scrollDown = () => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  useEffect(scrollDown, [messages, busy]);
  useEffect(() => {
    const stored = messages.length > 320 ? messages.slice(-280) : messages; // страховка от переполнения хранилища; старое живёт в конспекте
    onUpdate({ ...chat, companionId, progress, finished, messages: stored, quotes, notes, predictions, emo, charMap, slow, discussLang, polyLevel, summary, summarizedAt: lastSummarizedAt.current, lastSeen: Date.now() });
  }, [messages, progress, finished, quotes, companionId, notes, predictions, emo, charMap, slow, discussLang, polyLevel, summary]);

  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch {}; if (focusTimer.current) clearInterval(focusTimer.current); }, []);

  const chatCtx = (over = {}) => ({ ...chat, progress, finished, notes, goal: chat.goal, slow, discussLang, polyLevel, bookInfo: chat.bookInfo, summary, ...over });

  function pushAssistant(content, meta) {
    const id = nextId.current++;
    setMessages((m) => [...m, { id, role: "assistant", content, meta }]);
    if (!meta) { setAnimateId(id); speak(content, discussLang || lang, settings.tts); }
  }

  // Фоновое сжатие старой части разговора в конспект — контекст остаётся, а запросы лёгкие
  async function maybeSummarize(all) {
    if (summarizing.current) return;
    if (all.length < 24 || all.length - lastSummarizedAt.current < 12) return;
    summarizing.current = true;
    try {
      const older = all.slice(0, -10).map((m) => `${m.role === "user" ? "Читатель" : "Собеседник"}: ${m.content}`).join("\n").slice(0, 24000);
      const s = await apiCall({ messages: [{ role: "user", content: `Сожми этот диалог о книге «${chat.book}» в конспект-память из 5–8 предложений: мнения и оценки читателя, ключевые обсуждённые события и герои, споры и договорённости, текущая закладка. Без воды, только факты диалога.\n\n${older}` }] });
      setSummary(s);
      lastSummarizedAt.current = all.length;
    } catch {}
    summarizing.current = false;
  }

  async function send(text, { hidden = false, ctxOverride } = {}) {
    const userMsg = { id: nextId.current++, role: "user", content: text, hidden };
    const past = messages.filter((m) => !m.meta);
    const recent = past.length > 24 ? past.slice(-16) : past; // старое уже в конспекте — шлём только свежее
    const history = [...recent, userMsg];
    setMessages((m) => [...m, userMsg]);
    if (!hidden) addXp(2);
    setBusy(true);
    try {
      const reply = await askClaude(history, ctxOverride || chatCtx(), companion, lang, settings.kids);
      pushAssistant(reply);
      maybeSummarize([...past, userMsg]);
    } catch { pushAssistant(t("errMsg"), "error"); }
    setBusy(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (chat.messages.length === 0) {
        setBusy(true);
        try {
          const hello = await askClaude(
            [{ role: "user", content: "Поздоровайся со мной как живой человек: представься по имени, коротко, в своём характере. Если ты не знаешь эту книгу — честно скажи это прямо сейчас. Задай один вопрос. Без спойлеров." }],
            chatCtx(), companion, lang, settings.kids
          );
          if (!cancelled) pushAssistant(hello);
        // Тот же путь, что и у обычной отправки: человеческое объяснение и
        // пометка "error", чтобы сообщение не ушло в модель как её же реплика.
        } catch { if (!cancelled) pushAssistant(t("errMsg"), "error"); }
        if (!cancelled) setBusy(false);
      } else if (Date.now() - initialLastSeen.current > 6 * 60 * 60 * 1000 && initialLastSeen.current > 0 && !chat.finished) {
        send("Я вернулся в приложение после перерыва. Поприветствуй меня коротко в своём характере и спроси, продвинулся ли я в чтении.", { hidden: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    send(text);
  }

  function saveProgress() {
    const p = newProgress.trim();
    if (!p) return;
    setProgress(p);
    setEditingProgress(false);
    setNewProgress("");
    addXp(10);
    setPendingEmo(p);
    setMessages((m) => [...m, { id: nextId.current++, role: "assistant", meta: "divider", content: `🔖 ${p}` }]);
    send(`Я продвинулся в чтении, теперь я на: ${p}. Отреагируй коротко и спроси моё мнение о чём-то из свежепрочитанного (не выходя за это место).`, { hidden: true, ctxOverride: chatCtx({ progress: p }) });
  }

  function finishBook() {
    setFinished(true);
    setEditingProgress(false);
    setParty(true);
    setTimeout(() => setParty(false), 2200);
    addXp(50);
    setMessages((m) => [...m, { id: nextId.current++, role: "assistant", meta: "divider", content: t("finishDivider") }]);
    const preds = predictions.length ? `\n\nВот мои запечатанные предсказания, которые я делал по ходу чтения:\n${predictions.map((p, i) => `${i + 1}. (на моменте: ${p.at_progress}) ${p.text.replace(/\n/g, " ")}`).join("\n")}\nТоржественно вскрой их: сверь каждое с реальным финалом (сбылось/не сбылось/частично) и оцени мой процент попаданий со званием.` : "";
    send(`Я только что ДОЧИТАЛ книгу до конца! Спойлер-защита снята. Поздравь меня в своём характере и предложи обсудить финал — начни с одного яркого вопроса о концовке.${preds}`, { hidden: true, ctxOverride: chatCtx({ finished: true }) });
  }

  function requestLetter() { if (busy) return; setMessages((m) => [...m, { id: nextId.current++, role: "assistant", meta: "divider", content: "💌" }]); send("Напиши мне «письмо от собеседника» о нашей книге и разговоре: что я говорил, как менялось моё мнение, мои лучшие мысли, мои заметки на полях. Тёплое, личное, на «ты», 6–10 предложений.", { hidden: true }); }
  function requestReview() { if (busy) return; setMessages((m) => [...m, { id: nextId.current++, role: "assistant", meta: "divider", content: "✒️" }]); send("Помоги мне написать рецензию на эту книгу: собери черновик из моих же мыслей и слов за весь наш разговор, моим голосом, 5–8 предложений, с оценкой по пятибалльной, которую предложи на основе моих высказываний. В конце спроси, что поправить.", { hidden: true }); }
  function requestQuiz() { if (busy) return; setToolsOpen(false); setMessages((m) => [...m, { id: nextId.current++, role: "assistant", meta: "divider", content: "🎯" }]); send(`Устрой мне мини-викторину: задай 3 вопроса по событиям ${finished ? "всей книги" : "строго до моей закладки"}, пронумеруй 1–3. Я отвечу — тогда оцени и разбери. Сейчас просто задай вопросы.`, { hidden: true }); }
  function requestDebate() { if (busy) return; setToolsOpen(false); setMessages((m) => [...m, { id: nextId.current++, role: "assistant", meta: "divider", content: "⚖️" }]); send(`Начни со мной структурированные дебаты по книге: предложи один спорный тезис (${finished ? "по всей книге" : "строго по прочитанному до моей закладки"}), предложи мне выбрать сторону «за» или «против». Дальше 3 раунда аргументов, в конце — честный вердикт, кто был убедительнее. Сейчас — только тезис и вопрос о стороне.`, { hidden: true }); }

  function addNoteFn() {
    const v = noteVal.trim(); if (!v) return;
    setNotes([...notes, { id: Date.now(), text: v, at_progress: finished ? "🏁" : progress }]);
    setNoteVal(""); addXp(3);
  }
  function addPrediction() {
    const v = predictVal.trim(); if (!v) return;
    setPredictions([...predictions, { id: Date.now(), text: v, at_progress: progress }]);
    setPredictVal(""); addXp(5);
  }
  async function rebuildMap() {
    if (mapBusy) return;
    setMapBusy(true);
    try { setCharMap(await buildCharMap(chatCtx(), lang)); } catch { setCharMap("⚠"); }
    setMapBusy(false);
  }
  function pickEmo(e) {
    setEmo([...emo, { at: pendingEmo, emoji: e }]);
    setPendingEmo(null);
  }
  function startFocus(min) {
    focusTotal.current = min;
    setFocusLeft(min * 60);
    focusTimer.current = setInterval(() => {
      setFocusLeft((s) => {
        if (s <= 1) { clearInterval(focusTimer.current); focusTimer.current = null; endFocus(min); return 0; }
        return s - 1;
      });
    }, 1000);
  }
  function endFocus(minDone) {
    setPanel(null);
    addXp(Math.max(1, Math.round(minDone)));
    addMinutes(minDone);
    send(`Я только что читал книгу ${minDone} минут в режиме фокуса и вернулся. Спроси коротко, что произошло за это время (без спойлеров дальше моей закладки).`, { hidden: true });
  }
  function stopFocus() {
    if (focusTimer.current) { clearInterval(focusTimer.current); focusTimer.current = null; }
    const done = Math.round((focusTotal.current * 60 - focusLeft) / 60);
    setFocusLeft(0);
    if (done >= 1) endFocus(done); else setPanel(null);
  }

  // Голосовой ввод
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  function toggleVoice() {
    if (!SR) return;
    if (listening) { try { recRef.current?.stop(); } catch {}; setListening(false); return; }
    try {
      const r = new SR();
      r.lang = ttsLang(discussLang || lang);
      r.interimResults = false;
      r.onresult = (e) => { const txt = Array.from(e.results).map((x) => x[0].transcript).join(" "); setInput((v) => (v ? v + " " : "") + txt); };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recRef.current = r; r.start(); setListening(true);
    } catch { setListening(false); }
  }

  const compChoices = COMPANIONS.filter((c) => !c.pro || settings.pro);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="view" style={{ maxWidth: 640, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      {party && <Confetti />}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: T.nightDeep, borderBottom: `4px solid ${T.outline}` }}>
        <Bookshelf />
        <ShelfBuddy charId={settings.charId} asleep={panel === "focus" && focusLeft > 0} />
        <div style={{ padding: "10px 14px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0, paddingRight: 56 }}>
              <div className="pxfont" style={{ fontSize: 11, color: T.gold, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.6 }}>
                {finished ? "🏁 " : ""}{chat.book.toUpperCase()}
              </div>
              <div className="hand" style={{ fontSize: 16, color: T.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {t("switchComp")}
                {compChoices.map((c) => (
                  <button key={c.id} onClick={() => { if (c.id !== companionId) setCompanionId(c.id); }} title={c.name[lang] || c.name.ru}
                    style={{ border: `2px solid ${c.id === companionId ? T.gold : "transparent"}`, background: c.id === companionId ? "rgba(255,214,107,0.15)" : "transparent", boxShadow: c.id === companionId ? GLOW : "none", fontSize: 16, cursor: "pointer", padding: "1px 4px", lineHeight: 1.2 }}>
                    {c.glyph}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={onBack} className="pxfont" style={{ ...px(), background: T.btn, color: T.muted, padding: "9px 10px", fontSize: 8.5, cursor: "pointer", flexShrink: 0 }}>{t("shelf")}</button>
          </div>

          {/* Спойлер-защита — главная механика продукта, поэтому она вынесена
              в отдельный баннер во всю ширину, а не спрятана в строку кнопок. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, background: T.cardBg, ...px(finished ? T.green : T.gold), borderLeft: `8px solid ${finished ? T.green : T.gold}`, padding: "9px 12px" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{finished ? "🏁" : "🛡️"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pxfont" style={{ fontSize: 8.5, color: finished ? T.green : T.gold, lineHeight: 1.5 }}>
                {finished ? t("spoilerOff") : t("spoilerOn")}
              </div>
              {!finished && (
                <div className="hand" style={{ fontSize: 16, color: T.white, opacity: 0.92, marginTop: 2, overflowWrap: "anywhere" }}>
                  {t("spoilerUpTo")}: <b>{progress}</b>
                </div>
              )}
            </div>
            {!finished && (
              <button onClick={() => setEditingProgress((v) => !v)} className="pxfont"
                style={{ ...px(T.gold), background: "transparent", color: T.gold, padding: "6px 9px", fontSize: 8, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                {t("edit")}
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={() => setToolsOpen((v) => !v)} className="pxfont" style={{ ...px(toolsOpen ? T.gold : T.outline), background: T.btn, color: T.gold, padding: "8px 11px", fontSize: 9, cursor: "pointer" }}>{t("tools")}</button>
          </div>

          {toolsOpen && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
              <button onClick={requestQuiz} style={toolBtn()}>{t("quiz")}</button>
              <button onClick={requestDebate} style={toolBtn()}>{t("debateLbl")}</button>
              <button onClick={() => { setPanel("notes"); setToolsOpen(false); }} style={toolBtn()}>{t("notesLbl")}</button>
              <button onClick={() => { setPanel("charMap"); setToolsOpen(false); }} style={toolBtn()}>{t("charMapLbl")}</button>
              <button onClick={() => { setPanel("predict"); setToolsOpen(false); }} style={toolBtn()}>{t("predictLbl")}</button>
              <button onClick={() => { setPanel("emo"); setToolsOpen(false); }} style={toolBtn()}>{t("emoLbl")}</button>
              <button onClick={() => { setPanel("focus"); setToolsOpen(false); }} style={toolBtn()}>{t("focusLbl")}</button>
              <button onClick={() => { setPanel("chatSettings"); setToolsOpen(false); }} style={toolBtn()}>⚙️</button>
              {finished && <button onClick={() => { requestLetter(); setToolsOpen(false); }} style={toolBtn(true)}>{t("letter")}</button>}
              {finished && <button onClick={() => { requestReview(); setToolsOpen(false); }} style={toolBtn(true)}>{t("reviewLbl")}</button>}
            </div>
          )}

          {editingProgress && !finished && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <input value={newProgress} onChange={(e) => setNewProgress(e.target.value)} placeholder={t("newPlace")} style={{ ...inputStyle, padding: "9px 11px", fontSize: 16, flex: 1, minWidth: 150 }} />
              <button onClick={saveProgress} className="pxfont" style={{ ...pxButton(true), padding: "10px 14px", fontSize: 10, flexShrink: 0 }}>{t("done")}</button>
              <button onClick={finishBook} className="pxfont" style={{ ...px(T.gold), background: T.gold, color: T.outline, padding: "10px 14px", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>{t("finishBtn")}</button>
            </div>
          )}

          {pendingEmo && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="hand" style={{ color: T.gold, fontSize: 17 }}>{t("emoQ")}</span>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => pickEmo(e)} style={{ ...px(), background: T.btn, fontSize: 20, padding: "5px 9px", cursor: "pointer", lineHeight: 1 }}>{e}</button>
              ))}
              <button onClick={() => setPendingEmo(null)} className="pxfont" style={{ ...smallBtn, fontSize: 8 }}>✕</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: "18px 14px 10px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.filter((m) => !m.hidden).map((m) =>
          m.meta === "divider" ? (
            <div key={m.id} className="hand" style={{ textAlign: "center", fontSize: 17, color: T.gold, padding: "2px 0" }}>— {m.content} —</div>
          ) : (
            <div key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%", display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", gap: 8 }}>
              {m.role === "assistant" && (
                <span aria-hidden style={{ width: 36, height: 36, flexShrink: 0, marginTop: 2, background: T.wood, border: `3px solid ${T.outline}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `2px 2px 0 rgba(0,0,0,0.35)`, overflow: "hidden" }}><img src={companion.img} alt="" style={{ width: "92%", height: "92%", objectFit: "contain" }} /></span>
              )}
              <div style={{ position: "relative", minWidth: 0 }}>
                <div className="hand"
                  style={{ background: m.role === "user" ? T.panelSolid : T.paperMsg, color: m.role === "user" ? T.white : T.ink, ...px(), boxShadow: `4px 4px 0 rgba(0,0,0,0.35)`, padding: m.role === "user" ? "10px 14px" : "10px 30px 10px 14px", fontSize: 19, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                  {m.role === "assistant" && m.id === animateId ? (
                    <TypeMessage text={m.content} animate onTick={scrollDown} onDone={() => setAnimateId(null)} />
                  ) : (m.content)}
                </div>
                {m.role === "assistant" && !m.meta && m.id !== animateId && (
                  <button onClick={() => { const ex = quotes.find((q) => q.msgId === m.id); if (ex) setQuotes(quotes.filter((q) => q.msgId !== m.id)); else { setQuotes([...quotes, { id: Date.now(), msgId: m.id, text: m.content, at: Date.now() }]); addXp(3); } }} aria-label="quote"
                    style={{ position: "absolute", top: 4, right: 4, border: "none", background: "transparent", fontSize: 15, cursor: "pointer", filter: quotes.find((q) => q.msgId === m.id) ? "none" : "grayscale(1) opacity(0.45)" }}>⭐</button>
                )}
              </div>
            </div>
          )
        )}
        {busy && (
          <div className="hand" style={{ alignSelf: "flex-start", color: T.muted, fontSize: 17, padding: "2px 4px" }}>
            {(companion.name[lang] || companion.name.ru)} {t("thinking")}<span className="cursor" />
          </div>
        )}
        <div ref={endRef} style={{ height: 1 }} />
      </div>

      <div style={{ position: "sticky", bottom: 0, background: T.nightDeep, borderTop: `4px solid ${T.outline}`, padding: "12px 14px calc(14px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t("inputPh")} rows={1} style={{ ...inputStyle, resize: "none", fontSize: 18, lineHeight: 1.3, maxHeight: 112, overflowY: "auto" }} />
          {SR && (
            <button onClick={toggleVoice} className="pxfont" style={{ ...px(listening ? T.red : T.outline), background: listening ? T.red : T.btn, color: "#fff", padding: "0 12px", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>🎤</button>
          )}
          <button onClick={handleSend} disabled={busy || !input.trim()} className="pxfont"
            style={{ ...pxButton(!!input.trim() && !busy), padding: "0 16px", fontSize: 14, flexShrink: 0 }}>➤</button>
        </div>
        <p className="hand" style={{ margin: "8px 2px 0", fontSize: 15, color: T.muted, textAlign: "center" }}>{t("autosave")}</p>
      </div>

      {/* ——— Панели ——— */}
      {panel === "notes" && (
        <Panel title={t("notesLbl")} onClose={() => setPanel(null)} t={t}>
          <textarea value={noteVal} onChange={(e) => setNoteVal(e.target.value)} placeholder={t("notePh")} rows={2} style={{ ...inputStyle, fontSize: 16 }} />
          <button onClick={addNoteFn} disabled={!noteVal.trim()} className="pxfont" style={{ ...pxButton(!!noteVal.trim()), width: "100%", marginTop: 8, padding: "11px 0", fontSize: 10 }}>{t("addNote")}</button>
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {notes.length === 0 && <p className="hand" style={{ color: T.muted, fontSize: 17 }}>{t("noNotes")}</p>}
            {[...notes].reverse().map((n) => (
              <div key={n.id} className="hand" style={{ ...px(), background: T.paperMsg, color: T.ink, padding: "9px 12px", fontSize: 17 }}>
                <span style={{ color: "#8a6a3f", fontSize: 15 }}>({n.at_progress})</span> {n.text}
                <button onClick={() => setNotes(notes.filter((x) => x.id !== n.id))} style={{ float: "right", border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {panel === "charMap" && (
        <Panel title={t("charMapLbl")} onClose={() => setPanel(null)} t={t}>
          <button onClick={rebuildMap} disabled={mapBusy} className="pxfont" style={{ ...pxButton(!mapBusy), width: "100%", padding: "12px 0", fontSize: 10 }}>
            {mapBusy ? <span>{t("searching")}<span className="cursor" /></span> : t("charMapBtn")}
          </button>
          <div className="hand" style={{ marginTop: 12, color: charMap ? T.ink : T.muted, background: charMap ? T.paperMsg : "transparent", ...(charMap ? px() : {}), padding: charMap ? "12px 14px" : 0, fontSize: 17, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
            {charMap || t("charMapEmpty")}
          </div>
        </Panel>
      )}
      {panel === "predict" && (
        <Panel title={t("predictLbl")} onClose={() => setPanel(null)} t={t}>
          {!finished && (<>
            <textarea value={predictVal} onChange={(e) => setPredictVal(e.target.value)} placeholder={t("predictPh")} rows={2} style={{ ...inputStyle, fontSize: 16 }} />
            <button onClick={addPrediction} disabled={!predictVal.trim()} className="pxfont" style={{ ...pxButton(!!predictVal.trim()), width: "100%", marginTop: 8, padding: "11px 0", fontSize: 10 }}>{t("predictAdd")}</button>
          </>)}
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {predictions.length === 0 && <p className="hand" style={{ color: T.muted, fontSize: 17 }}>{t("noPredicts")}</p>}
            {predictions.map((p) => (
              <div key={p.id} className="hand" style={{ ...px(T.gold), background: "rgba(60,50,20,0.5)", color: T.gold, padding: "9px 12px", fontSize: 17 }}>
                🔮 {finished ? p.text : `${p.text.slice(0, 24)}${p.text.length > 24 ? "…" : ""}`} <span style={{ fontSize: 14, opacity: 0.7 }}>· {finished ? p.at_progress : t("sealed")}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {panel === "emo" && (
        <Panel title={t("emoLbl")} onClose={() => setPanel(null)} t={t}>
          {emo.length === 0 && <p className="hand" style={{ color: T.muted, fontSize: 17 }}>{t("noEmo")}</p>}
          <div style={{ display: "grid", gap: 6 }}>
            {emo.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{e.emoji}</span>
                <div style={{ flex: 1, height: 12, ...px(), background: T.track }}>
                  <div style={{ width: `${20 + (EMOJIS.indexOf(e.emoji) + 1) * 15}%`, height: "100%", background: [T.green, "#7ea8e8", T.red, "#8a86ad", T.gold][EMOJIS.indexOf(e.emoji)] || T.green }} />
                </div>
                <span className="hand" style={{ color: T.muted, fontSize: 15, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.at}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {panel === "chatSettings" && (
        <Panel title="⚙️" onClose={() => setPanel(null)} t={t}>
          <button onClick={() => setSlow(!slow)} className="hand" style={{ display: "flex", justifyContent: "space-between", width: "100%", background: T.cardBg, ...px(slow ? T.gold : T.outline), color: slow ? T.gold : T.muted, padding: "11px 14px", fontSize: 18, cursor: "pointer", marginBottom: 12 }}>
            <span>{t("slowLbl")}</span><span className="pxfont" style={{ fontSize: 10 }}>{slow ? "ON" : "OFF"}</span>
          </button>
          <p className="hand" style={{ color: T.gold, fontSize: 17, margin: "0 0 8px" }}>{t("polyLbl")}:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <button onClick={() => setDiscussLang(null)} className="pxfont" style={{ ...px(!discussLang ? T.gold : T.outline), background: T.btn, color: !discussLang ? T.gold : T.muted, padding: "8px 10px", fontSize: 9, cursor: "pointer" }}>{t("offLbl").toUpperCase()}</button>
            {LANGS.map((l) => (
              <button key={l.id} onClick={() => setDiscussLang(l.id)} style={{ ...px(discussLang === l.id ? T.gold : T.outline), background: T.btn, boxShadow: discussLang === l.id ? GLOW : "none", fontSize: 20, padding: "5px 9px", cursor: "pointer", lineHeight: 1 }}>{l.flag}</button>
            ))}
          </div>
          {discussLang && <input value={polyLevel} onChange={(e) => setPolyLevel(e.target.value)} placeholder={t("polyLevelPh")} style={{ ...inputStyle, fontSize: 16 }} />}
        </Panel>
      )}
      {panel === "focus" && (
        <Panel title={t("focusLbl")} onClose={() => { if (!focusTimer.current) setPanel(null); }} t={t}>
          {focusLeft > 0 ? (
            <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}><span className="flame" style={{ display: "inline-block" }}>🔥</span></div>
              <div style={{ width: 90, height: 16, margin: "0 auto", background: T.wood, ...px() }} />
              <div className="pxfont" style={{ fontSize: 24, color: T.gold, margin: "16px 0" }}>{fmt(focusLeft)}</div>
              <button onClick={stopFocus} className="pxfont" style={{ ...pxButton(true), padding: "12px 20px", fontSize: 10 }}>{t("focusStop")}</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "8px 0" }}>
              {[15, 30, 45].map((m) => (
                <button key={m} onClick={() => startFocus(m)} className="pxfont" style={{ ...pxButton(true), padding: "16px 14px", fontSize: 11 }}>{m} {t("minutes")}</button>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function AuthScreen({ t, lang, onLangCycle, problem }) {
  return (
    <div className="view" style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 18px 40px" }}>
      <button onClick={onLangCycle} className="pxfont" title="Language"
        style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none",
          color: T.muted, fontSize: 9, cursor: "pointer" }}>{lang.toUpperCase()}</button>

      <img src={IMG.logo} alt="" style={{ width: 96, filter: "drop-shadow(4px 4px 0 rgba(0,0,0,0.45))" }} />
      <div className="pxfont" style={{ color: T.gold, fontSize: 15, marginTop: 14,
        textShadow: `3px 3px 0 ${T.outline}` }}>{t("authTitle")}</div>
      <div className="hand" style={{ color: T.muted, fontSize: 17, marginTop: 6, textAlign: "center", maxWidth: 320 }}>
        {t("authSubtitle")}
      </div>

      {problem && (
        <div className="hand" style={{ marginTop: 16, fontSize: 16, color: T.red, textAlign: "center", maxWidth: 320 }}>
          {t("authFailed")}
        </div>
      )}

      {/* Обычная ссылка, а не fetch: браузер должен уйти на страницу согласия
          Яндекса, а обмен кода на токен происходит на сервере. */}
      <a href={`${import.meta.env.BASE_URL}api/auth/start`} className="pxfont"
        style={{ width: "100%", maxWidth: 340, marginTop: 24, ...px(), background: T.gold, color: "#3a2a10",
          padding: "14px 12px", fontSize: 10, textAlign: "center", textDecoration: "none",
          boxShadow: `4px 4px 0 rgba(0,0,0,0.35)` }}>
        {t("authYandex")}
      </a>
    </div>
  );
}

// Нижняя навигация. Показывается только на «корневых» экранах: в чате внизу
// поле ввода, а в мастере создания книги панель мешала бы кнопке «Начать».
const TAB_SCREENS = ["home", "library", "quotes", "profile"];

function TabBar({ t, view, onGo }) {
  const tabs = [
    ["home", "🏠", t("tabHome")],
    ["library", "📚", t("tabShelf")],
    ["quotes", "✂️", t("tabQuotes")],
    ["profile", "📊", t("tabProfile")],
  ];
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, display: "flex",
      background: T.nightDeep, borderTop: `4px solid ${T.outline}`,
      paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map(([id, icon, label]) => {
        const on = view === id;
        return (
          <button key={id} onClick={() => onGo(id)} aria-current={on ? "page" : undefined}
            style={{ flex: 1, background: on ? T.btn : "transparent", border: "none",
              borderTop: `3px solid ${on ? T.gold : "transparent"}`, color: on ? T.gold : T.muted,
              padding: "9px 2px 10px", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
            <span className="pxfont" style={{ fontSize: 7 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [chats, setChats] = useState(null);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    loadState().then(({ chats, settings }) => {
      applyTheme(settings.theme);
      setChats(chats);
      setSettings(settings);
      // Книги, добавленные до появления обложек, подтягивают их при первом
      // запуске — по одной, чтобы не бить по Open Library пачкой.
      chatsRef.current = chats;
      chats.filter((c) => !c.cover && !c.coverTried).slice(0, 6)
        .forEach((c, i) => setTimeout(() => fetchCoverFor(c), 400 * (i + 1)));
    });
  }, []);

  const t = (k) => (I18N[settings.lang] && I18N[settings.lang][k]) || I18N.ru[k];

  function persistChats(next) {
    // Обновляем ref сразу, а не дожидаясь перерисовки: иначе два запроса
    // обложек, вернувшихся подряд, прочитают одно и то же старое состояние,
    // и вторая запись затрёт первую.
    chatsRef.current = next;
    setChats(next);
    saveChats(next).then((ok) => { if (!ok) warnStorageFull(); });
  }

  // Одно предупреждение на сессию: повторять его на каждое сообщение — мучение.
  const storageWarned = useRef(false);
  function warnStorageFull() {
    if (storageWarned.current) return;
    storageWarned.current = true;
    pushToast(t("storageFull"));
  }
  // Сессия: undefined — ещё выясняем, null — не вошёл, объект — вошёл.
  // Пока Supabase не настроен, считаем «вход не требуется» и работаем как раньше.
  // Кто вошёл, узнаём у своего же сервера: сессия лежит в httpOnly-куке,
  // прочитать её из JavaScript нельзя — это и защищает её от кражи скриптом.
  // auth === undefined — ещё выясняем; { configured, user } — ответ получен.
  const [auth, setAuth] = useState(undefined);
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}api/auth/me`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { user: null, configured: false }))
      .catch(() => ({ user: null, configured: false }))  // сервера нет — работаем локально
      .then((d) => { if (alive) setAuth(d); });
    return () => { alive = false; };
  }, []);

  const authOn = Boolean(auth && auth.configured);
  const session = auth ? auth.user : undefined;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // Обложки догружаются асинхронно, поэтому нужен свежий список на момент
  // ответа сети, а не тот, что был захвачен замыканием при запуске запроса.
  const chatsRef = useRef(chats);
  chatsRef.current = chats;
  function persistSettings(next) {
    if (next.theme !== settingsRef.current.theme) applyTheme(next.theme);
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next).then((ok) => { if (!ok) warnStorageFull(); });
  }
  const [toasts, setToasts] = useState([]);
  const [levelParty, setLevelParty] = useState(false);
  function pushToast(text) {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 1900);
  }
  function addXp(n) {
    const s = settingsRef.current;
    const before = 1 + Math.floor((s.xp || 0) / 100);
    const xp = (s.xp || 0) + n;
    const after = 1 + Math.floor(xp / 100);
    persistSettings({ ...s, xp, streak: bumpStreak(s.streak || { count: 0, last: "" }) });
    pushToast(`⭐ +${n} XP`);
    if (after > before) {
      pushToast(`🎉 ${t("level")} ${after}!`);
      setLevelParty(true);
      setTimeout(() => setLevelParty(false), 2300);
    }
  }
  function addMinutes(n) {
    const s = settingsRef.current;
    persistSettings({ ...s, minutes: (s.minutes || 0) + n });
  }

  function createChat(data) {
    const chat = { id: Date.now(), ...data, cover: "", coverTried: false, messages: [], quotes: [], notes: [], predictions: [], emo: [], charMap: "", slow: false, discussLang: null, polyLevel: "", finished: false, lastSeen: Date.now(), createdAt: Date.now() };
    persistChats([chat, ...(chats || [])]);
    fetchCoverFor(chat);
    setActiveId(chat.id);
    setView("chat");
  }
  // Обложка ищется в фоне и один раз: coverTried не даёт долбить Open Library
  // при каждом открытии библиотеки, если книга там просто не находится.
  function fetchCoverFor(chat) {
    if (!chat || chat.cover || chat.coverTried || !chat.book) return;
    findCover(chat.book)
      .then((url) => patchChat(chat.id, { cover: url, coverTried: true }))
      .catch(() => patchChat(chat.id, { coverTried: true }));
  }

  function patchChat(id, patch) {
    const list = chatsRef.current || [];
    const found = list.find((c) => c.id === id);
    if (!found) return;
    persistChats(list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function updateChat(updated) { persistChats((chats || []).map((c) => (c.id === updated.id ? updated : c))); }
  function deleteChat(id) { persistChats((chats || []).filter((c) => c.id !== id)); }
  function importAll(data) {
    persistChats(Array.isArray(data.chats) ? data.chats : []);
    persistSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  }

  const active = (chats || []).find((c) => c.id === activeId);
  const limit = settings.pro ? 10 : 2;
  // Панель — только когда пользователь уже внутри: на экране входа вкладки
  // никуда не ведут, а отступ под них оставляет пустую полосу.
  const signedIn = !authOn || Boolean(session);
  const showTabs = signedIn && chats !== null && TAB_SCREENS.includes(view);

  return (
    <div style={{ background: `linear-gradient(${T.night}, ${T.nightDeep})`, minHeight: "100vh", color: T.white,
      // Оставляем место под нижнюю панель, иначе она накрывает последнюю карточку.
      paddingBottom: showTabs ? "calc(66px + env(safe-area-inset-bottom))" : 0 }}>
      {FONTS}
      <Stars />
      <div aria-live="polite" style={{ position: "fixed", left: 0, right: 0, bottom: showTabs ? 150 : 96, zIndex: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
        {toasts.map((x) => (
          <div key={x.id} className="toast pxfont" style={{ background: T.paperMsg, color: "#5e3a1f", ...px(T.gold), padding: "9px 14px", fontSize: 10, boxShadow: `3px 3px 0 rgba(0,0,0,0.4)` }}>{x.text}</div>
        ))}
      </div>
      {levelParty && (
        <div style={{ position: "fixed", inset: 0, zIndex: 65, pointerEvents: "none" }}><Confetti /></div>
      )}
      {auth === undefined ? (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <div className="pxfont" style={{ color: T.muted, fontSize: 9 }}>{t("loading")}<span className="cursor" /></div>
        </div>
      ) : authOn && !session ? (
        <AuthScreen t={t} lang={settings.lang}
          problem={new URLSearchParams(window.location.search).get("auth") === "failed"}
          onLangCycle={() => {
            const codes = Object.keys(I18N);
            const next = codes[(codes.indexOf(settings.lang) + 1) % codes.length];
            persistSettings({ ...settings, lang: next });
          }} />
      ) : chats === null ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, position: "relative", zIndex: 1 }}>
          <img src={IMG.logo} alt="" className="logo" style={{ width: 120, imageRendering: "auto", filter: "drop-shadow(4px 4px 0 rgba(0,0,0,0.45))" }} />
          <div className="pxfont" style={{ color: T.gold, fontSize: 16, textShadow: `3px 3px 0 ${T.outline}`, lineHeight: 1.6 }}>ЧИТАЕМ ВМЕСТЕ</div>
          <div className="pxfont" style={{ color: T.muted, fontSize: 9 }}>{t("loading")}<span className="cursor" /></div>
        </div>
      ) : view === "home" ? (
        <Home t={t} settings={settings} chats={chats} onGo={(v) => setView(v)} />
      ) : view === "settings" ? (
        <Settings t={t} settings={settings} chats={chats} onChange={persistSettings} onBack={() => setView("home")} onImport={importAll} />
      ) : view === "shop" ? (
        <Shop t={t} settings={settings} onChange={persistSettings} onBack={() => setView("home")} />
      ) : view === "ach" ? (
        <Achievements t={t} settings={settings} chats={chats} onBack={() => setView("home")} />
      ) : view === "pro" ? (
        <ProScreen t={t} settings={settings} onChange={persistSettings} onBack={() => setView("home")} />
      ) : view === "quotes" ? (
        <Quotes t={t} chats={chats} onUpdateChat={updateChat} onBack={() => setView("library")} />
      ) : view === "profile" ? (
        <Profile t={t} chats={chats} settings={settings} onBack={() => setView("library")} />
      ) : view === "setup" ? (
        <Setup t={t} lang={settings.lang} pro={settings.pro} onStart={createChat} onBack={() => setView("library")} />
      ) : view === "chat" && active ? (
        <Chat key={active.id} t={t} lang={settings.lang} settings={settings} chat={active} onUpdate={updateChat} onBack={() => { setActiveId(null); setView("library"); }} addXp={addXp} addMinutes={addMinutes} />
      ) : (
        <Library t={t} lang={settings.lang} chats={chats} settings={settings}
          onOpen={(id) => { setActiveId(id); setView("chat"); }}
          onNew={() => { if (chats.length < limit) { setView("setup"); } else if (!settings.pro) { setView("pro"); } }}
          onDelete={deleteChat} onMenu={() => setView("home")} onQuotes={() => setView("quotes")} onProfile={() => setView("profile")}
          onIntroDone={() => persistSettings({ ...settings, seenIntro: true })}
          onSettings={persistSettings}
          onQuickAdd={(data) => { const chat = { id: Date.now(), ...data, messages: [], quotes: [], notes: [], predictions: [], emo: [], charMap: "", slow: false, discussLang: null, polyLevel: "", finished: false, lastSeen: Date.now(), createdAt: Date.now() }; persistChats([chat, ...(chats || [])]); }} />
      )}
      {showTabs && <TabBar t={t} view={view} onGo={(id) => { setActiveId(null); setView(id); }} />}
    </div>
  );
}
