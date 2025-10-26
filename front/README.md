
# Aéza — Health Checker (Frontend)

Простой SPA на React + Vite + Tailwind.
Поддерживает запуск проверок, шаблоны и вывод результатов в виде двумерной таблицы (агенты × проверки).
Обновление — через WebSocket (`/ws/check`) с фолбэком на polling каждые 2 секунды (`/result/{id}`).

## API, ожидаемое фронтом
- `POST /check` — `{ target: string, checks: string[] }` → `{ status: "queued", id: string }`
- `GET /result/{id}` → `{ id, target, checks, results }`
- `WS /ws/check` — отправляем `{ target, checks }`, получаем один JSON с результатом и закрываем соединение.

Эти эндпоинты соответствуют вашему FastAPI (`mem.py`/`main.py`).

## Запуск (dev)
```bash
cd front-aeza
npm i
# при dev, если бэкенд на 8000:
VITE_API_PROXY=http://localhost:8000 npm run dev
```
Откройте http://localhost:5173

> Можно также задать `VITE_API_BASE` и `VITE_WS_BASE` если фронт и бэк на разных хостах:
> ```bash
> VITE_API_BASE=http://localhost:8000 VITE_WS_BASE=http://localhost:8000 npm run dev
> ```

## Сборка и Docker
```bash
npm run build
```

Docker-образ:
```bash
docker build -t aeza-front:latest .
docker run -p 8080:80 --name aeza-front aeza-front:latest
# Фронт будет на :8080, он проксирует /api и /ws на http://backend:8000 (см. nginx.conf)
```

## docker-compose (пример)
```yaml
services:
  redis:
    image: redis:7-alpine

  backend:
    build: .  # ваш FastAPI (где mem.py/main.py), должен слушать :8000
    environment:
      - REDIS_HOST=redis
    depends_on: [redis]
    ports: ["8000:8000"]

  front:
    build: ./front-aeza
    depends_on: [backend]
    ports:
      - "8080:80"
```
⚠️ Убедитесь, что путь к фронту корректный (`./front-aeza`).

## Интерфейс
- Поле `target`
- 5 чекбоксов: `ping`, `http`, `tcp`, `traceroute`, `dns`
- Шаблоны: *Quick*, *Full site health*, *DNS only*
- Таблица: первый столбец — *Агент* (сейчас `master` как заглушка), остальные — выбранные проверки.
- JSON-раздел с сырыми данными для дебага.

## Стиль
Материалистичный минимализм под презентацию: светлый фон, карточки, таблицы, акцентный синий.

## Расширение под мультиагент
Сейчас выводится одна строка `master`. Когда бэкенд начнет возвращать результаты по агентам, добавьте `agents: [...]` в `ResultPayload` и
модифицируйте `ResultsTable`, чтобы рендерить по строке на агента.
```ts
// пример формы данных на будущее
interface AgentResult {
  agentId: string
  agentName: string
  results: Record<CheckName, any>
}
```
