import os
import json
import uuid
import asyncio
from typing import Any, Dict, Optional
from dotenv import load_dotenv

# El backend vive fuera de la carpeta Next.js, 
# así que cargamos el .env.local desde la raíz del proyecto
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_root, ".env.local"))
load_dotenv(os.path.join(_root, ".env"))  # fallback


def get_llm():
    """Configura el LLM. Prioridad: Gemini (gratis) > Claude (de pago)."""
    
    # 1. Google Gemini (GRATIS)
    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        print("🟢 Usando Google Gemini 1.5 Pro (pago)")
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-pro-latest",
            temperature=0.2,
            google_api_key=google_key,
        )
    
    # 2. Anthropic Claude (de pago)
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and anthropic_key != "your_api_key_here":
        from langchain_anthropic import ChatAnthropic
        print("🔵 Usando Anthropic Claude")
        return ChatAnthropic(
            model="claude-3-5-sonnet-20240620",
            temperature=0.2,
            anthropic_api_key=anthropic_key
        )
    
    print("⚠️ MODO SIMULACIÓN: No hay GOOGLE_API_KEY ni ANTHROPIC_API_KEY.")
    return None


async def ask_claude(system_prompt: str, user_content: str) -> Optional[str]:
    """Envía una consulta al LLM activo y retorna la respuesta."""
    llm = get_llm()
    
    if llm is None:
        return _get_mock_response(system_prompt)

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content)
        ]
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        print(f"❌ Error al consultar LLM: {e}")
        return _get_mock_response(system_prompt)


def _get_mock_response(system_prompt: str) -> str:
    """Devuelve respuestas simuladas con todos los campos requeridos por Pydantic."""
    prompt_lower = system_prompt.lower()
    
    if "drafter" in prompt_lower or "propuesta" in prompt_lower:
        return json.dumps({
            "tema": "Sistema de Gestión Académica con IA",
            "descripcion": "Plataforma web que integra agentes de IA para automatizar el seguimiento de proyectos académicos, evaluando el progreso mediante análisis de commits y documentación.",
            "stack": ["Next.js", "FastAPI", "LangGraph", "PostgreSQL"],
            "hitos": [
                {
                    "id": str(uuid.uuid4()),
                    "nombre": "Configuración del Entorno",
                    "descripcion": "Setup del proyecto, repositorio, base de datos y CI/CD.",
                    "tareas": ["Crear repo en GitHub", "Configurar Next.js", "Configurar FastAPI", "Setup PostgreSQL"],
                    "evidencias_esperadas": ["Link al repositorio", "Screenshot del servidor corriendo"],
                    "semana_sugerida": 1
                },
                {
                    "id": str(uuid.uuid4()),
                    "nombre": "Autenticación y Dashboard",
                    "descripcion": "Implementar login con Firebase Auth y dashboard base con roles.",
                    "tareas": ["Integrar Firebase Auth", "Crear layout del dashboard", "Implementar roles"],
                    "evidencias_esperadas": ["Screenshot del login funcional", "Video de navegación por roles"],
                    "semana_sugerida": 2
                },
                {
                    "id": str(uuid.uuid4()),
                    "nombre": "Pipeline de Agentes IA",
                    "descripcion": "Implementar el flujo Discovery con agentes Drafter, Validator y PO.",
                    "tareas": ["Implementar AG-001 Drafter", "Implementar AG-002 Validator", "Conectar con frontend"],
                    "evidencias_esperadas": ["Log de ejecución de agentes", "JSON de propuesta generada"],
                    "semana_sugerida": 3
                },
                {
                    "id": str(uuid.uuid4()),
                    "nombre": "Tracking y Reportes",
                    "descripcion": "Implementar seguimiento continuo y generación de informes automáticos.",
                    "tareas": ["Implementar AG-DEVOPS", "Implementar AG-Analyst", "Crear vista de métricas"],
                    "evidencias_esperadas": ["Informe generado", "Dashboard con métricas"],
                    "semana_sugerida": 4
                }
            ],
            "observaciones": "Propuesta aprobada. El alcance es adecuado para un semestre académico."
        })
    
    if "validator" in prompt_lower:
        return json.dumps({
            "score": 87,
            "viable": True,
            "feedback": "Propuesta técnicamente viable. Stack coherente con los objetivos del proyecto."
        })
    
    if "product owner" in prompt_lower or "backlog" in prompt_lower or "\u00e9picas" in prompt_lower:
        return json.dumps({
            "epicas": [
                {
                    "id": "EP-001",
                    "titulo": "Autenticaci\u00f3n y Gesti\u00f3n de Usuarios",
                    "descripcion": "Todo lo relacionado con registro, login y perfiles de usuario",
                    "items": [
                        {
                            "id": "HU-001", "epicaId": "EP-001",
                            "tipo": "HU",
                            "titulo": "Registro de usuario",
                            "como": "nuevo usuario", "quiero": "registrarme con mi email",
                            "para": "acceder a la plataforma",
                            "criterios": [
                                {"descripcion": "Validación de email universitario", "verificable": True},
                                {"descripcion": "Email de confirmación enviado al registrarse", "verificable": True}
                            ],
                            "definicion_done": ["PR aprobado", "Tests al 80%", "Deploy en staging"],
                            "puntos": 3, "prioridad": "Alta", "depende_de": None, "sprint": 1, "estado": "backlog"
                        },
                        {
                            "id": "EN-001", "epicaId": "EP-001",
                            "tipo": "EN",
                            "titulo": "Configurar Firebase Auth",
                            "como": "desarrollador", "quiero": "habilitar los proveedores OAuth",
                            "para": "que los usuarios puedan iniciar sesión",
                            "criterios": [
                                {"descripcion": "OAuth2 funcional con Google", "verificable": True}
                            ],
                            "definicion_done": ["PR aprobado", "Tests al 80%", "Deploy en staging"],
                            "puntos": 5, "prioridad": "Alta", "depende_de": None, "sprint": 1, "estado": "backlog"
                        }
                    ]
                },
                {
                    "id": "EP-002",
                    "titulo": "M\u00f3dulo Principal del Proyecto",
                    "descripcion": "Funcionalidades core del sistema acad\u00e9mico",
                    "items": [
                        {
                            "id": "HU-003", "epicaId": "EP-002",
                            "tipo": "HU",
                            "titulo": "Dashboard principal",
                            "como": "usuario autenticado", "quiero": "ver mi dashboard",
                            "para": "tener una visión general del sistema",
                            "criterios": [
                                {"descripcion": "Carga en menos de 2 segundos", "verificable": True},
                                {"descripcion": "Muestra métricas en tiempo real", "verificable": True}
                            ],
                            "definicion_done": ["PR aprobado", "Tests al 80%", "Deploy en staging"],
                            "puntos": 5, "prioridad": "Alta", "depende_de": "HU-001", "sprint": 1, "estado": "backlog"
                        },
                        {
                            "id": "TA-001", "epicaId": "EP-002",
                            "tipo": "TA",
                            "titulo": "CRUD de recursos principales",
                            "como": "desarrollador", "quiero": "crear endpoints FastAPI",
                            "para": "que el dashboard consuma datos",
                            "criterios": [
                                {"descripcion": "Operaciones CRUD completas y validadas", "verificable": True}
                            ],
                            "definicion_done": ["PR aprobado", "Tests al 80%", "Deploy en staging"],
                            "puntos": 8, "prioridad": "Media", "depende_de": None, "sprint": 2, "estado": "backlog"
                        }
                    ]
                },
                {
                    "id": "EP-003",
                    "titulo": "Tracking e Integraci\u00f3n con IA",
                    "descripcion": "Seguimiento de hitos y agentes de evaluaci\u00f3n autom\u00e1tica",
                    "items": [
                        {
                            "id": "SP-001", "epicaId": "EP-003",
                            "tipo": "SP",
                            "titulo": "Investigación de Storage",
                            "como": "arquitecto", "quiero": "evaluar Firebase vs S3",
                            "para": "decidir dónde guardar las evidencias",
                            "criterios": [
                                {"descripcion": "Matriz de decisión completada", "verificable": True}
                            ],
                            "definicion_done": ["Documento publicado"],
                            "puntos": 5, "prioridad": "Alta", "depende_de": None, "sprint": 2, "estado": "backlog"
                        }
                    ]
                }
            ],
            "sprints": [
                {
                    "numero": 1,
                    "objetivo": "MVP con autenticaci\u00f3n y dashboard funcional",
                    "historias_ids": ["HU-001", "HU-002", "HU-003"],
                    "duracion_semanas": 2,
                    "puntos_totales": 13
                },
                {
                    "numero": 2,
                    "objetivo": "CRUD completo y subida de evidencias",
                    "historias_ids": ["HU-004", "HU-005"],
                    "duracion_semanas": 2,
                    "puntos_totales": 13
                }
            ],
            "total_puntos": 26,
            "velocidad_estimada": 13
        })
    
    return "Respuesta simulada del agente."


def clean_json_response(text: str) -> Dict[str, Any]:
    """Limpia el texto del LLM para extraer solo el JSON válido."""
    if not text:
        return {}
    try:
        return json.loads(text)
    except:
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end != 0:
                return json.loads(text[start:end])
        except:
            print(f"❌ No pude parsear JSON. Texto: {text[:150]}...")
            return {}
    return {}
