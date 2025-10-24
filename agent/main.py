import json
import time
from redis import Redis

redis = Redis(host="redis", port=6379, decode_responses=True)

while True:
    task_data = redis.lpop("tasks")
    if not task_data:
        time.sleep(1)
        continue

    task = json.loads(task_data)
    print(f"Got task {task['id']} for {task['target']}")

    result = {"status": "ok", "message": "hello"}

    # сохраняем результат
    redis.set(f"result:{task['id']}", json.dumps(result))
    print(f"Result stored for {task['id']}")
