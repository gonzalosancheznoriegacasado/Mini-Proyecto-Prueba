from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import List
from backend.schemas.person import PersonResponse

class ExpenseCreate(BaseModel):
    group_id: UUID
    description: str
    amount: float
    category: str
    payer_id: UUID
    date: datetime
    participants_ids: List[UUID]

class ExpenseResponse(BaseModel):
    id: UUID
    group_id: UUID
    description: str
    amount: float
    category: str
    payer_id: UUID
    date: datetime
    participants_ids: List[UUID] = Field(default_factory=list)
    payer: PersonResponse

    model_config = ConfigDict(from_attributes=True)

    # Convert the list of participant objects to a list of UUIDs
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        # We need to extract participants_ids from the ORM object if it exists
        if hasattr(obj, "participants") and obj.participants is not None:
            obj.participants_ids = [p.id for p in obj.participants]
        return super().model_validate(obj, *args, **kwargs)

class PaginatedExpenseResponse(BaseModel):
    data: List[ExpenseResponse]
    total: int
    limit: int
    offset: int
