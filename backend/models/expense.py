import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"), nullable=False)
    date = Column(DateTime, nullable=False)

    # Relación para acceder a la persona que pagó el gasto
    payer = relationship("Person", back_populates="expenses")
