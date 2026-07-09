import datetime
from backend.models.category import CustomCategory
from backend.models.expense import SplitType

def test_create_category_success(client, mock_group, mock_users, db):
    payload = {
        "name": "Cervezas",
        "color_hex": "#FF5733"
    }
    response = client.post(f"/groups/{mock_group.id}/categories", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cervezas"
    assert data["color_hex"] == "#FF5733"
    assert data["group_id"] == str(mock_group.id)
    assert "id" in data

def test_get_categories_success(client, mock_group, mock_users, db):
    # First, create a category
    category = CustomCategory(
        group_id=mock_group.id,
        name="Museo",
        color_hex="#112233"
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    
    response = client.get(f"/groups/{mock_group.id}/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(c["id"] == str(category.id) for c in data)
