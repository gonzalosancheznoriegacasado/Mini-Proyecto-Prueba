from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List, Optional
from uuid import UUID

from backend.models.expense import Expense
from backend.models.group import GroupMember
from backend.models.person import Person
from backend.schemas.expense import ExpenseCreate, ExpenseResponse, PaginatedExpenseResponse
from backend.api.deps import get_db, get_current_user
from backend.api.rbac import require_group_member, require_expense_owner_or_admin
from backend.services.expense_service import calculate_splits

router = APIRouter()

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate, 
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Registra un nuevo gasto.
    """
    # Verificar membresía al grupo
    member = db.query(GroupMember).filter(
        GroupMember.group_id == expense_in.group_id,
        GroupMember.person_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")

    new_expense = Expense(
        group_id=expense_in.group_id,
        description=expense_in.description,
        amount=expense_in.amount,
        category=expense_in.category,
        payer_id=expense_in.payer_id,
        date=expense_in.date
    )
    
    # Calcular y validar los splits
    splits = calculate_splits(expense_in.amount, expense_in.splits)
    new_expense.splits = splits

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense: Expense = Depends(require_expense_owner_or_admin),
    db: Session = Depends(get_db)
):
    """
    Solo el dueño del gasto o un ADMIN del grupo pueden eliminarlo.
    """
    db.delete(expense)
    db.commit()
    return

@router.get("/", response_model=PaginatedExpenseResponse)
def get_expenses(
    group_id: Optional[UUID] = None,
    payer_id: Optional[UUID] = None,
    category: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Devuelve la lista de gastos aplicando filtros opcionales y paginación.
    """
    query = db.query(Expense)
    
    if group_id:
        query = query.filter(Expense.group_id == group_id)
    if payer_id:
        query = query.filter(Expense.payer_id == payer_id)
    if category:
        query = query.filter(Expense.category == category)
        
    total = query.count()
    
    # Usamos joinedload para cargar ansiosamente los datos del payer (Person) y los splits
    expenses = query.options(
        joinedload(Expense.payer),
        joinedload(Expense.splits)
    ).offset(offset).limit(limit).all()
    
    return {
        "data": expenses,
        "total": total,
        "limit": limit,
        "offset": offset
    }
