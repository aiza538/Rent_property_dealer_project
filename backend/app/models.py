"""Database models for RentAasan.

Roles and statuses are stored as plain strings (validated at the API
layer) so the same code works unchanged on SQLite and Postgres.
"""

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# Role / status vocabularies (single source of truth for the backend).
ROLE_LANDLORD = "landlord"
ROLE_TENANT = "tenant"
ROLE_DEALER = "dealer"
ROLES = (ROLE_LANDLORD, ROLE_TENANT, ROLE_DEALER)

LINK_PENDING = "pending"
LINK_ACTIVE = "active"
LINK_REVOKED = "revoked"
LINK_STATUSES = (LINK_PENDING, LINK_ACTIVE, LINK_REVOKED)

TENANCY_ACTIVE = "active"
TENANCY_ENDED = "ended"

PAYMENT_PENDING = "pending"
PAYMENT_PAID = "paid"
PAYMENT_OVERDUE = "overdue"

COMPLAINT_OPEN = "open"
COMPLAINT_IN_PROGRESS = "in_progress"
COMPLAINT_RESOLVED = "resolved"

INQUIRY_NEW = "new"
INQUIRY_VIEWING = "viewing_scheduled"
INQUIRY_CLOSED = "closed"
INQUIRY_LOST = "lost"

COMMISSION_PENDING = "pending"
COMMISSION_PAID = "paid"


def _now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    properties = relationship("Property", back_populates="landlord", foreign_keys="Property.landlord_id")
    dealer_profile = relationship("DealerProfile", back_populates="user", uselist=False)


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    area: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(120), nullable=False, default="Lahore")
    property_type: Mapped[str] = mapped_column(String(80), nullable=False, default="house")
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    is_occupied: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    landlord = relationship("User", back_populates="properties", foreign_keys=[landlord_id])
    tenancies = relationship("Tenancy", back_populates="property")
    listings = relationship("PropertyListing", back_populates="property")


class Tenancy(Base):
    __tablename__ = "tenancies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=TENANCY_ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    property = relationship("Property", back_populates="tenancies")
    tenant = relationship("User", foreign_keys=[tenant_id])
    landlord = relationship("User", foreign_keys=[landlord_id])
    payments = relationship("RentPayment", back_populates="tenancy")


class RentPayment(Base):
    __tablename__ = "rent_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenancy_id: Mapped[int] = mapped_column(ForeignKey("tenancies.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PAYMENT_PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    tenancy = relationship("Tenancy", back_populates="payments")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=COMPLAINT_OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    property = relationship("Property")
    tenant = relationship("User", foreign_keys=[tenant_id])
    landlord = relationship("User", foreign_keys=[landlord_id])


class DealerProfile(Base):
    __tablename__ = "dealer_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    # Comma-separated list of areas served, e.g. "Johar Town, DHA Phase 5".
    areas_served: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    user = relationship("User", back_populates="dealer_profile")


class LandlordDealerLink(Base):
    """Explicit link between a landlord and a dealer.

    ``property_id`` NULL means the dealer manages ALL of the landlord's
    properties. ``initiated_by`` records which side created the pending
    link, so only the *other* side can approve it (a dealer must never
    be able to approve their own request).
    """

    __tablename__ = "landlord_dealer_links"
    __table_args__ = (
        UniqueConstraint("landlord_id", "dealer_id", "property_id", name="uq_landlord_dealer_property"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=LINK_PENDING)
    initiated_by: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    landlord = relationship("User", foreign_keys=[landlord_id])
    dealer = relationship("User", foreign_keys=[dealer_id])
    property = relationship("Property")


class PropertyListing(Base):
    __tablename__ = "property_listings"
    __table_args__ = (UniqueConstraint("property_id", name="uq_listing_property"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, index=True)
    is_vacant: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    listed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    listing_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    property = relationship("Property", back_populates="listings")
    dealer = relationship("User", foreign_keys=[listed_by])


class Inquiry(Base):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, index=True)
    prospective_tenant_name: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(40), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=INQUIRY_NEW)
    viewing_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    dealer = relationship("User", foreign_keys=[dealer_id])
    property = relationship("Property")


class Commission(Base):
    __tablename__ = "commissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), nullable=False, index=True)
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=COMMISSION_PENDING)
    deal_closed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    dealer = relationship("User", foreign_keys=[dealer_id])
    property = relationship("Property")
    landlord = relationship("User", foreign_keys=[landlord_id])


class Agreement(Base):
    """A rental agreement drafted by a dealer.

    The dealer writes free-form content; the PDF layout (dealer title,
    agreement title, date, property) is applied when it is downloaded.
    """

    __tablename__ = "agreements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    property_id: Mapped[int | None] = mapped_column(ForeignKey("properties.id"), nullable=True)
    landlord_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    dealer = relationship("User", foreign_keys=[dealer_id])
    property = relationship("Property")
    landlord = relationship("User", foreign_keys=[landlord_id])
