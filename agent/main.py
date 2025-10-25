import json
import time
from redis import Redis
from checks import ping_check, http_check, tcp_check, traceroute_check, dns_check

redis = Redis(host="redis", port=6379, decode_responses=True)
print("Worker started. Waiting for tasks...")


def run_checks(target, checks):
    results = {}
    for name, func in {
        "ping": ping_check.run,
        "http": http_check.run,
        "tcp": tcp_check.run,
        "traceroute": traceroute_check.run,
        "dns": dns_check.run,
    }.items():
        if name in checks:
            try:
                results[name] = func(target)
            except Exception as e:
                results[name] = {"status": "error", "message": str(e)}
    return results


while True:
    task_data = redis.lpop("tasks")
    if not task_data:
        time.sleep(1)
        continue

    task = json.loads(task_data)
    task_id, target = task["id"], task["target"]
    checks = task.get("checks", ["ping", "http"])

    print(f"Processing {task_id} for {target} with checks: {checks}")
    results = run_checks(target, checks)

    redis.set(f"result:{task_id}", json.dumps(results), ex=60)
    print(f"Stored result for {task_id}")
