# Модуль Files

## Upload

- multipart/form-data
- сохраняется через storage provider
- метаданные пишутся в Mongo

---

## Storage abstraction

storage.save()
storage.remove()

Можно заменить на:

- S3
- GCS
- локальное хранилище

---

## Проверки

DELETE:

- владелец
- или admin
