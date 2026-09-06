from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import date
from collections import defaultdict
from app.crud.base import CRUDBase
from app.models.material import Material, MaterialUsage, MaterialContribution
from app.schemas.material import (
    MaterialCreate, MaterialUpdate,
    MaterialUsageCreate, MaterialUsageUpdate,
    InventorySummaryItem,
    MaterialContributionCreate, MaterialContributionUpdate,
    BulkMaterialContributionCreate, MemberContributionLedgerItem, MaterialFundSummaryResponse
)

class CRUDMaterial(CRUDBase[Material, MaterialCreate, MaterialUpdate]):
    def get_by_date_range(
        self, db: Session, *, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[Material]:
        query = db.query(Material)
        if start_date:
            query = query.filter(Material.purchase_date >= start_date)
        if end_date:
            query = query.filter(Material.purchase_date <= end_date)
        return query.order_by(Material.purchase_date.desc(), Material.id.desc()).all()

    def get_inventory_summary(self, db: Session) -> List[Dict[str, Any]]:
        # Fetch all purchases and all usages
        purchases = db.query(Material).order_by(Material.purchase_date.asc(), Material.id.asc()).all()
        usages = db.query(MaterialUsage).order_by(MaterialUsage.usage_date.asc(), MaterialUsage.id.asc()).all()

        # Group purchases by normalized item_name
        grouped_purchases: Dict[str, Dict[str, Any]] = {}
        for p in purchases:
            name_key = p.item_name.strip()
            if name_key not in grouped_purchases:
                grouped_purchases[name_key] = {
                    "item_name": p.item_name,
                    "unit": p.unit,
                    "total_purchased_qty": 0.0,
                    "total_purchased_amount": 0.0,
                    "last_purchase_price": p.price_per_unit,
                    "last_purchase_date": p.purchase_date,
                    "suppliers_set": set(),
                }
            entry = grouped_purchases[name_key]
            entry["total_purchased_qty"] += float(p.quantity or 0)
            entry["total_purchased_amount"] += float(p.total_price or 0)
            entry["last_purchase_price"] = float(p.price_per_unit or 0)
            entry["last_purchase_date"] = p.purchase_date
            if p.unit:
                entry["unit"] = p.unit
            if p.supplier and p.supplier.strip():
                entry["suppliers_set"].add(p.supplier.strip())

        # Group usages by item_name
        grouped_usages: Dict[str, float] = defaultdict(float)
        for u in usages:
            name_key = u.item_name.strip()
            grouped_usages[name_key] += float(u.quantity_used or 0)

        # Merge and build summary list
        summary_list = []
        all_item_keys = set(list(grouped_purchases.keys()) + list(grouped_usages.keys()))
        for key in sorted(all_item_keys):
            p_data = grouped_purchases.get(key, {
                "item_name": key,
                "unit": "નંગ",
                "total_purchased_qty": 0.0,
                "total_purchased_amount": 0.0,
                "last_purchase_price": 0.0,
                "last_purchase_date": None,
                "suppliers_set": set(),
            })

            total_p_qty = round(p_data["total_purchased_qty"], 2)
            total_p_amt = round(p_data["total_purchased_amount"], 2)
            avg_price = round(total_p_amt / total_p_qty, 2) if total_p_qty > 0 else 0.0
            used_qty = round(grouped_usages.get(key, 0.0), 2)
            balance_qty = round(total_p_qty - used_qty, 2)
            balance_val = round(balance_qty * avg_price, 2) if balance_qty > 0 else 0.0

            summary_list.append({
                "item_name": p_data["item_name"],
                "unit": p_data["unit"],
                "total_purchased_qty": total_p_qty,
                "total_purchased_amount": total_p_amt,
                "avg_price_per_unit": avg_price,
                "last_purchase_price": p_data["last_purchase_price"],
                "last_purchase_date": p_data["last_purchase_date"],
                "suppliers": sorted(list(p_data["suppliers_set"])),
                "total_used_qty": used_qty,
                "balance_qty": balance_qty,
                "balance_valuation": balance_val,
            })

        return summary_list

class CRUDMaterialUsage(CRUDBase[MaterialUsage, MaterialUsageCreate, MaterialUsageUpdate]):
    def get_by_date_range(
        self, db: Session, *, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[MaterialUsage]:
        query = db.query(MaterialUsage)
        if start_date:
            query = query.filter(MaterialUsage.usage_date >= start_date)
        if end_date:
            query = query.filter(MaterialUsage.usage_date <= end_date)
        return query.order_by(MaterialUsage.usage_date.desc(), MaterialUsage.id.desc()).all()

class CRUDMaterialContribution(CRUDBase[MaterialContribution, MaterialContributionCreate, MaterialContributionUpdate]):
    def get_all_with_member_info(self, db: Session) -> List[Dict[str, Any]]:
        contributions = (
            db.query(MaterialContribution)
            .order_by(MaterialContribution.contribution_date.desc(), MaterialContribution.id.desc())
            .all()
        )
        result = []
        for c in contributions:
            m = c.member
            assigned_cows = m.assigned_cows if (m and hasattr(m, 'assigned_cows') and m.assigned_cows) else ([m.assigned_cow] if (m and m.assigned_cow) else [])
            result.append({
                "id": c.id,
                "member_id": c.member_id,
                "amount": float(c.amount or 0.0),
                "contribution_date": c.contribution_date,
                "payment_mode": c.payment_mode,
                "remarks": c.remarks,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "member_name": m.name if m else "-",
                "member_name2": m.name2 if m else None,
                "member_number": str(m.member_number) if (m and m.member_number) else None,
                "assigned_cows_count": len(assigned_cows)
            })
        return result

    def bulk_create_for_all_members(
        self, db: Session, *, bulk_in: BulkMaterialContributionCreate
    ) -> List[MaterialContribution]:
        from app.models.member import Member
        members = db.query(Member).order_by(Member.id.asc()).all()
        created_records = []
        c_date = bulk_in.contribution_date or date.today()

        for m in members:
            record = MaterialContribution(
                member_id=m.id,
                amount=bulk_in.amount_per_member,
                contribution_date=c_date,
                payment_mode=bulk_in.payment_mode or "Cash",
                remarks=bulk_in.remarks
            )
            db.add(record)
            created_records.append(record)

        db.commit()
        for r in created_records:
            db.refresh(r)
        return created_records

    def get_fund_summary(self, db: Session) -> MaterialFundSummaryResponse:
        from app.models.member import Member

        # 1. Total money collected from all members
        contributions = db.query(MaterialContribution).all()
        total_collected = sum(float(c.amount or 0.0) for c in contributions)

        # 2. Total money spent on purchasing materials
        purchases = db.query(Material).all()
        total_expense = sum(float(p.total_price or 0.0) for p in purchases)

        # 3. Net Fund Balance
        net_balance = round(total_collected - total_expense, 2)

        # 4. Group contributions by member_id
        member_contrib_map: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
            "total": 0.0,
            "last_date": None,
            "last_mode": None,
            "last_remarks": None,
            "count": 0
        })

        for c in sorted(contributions, key=lambda x: (x.contribution_date or date.min, x.id or 0)):
            data = member_contrib_map[c.member_id]
            data["total"] += float(c.amount or 0.0)
            data["last_date"] = c.contribution_date
            data["last_mode"] = c.payment_mode
            data["last_remarks"] = c.remarks
            data["count"] += 1

        # 5. Fetch all members
        members = db.query(Member).order_by(Member.id.asc()).all()
        ledger_items: List[MemberContributionLedgerItem] = []
        contributing_members_count = 0

        for m in members:
            c_data = member_contrib_map.get(m.id, {
                "total": 0.0, "last_date": None, "last_mode": None, "last_remarks": None, "count": 0
            })
            if c_data["total"] > 0:
                contributing_members_count += 1

            assigned_cows = m.assigned_cows if hasattr(m, 'assigned_cows') and m.assigned_cows else ([m.assigned_cow] if m.assigned_cow else [])

            ledger_items.append(
                MemberContributionLedgerItem(
                    member_id=m.id,
                    member_number=str(m.member_number) if m.member_number else None,
                    name=m.name,
                    name2=m.name2,
                    assigned_cows_count=len(assigned_cows),
                    total_contributed=round(c_data["total"], 2),
                    last_contribution_date=c_data["last_date"],
                    last_payment_mode=c_data["last_mode"],
                    last_remarks=c_data["last_remarks"],
                    contributions_count=c_data["count"]
                )
            )

        def sort_key(item: MemberContributionLedgerItem):
            try:
                return int(item.member_number or item.member_id)
            except Exception:
                return item.member_id

        ledger_items.sort(key=sort_key)

        return MaterialFundSummaryResponse(
            total_collected_fund=round(total_collected, 2),
            total_material_expense=round(total_expense, 2),
            net_fund_balance=net_balance,
            total_members_count=len(members),
            contributing_members_count=contributing_members_count,
            member_contributions=ledger_items
        )

    def reset_all(self, db: Session) -> int:
        deleted = db.query(MaterialContribution).delete()
        db.commit()
        return deleted

    def reset_member(self, db: Session, member_id: int) -> int:
        deleted = db.query(MaterialContribution).filter(MaterialContribution.member_id == member_id).delete()
        db.commit()
        return deleted

material = CRUDMaterial(Material)
material_usage = CRUDMaterialUsage(MaterialUsage)
material_contribution = CRUDMaterialContribution(MaterialContribution)
