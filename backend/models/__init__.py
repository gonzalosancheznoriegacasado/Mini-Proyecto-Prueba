from backend.db.database import Base
from backend.models.person import Person
from backend.models.expense import Expense, ExpenseSplit
from backend.models.group import Group, GroupMember
from backend.models.invitation import Invitation
from backend.models.category import CustomCategory
from backend.models.audit_log import AuditLog, AuditAction, EntityType

# Importamos todos los modelos y la base aquí para que Alembic pueda descubrirlos fácilmente
__all__ = ["Base", "Person", "Expense", "ExpenseSplit", "Group", "GroupMember", "Invitation", "CustomCategory", "AuditLog", "AuditAction", "EntityType"]