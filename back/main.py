from fastapi import FastAPI, Query
from redis import Redis
import uuid
import json

app = FastAPI(
    title="Health Checker API",
    description="Сервис для проверки хостов и взаимодействия с агентами.",
    version="1.0.0",
)

redis = Redis(host="redis", port=6379, decode_responses=True)

@app.post("/check")
def create_check(
    target: str = Query(..., description="Домен или IP для проверки", example="example.com")
):
    """Создать новую задачу проверки"""
    task_id = str(uuid.uuid4())
    task = {"id": task_id, "target": target}
    redis.rpush("tasks", json.dumps(task))
    return {"status": "queued", "id": task_id}


@app.get("/result/{task_id}")
def get_result(task_id: str):
    """Получить результат проверки по ID"""
    result = redis.get(f"result:{task_id}")
    if result:
        return json.loads(result)
    return {"status": "pending"}
