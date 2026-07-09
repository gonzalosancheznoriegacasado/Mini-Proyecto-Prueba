import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.db.database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"

class GroupMember(Base):
    __tablename__ = 'group_members'
    
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey('persons.id', ondelete='CASCADE'), primary_key=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.MEMBER, nullable=False)
    joined_at = Column(DateTime, server_default=func.now())
class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # El creador del grupo
    creator = relationship("Person", foreign_keys=[created_by])
    
    # Miembros del grupo
    members = relationship("Person", secondary="group_members", backref="joined_groups")

    # Gastos asociados a este grupo
    expenses = relationship("Expense", back_populates="group")
