from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from backend.models.person import Person
from backend.models.expense import Expense

def calculate_balances(db: Session) -> List[Dict[str, Any]]:
    """
    Calcula los balances netos del grupo y genera las transferencias
    mínimas necesarias para que todo el mundo quede a pre.
    
    Devuelve una lista de diccionarios con el formato:
    {
        "debtor_id": string (UUID),
        "creditor_id": string (UUID),
        "amount": float
    }
    """
    # 1. Obtener datos: Consulta a la base de datos para usuarios y gastos
    persons = db.query(Person).all()
    # Usamos joinedload para obtener los participantes de cada gasto
    expenses = db.query(Expense).options(joinedload(Expense.participants)).all()

    # Manejo de casos especiales: si no hay personas o no hay gastos
    if not persons or not expenses:
        return []

    # 3. Calcular saldo neto por persona
    # Inicialmente, el balance de todos es 0
    balances = {person.id: 0.0 for person in persons}

    # Por cada gasto, el importe se divide entre los participantes específicos
    for expense in expenses:
        participants = expense.participants
        # Si un gasto no tiene participantes definidos, por defecto podríamos asumir
        # que no afecta o dividirlo entre todos. Aquí seguimos la regla de V2 estricta:
        if not participants:
            continue
            
        fair_share = float(expense.amount) / len(participants)
        
        # Restamos la cuota justa a cada participante del gasto
        for participant in participants:
            if participant.id in balances:
                balances[participant.id] -= fair_share
                
        # Sumamos el total del gasto al pagador
        if expense.payer_id in balances:
            balances[expense.payer_id] += float(expense.amount)

    # Clasificamos a las personas en deudores (deben dinero) y acreedores (se les debe)
    debtors = []
    creditors = []
    
    # Epsilon (margen de error) para evitar problemas de precisión en coma flotante
    epsilon = 0.01 

    for person_id, balance in balances.items():
        if balance < -epsilon:
            # Los deudores tienen saldo negativo, guardamos el valor absoluto de su deuda
            debtors.append({"id": person_id, "amount": abs(balance)})
        elif balance > epsilon:
            # Los acreedores tienen saldo positivo
            creditors.append({"id": person_id, "amount": balance})

    # 4. Algoritmo de cruce: Emparejar deudores con acreedores
    transactions = []
    
    i = 0  # Índice de deudores
    j = 0  # Índice de acreedores
    
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]

        # La transferencia será el importe menor entre la deuda pendiente y el crédito a cobrar
        transfer_amount = min(debtor["amount"], creditor["amount"])
        
        # Redondeamos a 2 decimales por ser moneda
        transfer_amount = round(transfer_amount, 2)
        
        if transfer_amount > 0:
            transactions.append({
                "debtor_id": str(debtor["id"]),
                "creditor_id": str(creditor["id"]),
                "amount": transfer_amount
            })

        # Actualizamos los saldos restantes restando lo que se acaba de transferir
        debtor["amount"] -= transfer_amount
        creditor["amount"] -= transfer_amount

        # Si el deudor ya ha saldado su deuda, pasamos al siguiente
        if debtor["amount"] < epsilon:
            i += 1
            
        # Si el acreedor ya ha cobrado todo, pasamos al siguiente
        if creditor["amount"] < epsilon:
            j += 1

    return transactions
