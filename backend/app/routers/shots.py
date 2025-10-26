from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from ..db import engine
from ..models import Shot
from ..schemas import ShotCreate, ShotRead, ShotUpdate
import uuid

router = APIRouter(prefix="/shots")

@router.get("", response_model=list[ShotRead])
def list_shots(userId: str | None = None, page: int = 0, size: int = 50):
    with Session(engine) as s:
        stmt = select(Shot)
        if userId: stmt = stmt.where(Shot.userId == userId)
        stmt = stmt.order_by(Shot.when.desc()).offset(page*size).limit(size)
        return s.exec(stmt).all()

@router.post("", response_model=ShotRead, status_code=201)
def create_shot(payload: ShotCreate):
    with Session(engine) as s:
        sh = Shot(id=str(uuid.uuid4()), **payload.model_dump())
        s.add(sh); s.commit(); s.refresh(sh)
        return sh

@router.patch("/{shot_id}", response_model=ShotRead)
def update_shot(shot_id: str, payload: ShotUpdate):
    with Session(engine) as s:
        sh = s.get(Shot, shot_id)
        if not sh: raise HTTPException(404, "Shot not found")
        for k,v in payload.model_dump(exclude_unset=True).items():
            setattr(sh, k, v)
        s.add(sh); s.commit(); s.refresh(sh)
        return sh

@router.delete("/{shot_id}", status_code=204)
def delete_shot(shot_id: str):
    with Session(engine) as s:
        sh = s.get(Shot, shot_id)
        if not sh: raise HTTPException(404, "Shot not found")
        s.delete(sh); s.commit()
