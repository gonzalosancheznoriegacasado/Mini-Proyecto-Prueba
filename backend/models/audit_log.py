import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from backend.db.database import Base

class AuditAction(str, enum.Enum):
    CREATE = 'CREATE'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'

class EntityType(str, enum.Enum):
    EXPENSE = 'EXPENSE'
    GROUP_MEMBER = 'GROUP_MEMBER'
    CATEGORY = 'CATEGORY'

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    action = Column(Enum(AuditAction, name="audit_action_enum"), nullable=False)
    entity_type = Column(Enum(EntityType, name="entity_type_enum"), nullable=False)
    entity_id = Column(String, nullable=False)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    details = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False)
