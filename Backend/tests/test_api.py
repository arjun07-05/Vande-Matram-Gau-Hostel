import pytest
from datetime import date
from app.models.settings import Settings
from app.models.cow import Cow
from app.models.member import Member
from app.models.milk import MilkEntry

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "wrong@gauhostel.com", "password": "WrongPassword"}
    )
    assert response.status_code == 400

def test_auth_me(client, admin_token):
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testadmin@gauhostel.com"
    assert "password_hash" not in data

def test_cow_crud(client, admin_token):
    # 1. Create Cow via Form data
    cow_form = {
        "cow_number": "COW-TEST-999",
        "cow_name": "Gauri",
        "breed": "Gir",
        "type": "દૂધ આપતી",
        "condition": "તંદુરસ્ત"
    }
    create_res = client.post(
        "/api/v1/cows/",
        data=cow_form,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 200, f"Create cow failed: {create_res.text}"
    cow_data = create_res.json()
    cow_id = cow_data["id"]
    assert cow_data["cow_number"] == "COW-TEST-999"

    # 2. Get Cows List
    list_res = client.get(
        "/api/v1/cows/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    assert any(c["cow_number"] == "COW-TEST-999" for c in list_res.json())

    # 3. Clean up
    del_res = client.delete(
        f"/api/v1/cows/{cow_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_res.status_code == 200

def test_milk_distribution_business_logic(client, admin_token, db_session):
    today = date.today()

    # 1. Setup Settings: Morning Gowal Milk = 2.0, Other Milk = 1.0 (Total deductions = 3.0)
    settings = db_session.query(Settings).first()
    if not settings:
        settings = Settings(
            morning_gowal_milk=2.0,
            evening_gowal_milk=1.5,
            morning_other_milk=1.0,
            evening_other_milk=0.5,
            unit="Liter"
        )
        db_session.add(settings)
    else:
        settings.morning_gowal_milk = 2.0
        settings.morning_other_milk = 1.0
        settings.evening_gowal_milk = 1.5
        settings.evening_other_milk = 0.5
    db_session.commit()

    # 2. Create 2 Cows
    cow1 = Cow(cow_number="C-LOGIC-1", cow_name="Cow 1", type="દૂધ આપતી")
    cow2 = Cow(cow_number="C-LOGIC-2", cow_name="Cow 2", type="દૂધ આપતી")
    db_session.add_all([cow1, cow2])
    db_session.commit()

    # 3. Create 3 Active Members with different preferences
    m_both = Member(name="Member Both", mobile="9800000001", member_number=101, milk_preference="Both", active=True)
    m_morn = Member(name="Member Morning", mobile="9800000002", member_number=102, milk_preference="Morning", active=True)
    m_eve = Member(name="Member Evening", mobile="9800000003", member_number=103, milk_preference="Evening", active=True)
    m_inact = Member(name="Member Inactive", mobile="9800000004", member_number=104, milk_preference="Both", active=False)
    db_session.add_all([m_both, m_morn, m_eve, m_inact])
    db_session.commit()

    # 4. Add Morning Milk: Cow 1 = 10.0L, Cow 2 = 13.0L -> Total = 23.0L
    bulk_milk = {
        "entries": [
            {"cow_id": cow1.id, "date": today.isoformat(), "shift": "Morning", "milk_qty": 10.0},
            {"cow_id": cow2.id, "date": today.isoformat(), "shift": "Morning", "milk_qty": 13.0}
        ]
    }
    milk_res = client.post(
        "/api/v1/milk/",
        json=bulk_milk,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert milk_res.status_code == 200, f"Milk entry failed: {milk_res.text}"

    # 5. Generate Morning Distribution
    # Total Milk = 23.0L
    # Deductions = 2.0 (Gowal) + 1.0 (Other) = 3.0L
    # Distributable = 20.0L
    # Eligible Members for Morning = m_both + m_morn = 2 members (m_eve and m_inact excluded)
    # Milk per member = 20.0 / 2 = 10.0L
    dist_res = client.post(
        f"/api/v1/distribution/generate?target_date={today.isoformat()}&shift=Morning",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert dist_res.status_code == 200, f"Distribution generate failed: {dist_res.text}"
    distributions = dist_res.json()
    assert len(distributions) == 2
    for dist in distributions:
        assert dist["milk_qty"] == 10.0
        assert dist["member_id"] in [m_both.id, m_morn.id]
        assert dist["member_id"] != m_eve.id
        assert dist["member_id"] != m_inact.id

def test_expenses_and_member_payments(client, admin_token, db_session):
    today = date.today()
    # 1. Add Operating Expense
    expense_payload = {
        "title": "ગૌશાળા ભાડું",
        "quantity": 1.0,
        "unit": "મહિનો",
        "price_per_unit": 5000.0,
        "amount": 5000.0,
        "expense_date": today.isoformat(),
        "month_year": today.strftime("%Y-%m"),
        "payment_mode": "Online/UPI",
        "paid_to": "Landlord",
        "remarks": "Monthly Rent"
    }
    exp_res = client.post(
        "/api/v1/expenses/",
        json=expense_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert exp_res.status_code == 200, f"Expense create failed: {exp_res.text}"
    exp_data = exp_res.json()
    assert exp_data["amount"] == 5000.0
    assert exp_data["title"] == "ગૌશાળા ભાડું"
