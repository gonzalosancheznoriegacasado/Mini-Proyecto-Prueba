from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from uuid import UUID
from backend.models.person import Person
from backend.models.expense import Expense
from backend.models.group import Group

def calculate_balances(db: Session, group_id: UUID, optimize: bool = False) -> List[Dict[str, Any]]:
    """
    Calcula los balances netos del grupo y genera las transferencias
    mínimas necesarias para que todo el mundo quede a pre.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return []

    # 1. Obtener datos: Consulta a la base de datos para usuarios y gastos del grupo
    # Usamos joinedload para obtener los participantes de cada gasto
    expenses = db.query(Expense).filter(Expense.group_id == group_id).options(joinedload(Expense.participants)).all()

    # Manejo de casos especiales: si no hay gastos
    if not expenses:
        return []

    # 3. Calcular saldo neto por persona
    # Construimos el diccionario de balances dinámicamente a partir de los gastos
    balances = {}

    # Por cada gasto, el importe se divide entre los participantes específicos
    for expense in expenses:
        participants = expense.participants
        # Si un gasto no tiene participantes definidos, lo ignoramos
        if not participants:
            continue
            
        fair_share = float(expense.amount) / len(participants)
        
        # Restamos la cuota justa a cada participante del gasto
        for participant in participants:
            balances[participant.id] = balances.get(participant.id, 0.0) - fair_share
                
        # Sumamos el total del gasto al pagador
        balances[expense.payer_id] = balances.get(expense.payer_id, 0.0) + float(expense.amount)

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
    
    if optimize:
        # Enfoque Greedy: En cada iteración tomamos el mayor deudor y el mayor acreedor
        # para reducir el número total de transacciones.
        while debtors and creditors:
            # Ordenamos para asegurar que el último elemento sea el mayor
            debtors.sort(key=lambda x: x["amount"])
            creditors.sort(key=lambda x: x["amount"])
            
            debtor = debtors[-1]
            creditor = creditors[-1]
            
            # La transferencia será el importe menor entre la deuda pendiente y el crédito a cobrar
            transfer_amount = min(debtor["amount"], creditor["amount"])
            transfer_amount = round(transfer_amount, 2)
            
            if transfer_amount > 0:
                transactions.append({
                    "group_id": str(group_id),
                    "debtor_id": str(debtor["id"]),
                    "creditor_id": str(creditor["id"]),
                    "amount": transfer_amount,
                    "is_optimized": True
                })
                
            # Actualizamos los saldos restantes
            debtor["amount"] -= transfer_amount
            creditor["amount"] -= transfer_amount
            
            # Si el saldo llega a 0 (considerando epsilon), lo eliminamos de la lista
            if debtor["amount"] < epsilon:
                debtors.pop()
            if creditor["amount"] < epsilon:
                creditors.pop()
    else:
        # Lógica original sin optimización Greedy (V2)
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
                    "group_id": str(group_id),
                    "debtor_id": str(debtor["id"]),
                    "creditor_id": str(creditor["id"]),
                    "amount": transfer_amount,
                    "is_optimized": False
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
