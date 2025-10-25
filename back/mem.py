from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from redis import Redis
import uuid
import json
import asyncio

# --- Настройки приложения ---
app = FastAPI(
    title="Health Checker API",
    description="Сервис проверки хостов с поддержкой WebSocket.",
    version="2.0.0",
)

# --- CORS (чтобы React подключался без ошибок) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде лучше явно: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Redis ---
redis = Redis(host="redis", port=6379, decode_responses=True)


# --- Pydantic модели ---
class CheckRequest(BaseModel):
    target: str
    checks: list[str] = ["ping", "http"]


class CheckResponse(BaseModel):
    status: str
    id: str


class ResultResponse(BaseModel):
    id: str
    target: str
    checks: list[str]
    results: dict


# --- REST API (оставляем на всякий случай) ---
@app.post("/check", response_model=CheckResponse)
def create_check(request: CheckRequest):
    """Создать новую задачу проверки"""
    task_id = str(uuid.uuid4())
    task = {"id": task_id, "target": request.target, "checks": request.checks}
    redis.rpush("tasks", json.dumps(task))
    return {"status": "queued", "id": task_id}


@app.get("/result/{task_id}", response_model=ResultResponse)
def get_result(task_id: str):
    """Получить результат проверки по ID"""
    raw = redis.get(f"result:{task_id}")
    if not raw:
        return {
            "id": task_id,
            "target": "",
            "checks": [],
            "results": {"status": "pending"},
        }
    results = json.loads(raw)
    return {
        "id": task_id,
        "target": results.get("target", ""),
        "checks": list(results.keys()),
        "results": results,
    }


# --- WebSocket endpoint ---
@app.websocket("/ws/check")
async def websocket_check(ws: WebSocket):
    """Принимает задание, создаёт его в Redis и возвращает результат, когда он готов."""
    await ws.accept()

    # Получаем данные от клиента
    data = await ws.receive_json()
    target = data["target"]
    checks = data.get("checks", ["ping", "http"])

    # Создаём задачу
    task_id = str(uuid.uuid4())
    task = {"id": task_id, "target": target, "checks": checks}
    redis.rpush("tasks", json.dumps(task))
    print(f"[WebSocket] New task {task_id} for {target} with checks {checks}")

    # Ждём результат от воркера
    for _ in range(60):  # до 60 секунд
        result = redis.get(f"result:{task_id}")
        if result:
            await ws.send_text(result)
            await ws.close()
            return
        await asyncio.sleep(1)

    await ws.send_text(json.dumps({"status": "timeout"}))
    await ws.close()
