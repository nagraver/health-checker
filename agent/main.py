import json
import time
from redis import Redis
from checks import ping_check, http_check, tcp_check, traceroute_check, dns_check

redis = Redis(host="redis", port=6379, decode_responses=True)


def run_checks(target, checks):
    results = {}
    if "ping" in checks:
        results["ping"] = ping_check.run(target)
    if "http" in checks:
        results["http"] = http_check.run(target)
    if "tcp" in checks:
        results["tcp"] = tcp_check.run(target)
    if "traceroute" in checks:
        results["traceroute"] = traceroute_check.run(target)
    if "dns" in checks:
        results["dns"] = dns_check.run(target)
    return results


print("Worker started. Waiting for tasks...")

while True:
    task_data = redis.lpop("tasks")
    if not task_data:
        time.sleep(1)
        continue

    task = json.loads(task_data)
    task_id, target = task["id"], task["target"]
    checks = task.get("checks", ["ping", "http"])  # по умолчанию ping+http

    print(f"Processing {task_id} for {target} with checks: {checks}")
    results = run_checks(target, checks)
    redis.set(f"result:{task_id}", json.dumps(results))
