import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db.database import Base

class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relación uno-a-muchos: una persona puede pagar múltiples gastos
    expenses = relationship("Expense", back_populates="payer")
