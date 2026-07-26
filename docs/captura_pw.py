# -*- coding: utf-8 -*-
"""
Captura asistida con Playwright (Chrome visible).
El usuario inicia sesión a mano; yo capturo y pego en el Capstone.

Uso:
  python docs/captura_pw.py start
  python docs/captura_pw.py shot nombre
  python docs/captura_pw.py goto /ruta
  python docs/captura_pw.py status
  python docs/captura_pw.py click "texto"
  python docs/captura_pw.py quit
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "docs" / "entrega" / "capturas_capstone"
STATE = ROOT / "docs" / ".captura_pw_state.json"
BASE = "http://127.0.0.1:3000"
CDP_PORT = 9333


def _launch_chrome():
    import subprocess
    import shutil

    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        shutil.which("chrome"),
        shutil.which("google-chrome"),
    ]
    chrome = next((c for c in candidates if c and Path(c).exists()), None)
    if not chrome:
        raise RuntimeError("No se encontró Google Chrome instalado.")

    profile = ROOT / "docs" / ".chrome_captura_profile"
    profile.mkdir(parents=True, exist_ok=True)
    EVID.mkdir(parents=True, exist_ok=True)

    # Si ya hay algo en el puerto, no relanzar
    import socket
    s = socket.socket()
    try:
        s.settimeout(0.5)
        s.connect(("127.0.0.1", CDP_PORT))
        s.close()
        print("CHROME_ALREADY_RUNNING")
        return
    except Exception:
        pass

    cmd = [
        chrome,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={profile}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--window-size=1400,900",
        BASE,
    ]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # esperar CDP
    for _ in range(40):
        try:
            s = socket.socket()
            s.settimeout(0.5)
            s.connect(("127.0.0.1", CDP_PORT))
            s.close()
            break
        except Exception:
            time.sleep(0.5)
    else:
        raise RuntimeError("Chrome no abrió el puerto CDP a tiempo.")


def _connect():
    from playwright.sync_api import sync_playwright

    pw = sync_playwright().start()
    browser = pw.chromium.connect_over_cdp(f"http://127.0.0.1:{CDP_PORT}")
    context = browser.contexts[0] if browser.contexts else browser.new_context()
    page = context.pages[0] if context.pages else context.new_page()
    return pw, browser, page


def start():
    _launch_chrome()
    time.sleep(2)
    pw, browser, page = _connect()
    try:
        page.goto(BASE, wait_until="domcontentloaded", timeout=90000)
    except Exception as e:
        print("WARN_GOTO", e)
    time.sleep(1.5)
    path = EVID / "fig05_landing_portales.png"
    page.screenshot(path=str(path), full_page=False)
    STATE.write_text(json.dumps({"cdp": CDP_PORT, "base": BASE}), encoding="utf-8")
    print("BROWSER_OK")
    print("URL", page.url)
    print("SHOT", path)
    browser.close()
    pw.stop()
    return 0


def shot(name: str):
    pw, browser, page = _connect()
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in name)
    path = EVID / f"{safe}.png"
    time.sleep(0.8)
    page.screenshot(path=str(path), full_page=False)
    print("SHOT", path)
    print("URL", page.url)
    browser.close()
    pw.stop()
    return 0


def goto(url: str):
    pw, browser, page = _connect()
    if url.startswith("/"):
        url = BASE.rstrip("/") + url
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
    except Exception as e:
        print("WARN_GOTO", e)
    time.sleep(1.2)
    print("URL", page.url)
    browser.close()
    pw.stop()
    return 0


def status():
    pw, browser, page = _connect()
    print("URL", page.url)
    print("TITLE", page.title())
    text = page.inner_text("body")[:600].replace("\n", " | ")
    print("BODY", text)
    browser.close()
    pw.stop()
    return 0


def click_text(text: str):
    pw, browser, page = _connect()
    try:
        page.get_by_text(text, exact=False).first.click(timeout=8000)
        time.sleep(1.2)
        print("CLICKED", text)
        print("URL", page.url)
    except Exception as e:
        print("NOT_FOUND", text, e)
        browser.close()
        pw.stop()
        return 1
    browser.close()
    pw.stop()
    return 0


def quit_browser():
    import subprocess
    # cierra solo el chrome de este profile es difícil; cerramos por puerto
    try:
        pw, browser, page = _connect()
        browser.close()
        pw.stop()
    except Exception as e:
        print("quit_warn", e)
    return 0


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    cmd = sys.argv[1]
    if cmd == "start":
        return start()
    if cmd == "shot":
        return shot(sys.argv[2] if len(sys.argv) > 2 else f"shot_{int(time.time())}")
    if cmd == "goto":
        return goto(sys.argv[2])
    if cmd == "status":
        return status()
    if cmd == "click":
        return click_text(sys.argv[2])
    if cmd == "quit":
        return quit_browser()
    print("unknown", cmd)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
