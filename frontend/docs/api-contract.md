# API Contract — Transaction Scoring System

**Версия:** 0.1 (draft)  
**Дата:** 26.09.2026  
**Автор:** Frontend-разработчик  
**Статус:** на согласовании с backend

Документ описывает контракт между frontend и backend: какие эндпоинты
ожидает frontend, какие запросы отправляет и какие ответы хочет получать.

## Общие правила

- **Base URL:** `http://localhost:8000/api` (dev), `https://api.scoring.local` (prod)
- **Формат:** JSON (UTF-8)
- **Авторизация:** Bearer Token в заголовке `Authorization: Bearer <token>`
- **CORS:** разрешить origin `http://localhost:5173` для dev
- **Ошибки:** единый формат `{ "error": "текст", "code": 400 }`

## Формат ошибок

```json
{
  "error": "Transaction not found",
  "code": 404
}
```

HTTP-коды: 200 — успех, 400 — плохой запрос, 401 — не авторизован,
403 — нет прав, 404 — не найдено, 500 — ошибка сервера.

---

## 1. Транзакции (страница Transactions)

### 1.1. Получить список транзакций

```
GET /transactions?status=pending&search=ozon&page=1&limit=20
```

**Query-параметры (все опциональны):**
- `status` — `pending` | `approved` | `rejected` | `review`
- `search` — поиск по ID или мерчанту
- `from`, `to` — диапазон дат (ISO 8601)
- `channel` — `card` | `sbp` | `transfer`
- `page`, `limit` — пагинация

**Ответ:**
```json
{
  "items": [
    {
      "id": "TX-1001",
      "amount": 12500,
      "currency": "RUB",
      "channel": "card",
      "merchant": "Ozon",
      "createdAt": "2026-09-25T10:15:00Z",
      "status": "pending",
      "score": 82,
      "factors": [
        { "name": "Сумма выше среднего", "weight": 25 },
        { "name": "Новый мерчант", "weight": 20 }
      ],
      "explanation": "Высокий риск: сумма превышает типичную..."
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 20
}
```

### 1.2. Получить одну транзакцию

```
GET /transactions/:id
```

**Ответ:** объект транзакции (как выше).

### 1.3. Принять решение по транзакции

```
POST /transactions/:id/decision
```

**Тело запроса:**
```json
{
  "decision": "approved",
  "comment": "Проверено вручную, клиент подтвердил"
}
```

`decision`: `approved` | `rejected` | `review`

**Ответ:**
```json
{
  "id": "TX-1001",
  "status": "approved",
  "decidedAt": "2026-09-25T14:32:00Z",
  "decidedBy": "ivanov"
}
```

---

## 2. Пороги (страница Thresholds)

### 2.1. Получить текущие пороги

```
GET /thresholds
```

**Ответ:**
```json
{
  "approveBelow": 30,
  "rejectAbove": 70,
  "updatedAt": "2026-09-20T09:00:00Z",
  "updatedBy": "admin"
}
```

### 2.2. Обновить пороги

```
PUT /thresholds
```

**Тело:**
```json
{
  "approveBelow": 25,
  "rejectAbove": 75
}
```

**Ответ:** обновлённый объект порогов.

### 2.3. История изменений порогов

```
GET /thresholds/history?page=1&limit=20
```

**Ответ:**
```json
{
  "items": [
    {
      "changedAt": "2026-09-20T09:00:00Z",
      "changedBy": "admin",
      "oldApproveBelow": 30,
      "newApproveBelow": 25,
      "oldRejectAbove": 70,
      "newRejectAbove": 75
    }
  ]
}
```

---

## 3. Дашборд (страница Dashboard)

### 3.1. Сводные KPI

```
GET /dashboard/stats?period=week
```

**Query:** `period` — `day` | `week` | `month` | `custom` (+ `from`, `to`)

**Ответ:**
```json
{
  "total": 12500,
  "approved": 11125,
  "rejected": 875,
  "review": 500,
  "approvedPercent": 89.0,
  "rejectedPercent": 7.0,
  "avgScore": 34.5
}
```

### 3.2. Данные по каналам

```
GET /dashboard/channels?period=week
```

**Ответ:**
```json
[
  { "channel": "card", "count": 8000, "amount": 12000000 },
  { "channel": "sbp", "count": 3500, "amount": 2500000 },
  { "channel": "transfer", "count": 1000, "amount": 5000000 }
]
```

### 3.3. Топ мерчантов

```
GET /dashboard/merchants?period=week&limit=10
```

**Ответ:**
```json
[
  { "merchant": "Ozon", "count": 1500, "amount": 2500000 },
  { "merchant": "Wildberries", "count": 1200, "amount": 1800000 }
]
```

### 3.4. Динамика по дням

```
GET /dashboard/timeline?period=week
```

**Ответ:**
```json
[
  { "date": "2026-09-20", "approved": 1500, "rejected": 120 },
  { "date": "2026-09-21", "approved": 1650, "rejected": 95 }
]
```

---

## 4. Аудит-лог (страница Audit)

### 4.1. Получить записи аудита

```
GET /audit?user=ivanov&action=decision&from=2026-09-01&page=1&limit=50
```

**Query:**
- `user` — логин пользователя
- `action` — `decision` | `threshold_change` | `login`
- `from`, `to` — диапазон дат
- `page`, `limit`

**Ответ:**
```json
{
  "items": [
    {
      "id": "AUD-5001",
      "timestamp": "2026-09-25T14:32:00Z",
      "user": "ivanov",
      "action": "decision",
      "object": "TX-1001",
      "result": "approved",
      "comment": "Проверено вручную"
    }
  ],
  "total": 340,
  "page": 1
}
```

**Важно:** записи в аудит-лог создаёт **backend автоматически** при
каждом действии пользователя. Frontend только читает.

---

## 5. Авторизация

### 5.1. Логин

```
POST /auth/login
```

**Тело:**
```json
{ "username": "ivanov", "password": "..." }
```

**Ответ:**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "username": "ivanov", "role": "operator" }
}
```

### 5.2. Текущий пользователь

```
GET /auth/me
```

**Ответ:**
```json
{ "username": "ivanov", "role": "operator" }
```

Роли: `operator` (может принимать решения), `admin` (может менять пороги).

---

## 6. План реализации на стороне frontend

|    Раздел  | Статус |  Что нужно  |
|------------|--------|-------------|
| Транзакции | ✅ UI готов на моках | Заменить моки на `fetch` при готовности API |
| Пороги | ❌ To Do | Сделать форму + валидацию |
| Дашборд | ❌ To Do | Подключить `recharts` |
| Аудит-лог | ❌ To Do | Сделать таблицу с фильтрами |
| Авторизация | ❌ To Do | Экран логина + хранение токена |

---

## 7. Вопросы к backend-разработчику

1. На каком порту будет API в dev-режиме? (`http://localhost:8000`?)
2. Как настраиваем CORS для `http://localhost:5173`?
3. Авторизация — JWT в заголовке или сессионные куки?
4. Формат дат — ISO 8601 с `Z` или локальное время?
5. Будет ли API возвращать агрегаты для дашборда или фронт считает сам?
6. Кто пишет в аудит-лог — backend автоматически или frontend шлёт отдельный запрос?