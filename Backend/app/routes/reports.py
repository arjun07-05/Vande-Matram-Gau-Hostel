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
