from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Any, Dict
from backend.models.audit_log import AuditAction, EntityType

class AuditLogResponse(BaseModel):
    id: UUID
    group_id: UUID
    action: AuditAction
    entity_type: EntityType
    entity_id: str
    performed_by: UUID
    timestamp: datetime
    details: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)
