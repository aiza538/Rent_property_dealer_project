"""Shared LandlordDealerLink workflows used by both sides.

Status machine (validated here, nowhere else):
    pending -> active   (approve, only by the NON-initiator)
    pending -> revoked  (reject by the non-initiator, or cancel by either side)
    active  -> revoked  (revoke by either side)
Anything else -> 400.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import (
    LINK_ACTIVE,
    LINK_PENDING,
    LINK_REVOKED,
    DealerProfile,
    LandlordDealerLink,
    Property,
    User,
)


def _find_duplicate_open_link(db, landlord_id, dealer_id, property_id):
    """An open (pending/active) link for the same trio, if one exists."""
    query = db.query(LandlordDealerLink).filter(
        LandlordDealerLink.landlord_id == landlord_id,
        LandlordDealerLink.dealer_id == dealer_id,
        LandlordDealerLink.status.in_([LINK_PENDING, LINK_ACTIVE]),
    )
    if property_id is None:
        query = query.filter(LandlordDealerLink.property_id.is_(None))
    else:
        query = query.filter(LandlordDealerLink.property_id == property_id)
    return query.first()


def create_link(db, landlord_id, dealer_id, property_id, initiated_by) -> LandlordDealerLink:
    if property_id is not None:
        prop = db.query(Property).filter(Property.id == property_id).first()
        if prop is None:
            raise HTTPException(status_code=404, detail="Property not found")
        if prop.landlord_id != landlord_id:
            raise HTTPException(status_code=400, detail="Property does not belong to this landlord")
    if _find_duplicate_open_link(db, landlord_id, dealer_id, property_id):
        raise HTTPException(status_code=409, detail="An open link already exists for this landlord/dealer/property")
    link = LandlordDealerLink(
        landlord_id=landlord_id,
        dealer_id=dealer_id,
        property_id=property_id,
        status=LINK_PENDING,
        initiated_by=initiated_by,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def _link_or_404(db, link_id) -> LandlordDealerLink:
    link = db.query(LandlordDealerLink).filter(LandlordDealerLink.id == link_id).first()
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


def approve_link(db, link_id, approver_role: str) -> LandlordDealerLink:
    link = _link_or_404(db, link_id)
    if link.status != LINK_PENDING:
        raise HTTPException(status_code=400, detail="Only a pending link can be approved")
    if link.initiated_by == approver_role:
        raise HTTPException(
            status_code=403, detail="The party that created the request cannot approve it"
        )
    link.status = LINK_ACTIVE
    db.commit()
    db.refresh(link)
    return link


def reject_link(db, link_id, rejecter_role: str) -> LandlordDealerLink:
    link = _link_or_404(db, link_id)
    if link.status != LINK_PENDING:
        raise HTTPException(status_code=400, detail="Only a pending link can be rejected")
    if link.initiated_by == rejecter_role:
        raise HTTPException(
            status_code=403, detail="The party that created the request cannot reject it"
        )
    link.status = LINK_REVOKED
    db.commit()
    db.refresh(link)
    return link


def revoke_link(db, link_id) -> LandlordDealerLink:
    link = _link_or_404(db, link_id)
    if link.status == LINK_REVOKED:
        raise HTTPException(status_code=400, detail="Link is already revoked")
    link.status = LINK_REVOKED
    db.commit()
    db.refresh(link)
    return link


def serialize_link(db, link: LandlordDealerLink) -> dict:
    landlord = db.query(User).filter(User.id == link.landlord_id).first()
    dealer = db.query(User).filter(User.id == link.dealer_id).first()
    profile = db.query(DealerProfile).filter(DealerProfile.user_id == link.dealer_id).first()
    prop = None
    if link.property_id is not None:
        prop = db.query(Property).filter(Property.id == link.property_id).first()
    return {
        "id": link.id,
        "landlord_id": link.landlord_id,
        "dealer_id": link.dealer_id,
        "property_id": link.property_id,
        "status": link.status,
        "initiated_by": link.initiated_by,
        "created_at": link.created_at,
        "landlord_name": landlord.name if landlord else None,
        "dealer_name": dealer.name if dealer else None,
        "dealer_business_name": profile.business_name if profile else None,
        "property_title": prop.title if prop else None,
    }
