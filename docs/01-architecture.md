# Архитектура проекта

## Общий принцип

Проект построен по модульной архитектуре:

- `modules/` — бизнес-логика (auth, users, files)
- `plugins/` — инфраструктурные расширения Fastify
- `domain/` — роли, permissions, чистая логика
- `shared/` — общие утилиты
- `config/` — конфигурация и env
- `test/` — инфраструктура тестирования

---

## Поток запроса

1. Request → Fastify
2. security plugin
3. auth plugin (JWT decode)
4. acl plugin (requirePerm)
5. route handler
6. MongoDB
7. Response

---

## Почему так?

- Модули не знают о Fastify internals
- Плагины инкапсулируют инфраструктуру
- domain — не зависит от Fastify и Mongo
- тесты поднимают реальное приложение
