import json
import time
from redis import Redis
from ping3 import ping

redis = Redis(host="redis", port=6379, decode_responses=True)

print("Worker started. Waiting for tasks...")

while True:
    task_data = redis.lpop("tasks")
    if not task_data:
        time.sleep(1)
        continue

    task = json.loads(task_data)
    target = task["target"]
    task_id = task["id"]

    print(f"Pinging {target} for task {task_id}...")

    try:
        latency = ping(target, timeout=2)
        if latency is not None:
            result = {"status": "ok", "target": target, "latency_ms": round(latency * 1000, 2)}
        else:
            result = {"status": "unreachable", "target": target}
    except Exception as e:
        result = {"status": "error", "target": target, "message": str(e)}

    redis.set(f"result:{task_id}", json.dumps(result))
    print(f"Stored result for {task_id}: {result}")
