from fastapi import Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from uuid import UUID

from backend.api.deps import get_db, get_current_user
from backend.models.group import GroupMember, RoleEnum
from backend.models.expense import Expense
from backend.models.person import Person

def require_group_member(
    group_id: UUID, 
    current_user: Person = Depends(get_current_user), 
    db: Session = Depends(get_db)
) -> GroupMember:
    """Verifica que el usuario pertenece al grupo y devuelve la relación."""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.person_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para realizar esta acción"
        )
    return member

def require_group_admin(
    member: GroupMember = Depends(require_group_member)
) -> GroupMember:
    """Verifica que el usuario sea administrador del grupo."""
    if member.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para realizar esta acción"
        )
    return member

def require_expense_owner_or_admin(
    expense_id: UUID = Path(...),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Expense:
    """
    Verifica que el usuario tenga permisos sobre el gasto.
    Requiere ser ADMIN del grupo o el creador/pagador (payer_id) del gasto.
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gasto no encontrado")
        
    member = db.query(GroupMember).filter(
        GroupMember.group_id == expense.group_id,
        GroupMember.person_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para realizar esta acción"
        )
        
    if member.role != RoleEnum.ADMIN and expense.payer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para realizar esta acción"
        )
        
    return expense
