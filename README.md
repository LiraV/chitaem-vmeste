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

Схема: **интерфейс на GitHub Pages, бэкенд в Яндекс Облаке.**

```
Браузер ──> lirav.github.io/chitaem-vmeste/   (статика, GitHub Pages)
   │
   └──────> <id>.containers.yandexcloud.net   (Node-сервер, Яндекс Облако)
                     └──> api.anthropic.com   (ключ живёт только здесь)
```

Ключ API нельзя класть в браузер, поэтому Pages в одиночку не справится — он
только раздаёт статику. Запросы к модели уходят на отдельный бэкенд.

Порядок важен: **сначала бэкенд**, потом фронтенд — при сборке фронтенда нужно
знать адрес бэкенда.

### Шаг 1. Бэкенд в Яндекс Облако

```bash
yc init                                   # один раз

ANTHROPIC_API_KEY=sk-ant-... \
ALLOWED_ORIGINS=https://lirav.github.io \
  ./deploy/yandex-cloud.sh
```

`ALLOWED_ORIGINS` — домен, с которого браузер будет обращаться к API. Только
схема и хост, **без пути и без слэша в конце**: origin у GitHub Pages это
`https://lirav.github.io`, а не `https://lirav.github.io/chitaem-vmeste/`.

Скрипт идемпотентный — повторный запуск выкатывает новую ревизию. Он создаёт
реестр образов, сервисный аккаунт с ролями, секрет в Lockbox, собирает и пушит
образ, деплоит ревизию и открывает публичный доступ. В конце печатает адрес:

```
https://<container_id>.containers.yandexcloud.net
```

**Запишите его — он нужен на шаге 2.**

Ключ хранится в **Lockbox** и подставляется переменной окружения: в образ он не
попадает и в репозитории его нет.

| Переменная | По умолчанию | |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | пусто | домены для CORS |
| `CONTAINER_NAME` | `chitaem-vmeste` | имя контейнера |
| `MEMORY` | `256MB` | память ревизии |
| `CORES` | `1` | ядра |
| `TIMEOUT` | `300s` | таймаут запроса (максимум у платформы — 10 мин) |

### Шаг 2. Фронтенд на GitHub Pages

Две настройки в репозитории, оба раза — один раз:

1. **Settings → Pages → Source: GitHub Actions**
   (если стоит «Deploy from a branch» — обязательно переключить, иначе Pages
   выложит исходники без сборки и страница будет пустой)

2. **Settings → Secrets and variables → Actions → Variables → New variable**
   Имя `API_URL`, значение — адрес контейнера с шага 1.

Дальше всё само: `.github/workflows/pages.yml` собирает фронтенд при каждом
пуше в `main` и публикует. Запустить вручную — вкладка Actions → Deploy
frontend to GitHub Pages → Run workflow.

Если `API_URL` не задан, сборка падает с понятной ошибкой — намеренно: иначе
интерфейс бы открылся, а собеседник молчал.

### Автоматический деплой бэкенда

Чтобы не запускать скрипт руками, деплой может делать GitHub Actions —
`.github/workflows/deploy-backend.yml` запускает **тот же самый**
`deploy/yandex-cloud.sh`, просто на раннере.

Разовая настройка. Сначала локально создать сервисный аккаунт для деплоя:

```bash
yc iam service-account create --name gh-deployer
yc resource-manager folder add-access-binding <folder-id> \
  --role editor --subject serviceAccount:<gh-deployer-id>
yc iam key create --service-account-name gh-deployer --output key.json
```

Затем в **Settings → Secrets and variables → Actions**:

| | Имя | Значение |
| --- | --- | --- |
| Secret | `YC_SA_JSON_CREDENTIALS` | содержимое `key.json` |
| Secret | `ANTHROPIC_API_KEY` | ключ Anthropic (нужен только при первом запуске — дальше он живёт в Lockbox, и секрет можно удалить) |
| Variable | `YC_CLOUD_ID` | `yc config get cloud-id` |
| Variable | `YC_FOLDER_ID` | `yc config get folder-id` |
| Variable | `ALLOWED_ORIGINS` | `https://lirav.github.io` |

После этого бэкенд переезжает сам при каждом пуше в `main`, а адрес контейнера
печатается в сводке запуска.

**Заведите под проект отдельную папку.** Роль `editor` нужна скрипту, чтобы
создать реестр, сервисный аккаунт, секрет и контейнер при первом запуске — но
она даёт полный доступ ко всему, что в папке лежит. Если в ней заодно живут
база данных или DNS-зоны, утёкший ключ достанет и до них.

```bash
yc resource-manager folder create --name chitaem-vmeste
```

Дальше используйте `folder-id` именно этой папки — и в `YC_FOLDER_ID`, и при
выдаче роли. Остальные ресурсы окажутся вне досягаемости ключа.

Альтернатива, если папку заводить не хочется: создайте реестр, контейнер,
секрет и рантайм-аккаунт один раз руками, а деплой-аккаунту выдайте только
`container-registry.images.pusher` + `serverless-containers.admin`.

`key.json` не коммитьте — он уже покрыт `.gitignore`, но проверьте.

### Обновление ключа

```bash
yc lockbox secret add-version --name chitaem-vmeste-anthropic \
  --payload "[{'key': 'ANTHROPIC_API_KEY', 'text_value': 'sk-ant-НОВЫЙ'}]"
./deploy/yandex-cloud.sh
```

### Диагностика

```bash
yc serverless container get --name chitaem-vmeste       # адрес и статус
yc logging read --group-name default --follow           # логи бэкенда
curl -X POST -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"привет"}]}' \
  https://<container_id>.containers.yandexcloud.net/api/claude
```

Если интерфейс открывается, но собеседник молчит — почти всегда одно из двух:
`API_URL` не задан (или задан с ошибкой), либо `ALLOWED_ORIGINS` на бэкенде не
совпадает с доменом Pages. В консоли браузера это видно как ошибка CORS.

### Всё на одной машине

Бэкенд-контейнер раздаёт и собранный интерфейс тоже, так что Pages не
обязателен — можно открыть адрес контейнера напрямую. Тогда `ALLOWED_ORIGINS`
не нужен вовсе: origin один.

<details>
<summary>Vercel</summary>

```bash
npm i -g vercel
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```
</details>

<details>
<summary>Netlify</summary>

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

---

## Структура

```
index.html              каркас страницы
src/main.tsx            точка входа React
src/App.jsx             всё приложение
src/storage.ts          хранилище на localStorage
api/_claude.js          прокси к Anthropic API (общая логика)
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
