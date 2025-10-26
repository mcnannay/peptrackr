from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
from .routers import users, meds, shots, weights, backup
import os

app = FastAPI(title="PepTrackr API", version="0.1.0")

@app.on_event("startup")
def _startup():
    init_db()

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
if origins == ["*"]:
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
else:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status":"ok"}

app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(meds.router, prefix="/api/v1", tags=["meds"])
app.include_router(shots.router, prefix="/api/v1", tags=["shots"])
app.include_router(weights.router, prefix="/api/v1", tags=["weights"])
app.include_router(backup.router, prefix="/api/v1", tags=["backup"])
