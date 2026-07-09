from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from backend.models.group import RoleEnum

class GroupMemberBase(BaseModel):
    group_id: UUID
    person_id: UUID
    role: RoleEnum

class GroupMemberCreate(GroupMemberBase):
    pass

class GroupMemberResponse(GroupMemberBase):
    joined_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
