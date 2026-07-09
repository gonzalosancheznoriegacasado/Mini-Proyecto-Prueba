from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from backend.api.deps import get_db, get_current_user
from backend.api.rbac import require_group_member
from backend.models.audit_log import AuditLog
from backend.models.group import GroupMember
from backend.schemas.audit_log import AuditLogResponse
from backend.models.person import Person

router = APIRouter()

@router.get("/{group_id}/audit-logs", response_model=List[AuditLogResponse])
def get_group_audit_logs(
    group_id: UUID,
    member: GroupMember = Depends(require_group_member),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Devuelve el historial de cambios (audit logs) de un grupo ordenado del más reciente al más antiguo.
    Solo accesible por miembros (MEMBER o ADMIN) del grupo.
    """
    logs = db.query(AuditLog).filter(
        AuditLog.group_id == group_id
    ).order_by(
        AuditLog.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    return logs
