# ACL (Roles → Permissions)

## Основные принципы

- Роль — это группа permissions
- Permission — атомарное право

---

## Где описано

- domain/permissions.ts
- domain/roles.ts

---

## Проверка доступа

Используется:

app.requirePerm(Permissions.FilesWrite)

---

## Admin

Роль admin автоматически получает:

admin:\*

что даёт полный доступ.
