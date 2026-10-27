"""Landlord routes. Every query is scoped to the logged-in landlord."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_role
from ..database import get_db
from ..link_service import (
    approve_link,
    create_link,
    reject_link,
    revoke_link,
    serialize_link,
)
from ..models import (
    COMMISSION_PAID,
    COMMISSION_PENDING,
    PAYMENT_OVERDUE,
    PAYMENT_PAID,
    PAYMENT_PENDING,
    ROLE_DEALER,
    ROLE_LANDLORD,
    ROLE_TENANT,
    Complaint,
    Commission,
    LandlordDealerLink,
    Property,
    RentPayment,
    Tenancy,
    User,
)
from ..schemas import (
    CommissionOut,
    ComplaintOut,
    ComplaintUpdate,
    LinkInviteByEmail,
    LinkOut,
    PropertyCreate,
    PropertyOut,
    PropertyUpdate,
    RentPaymentCreate,
    RentPaymentOut,
    RentSummaryOut,
    TenancyCreate,
    TenancyOut,
)

router = APIRouter(prefix="/landlords", tags=["landlords"])
landlord_only = require_role(ROLE_LANDLORD)


def _own_property_or_404(db: Session, landlord_id: int, property_id: int) -> Property:
    prop = (
        db.query(Property)
        .filter(Property.id == property_id, Property.landlord_id == landlord_id)
        .first()
    )
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


# ---------------------------------------------------------------- properties
@router.get("/properties", response_model=list[PropertyOut])
def list_properties(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    return db.query(Property).filter(Property.landlord_id == user.id).order_by(Property.id.desc()).all()


@router.post("/properties", response_model=PropertyOut, status_code=201)
def create_property(
    payload: PropertyCreate, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    prop = Property(landlord_id=user.id, **payload.model_dump())
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.get("/properties/{property_id}", response_model=PropertyOut)
def get_property(
    property_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    return _own_property_or_404(db, user.id, property_id)


@router.put("/properties/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: int,
    payload: PropertyUpdate,
    user: User = Depends(landlord_only),
    db: Session = Depends(get_db),
):
    prop = _own_property_or_404(db, user.id, property_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prop, field, value)
    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/properties/{property_id}")
def delete_property(
    property_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    prop = _own_property_or_404(db, user.id, property_id)
    db.delete(prop)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- tenancies
@router.get("/tenancies", response_model=list[TenancyOut])
def list_tenancies(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Tenancy).filter(Tenancy.landlord_id == user.id).order_by(Tenancy.id.desc()).all()
    )
    out = []
    for row in rows:
        item = TenancyOut.model_validate(row)
        item.property_title = row.property.title if row.property else None
        item.tenant_name = row.tenant.name if row.tenant else None
        out.append(item)
    return out


@router.post("/tenancies", response_model=TenancyOut, status_code=201)
def create_tenancy(
    payload: TenancyCreate, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    prop = _own_property_or_404(db, user.id, payload.property_id)
    tenant = (
        db.query(User)
        .filter(User.email == payload.tenant_email, User.role == ROLE_TENANT)
        .first()
    )
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant must register first")
    existing = (
        db.query(Tenancy)
        .filter(Tenancy.property_id == prop.id, Tenancy.status == "active")
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Property already has an active tenancy")
    tenancy = Tenancy(
        property_id=prop.id,
        tenant_id=tenant.id,
        landlord_id=user.id,
        monthly_rent=payload.monthly_rent,
        due_day=payload.due_day,
        start_date=payload.start_date,
    )
    prop.is_occupied = True
    db.add(tenancy)
    db.commit()
    db.refresh(tenancy)
    return tenancy


# ---------------------------------------------------------------- rent
@router.get("/rent-summary", response_model=RentSummaryOut)
def rent_summary(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    tenancy_ids = [t.id for t in db.query(Tenancy).filter(Tenancy.landlord_id == user.id).all()]
    payments = db.query(RentPayment).filter(RentPayment.tenancy_id.in_(tenancy_ids)).all() if tenancy_ids else []
    received = sum(p.amount for p in payments if p.status == PAYMENT_PAID)
    pending = sum(p.amount for p in payments if p.status in (PAYMENT_PENDING, PAYMENT_OVERDUE))
    return {
        "received": received,
        "pending": pending,
        "total_income": received,
        "paid_count": sum(1 for p in payments if p.status == PAYMENT_PAID),
        "pending_count": sum(1 for p in payments if p.status in (PAYMENT_PENDING, PAYMENT_OVERDUE)),
    }


@router.post("/rent-payments", response_model=RentPaymentOut, status_code=201)
def create_rent_payment(
    payload: RentPaymentCreate, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    tenancy = (
        db.query(Tenancy)
        .filter(Tenancy.id == payload.tenancy_id, Tenancy.landlord_id == user.id)
        .first()
    )
    if tenancy is None:
        raise HTTPException(status_code=404, detail="Tenancy not found")
    payment = RentPayment(
        tenancy_id=tenancy.id,
        amount=payload.amount,
        due_date=payload.due_date,
        status=PAYMENT_PENDING,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/rent-payments/{payment_id}/mark-paid", response_model=RentPaymentOut)
def mark_payment_paid(
    payment_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    payment = db.query(RentPayment).filter(RentPayment.id == payment_id).first()
    if payment is None or payment.tenancy.landlord_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = PAYMENT_PAID
    payment.paid_date = date.today()
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/rent-payments", response_model=list[RentPaymentOut])
def list_rent_payments(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    tenancy_ids = [t.id for t in db.query(Tenancy).filter(Tenancy.landlord_id == user.id).all()]
    if not tenancy_ids:
        return []
    return (
        db.query(RentPayment)
        .filter(RentPayment.tenancy_id.in_(tenancy_ids))
        .order_by(RentPayment.due_date.desc())
        .all()
    )


# ---------------------------------------------------------------- complaints
@router.get("/complaints", response_model=list[ComplaintOut])
def list_complaints(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Complaint).filter(Complaint.landlord_id == user.id).order_by(Complaint.id.desc()).all()
    )
    out = []
    for row in rows:
        item = ComplaintOut.model_validate(row)
        item.property_title = row.property.title if row.property else None
        item.tenant_name = row.tenant.name if row.tenant else None
        out.append(item)
    return out


@router.put("/complaints/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    user: User = Depends(landlord_only),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id, Complaint.landlord_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if payload.status is not None:
        if payload.status not in ("open", "in_progress", "resolved"):
            raise HTTPException(status_code=400, detail="Invalid complaint status")
        row.status = payload.status
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------- dealers tab + links
@router.get("/dealers", response_model=list[LinkOut])
def list_dealers(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    links = (
        db.query(LandlordDealerLink)
        .filter(LandlordDealerLink.landlord_id == user.id)
        .order_by(LandlordDealerLink.id.desc())
        .all()
    )
    return [serialize_link(db, link) for link in links]


@router.post("/links/invite-dealer", response_model=LinkOut, status_code=201)
def invite_dealer(
    payload: LinkInviteByEmail, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    dealer = (
        db.query(User).filter(User.email == payload.email, User.role == ROLE_DEALER).first()
    )
    if dealer is None:
        raise HTTPException(status_code=404, detail="Dealer must register first")
    link = create_link(db, user.id, dealer.id, payload.property_id, initiated_by=ROLE_LANDLORD)
    return serialize_link(db, link)


@router.post("/links/{link_id}/approve", response_model=LinkOut)
def approve(link_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    link = db.query(LandlordDealerLink).filter(
        LandlordDealerLink.id == link_id, LandlordDealerLink.landlord_id == user.id
    ).first()
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return serialize_link(db, approve_link(db, link_id, approver_role=ROLE_LANDLORD))


@router.post("/links/{link_id}/reject", response_model=LinkOut)
def reject(link_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    link = db.query(LandlordDealerLink).filter(
        LandlordDealerLink.id == link_id, LandlordDealerLink.landlord_id == user.id
    ).first()
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return serialize_link(db, reject_link(db, link_id, rejecter_role=ROLE_LANDLORD))


@router.post("/links/{link_id}/revoke", response_model=LinkOut)
def revoke(link_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    link = db.query(LandlordDealerLink).filter(
        LandlordDealerLink.id == link_id, LandlordDealerLink.landlord_id == user.id
    ).first()
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return serialize_link(db, revoke_link(db, link_id))


# ---------------------------------------------------------------- commissions
@router.get("/commissions", response_model=list[CommissionOut])
def list_commissions(user: User = Depends(landlord_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Commission).filter(Commission.landlord_id == user.id).order_by(Commission.id.desc()).all()
    )
    out = []
    for row in rows:
        item = CommissionOut.model_validate(row)
        item.property_title = row.property.title if row.property else None
        item.dealer_name = row.dealer.name if row.dealer else None
        out.append(item)
    return out


@router.post("/commissions/{commission_id}/mark-paid", response_model=CommissionOut)
def mark_commission_paid(
    commission_id: int, user: User = Depends(landlord_only), db: Session = Depends(get_db)
):
    row = (
        db.query(Commission)
        .filter(Commission.id == commission_id, Commission.landlord_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Commission not found")
    if row.status != COMMISSION_PENDING:
        raise HTTPException(status_code=400, detail="Only a pending commission can be marked paid")
    row.status = COMMISSION_PAID
    db.commit()
    db.refresh(row)
    return row
