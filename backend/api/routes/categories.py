from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from backend.models.category import CustomCategory
from backend.models.group import GroupMember
from backend.models.person import Person
from backend.schemas.category import CategoryCreate, CategoryResponse
from backend.api.deps import get_db, get_current_user

router = APIRouter()

@router.post("/groups/{group_id}/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    group_id: UUID,
    category_in: CategoryCreate, 
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    # Verify user is member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.person_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")

    new_category = CustomCategory(
        group_id=group_id,
        name=category_in.name,
        color_hex=category_in.color_hex
    )
    
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    from backend.models.audit_log import AuditLog, AuditAction, EntityType
    audit_log = AuditLog(
        group_id=group_id,
        action=AuditAction.CREATE,
        entity_type=EntityType.CATEGORY,
        entity_id=str(new_category.id),
        performed_by=current_user.id,
        details={"name": new_category.name, "color_hex": new_category.color_hex}
    )
    db.add(audit_log)
    db.commit()
    
    return new_category

@router.get("/groups/{group_id}/categories", response_model=List[CategoryResponse])
def get_categories(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    # Verify user is member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.person_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")

    categories = db.query(CustomCategory).filter(CustomCategory.group_id == group_id).all()
    return categories
