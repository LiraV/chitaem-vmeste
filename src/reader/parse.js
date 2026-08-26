/**
 * Разбор книжных файлов прямо в браузере.
 *
 * Ничего никуда не отправляется: файл читается на устройстве, здесь же
 * разбирается на главы и здесь же остаётся. Поддержаны три формата, которые
 * покрывают почти всё, что у людей лежит в читалках: EPUB, FB2 (в том числе
 * запакованный) и обычный текст. PDF сознательно не поддержан — там текст
 * лежит кусками по координатам, и восстановить из него абзацы, не таща в
 * приложение целую библиотеку рендеринга, невозможно.
 *
 * На выходе всегда одна и та же форма: название, автор и главы, у каждой —
 * заголовок и абзацы простым текстом. Разметку мы намеренно теряем: экран
 * чтения рисует книгу своим шрифтом и своей темой.
 */
import { unzipSync, strFromU8 } from "fflate";

/** Максимальный размер файла: дальше начинает страдать память телефона. */
export const MAX_FILE_BYTES = 30 * 1024 * 1024;

export class ParseError extends Error {}

const textOf = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");

/** Абзацы из куска HTML или XML: теги выбрасываем, пустые строки тоже. */
function paragraphs(root) {
  if (!root) return [];
  root.querySelectorAll("script, style, head, title").forEach((n) => n.remove());
  const out = [];
  root.querySelectorAll("p, div, li, blockquote, h1, h2, h3, h4, h5, h6, br").forEach((n) => {
    if (n.tagName === "BR") { out.push(""); return; }
    // Берём только узлы без вложенных абзацев, иначе текст задвоится.
    if (n.querySelector("p, div, li, blockquote")) return;
    const t = textOf(n);
    if (t) out.push(t);
  });
  if (!out.length) {
    const whole = textOf(root);
    if (whole) out.push(whole);
  }
  return out.filter(Boolean);
}

const parseXml = (source, type) => {
  const doc = new DOMParser().parseFromString(source, type);
  if (doc.querySelector("parsererror")) throw new ParseError("не удалось разобрать файл");
  return doc;
};

// ——— EPUB ———

function readEpub(bytes) {
  let files;
  try { files = unzipSync(bytes); } catch { throw new ParseError("файл повреждён"); }
  const pick = (name) => files[Object.keys(files).find((k) => k.toLowerCase() === name.toLowerCase())];

  // Путь к оглавлению лежит в container.xml, а не в фиксированном месте.
  const container = pick("META-INF/container.xml");
  if (!container) throw new ParseError("это не EPUB");
  const rootPath = parseXml(strFromU8(container), "application/xml")
    .querySelector("rootfile")?.getAttribute("full-path");
  if (!rootPath || !files[rootPath]) throw new ParseError("в EPUB нет оглавления");

  const opf = parseXml(strFromU8(files[rootPath]), "application/xml");
  const base = rootPath.includes("/") ? rootPath.slice(0, rootPath.lastIndexOf("/") + 1) : "";

  const title = textOf(opf.querySelector("metadata title")) || "";
  const author = textOf(opf.querySelector("metadata creator")) || "";

  // Порядок глав задаёт spine, а не порядок файлов в архиве.
  const hrefById = new Map();
  opf.querySelectorAll("manifest item").forEach((it) => {
    hrefById.set(it.getAttribute("id"), it.getAttribute("href"));
  });

  const chapters = [];
  opf.querySelectorAll("spine itemref").forEach((ref) => {
    const href = hrefById.get(ref.getAttribute("idref"));
    if (!href) return;
    // Ссылки внутри OPF относительны его собственной папки.
    const path = decodeURIComponent((base + href).replace(/^\.\//, ""));
    const raw = files[path] || files[path.replace(/^\//, "")];
    if (!raw) return;
    let doc;
    try { doc = parseXml(strFromU8(raw), "application/xhtml+xml"); }
    catch { try { doc = new DOMParser().parseFromString(strFromU8(raw), "text/html"); } catch { return; } }
    const body = doc.body || doc.documentElement;
    const paras = paragraphs(body);
    if (!paras.length) return;
    const heading = textOf(body.querySelector("h1, h2, h3"));
    // Заголовок мы уже вынесли в шапку главы: оставь его ещё и в тексте —
    // и название напечатается дважды подряд.
    if (heading && paras[0] === heading) paras.shift();
    chapters.push({ title: heading || "", paragraphs: paras });
  });

  if (!chapters.length) throw new ParseError("в EPUB не нашлось текста");
  return { title, author, chapters };
}

// ——— FB2 ———

function readFb2(source) {
  const doc = parseXml(source, "application/xml");
  const title = textOf(doc.querySelector("description book-title"));
  const authorNode = doc.querySelector("description author");
  const author = authorNode
    ? [textOf(authorNode.querySelector("first-name")), textOf(authorNode.querySelector("last-name"))].filter(Boolean).join(" ")
    : "";

  const body = doc.querySelector("body");
  if (!body) throw new ParseError("это не FB2");

  // Главы во FB2 — это <section>, но встречаются и вложенные: берём самый
  // глубокий уровень, у которого есть собственный текст.
  let sections = [...body.querySelectorAll("section")].filter((s) => !s.querySelector("section"));
  if (!sections.length) sections = [body];

  const chapters = sections.map((s) => {
    const heading = textOf(s.querySelector("title"));
    // Во FB2 заголовок главы — это <p> внутри <title>; в текст его брать не
    // нужно, он уже стоит в шапке.
    const paras = [...s.querySelectorAll("p, subtitle, v")]
      .filter((n) => !n.closest("title"))
      .map(textOf).filter(Boolean);
    return { title: heading, paragraphs: paras };
  }).filter((c) => c.paragraphs.length);

  if (!chapters.length) throw new ParseError("в FB2 не нашлось текста");
  return { title, author, chapters };
}

// ——— Простой текст ———

function readTxt(source) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  // Строку считаем заголовком главы, если она короткая, одиноко стоит между
  // пустыми и похожа на «Глава 7» или «ЧАСТЬ ВТОРАЯ».
  //
  // Конец слова здесь проверяется явным «дальше не буква и не цифра», а не
  // через \b: граница слова в JavaScript считается по латинице, и после
  // кириллического «глава» её попросту нет — вся кириллическая половина
  // списка не срабатывала, а книга открывалась одной сплошной главой.
  const HEADING = /^(глава|часть|книга|пролог|эпилог|chapter|part|book|prologue|epilogue|kapitel|teil|capitolo|parte|第[一二三四五六七八九十百千\d]+[章部]|\d+\.?)(?![\p{L}\p{N}])/iu;
  const isHeading = (line, i) =>
    line.length > 0 && line.length < 70 &&
    !lines[i - 1]?.trim() && !lines[i + 1]?.trim() && HEADING.test(line);

  const chapters = [];
  let cur = { title: "", paragraphs: [] };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (isHeading(line, i)) {
      if (cur.paragraphs.length) chapters.push(cur);
      cur = { title: line, paragraphs: [] };
      return;
    }
    if (line) cur.paragraphs.push(line);
  });
  if (cur.paragraphs.length) chapters.push(cur);
  if (!chapters.length) throw new ParseError("файл пуст");
  return { title: "", author: "", chapters };
}

/**
 * Разбирает выбранный читателем файл.
 *
 * @param {File} file
 * @returns {Promise<{title: string, author: string, chapters: {title: string, paragraphs: string[]}[], words: number}>}
 */
export async function parseBookFile(file) {
  if (file.size > MAX_FILE_BYTES) throw new ParseError("файл слишком большой");
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let book;
  if (name.endsWith(".epub")) {
    book = readEpub(bytes);
  } else if (name.endsWith(".fb2.zip") || name.endsWith(".fbz")) {
    let files;
    try { files = unzipSync(bytes); } catch { throw new ParseError("файл повреждён"); }
    const inner = Object.keys(files).find((k) => k.toLowerCase().endsWith(".fb2"));
    if (!inner) throw new ParseError("в архиве нет FB2");
    book = readFb2(decodeText(files[inner]));
  } else if (name.endsWith(".fb2")) {
    book = readFb2(decodeText(bytes));
  } else if (name.endsWith(".txt")) {
    book = readTxt(decodeText(bytes));
  } else if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    // Незнакомое расширение, но внутри архив — почти наверняка EPUB.
    book = readEpub(bytes);
  } else {
    throw new ParseError("формат не поддерживается");
  }

  const words = book.chapters.reduce(
    (n, c) => n + c.paragraphs.reduce((m, p) => m + p.split(/\s+/).length, 0), 0);
  if (!book.title) book.title = file.name.replace(/\.[^.]+$/, "");
  return { ...book, words };
}

/**
 * Текст файла с учётом кодировки. FB2 и TXT из русских библиотек часто лежат
 * в windows-1251, и прочитанные как UTF-8 превращаются в мусор.
 */
function decodeText(bytes) {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const declared = utf8.slice(0, 400).match(/encoding=["']([\w-]+)["']/i);
  const name = (declared ? declared[1] : "").toLowerCase();
  if (name && !/utf-?8/.test(name)) {
    try { return new TextDecoder(name).decode(bytes); } catch {}
  }
  // Признак неверной кодировки — символы замены там, где должен быть текст.
  if ((utf8.match(/�/g) || []).length > utf8.length / 200) {
    try { return new TextDecoder("windows-1251").decode(bytes); } catch {}
  }
  return utf8;
}
