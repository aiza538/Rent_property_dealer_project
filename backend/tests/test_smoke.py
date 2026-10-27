"""Smoke test: register -> login -> dealer scoping checks.

Run:  python -m tests.test_smoke   (from the backend directory)
Uses an isolated in-memory SQLite database, never the real one.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (registers models on Base)
from app.database import Base, get_db
from app.main import app

# StaticPool: one shared connection, so the in-memory DB survives across
# the sessions the TestClient opens per request.
engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)


def _register(name, email, role):
    res = client.post(
        "/auth/register",
        json={"name": name, "email": email, "phone": "03000000000", "password": "secret123", "role": role},
    )
    assert res.status_code == 200, res.text
    return res.json()


def _auth(email):
    res = client.post("/auth/login", json={"email": email, "password": "secret123"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def main():
    landlord = _register("Ali Landlord", "ali@landlord.pk", "landlord")
    dealer = _register("Sara Dealer", "sara@dealer.pk", "dealer")
    landlord_h = _auth("ali@landlord.pk")
    dealer_h = _auth("sara@dealer.pk")

    # Landlord creates a property.
    res = client.post(
        "/landlords/properties",
        json={
            "title": "3 Marla House",
            "address": "Street 1, Johar Town",
            "area": "Johar Town",
            "city": "Lahore",
            "property_type": "house",
            "monthly_rent": 25000,
        },
        headers=landlord_h,
    )
    assert res.status_code == 201, res.text
    prop_id = res.json()["id"]

    # Dealer with NO link must get 403 on the property...
    res = client.get(f"/dealers/properties/{prop_id}", headers=dealer_h)
    assert res.status_code == 403, f"expected 403, got {res.status_code}: {res.text}"

    # ...and an empty-but-200 dashboard summary.
    res = client.get("/dealers/dashboard/summary", headers=dealer_h)
    assert res.status_code == 200, res.text
    assert res.json()["total_linked_landlords"] == 0
    assert res.json()["total_properties"] == 0

    # Dealer invites landlord by email -> pending link.
    res = client.post(
        "/dealers/links/invite-landlord",
        json={"email": "ali@landlord.pk"},
        headers=dealer_h,
    )
    assert res.status_code == 201, res.text
    link_id = res.json()["id"]
    assert res.json()["status"] == "pending"

    # Dealer cannot approve their own request.
    res = client.post(f"/dealers/links/{link_id}/accept", headers=dealer_h)
    assert res.status_code == 403, f"self-approve must be 403, got {res.status_code}"

    # Landlord approves -> active, and the property becomes visible.
    res = client.post(f"/landlords/links/{link_id}/approve", headers=landlord_h)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "active"

    res = client.get(f"/dealers/properties/{prop_id}", headers=dealer_h)
    assert res.status_code == 200, res.text
    assert res.json()["title"] == "3 Marla House"

    # Dealer creates a listing + inquiry on the linked property.
    res = client.post(
        "/dealers/listings",
        json={"property_id": prop_id, "is_vacant": True, "listing_notes": "Available now"},
        headers=dealer_h,
    )
    assert res.status_code == 201, res.text

    res = client.post(
        "/dealers/inquiries",
        json={
            "property_id": prop_id,
            "prospective_tenant_name": "Ahmed",
            "contact_number": "03001112222",
            "notes": "Called after seeing the listing",
        },
        headers=dealer_h,
    )
    assert res.status_code == 201, res.text

    # Dashboard now reflects the link.
    res = client.get("/dealers/dashboard/summary", headers=dealer_h)
    data = res.json()
    assert data["total_linked_landlords"] == 1, data
    assert data["total_properties"] == 1, data
    assert data["vacant_count"] == 1, data
    assert data["open_inquiries_count"] == 1, data

    # Invite to a non-existent landlord -> 404 with the specified message.
    res = client.post(
        "/dealers/links/invite-landlord",
        json={"email": "nobody@example.com"},
        headers=dealer_h,
    )
    assert res.status_code == 404, res.text
    assert res.json()["detail"] == "landlord must register first"

    # Landlord revokes -> dealer loses access again.
    res = client.post(f"/landlords/links/{link_id}/revoke", headers=landlord_h)
    assert res.status_code == 200, res.text
    res = client.get(f"/dealers/properties/{prop_id}", headers=dealer_h)
    assert res.status_code == 403, res.text

    print("SMOKE TEST PASSED: register -> login -> 403 without link -> approve -> access -> revoke -> 403")


if __name__ == "__main__":
    main()
