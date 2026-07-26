"""Pruebas unitarias de modelos Pydantic y helpers de conversión."""
import pytest
from pydantic import ValidationError

from schemas import (
    BacklogItem,
    Competencia,
    Hito,
    PropuestaTecnica,
    SemaforoColor,
    dict_to_propuesta,
    propuesta_to_dict,
)


class TestCompetencia:
    def test_defaults(self):
        c = Competencia(id="c1", nombre="Git")
        assert c.nivel == "basico"
        assert c.adquirida is False

    def test_nivel_invalido(self):
        with pytest.raises(ValidationError):
            Competencia(id="c1", nombre="Git", nivel="experto")  # type: ignore[arg-type]


class TestBacklogItem:
    def test_estado_kanban_valido(self):
        item = BacklogItem(
            id="HU-001",
            epicaId="EP-1",
            titulo="Login",
            como="Como alumno",
            quiero="iniciar sesion",
            para="acceder al sistema",
            estado="done",
        )
        assert item.estado == "done"
        assert item.tipo == "HU"


class TestDictToPropuesta:
    def test_asigna_id_hito_si_falta(self):
        data = {
            "tema": "Trazabilidad",
            "descripcion": "Demo",
            "stack": ["Next.js"],
            "hitos": [
                {
                    "nombre": "Setup",
                    "descripcion": "Entorno",
                    "semana_sugerida": "1-2",
                }
            ],
        }
        p = dict_to_propuesta(data)
        assert isinstance(p, PropuestaTecnica)
        assert p.hitos[0].id.startswith("hito-")
        assert p.hitos[0].semana_sugerida == 1

    def test_roundtrip_propuesta(self):
        p = PropuestaTecnica(
            tema="Demo",
            descripcion="Prueba",
            stack=["Python"],
            hitos=[
                Hito(id="h1", nombre="A", descripcion="B"),
            ],
        )
        restored = dict_to_propuesta(propuesta_to_dict(p))
        assert restored.tema == "Demo"
        assert restored.hitos[0].id == "h1"


class TestSemaforoColor:
    def test_valores_enum(self):
        assert SemaforoColor.VERDE.value == "verde"
        assert set(SemaforoColor) == {
            SemaforoColor.ROJO,
            SemaforoColor.NARANJA,
            SemaforoColor.AMARILLO,
            SemaforoColor.VERDE,
        }
