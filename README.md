# Читаем вместе

Уютный пиксельный дневник чтения: полка книг, собеседник, который обсуждает
прочитанное и никогда не спойлерит дальше твоей закладки, цитаты, заметки,
карта героев, викторины и дебаты.

React + Vite. Запросы к модели идут через собственный серверный эндпоинт —
ключ никогда не попадает в браузер. Поддерживаются три поставщика:
**OpenAI**, **Anthropic Claude** и **Yandex Foundation Models**.

---

## Быстрый старт

```bash
npm install
cp .env.example .env      # впишите OPENAI_API_KEY
npm run dev               # http://localhost:5173
```

`npm run dev` поднимает и фронтенд, и эндпоинт `/api/claude` — как в проде.

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Дев-сервер с горячей перезагрузкой и рабочим `/api/claude` |
| `npm run build` | Прод-сборка в `dist/` |
| `npm run preview` | Просмотр собранного фронтенда (без API) |
| `npm start` | Прод-сервер: раздаёт `dist/` и обслуживает `/api/claude` |
| `npm run typecheck` | Проверка типов |

---

## Переменные окружения

| Переменная | Обяз. | По умолчанию | Описание |
| --- | --- | --- | --- |
| `LLM_PROVIDER` | нет | по наличию ключа | `openai`, `anthropic` или `yandex` |
| `OPENAI_API_KEY` | для `openai` | — | ключ OpenAI |
| `OPENAI_MODEL` | нет | `gpt-5.5` | любая доступная модель |
| `OPENAI_TEMPERATURE` | нет | не отправляется | reasoning-модели его отвергают — задавайте только осознанно |
| `ANTHROPIC_API_KEY` | для `anthropic` | — | ключ Claude API |
| `CLAUDE_MODEL` | нет | `claude-sonnet-4-6` | модель Anthropic |
| `YANDEX_FOLDER_ID` | для `yandex` | — | каталог, из которого берётся модель |
| `YANDEX_MODEL` | нет | `yandexgpt` | или полный `gpt://...` |
| `ALLOWED_ORIGINS` | нет | пусто | домены для CORS, если фронтенд на другом домене |
| `PORT` | нет | `3000` | порт для `npm start` |

Провайдер можно не указывать: если `LLM_PROVIDER` пуст, выбирается тот, чей
ключ присутствует. То есть достаточно задать один `OPENAI_API_KEY`.

> **Не добавляйте к ключам префикс `VITE_`.** Всё с этим префиксом Vite вшивает
> в клиентский бандл, то есть ключ станет виден любому посетителю.

## Деплой

Нужен хостинг, который выполняет серверный код: ключ API нельзя отдать
браузеру, поэтому чисто статический хостинг (GitHub Pages, Object Storage) не
подойдёт — интерфейс откроется, но собеседник отвечать не будет.

### Vercel — рекомендуемый путь

Интерфейс и `/api/claude` оказываются на одном домене: не нужны ни CORS, ни
отдельный адрес бэкенда, ни настройки GitHub Pages.

```bash
npm i -g vercel
vercel login
vercel link                       # выбрать/создать проект
vercel env add OPENAI_API_KEY     # вставить ключ, выбрать Production
vercel --prod
```

Либо то же через веб: [vercel.com/new](https://vercel.com/new) → импортировать
репозиторий → Environment Variables → `OPENAI_API_KEY` → Deploy. Сборку
настраивать не нужно, `vercel.json` уже в репозитории.

Ключ берётся на [platform.openai.com/api-keys](https://platform.openai.com/api-keys),
баланс пополняется в разделе Billing. Подписка ChatGPT Plus доступа к API не
даёт — это отдельный счёт.

Дальше каждый пуш в `main` выкатывается сам.

### Интерфейс на GitHub Pages, бэкенд отдельно

Нужно только если принципиален адрес `lirav.github.io/chitaem-vmeste`. Бэкенд
всё равно должен где-то жить — разверните его по инструкции выше.

1. **Settings → Pages → Source: GitHub Actions.**
   Пока там «Deploy from a branch», GitHub публикует исходники репозитория без
   сборки, и страница будет пустой — что бы ни лежало в `main`.
2. **Settings → Secrets and variables → Actions → Variables** → переменная
   `API_URL` со значением адреса бэкенда, например
   `https://chitaem-vmeste.vercel.app`.
3. На бэкенде выставить `ALLOWED_ORIGINS=https://lirav.github.io`, иначе
   браузер заблокирует запросы по CORS.

Без `API_URL` workflow пропускается: иначе он выложил бы интерфейс, у которого
молчит собеседник.

### Netlify

```bash
npm i -g netlify-cli
netlify env:set OPENAI_API_KEY sk-...
netlify deploy --prod
```

### Docker где угодно (Render, Railway, Fly, VPS)

```bash
docker build -t chitaem-vmeste .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... chitaem-vmeste
```

Без Docker: `npm ci && npm run build && npm start`.

### Яндекс Облако

`deploy/yandex-cloud.sh` разворачивает бэкенд в Serverless Containers. Учтите
регион: ни OpenAI, ни Anthropic не обслуживают Россию, поэтому из `ru-central1`
работает только `LLM_PROVIDER=yandex`:

```bash
LLM_PROVIDER=yandex ALLOWED_ORIGINS=https://lirav.github.io ./deploy/yandex-cloud.sh
```

### Выбор модели

| `LLM_PROVIDER` | Что нужно | Примечание |
| --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | по умолчанию `gpt-5.5` |
| `anthropic` | `ANTHROPIC_API_KEY` | по умолчанию `claude-sonnet-4-6` |
| `yandex` | внутри Яндекс Облака — ничего | единственный, работающий из России |

Все три возвращают ответ в одном формате, фронтенд их не различает.

Одно отличие: у Anthropic есть серверный веб-поиск, которым пользуется
автопоиск описания книги. У OpenAI и Yandex в этой сборке его нет — они
отвечают по собственным знаниям модели, поэтому для редких книг описание может
быть менее точным или не найтись вовсе. Вписать его вручную можно всегда.

## Структура

```
index.html              каркас страницы
src/main.tsx            точка входа React
src/App.jsx             всё приложение
src/storage.ts          хранилище на localStorage
api/_llm.js             прокси: валидация, CORS, выбор поставщика
api/_providers/         openai.js, anthropic.js, yandex.js
deploy/yandex-cloud.sh  деплой бэкенда в Яндекс Облако
.github/workflows/     CI и публикация фронтенда на Pages
api/claude.js           адаптер для Vercel
netlify/functions/      адаптер для Netlify
server.js               прод-сервер для Docker/VPS
```

### Как устроен `/api/claude`

Браузер не ходит в `api.anthropic.com` напрямую — это раскрыло бы ключ и всё
равно упёрлось бы в CORS. Клиент шлёт запрос на свой же `/api/claude`, а сервер
подставляет ключ и переспрашивает Anthropic.

Прокси не проксирует тело запроса как есть: модель задаётся на сервере,
`max_tokens` ограничен сверху, роли и типы сообщений проверяются, а из
инструментов разрешён только веб-поиск. Эндпоинт открыт всем, у кого есть адрес
сайта, — если проект станет публичным, имеет смысл добавить аутентификацию или
лимит запросов.

---

## Данные

Полка, настройки и прогресс лежат в `localStorage` браузера — на сервер ничего
не уходит. Очистка данных сайта удалит библиотеку; в меню есть экспорт и импорт.
