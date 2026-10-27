"""Dealer scoping helpers — the API-layer authorization core.

A dealer may only touch a landlord or property covered by an ACTIVE
LandlordDealerLink where:
  * link.dealer_id == the dealer's user id, AND
  * link.property_id == the target property, OR
  * link.property_id IS NULL AND link.landlord_id == the target landlord
    (or the landlord of the target property).

No link -> 403, even if the dealer guesses a valid ID. Nothing in the
frontend can bypass this: every dealer route that touches a landlord or
property goes through these helpers.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .models import (
    LINK_ACTIVE,
    LandlordDealerLink,
    Property,
)


def dealer_has_active_link(
    db: Session,
    dealer_id: int,
    landlord_id: int | None = None,
    property_id: int | None = None,
) -> bool:
    query = db.query(LandlordDealerLink).filter(
        LandlordDealerLink.dealer_id == dealer_id,
        LandlordDealerLink.status == LINK_ACTIVE,
    )
    if property_id is not None:
        prop = db.query(Property).filter(Property.id == property_id).first()
        if prop is None:
            return False
        # Direct property link, or landlord-wide link for the property's landlord.
        query = query.filter(
            (LandlordDealerLink.property_id == property_id)
            | (
                (LandlordDealerLink.property_id.is_(None))
                & (LandlordDealerLink.landlord_id == prop.landlord_id)
            )
        )
    if landlord_id is not None:
        query = query.filter(LandlordDealerLink.landlord_id == landlord_id)
    return query.first() is not None


def require_dealer_link_to_landlord(db: Session, dealer_id: int, landlord_id: int) -> None:
    if not dealer_has_active_link(db, dealer_id, landlord_id=landlord_id):
        raise HTTPException(status_code=403, detail="Dealer is not linked to this landlord")


def require_dealer_link_to_property(db: Session, dealer_id: int, property_id: int) -> Property:
    prop = db.query(Property).filter(Property.id == property_id).first()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found")
    if not dealer_has_active_link(db, dealer_id, property_id=property_id):
        raise HTTPException(status_code=403, detail="Dealer is not linked to this property")
    return prop


def covered_property_ids(db: Session, dealer_id: int) -> set[int]:
    """All property ids a dealer may access via ACTIVE links."""
    links = (
        db.query(LandlordDealerLink)
        .filter(
            LandlordDealerLink.dealer_id == dealer_id,
            LandlordDealerLink.status == LINK_ACTIVE,
        )
        .all()
    )
    ids: set[int] = set()
    for link in links:
        if link.property_id is not None:
            ids.add(link.property_id)
        else:
            for prop in db.query(Property).filter(Property.landlord_id == link.landlord_id).all():
                ids.add(prop.id)
    return ids


def linked_landlord_ids(db: Session, dealer_id: int) -> set[int]:
    links = (
        db.query(LandlordDealerLink)
        .filter(
            LandlordDealerLink.dealer_id == dealer_id,
            LandlordDealerLink.status == LINK_ACTIVE,
        )
        .all()
    )
    return {link.landlord_id for link in links}
