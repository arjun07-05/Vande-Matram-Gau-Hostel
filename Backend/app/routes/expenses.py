from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.Expense])
def read_expenses(
    db: Session = Depends(deps.get_db),
    month_year: Optional[str] = Query(None, description="Month Year e.g. 2026-09"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if month_year:
        return crud.expense.get_by_month(db, month_year=month_year)
    return crud.expense.get_by_date_range(db, start_date=start_date, end_date=end_date)

@router.post("/", response_model=schemas.Expense)
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: schemas.ExpenseCreate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    if not expense_in.expense_date:
        expense_in.expense_date = date.today()
    if not expense_in.month_year:
        expense_in.month_year = f"{expense_in.expense_date.year:04d}-{expense_in.expense_date.month:02d}"
    return crud.expense.create(db, obj_in=expense_in)

@router.get("/monthly-summary", response_model=schemas.MonthlyCostSummaryResponse)
def get_monthly_cost_summary(
    db: Session = Depends(deps.get_db),
    month_year: Optional[str] = Query(None, description="Month Year e.g. 2026-09"),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if not month_year:
        today = date.today()
        month_year = f"{today.year:04d}-{today.month:02d}"
    return crud.expense.get_monthly_cost_summary(db, month_year=month_year)

@router.post("/member-payment", response_model=schemas.MemberMonthlyPaymentResponse)
def record_member_payment(
    *,
    db: Session = Depends(deps.get_db),
    payment_in: schemas.MemberPaymentRecordRequest,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    try:
        return crud.expense.record_member_payment(db, payment_in=payment_in)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{expense_id}", response_model=schemas.Expense)
def update_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_id: int,
    expense_in: schemas.ExpenseUpdate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    expense_obj = crud.expense.get(db, id=expense_id)
    if not expense_obj:
        raise HTTPException(status_code=404, detail="Expense entry not found")

    if expense_in.expense_date and not expense_in.month_year:
        expense_in.month_year = f"{expense_in.expense_date.year:04d}-{expense_in.expense_date.month:02d}"

    return crud.expense.update(db, db_obj=expense_obj, obj_in=expense_in)

@router.delete("/{expense_id}", response_model=schemas.Expense)
def delete_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    expense_obj = crud.expense.get(db, id=expense_id)
    if not expense_obj:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    return crud.expense.remove(db, id=expense_id)
