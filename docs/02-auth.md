# Аутентификация

## Типы токенов

- Access Token (JWT, short-lived)
- Refresh Token (hashed, хранится в БД)

---

## Режимы работы

### Cookie Mode (по умолчанию)

- sid
- refresh_token
- HttpOnly
- SameSite=lax

### Token Mode

Передать заголовок:

x-auth-mode: token

Возвращает:

- accessToken
- refreshToken
- sessionId

---

## Refresh Rotation

При каждом refresh:

- старый refresh token становится недействительным
- создаётся новый hash
- accessToken перевыпускается

---

## Logout

- помечает сессию revokedAt
- удаляет cookies
