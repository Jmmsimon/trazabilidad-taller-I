# -*- coding: utf-8 -*-
"""
Sesión de captura asistida para el Informe Capstone.
Chrome visible + remote debugging (el usuario inicia sesión a mano).

Uso:
  python docs/captura_browser.py start          # abre Chrome en :3000
  python docs/captura_browser.py shot fig05     # captura PNG
  python docs/captura_browser.py goto URL
  python docs/captura_browser.py status
  python docs/captura_browser.py quit
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "docs" / "entrega" / "capturas_capstone"
PROFILE = ROOT / "docs" / ".chrome_captura_profile"
STATE = ROOT / "docs" / ".captura_browser_state.json"
BASE = "http://localhost:3000"
DEBUG_PORT = 9222


def _service():
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        return Service(ChromeDriverManager().install())
    except Exception:
        return Service()


def start_browser():
    EVID.mkdir(parents=True, exist_ok=True)
    PROFILE.mkdir(parents=True, exist_ok=True)
    opts = Options()
    opts.add_argument(f"--remote-debugging-port={DEBUG_PORT}")
    opts.add_argument(f"--user-data-dir={PROFILE}")
    opts.add_argument("--window-size=1400,900")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-first-run")
    opts.add_argument("--no-default-browser-check")
    opts.add_experimental_option("detach", True)
    driver = webdriver.Chrome(service=_service(), options=opts)
    driver.set_page_load_timeout(60)
    try:
        driver.get(BASE)
    except Exception as e:
        print("WARN_LOAD", e)
    time.sleep(2)
    STATE.write_text(
        json.dumps({"debug_port": DEBUG_PORT, "base": BASE}, indent=2),
        encoding="utf-8",
    )
    path = EVID / "fig05_landing_portales.png"
    try:
        driver.save_screenshot(str(path))
        print("SHOT", path)
    except Exception as e:
        print("WARN_SHOT", e)
    print("BROWSER_OK")
    print("URL", driver.current_url)
    # leave browser open (detach=True); do not quit
    return 0


def attach():
    opts = Options()
    opts.add_experimental_option("debuggerAddress", f"127.0.0.1:{DEBUG_PORT}")
    driver = webdriver.Chrome(service=_service(), options=opts)
    driver.set_page_load_timeout(45)
    return driver


def shot(name: str):
    driver = attach()
    EVID.mkdir(parents=True, exist_ok=True)
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in name)
    path = EVID / f"{safe}.png"
    time.sleep(1.0)
    driver.save_screenshot(str(path))
    print("SHOT", path)
    print("URL", driver.current_url)
    print("TITLE", driver.title)
    return path


def goto(url: str):
    driver = attach()
    if url.startswith("/"):
        url = BASE.rstrip("/") + url
    try:
        driver.get(url)
    except Exception as e:
        print("WARN_GOTO", e)
    time.sleep(2.0)
    print("URL", driver.current_url)
    return 0


def status():
    driver = attach()
    print("URL", driver.current_url)
    print("TITLE", driver.title)
    body = driver.find_element("tag name", "body").text[:500].replace("\n", " | ")
    print("BODY", body)
    return 0


def click_text(text: str):
    """Click element containing text (best-effort)."""
    from selenium.webdriver.common.by import By

    driver = attach()
    candidates = driver.find_elements(By.XPATH, f"//*[contains(normalize-space(.), '{text}')]")
    for el in candidates:
        try:
            if el.is_displayed() and el.is_enabled():
                el.click()
                time.sleep(1.5)
                print("CLICKED", text)
                print("URL", driver.current_url)
                return 0
        except Exception:
            continue
    print("NOT_FOUND", text)
    return 1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    cmd = sys.argv[1]
    if cmd == "start":
        return start_browser()
    if cmd == "shot":
        name = sys.argv[2] if len(sys.argv) > 2 else f"shot_{int(time.time())}"
        shot(name)
        return 0
    if cmd == "goto":
        return goto(sys.argv[2])
    if cmd == "status":
        return status()
    if cmd == "click":
        return click_text(sys.argv[2])
    if cmd == "quit":
        try:
            attach().quit()
        except Exception as e:
            print("quit:", e)
        return 0
    print("unknown", cmd)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
