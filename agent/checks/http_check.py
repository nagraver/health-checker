import requests
import time


def run(target: str):
    if not target.startswith("http"):
        target = f"http://{target}"
    try:
        start = time.time()
        resp = requests.get(target, timeout=5)
        duration = round((time.time() - start) * 1000, 2)
        return {"status": resp.status_code, "time_ms": duration, "headers": dict(resp.headers)}
    except Exception as e:
        return {"status": "error", "message": str(e)}
