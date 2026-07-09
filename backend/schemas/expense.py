from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import List
from backend.schemas.person import PersonResponse
from backend.models.expense import SplitType

class ExpenseSplitCreate(BaseModel):
    user_id: UUID
    split_type: SplitType
    split_value: float = 0.0

class ExpenseSplitResponse(BaseModel):
    user_id: UUID
    split_type: SplitType
    split_value: float
    calculated_amount: float
    
    model_config = ConfigDict(from_attributes=True)

class ExpenseCreate(BaseModel):
    group_id: UUID
    description: str
    amount: float
    category: str
    payer_id: UUID
    date: datetime
    splits: List[ExpenseSplitCreate]

class ExpenseResponse(BaseModel):
    id: UUID
    group_id: UUID
    description: str
    amount: float
    category: str
    payer_id: UUID
    date: datetime
    splits: List[ExpenseSplitResponse] = Field(default_factory=list)
    payer: PersonResponse

    model_config = ConfigDict(from_attributes=True)

class PaginatedExpenseResponse(BaseModel):
    data: List[ExpenseResponse]
    total: int
    limit: int
    offset: int
