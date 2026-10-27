"""Pydantic request/response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    password: str = Field(min_length=6)
    role: str  # landlord | tenant | dealer


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: str
    role: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PropertyCreate(BaseModel):
    title: str
    address: str
    area: str = ""
    city: str = "Lahore"
    property_type: str = "house"
    monthly_rent: float = Field(gt=0)
    is_occupied: bool = False


class PropertyUpdate(BaseModel):
    title: str | None = None
    address: str | None = None
    area: str | None = None
    city: str | None = None
    property_type: str | None = None
    monthly_rent: float | None = None
    is_occupied: bool | None = None


class PropertyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    landlord_id: int
    title: str
    address: str
    area: str
    city: str
    property_type: str
    monthly_rent: float
    is_occupied: bool
    created_at: datetime


class TenancyCreate(BaseModel):
    property_id: int
    tenant_email: str
    monthly_rent: float = Field(gt=0)
    due_day: int = Field(ge=1, le=31)
    start_date: date


class TenancyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    property_id: int
    tenant_id: int
    landlord_id: int
    monthly_rent: float
    due_day: int
    start_date: date
    status: str
    created_at: datetime
    property_title: str | None = None
    tenant_name: str | None = None


class RentPaymentCreate(BaseModel):
    tenancy_id: int
    amount: float = Field(gt=0)
    due_date: date


class RentPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tenancy_id: int
    amount: float
    due_date: date
    paid_date: date | None
    status: str
    created_at: datetime


class RentSummaryOut(BaseModel):
    received: float
    pending: float
    total_income: float
    paid_count: int
    pending_count: int


class ComplaintCreate(BaseModel):
    property_id: int
    title: str
    description: str = ""


class ComplaintUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None  # landlord side: open | in_progress | resolved


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    property_id: int
    tenant_id: int
    landlord_id: int
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    property_title: str | None = None
    tenant_name: str | None = None


class DealerProfileCreate(BaseModel):
    business_name: str
    phone: str = ""
    areas_served: str = ""


class DealerProfileUpdate(BaseModel):
    business_name: str | None = None
    phone: str | None = None
    areas_served: str | None = None


class DealerProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    business_name: str
    phone: str
    areas_served: str
    created_at: datetime


class LinkInviteByEmail(BaseModel):
    email: str
    property_id: int | None = None


class LinkRequest(BaseModel):
    landlord_id: int
    property_id: int | None = None


class LinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    landlord_id: int
    dealer_id: int
    property_id: int | None
    status: str
    initiated_by: str
    created_at: datetime
    landlord_name: str | None = None
    dealer_name: str | None = None
    dealer_business_name: str | None = None
    property_title: str | None = None


class ListingCreate(BaseModel):
    property_id: int
    is_vacant: bool = True
    listing_notes: str = ""


class ListingUpdate(BaseModel):
    is_vacant: bool | None = None
    listing_notes: str | None = None


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    property_id: int
    is_vacant: bool
    listed_by: int
    listing_notes: str
    created_at: datetime
    property_title: str | None = None


class InquiryCreate(BaseModel):
    property_id: int
    prospective_tenant_name: str
    contact_number: str
    notes: str = ""
    status: str = "new"
    viewing_date: datetime | None = None


class InquiryUpdate(BaseModel):
    prospective_tenant_name: str | None = None
    contact_number: str | None = None
    notes: str | None = None
    status: str | None = None
    viewing_date: datetime | None = None


class InquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dealer_id: int
    property_id: int
    prospective_tenant_name: str
    contact_number: str
    notes: str
    status: str
    viewing_date: datetime | None
    created_at: datetime
    updated_at: datetime
    property_title: str | None = None


class CommissionCreate(BaseModel):
    property_id: int
    amount: float = Field(gt=0)
    deal_closed_date: date | None = None
    notes: str = ""


class CommissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dealer_id: int
    property_id: int
    landlord_id: int
    amount: float
    status: str
    deal_closed_date: date | None
    notes: str
    created_at: datetime
    property_title: str | None = None
    dealer_name: str | None = None


class AgreementCreate(BaseModel):
    title: str
    content: str
    property_id: int | None = None


class AgreementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dealer_id: int
    property_id: int | None
    landlord_id: int | None
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    property_title: str | None = None
    dealer_name: str | None = None
    dealer_business_name: str | None = None


class DealerSummaryOut(BaseModel):
    total_linked_landlords: int
    total_properties: int
    vacant_count: int
    open_inquiries_count: int
    pending_commission_total: float
    recent_inquiries: list[InquiryOut] = []
    recent_listings: list[ListingOut] = []
