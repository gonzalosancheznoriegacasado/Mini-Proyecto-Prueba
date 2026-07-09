import uuid
import enum
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db.database import Base

class SplitType(str, enum.Enum):
    EQUAL = 'EQUAL'
    EXACT = 'EXACT'
    PERCENTAGE = 'PERCENTAGE'
    SHARES = 'SHARES'

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey('expenses.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('persons.id'), nullable=False)
    split_type = Column(Enum(SplitType, name="split_type_enum"), nullable=False)
    split_value = Column(Numeric(10, 2), nullable=True)
    calculated_amount = Column(Numeric(10, 2), nullable=False)

    user = relationship("Person")
    expense = relationship("Expense", back_populates="splits")

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
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")
