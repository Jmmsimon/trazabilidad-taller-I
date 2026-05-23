from firebase_client import db
from typing import Any, Dict, Optional, List

COLLECTION = "proyectos"

# ── Proyectos ────────────────────────────────────────────

def crear_proyecto(proyecto_id: str, data: Dict[str, Any]) -> None:
    """Crea o sobreescribe un documento de proyecto."""
    db.collection(COLLECTION).document(proyecto_id).set(data)


def actualizar_proyecto(proyecto_id: str, data: Dict[str, Any]) -> None:
    """Actualiza campos específicos sin borrar el resto."""
    db.collection(COLLECTION).document(proyecto_id).update(data)


def obtener_proyecto(proyecto_id: str) -> Optional[Dict[str, Any]]:
    """Devuelve el proyecto o None si no existe."""
    doc = db.collection(COLLECTION).document(proyecto_id).get()
    if not doc.exists:
        return None
    return {"proyectoId": doc.id, **doc.to_dict()}


def listar_proyectos() -> List[Dict[str, Any]]:
    """Devuelve todos los proyectos."""
    docs = db.collection(COLLECTION).stream()
    return [{"proyectoId": d.id, **d.to_dict()} for d in docs]


def proyecto_existe(proyecto_id: str) -> bool:
    doc = db.collection(COLLECTION).document(proyecto_id).get()
    return doc.exists


# ── Chat (historial del asistente por proyecto) ──────────

def guardar_mensaje_chat(proyecto_id: str, mensaje: Dict[str, Any]) -> None:
    """Agrega un mensaje al historial del chat del proyecto."""
    db.collection(COLLECTION).document(proyecto_id)\
      .collection("chat").add(mensaje)


def obtener_historial_chat(proyecto_id: str) -> List[Dict[str, Any]]:
    """Devuelve el historial de chat ordenado por timestamp."""
    msgs = db.collection(COLLECTION).document(proyecto_id)\
             .collection("chat").order_by("timestamp").stream()
    return [{"id": m.id, **m.to_dict()} for m in msgs]


# ── Usuarios ─────────────────────────────────────────────

def crear_usuario(uid: str, data: Dict[str, Any]) -> None:
    db.collection("usuarios").document(uid).set(data, merge=True)


def obtener_usuario(uid: str) -> Optional[Dict[str, Any]]:
    doc = db.collection("usuarios").document(uid).get()
    if not doc.exists:
        return None
    return {"uid": doc.id, **doc.to_dict()}
