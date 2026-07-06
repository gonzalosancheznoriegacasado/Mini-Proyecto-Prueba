import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db.database import Base

expense_participants = Table(
    'expense_participants',
    Base.metadata,
    Column('expense_id', UUID(as_uuid=True), ForeignKey('expenses.id'), primary_key=True),
    Column('person_id', UUID(as_uuid=True), ForeignKey('persons.id'), primary_key=True)
)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String, nullable=False)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    date = Column(DateTime, nullable=False)

    # Relación para acceder a la persona que pagó el gasto
    payer = relationship("Person", back_populates="expenses")
    
    # Relación hacia el grupo
    group = relationship("Group", back_populates="expenses")

    # Relación a las personas que participan en el gasto
    participants = relationship("Person", secondary=expense_participants, backref="shared_expenses")
