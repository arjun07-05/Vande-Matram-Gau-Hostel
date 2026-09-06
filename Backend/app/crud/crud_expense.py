from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
import calendar

from app.crud.base import CRUDBase
from app.models.expense import Expense, MemberMonthlyPayment
from app.models.material import Material, MaterialUsage
from app.models.member import Member
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    MemberPaymentRecordRequest,
    MemberShareItem,
    MaterialUsageCostItem,
    MonthlyCostSummaryResponse
)

class CRUDExpense(CRUDBase[Expense, ExpenseCreate, ExpenseUpdate]):
    def get_by_month(self, db: Session, month_year: str) -> List[Expense]:
        return (
            db.query(Expense)
            .filter(Expense.month_year == month_year)
            .order_by(Expense.expense_date.desc(), Expense.id.desc())
            .all()
        )

    def get_by_date_range(self, db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[Expense]:
        query = db.query(Expense)
        if start_date:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date:
            query = query.filter(Expense.expense_date <= end_date)
        return query.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()

    def record_member_payment(self, db: Session, payment_in: MemberPaymentRecordRequest) -> MemberMonthlyPayment:
        # Resolve valid member
        member = db.query(Member).filter(Member.id == payment_in.member_id).first()
        if not member:
            member = db.query(Member).filter(Member.member_number == payment_in.member_id).first()
        if not member:
            raise ValueError(f"Member with ID or number {payment_in.member_id} does not exist.")

        target_member_id = member.id

        existing = (
            db.query(MemberMonthlyPayment)
            .filter(
                MemberMonthlyPayment.member_id == target_member_id,
                MemberMonthlyPayment.month_year == payment_in.month_year
            )
            .first()
        )
        if existing:
            existing.amount_paid = payment_in.amount_paid
            existing.status = payment_in.status
            existing.payment_date = payment_in.payment_date or date.today()
            existing.payment_mode = payment_in.payment_mode
            existing.remarks = payment_in.remarks
            db.commit()
            db.refresh(existing)
            return existing
        else:
            new_payment = MemberMonthlyPayment(
                member_id=target_member_id,
                month_year=payment_in.month_year,
                calculated_share=0.0,
                amount_paid=payment_in.amount_paid,
                status=payment_in.status,
                payment_date=payment_in.payment_date or date.today(),
                payment_mode=payment_in.payment_mode,
                remarks=payment_in.remarks
            )
            db.add(new_payment)
            db.commit()
            db.refresh(new_payment)
            return new_payment

    def get_monthly_cost_summary(self, db: Session, month_year: str) -> MonthlyCostSummaryResponse:
        # 1. Parse Year & Month
        try:
            year, month = map(int, month_year.split('-'))
        except Exception:
            today = date.today()
            year, month = today.year, today.month
            month_year = f"{year:04d}-{month:02d}"

        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        # 2. Fetch Operational Expenses for this month_year
        expenses = (
            db.query(Expense)
            .filter(Expense.month_year == month_year)
            .order_by(Expense.expense_date.desc(), Expense.id.desc())
            .all()
        )
        total_operational_expense = sum(float(e.amount or 0.0) for e in expenses)

        # 3. Operating monthly cost (material costs are managed separately in Materials page)
        total_material_cost = 0.0
        material_costs: List[MaterialUsageCostItem] = []
        total_monthly_cost = round(total_operational_expense, 2)

        # 4. Fetch all members and calculate per-member share
        members = db.query(Member).order_by(Member.id.asc()).all()
        total_members_count = len(members)

        per_member_cost = round(total_monthly_cost / total_members_count, 2) if total_members_count > 0 else 0.0

        # 6. Fetch existing payment status records for this month
        payment_records = (
            db.query(MemberMonthlyPayment)
            .filter(MemberMonthlyPayment.month_year == month_year)
            .all()
        )
        payment_map = {p.member_id: p for p in payment_records}

        members_shares: List[MemberShareItem] = []
        for mem in members:
            # Gather assigned cows info
            assigned_cows = mem.assigned_cows if hasattr(mem, 'assigned_cows') and mem.assigned_cows else ([mem.assigned_cow] if mem.assigned_cow else [])
            cow_names = [f"Cow #{c.cow_number} ({c.cow_name or ''})" for c in assigned_cows if c]

            pm = payment_map.get(mem.id)
            if pm:
                amount_paid = float(pm.amount_paid or 0.0)
                status = pm.status or ("Paid" if amount_paid >= per_member_cost and per_member_cost > 0 else "Pending")
                payment_date = pm.payment_date
                payment_mode = pm.payment_mode
                remarks = pm.remarks
            else:
                amount_paid = 0.0
                status = "Pending"
                payment_date = None
                payment_mode = None
                remarks = None

            members_shares.append(
                MemberShareItem(
                    member_id=mem.id,
                    member_number=str(mem.member_number) if mem.member_number else None,
                    name=mem.name,
                    name2=mem.name2,
                    assigned_cows_count=len(assigned_cows),
                    assigned_cows_names=cow_names,
                    milk_preference=mem.milk_preference,
                    calculated_share=per_member_cost,
                    amount_paid=amount_paid,
                    status=status,
                    payment_date=payment_date,
                    payment_mode=payment_mode,
                    remarks=remarks
                )
            )

        # Sort member shares by numeric member_number
        def sort_key(item: MemberShareItem):
            try:
                return int(item.member_number or item.member_id)
            except Exception:
                return item.member_id

        members_shares.sort(key=sort_key)

        return MonthlyCostSummaryResponse(
            month_year=month_year,
            total_material_cost=round(total_material_cost, 2),
            total_operational_expense=round(total_operational_expense, 2),
            total_monthly_cost=total_monthly_cost,
            total_members_count=total_members_count,
            per_member_cost=per_member_cost,
            material_costs=material_costs,
            expenses=expenses,
            members_shares=members_shares
        )


expense = CRUDExpense(Expense)
