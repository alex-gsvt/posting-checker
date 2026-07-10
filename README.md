# Posting Checker

API для проверки постинга на WordPress сайтах. Работает на Cloudflare Workers с очередью и D1.

## Стек

- **Hono** — веб-фреймворк
- **Cloudflare Workers** — хостинг
- **Cloudflare Queues** — очередь задач
- **D1** — SQLite база для результатов

## Первоначальная настройка (Cloudflare)

Репозиторий содержит только код. Перед деплоем создайте собственные ресурсы в своём Cloudflare-аккаунте.

### 1. D1 база данных

```bash
npx wrangler d1 create posting-checker-db
```

Скопируйте `database_id` из вывода и подставьте его в `wrangler.jsonc` вместо `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Примените миграции:

```bash
npx wrangler d1 migrations apply posting-checker-db --local   # для локальной разработки
npx wrangler d1 migrations apply posting-checker-db --remote  # для production
```

### 2. Очереди

Очереди создаются автоматически при первом деплое, если их ещё нет. Имена указаны в `wrangler.jsonc`:

- `posting-checker-queue`
- `auth-checker-queue`

При необходимости создайте вручную:

```bash
npx wrangler queues create posting-checker-queue
npx wrangler queues create auth-checker-queue
```

### 3. Service binding (опционально)

Worker ссылается на сервис `admins-archive` (`AdminsArchiveEntrypoint`). Если у вас нет этого сервиса, удалите или закомментируйте блок `services` в `wrangler.jsonc` и соответствующий код в проекте.

### 4. Секрет API_KEY

**Не коммитьте секреты в git.** Файлы `.dev.vars`, `.env*` и `.wrangler/` уже добавлены в `.gitignore`.

Локально создайте `.dev.vars` в корне проекта:

```bash
API_KEY=test
```

Для production установите секрет через Wrangler:

```bash
npx wrangler secret put API_KEY
```

## Запуск

```bash
npm install
npm run dev
```

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
