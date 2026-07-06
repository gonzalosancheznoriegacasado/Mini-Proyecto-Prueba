from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class GroupCreate(BaseModel):
    name: str

class GroupResponse(BaseModel):
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CategoryStatistic(BaseModel):
    category: str
    total_amount: float
