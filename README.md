# RentAasan

Rental & property management web app for small landlords in Pakistan.
Roles: **landlord**, **tenant**, **dealer** (property dealer).

Features: landlord dashboard (rent received / pending / total income),
automated rent tracking, tenant complaint portal, and a dealer role where
dealers only ever see landlords and properties they are explicitly linked
to — enforced at the API layer, never just hidden in the UI.

## Stack

- Backend: Python 3.12, FastAPI, SQLAlchemy (SQLite by default, Postgres
  via `DATABASE_URL`), JWT auth (python-jose), passlib + bcrypt.
- Frontend: React 18 + Vite, plain CSS, react-router-dom.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY (and DATABASE_URL for Postgres)
uvicorn app.main:app --reload   # API at http://localhost:8000
```

Smoke test (isolated in-memory DB, safe to run any time):

```bash
python -m tests.test_smoke
```

It covers: register → login → dealer gets 403 on an unlinked property →
dealer invites landlord → dealer cannot approve their own request →
landlord approves → dealer can access → revoke → 403 again.

## Frontend

```bash
cd frontend
npm install
npm run dev                     # app at http://localhost:5173
npm run build                   # production build
```

The API base URL comes from `VITE_API_URL` and defaults to
`http://localhost:8000`. Currency is defined once in
`frontend/src/constants.js` (PKR) and used everywhere money is shown.

## Dealer linking — how it works

1. Either side starts it: a landlord invites a dealer by email, or a
   dealer invites/requests a landlord by email (or landlord id).
2. The link is `pending` until the **other** side approves it
   (the creator can never approve their own request). Either side can
   reject a pending link or revoke an active one.
3. A link can cover one property (`property_id` set) or all of a
   landlord's properties (`property_id` NULL).
4. Every dealer endpoint that touches a landlord or property checks for
   an ACTIVE link first; no link means 403, even with a guessed ID.

## Project layout

```
backend/
  app/
    main.py            FastAPI app + CORS + router wiring
    config.py          env settings (SECRET_KEY, DATABASE_URL)
    database.py        engine / session
    models.py          all tables
    schemas.py         Pydantic request/response models
    auth.py            JWT, password hashing, role dependencies
    deps.py            dealer scoping helpers (the API-layer guard)
    link_service.py    link state machine (pending/active/revoked)
    routers/           auth, landlords, tenants, dealers
  tests/test_smoke.py  end-to-end scoping smoke test
frontend/
  src/
    api.js             fetch wrapper (JWT from localStorage)
    constants.js       CURRENCY = PKR + formatter
    AuthContext.jsx    login/register/session
    ProtectedRoute.jsx role-gated routes
    components/        Layout, StatusBadge (one color mapping)
    pages/             Login, Register, Landlord/Tenant/Dealer dashboards,
                       MyLandlords, DealerProperties, Inquiries, Commissions
```

## Deployment (all free tiers)

### Database — Supabase (free Postgres)
Create a project at supabase.com. No manual SQL is needed: the backend
creates all 10 tables automatically on first boot
(`Base.metadata.create_all` in `backend/app/main.py`). Copy the Postgres
connection string from Project Settings → Database (URI format) and use it
as `DATABASE_URL` below. If the connection fails, append `?sslmode=require`.

### Backend — Render (free tier)
In Render: New → Blueprint → select this repo (`render.yaml` is picked up
automatically). Then set in the Render dashboard:
- `DATABASE_URL` — Supabase connection string (see above)
- `CORS_ORIGINS` — the Netlify frontend URL (set this after the frontend
  is live, then redeploy the backend)
- `SECRET_KEY` — generated automatically by Render

Note: Render's free service sleeps when idle, so the first request after a
while can take ~a minute. Do NOT use SQLite in production on Render — its
filesystem is ephemeral and the database file would be lost on restart.

### Frontend — Netlify (free tier)
In Netlify: Add new site → Import from GitHub → select this repo
(`netlify.toml` is picked up automatically). Then set in Site settings →
Environment variables:
- `VITE_API_URL` — the deployed Render backend URL
  (e.g. `https://rentaasan-backend.onrender.com`)

Trigger a redeploy after setting it, because Vite embeds the API URL at
build time.
