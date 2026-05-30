import os
import sys

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from firebase_client import db

def clear_proyectos():
    print("Iniciando eliminación de todos los proyectos en Firestore...")
    proyectos_ref = db.collection("proyectos")
    docs = list(proyectos_ref.stream())
    
    if not docs:
        print("No se encontraron proyectos para eliminar.")
        return
        
    print(f"Se encontraron {len(docs)} proyectos.")
    
    for doc in docs:
        project_id = doc.id
        print(f"Eliminando proyecto: {project_id}...")
        
        # Primero eliminar los sub-documentos de la sub-colección "chat"
        chat_ref = proyectos_ref.document(project_id).collection("chat")
        chat_docs = list(chat_ref.stream())
        if chat_docs:
            print(f"  -> Eliminando {len(chat_docs)} mensajes de chat...")
            for chat_doc in chat_docs:
                chat_doc.reference.delete()
        
        # Eliminar el documento de proyecto principal
        doc.reference.delete()
        print(f"  -> Proyecto {project_id} eliminado exitosamente.")
        
    print("¡Todos los proyectos han sido eliminados de Firestore!")

if __name__ == "__main__":
    clear_proyectos()
