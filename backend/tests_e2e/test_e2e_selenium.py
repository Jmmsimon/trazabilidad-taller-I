"""
Pruebas E2E con Selenium (smoke + login opcional).

Requisitos:
  pip install selenium webdriver-manager
  Frontend en http://localhost:3000

Opcional:
  set E2E_EMAIL=...
  set E2E_PASSWORD=...
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import pytest

BASE = os.getenv("E2E_BASE_URL", "http://localhost:3000")
EMAIL = os.getenv("E2E_EMAIL", "")
PASSWORD = os.getenv("E2E_PASSWORD", "")
EVID = Path(__file__).resolve().parent / "evidencias"


def _driver():
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
    except Exception:
        service = Service()  # usa chromedriver del PATH
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1280,900")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    return webdriver.Chrome(service=service, options=opts)


@pytest.fixture(scope="module")
def driver():
    try:
        drv = _driver()
    except Exception as exc:
        pytest.skip(f"Chrome/Selenium no disponible: {exc}")
    yield drv
    drv.quit()


def test_e2e01_home_carga(driver):
    driver.get(BASE)
    time.sleep(2)
    body = driver.find_element("tag name", "body").text
    assert body.strip() != ""
    EVID.mkdir(exist_ok=True)
    driver.save_screenshot(str(EVID / "e2e01_home.png"))


def test_e2e02_login_form_o_contenido(driver):
    driver.get(BASE)
    time.sleep(2)
    html = driver.page_source.lower()
    assert any(k in html for k in ("email", "password", "login", "iniciar", "correo", "estudiante", "docente"))
    driver.save_screenshot(str(EVID / "e2e02_login.png"))


@pytest.mark.skipif(not EMAIL or not PASSWORD, reason="Definir E2E_EMAIL y E2E_PASSWORD")
def test_e2e03_login_dashboard(driver):
    """Login real: la landing NO tiene inputs; el form está en /docente o /estudiante."""
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    EVID.mkdir(exist_ok=True)
    # Cuenta de prueba del docente → portal docente
    login_url = os.getenv("E2E_LOGIN_PATH", "/docente")
    if not login_url.startswith("http"):
        login_url = BASE.rstrip("/") + login_url

    driver.get(login_url)
    wait = WebDriverWait(driver, 20)
    email_el = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    pass_el = driver.find_element(By.CSS_SELECTOR, "input[type='password']")

    email_el.clear()
    email_el.send_keys(EMAIL)
    pass_el.clear()
    pass_el.send_keys(PASSWORD)

    # Botón submit del form
    clicked = False
    for b in driver.find_elements(By.CSS_SELECTOR, "button"):
        txt = (b.text or "").lower()
        if any(x in txt for x in ("iniciar", "login", "entrar", "ingresar", "sesión", "sesion")):
            b.click()
            clicked = True
            break
    if not clicked:
        # fallback: submit del form
        pass_el.submit()

    # Esperar redirección al dashboard (rol profesor → /dashboard/profesor)
    ok = False
    for _ in range(25):
        url = driver.current_url.lower()
        if any(r in url for r in ("/dashboard/", "/estudiante", "/administrador")):
            ok = True
            break
        time.sleep(1)

    driver.save_screenshot(str(EVID / "e2e03_dashboard.png"))
    assert ok, f"No redirigió al panel. URL actual: {driver.current_url}"
