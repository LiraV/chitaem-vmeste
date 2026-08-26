/**
 * Достижения.
 *
 * Раньше их было пять и все — «есть/нет»: полка на пять книг, стрик, про-версия.
 * Половину нельзя было получить в первый месяц, и экран выглядел пустым.
 *
 * Теперь список длинный и разбит на группы, у каждого достижения есть шкала
 * прогресса, а самое первое выдаётся за то, что приложение просто открыли, —
 * чтобы экран не встречал новичка рядом серых замков.
 *
 * Достижение описывается идентификатором, значком, группой, порогом и именем
 * счётчика из readerStats. Названия лежат в TEXT отдельно от механики, чтобы
 * добавить достижение можно было одной строкой в ACHIEVEMENTS.
 */

export const GROUPS = ["start", "shelf", "talk", "tools", "collect", "time", "habit", "level", "special"];

// [id, значок, группа, счётчик, порог]
const RAW = [
  ["open",       "🚪", "start",  "opened",     1],
  ["book1",      "📖", "start",  "books",      1],
  ["msg1",       "💬", "start",  "msgs",       1],
  ["bookmark1",  "🔖", "start",  "bookmarks",  1],
  ["quote1",     "✂️", "start",  "quotes",     1],
  ["note1",      "✍️", "start",  "notes",      1],

  ["books3",     "📚", "shelf",  "books",      3],
  ["books10",    "🗄️", "shelf",  "books",     10],
  ["books25",    "🏛️", "shelf",  "books",     25],
  ["finish1",    "🏁", "shelf",  "finished",   1],
  ["finish5",    "🎖️", "shelf",  "finished",   5],
  ["finish25",   "👑", "shelf",  "finished",  25],

  ["msg50",      "🗣️", "talk",   "msgs",      50],
  ["msg500",     "📣", "talk",   "msgs",     500],
  ["msg2000",    "🎤", "talk",   "msgs",    2000],
  ["comp3",      "👥", "talk",   "companions", 3],
  ["compAll",    "🎭", "talk",   "companions", 0], // порог = сколько всего собеседников

  ["quiz1",      "🎯", "tools",  "quiz",       1],
  ["debate1",    "⚖️", "tools",  "debate",     1],
  ["map1",       "🗺️", "tools",  "map",        1],
  ["predict1",   "🔮", "tools",  "predictions", 1],
  ["predict10",  "🌟", "tools",  "predictions", 10],
  ["letter1",    "💌", "tools",  "letter",     1],
  ["review1",    "✒️", "tools",  "review",     1],
  ["emo20",      "📈", "tools",  "emo",       20],

  ["quotes25",   "⭐", "collect", "quotes",    25],
  ["quotes100",  "💎", "collect", "quotes",   100],
  ["notes25",    "📓", "collect", "notes",     25],

  ["min60",      "🕯️", "time",   "minutes",   60],
  ["min600",     "🌙", "time",   "minutes",  600],
  ["min3000",    "☄️", "time",   "minutes", 3000],

  ["streak3",    "🔥", "habit",  "streak",     3],
  ["streak7",    "🌋", "habit",  "streak",     7],
  ["streak30",   "🏔️", "habit",  "streak",    30],
  ["streak100",  "💫", "habit",  "streak",   100],

  ["lvl5",       "🥉", "level",  "level",      5],
  ["lvl15",      "🥈", "level",  "level",     15],
  ["lvl30",      "🥇", "level",  "level",     30],

  ["pro",        "💠", "special", "pro",       1],
  ["blind",      "🎁", "special", "blind",     1],
  ["night",      "🦉", "special", "night",     1],
  ["shared",     "📤", "special", "share",     1],
  ["shop1",      "🛍️", "special", "owned",     1],
  ["shopAll",    "🧸", "special", "owned",     0], // порог = сколько всего платных персонажей
  ["lang2",      "🌍", "special", "lang",      1],
  ["theme2",     "🎨", "special", "theme",     1],
];

export const ACHIEVEMENTS = RAW.map(([id, icon, group, stat, need]) => ({ id, icon, group, stat, need }));

/** XP за достижение: чем выше порог, тем щедрее. */
export function achReward(a) {
  if (a.need >= 500) return 100;
  if (a.need >= 25) return 50;
  if (a.need >= 5) return 25;
  return 10;
}

/**
 * Сводит полку и настройки в плоский набор счётчиков. Всё, что достижения
 * умеют проверять, живёт здесь — сами они ничего не знают ни о чатах, ни о
 * структуре настроек.
 */
export function readerStats(chats, settings, totals = {}) {
  const list = Array.isArray(chats) ? chats : [];
  const s = settings || {};
  const f = s.flags || {};
  const sum = (fn) => list.reduce((n, c) => n + fn(c), 0);
  const companions = new Set();
  list.forEach((c) => { if (c.companionId) companions.add(c.companionId); });
  return {
    opened: 1,
    books: list.length,
    finished: list.filter((c) => c.finished).length,
    msgs: sum((c) => (c.messages || []).filter((m) => m.role === "user" && !m.hidden).length),
    quotes: sum((c) => (c.quotes || []).length),
    notes: sum((c) => (c.notes || []).length),
    predictions: sum((c) => (c.predictions || []).length),
    emo: sum((c) => (c.emo || []).length),
    companions: companions.size,
    minutes: Math.round(s.minutes || 0),
    streak: s.streak?.count || 0,
    level: 1 + Math.floor((s.xp || 0) / 100),
    owned: (s.owned || []).length,
    pro: s.pro ? 1 : 0,
    bookmarks: f.bookmark || 0,
    quiz: f.quiz || 0,
    debate: f.debate || 0,
    map: f.map || 0,
    letter: f.letter || 0,
    review: f.review || 0,
    blind: f.blind || 0,
    night: f.night || 0,
    share: f.share || 0,
    lang: f.lang || 0,
    theme: f.theme || 0,
    ...totals,
  };
}

/**
 * Возвращает достижения с текущим прогрессом. `totals` задаёт пороги для тех
 * двух достижений, где «нужно всё»: число собеседников и число покупаемых
 * персонажей известно только приложению.
 */
export function evaluate(chats, settings, totals = {}) {
  const st = readerStats(chats, settings);
  return ACHIEVEMENTS.map((a) => {
    const need = a.need || (a.id === "compAll" ? totals.companions : totals.owned) || 1;
    const cur = Math.min(st[a.stat] || 0, need);
    return { ...a, need, cur, ok: cur >= need };
  });
}

const TEXT = {
  ru: {
    groups: { start: "Первые шаги", shelf: "Полка", talk: "Разговоры", tools: "Инструменты", collect: "Собрание", time: "Часы", habit: "Привычка", level: "Опыт", special: "Особое" },
    open: ["Порог библиотеки", "Открыть приложение"],
    book1: ["Первая книга", "Поставить книгу на полку"],
    msg1: ["Первое слово", "Написать собеседнику"],
    bookmark1: ["Закладка", "Сдвинуть закладку в книге"],
    quote1: ["Выписка", "Сохранить первую цитату"],
    note1: ["На полях", "Записать первую заметку"],
    books3: ["Стопка", "Три книги на полке"],
    books10: ["Шкаф", "Десять книг на полке"],
    books25: ["Читальный зал", "Двадцать пять книг на полке"],
    finish1: ["Точка", "Дочитать книгу до конца"],
    finish5: ["Пять корешков", "Дочитать пять книг"],
    finish25: ["Хранитель", "Дочитать двадцать пять книг"],
    msg50: ["Разговорились", "50 сообщений собеседнику"],
    msg500: ["Долгие беседы", "500 сообщений собеседнику"],
    msg2000: ["Голос в ночи", "2000 сообщений собеседнику"],
    comp3: ["Разные голоса", "Поговорить с тремя собеседниками"],
    compAll: ["Вся компания", "Поговорить со всеми собеседниками"],
    quiz1: ["Проверка", "Пройти викторину"],
    debate1: ["Спор", "Устроить дебаты о книге"],
    map1: ["Картограф", "Составить карту героев"],
    predict1: ["Ясновидец", "Запечатать предсказание"],
    predict10: ["Оракул", "Запечатать десять предсказаний"],
    letter1: ["Письмо герою", "Написать письмо после финала"],
    review1: ["Рецензент", "Написать рецензию на книгу"],
    emo20: ["Карта чувств", "Отметить двадцать эмоций"],
    quotes25: ["Тетрадь цитат", "Двадцать пять цитат"],
    quotes100: ["Сокровищница", "Сто цитат"],
    notes25: ["Записная книжка", "Двадцать пять заметок"],
    min60: ["Первый час", "Час чтения в приложении"],
    min600: ["Десять часов", "Десять часов чтения"],
    min3000: ["Пятьдесят часов", "Пятьдесят часов чтения"],
    streak3: ["Три дня подряд", "Заходить три дня подряд"],
    streak7: ["Неделя", "Заходить семь дней подряд"],
    streak30: ["Месяц", "Заходить тридцать дней подряд"],
    streak100: ["Сто дней", "Заходить сто дней подряд"],
    lvl5: ["Пятый уровень", "Дорасти до пятого уровня"],
    lvl15: ["Пятнадцатый уровень", "Дорасти до пятнадцатого уровня"],
    lvl30: ["Тридцатый уровень", "Дорасти до тридцатого уровня"],
    pro: ["Про-читатель", "Открыть про-версию"],
    blind: ["Свидание вслепую", "Нажать «Удиви меня»"],
    night: ["Полуночник", "Читать после полуночи"],
    shared: ["Книжный клуб", "Поделиться своей полкой"],
    shop1: ["Новый жилец", "Купить персонажа на полку"],
    shopAll: ["Полный дом", "Собрать всех персонажей"],
    lang2: ["Полиглот", "Сменить язык приложения"],
    theme2: ["Своя атмосфера", "Сменить тему оформления"],
  },
  en: {
    groups: { start: "First steps", shelf: "The shelf", talk: "Conversations", tools: "Tools", collect: "Collections", time: "Hours", habit: "Habit", level: "Experience", special: "Special" },
    open: ["Through the door", "Open the app"],
    book1: ["First book", "Put a book on the shelf"],
    msg1: ["First word", "Write to your companion"],
    bookmark1: ["Bookmark", "Move your bookmark"],
    quote1: ["Clipping", "Save your first quote"],
    note1: ["In the margins", "Write your first note"],
    books3: ["A small stack", "Three books on the shelf"],
    books10: ["A cabinet", "Ten books on the shelf"],
    books25: ["Reading room", "Twenty-five books on the shelf"],
    finish1: ["The last page", "Finish a book"],
    finish5: ["Five spines", "Finish five books"],
    finish25: ["Keeper", "Finish twenty-five books"],
    msg50: ["Warmed up", "50 messages to your companion"],
    msg500: ["Long talks", "500 messages to your companion"],
    msg2000: ["A voice at night", "2000 messages to your companion"],
    comp3: ["Different voices", "Talk with three companions"],
    compAll: ["The whole company", "Talk with every companion"],
    quiz1: ["Pop quiz", "Take a quiz"],
    debate1: ["The argument", "Hold a debate about a book"],
    map1: ["Cartographer", "Build a character map"],
    predict1: ["Second sight", "Seal a prediction"],
    predict10: ["Oracle", "Seal ten predictions"],
    letter1: ["Letter to a character", "Write a letter after the finale"],
    review1: ["Reviewer", "Write a review of a book"],
    emo20: ["Map of feelings", "Log twenty emotions"],
    quotes25: ["Commonplace book", "Twenty-five quotes"],
    quotes100: ["Treasury", "A hundred quotes"],
    notes25: ["Notebook", "Twenty-five notes"],
    min60: ["First hour", "One hour of reading"],
    min600: ["Ten hours", "Ten hours of reading"],
    min3000: ["Fifty hours", "Fifty hours of reading"],
    streak3: ["Three in a row", "Show up three days running"],
    streak7: ["A week", "Show up seven days running"],
    streak30: ["A month", "Show up thirty days running"],
    streak100: ["A hundred days", "Show up a hundred days running"],
    lvl5: ["Level five", "Reach level five"],
    lvl15: ["Level fifteen", "Reach level fifteen"],
    lvl30: ["Level thirty", "Reach level thirty"],
    pro: ["Pro reader", "Unlock Pro"],
    blind: ["Blind date", "Tap Surprise me"],
    night: ["Night owl", "Read after midnight"],
    shared: ["Book club", "Share your shelf"],
    shop1: ["A new tenant", "Buy a character for the shelf"],
    shopAll: ["Full house", "Collect every character"],
    lang2: ["Polyglot", "Switch the app language"],
    theme2: ["Your own mood", "Switch the theme"],
  },
  de: {
    groups: { start: "Erste Schritte", shelf: "Das Regal", talk: "Gespräche", tools: "Werkzeuge", collect: "Sammlungen", time: "Stunden", habit: "Gewohnheit", level: "Erfahrung", special: "Besonderes" },
    open: ["Über die Schwelle", "Die App öffnen"],
    book1: ["Erstes Buch", "Ein Buch ins Regal stellen"],
    msg1: ["Erstes Wort", "Dem Begleiter schreiben"],
    bookmark1: ["Lesezeichen", "Das Lesezeichen verschieben"],
    quote1: ["Ausschnitt", "Das erste Zitat sichern"],
    note1: ["Am Rand", "Die erste Notiz schreiben"],
    books3: ["Kleiner Stapel", "Drei Bücher im Regal"],
    books10: ["Ein Schrank", "Zehn Bücher im Regal"],
    books25: ["Lesesaal", "Fünfundzwanzig Bücher im Regal"],
    finish1: ["Letzte Seite", "Ein Buch zu Ende lesen"],
    finish5: ["Fünf Buchrücken", "Fünf Bücher zu Ende lesen"],
    finish25: ["Hüter", "Fünfundzwanzig Bücher zu Ende lesen"],
    msg50: ["Warmgeredet", "50 Nachrichten an den Begleiter"],
    msg500: ["Lange Gespräche", "500 Nachrichten an den Begleiter"],
    msg2000: ["Stimme in der Nacht", "2000 Nachrichten an den Begleiter"],
    comp3: ["Andere Stimmen", "Mit drei Begleitern sprechen"],
    compAll: ["Die ganze Runde", "Mit allen Begleitern sprechen"],
    quiz1: ["Kleine Prüfung", "Ein Quiz spielen"],
    debate1: ["Der Streit", "Eine Debatte führen"],
    map1: ["Kartograf", "Eine Figurenkarte erstellen"],
    predict1: ["Zweites Gesicht", "Eine Vorhersage versiegeln"],
    predict10: ["Orakel", "Zehn Vorhersagen versiegeln"],
    letter1: ["Brief an eine Figur", "Nach dem Finale einen Brief schreiben"],
    review1: ["Rezensent", "Eine Rezension schreiben"],
    emo20: ["Karte der Gefühle", "Zwanzig Gefühle festhalten"],
    quotes25: ["Zitatheft", "Fünfundzwanzig Zitate"],
    quotes100: ["Schatzkammer", "Hundert Zitate"],
    notes25: ["Notizbuch", "Fünfundzwanzig Notizen"],
    min60: ["Erste Stunde", "Eine Stunde gelesen"],
    min600: ["Zehn Stunden", "Zehn Stunden gelesen"],
    min3000: ["Fünfzig Stunden", "Fünfzig Stunden gelesen"],
    streak3: ["Drei am Stück", "Drei Tage hintereinander da sein"],
    streak7: ["Eine Woche", "Sieben Tage hintereinander da sein"],
    streak30: ["Ein Monat", "Dreißig Tage hintereinander da sein"],
    streak100: ["Hundert Tage", "Hundert Tage hintereinander da sein"],
    lvl5: ["Stufe fünf", "Stufe fünf erreichen"],
    lvl15: ["Stufe fünfzehn", "Stufe fünfzehn erreichen"],
    lvl30: ["Stufe dreißig", "Stufe dreißig erreichen"],
    pro: ["Pro-Leser", "Pro freischalten"],
    blind: ["Blind Date", "Auf Überrasch mich tippen"],
    night: ["Nachteule", "Nach Mitternacht lesen"],
    shared: ["Lesekreis", "Das eigene Regal teilen"],
    shop1: ["Neuer Bewohner", "Eine Figur fürs Regal kaufen"],
    shopAll: ["Volles Haus", "Alle Figuren sammeln"],
    lang2: ["Polyglott", "Die Sprache wechseln"],
    theme2: ["Eigene Stimmung", "Das Farbschema wechseln"],
  },
  it: {
    groups: { start: "Primi passi", shelf: "Lo scaffale", talk: "Conversazioni", tools: "Strumenti", collect: "Collezioni", time: "Ore", habit: "Abitudine", level: "Esperienza", special: "Speciali" },
    open: ["Sulla soglia", "Aprire l'app"],
    book1: ["Primo libro", "Mettere un libro sullo scaffale"],
    msg1: ["Prima parola", "Scrivere al compagno di lettura"],
    bookmark1: ["Segnalibro", "Spostare il segnalibro"],
    quote1: ["Ritaglio", "Salvare la prima citazione"],
    note1: ["A margine", "Scrivere la prima nota"],
    books3: ["Una pila", "Tre libri sullo scaffale"],
    books10: ["Un armadio", "Dieci libri sullo scaffale"],
    books25: ["Sala di lettura", "Venticinque libri sullo scaffale"],
    finish1: ["Ultima pagina", "Finire un libro"],
    finish5: ["Cinque dorsi", "Finire cinque libri"],
    finish25: ["Custode", "Finire venticinque libri"],
    msg50: ["Presa la mano", "50 messaggi al compagno"],
    msg500: ["Lunghi discorsi", "500 messaggi al compagno"],
    msg2000: ["Una voce nella notte", "2000 messaggi al compagno"],
    comp3: ["Voci diverse", "Parlare con tre compagni"],
    compAll: ["Tutta la compagnia", "Parlare con tutti i compagni"],
    quiz1: ["Piccola prova", "Fare un quiz"],
    debate1: ["La discussione", "Aprire un dibattito"],
    map1: ["Cartografo", "Creare la mappa dei personaggi"],
    predict1: ["Seconda vista", "Sigillare una previsione"],
    predict10: ["Oracolo", "Sigillare dieci previsioni"],
    letter1: ["Lettera a un personaggio", "Scrivere una lettera dopo il finale"],
    review1: ["Recensore", "Scrivere una recensione"],
    emo20: ["Mappa dei sentimenti", "Segnare venti emozioni"],
    quotes25: ["Quaderno di citazioni", "Venticinque citazioni"],
    quotes100: ["Tesoreria", "Cento citazioni"],
    notes25: ["Taccuino", "Venticinque note"],
    min60: ["Prima ora", "Un'ora di lettura"],
    min600: ["Dieci ore", "Dieci ore di lettura"],
    min3000: ["Cinquanta ore", "Cinquanta ore di lettura"],
    streak3: ["Tre di fila", "Esserci tre giorni di fila"],
    streak7: ["Una settimana", "Esserci sette giorni di fila"],
    streak30: ["Un mese", "Esserci trenta giorni di fila"],
    streak100: ["Cento giorni", "Esserci cento giorni di fila"],
    lvl5: ["Livello cinque", "Arrivare al livello cinque"],
    lvl15: ["Livello quindici", "Arrivare al livello quindici"],
    lvl30: ["Livello trenta", "Arrivare al livello trenta"],
    pro: ["Lettore Pro", "Sbloccare Pro"],
    blind: ["Appuntamento al buio", "Toccare Sorprendimi"],
    night: ["Nottambulo", "Leggere dopo mezzanotte"],
    shared: ["Circolo di lettura", "Condividere il proprio scaffale"],
    shop1: ["Nuovo inquilino", "Comprare un personaggio"],
    shopAll: ["Casa piena", "Collezionare tutti i personaggi"],
    lang2: ["Poliglotta", "Cambiare la lingua dell'app"],
    theme2: ["Atmosfera propria", "Cambiare il tema"],
  },
  ja: {
    groups: { start: "はじめの一歩", shelf: "本棚", talk: "会話", tools: "道具", collect: "収集", time: "時間", habit: "習慣", level: "経験", special: "特別" },
    open: ["扉の内側", "アプリを開く"],
    book1: ["最初の一冊", "本を棚に置く"],
    msg1: ["最初のひとこと", "相手に書いてみる"],
    bookmark1: ["しおり", "しおりを動かす"],
    quote1: ["切り抜き", "引用を初めて保存する"],
    note1: ["余白に", "メモを初めて書く"],
    books3: ["小さな山", "棚に三冊"],
    books10: ["書棚", "棚に十冊"],
    books25: ["読書室", "棚に二十五冊"],
    finish1: ["最後の一頁", "本を読み終える"],
    finish5: ["五つの背表紙", "五冊読み終える"],
    finish25: ["守り手", "二十五冊読み終える"],
    msg50: ["打ち解ける", "相手に50通"],
    msg500: ["長い語らい", "相手に500通"],
    msg2000: ["夜の声", "相手に2000通"],
    comp3: ["違う声", "三人の相手と話す"],
    compAll: ["みんなと", "すべての相手と話す"],
    quiz1: ["小テスト", "クイズに挑む"],
    debate1: ["論戦", "本について討論する"],
    map1: ["地図描き", "人物図をつくる"],
    predict1: ["予感", "予想を封じる"],
    predict10: ["託宣", "予想を十件封じる"],
    letter1: ["登場人物への手紙", "読了後に手紙を書く"],
    review1: ["評者", "書評を書く"],
    emo20: ["感情の地図", "感情を二十回記録する"],
    quotes25: ["引用帖", "引用二十五"],
    quotes100: ["宝物庫", "引用百"],
    notes25: ["手帖", "メモ二十五"],
    min60: ["最初の一時間", "一時間読む"],
    min600: ["十時間", "十時間読む"],
    min3000: ["五十時間", "五十時間読む"],
    streak3: ["三日続けて", "三日続けて訪れる"],
    streak7: ["一週間", "七日続けて訪れる"],
    streak30: ["一か月", "三十日続けて訪れる"],
    streak100: ["百日", "百日続けて訪れる"],
    lvl5: ["レベル5", "レベル5に届く"],
    lvl15: ["レベル15", "レベル15に届く"],
    lvl30: ["レベル30", "レベル30に届く"],
    pro: ["プロの読者", "プロ版を開く"],
    blind: ["ブラインドデート", "おまかせを押す"],
    night: ["夜ふかし", "夜中を過ぎて読む"],
    shared: ["読書会", "自分の棚を共有する"],
    shop1: ["新しい住人", "棚の仲間を買う"],
    shopAll: ["満員の家", "仲間を全員そろえる"],
    lang2: ["多言語", "アプリの言語を変える"],
    theme2: ["自分の色", "テーマを変える"],
  },
  zh: {
    groups: { start: "第一步", shelf: "书架", talk: "对话", tools: "工具", collect: "收藏", time: "时长", habit: "习惯", level: "经验", special: "特别" },
    open: ["跨过门槛", "打开应用"],
    book1: ["第一本书", "把书放上书架"],
    msg1: ["第一句话", "给书友写点什么"],
    bookmark1: ["书签", "挪动书签"],
    quote1: ["剪贴", "保存第一条摘录"],
    note1: ["写在页边", "写下第一条笔记"],
    books3: ["一小摞", "书架上三本书"],
    books10: ["一整柜", "书架上十本书"],
    books25: ["阅览室", "书架上二十五本书"],
    finish1: ["最后一页", "读完一本书"],
    finish5: ["五道书脊", "读完五本书"],
    finish25: ["守书人", "读完二十五本书"],
    msg50: ["聊开了", "给书友发50条"],
    msg500: ["长谈", "给书友发500条"],
    msg2000: ["夜里的声音", "给书友发2000条"],
    comp3: ["不同的声音", "和三位书友聊过"],
    compAll: ["全员到齐", "和所有书友都聊过"],
    quiz1: ["小测", "做一次问答"],
    debate1: ["争辩", "为一本书辩论"],
    map1: ["制图人", "生成人物图谱"],
    predict1: ["预感", "封存一个预言"],
    predict10: ["神谕", "封存十个预言"],
    letter1: ["写给书中人", "读完后写一封信"],
    review1: ["评论者", "写一篇书评"],
    emo20: ["情绪地图", "记录二十次情绪"],
    quotes25: ["摘录本", "二十五条摘录"],
    quotes100: ["珍藏", "一百条摘录"],
    notes25: ["笔记本", "二十五条笔记"],
    min60: ["第一个小时", "读满一小时"],
    min600: ["十小时", "读满十小时"],
    min3000: ["五十小时", "读满五十小时"],
    streak3: ["连续三天", "连着三天来"],
    streak7: ["一周", "连着七天来"],
    streak30: ["一个月", "连着三十天来"],
    streak100: ["一百天", "连着一百天来"],
    lvl5: ["五级", "升到五级"],
    lvl15: ["十五级", "升到十五级"],
    lvl30: ["三十级", "升到三十级"],
    pro: ["专业读者", "开启专业版"],
    blind: ["盲选", "点一次给我惊喜"],
    night: ["夜猫子", "过了午夜还在读"],
    shared: ["读书会", "分享自己的书架"],
    shop1: ["新住客", "买一个书架伙伴"],
    shopAll: ["满屋子", "集齐所有伙伴"],
    lang2: ["多语言", "换一种界面语言"],
    theme2: ["自己的氛围", "换一个主题"],
  },
};

const pick = (lang, id, i) => {
  const row = (TEXT[lang] && TEXT[lang][id]) || TEXT.ru[id];
  return row ? row[i] : id;
};

export const achName = (lang, id) => pick(lang, id, 0);
export const achHint = (lang, id) => pick(lang, id, 1);
export const groupName = (lang, id) =>
  (TEXT[lang] && TEXT[lang].groups[id]) || TEXT.ru.groups[id] || id;
