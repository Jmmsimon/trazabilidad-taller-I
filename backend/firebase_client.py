import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    # En producción (Railway) las credenciales vienen como variable de entorno JSON
    firebase_creds_env = os.environ.get("FIREBASE_CREDENTIALS")

    if firebase_creds_env:
        # Variable de entorno con el JSON completo del serviceAccountKey
        cred_dict = json.loads(firebase_creds_env)
        cred = credentials.Certificate(cred_dict)
    else:
        # Desarrollo local: lee el archivo
        cred = credentials.Certificate(
            os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        )

    firebase_admin.initialize_app(cred)

db = firestore.client()