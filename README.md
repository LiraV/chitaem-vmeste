# Читаем вместе

Уютный пиксельный дневник чтения: полка книг, собеседник, который обсуждает
прочитанное и никогда не спойлерит дальше твоей закладки, цитаты, заметки,
карта героев, викторины и дебаты.

React + Vite. Запросы к модели идут через собственный серверный эндпоинт —
ключ никогда не попадает в браузер. Поддерживаются два поставщика модели:
**Yandex Foundation Models** (по умолчанию) и **Anthropic Claude**.

---

## Быстрый старт

```bash
npm install
cp .env.example .env      # выберите поставщика модели и впишите ключ
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
| `LLM_PROVIDER` | нет | `anthropic` | `anthropic` или `yandex` |
| `YANDEX_FOLDER_ID` | для `yandex` | — | каталог, из которого берётся модель |
| `YANDEX_MODEL` | нет | `yandexgpt` | или `yandexgpt-lite`, или полный `gpt://...` |
| `YANDEX_API_KEY` | нет | — | нужен только вне Яндекс Облака; внутри токен берётся у metadata-сервиса |
| `ANTHROPIC_API_KEY` | для `anthropic` | — | ключ Claude API |
| `CLAUDE_MODEL` | нет | `claude-sonnet-4-6` | модель Anthropic |
| `ALLOWED_ORIGINS` | нет | пусто | домены для CORS, если фронтенд на другом домене |
| `PORT` | нет | `3000` | порт для `npm start` |

> **Не добавляйте к ключам префикс `VITE_`.** Всё с этим префиксом Vite вшивает
> в клиентский бандл, то есть ключ станет виден любому посетителю.

## Деплой

Нужен хостинг, который выполняет серверный код: ключ API нельзя отдать браузеру,
поэтому чисто статический хостинг (GitHub Pages, Object Storage) не подойдёт —
интерфейс откроется, но собеседник отвечать не будет.

**Россия не входит в список поддерживаемых регионов Anthropic.** Если бэкенд
должен стоять внутри России, Claude API оттуда недоступен — переключайтесь на
`LLM_PROVIDER=yandex` (см. «Выбор модели»).

### Всё на Vercel — самый короткий путь

Интерфейс и `/api/claude` оказываются на одном домене: не нужен ни CORS, ни
отдельный адрес бэкенда, ни настройки GitHub Pages.

1. [vercel.com/new](https://vercel.com/new) → войти через GitHub → импортировать
   `chitaem-vmeste`. Конфиг `vercel.json` уже в репозитории, настраивать сборку
   не нужно.
2. В **Environment Variables** добавить `ANTHROPIC_API_KEY` со значением ключа.
3. **Deploy.**

Дальше каждый пуш в `main` выкатывается сам.

Ключ берётся на [platform.claude.com/settings/keys](https://platform.claude.com/settings/keys),
баланс пополняется на [platform.claude.com/settings/billing](https://platform.claude.com/settings/billing).
Подписка claude.ai доступа к API не даёт — это отдельный счёт.

### Интерфейс на GitHub Pages, бэкенд отдельно

Если хочется адрес `lirav.github.io/chitaem-vmeste`, бэкенд всё равно нужен
где-то ещё (Vercel по инструкции выше, без второго шага он бесполезен).

Два разовых действия в репозитории:

1. **Settings → Pages → Source: GitHub Actions.**
   Пока там стоит «Deploy from a branch», GitHub публикует исходники репозитория
   без сборки, и страница будет пустой — что бы ни лежало в `main`.
2. **Settings → Secrets and variables → Actions → Variables** → переменная
   `API_URL` со значением адреса бэкенда, например `https://chitaem-vmeste.vercel.app`.

Затем на бэкенде выставить `ALLOWED_ORIGINS=https://lirav.github.io` — иначе
браузер заблокирует запросы по CORS.

Без `API_URL` workflow намеренно падает: иначе он выложил бы интерфейс, у
которого молчит собеседник.

### Netlify

```bash
npm i -g netlify-cli
netlify env:set ANTHROPIC_API_KEY sk-ant-...
netlify deploy --prod
```

### Docker где угодно (Render, Railway, Fly, VPS)

```bash
docker build -t chitaem-vmeste .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... chitaem-vmeste
```

Без Docker: `npm ci && npm run build && npm start`.

### Яндекс Облако

`deploy/yandex-cloud.sh` разворачивает бэкенд в Serverless Containers. Работает,
но помните про регион: с `LLM_PROVIDER=anthropic` (по умолчанию) запросы к
Claude API из `ru-central1` не пройдут. Для российского хостинга:

```bash
LLM_PROVIDER=yandex ALLOWED_ORIGINS=https://lirav.github.io ./deploy/yandex-cloud.sh
```

Workflow `.github/workflows/deploy-backend.yml` делает то же самое из Actions —
он запускается только вручную, с вкладки Actions.

### Выбор модели

| `LLM_PROVIDER` | Что нужно | Где работает |
| --- | --- | --- |
| `anthropic` (по умолчанию) | `ANTHROPIC_API_KEY` | везде, кроме неподдерживаемых регионов |
| `yandex` | ничего внутри Яндекс Облака — контейнер авторизуется своим сервисным аккаунтом | в том числе из России |

Оба возвращают ответ в одном формате, фронтенд их не различает. Разница одна:
у Anthropic есть серверный веб-поиск, которым пользуется автопоиск описания
книги; Yandex отвечает на этот запрос по собственным знаниям, поэтому для
редких книг описание может быть менее точным.

## Структура

```
index.html              каркас страницы
src/main.tsx            точка входа React
src/App.jsx             всё приложение
src/storage.ts          хранилище на localStorage
api/_llm.js             прокси: валидация, CORS, выбор поставщика
api/_providers/         yandex.js и anthropic.js
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
