import os
import sys
import json
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Agregar el directorio actual al path para las importaciones
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from discovery_graph import build_discovery_graph
from schemas import DiscoveryState, PropuestaTecnica, propuesta_to_dict

load_dotenv()

app = FastAPI(title="Trazabilidad AI API")

# CORS para permitir llamadas desde Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════
# ALMACÉN EN MEMORIA (reemplaza PostgreSQL durante desarrollo)
# ══════════════════════════════════════════════════════════════════════
projects_store: Dict[str, Dict[str, Any]] = {}


class ProjectStartRequest(BaseModel):
    idea: str
    stack: List[str]
    alumnoId: str
    nombre: str


async def run_discovery_task(proyecto_id: str, idea: str, stack: List[str], nombre: str):
    """Ejecuta el grafo Discovery en background y guarda resultados en memoria."""
    try:
        graph = build_discovery_graph()
        initial_state = DiscoveryState(
            idea_alumno=idea,
            stack_tentativo=stack,
            max_iteraciones=3,
        )

        # Ejecutar el grafo de forma ASÍNCRONA (los nodos son async def)
        result_dict = await graph.ainvoke(initial_state)
        result = DiscoveryState(**result_dict)

        # Extraer datos de la propuesta
        propuesta = result.propuesta
        if propuesta:
            propuesta_data = propuesta_to_dict(propuesta)
            hitos_data = propuesta_data.get("hitos", [])
            
            # Formatear hitos para el frontend
            hitos_formatted = []
            for h in hitos_data:
                hitos_formatted.append({
                    "nombre": h.get("nombre", "Sin nombre"),
                    "descripcion": h.get("descripcion", ""),
                    "semana": h.get("semana_sugerida", 1),
                    "tareas": h.get("tareas", []),
                    "evidencias": h.get("evidencias_esperadas", [])
                })

            # Formatear backlog
            backlog_formatted = []
            for story in (result.backlog_po or []):
                if isinstance(story, str):
                    backlog_formatted.append({
                        "titulo": story,
                        "como": "usuario",
                        "quiero": story,
                        "para": "mejorar el sistema",
                        "prioridad": "Media"
                    })
                elif isinstance(story, dict):
                    backlog_formatted.append(story)

            # Guardar en memoria
            projects_store[proyecto_id] = {
                "status": "pending_approval",
                "scoreValidator": result.score_validator or 0,
                "propuesta": {
                    "nombre": propuesta.tema or nombre,
                    "descripcion": propuesta.descripcion or idea,
                    "hitos": hitos_formatted,
                    "backlog": backlog_formatted
                }
            }
            print(f"✅ Proyecto {proyecto_id} procesado exitosamente.")
        else:
            projects_store[proyecto_id] = {
                "status": "error",
                "error": "No se pudo generar la propuesta."
            }
            print(f"❌ Error: propuesta vacía para {proyecto_id}")

    except Exception as e:
        print(f"❌ Error in discovery task: {e}")
        import traceback
        traceback.print_exc()
        projects_store[proyecto_id] = {
            "status": "error",
            "error": str(e)
        }


@app.post("/proyectos/iniciar")
async def iniciar_proyecto(req: ProjectStartRequest, background_tasks: BackgroundTasks):
    proyecto_id = f"proj-{os.urandom(4).hex()}"

    # Guardar estado inicial en memoria
    projects_store[proyecto_id] = {"status": "processing"}
    print(f"🚀 Proyecto {proyecto_id} iniciado. Ejecutando agentes...")

    # Lanzar el grafo en background
    background_tasks.add_task(run_discovery_task, proyecto_id, req.idea, req.stack, req.nombre)

    return {"proyectoId": proyecto_id, "status": "processing"}


@app.get("/proyectos/{proyecto_id}/status")
async def get_status(proyecto_id: str):
    project = projects_store.get(proyecto_id)

    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    return project


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🧠 Servidor de Trazabilidad AI — FastAPI + LangGraph")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
