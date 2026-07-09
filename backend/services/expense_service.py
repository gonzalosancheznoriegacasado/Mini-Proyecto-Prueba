from decimal import Decimal, ROUND_HALF_UP
from typing import List
from fastapi import HTTPException
from backend.schemas.expense import ExpenseSplitCreate
from backend.models.expense import SplitType, ExpenseSplit

def calculate_splits(amount: float, splits: List[ExpenseSplitCreate]) -> List[ExpenseSplit]:
    if not splits:
        raise HTTPException(status_code=400, detail="Splits are required")
        
    total_amount = Decimal(str(amount))
    calculated_splits = []
    
    # Calculate amounts
    for split in splits:
        if split.split_type == SplitType.EQUAL:
            num_participants = len(splits)
            calc = total_amount / Decimal(num_participants)
        elif split.split_type == SplitType.EXACT:
            calc = Decimal(str(split.split_value))
        elif split.split_type == SplitType.PERCENTAGE:
            calc = (Decimal(str(split.split_value)) / Decimal(100)) * total_amount
        elif split.split_type == SplitType.SHARES:
            total_shares = sum(Decimal(str(s.split_value)) for s in splits)
            if total_shares == 0:
                raise HTTPException(status_code=400, detail="Total shares cannot be zero")
            calc = (Decimal(str(split.split_value)) / total_shares) * total_amount
        else:
            raise HTTPException(status_code=400, detail=f"Invalid split type: {split.split_type}")
            
        # Round to 2 decimals
        calc = calc.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        calculated_splits.append({
            "user_id": split.user_id,
            "split_type": split.split_type,
            "split_value": split.split_value,
            "calculated_amount": calc
        })
        
    # Handle rounding error (centavo sobrante)
    sum_calculated = sum(s["calculated_amount"] for s in calculated_splits)
    difference = total_amount - sum_calculated
    
    if difference != Decimal('0.00'):
        if splits[0].split_type in (SplitType.EQUAL, SplitType.PERCENTAGE, SplitType.SHARES):
            calculated_splits[0]["calculated_amount"] += difference

    # Validation
    final_sum = sum(s["calculated_amount"] for s in calculated_splits)
    if final_sum != total_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Sum of splits ({final_sum}) does not match total amount ({total_amount})"
        )
        
    # Create ExpenseSplit ORM objects
    orm_splits = []
    for s in calculated_splits:
        orm_splits.append(
            ExpenseSplit(
                user_id=s["user_id"],
                split_type=s["split_type"],
                split_value=s["split_value"],
                calculated_amount=s["calculated_amount"]
            )
        )
        
    return orm_splits
