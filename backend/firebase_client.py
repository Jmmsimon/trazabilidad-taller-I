import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Inicializar solo una vez
if not firebase_admin._apps:
    firebase_creds_env = os.environ.get("FIREBASE_CREDENTIALS")
    if firebase_creds_env:
        # Producción (Railway): credenciales como JSON en variable de entorno
        cred_dict = json.loads(firebase_creds_env)
        cred = credentials.Certificate(cred_dict)
    else:
        # Desarrollo local: leer archivo
        cred = credentials.Certificate(
            os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        )
    firebase_admin.initialize_app(cred)

db = firestore.client()
