import datetime
from backend.models.expense import SplitType

def test_create_expense_exact_success(client, mock_group, mock_users):
    """
    Test de Éxito - Reparto EXACT: 
    Verificar que si el gasto es de 100 y dos usuarios tienen un split_value de 40 y 60 con tipo EXACT, 
    el endpoint devuelve 201 Created.
    """
    payload = {
        "group_id": str(mock_group.id),
        "description": "Cena",
        "amount": 100.0,
        "category_id": "general",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.EXACT.value,
                "split_value": 40.0
            },
            {
                "user_id": str(mock_users[1].id),
                "split_type": SplitType.EXACT.value,
                "split_value": 60.0
            }
        ]
    }
    
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 100.0
    splits = data["splits"]
    assert len(splits) == 2
    # El calculated amount debe ser igual al split_value exacto
    assert any(s["user_id"] == str(mock_users[0].id) and s["calculated_amount"] == 40.0 for s in splits)
    assert any(s["user_id"] == str(mock_users[1].id) and s["calculated_amount"] == 60.0 for s in splits)

def test_create_expense_percentage_success(client, mock_group, mock_users):
    """
    Test de Éxito - Reparto PERCENTAGE: 
    Verificar que si el gasto es de 200 y dos usuarios tienen 25% y 75%, 
    el backend calcula correctamente 50 y 150, devolviendo 201.
    """
    payload = {
        "group_id": str(mock_group.id),
        "description": "Viaje",
        "amount": 200.0,
        "category_id": "travel",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.PERCENTAGE.value,
                "split_value": 25.0
            },
            {
                "user_id": str(mock_users[1].id),
                "split_type": SplitType.PERCENTAGE.value,
                "split_value": 75.0
            }
        ]
    }
    
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 201
    splits = response.json()["splits"]
    assert any(s["user_id"] == str(mock_users[0].id) and s["calculated_amount"] == 50.0 for s in splits)
    assert any(s["user_id"] == str(mock_users[1].id) and s["calculated_amount"] == 150.0 for s in splits)

def test_create_expense_shares_success(client, mock_group, mock_users):
    """
    Test de Éxito - Reparto SHARES: 
    Verificar que si el gasto es de 150 y las partes son 1 y 2 (total 3 partes), 
    el backend calcula 50 y 100 correctamente.
    """
    payload = {
        "group_id": str(mock_group.id),
        "description": "Hotel",
        "amount": 150.0,
        "category_id": "accommodation",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.SHARES.value,
                "split_value": 1.0
            },
            {
                "user_id": str(mock_users[1].id),
                "split_type": SplitType.SHARES.value,
                "split_value": 2.0
            }
        ]
    }
    
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 201
    splits = response.json()["splits"]
    assert any(s["user_id"] == str(mock_users[0].id) and s["calculated_amount"] == 50.0 for s in splits)
    assert any(s["user_id"] == str(mock_users[1].id) and s["calculated_amount"] == 100.0 for s in splits)

def test_create_expense_equal_rounding_error(client, mock_group, mock_users):
    """
    Test de Manejo de Redondeo (Centavo Sobrante): 
    Si el gasto es de 10.00 y se divide de forma EQUAL entre 3 personas, 
    verificar que el backend asigna 3.34 a uno y 3.33 a los otros dos, devolviendo 201.
    """
    payload = {
        "group_id": str(mock_group.id),
        "description": "Cervezas",
        "amount": 10.0,
        "category_id": "drinks",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.EQUAL.value,
                "split_value": 0.0 # No importa el valor para EQUAL
            },
            {
                "user_id": str(mock_users[1].id),
                "split_type": SplitType.EQUAL.value,
                "split_value": 0.0
            },
            {
                "user_id": str(mock_users[2].id),
                "split_type": SplitType.EQUAL.value,
                "split_value": 0.0
            }
        ]
    }
    
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 201
    splits = response.json()["splits"]
    amounts = sorted([s["calculated_amount"] for s in splits])
    # Como el sobrante (+0.01) se aplica al primer elemento (no necesariamente el primero en la lista después, pero uno lo recibe)
    assert amounts == [3.33, 3.33, 3.34]

def test_create_expense_exact_fail_400(client, mock_group, mock_users):
    """
    Test de Fallo - Error 400 (Bad Request): 
    Enviar un payload donde las cantidades exactas (EXACT) suman 99 
    en lugar de los 100 que marca el amount total del gasto. 
    Verificar que el sistema bloquea la transacción y devuelve un error HTTP 400.
    """
    payload = {
        "group_id": str(mock_group.id),
        "description": "Compra",
        "amount": 100.0,
        "category_id": "groceries",
        "payer_id": str(mock_users[0].id),
        "date": datetime.datetime.now().isoformat(),
        "splits": [
            {
                "user_id": str(mock_users[0].id),
                "split_type": SplitType.EXACT.value,
                "split_value": 40.0
            },
            {
                "user_id": str(mock_users[1].id),
                "split_type": SplitType.EXACT.value,
                "split_value": 59.0 # Suma = 99 != 100
            }
        ]
    }
    
    response = client.post("/expenses/", json=payload)
    assert response.status_code == 400
    assert "Sum of splits" in response.json()["detail"]
    assert "does not match total amount" in response.json()["detail"]

def test_create_expense_custom_category_success(client, mock_group, mock_users, db):
    # Create custom category
    from backend.models.category import CustomCategory
    category = CustomCategory(
        group_id=mock_group.id,
        name="Museo",
        color_hex="#112233"
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    payload = {
        "group_id": str(mock_group.id),
        "description": "Entradas Museo",
        "amount": 50.0,
        "category_id": str(category.id),
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
    data = response.json()
    assert data["category_id"] == str(category.id)

def test_create_expense_custom_category_fail(client, mock_group, mock_users, db):
    # Create another group and category
    from backend.models.group import Group
    from backend.models.category import CustomCategory
    other_group = Group(name="Other Group", created_by=mock_users[0].id)
    db.add(other_group)
    db.commit()
    db.refresh(other_group)

    category = CustomCategory(
        group_id=other_group.id,
        name="Museo",
        color_hex="#112233"
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    payload = {
        "group_id": str(mock_group.id), # Trying to create in mock_group
        "description": "Entradas",
        "amount": 50.0,
        "category_id": str(category.id), # But category is from other_group
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
    assert response.status_code == 400
    assert "La categoría no pertenece a este grupo" in response.json()["detail"]
