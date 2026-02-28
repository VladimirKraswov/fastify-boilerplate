# Style Guide

## TypeScript

- strict mode
- no any
- no empty object types

---

## Импорты

Порядок:

1. node:\*
2. external
3. internal (@config, @modules)
4. parent
5. sibling

Автоматическая сортировка через ESLint.

---

## Архитектура

- Логика → в modules
- Инфраструктура → в plugins
- Чистые типы → в domain
