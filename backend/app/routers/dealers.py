"""Dealer routes. All landlord/property access is gated by an ACTIVE
LandlordDealerLink via app.deps — see that module for the rule."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..agreement_pdf import render_agreement_pdf
from ..auth import require_role
from ..database import get_db
from ..deps import (
    covered_property_ids,
    linked_landlord_ids,
    require_dealer_link_to_property,
)
from ..link_service import (
    approve_link,
    create_link,
    reject_link,
    revoke_link,
    serialize_link,
)
from ..models import (
    COMMISSION_PENDING,
    INQUIRY_CLOSED,
    INQUIRY_LOST,
    INQUIRY_NEW,
    INQUIRY_VIEWING,
    LINK_ACTIVE,
    ROLE_DEALER,
    ROLE_LANDLORD,
    Agreement,
    Commission,
    DealerProfile,
    Inquiry,
    LandlordDealerLink,
    Property,
    PropertyListing,
    User,
)
from ..schemas import (
    AgreementCreate,
    AgreementOut,
    CommissionCreate,
    CommissionOut,
    DealerProfileCreate,
    DealerProfileOut,
    DealerProfileUpdate,
    DealerSummaryOut,
    InquiryCreate,
    InquiryOut,
    InquiryUpdate,
    LinkInviteByEmail,
    LinkOut,
    LinkRequest,
    ListingCreate,
    ListingOut,
    ListingUpdate,
    PropertyOut,
)

router = APIRouter(prefix="/dealers", tags=["dealers"])
dealer_only = require_role(ROLE_DEALER)


def _serialize_listing(db: Session, row: PropertyListing) -> ListingOut:
    item = ListingOut.model_validate(row)
    item.property_title = row.property.title if row.property else None
    return item


def _serialize_inquiry(db: Session, row: Inquiry) -> InquiryOut:
    item = InquiryOut.model_validate(row)
    item.property_title = row.property.title if row.property else None
    return item


def _serialize_commission(db: Session, row: Commission) -> CommissionOut:
    item = CommissionOut.model_validate(row)
    item.property_title = row.property.title if row.property else None
    item.dealer_name = row.dealer.name if row.dealer else None
    return item


# ---------------------------------------------------------------- profile (self-service only)
@router.get("/profile", response_model=DealerProfileOut | None)
def get_profile(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    return db.query(DealerProfile).filter(DealerProfile.user_id == user.id).first()


@router.post("/profile", response_model=DealerProfileOut, status_code=201)
def create_profile(
    payload: DealerProfileCreate, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    existing = db.query(DealerProfile).filter(DealerProfile.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Dealer profile already exists")
    profile = DealerProfile(user_id=user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/profile", response_model=DealerProfileOut)
def update_profile(
    payload: DealerProfileUpdate, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    profile = db.query(DealerProfile).filter(DealerProfile.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Dealer profile not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


# ---------------------------------------------------------------- links
@router.get("/landlords", response_model=list[LinkOut])
def my_landlords(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    links = (
        db.query(LandlordDealerLink)
        .filter(LandlordDealerLink.dealer_id == user.id)
        .order_by(LandlordDealerLink.id.desc())
        .all()
    )
    return [serialize_link(db, link) for link in links]


@router.post("/links/invite-landlord", response_model=LinkOut, status_code=201)
def invite_landlord(
    payload: LinkInviteByEmail, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    landlord = (
        db.query(User).filter(User.email == payload.email, User.role == ROLE_LANDLORD).first()
    )
    if landlord is None:
        raise HTTPException(status_code=404, detail="landlord must register first")
    link = create_link(db, landlord.id, user.id, payload.property_id, initiated_by=ROLE_DEALER)
    return serialize_link(db, link)


@router.post("/links/request", response_model=LinkOut, status_code=201)
def request_link(
    payload: LinkRequest, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    landlord = (
        db.query(User).filter(User.id == payload.landlord_id, User.role == ROLE_LANDLORD).first()
    )
    if landlord is None:
        raise HTTPException(status_code=404, detail="landlord must register first")
    link = create_link(db, landlord.id, user.id, payload.property_id, initiated_by=ROLE_DEALER)
    return serialize_link(db, link)


def _dealer_link_or_404(db: Session, dealer_id: int, link_id: int) -> LandlordDealerLink:
    link = (
        db.query(LandlordDealerLink)
        .filter(LandlordDealerLink.id == link_id, LandlordDealerLink.dealer_id == dealer_id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


@router.post("/links/{link_id}/accept", response_model=LinkOut)
def accept_link(link_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    _dealer_link_or_404(db, user.id, link_id)
    return serialize_link(db, approve_link(db, link_id, approver_role=ROLE_DEALER))


@router.post("/links/{link_id}/reject", response_model=LinkOut)
def reject_link_route(
    link_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    _dealer_link_or_404(db, user.id, link_id)
    return serialize_link(db, reject_link(db, link_id, rejecter_role=ROLE_DEALER))


@router.post("/links/{link_id}/revoke", response_model=LinkOut)
def revoke_link_route(
    link_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    _dealer_link_or_404(db, user.id, link_id)
    return serialize_link(db, revoke_link(db, link_id))


# ---------------------------------------------------------------- properties (linked only)
@router.get("/properties", response_model=list[PropertyOut])
def dealer_properties(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    ids = covered_property_ids(db, user.id)
    if not ids:
        return []
    return db.query(Property).filter(Property.id.in_(ids)).order_by(Property.id.desc()).all()


@router.get("/properties/{property_id}", response_model=PropertyOut)
def dealer_property(
    property_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    return require_dealer_link_to_property(db, user.id, property_id)


# ---------------------------------------------------------------- listings (linked properties only)
@router.get("/listings", response_model=list[ListingOut])
def list_listings(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    rows = (
        db.query(PropertyListing)
        .filter(PropertyListing.listed_by == user.id)
        .order_by(PropertyListing.id.desc())
        .all()
    )
    return [_serialize_listing(db, row) for row in rows]


@router.post("/listings", response_model=ListingOut, status_code=201)
def create_listing(
    payload: ListingCreate, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    require_dealer_link_to_property(db, user.id, payload.property_id)
    existing = (
        db.query(PropertyListing).filter(PropertyListing.property_id == payload.property_id).first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Property is already listed")
    row = PropertyListing(
        property_id=payload.property_id,
        is_vacant=payload.is_vacant,
        listed_by=user.id,
        listing_notes=payload.listing_notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_listing(db, row)


@router.put("/listings/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    user: User = Depends(dealer_only),
    db: Session = Depends(get_db),
):
    row = (
        db.query(PropertyListing)
        .filter(PropertyListing.id == listing_id, PropertyListing.listed_by == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return _serialize_listing(db, row)


@router.delete("/listings/{listing_id}")
def delete_listing(
    listing_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    row = (
        db.query(PropertyListing)
        .filter(PropertyListing.id == listing_id, PropertyListing.listed_by == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- inquiries (own only)
@router.get("/inquiries", response_model=list[InquiryOut])
def list_inquiries(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Inquiry)
        .filter(Inquiry.dealer_id == user.id)
        .order_by(Inquiry.id.desc())
        .all()
    )
    return [_serialize_inquiry(db, row) for row in rows]


@router.post("/inquiries", response_model=InquiryOut, status_code=201)
def create_inquiry(
    payload: InquiryCreate, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    require_dealer_link_to_property(db, user.id, payload.property_id)
    if payload.status not in (INQUIRY_NEW, INQUIRY_VIEWING, INQUIRY_CLOSED, INQUIRY_LOST):
        raise HTTPException(status_code=400, detail="Invalid inquiry status")
    row = Inquiry(dealer_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_inquiry(db, row)


@router.put("/inquiries/{inquiry_id}", response_model=InquiryOut)
def update_inquiry(
    inquiry_id: int,
    payload: InquiryUpdate,
    user: User = Depends(dealer_only),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Inquiry)
        .filter(Inquiry.id == inquiry_id, Inquiry.dealer_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in (
        INQUIRY_NEW,
        INQUIRY_VIEWING,
        INQUIRY_CLOSED,
        INQUIRY_LOST,
    ):
        raise HTTPException(status_code=400, detail="Invalid inquiry status")
    for field, value in updates.items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return _serialize_inquiry(db, row)


@router.delete("/inquiries/{inquiry_id}")
def delete_inquiry(
    inquiry_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    row = (
        db.query(Inquiry)
        .filter(Inquiry.id == inquiry_id, Inquiry.dealer_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- commissions
@router.get("/commissions", response_model=list[CommissionOut])
def list_commissions(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Commission)
        .filter(Commission.dealer_id == user.id)
        .order_by(Commission.id.desc())
        .all()
    )
    return [_serialize_commission(db, row) for row in rows]


@router.post("/commissions", response_model=CommissionOut, status_code=201)
def create_commission(
    payload: CommissionCreate, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    prop = require_dealer_link_to_property(db, user.id, payload.property_id)
    row = Commission(
        dealer_id=user.id,
        property_id=payload.property_id,
        landlord_id=prop.landlord_id,
        amount=payload.amount,
        deal_closed_date=payload.deal_closed_date,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_commission(db, row)


# ---------------------------------------------------------------- dashboard summary
@router.get("/dashboard/summary", response_model=DealerSummaryOut)
def dashboard_summary(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    landlord_ids = linked_landlord_ids(db, user.id)
    covered_ids = covered_property_ids(db, user.id)
    properties = db.query(Property).filter(Property.id.in_(covered_ids)).all() if covered_ids else []
    vacant = sum(1 for p in properties if not p.is_occupied)
    open_inquiries = (
        db.query(Inquiry)
        .filter(
            Inquiry.dealer_id == user.id,
            Inquiry.status.in_([INQUIRY_NEW, INQUIRY_VIEWING]),
        )
        .count()
    )
    pending_total = sum(
        c.amount
        for c in db.query(Commission)
        .filter(Commission.dealer_id == user.id, Commission.status == COMMISSION_PENDING)
        .all()
    )
    recent_inquiries = (
        db.query(Inquiry)
        .filter(Inquiry.dealer_id == user.id)
        .order_by(Inquiry.id.desc())
        .limit(5)
        .all()
    )
    recent_listings = (
        db.query(PropertyListing)
        .filter(PropertyListing.listed_by == user.id)
        .order_by(PropertyListing.id.desc())
        .limit(5)
        .all()
    )
    return {
        "total_linked_landlords": len(landlord_ids),
        "total_properties": len(properties),
        "vacant_count": vacant,
        "open_inquiries_count": open_inquiries,
        "pending_commission_total": pending_total,
        "recent_inquiries": [_serialize_inquiry(db, r) for r in recent_inquiries],
        "recent_listings": [_serialize_listing(db, r) for r in recent_listings],
    }


# ---------------------------------------------------------------- agreements
def _serialize_agreement(db: Session, row: Agreement) -> AgreementOut:
    item = AgreementOut.model_validate(row)
    item.property_title = row.property.title if row.property else None
    item.dealer_name = row.dealer.name if row.dealer else None
    profile = (
        db.query(DealerProfile).filter(DealerProfile.user_id == row.dealer_id).first()
    )
    item.dealer_business_name = (
        profile.business_name if profile and profile.business_name else None
    )
    return item


def _get_own_agreement(db: Session, dealer_id: int, agreement_id: int) -> Agreement:
    row = (
        db.query(Agreement)
        .filter(Agreement.id == agreement_id, Agreement.dealer_id == dealer_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return row


@router.post("/agreements", response_model=AgreementOut, status_code=201)
def create_agreement(
    payload: AgreementCreate, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    landlord_id = None
    if payload.property_id is not None:
        prop = require_dealer_link_to_property(db, user.id, payload.property_id)
        landlord_id = prop.landlord_id
    row = Agreement(
        dealer_id=user.id,
        property_id=payload.property_id,
        landlord_id=landlord_id,
        title=payload.title,
        content=payload.content,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_agreement(db, row)


@router.get("/agreements", response_model=list[AgreementOut])
def list_agreements(user: User = Depends(dealer_only), db: Session = Depends(get_db)):
    rows = (
        db.query(Agreement)
        .filter(Agreement.dealer_id == user.id)
        .order_by(Agreement.id.desc())
        .all()
    )
    return [_serialize_agreement(db, r) for r in rows]


@router.get("/agreements/{agreement_id}", response_model=AgreementOut)
def get_agreement(
    agreement_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    return _serialize_agreement(db, _get_own_agreement(db, user.id, agreement_id))


@router.delete("/agreements/{agreement_id}", status_code=204)
def delete_agreement(
    agreement_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    row = _get_own_agreement(db, user.id, agreement_id)
    db.delete(row)
    db.commit()
    return None


@router.get("/agreements/{agreement_id}/pdf")
def download_agreement_pdf(
    agreement_id: int, user: User = Depends(dealer_only), db: Session = Depends(get_db)
):
    row = _get_own_agreement(db, user.id, agreement_id)
    item = _serialize_agreement(db, row)
    dealer_title = item.dealer_business_name or item.dealer_name or user.name
    pdf_bytes = render_agreement_pdf(
        dealer_title=dealer_title,
        agreement_title=row.title,
        content=row.content,
        property_title=item.property_title,
        landlord_name=row.landlord.name if row.landlord else None,
        created_at=row.created_at,
    )
    filename = f"rental-agreement-{row.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
