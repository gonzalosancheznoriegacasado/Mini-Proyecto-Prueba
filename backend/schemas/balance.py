from pydantic import BaseModel
from uuid import UUID

class BalanceResponse(BaseModel):
    debtor_id: UUID
    creditor_id: UUID
    amount: float
