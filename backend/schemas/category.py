from pydantic import BaseModel, Field
from uuid import UUID

class CategoryCreate(BaseModel):
    name: str = Field(..., description="Name of the category", example="Cervezas")
    color_hex: str = Field(..., description="Color of the category in HEX", example="#FF5733")

class CategoryResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    color_hex: str

    class Config:
        from_attributes = True
