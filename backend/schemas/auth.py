from pydantic import BaseModel
from backend.schemas.person import PersonResponse

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user: PersonResponse

class TokenData(BaseModel):
    email: str | None = None
