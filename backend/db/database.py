
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Utilizamos una URL por defecto para el desarrollo local, pero puede ser sobrescrita con variables de entorno
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://usuario_dev:password_dev@localhost:5432/mi_base_de_datos"
)

# Configuración del motor de conexión a PostgreSQL
engine = create_engine(DATABASE_URL)

# Fábrica de sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán nuestros modelos ORM
Base = declarative_base()
