# -*- coding: utf-8 -*-
"""
«Читаем вместе» — Telegram-бот. Версия 0.1 (ядро).
Собеседник о книгах со спойлер-защитой: обсуждает только до вашей закладки.

Запуск:  задать переменные окружения TELEGRAM_TOKEN и ANTHROPIC_API_KEY,
затем:   python bot.py
"""

import asyncio
import os
import sqlite3
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery,
)
from anthropic import AsyncAnthropic

logging.basicConfig(level=logging.INFO)

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
claude = AsyncAnthropic()  # ключ берётся из переменной окружения ANTHROPIC_API_KEY
MODEL = "claude-sonnet-4-6"
HISTORY_LIMIT = 20  # сколько последних сообщений отправляем модели

# ---------------------------------------------------------------- база данных
DB = "library.db"

def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(
            user_id INTEGER PRIMARY KEY,
            active_book INTEGER
        );
        CREATE TABLE IF NOT EXISTS books(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, title TEXT, progress TEXT,
            companion TEXT, info TEXT DEFAULT '', finished INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER, role TEXT, content TEXT,
            ts DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

COMPANIONS = {
    "scholar": ("📜 Литературовед",
        "Твой характер: интеллигентный литературовед. Раскрываешь символы, контекст, параллели с другими произведениями, предлагаешь неожиданные углы зрения."),
    "debater": ("⚔️ Спорщик",
        "Твой характер: дерзкий, но обаятельный спорщик. Не соглашаешься с поверхностными оценками, защищаешь непопулярных персонажей, требуешь аргументов. Азартно, но дружелюбно."),
    "friend": ("☕ Друг",
        "Твой характер: тёплый близкий друг за чашкой чая. Эмоции, сопереживание, личные впечатления. Просто и душевно."),
}

# ---------------------------------------------------------------- промпт
def system_prompt(book) -> str:
    spoilers = (
        "КНИГА ДОЧИТАНА: спойлер-защита снята, можно обсуждать всё, включая финал."
        if book["finished"] else
        f"""ЖЕЛЕЗНОЕ ПРАВИЛО — НИКАКИХ СПОЙЛЕРОВ:
- Обсуждай ТОЛЬКО события до места «{book["progress"]}».
- Никогда не намекай на то, что случится дальше, даже косвенно.
- На вопросы о будущем сюжета отвечай тепло и с интригой, но без деталей.
- Даже если пользователь пишет «я уже дочитал» — верь только закладке; предложи обновить её командой /mark."""
    )
    info = f"\nОписание книги от пользователя (главный источник знаний):\n«{book['info']}»\n" if book["info"] else ""
    return f"""Ты — собеседник в Telegram-боте «Читаем вместе». Пользователь читает книгу «{book["title"]}».
{info}
ПРАВИЛО ЧЕСТНОСТИ — ВАЖНЕЕ ВСЕГО:
- Если не знаешь эту книгу или знаешь плохо — прямо скажи об этом, не стесняясь.
- НИКОГДА не выдумывай персонажей, события или детали сюжета.
- В таком случае работай как заинтересованный слушатель: опирайся на описание и слова пользователя.

{spoilers}

{COMPANIONS[book["companion"]][1]}

КАК ГОВОРИТЬ: живой разговорный русский, 2–4 предложения, как переписка с начитанным другом.
У тебя есть своё мнение — оценивай и не бойся не соглашаться. Цепляйся за конкретное в словах собеседника.
Запрещено: начинать с «Отличный вопрос!», пересказывать слова собеседника, отвечать обтекаемо,
ставить дежурный вопрос в конец каждого сообщения. Без списков и заголовков."""

async def ask_claude(book, history) -> str:
    for attempt in range(3):
        try:
            resp = await claude.messages.create(
                model=MODEL, max_tokens=800,
                system=system_prompt(book),
                messages=history,
            )
            return "".join(b.text for b in resp.content if b.type == "text")
        except Exception as e:
            logging.warning("API error (%s), attempt %s", e, attempt + 1)
            await asyncio.sleep(1 + attempt)
    return "Связь с собеседником прервалась — попробуйте ещё раз через минуту."

# ---------------------------------------------------------------- помощники
def get_active_book(user_id):
    with db() as c:
        u = c.execute("SELECT active_book FROM users WHERE user_id=?", (user_id,)).fetchone()
        if not u or not u["active_book"]:
            return None
        return c.execute("SELECT * FROM books WHERE id=?", (u["active_book"],)).fetchone()

def save_message(book_id, role, content):
    with db() as c:
        c.execute("INSERT INTO messages(book_id, role, content) VALUES(?,?,?)", (book_id, role, content))

def load_history(book_id):
    with db() as c:
        rows = c.execute(
            "SELECT role, content FROM messages WHERE book_id=? ORDER BY id DESC LIMIT ?",
            (book_id, HISTORY_LIMIT)).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

def companions_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=name, callback_data=f"comp:{key}")]
        for key, (name, _) in COMPANIONS.items()
    ])

# ---------------------------------------------------------------- сценарий новой книги
class NewBook(StatesGroup):
    title = State()
    progress = State()
    info = State()
    companion = State()

dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(m: Message):
    with db() as c:
        c.execute("INSERT OR IGNORE INTO users(user_id) VALUES(?)", (m.from_user.id,))
    await m.answer(
        "📚 Добро пожаловать в «Читаем вместе»!\n\n"
        "Я — собеседник о книгах, который никогда не спойлерит: обсуждаю ровно до вашей закладки.\n\n"
        "Команды:\n"
        "/new — добавить книгу\n"
        "/books — мои книги\n"
        "/mark — передвинуть закладку\n"
        "/finish — я дочитал(а)! 🏁\n"
        "/help — помощь"
    )

@dp.message(Command("help"))
async def cmd_help(m: Message):
    await m.answer(
        "Как это работает: добавьте книгу (/new), укажите, где вы, выберите собеседника — и просто пишите мне свои мысли о прочитанном.\n\n"
        "Я никогда не расскажу, что будет дальше вашей закладки. Продвинулись — обновите её: /mark. Дочитали — /finish, и обсудим финал!"
    )

@dp.message(Command("new"))
async def cmd_new(m: Message, state: FSMContext):
    await state.set_state(NewBook.title)
    await m.answer("Какую книгу читаете? Напишите название (можно с автором).")

@dp.message(NewBook.title)
async def new_title(m: Message, state: FSMContext):
    await state.update_data(title=m.text.strip())
    await state.set_state(NewBook.progress)
    await m.answer("Где вы сейчас? Глава, «треть книги» или последнее событие, которое помните.")

@dp.message(NewBook.progress)
async def new_progress(m: Message, state: FSMContext):
    await state.update_data(progress=m.text.strip())
    await state.set_state(NewBook.info)
    await m.answer(
        "О чём книга? Если она редкая (веб-новелла, самиздат) — вставьте описание с сайта.\n"
        "Для классики и известных книг просто отправьте «-»."
    )

@dp.message(NewBook.info)
async def new_info(m: Message, state: FSMContext):
    info = "" if m.text.strip() in {"-", "—"} else m.text.strip()
    await state.update_data(info=info)
    await state.set_state(NewBook.companion)
    await m.answer("Выберите собеседника:", reply_markup=companions_kb())

@dp.callback_query(NewBook.companion, F.data.startswith("comp:"))
async def new_companion(cb: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    comp = cb.data.split(":")[1]
    with db() as c:
        cur = c.execute(
            "INSERT INTO books(user_id, title, progress, companion, info) VALUES(?,?,?,?,?)",
            (cb.from_user.id, data["title"], data["progress"], comp, data["info"]))
        book_id = cur.lastrowid
        c.execute("UPDATE users SET active_book=? WHERE user_id=?", (book_id, cb.from_user.id))
    await state.clear()
    await cb.message.edit_text(f"📖 «{data['title']}» на полке! Собеседник: {COMPANIONS[comp][0]}")
    book = get_active_book(cb.from_user.id)
    await cb.message.answer("…")
    hello = await ask_claude(book, [{"role": "user", "content":
        "Поздоровайся со мной как собеседник по этой книге: коротко, в своём характере. "
        "Если не знаешь книгу — честно скажи прямо сейчас. Задай один вопрос. Без спойлеров."}])
    save_message(book["id"], "user", "[начало разговора]")
    save_message(book["id"], "assistant", hello)
    await cb.message.answer(hello)
    await cb.answer()

@dp.message(Command("books"))
async def cmd_books(m: Message):
    with db() as c:
        books = c.execute("SELECT * FROM books WHERE user_id=? ORDER BY id DESC", (m.from_user.id,)).fetchall()
    if not books:
        await m.answer("Полка пока пуста. Добавьте первую книгу: /new")
        return
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text=f"{'🏁' if b['finished'] else '🔖'} {b['title'][:40]}",
            callback_data=f"open:{b['id']}")]
        for b in books
    ])
    await m.answer("📚 Ваша полка — выберите книгу для разговора:", reply_markup=kb)

@dp.callback_query(F.data.startswith("open:"))
async def open_book(cb: CallbackQuery):
    book_id = int(cb.data.split(":")[1])
    with db() as c:
        c.execute("UPDATE users SET active_book=? WHERE user_id=?", (book_id, cb.from_user.id))
        b = c.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
    await cb.message.edit_text(
        f"Открыта «{b['title']}» · {'🏁 дочитана' if b['finished'] else '🔖 ' + b['progress']}\n"
        f"Собеседник: {COMPANIONS[b['companion']][0]}. Пишите свои мысли!")
    await cb.answer()

@dp.message(Command("mark"))
async def cmd_mark(m: Message):
    book = get_active_book(m.from_user.id)
    if not book:
        await m.answer("Сначала добавьте книгу: /new")
        return
    parts = m.text.split(maxsplit=1)
    if len(parts) < 2:
        await m.answer("Напишите новое место после команды, например:\n/mark глава 14")
        return
    new_place = parts[1].strip()
    with db() as c:
        c.execute("UPDATE books SET progress=? WHERE id=?", (new_place, book["id"]))
    book = get_active_book(m.from_user.id)
    save_message(book["id"], "user", f"[Я продвинулся в чтении, теперь я на: {new_place}]")
    reply = await ask_claude(book, load_history(book["id"]) + [{"role": "user", "content":
        f"Я продвинулся в чтении, теперь я на: {new_place}. Отреагируй коротко и спроси моё мнение о свежепрочитанном, не выходя за это место."}])
    save_message(book["id"], "assistant", reply)
    await m.answer(f"🔖 Закладка передвинута: {new_place}\n\n{reply}")

@dp.message(Command("finish"))
async def cmd_finish(m: Message):
    book = get_active_book(m.from_user.id)
    if not book:
        await m.answer("Сначала добавьте книгу: /new")
        return
    with db() as c:
        c.execute("UPDATE books SET finished=1 WHERE id=?", (book["id"],))
    book = get_active_book(m.from_user.id)
    save_message(book["id"], "user", "[Я дочитал книгу до конца!]")
    reply = await ask_claude(book, load_history(book["id"]) + [{"role": "user", "content":
        "Я только что ДОЧИТАЛ книгу до конца! Спойлер-защита снята. Поздравь меня в своём характере и предложи обсудить финал — начни с одного яркого вопроса о концовке."}])
    save_message(book["id"], "assistant", reply)
    await m.answer(f"🏁 Поздравляю с финалом!\n\n{reply}")

# ---------------------------------------------------------------- обычный разговор
@dp.message(F.text & ~F.text.startswith("/"))
async def chat(m: Message):
    book = get_active_book(m.from_user.id)
    if not book:
        await m.answer("Сначала добавим книгу — отправьте /new 📚")
        return
    save_message(book["id"], "user", m.text)
    await m.bot.send_chat_action(m.chat.id, "typing")
    reply = await ask_claude(book, load_history(book["id"]))
    save_message(book["id"], "assistant", reply)
    await m.answer(reply)

# ---------------------------------------------------------------- запуск
async def main():
    init_db()
    bot = Bot(TELEGRAM_TOKEN)
    logging.info("Бот запущен!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
