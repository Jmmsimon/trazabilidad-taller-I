"""Pruebas unitarias del cálculo de semáforo de auditoría."""
import pytest

from schemas import SemaforoColor
from semaforo import calcular_color_semaforo


class TestCalcularColorSemaforo:
    @pytest.mark.parametrize(
        "pct,esperado",
        [
            (0, SemaforoColor.ROJO),
            (30, SemaforoColor.ROJO),
            (31, SemaforoColor.NARANJA),
            (55, SemaforoColor.NARANJA),
            (56, SemaforoColor.AMARILLO),
            (80, SemaforoColor.AMARILLO),
            (81, SemaforoColor.VERDE),
            (100, SemaforoColor.VERDE),
        ],
    )
    def test_rangos(self, pct, esperado):
        assert calcular_color_semaforo(pct) == esperado

    def test_error_fuerza_rojo(self):
        assert (
            calcular_color_semaforo(95, hay_error=True) == SemaforoColor.ROJO
        )

    def test_bulk_commit_penaliza_15(self):
        # 90 - 15 = 75 → amarillo
        assert (
            calcular_color_semaforo(90, bulk_commit_risk=True)
            == SemaforoColor.AMARILLO
        )
        # 40 - 15 = 25 → rojo
        assert (
            calcular_color_semaforo(40, bulk_commit_risk=True)
            == SemaforoColor.ROJO
        )
