from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List, Optional, Any, Dict
from uuid import UUID
import uuid

from backend.models.expense import Expense, ExpenseSplit
from backend.models.group import GroupMember
from backend.models.person import Person
from backend.models.category import CustomCategory
from backend.models.audit_log import AuditLog, AuditAction, EntityType
from backend.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, PaginatedExpenseResponse
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

    # Validate category
    try:
        category_uuid = uuid.UUID(expense_in.category_id)
        # It's a UUID, check if it exists in CustomCategory
        custom_category = db.query(CustomCategory).filter(CustomCategory.id == category_uuid).first()
        if custom_category:
            if custom_category.group_id != expense_in.group_id:
                raise HTTPException(status_code=400, detail="La categoría no pertenece a este grupo")
    except ValueError:
        # Not a UUID, assume global category, allow it
        pass

    new_expense = Expense(
        group_id=expense_in.group_id,
        description=expense_in.description,
        amount=expense_in.amount,
        category_id=expense_in.category_id,
        payer_id=expense_in.payer_id,
        date=expense_in.date
    )
    
    # Calcular y validar los splits
    splits = calculate_splits(expense_in.amount, expense_in.splits)
    new_expense.splits = splits

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    new_data = {
        "description": new_expense.description,
        "amount": float(new_expense.amount),
        "category_id": new_expense.category_id,
        "payer_id": str(new_expense.payer_id),
        "date": str(new_expense.date),
        "splits": [
            {"user_id": str(s.user_id), "split_type": s.split_type.value, "split_value": float(s.split_value) if s.split_value else 0.0, "calculated_amount": float(s.calculated_amount)}
            for s in new_expense.splits
        ]
    }

    audit_log = AuditLog(
        group_id=new_expense.group_id,
        action=AuditAction.CREATE,
        entity_type=EntityType.EXPENSE,
        entity_id=str(new_expense.id),
        performed_by=current_user.id,
        details={"new_value": new_data}
    )
    db.add(audit_log)
    db.commit()

    return new_expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_in: ExpenseUpdate,
    expense_id: UUID,
    expense: Expense = Depends(require_expense_owner_or_admin),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza un gasto existente y registra el cambio en el AuditLog.
    """
    changes: Dict[str, Dict[str, Any]] = {}
    
    # Update primitive fields
    fields_to_check = ['description', 'amount', 'category_id', 'payer_id', 'date']
    for field in fields_to_check:
        new_val = getattr(expense_in, field)
        if new_val is not None:
            old_val = getattr(expense, field)
            if old_val != new_val:
                changes[field] = {
                    "old_value": str(old_val) if field == 'date' else float(old_val) if field == 'amount' else str(old_val) if isinstance(old_val, UUID) else old_val,
                    "new_value": str(new_val) if field == 'date' else float(new_val) if field == 'amount' else str(new_val) if isinstance(new_val, UUID) else new_val
                }
                setattr(expense, field, new_val)
                
    # Re-validate category if changed
    if 'category_id' in changes:
        try:
            category_uuid = uuid.UUID(expense.category_id)
            custom_category = db.query(CustomCategory).filter(CustomCategory.id == category_uuid).first()
            if custom_category and custom_category.group_id != expense.group_id:
                raise HTTPException(status_code=400, detail="La categoría no pertenece a este grupo")
        except ValueError:
            pass
            
    # Update splits if provided
    if expense_in.splits is not None:
        old_splits_dump = [
            {"user_id": str(s.user_id), "split_type": s.split_type.value, "split_value": float(s.split_value) if s.split_value else 0.0, "calculated_amount": float(s.calculated_amount)}
            for s in expense.splits
        ]
        
        # recalculate
        new_amount = expense.amount
        new_splits = calculate_splits(new_amount, expense_in.splits)
        
        # apply new splits
        db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()
        expense.splits = new_splits
        
        new_splits_dump = [
            {"user_id": str(s.user_id), "split_type": s.split_type.value, "split_value": float(s.split_value) if s.split_value else 0.0, "calculated_amount": float(s.calculated_amount)}
            for s in new_splits
        ]
        
        changes['splits'] = {
            "old_value": old_splits_dump,
            "new_value": new_splits_dump
        }

    if changes:
        audit_log = AuditLog(
            group_id=expense.group_id,
            action=AuditAction.UPDATE,
            entity_type=EntityType.EXPENSE,
            entity_id=str(expense.id),
            performed_by=current_user.id,
            details=changes
        )
        db.add(audit_log)
        db.commit()
        db.refresh(expense)

    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense: Expense = Depends(require_expense_owner_or_admin),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Solo el dueño del gasto o un ADMIN del grupo pueden eliminarlo.
    Registra la eliminación en el AuditLog.
    """
    old_data = {
        "description": expense.description,
        "amount": float(expense.amount) if expense.amount is not None else 0.0,
        "category_id": expense.category_id,
        "payer_id": str(expense.payer_id),
        "date": str(expense.date),
        "splits": [
            {"user_id": str(s.user_id), "split_type": s.split_type.value, "split_value": float(s.split_value) if s.split_value else 0.0, "calculated_amount": float(s.calculated_amount)}
            for s in expense.splits
        ]
    }
    
    audit_log = AuditLog(
        group_id=expense.group_id,
        action=AuditAction.DELETE,
        entity_type=EntityType.EXPENSE,
        entity_id=str(expense.id),
        performed_by=current_user.id,
        details={"old_value": old_data, "new_value": None}
    )
    
    db.add(audit_log)
    db.delete(expense)
    db.commit()
    return

@router.get("/", response_model=PaginatedExpenseResponse)
def get_expenses(
    group_id: Optional[UUID] = None,
    payer_id: Optional[UUID] = None,
    category_id: Optional[str] = None,
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
    if category_id:
        query = query.filter(Expense.category_id == category_id)
        
    total = query.count()
    
    # Usamos joinedload para cargar ansiosamente los datos del payer (Person) y los splits
    expenses = query.options(
        joinedload(Expense.payer),
        joinedload(Expense.splits).joinedload(ExpenseSplit.user)
    ).offset(offset).limit(limit).all()
    
    return {
        "data": expenses,
        "total": total,
        "limit": limit,
        "offset": offset
    }
