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


def eliminar_chat_proyecto(proyecto_id: str) -> None:
    """Elimina todos los mensajes de la subcolección chat de un proyecto."""
    chat_ref = db.collection(COLLECTION).document(proyecto_id).collection("chat")
    docs = list(chat_ref.limit(100).stream())
    for doc in docs:
        doc.reference.delete()



# ── Usuarios ─────────────────────────────────────────────

def crear_usuario(uid: str, data: Dict[str, Any]) -> None:
    db.collection("usuarios").document(uid).set(data, merge=True)


def obtener_usuario(uid: str) -> Optional[Dict[str, Any]]:
    doc = db.collection("usuarios").document(uid).get()
    if not doc.exists:
        return None
    return {"uid": doc.id, **doc.to_dict()}


def obtener_proyecto_por_alumno(alumno_id: str) -> Optional[Dict[str, Any]]:
    """Busca el proyecto de un alumno por su alumnoId."""
    docs = db.collection(COLLECTION).where("alumnoId", "==", alumno_id).limit(1).stream()
    for doc in docs:
        return {"proyectoId": doc.id, **doc.to_dict()}
    return None


def obtener_proyecto_por_repo(repo_url: str) -> Optional[Dict[str, Any]]:
    """Busca el proyecto asociado a un repositorio de GitHub."""
    if not repo_url:
        return None
    cleaned = repo_url.strip().rstrip("/")
    # Buscar con y sin barra final para tolerancia
    for url in [cleaned, cleaned + "/"]:
        docs = db.collection(COLLECTION).where("repo_url", "==", url).limit(1).stream()
        for doc in docs:
            return {"proyectoId": doc.id, **doc.to_dict()}
    return None


def listar_usuarios() -> List[Dict[str, Any]]:
    """Devuelve todos los usuarios registrados."""
    docs = db.collection("usuarios").stream()
    return [{"uid": d.id, **d.to_dict()} for d in docs]


def actualizar_rol_usuario(uid: str, rol: str) -> None:
    """Actualiza el rol de un usuario."""
    db.collection("usuarios").document(uid).update({"rol": rol})


def obtener_usuario_por_email(email: str) -> Optional[Dict[str, Any]]:
    """Busca un usuario por su correo electrónico."""
    docs = db.collection("usuarios").where("email", "==", email).limit(1).stream()
    for doc in docs:
        return {"uid": doc.id, **doc.to_dict()}
    return None


from firebase_admin import auth

def crear_o_invitar_usuario(email: str, rol: str, nombre: Optional[str] = None, password: Optional[str] = None) -> str:
    """Crea un registro de usuario invitado o actualiza el rol si ya existe."""
    import datetime
    
    # 1. Obtener o crear el usuario en Firebase Auth si se proporcionó una contraseña
    # o si ya existe en Firebase Auth.
    auth_uid = None
    try:
        auth_user = auth.get_user_by_email(email)
        auth_uid = auth_user.uid
        if password:
            auth.update_user(auth_uid, password=password)
            if nombre:
                auth.update_user(auth_uid, display_name=nombre)
    except Exception:
        # No existe en Firebase Auth, lo creamos si hay password
        if password:
            try:
                user_record = auth.create_user(
                    email=email,
                    password=password,
                    display_name=nombre or "Usuario Pre-registrado"
                )
                auth_uid = user_record.uid
            except Exception as e:
                # Lanzamos el error para que el backend/frontend lo reporten
                raise ValueError(f"Error al crear el usuario en Firebase Auth: {str(e)}")

    # 2. Buscar si ya existe en Firestore por email
    docs = list(db.collection("usuarios").where("email", "==", email).limit(1).stream())
    
    if docs:
        old_doc = docs[0]
        old_id = old_doc.id
        old_data = old_doc.data()
        
        # Combinar datos existentes con los nuevos
        updated_data = {
            **old_data,
            "rol": rol,
            "nombre": nombre or old_data.get("nombre") or "Docente Pre-registrado"
        }
        if password:
            updated_data["debeCambiarContrasena"] = True
        
        # Determinar el ID final del documento
        target_id = auth_uid or old_id
        
        if target_id != old_id:
            # Si el ID cambia (de 'invited-...' a un UID real), creamos el nuevo y borramos el viejo
            db.collection("usuarios").document(target_id).set(updated_data)
            db.collection("usuarios").document(old_id).delete()
        else:
            # Si sigue siendo el mismo ID, simplemente actualizamos
            db.collection("usuarios").document(target_id).set(updated_data)
            
        return target_id
    else:
        # 3. No existe en Firestore, creamos uno nuevo
        target_id = auth_uid
        if not target_id:
            import uuid
            target_id = f"invited-{uuid.uuid4().hex[:8]}"
            
        user_data = {
            "email": email,
            "rol": rol,
            "nombre": nombre or "Docente Pre-registrado",
            "creadoEn": datetime.datetime.utcnow().isoformat() + "Z",
        }
        if password:
            user_data["debeCambiarContrasena"] = True
            
        db.collection("usuarios").document(target_id).set(user_data)
        return target_id


def eliminar_usuario(uid: str) -> None:
    """Elimina un usuario de la base de datos Firestore."""
    db.collection("usuarios").document(uid).delete()


def actualizar_estado_usuario(uid: str, deshabilitado: bool) -> None:
    """Habilita o deshabilita la cuenta de un usuario."""
    db.collection("usuarios").document(uid).update({"deshabilitado": deshabilitado})


