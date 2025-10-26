from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from ..db import engine
from ..models import Weight
from ..schemas import WeightCreate, WeightRead, WeightUpdate
import uuid

router = APIRouter(prefix="/weights")

@router.get("", response_model=list[WeightRead])
def list_weights(userId: str | None = None, page: int = 0, size: int = 50):
    with Session(engine) as s:
        stmt = select(Weight)
        if userId: stmt = stmt.where(Weight.userId == userId)
        stmt = stmt.order_by(Weight.when.desc()).offset(page*size).limit(size)
        return s.exec(stmt).all()

@router.post("", response_model=WeightRead, status_code=201)
def create_weight(payload: WeightCreate):
    with Session(engine) as s:
        w = Weight(id=str(uuid.uuid4()), **payload.model_dump())
        s.add(w); s.commit(); s.refresh(w)
        return w

@router.patch("/{weight_id}", response_model=WeightRead)
def update_weight(weight_id: str, payload: WeightUpdate):
    with Session(engine) as s:
        w = s.get(Weight, weight_id)
        if not w: raise HTTPException(404, "Weight not found")
        for k,v in payload.model_dump(exclude_unset=True).items():
            setattr(w, k, v)
        s.add(w); s.commit(); s.refresh(w)
        return w

@router.delete("/{weight_id}", status_code=204)
def delete_weight(weight_id: str):
    with Session(engine) as s:
        w = s.get(Weight, weight_id)
        if not w: raise HTTPException(404, "Weight not found")
        s.delete(w); s.commit()
