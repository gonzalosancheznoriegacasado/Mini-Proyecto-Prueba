from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.api.deps import get_db, get_current_user
from backend.models.person import Person
from backend.schemas.balance import BalanceResponse
from backend.services.balance_service import calculate_balances

router = APIRouter()

@router.get("/", response_model=List[BalanceResponse])
def get_balances(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Calcula y devuelve las transferencias necesarias para liquidar las deudas del grupo.
    Devuelve la información procesada por nuestro motor interno de balances.
    """
    balances = calculate_balances(db)
    return balances
