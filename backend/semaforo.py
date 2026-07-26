"""Cálculo puro del semáforo de auditoría (sin I/O ni LLM)."""
from __future__ import annotations

from schemas import SemaforoColor


def calcular_color_semaforo(
    porcentaje: float,
    *,
    bulk_commit_risk: bool = False,
    hay_error: bool = False,
) -> SemaforoColor:
    """
    Determina el color del semáforo según el % de correspondencia backlog↔código.

    Rangos:
      - rojo:     0–30
      - naranja: 31–55
      - amarillo: 56–80
      - verde:   81–100
    Si hay bulk-commit sospechoso se aplica penalización de 15 puntos.
    """
    if hay_error:
        return SemaforoColor.ROJO

    pct = float(porcentaje)
    if bulk_commit_risk:
        pct = max(0.0, pct - 15.0)

    if pct >= 81:
        return SemaforoColor.VERDE
    if pct >= 56:
        return SemaforoColor.AMARILLO
    if pct >= 31:
        return SemaforoColor.NARANJA
    return SemaforoColor.ROJO
