from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from backend.models.group import Group, GroupMember, RoleEnum
from backend.models.expense import Expense
from backend.models.person import Person
from backend.schemas.group import GroupCreate, GroupResponse, CategoryStatistic
from backend.api.deps import get_db, get_current_user
from backend.api.rbac import require_group_admin

router = APIRouter()

@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate, 
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    new_group = Group(
        name=group_in.name,
        created_by=current_user.id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Automatically add creator as ADMIN
    member = GroupMember(
        group_id=new_group.id,
        person_id=current_user.id,
        role=RoleEnum.ADMIN
    )
    db.add(member)
    db.commit()
    
    return new_group

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    admin_member: GroupMember = Depends(require_group_admin),
    db: Session = Depends(get_db)
):
    """Solo los administradores pueden borrar el grupo."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    db.delete(group)
    db.commit()
    return

@router.get("/", response_model=List[GroupResponse])
def get_groups(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    # Retrieve groups using GroupMember
    memberships = db.query(GroupMember).filter(GroupMember.person_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    return groups

@router.get("/{group_id}/statistics", response_model=List[CategoryStatistic])
def get_group_statistics(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Devuelve las estadísticas de gastos por categoría para un grupo específico.
    """
    stats = db.query(
        Expense.category,
        func.sum(Expense.amount).label("total_amount")
    ).filter(Expense.group_id == group_id).group_by(Expense.category).all()
    
    return [{"category": stat.category, "total_amount": stat.total_amount} for stat in stats]
