# Читаем вместе

Уютный пиксельный дневник чтения: полка книг, собеседник, который обсуждает
прочитанное и никогда не спойлерит дальше твоей закладки, цитаты, заметки,
карта героев, викторины и дебаты.

React + Vite. Запросы к модели идут через собственный серверный эндпоинт, ключ
API остаётся на сервере.

---

## Быстрый старт

```bash
npm install
cp .env.example .env      # впишите свой ANTHROPIC_API_KEY
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
| `ANTHROPIC_API_KEY` | да | — | Ключ Anthropic API. Только на сервере. |
| `CLAUDE_MODEL` | нет | `claude-sonnet-4-6` | Модель для запросов. |
| `PORT` | нет | `3000` | Порт для `npm start`. |

> **Не добавляйте к ключу префикс `VITE_`.** Всё с этим префиксом Vite вшивает
> в клиентский бандл, то есть ключ станет виден любому посетителю.

---

## Деплой

Нужен хостинг, который умеет выполнять серверный код: браузеру нельзя доверить
ключ API, поэтому чисто статический хостинг (GitHub Pages, Object Storage) не
подойдёт — интерфейс откроется, но собеседник отвечать не будет.

`server.js` раздаёт и интерфейс, и `/api/claude` с одного адреса, поэтому CORS
настраивать не нужно нигде.

### Яндекс Облако (Serverless Containers) — основной вариант

```bash
yc init                                   # один раз
ANTHROPIC_API_KEY=sk-ant-... ./deploy/yandex-cloud.sh
```

Скрипт идемпотентный — повторный запуск просто выкатывает новую ревизию.
Он создаёт реестр образов, сервисный аккаунт с нужными ролями, секрет в
Lockbox, собирает и пушит образ, деплоит ревизию и открывает публичный доступ.
В конце печатает адрес вида `https://<id>.containers.yandexcloud.net/`.

Ключ хранится в **Lockbox** и подставляется в контейнер переменной окружения —
в образ он не попадает и в репозитории его нет.

Параметры можно переопределить переменными окружения:

| Переменная | По умолчанию | |
| --- | --- | --- |
| `CONTAINER_NAME` | `chitaem-vmeste` | имя контейнера |
| `MEMORY` | `256MB` | память ревизии |
| `CORES` | `1` | ядра |
| `TIMEOUT` | `300s` | таймаут запроса (максимум у платформы — 10 мин) |

Обновить ключ позже:

```bash
yc lockbox secret add-version --name chitaem-vmeste-anthropic \
  --payload "[{'key': 'ANTHROPIC_API_KEY', 'text_value': 'sk-ant-НОВЫЙ'}]"
./deploy/yandex-cloud.sh          # ревизия подхватит новую версию секрета
```

Полезное:

```bash
yc serverless container get --name chitaem-vmeste          # адрес и статус
yc logging read --group-name default --follow              # логи
yc serverless container revision list --container-name chitaem-vmeste
```

Образ собирается под `linux/amd64` — Serverless Containers работают только на
этой архитектуре, так что сборка с Apple Silicon тоже пройдёт корректно.

### Другие варианты

<details>
<summary>Vercel</summary>

Конфиг в `vercel.json`, функция — в `api/claude.js`.

```bash
npm i -g vercel
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```
</details>

<details>
<summary>Netlify</summary>

Конфиг в `netlify.toml`, функция — в `netlify/functions/claude.js`.

```bash
npm i -g netlify-cli
netlify env:set ANTHROPIC_API_KEY sk-ant-...
netlify deploy --prod
```
</details>

<details>
<summary>Docker где угодно (Render, Railway, Fly, VPS)</summary>

```bash
docker build -t chitaem-vmeste .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... chitaem-vmeste
```

Без Docker: `npm ci && npm run build && npm start`.
</details>

### GitHub Pages не подойдёт

Pages — статический хостинг: он не выполняет серверный код, значит `/api/claude`
там работать не может, а ключ API положить некуда. Если Pages включён на этом
репозитории в режиме «Deploy from a branch», он выкладывает исходники как есть
и отдаёт пустую страницу — сборка там не запускается. Его стоит выключить:
**Settings → Pages → Source: None**.

---

## Структура

```
index.html              каркас страницы
src/main.tsx            точка входа React
src/App.jsx             всё приложение
src/storage.ts          хранилище на localStorage
api/_claude.js          прокси к Anthropic API (общая логика)
deploy/yandex-cloud.sh  деплой в Яндекс Облако
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
