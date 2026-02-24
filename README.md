# Posting Checker

API для проверки постинга на WordPress сайтах. Работает на Cloudflare Workers с очередью и D1.

## Стек

- **Hono** — веб-фреймворк
- **Cloudflare Workers** — хостинг
- **Cloudflare Queues** — очередь задач
- **D1** — SQLite база для результатов

## Запуск

```bash
npm install
npm run dev
```

Локально: `.dev.vars` с `API_KEY=test`.

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Локальная разработка |
| `npm run deploy` | Деплой в Cloudflare |
| `npm test` | Тесты |

## API

- **`GET /health`** — проверка доступности
- **`GET /ui`** — Swagger UI
- **`GET /doc`** — OpenAPI спецификация

### Авторизация

Заголовок `x-api-key` для всех `/api/*` маршрутов.

### Эндпоинты

- **`POST /api/add-task`** — добавить задачи (owner, tasks: login, password, site)
- **`GET /api/results`** — получить результаты (owner, since, limit)
