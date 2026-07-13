from pydantic import BaseModel
from uuid import uuid4

class DummyObj:
    def __init__(self):
        self.id = uuid4()
        self.group_id = uuid4()
        self.name = "Test"
        self.color_hex = "#FFF"

class CategoryResponse1(BaseModel):
    id: str
    group_id: str
    name: str
    color_hex: str
    
    class Config:
        from_attributes = True

class CategoryResponse2(BaseModel):
    id: str
    group_id: str
    name: str
    color_hex: str
    
    model_config = {"from_attributes": True}

obj = DummyObj()

try:
    print("Trying 1...")
    res1 = CategoryResponse1.model_validate(obj)
    print("Success 1:", res1)
except Exception as e:
    print("Failed 1:", e)

try:
    print("Trying 2...")
    res2 = CategoryResponse2.model_validate(obj)
    print("Success 2:", res2)
except Exception as e:
    print("Failed 2:", e)
