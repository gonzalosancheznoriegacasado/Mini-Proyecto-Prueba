from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from backend.models.group import Group
from backend.models.expense import Expense
from backend.models.person import Person
from backend.schemas.group import GroupCreate, GroupResponse, CategoryStatistic
from backend.api.deps import get_db, get_current_user

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
    # Automatically add creator to members
    new_group.members.append(current_user)
    
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group

@router.get("/", response_model=List[GroupResponse])
def get_groups(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    # Devuelve solo los grupos a los que pertenece el usuario
    return current_user.joined_groups

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
