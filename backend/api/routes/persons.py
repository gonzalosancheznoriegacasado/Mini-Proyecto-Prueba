from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models.person import Person
from backend.schemas.person import PersonCreate, PersonResponse
from backend.api.deps import get_db, get_current_user

router = APIRouter()

@router.post("/", response_model=PersonResponse, status_code=201)
def create_person(
    person_in: PersonCreate, 
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Crea una nueva persona.
    El UUID y la fecha de creación se generan automáticamente en la base de datos.
    """
    new_person = Person(name=person_in.name)
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    return new_person

@router.get("/", response_model=List[PersonResponse])
def get_persons(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Devuelve la lista completa de todas las personas registradas.
    """
    persons = db.query(Person).all()
    return persons
