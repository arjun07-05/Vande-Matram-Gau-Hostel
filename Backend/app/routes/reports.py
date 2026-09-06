from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any, List, Dict
from datetime import date, timedelta
from pydantic import BaseModel

from app.database import session as deps
from app.models import member as member_models
from app.models import milk as milk_models

router = APIRouter()

class MemberMatrixReportResponse(BaseModel):
    dates: List[str]
    members: List[dict]

class CowMatrixReportResponse(BaseModel):
    dates: List[str]
    cows: List[dict]

@router.get("/members", response_model=MemberMatrixReportResponse)
def get_member_milk_report(
    start_date: date,
    end_date: date,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Get day-by-day matrix report for members."""
    # Generate all dates in range
    delta = end_date - start_date
    dates = [str(start_date + timedelta(days=i)) for i in range(delta.days + 1)]

    dists = db.query(member_models.DailyDistribution).filter(
        member_models.DailyDistribution.date >= start_date,
        member_models.DailyDistribution.date <= end_date,
        member_models.DailyDistribution.received == True
    ).all()

    report_map = {}
    for d in dists:
        actual_receiver_id = d.assigned_to_id if d.assigned_to_id else d.member_id
        actual_receiver = d.assigned_to if d.assigned_to_id else d.member

        if not actual_receiver:
            continue

        if actual_receiver_id not in report_map:
            report_map[actual_receiver_id] = {
                "member_id": actual_receiver_id,
                "member_number": actual_receiver.member_number,
                "member_name": actual_receiver.name,
                "daily_data": {dt: {"morning": 0.0, "evening": 0.0, "total": 0.0} for dt in dates},
                "total_morning": 0.0,
                "total_evening": 0.0,
                "total_qty": 0.0
            }

        d_str = str(d.date)
        qty = d.milk_qty
        if d_str in report_map[actual_receiver_id]["daily_data"]:
            if d.shift == "Morning":
                report_map[actual_receiver_id]["daily_data"][d_str]["morning"] += qty
                report_map[actual_receiver_id]["total_morning"] += qty
            else:
                report_map[actual_receiver_id]["daily_data"][d_str]["evening"] += qty
                report_map[actual_receiver_id]["total_evening"] += qty
            report_map[actual_receiver_id]["daily_data"][d_str]["total"] += qty
            report_map[actual_receiver_id]["total_qty"] += qty

    sorted_members = sorted(list(report_map.values()), key=lambda x: x["member_number"] or 9999)
    return {"dates": dates, "members": sorted_members}


@router.get("/cows", response_model=CowMatrixReportResponse)
def get_cow_milk_report(
    start_date: date,
    end_date: date,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Get day-by-day matrix report for cow milk production."""
    delta = end_date - start_date
    dates = [str(start_date + timedelta(days=i)) for i in range(delta.days + 1)]

    entries = db.query(milk_models.MilkEntry).filter(
        milk_models.MilkEntry.date >= start_date,
        milk_models.MilkEntry.date <= end_date
    ).all()

    report_map = {}
    for e in entries:
        cow_id = e.cow_id
        if cow_id not in report_map:
            report_map[cow_id] = {
                "cow_id": cow_id,
                "tag_number": e.cow.cow_number if e.cow.cow_number else "",
                "name": e.cow.cow_name if e.cow.cow_name else "",
                "daily_data": {dt: {"morning": 0.0, "evening": 0.0, "total": 0.0} for dt in dates},
                "total_morning": 0.0,
                "total_evening": 0.0,
                "total_qty": 0.0
            }

        d_str = str(e.date)
        qty = e.milk_qty
        if d_str in report_map[cow_id]["daily_data"]:
            if e.shift == "Morning":
                report_map[cow_id]["daily_data"][d_str]["morning"] += qty
                report_map[cow_id]["total_morning"] += qty
            else:
                report_map[cow_id]["daily_data"][d_str]["evening"] += qty
                report_map[cow_id]["total_evening"] += qty
            report_map[cow_id]["daily_data"][d_str]["total"] += qty

        report_map[cow_id]["total_qty"] += qty

    sorted_cows = sorted(list(report_map.values()), key=lambda x: x["tag_number"] or "ZZZ")
    return {"dates": dates, "cows": sorted_cows}


@router.get("/cows-status")
def get_cows_status_report(
    db: Session = Depends(deps.get_db)
) -> Any:
    """Get complete cow status, type, and history report for all cows."""
    from app.models import cow as cow_models
    from app.models import member as member_models

    cows = db.query(cow_models.Cow).all()

    # Sort cows numerically if possible, otherwise alphabetically
    def sort_key(c):
        try:
            return (0, int(c.cow_number))
        except (ValueError, TypeError):
            return (1, c.cow_number or "")

    sorted_cows = sorted(cows, key=sort_key)

    result = []
    for c in sorted_cows:
        # Get assigned members
        assigned_mems = c.assigned_cows if hasattr(c, 'assigned_cows') and c.assigned_cows else ([c.assigned_cow] if getattr(c, 'assigned_cow', None) else [])

        # Get status history sorted by change_date desc
        history = [
            {
                "id": h.id,
                "condition": h.condition,
                "type": h.type,
                "calf_type": h.calf_type,
                "change_date": str(h.change_date),
                "remarks": h.remarks,
                "created_at": str(h.created_at)
            }
            for h in (c.status_history or [])
        ]

        result.append({
            "id": c.id,
            "cow_number": c.cow_number,
            "cow_name": c.cow_name,
            "breed": c.breed,
            "type": c.type or "દૂધ આપતી",
            "condition": c.condition or "તંદુરસ્ત",
            "calf_type": c.calf_type or "નથી",
            "purchase_price": c.purchase_price,
            "birth_date": str(c.birth_date) if c.birth_date else None,
            "purchase_date": str(c.purchase_date) if c.purchase_date else None,
            "remarks": c.remarks,
            "assigned_members": [
                {
                    "id": m.id,
                    "name": m.name,
                    "name2": m.name2,
                    "member_number": m.member_number,
                    "mobile": m.mobile
                }
                for m in assigned_mems if m
            ],
            "history": history
        })

    return {"cows": result}
