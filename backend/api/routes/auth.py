from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.api.deps import get_db
from backend.core import security
from backend.models.person import Person
from backend.schemas.person import PersonCreate
from backend.schemas.auth import LoginRequest, TokenResponse

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Inicia sesión con email y contraseña, devolviendo el JWT token.
    """
    user = db.query(Person).filter(Person.email == login_data.email).first()
    if not user or not security.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    return {"token": access_token, "user": user}

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: PersonCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con email y contraseña.
    Devuelve también el token y el usuario creado para mayor comodidad.
    """
    # Verificar que el email no exista
    existing_user = db.query(Person).filter(Person.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    new_user = Person(
        name=user_in.name,
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=new_user.email, expires_delta=access_token_expires
    )
    return {"token": access_token, "user": new_user}
