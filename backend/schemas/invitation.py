from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class InvitationResponse(BaseModel):
    id: UUID
    group_id: UUID
    token: str
    created_by: UUID
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)
