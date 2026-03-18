from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass


@dataclass(frozen=True)
class HttpResult:
    ok: bool
    status: int
    body: str


def post_json(url: str, payload: dict, *, headers: dict[str, str] | None = None, timeout_s: float = 10.0) -> HttpResult:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return HttpResult(ok=True, status=int(resp.status), body=body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else str(e)
        return HttpResult(ok=False, status=int(getattr(e, "code", 0) or 0), body=body)
    except Exception as e:
        return HttpResult(ok=False, status=0, body=str(e))

