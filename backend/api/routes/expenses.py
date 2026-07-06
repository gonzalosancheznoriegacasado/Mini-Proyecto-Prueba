from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List

from backend.models.expense import Expense
from backend.models.person import Person
from backend.schemas.expense import ExpenseCreate, ExpenseResponse
from backend.api.deps import get_db, get_current_user

router = APIRouter()

@router.post("/", response_model=ExpenseResponse, status_code=201)
def create_expense(
    expense_in: ExpenseCreate, 
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Registra un nuevo gasto.
    """
    new_expense = Expense(
        group_id=expense_in.group_id,
        description=expense_in.description,
        amount=expense_in.amount,
        payer_id=expense_in.payer_id,
        date=expense_in.date
    )
    
    if expense_in.participants_ids:
        participants = db.query(Person).filter(Person.id.in_(expense_in.participants_ids)).all()
        new_expense.participants = participants

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Devuelve la lista de todos los gastos incluyendo la información de la persona que pagó (payer).
    """
    # Usamos joinedload para cargar ansiosamente los datos del payer (Person) y los participants
    expenses = db.query(Expense).options(
        joinedload(Expense.payer),
        joinedload(Expense.participants)
    ).all()
    return expenses
