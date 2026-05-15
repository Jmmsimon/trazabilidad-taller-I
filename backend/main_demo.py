"""
main.py — Demo integrado de ambos subgrafos: DISCOVERY + TRACKING

Flujo completo:
1. Alumno ingresa idea tentativa
2. Subgrafo DISCOVERY: AG-001 → AG-002 → AG-PO (loop iterativo hasta confirmar)
3. Alumno confirma → docente revisa (simulado)
4. Subgrafo TRACKING: AG-DEVOPS + AG-COMP → AG-003 → AG-004
5. Resultado: informe final con resumen, competencias y alertas

Uso:
    python main.py
"""

from schemas import DiscoveryState, TrackingState, PropuestaTecnica
from discovery_graph import build_discovery_graph
from tracking_graph import build_tracking_graph, simular_evidencias


def run_discovery() -> DiscoveryState:
    """
    Ejecuta el subgrafo DISCOVERY.
    Simula la co-creación del tema entre alumno y agentes.
    """
    print("\n" + "=" * 70)
    print("🚀 INICIANDO FASE A: DISCOVERY — Co-creación del tema")
    print("=" * 70)

    initial_state = DiscoveryState(
        idea_alumno=(
            "Quiero hacer una app para que los estudiantes puedan gestionar "
            "sus proyectos de tesis, con seguimiento de hitos y revisiones por docentes"
        ),
        stack_tentativo=["React", "Node.js", "PostgreSQL"],
        max_iteraciones=3,
    )

    print(f"\n👤 Alumno dice: '{initial_state.idea_alumno}'")
    print(f"   Stack tentativo: {initial_state.stack_tentativo}")

    graph = build_discovery_graph()
    result_dict = graph.invoke(initial_state)
    # result_dict es un diccionario con el estado actualizado
    # En LangGraph, invoke devuelve el estado final como dict
    
    # Mapear dict a DiscoveryState object
    result = DiscoveryState(**result_dict)

    print("\n" + "=" * 70)
    print("✅ DISCOVERY COMPLETADO")
    print("=" * 70)

    if result.propuesta:
        print(f"\n📋 Propuesta confirmada:")
        print(f"   Tema: {result.propuesta.tema}")
        print(f"   Descripción: {result.propuesta.descripcion}")
        print(f"   Stack: {', '.join(result.propuesta.stack)}")
        print(f"   Hitos ({len(result.propuesta.hitos)}):")
        for h in result.propuesta.hitos:
            print(f"      • {h.nombre}: {', '.join(h.evidencias_esperadas)}")

    print(f"\n   Score final del Validator: {result.score_validator}/100")
    print(f"   Iteraciones realizadas: {result.iteracion}")
    print(f"   Backlog PO: {len(result.backlog_po)} items")

    return result


def run_tracking(propuesta: PropuestaTecnica, alumno_id: str = "alumno-001") -> TrackingState:
    """
    Ejecuta el subgrafo TRACKING.
    Simula el seguimiento del alumno a su propio ritmo.
    """
    print("\n" + "=" * 70)
    print("🚀 INICIANDO FASE B: TRACKING — Seguimiento continuo")
    print("=" * 70)

    # Simular evidencias subidas por el alumno
    evidencias = simular_evidencias(alumno_id, n_evidencias=8)

    print(f"\n👤 Alumno: {alumno_id}")
    print(f"   Evidencias simuladas: {len(evidencias)}")
    for ev in evidencias:
        icon = "✅" if ev.estado == "validada" else "⏳" if ev.estado == "subida" else "⬜"
        print(f"      {icon} [{ev.tipo}] {ev.id} → {ev.estado}")

    initial_state = TrackingState(
        alumno_id=alumno_id,
        propuesta_confirmada=propuesta,
        evidencias=evidencias,
    )

    graph = build_tracking_graph()
    result_dict = graph.invoke(initial_state)
    result = TrackingState(**result_dict)

    print("\n" + "=" * 70)
    print("✅ TRACKING COMPLETADO")
    print("=" * 70)

    print(f"\n📊 Score de integridad: {result.score_integridad}%")

    if result.reporte_competencias:
        pct = result.reporte_competencias.porcentaje_adquirido
        adquiridas = sum(1 for c in result.reporte_competencias.competencias if c.adquirida)
        print(f"📚 Competencias: {adquiridas}/{len(result.reporte_competencias.competencias)} ({pct}%)")

    print(f"\n🚨 Alertas totales: {len(result.alertas)}")
    for a in result.alertas:
        print(f"   [{a.severidad.upper()}] {a.tipo}: {a.mensaje}")

    print(f"\n📝 Resumen ejecutivo:")
    print(f"   {result.resumen_ejecutivo[:250]}...")

    print(f"\n🏁 Ciclo activo: {result.ciclo_activo}")

    return result


def main():
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║        PROYECTO ACADÉMICO — MULTI-AGENTE LANGGRAPH DEMO        ║
    ║                                                                  ║
    ║  Fase A: Discovery → co-crear tema con el alumno              ║
    ║  Fase B: Tracking  → monitorear avance y generar informes       ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)

    # ── FASE A: DISCOVERY ──
    discovery_result = run_discovery()

    # Simular pausa / confirmación del docente
    print("\n👨🏫 [Docente] Revisando propuesta confirmada por el alumno...")
    print("   ✓ Propuesta aprobada por el docente. Procediendo al seguimiento.")

    # ── FASE B: TRACKING ──
    tracking_result = run_tracking(
        propuesta=discovery_result.propuesta,
        alumno_id="alumno-001"
    )

    # ── RESUMEN FINAL ──
    print("\n" + "=" * 70)
    print("📋 RESUMEN EJECUTIVO DEL CICLO COMPLETO")
    print("=" * 70)
    print(f"""
    Alumno:        {tracking_result.alumno_id}
    Tema:          {discovery_result.propuesta.tema}
    Iteraciones:   {discovery_result.iteracion} (Discovery)
    Score Valid:   {discovery_result.score_validator}/100
    Integridad:    {tracking_result.score_integridad}%
    Competencias:  {tracking_result.reporte_competencias.porcentaje_adquirido if tracking_result.reporte_competencias else 0}%
    Alertas:       {len(tracking_result.alertas)}
    Estado final:  {'✅ Aprobado' if tracking_result.score_integridad >= 70 else '⚠️ Observado' if tracking_result.score_integridad >= 50 else '❌ Desaprobado'}
    """)

    print("\n🎉 Demo completado exitosamente.")
    print("=" * 70)


if __name__ == "__main__":
    main()
