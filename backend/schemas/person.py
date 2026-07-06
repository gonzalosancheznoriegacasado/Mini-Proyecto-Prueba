from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class PersonCreate(BaseModel):
    name: str
    email: str
    password: str

class PersonResponse(BaseModel):
    id: UUID
    name: str
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
