from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from redis import Redis
import os, uuid, json, time

# =============================
# Конфиг
# =============================
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
AGENT_SHARED_TOKEN = os.getenv("AGENT_SHARED_TOKEN", "supersecret-token")
RESULT_TTL = int(os.getenv("RESULT_TTL", "3600"))   # сек., через сколько очищать результаты
HEARTBEAT_TTL = int(os.getenv("HEARTBEAT_TTL", "30"))  # агент считается "живым" ~30с

# =============================
# Модели
# =============================
class CheckRequest(BaseModel):
    target: str
    checks: list[str] = ["ping", "http"]        # по умолчанию
    agents: list[str] | None = None             # если None — всем активным агентам

class CheckResponse(BaseModel):
    status: str
    id: str
    agents: list[str]

# Для совместимости с фронтом можно не фиксировать строгую схему результата:
# фронт сам понимает формат (см. твой App.jsx)

# =============================
# App & Redis
# =============================
app = FastAPI(
    title="Health Checker API (Master)",
    description="Мастер-сервер: фронтовые REST-эндпоинты + эндпоинты для агентов.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # в проде зажать доменами
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis = Redis(host=REDIS_HOST, port=6379, decode_responses=True)

# =============================
# Вспомогательные функции
# =============================
def verify_agent_token(token: str | None):
    if token != AGENT_SHARED_TOKEN:
        raise HTTPException(status_code=401, detail="Bad agent token")

def mark_agent_alive(agent_id: str):
    # ключ-живучесть с TTL — если пропал, ключ протухнет
    redis.set(f"agent:alive:{agent_id}", "1", ex=HEARTBEAT_TTL)
    # для инфы
    redis.hset(f"agent:{agent_id}", mapping={"last_seen": str(int(time.time()))})
    # множество всех когда-либо виденных (упростим)
    redis.sadd("agents:known", agent_id)

def list_active_agents() -> list[str]:
    # фильтруем только тех, у кого не истёк ключ "alive"
    known = redis.smembers("agents:known") or set()
    active = []
    for agent in known:
        if redis.ttl(f"agent:alive:{agent}") > 0 or redis.get(f"agent:alive:{agent}") is not None:
            active.append(agent)
    return sorted(active)

# =============================
# Фронтовые эндпоинты (остаются)
# =============================
@app.post("/check", response_model=CheckResponse)
def create_check(req: CheckRequest):
    """
    Создаёт job и раскладывает копии задачи по очередям нужных агентов:
    queue:agent:{agent_id} ← {"id", "target", "checks"}
    """
    task_id = str(uuid.uuid4())

    # списки агентов: запрошенные или все активные
    agents = req.agents or list_active_agents()
    if not agents:
        # можно вернуть 409 / 400, но для удобства фронта — ok с пустым списком
        return {"status": "no_agents", "id": task_id, "agents": []}

    # пометим job для трекинга прогресса
    if len(agents) > 0:
        redis.sadd(f"job:{task_id}:agents_pending", *agents)
    redis.delete(f"job:{task_id}:agents_done")
    redis.hset(f"task:{task_id}", mapping={"status": "queued", "target": req.target})

    # кладём копию задачи в очередь каждого агента
    task = {"id": task_id, "target": req.target, "checks": req.checks}
    for agent_id in agents:
        redis.rpush(f"queue:agent:{agent_id}", json.dumps(task))

    return {"status": "queued", "id": task_id, "agents": agents}

@app.get("/result/{task_id}")
def get_result(task_id: str):
    """
    Агрегированный ответ: результаты от всех агентов (агенты × проверки).
    results = { "<agent_id>": { "<check>": {...}, ... }, ... }
    """
    pending = list(redis.smembers(f"job:{task_id}:agents_pending"))
    done    = list(redis.smembers(f"job:{task_id}:agents_done"))

    agents = sorted(set(pending) | set(done))
    results_by_agent: dict[str, dict] = {}
    for agent_id in agents:
        raw = redis.get(f"result:{task_id}:{agent_id}")
        results_by_agent[agent_id] = json.loads(raw) if raw else {}

    # если ни одного агента не участвовало (старый режим) — попробуем плоский результат
    if not agents:
        raw_flat = redis.get(f"result:{task_id}")
        if not raw_flat:
            return {
                "task_id": task_id,
                "agents_pending": [],
                "agents_done": [],
                "results": {},                 # фронт покажет "—"
                "status": "pending",
            }
        return {
            "task_id": task_id,
            "agents_pending": [],
            "agents_done": [],
            "results": {"local": json.loads(raw_flat)},
            "status": "done",
        }

    status = "done" if not pending and len(done) > 0 else "processing"
    return {
        "task_id": task_id,
        "agents_pending": pending,
        "agents_done": done,
        "results": results_by_agent,
        "status": status,
    }

@app.get("/health")
def health():
    try:
        redis.ping()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# =============================
# Эндпоинты для агентов (НОВЫЕ)
# =============================
@app.post("/api/agents/heartbeat")
def agent_heartbeat(payload: dict, x_agent_token: str | None = Header(default=None)):
    verify_agent_token(x_agent_token)
    agent_id = payload.get("agent_id")
    if not agent_id:
        raise HTTPException(400, "agent_id required")
    mark_agent_alive(agent_id)
    return {"status": "ok"}

@app.get("/api/agents/{agent_id}/tasks/next")
def agent_get_next(agent_id: str, x_agent_token: str | None = Header(default=None)):
    verify_agent_token(x_agent_token)
    # агент живой
    mark_agent_alive(agent_id)
    task_raw = redis.lpop(f"queue:agent:{agent_id}")
    if not task_raw:
        return {"status": "no_task"}, 204
    task = json.loads(task_raw)
    return {"task_id": task["id"], "target": task["target"], "checks": task["checks"]}

class AgentResultIn(BaseModel):
    agent_id: str
    task_id: str
    target: str
    results: dict   # {"ping": {...}, "http": {...}, ...}

@app.post("/api/agents/{agent_id}/tasks/{task_id}/result")
def agent_post_result(agent_id: str, task_id: str, payload: AgentResultIn,
                      x_agent_token: str | None = Header(default=None)):
    verify_agent_token(x_agent_token)
    if payload.agent_id != agent_id or payload.task_id != task_id:
        raise HTTPException(400, "agent_id/task_id mismatch")
    # сохраняем результат конкретного агента c TTL
    redis.set(f"result:{task_id}:{agent_id}", json.dumps(payload.results), ex=RESULT_TTL)
    # отмечаем прогресс
    redis.srem(f"job:{task_id}:agents_pending", agent_id)
    redis.sadd(f"job:{task_id}:agents_done", agent_id)
    return {"status": "received"}
