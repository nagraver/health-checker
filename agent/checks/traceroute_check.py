import subprocess


def run(target: str, max_hops: int = 15):
    try:
        result = subprocess.run(["traceroute", "-m", str(max_hops), target], capture_output=True, text=True, timeout=15)
        return {"status": "ok", "output": result.stdout.splitlines()}
    except Exception as e:
        return {"status": "error", "message": str(e)}
