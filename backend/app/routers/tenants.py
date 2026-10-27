"""Tenant routes. Tenants only ever see their own tenancy, payments
and complaints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_role
from ..database import get_db
from ..models import ROLE_TENANT, Complaint, Property, RentPayment, Tenancy, User
from ..schemas import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintUpdate,
    RentPaymentOut,
    TenancyOut,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])
tenant_only = require_role(ROLE_TENANT)


def _active_tenancy(db: Session, tenant_id: int) -> Tenancy | None:
    return (
        db.query(Tenancy)
        .filter(Tenancy.tenant_id == tenant_id, Tenancy.status == "active")
        .order_by(Tenancy.id.desc())
        .first()
    )


@router.get("/my-tenancy", response_model=TenancyOut | None)
def my_tenancy(user: User = Depends(tenant_only), db: Session = Depends(get_db)):
    row = _active_tenancy(db, user.id)
    if row is None:
        return None
    item = TenancyOut.model_validate(row)
    item.property_title = row.property.title if row.property else None
    return item


@router.get("/rent-payments", response_model=list[RentPaymentOut])
def my_rent_payments(user: User = Depends(tenant_only), db: Session = Depends(get_db)):
    tenancy_ids = [t.id for t in db.query(Tenancy).filter(Tenancy.tenant_id == user.id).all()]
    if not tenancy_ids:
        return []
    return (
        db.query(RentPayment)
        .filter(RentPayment.tenancy_id.in_(tenancy_ids))
        .order_by(RentPayment.due_date.desc())
        .all()
    )


@router.get("/complaints", response_model=list[ComplaintOut])
def my_complaints(user: User = Depends(tenant_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Complaint).filter(Complaint.tenant_id == user.id).order_by(Complaint.id.desc()).all()
    )
    out = []
    for row in rows:
        item = ComplaintOut.model_validate(row)
        item.property_title = row.property.title if row.property else None
        out.append(item)
    return out


@router.post("/complaints", response_model=ComplaintOut, status_code=201)
def create_complaint(
    payload: ComplaintCreate, user: User = Depends(tenant_only), db: Session = Depends(get_db)
):
    tenancy = (
        db.query(Tenancy)
        .filter(
            Tenancy.tenant_id == user.id,
            Tenancy.property_id == payload.property_id,
            Tenancy.status == "active",
        )
        .first()
    )
    if tenancy is None:
        raise HTTPException(
            status_code=403, detail="You can only raise complaints for your own tenancy property"
        )
    row = Complaint(
        property_id=payload.property_id,
        tenant_id=user.id,
        landlord_id=tenancy.landlord_id,
        title=payload.title,
        description=payload.description,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/complaints/{complaint_id}", response_model=ComplaintOut)
def update_my_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    user: User = Depends(tenant_only),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id, Complaint.tenant_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if row.status == "resolved":
        raise HTTPException(status_code=400, detail="A resolved complaint cannot be edited")
    if payload.title is not None:
        row.title = payload.title
    if payload.description is not None:
        row.description = payload.description
    # Tenants do not change complaint status; that is the landlord's job.
    db.commit()
    db.refresh(row)
    return row
