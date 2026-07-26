"""
Prueba de carga simple del backend FastAPI (sin dependencias pesadas).

Uso:
  python tests_carga/load_test.py --base http://localhost:8000 --users 20 --requests 20
"""
from __future__ import annotations

import argparse
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def hit(url: str, timeout: float = 10.0) -> tuple[bool, float, int]:
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            code = getattr(resp, "status", 200)
            resp.read(256)
            ok = 200 <= int(code) < 400
            return ok, (time.perf_counter() - t0) * 1000.0, int(code)
    except urllib.error.HTTPError as e:
        return False, (time.perf_counter() - t0) * 1000.0, int(e.code)
    except Exception:
        return False, (time.perf_counter() - t0) * 1000.0, 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--path", default="/docs")
    ap.add_argument("--users", type=int, default=20)
    ap.add_argument("--requests", type=int, default=20)
    ap.add_argument(
        "--out",
        default=str(
            Path(__file__).resolve().parents[2]
            / "docs"
            / "entrega"
            / "Pruebas"
            / "Pruebas_de_carga"
            / "resultado_carga.txt"
        ),
    )
    args = ap.parse_args()
    url = args.base.rstrip("/") + args.path
    total = args.users * args.requests
    latencies: list[float] = []
    ok_n = 0
    codes: dict[int, int] = {}

    def worker(_):
        return hit(url)

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=args.users) as ex:
        futs = [ex.submit(worker, i) for i in range(total)]
        for f in as_completed(futs):
            ok, ms, code = f.result()
            latencies.append(ms)
            codes[code] = codes.get(code, 0) + 1
            if ok:
                ok_n += 1
    elapsed = time.perf_counter() - t0
    latencies.sort()
    p95 = latencies[int(0.95 * (len(latencies) - 1))] if latencies else 0
    mean = statistics.mean(latencies) if latencies else 0
    rps = total / elapsed if elapsed else 0
    success = 100.0 * ok_n / total if total else 0

    lines = [
        "PRUEBA DE CARGA — Trazabilidad Académica API",
        f"URL: {url}",
        f"Usuarios concurrentes: {args.users}",
        f"Requests por usuario: {args.requests}",
        f"Total requests: {total}",
        f"Duración: {elapsed:.2f} s",
        f"Throughput aprox: {rps:.2f} req/s",
        f"Éxitos: {ok_n}/{total} ({success:.2f}%)",
        f"Latencia media: {mean:.1f} ms",
        f"Latencia p95: {p95:.1f} ms",
        f"Códigos HTTP: {codes}",
        "",
        "Criterios:",
        f"  éxito >= 99%: {'PASS' if success >= 99 else 'FAIL'}",
        f"  media < 500ms (local): {'PASS' if mean < 500 else 'REVISAR'}",
    ]
    text = "\n".join(lines)
    print(text)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"Guardado: {out}")


if __name__ == "__main__":
    main()
