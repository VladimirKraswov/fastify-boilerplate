## Обновлённая документация проекта

Ниже представлен полный гайд по добавлению новых эндпоинтов и расширению платформы с учётом всех добавленных компонентов (валидация env, миграции, генерация модулей, Docker, CI/CD и др.).

---

# Гайд: добавление новых эндпоинтов и расширение платформы

Этот проект специально организован так, чтобы новые эндпоинты добавлялись быстро:

- логика — в `modules/*`
- инфраструктура — в `plugins/*`
- права — в `domain/*`
- тесты — рядом с модулем или в `src/modules/**.test.ts`

---

## 1. Базовая структура модуля

Новый модуль создаём по шаблону:

```
src/modules/<module>/
  <module>.routes.ts
  <module>.schemas.ts
  <module>.repo.ts
  <module>.service.ts     (опционально)
  <module>.types.ts       (опционально)
  <module>.routes.test.ts
```

Минимально достаточно `routes + schemas + repo`.

---

## 2. Шаги добавления эндпоинта (чеклист)

### ✅ Шаг 1 — определить поведение

Ответь на вопросы:

- Какие входные данные (body/query/params)?
- Какие статусы ошибок возможны?
- Нужна ли аутентификация?
- Нужны ли права/permissions?
- Нужна ли запись в БД?

### ✅ Шаг 2 — добавить схемы TypeBox

Схемы нужны для:

- runtime validation
- swagger/openapi
- автогенерации типов через `Static<>`

Пример `src/modules/tasks/tasks.schemas.ts`:

```ts
import { Type } from '@sinclair/typebox';

export const TaskCreateBody = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 2000 }))
});

export const TaskDto = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String())
});
```

### ✅ Шаг 3 — репозиторий (работа с Mongo)

Держим доступ к коллекции типизированным:

```ts
import type { Collection, Db } from 'mongodb';

export type TaskDoc = {
  _id: string;
  title: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
};

export function tasksCol(db: Db): Collection<TaskDoc> {
  return db.collection<TaskDoc>('tasks');
}
```

Рекомендация: всегда использовать `string` в `_id` (через `nanoid()`), чтобы не ловить конфликт с `ObjectId`.

### ✅ Шаг 4 — маршруты (routes)

#### Типизация request body/params

Используй generic:

```ts
app.post<{ Body: TaskCreateBodyT }>(...)
```

А не `req.body as any`.

#### Нормальная обработка ошибок

Используй `E.*`:

```ts
E.badRequest();
E.unauthorized();
E.forbidden();
E.notFound();
E.conflict();
```

Так ошибки попадут в единый `errorHandler` и будут одинаковыми во всех эндпоинтах.

---

## 3. Пример готового эндпоинта (Create Task)

### `src/modules/tasks/tasks.routes.ts`

```ts
import { Type, type Static } from '@sinclair/typebox';
import type { FastifyPluginAsync } from 'fastify';

import { E } from '@shared/http.js';
import { nanoid } from '@shared/ids.js';
import { ErrorResponse } from '@shared/openapi.js';
import { Permissions } from '@domain/permissions.js';

import { tasksCol } from './tasks.repo.js';
import { TaskCreateBody, TaskDto } from './tasks.schemas.js';

type TaskCreateBodyT = Static<typeof TaskCreateBody>;

const plugin: FastifyPluginAsync = async (app) => {
  app.post<{ Body: TaskCreateBodyT }>(
    '/',
    {
      preHandler: [app.requirePerm(Permissions.TasksWrite)],
      schema: {
        tags: ['tasks'],
        security: [{ bearerAuth: [] }],
        body: TaskCreateBody,
        response: {
          200: Type.Object({ task: TaskDto }),
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse
        }
      }
    },
    async (req) => {
      if (!req.auth) throw E.unauthorized();

      const { title, description } = req.body;

      const doc = {
        _id: nanoid(),
        title,
        description,
        ownerId: req.auth.userId,
        createdAt: new Date()
      };

      await tasksCol(app.db).insertOne(doc);

      return {
        task: {
          id: doc._id,
          title: doc.title,
          description: doc.description
        }
      };
    }
  );
};

export default plugin;
```

---

## 4. Подключение модуля в `app.ts`

Добавь импорт и регистрацию:

```ts
import tasksRoutes from '@modules/tasks/tasks.routes.js';

await app.register(tasksRoutes, { prefix: '/v1/tasks' });
```

---

## 5. Swagger / OpenAPI рекомендации

### ✅ tags

У каждого модуля должен быть свой `tags`:

- `auth`
- `users`
- `files`
- `tasks`

### ✅ security

Если endpoint защищён JWT:

```json
security: [{ bearerAuth: [] }]
```

### ✅ response schemas

Всегда описывай хотя бы:

- `200`
- `400` / `401` / `403` / `404` по ситуации

---

## 6. Permissions: как добавлять правильно

1. Добавить новый permission в `domain/permissions.ts`

```ts
export const Permissions = {
  TasksRead: 'tasks:read',
  TasksWrite: 'tasks:write'
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
```

2. Прописать в ролях `domain/roles.ts`

```ts
const ROLE_PERMS = {
  user: ['tasks:read'],
  admin: ['admin:*']
};
```

---

## 7. Тесты для нового эндпоинта

Общий шаблон:

- Поднять in-memory Mongo
- `build app`
- создать пользователя/роль
- сделать `login`
- дёрнуть endpoint с Bearer token

Пример теста (минимум):

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp, createTestCtx } from '@test/test-env.js';
import { setTestEnv } from '@test/helpers.js';

describe('tasks', () => {
  let ctx: Awaited<ReturnType<typeof createTestCtx>>;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let accessToken = '';

  beforeAll(async () => {
    ctx = await createTestCtx();
    setTestEnv({ mongoUri: ctx.mongod.getUri(), uploadDir: ctx.uploadDir });
    app = await buildTestApp();

    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'admin@t.com', password: 'password123' }
    });

    // выдать роль admin в БД (как в users/files тестах)
    // ...

    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'admin@t.com', password: 'password123' }
    });

    accessToken = login.json().accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ctx) await ctx.close();
  });

  it('create task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Test task' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().task.title).toBe('Test task');
  });
});
```

---

## 8. Рекомендации по расширению (best practices)

### ✅ 1. Не мешай инфраструктуру и домен

- бизнес-решения в `modules`
- инфраструктура (db, auth, storage, swagger) в `plugins`

### ✅ 2. Не используй `any`

Если что-то неизвестно:

- `unknown`
- type guards (`isRecord`, `isXxxBody`)

### ✅ 3. Всегда делай интеграционный тест на любой новый endpoint

Это дешевле, чем потом ловить баги в проде.

### ✅ 4. Не делай "большие handlers"

Если логика растёт:

- вынеси в `service.ts`
- `repo` оставь тонким

### ✅ 5. Делай стабильные DTO

Не возвращай Mongo-doc напрямую. Отдавай DTO:

- `id` вместо `_id`
- без служебных полей

---

## 9. Типовые ошибки и как их избежать

**Ошибка:** `ObjectId` vs `string`  
**Решение:** всегда создавать `_id: nanoid()`, типизировать коллекции.

**Ошибка:** swagger не показывает body  
**Решение:** `schema.body = ...` и типизированный request через generics.

**Ошибка:** permissions ломают тесты  
**Решение:** в тестах проще назначать `roles: ['admin']` либо создать отдельную роль `tester`.

---

## 10. Быстрый шаблон для копипаста

**Минимальный endpoint**

- schemas
- repo
- routes
- register in app
- test

Рекомендуемый flow: "сначала тест → потом код".

---

## 11. Валидация окружения (environment)

В проекте используется **Zod** для строгой валидации переменных окружения.

### Файл `src/config/env.ts`:

```ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  MONGO_URI: z.string().min(1),
  MONGO_DB: z.string().default('app'),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TTL_SEC: z.coerce.number().default(900),
  REFRESH_TTL_SEC: z.coerce.number().default(60 * 60 * 24 * 30),

  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_DOMAIN: z.string().optional(),

  UPLOAD_DIR: z.string().default('./uploads')
});

export const env = envSchema.parse(process.env);
```

При запуске приложения все необходимые переменные проверяются автоматически.

---

## 12. Миграции базы данных

Для управления схемой MongoDB используется **migrate-mongo** + собственный скрипт для создания миграций (из-за бага в ESM-версии).

### Конфигурация `migrate-mongo-config.js` (ESM):

```js
import 'dotenv/config';

export default {
  mongodb: {
    url: process.env.MONGO_URI,
    databaseName: process.env.MONGO_DB || 'app',
    options: {}
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations',
  migrationFileExtension: '.js'
};
```

### Скрипты в `package.json`:

```json
"scripts": {
  "migrate:create": "node scripts/create-migration.js",
  "migrate:up": "migrate-mongo up",
  "migrate:down": "migrate-mongo down",
  "migrate:status": "migrate-mongo status"
}
```

### Создание миграции:

```bash
npm run migrate:create имя_миграции
```

Скрипт `scripts/create-migration.js` создаст файл в папке `migrations` с правильным timestamp-префиксом и шаблоном:

```js
export const up = async (db) => {
  // TODO: implement migration up
};

export const down = async (db) => {
  // TODO: implement migration down
};
```

### Применение миграций:

```bash
npm run migrate:up
```

### Пример seed-миграции (создание admin-пользователя):

```js
// migrations/20260228183000-seed-admin.js
import argon2 from 'argon2';
import { nanoid } from 'nanoid';

export const up = async (db) => {
  const users = db.collection('users');
  const existing = await users.findOne({ email: 'admin@example.com' });
  if (!existing) {
    await users.insertOne({
      _id: nanoid(),
      email: 'admin@example.com',
      passwordHash: await argon2.hash('admin123'),
      roles: ['admin'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
};

export const down = async (db) => {
  await db.collection('users').deleteOne({ email: 'admin@example.com' });
};
```

### Интеграция с запуском приложения

В production рекомендуется запускать миграции перед стартом:

```json
"start": "npm run migrate:up && node dist/server.js"
```

---

## 13. Генерация новых модулей (Plop)

Для быстрого создания модулей по шаблону используется **Plop**.

### Установка (уже выполнена)

```bash
npm i -D plop
```

### Конфигурация `plopfile.js` в корне:

```js
export default function (plop) {
  plop.setGenerator('module', {
    description: 'Создать новый модуль',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Имя модуля (например: products)'
      }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'src/modules/{{name}}',
        templateFiles: 'plop-templates/module/*.hbs',
        base: 'plop-templates/module',
        data: { name: '{{name}}' }
      }
    ]
  });
}
```

### Шаблоны в `plop-templates/module/`:

- `{{name}}.routes.ts.hbs`
- `{{name}}.schemas.ts.hbs`
- `{{name}}.repo.ts.hbs`
- `{{name}}.service.ts.hbs`
- `{{name}}.routes.test.ts.hbs`

Полное содержимое шаблонов можно посмотреть в папке `plop-templates`.

### Создание нового модуля:

```bash
npm run generate
# или
npm run plop module
```

Скрипт создаст папку `src/modules/<name>` со всеми необходимыми файлами.

---

## 14. Docker и контейнеризация

### Dockerfile (multi-stage):

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/migrate-mongo-config.js ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### docker-compose.yml:

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    restart: always
    environment:
      MONGO_INITDB_DATABASE: app
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      MONGO_URI: mongodb://mongo:27017/app
      JWT_ACCESS_SECRET: dev-access-secret
      JWT_REFRESH_SECRET: dev-refresh-secret
      COOKIE_SECURE: 'false'
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads
volumes:
  mongo_data:
```

### Запуск:

```bash
docker-compose up
```

---

## 15. CI/CD (GitHub Actions)

Файл `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
```

---

## 16. Генерация OpenAPI клиента

### Установка:

```bash
npm i -D openapi-typescript
```

### Скрипт в `package.json`:

```json
"generate:client": "openapi-typescript http://localhost:3000/docs/json -o ./client/api.d.ts"
```

### Использование:

1. Запусти сервер в dev-режиме.
2. Выполни `npm run generate:client`.
3. Сгенерированные типы будут в `client/api.d.ts` (можно добавить в `.gitignore`).

---

## 17. Дополнительные скрипты

В `package.json` добавлены полезные скрипты:

```json
"scripts": {
  "type-check": "tsc --noEmit",
  "test:coverage": "vitest run --coverage",
  "clean": "shx rm -rf dist",
  "format": "prettier --write .",
  "lint:fix": "eslint src --fix"
}
```

- `type-check` — проверка типов без компиляции.
- `test:coverage` — запуск тестов с подсчётом покрытия.
- `clean` — удаление папки `dist`.
- `format` — форматирование всего кода.

---

## 18. Pre-push хуки (husky)

Для автоматической проверки перед пушем добавлен хук:

```bash
npx husky add .husky/pre-push "npm run type-check && npm test"
```

Теперь перед каждым пушем будут запускаться проверка типов и тесты.

---

## Заключение

Данный гайд покрывает все этапы разработки: от создания нового модуля до деплоя и CI/CD. Следуя этим рекомендациям, вы сможете быстро и качественно расширять платформу, сохраняя единообразие кода и высокий уровень тестирования.
