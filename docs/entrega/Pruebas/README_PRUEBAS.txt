SUITE DE PRUEBAS — Plataforma de Trazabilidad Académica con Agentes de IA Generativa para Gestión de Proyectos Universitarios de Software

Carpetas (subir cada una en la sección Pruebas de la plataforma):

1) Pruebas_unitarias/
   - Informe_Pruebas_Unitarias.docx
   - pytest_resultado.txt
   Código: backend/tests/  →  python -m pytest -v

2) Pruebas_de_funcionalidad/
   - Informe_Pruebas_Funcionales.docx
   (pegar capturas del piloto)

3) Pruebas_de_caja_negra/
   - Informe_Pruebas_Caja_Negra.docx

4) Pruebas_E2E_Selenium/
   - Informe_Pruebas_E2E_Selenium.docx
   Código: backend/tests_e2e/
   pip install selenium webdriver-manager
   python -m pytest tests_e2e -v -s

5) Pruebas_de_carga/
   - Informe_Pruebas_Carga.docx
   Código: backend/tests_carga/load_test.py
   (con backend arriba) python tests_carga/load_test.py --users 20 --requests 20

Actas: docs/entrega/Actas/ (también copiadas al Escritorio)
