import socket
import time


def run(target: str, port: int = 80):
    try:
        start = time.time()
        with socket.create_connection((target, port), timeout=3):
            duration = round((time.time() - start) * 1000, 2)
            return {"status": "ok", "time_ms": duration, "port": port}
    except Exception as e:
        return {"status": "error", "message": str(e)}
