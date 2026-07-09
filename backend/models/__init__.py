from backend.db.database import Base
from backend.models.person import Person
from backend.models.expense import Expense
from backend.models.group import Group
from backend.models.invitation import Invitation

# Importamos todos los modelos y la base aquí para que Alembic pueda descubrirlos fácilmente
__all__ = ["Base", "Person", "Expense", "Group", "Invitation"]