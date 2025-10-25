from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from redis import Redis
import uuid
import json


class CheckRequest(BaseModel):
    target: str
    checks: list[str] = ["ping", "http"]  # по умолчанию, если не передано


class CheckResponse(BaseModel):
    status: str
    id: str


class ResultResponse(BaseModel):
    id: str
    target: str
    checks: list[str]
    results: dict  # ключи — имена проверок, значения — результаты


app = FastAPI(
    title="Health Checker API",
    description="Сервис для проверки хостов и взаимодействия с агентами.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # можно ограничить: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis = Redis(host="redis", port=6379, decode_responses=True)


@app.post("/check", response_model=CheckResponse)
def create_check(request: CheckRequest):
    """Создать новую задачу проверки"""
    task_id = str(uuid.uuid4())

    task = {
        "id": task_id,
        "target": request.target,
        "checks": request.checks,
    }

    redis.rpush("tasks", json.dumps(task))
    return {"status": "queued", "id": task_id}


@app.get("/result/{task_id}", response_model=ResultResponse)
def get_result(task_id: str):
    # Получить результат проверки по ID
    raw = redis.get(f"result:{task_id}")
    if not raw:
        return {
            "id": task_id,
            "target": "",
            "checks": [],
            "results": {"status": "pending"},
        }

    results = json.loads(raw)

    # Добавим target и checks для удобства фронтенда
    return {
        "id": task_id,
        "target": results.get("target", ""),
        "checks": list(results.keys()),
        "results": results,
    }
