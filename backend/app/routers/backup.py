from fastapi import APIRouter
from sqlmodel import Session, select
from ..db import engine
from ..models import User, Med, Shot, Weight

router = APIRouter(prefix="/backup")

@router.get("/export")
def export_all():
    with Session(engine) as s:
        return {
            "users": s.exec(select(User)).all(),
            "meds": s.exec(select(Med)).all(),
            "shots": s.exec(select(Shot)).all(),
            "weights": s.exec(select(Weight)).all(),
        }

@router.post("/import")
def import_all(payload: dict):
    with Session(engine) as s:
        for model, key in [(User, "users"), (Med, "meds"), (Shot, "shots"), (Weight, "weights")]:
            if key in payload and isinstance(payload[key], list):
                s.query(model).delete()
                for item in payload[key]:
                    s.add(model(**item))
        s.commit()
        return {"status":"ok"}
