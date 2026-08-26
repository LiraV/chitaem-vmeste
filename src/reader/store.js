/**
 * Хранилище книжных файлов.
 *
 * Разобранная книга — это мегабайты текста, и в localStorage, где лежит всё
 * остальное, ей места нет: там на всё про всё около пяти мегабайт, и полка
 * уже упиралась в этот предел. Поэтому книги живут в IndexedDB, у которой
 * лимит на два порядка больше, и отдельно от настроек: чистка полки не должна
 * задевать тексты, а экспорт настроек — тащить в буфер обмена целый роман.
 *
 * Ключ записи — идентификатор книги на полке, так что файл всегда привязан к
 * своей карточке.
 */

const DB_NAME = "chitaem-vmeste-books";
const STORE = "books";
const VERSION = 1;

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB недоступна")); return; }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("не удалось открыть хранилище"));
  });
  // Неудачную попытку не кешируем: в приватном окне Safari первое открытие
  // падает, но приложение должно уметь попробовать снова.
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function run(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("ошибка хранилища"));
  }));
}

/** @param {number|string} id Идентификатор книги на полке. */
export const getBookFile = (id) => run("readonly", (s) => s.get(String(id)));

export const putBookFile = (id, value) => run("readwrite", (s) => s.put(value, String(id)));

export const deleteBookFile = (id) => run("readwrite", (s) => s.delete(String(id)));

/** Идентификаторы всех сохранённых книг — чтобы знать, где показывать «читать». */
export const listBookFiles = () => run("readonly", (s) => s.getAllKeys());

/** Сколько места занимают книги: показываем в настройках рядом с экспортом. */
export async function booksSize() {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result || []).reduce((n, v) => n + (v.size || 0), 0));
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}
