from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from backend.models.group import Group, GroupMember, RoleEnum
from backend.models.expense import Expense
from backend.models.person import Person
from backend.models.invitation import Invitation
from backend.schemas.group import GroupCreate, GroupResponse, CategoryStatistic
from backend.schemas.invitation import InvitationResponse
from backend.api.deps import get_db, get_current_user
from backend.api.rbac import require_group_admin
import secrets
from datetime import datetime, timedelta

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

@router.post("/{group_id}/generate-invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def generate_invite(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    # Validar que el grupo existe
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    # Verificar que el usuario actual pertenece al grupo
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.person_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="No perteneces a este grupo")

    # Generar token y fecha de expiración (por defecto 48h)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=48)

    # Crear invitación
    new_invitation = Invitation(
        group_id=group_id,
        token=token,
        created_by=current_user.id,
        expires_at=expires_at
    )
    
    db.add(new_invitation)
    db.commit()
    db.refresh(new_invitation)

    return new_invitation

@router.post("/join/{token}", status_code=status.HTTP_200_OK)
def join_group(
    token: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    # Buscar el token en la base de datos
    invitation = db.query(Invitation).filter(Invitation.token == token).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
        
    # Verificar si el token ya expiró
    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="La invitación ha expirado")
        
    # Verificar si el usuario ya es miembro de ese grupo
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == invitation.group_id,
        GroupMember.person_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Ya eres miembro de este grupo")
        
    # Unir al usuario al grupo
    new_member = GroupMember(
        group_id=invitation.group_id,
        person_id=current_user.id,
        role=RoleEnum.MEMBER
    )
    
    db.add(new_member)
    db.commit()
    
    return {"message": "Te has unido al grupo exitosamente", "group_id": str(invitation.group_id)}
