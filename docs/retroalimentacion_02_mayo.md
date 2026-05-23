# 📋 Bitácora de Retroalimentación - Proyecto de Trazabilidad Académica
## Sesión 01: Evaluación de Planificación, Arquitectura Agéntica y Backlog
**Fecha:** 2 de mayo de 2026  
**Curso:** Taller de Proyectos I  
**Estudiante:** Jean Marcos Meneses Simon  
**Docente Evaluador:** Coordinador / Profesor de Taller I  

---

### 1. Resumen de la Sesión y Observaciones del Docente

En esta sesión se revisó el estado actual de la planificación del proyecto, el backlog y el enfoque arquitectónico inicial. Se identificaron observaciones críticas de diseño de software y de gestión de proyecto que deben ser corregidas para asegurar que el producto sea viable y cumpla con las expectativas académicas y de la industria.

#### A. Arquitectura de Software e Infraestructura
* **Optimización de Hardware y Recursos:** Dado que el producto final podría desplegarse en entornos con recursos limitados (por ejemplo, una aplicación móvil), es fundamental adaptar el software para que tenga un consumo mínimo de memoria RAM, espacio en disco y uso de CPU.
* **Manejo de Requisitos Volátiles:** Al ser un proyecto Capstone, el alcance inicial es volátil. No se tiene certeza absoluta sobre la plataforma final, modelo de base de datos o arquitectura de infraestructura. Se recomienda el uso estratégico de **Spikes tecnológicos** (investigaciones rápidas con PoC) para mitigar esta incertidumbre antes de implementar.
* **Escalabilidad y Concurrencia (Volumetría):** Se debe diseñar la arquitectura pensando en escenarios de crecimiento en usuarios concurrentes (soportar pruebas y diseños para 5, 50, 100, 1,000 o hasta 10,000 usuarios concurrentes), alineando esto directamente con las especificaciones técnicas del backend.

#### B. Modelo de Agentes Inteligentes (Enfoque Multi-Agente Holístico)
* **Evitar Consultas Aisladas (Prompts Sueltos):** En lugar de hacer consultas independientes a modelos de lenguaje (como ChatGPT, Gemini o Claude de forma aislada), lo cual genera respuestas contradictorias, se debe diseñar un **sistema multi-agente orquestado**.
* **Roles Agénticos Recomendados (6-7 agentes):** Se solicitó incorporar una confluencia de agentes que interactúen entre sí simulando un equipo de desarrollo y gestión:
  1. **Agente Gestor de Proyectos (Product Manager):** Administra el backlog e hitos.
  2. **Agente de Investigación / Trazabilidad:** Identifica consistencias académicas.
  3. **Agente Scrum Master (Simulado):** Evalúa el cumplimiento ágil.
  4. **Agente DevOps (Simulado):** Gestiona integración y calidad.
  5. **Agente Desarrollador Full-Stack:** Propone soluciones técnicas.
  *Esto permitirá generar simulaciones más realistas del ciclo de vida del software en solo 20 minutos de revisión.*

#### C. Trazabilidad de Competencias y Acreditación (Foco Docente)
* El curso Capstone evalúa más del 60% de las competencias de egreso de la carrera. La plataforma debe ser capaz de dejar evidencias claras, inmutables y automatizadas del avance del estudiante para fines de acreditación (auditorías académicas).

#### D. Observaciones y Correcciones al Backlog (CSV)
* **Definición de Roles:** Cambiar el rol genérico de `"Escuela"` a roles específicos con permisos definidos en el sistema (ej. `"Director de Escuela"`, `"Administrador"`, o `"Comité de Calidad/Acreditación"`).
* **Historias de Usuario Aprobadas:**
  * *Validación del ciclo semanal:* Muy buen enfoque para que el docente califique el avance de la semana.
  * *Métricas e Integridad (Spike):* Excelente propuesta del Spike para detectar a alumnos que reportan avance simulado ("cartanean") pero no suben código real al repositorio. Se debe correlacionar la actividad declarada con las evidencias en Git.
  * *Agente Analista de Desvíos:* Deberá clasificar el nivel de riesgo del grupo en el dashboard.
* **Errores de Clasificación en el Backlog:**
  * El "Manejo de errores" y la "Documentación" **no son Épicas independientes**; son requisitos no funcionales transversales o tareas técnicas. Se deben reubicar en sus respectivas secciones en el backlog.
  * Se deben agregar historias de usuario explícitas para la autenticación y roles de los usuarios en lugar de considerarlo solo infraestructura.

#### E. Estado del Cronograma
* **Alerta de Retraso:** Nos encontramos en la **Semana 5** del ciclo académico y aún no se ha cerrado la planificación de la **Semana 3**. Es urgente acelerar la implementación de la interfaz de usuario y el backend para tener un entregable visualizable de inmediato.
* **Gestión de Cuotas de API:** El problema de cuota de tokens con APIs de pago (Claude/Gemini) debe resolverse. Se sugiere migrar a modelos abiertos o balancear las llamadas usando las credenciales correctas.

---

### 2. Plan de Acción y Tareas a Implementar (Backlog Update)

1. **[Backlog.csv] Ajustar la estructura de roles:** Cambiar `"Escuela"` por `"Comité de Calidad"` o `"Director/Administrador"`.
2. **[Backlog.csv] Reubicar Épicas Incorrectas:** Mover el manejo de errores a Requisitos No Funcionales transversales y documentarlo en su respectiva sección.
3. **[Arquitectura] Redactar el diseño del flujo multi-agente:** Diseñar la interacción de los 5 agentes (Gestor, Investigador, Scrum Master, DevOps, Full-Stack) en la PoC actual de LangGraph.
4. **[Desarrollo] Implementar login y roles:** Finalizar el login funcional del estudiante conectado a Firebase.
