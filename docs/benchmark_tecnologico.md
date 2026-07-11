# Reporte de Benchmark Tecnológico y Justificación de Arquitectura

Este documento provee la justificación técnica de la selección de tecnologías para la Plataforma de Trazabilidad Académica, comparándolas con alternativas evaluadas en el primer hito del proyecto.

---

## 1. Orquestación Multi-Agente: LangGraph vs. AutoGen vs. LangChain

Para modelar los flujos de co-creación del backlog (Fase 1) y de auditoría continua de commits (Fase 2-3), se evaluaron las siguientes herramientas:

| Criterio | LangGraph (Seleccionado) | AutoGen | LangChain (Vanilla) |
|---|---|---|---|
| **Determinismo** | **Muy Alto:** Permite definir grafos cíclicos con transiciones basadas en estados explícitos. | **Bajo:** Conversaciones libres basadas puramente en prompts, difícil de controlar. | **Bajo:** No cuenta con soporte nativo de ciclos/bucles de retroalimentación complejos. |
| **Persistencia** | **Excelente:** Control nativo de "checkpoints" para pausar/reanudar conversaciones de agentes. | **Media:** Requiere implementar lógica personalizada para base de datos. | **Baja:** Lógica lineal sin checkpoints nativos. |
| **Control Docente** | **Alto:** Fácil de inyectar validaciones humanas en las transiciones (Human-in-the-loop). | **Medio:** Interrupciones reactivas pero menos estructuradas a nivel de flujo. | **Bajo:** Todo se ejecuta en un pipeline secuencial directo. |

**Justificación:** LangGraph fue seleccionado debido a que el modelado académico requiere que los agentes (Drafter, Validator, PO, DevOps, Analyst) sigan reglas de transición estrictas basadas en el estado (`DiscoveryState` y `TrackingState`), además de permitir la intervención del docente para aprobar o rechazar avances de forma estructurada.

---

## 2. Framework Backend: FastAPI vs. Django vs. Express.js

El backend requiere procesar llamadas de LLMs en segundo plano y responder consultas concurrentes del dashboard en menos de 2 segundos.

| Métrica / Criterio | FastAPI (Seleccionado) | Django | Express.js |
|---|---|---|---|
| **Rendimiento (Req/s)** | **~25,000 req/s** (Uvicorn/ASGI) | ~3,000 req/s (WSGI estándar) | ~15,000 req/s |
| **Consumo de Memoria** | **Muy Bajo (~30MB RAM base)** | Medio-Alto (~120MB RAM base) | Bajo (~45MB RAM base) |
| **Manejo de Concurrencia**| **Excelente (Nativo `async`/`await`)** | Limitado (Requiere WSGI asincrónico o Django Channels) | Excelente (Single thread event loop) |
| **Tipado y Validación** | **Nativo (Pydantic)** | Requiere librerías externas o Django Forms | Requiere Zod/TypeScript adicional |

**Justificación:** FastAPI, corriendo sobre Uvicorn, provee una velocidad comparable a Node.js y Go con un consumo de recursos mínimo, lo cual soluciona la restricción de hardware y coste del despliegue en la nube. Su integración nativa con Pydantic simplifica la serialización de los estados de LangGraph hacia Firestore.

---

## 3. Base de Datos: Firebase Firestore vs. PostgreSQL (SQL)

| Criterio | Firestore (Seleccionado) | PostgreSQL |
|---|---|---|
| **Esquema** | **NoSQL (Documentos):** Ideal para almacenar el backlog dinámico del estudiante y chats. | **SQL (Relacional):** Requiere migraciones rígidas y esquemas fijos. |
| **Integración con Auth** | **Directa:** Reglas de seguridad basadas en roles directo al documento. | Requiere construir capas de RLS o backend robusto. |
| **Velocidad de Iteración**| **Muy Alta:** Ideal para la volatilidad de requisitos de un proyecto Capstone. | **Baja:** Cada cambio de hito o estructura del backlog requiere migraciones. |

**Justificación:** Al ser un proyecto ágil donde las historias de usuario y tareas técnicas mutan por hito, Firestore permite guardar los objetos serializados de Pydantic directamente sin mapeos complejos (ORM), reduciendo el tiempo de desarrollo.

---

## 4. Pruebas de Carga y Volumetría (Simuladas)

Para responder a la solicitud docente de soportar volumetría, se proyectan los siguientes consumos con FastAPI:

*   **5 Usuarios Concurrentes:** ~45MB RAM, <1% CPU. Tiempos de respuesta: ~25ms.
*   **500 Usuarios Concurrentes:** ~120MB RAM, ~12% CPU. Tiempos de respuesta: ~110ms.
*   **1,000 Usuarios Concurrentes:** ~210MB RAM, ~25% CPU. Tiempos de respuesta: ~280ms (con balanceador de carga básico).
*   **Estrategia de Mitigación de Tokens:** Las llamadas complejas de auditoría se encolan mediante `BackgroundTasks` en FastAPI, evitando bloquear el hilo principal y garantizando respuestas HTTP inmediatas (`<200ms`).
