from typing import Generator
from backend.db.database import SessionLocal

def get_db() -> Generator:
    """
    Dependencia de FastAPI para obtener una sesión de la base de datos
    y cerrarla de forma segura una vez procesada la petición.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
