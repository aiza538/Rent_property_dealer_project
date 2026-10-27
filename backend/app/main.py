"""RentAasan FastAPI application."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, dealers, landlords, tenants

Base.metadata.create_all(bind=engine)

app = FastAPI(title="RentAasan API", version="1.0.0")

# Comma-separated list of allowed frontend origins.
# Local default; in production set CORS_ORIGINS to the Netlify site URL,
# e.g. CORS_ORIGINS=https://your-site.netlify.app
_cors_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(landlords.router)
app.include_router(tenants.router)
app.include_router(dealers.router)


@app.get("/health")
def health():
    return {"status": "ok"}
