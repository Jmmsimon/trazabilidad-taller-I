"""Pruebas unitarias del parser de backlog CSV."""
import pytest

from backlog_parser import (
    _find_col,
    _normalize_estado,
    _normalize_tipo,
    _strip_bom,
    parse_csv,
    parse_backlog,
)


class TestNormalizeEstado:
    @pytest.mark.parametrize(
        "raw,esperado",
        [
            ("done", "Done"),
            ("Hecho", "Done"),
            ("completado", "Done"),
            ("in progress", "In Progress"),
            ("en progreso", "In Progress"),
            ("wip", "In Progress"),
            ("todo", "To Do"),
            ("por hacer", "To Do"),
            ("backlog", "To Do"),
            ("", "To Do"),
        ],
    )
    def test_normaliza_estados(self, raw, esperado):
        assert _normalize_estado(raw) == esperado


class TestNormalizeTipo:
    @pytest.mark.parametrize(
        "raw,esperado",
        [
            ("HU", "HU"),
            ("Historia de Usuario", "HU"),
            ("Tarea", "TA"),
            ("Spike", "SP"),
            ("Habilitador", "EN"),
            ("Documentación", "DO"),
            ("Requisito No Func.", "RN"),
        ],
    )
    def test_normaliza_tipos(self, raw, esperado):
        assert _normalize_tipo(raw) == esperado


class TestFindCol:
    def test_encuentra_titulo_en_espanol(self):
        assert _find_col(["id", "Título", "Estado"], ["titulo", "título", "title"]) == "Título"

    def test_sin_coincidencia_retorna_none(self):
        assert _find_col(["a", "b"], ["titulo"]) is None


class TestStripBom:
    def test_elimina_bom_utf8(self):
        assert _strip_bom("\ufefftitulo,estado") == "titulo,estado"


class TestParseCsv:
    def test_parsea_csv_basico_coma(self):
        csv_text = (
            "id,titulo,tipo,estado,sprint,prioridad\n"
            "HU-001,Login usuario,HU,Done,1,Alta\n"
            "EN-002,Integracion GitHub,EN,In Progress,2,Media\n"
        )
        items = parse_csv(csv_text)
        assert len(items) == 2
        assert items[0].id == "HU-001"
        assert items[0].estado == "Done"
        assert items[0].tipo == "HU"
        assert items[0].sprint == 1
        assert items[1].tipo == "EN"
        assert items[1].estado == "In Progress"

    def test_parsea_csv_punto_y_coma(self):
        csv_text = (
            "titulo;tipo;estado\n"
            "Configurar Firebase;EN;por hacer\n"
        )
        items = parse_csv(csv_text)
        assert len(items) == 1
        assert items[0].titulo == "Configurar Firebase"
        assert items[0].estado == "To Do"

    def test_csv_vacio_lanza_error(self):
        with pytest.raises(ValueError, match="vacío"):
            parse_csv("   ")

    def test_sin_columna_titulo_lanza_error(self):
        with pytest.raises(ValueError, match="título"):
            parse_csv("id,foo\n1,bar\n")

    def test_parse_backlog_source_csv(self):
        csv_text = "titulo,estado\nKanban board,done\n"
        items = parse_backlog(csv_text, "csv")
        assert len(items) == 1
        assert items[0].estado == "Done"
