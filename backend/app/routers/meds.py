from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from ..db import engine
from ..models import Med
from ..schemas import MedCreate, MedRead, MedUpdate
import uuid

router = APIRouter(prefix="/meds")

@router.get("", response_model=list[MedRead])
def list_meds():
    with Session(engine) as s:
        return s.exec(select(Med)).all()

@router.post("", response_model=MedRead, status_code=201)
def create_med(payload: MedCreate):
    with Session(engine) as s:
        m = Med(id=str(uuid.uuid4()), **payload.model_dump())
        s.add(m); s.commit(); s.refresh(m)
        return m

@router.patch("/{med_id}", response_model=MedRead)
def update_med(med_id: str, payload: MedUpdate):
    with Session(engine) as s:
        m = s.get(Med, med_id)
        if not m: raise HTTPException(404, "Med not found")
        for k,v in payload.model_dump(exclude_unset=True).items():
            setattr(m, k, v)
        s.add(m); s.commit(); s.refresh(m)
        return m

@router.delete("/{med_id}", status_code=204)
def delete_med(med_id: str):
    with Session(engine) as s:
        m = s.get(Med, med_id)
        if not m: raise HTTPException(404, "Med not found")
        s.delete(m); s.commit()
