import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db.database import Base

class CustomCategory(Base):
    __tablename__ = "custom_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    color_hex = Column(String, nullable=False)

    group = relationship("Group")
