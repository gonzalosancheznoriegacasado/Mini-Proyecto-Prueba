import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db.database import Base

group_members = Table(
    'group_members',
    Base.metadata,
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id'), primary_key=True),
    Column('person_id', UUID(as_uuid=True), ForeignKey('persons.id'), primary_key=True)
)

class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # El creador del grupo
    creator = relationship("Person", foreign_keys=[created_by])
    
    # Miembros del grupo
    members = relationship("Person", secondary=group_members, backref="joined_groups")

    # Gastos asociados a este grupo
    expenses = relationship("Expense", back_populates="group")
