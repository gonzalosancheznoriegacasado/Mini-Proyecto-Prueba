import datetime
from backend.models.expense import SplitType
from backend.models.audit_log import AuditLog, AuditAction, EntityType

def test_audit_log_on_update(client, mock_group, mock_users, db):
    """
    Test - Registro en UPDATE: 
    Verifica que al hacer una petición PUT a un gasto, se crea automáticamente un registro en audit_logs 
    con la acción UPDATE y el JSON contiene los valores viejos y nuevos.
    """
    # 1. Crear un gasto primero
    payload = {
        "group_id": str(mock_group.id),
        "description": "Cena Original",
        "amount": 100.0,
        "category_id": "general",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.EQUAL.value,
                "split_value": 0.0
            }
        ]
    }
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 201
    expense_id = response.json()["id"]
    
    # 2. Actualizar el gasto
    update_payload = {
        "description": "Cena Modificada",
        "amount": 150.0,
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.EQUAL.value,
                "split_value": 0.0
            }
        ]
    }
    
    response = client.put(f"/expenses/{expense_id}", json=update_payload)
    assert response.status_code == 200
    
    # 3. Verificar que se creó el audit log
    logs = db.query(AuditLog).filter(AuditLog.entity_id == expense_id).all()
    assert len(logs) == 1
    log = logs[0]
    
    assert log.action == AuditAction.UPDATE
    assert log.entity_type == EntityType.EXPENSE
    assert str(log.performed_by) == str(mock_users[0].id)
    assert "description" in log.details
    assert log.details["description"]["old_value"] == "Cena Original"
    assert log.details["description"]["new_value"] == "Cena Modificada"
    assert "amount" in log.details
    assert log.details["amount"]["old_value"] == 100.0
    assert log.details["amount"]["new_value"] == 150.0

def test_audit_log_on_delete(client, mock_group, mock_users, db):
    """
    Test - Registro en DELETE: 
    Verifica que al hacer un DELETE de un gasto, se guarda un registro en audit_logs 
    con la acción DELETE.
    """
    # 1. Crear un gasto
    payload = {
        "group_id": str(mock_group.id),
        "description": "Gasto a Borrar",
        "amount": 50.0,
        "category_id": "general",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.EQUAL.value,
                "split_value": 0.0
            }
        ]
    }
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 201
    expense_id = response.json()["id"]
    
    # 2. Eliminar el gasto
    response = client.delete(f"/expenses/{expense_id}")
    assert response.status_code == 204
    
    # 3. Verificar que se creó el audit log de DELETE
    logs = db.query(AuditLog).filter(AuditLog.entity_id == expense_id, AuditLog.action == AuditAction.DELETE).all()
    assert len(logs) == 1
    log = logs[0]
    
    assert log.action == AuditAction.DELETE
    assert log.entity_type == EntityType.EXPENSE
    assert log.details["old_value"]["description"] == "Gasto a Borrar"
    assert log.details["old_value"]["amount"] == 50.0
    assert log.details["new_value"] is None

def test_read_audit_logs(client, mock_group, mock_users, db):
    """
    Test - Lectura de Logs: 
    Verifica que el endpoint GET devuelve la lista de logs correctamente para los miembros del grupo
    y lanza un 403 para usuarios externos.
    """
    # Crear un registro manual para probar la lectura
    log = AuditLog(
        group_id=mock_group.id,
        action=AuditAction.UPDATE,
        entity_type=EntityType.EXPENSE,
        entity_id="test-id",
        performed_by=mock_users[0].id,
        details={"test": "data"}
    )
    db.add(log)
    db.commit()
    
    # Leer como miembro (mock_users[0] es miembro por los fixtures)
    response = client.get(f"/groups/{mock_group.id}/audit-logs")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["action"] == "UPDATE"
    assert data[0]["entity_type"] == "EXPENSE"
    
    # Intentar leer sin autenticación no está permitido por el framework de tests, 
    # asumiendo que el cliente por defecto autentica como mock_users[0].
    # Para probar el 403 con otro usuario, tendríamos que cambiar el usuario actual o crear un mock_user[3] que no esté en el grupo.
    # Como tenemos mock_users[0], 1, 2 que son miembros (probablemente), creamos un nuevo usuario no miembro.
    
    from backend.models.person import Person
    from backend.api.deps import get_current_user
    from backend.main import app
    
    non_member = Person(name="Intruso", email="intruso@test.com", password_hash="123")
    db.add(non_member)
    db.commit()
    db.refresh(non_member)
    
    app.dependency_overrides[get_current_user] = lambda: non_member
    
    response_403 = client.get(f"/groups/{mock_group.id}/audit-logs")
    assert response_403.status_code == 403
    
    # Reset dependency override
    app.dependency_overrides.pop(get_current_user, None)
