from ping3 import ping


def run(target: str):
    try:
        latency = ping(target, timeout=2)
        if latency is not None:
            return {"status": "ok", "latency_ms": round(latency * 1000, 2)}
        return {"status": "unreachable"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
