from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from backend.db.database import SessionLocal
from backend.models.person import Person
from backend.core import security
from backend.schemas.auth import TokenData

def get_db() -> Generator:
    """
    Dependencia de FastAPI para obtener una sesión de la base de datos
    y cerrarla de forma segura una vez procesada la petición.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> Person:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(Person).filter(Person.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user
