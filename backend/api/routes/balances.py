from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from backend.api.deps import get_db, get_current_user
from backend.models.person import Person
from backend.schemas.balance import BalanceResponse
from backend.services.balance_service import calculate_balances

router = APIRouter()

@router.get("/{group_id}/balances", response_model=List[BalanceResponse])
def get_balances(
    group_id: UUID,
    optimize: bool = Query(False, description="Optimizar deudas para minimizar transacciones (algoritmo Greedy)"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Calcula y devuelve las transferencias necesarias para liquidar las deudas del grupo.
    Devuelve la información procesada por nuestro motor interno de balances.
    """
    balances = calculate_balances(db, group_id, optimize=optimize)
    # The schemas expect group_id to be populated. The calculate_balances service 
    # will add it to the dictionaries.
    return balances
