import dns.resolver


def run(target: str):
    result = {}
    try:
        for rtype in ["A", "AAAA", "MX", "NS", "TXT"]:
            try:
                answers = dns.resolver.resolve(target, rtype, lifetime=3)
                result[rtype] = [str(rdata) for rdata in answers]
            except Exception:
                result[rtype] = []
        return {"status": "ok", "records": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
