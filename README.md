# 🚀 fastify-mongo-ts-platform

Production-ready **Fastify + MongoDB + TypeScript** boilerplate с:

- 🔐 JWT auth (access + refresh, cookie/token mode)
- 🛡 ACL (roles → permissions)
- 📁 File storage
- 🧪 Vitest (e2e/integration)
- 🧰 ESLint + Prettier + import sorting
- 🧱 Path aliases (`@modules/*`, `@shared/*`, etc.)
- 📚 Swagger (OpenAPI)
- 🐳 Mongo (в тестах — in-memory)

---

## 📦 Tech Stack

- **Fastify 5**
- **MongoDB 6**
- **TypeScript (strict)**
- **TypeBox**
- **JWT (access + refresh rotation)**
- **Vitest**
- **ESLint 9 (flat config)**
- **Prettier 3**

---

# ⚙️ Setup

```bash
npm i
cp .env.example .env
npm run dev
```

Production:

```bash
npm run build
npm start
```

---

# 🧭 Endpoints

## System

- `GET /health`
- `GET /docs` – Swagger UI
- `GET /documentation/json` – OpenAPI JSON

---

# 🔐 Auth (`/v1/auth`)

| Method | Endpoint    | Description                  |
| ------ | ----------- | ---------------------------- |
| POST   | `/register` | Create user                  |
| POST   | `/login`    | Login (cookie or token mode) |
| POST   | `/refresh`  | Rotate refresh token         |
| POST   | `/logout`   | Revoke session               |

---

## Auth Modes

### 🍪 Cookie Mode (default)

```http
POST /v1/auth/login
```

Returns:

```json
{
  "accessToken": "..."
}
```

Sets:

- `sid`
- `refresh_token`

---

### 🎟 Token Mode

```http
POST /v1/auth/login
x-auth-mode: token
```

Returns:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "sessionId": "..."
}
```

---

# 👤 Users (`/v1/users`)

| Method | Endpoint | Permission  |
| ------ | -------- | ----------- |
| GET    | `/me`    | `UsersRead` |

---

# 📁 Files (`/v1/files`)

| Method | Endpoint    | Permission   |
| ------ | ----------- | ------------ |
| POST   | `/upload`   | `FilesWrite` |
| GET    | `/raw/:key` | public       |
| DELETE | `/:key`     | `FilesWrite` |

Upload is `multipart/form-data`.

---

# 🛡 ACL (Roles → Permissions)

Permissions defined in:

```
src/domain/permissions.ts
```

Roles expand to permissions in:

```
src/domain/roles.ts
```

Example:

```ts
expandPerms(['admin']);
```

---

# 🧪 Testing

Uses:

- `vitest`
- `mongodb-memory-server`
- full app boot (integration style)

Run:

```bash
npm test
```

Structure:

```
src/test/
  test-env.ts
  helpers.ts
```

Each test:

- spins up Mongo in memory
- builds real Fastify app
- runs inject()

---

# 🧱 Project Structure

```
src/
  app.ts
  server.ts

  config/
  domain/
  modules/
    auth/
    users/
    files/

  plugins/
    db.ts
    auth.ts
    acl.ts
    storage.ts
    swagger.ts
    errors.ts
    security.ts

  shared/
  test/
  types/
```

---

# 🧰 Path Aliases

Configured in `tsconfig.json`:

```json
"baseUrl": "./src",
"paths": {
  "@/*": ["*"],
  "@modules/*": ["modules/*"],
  "@shared/*": ["shared/*"],
  "@plugins/*": ["plugins/*"],
  "@config/*": ["config/*"],
  "@domain/*": ["domain/*"],
  "@test/*": ["test/*"]
}
```

---

# 🧹 Lint & Format

```bash
npm run lint
npm run lint:fix
npm run format
```

### Import order rules

1. node:\*
2. external
3. internal (@config, @modules, etc.)
4. parent
5. sibling
6. side-effects

Auto-sorted via `eslint-plugin-simple-import-sort`.

---

# 🔐 Security

- JWT access tokens
- Hashed refresh tokens (argon2)
- Rotation on refresh
- Session revocation
- Helmet
- Rate limit
- Multipart file limits

---

# 🧾 Environment Variables

Example `.env`:

```env
NODE_ENV=development

PORT=3000

MONGO_URI=mongodb://localhost:27017/app

JWT_ACCESS_SECRET=access_secret
JWT_REFRESH_SECRET=refresh_secret

ACCESS_TTL_SEC=900
REFRESH_TTL_SEC=604800

COOKIE_SECURE=false
COOKIE_DOMAIN=

UPLOAD_DIR=./uploads
```

---

# 🚀 Production Notes

- Set `COOKIE_SECURE=true`
- Use HTTPS
- Store secrets securely
- Configure reverse proxy
- Use persistent storage (S3, etc. if replacing storage plugin)

---

# 🧩 Extending

### Add new module

1. Create `src/modules/<module>`
2. Add routes
3. Register in `app.ts`
4. Add permissions if needed
5. Write tests

---

# 🎯 Boilerplate Philosophy

- Strict TypeScript
- Minimal abstractions
- Real integration tests
- Production-ready patterns
- Explicit security

---
