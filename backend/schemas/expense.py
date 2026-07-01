from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from backend.schemas.person import PersonResponse

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    payer_id: UUID
    date: datetime

class ExpenseResponse(BaseModel):
    id: UUID
    description: str
    amount: float
    payer_id: UUID
    date: datetime
    payer: PersonResponse

    model_config = ConfigDict(from_attributes=True)
