import firebase_admin
from firebase_admin import credentials, firestore
import os

# Inicializar solo una vez
if not firebase_admin._apps:
    cred = credentials.Certificate(
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    )
    firebase_admin.initialize_app(cred)

db = firestore.client()
