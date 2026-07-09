import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime, timedelta

from backend.main import app
from backend.models.group import Group, GroupMember, RoleEnum
from backend.models.invitation import Invitation
from backend.api.deps import get_current_user

def test_generate_invitation_success(client, db, mock_group, mock_users):
    # mock_users[0] is already added as ADMIN by mock_group fixture

    
    # Sobreescribir el current user para que sea mock_users[0]
    app.dependency_overrides[get_current_user] = lambda: mock_users[0]
    
    response = client.post(f"/groups/{mock_group.id}/generate-invite")
    
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["group_id"] == str(mock_group.id)
    assert "expires_at" in data

def test_join_group_success(client, db, mock_group, mock_users):
    # mock_users[0] creó la invitación
    invitation = Invitation(
        id=uuid4(),
        group_id=mock_group.id,
        token="token_valido_123",
        created_by=mock_users[0].id,
        expires_at=datetime.utcnow() + timedelta(hours=2)
    )
    db.add(invitation)
    db.commit()

    # mock_users[1] se va a unir
    app.dependency_overrides[get_current_user] = lambda: mock_users[1]
    
    response = client.post(f"/groups/join/{invitation.token}")
    
    assert response.status_code == 200
    assert response.json() == {"message": "Te has unido al grupo exitosamente", "group_id": str(mock_group.id)}
    
    # Verificar en base de datos
    membership = db.query(GroupMember).filter_by(group_id=mock_group.id, person_id=mock_users[1].id).first()
    assert membership is not None
    assert membership.role == RoleEnum.MEMBER

def test_join_group_expired_token(client, db, mock_group, mock_users):
    # Crear invitación expirada
    invitation = Invitation(
        id=uuid4(),
        group_id=mock_group.id,
        token="token_expirado_456",
        created_by=mock_users[0].id,
        expires_at=datetime.utcnow() - timedelta(hours=1) # Expirado
    )
    db.add(invitation)
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: mock_users[1]
    
    response = client.post(f"/groups/join/{invitation.token}")
    
    assert response.status_code == 400
    assert response.json()["detail"] == "La invitación ha expirado"

def test_join_group_token_not_found(client, mock_users):
    app.dependency_overrides[get_current_user] = lambda: mock_users[1]
    response = client.post("/groups/join/token_inexistente_999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Invitación no encontrada"

def test_join_group_already_member(client, db, mock_group, mock_users):
    # mock_users[1] ya es miembro
    member = GroupMember(group_id=mock_group.id, person_id=mock_users[1].id, role=RoleEnum.MEMBER)
    db.add(member)
    db.commit()

    # Crear invitación válida
    invitation = Invitation(
        id=uuid4(),
        group_id=mock_group.id,
        token="token_valido_789",
        created_by=mock_users[0].id,
        expires_at=datetime.utcnow() + timedelta(hours=2)
    )
    db.add(invitation)
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: mock_users[1]
    
    response = client.post(f"/groups/join/{invitation.token}")
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Ya eres miembro de este grupo"
