from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.Material])
def read_materials(
    db: Session = Depends(deps.get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.material.get_by_date_range(db, start_date=start_date, end_date=end_date)

@router.post("/", response_model=schemas.Material)
def create_material(
    *,
    db: Session = Depends(deps.get_db),
    material_in: schemas.MaterialCreate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    # Auto-calculate total_price if not provided
    if not material_in.total_price or material_in.total_price == 0:
        material_in.total_price = round(material_in.quantity * material_in.price_per_unit, 2)
    if not material_in.purchase_date:
        material_in.purchase_date = date.today()
    return crud.material.create(db, obj_in=material_in)

@router.get("/inventory-summary", response_model=List[schemas.InventorySummaryItem])
def get_inventory_summary(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.material.get_inventory_summary(db)

@router.get("/usages", response_model=List[schemas.MaterialUsage])
def read_material_usages(
    db: Session = Depends(deps.get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.material_usage.get_by_date_range(db, start_date=start_date, end_date=end_date)

@router.post("/usages", response_model=schemas.MaterialUsage)
def create_material_usage(
    *,
    db: Session = Depends(deps.get_db),
    usage_in: schemas.MaterialUsageCreate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    if not usage_in.usage_date:
        usage_in.usage_date = date.today()
    return crud.material_usage.create(db, obj_in=usage_in)

@router.delete("/usages/{usage_id}", response_model=schemas.MaterialUsage)
def delete_material_usage(
    *,
    db: Session = Depends(deps.get_db),
    usage_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    usage_obj = crud.material_usage.get(db, id=usage_id)
    if not usage_obj:
        raise HTTPException(status_code=404, detail="Material usage entry not found")
    return crud.material_usage.remove(db, id=usage_id)

@router.get("/fund-summary", response_model=schemas.MaterialFundSummaryResponse)
def get_material_fund_summary(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.material_contribution.get_fund_summary(db)

@router.get("/contributions", response_model=List[schemas.MaterialContribution])
def read_material_contributions(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.material_contribution.get_all_with_member_info(db)

@router.post("/contributions", response_model=schemas.MaterialContribution)
def create_material_contribution(
    *,
    db: Session = Depends(deps.get_db),
    contrib_in: schemas.MaterialContributionCreate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    if not contrib_in.contribution_date:
        contrib_in.contribution_date = date.today()
    created = crud.material_contribution.create(db, obj_in=contrib_in)
    # Return enriched representation
    all_info = crud.material_contribution.get_all_with_member_info(db)
    for c in all_info:
        if c["id"] == created.id:
            return c
    return created

@router.post("/contributions/bulk-all", response_model=List[schemas.MaterialContribution])
def bulk_create_contributions_for_all_members(
    *,
    db: Session = Depends(deps.get_db),
    bulk_in: schemas.BulkMaterialContributionCreate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    crud.material_contribution.bulk_create_for_all_members(db, bulk_in=bulk_in)
    return crud.material_contribution.get_all_with_member_info(db)

@router.delete("/contributions/reset-all")
def reset_all_material_contributions(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    deleted = crud.material_contribution.reset_all(db)
    return {"status": "success", "message": f"Successfully cleared all {deleted} contribution records"}

@router.delete("/contributions/member/{member_id}")
def reset_single_member_contributions(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    deleted = crud.material_contribution.reset_member(db, member_id=member_id)
    return {"status": "success", "message": f"Successfully cleared {deleted} contributions for member {member_id}"}

@router.delete("/contributions/{contribution_id}")
def delete_material_contribution(
    *,
    db: Session = Depends(deps.get_db),
    contribution_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    contrib = crud.material_contribution.get(db, id=contribution_id)
    if not contrib:
        raise HTTPException(status_code=404, detail="Contribution record not found")
    crud.material_contribution.remove(db, id=contribution_id)
    return {"status": "success", "message": "Contribution removed successfully"}

@router.put("/{material_id}", response_model=schemas.Material)
def update_material(
    *,
    db: Session = Depends(deps.get_db),
    material_id: int,
    material_in: schemas.MaterialUpdate,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    material_obj = crud.material.get(db, id=material_id)
    if not material_obj:
        raise HTTPException(status_code=404, detail="Material item not found")

    # Recalculate total_price if quantity or price_per_unit updated
    qty = material_in.quantity if material_in.quantity is not None else material_obj.quantity
    price = material_in.price_per_unit if material_in.price_per_unit is not None else material_obj.price_per_unit
    if material_in.total_price is None:
        material_in.total_price = round(qty * price, 2)

    return crud.material.update(db, db_obj=material_obj, obj_in=material_in)

@router.delete("/{material_id}", response_model=schemas.Material)
def delete_material(
    *,
    db: Session = Depends(deps.get_db),
    material_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    material_obj = crud.material.get(db, id=material_id)
    if not material_obj:
        raise HTTPException(status_code=404, detail="Material item not found")
    return crud.material.remove(db, id=material_id)
