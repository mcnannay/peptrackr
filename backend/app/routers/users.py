from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from ..db import engine
from ..models import User
from ..schemas import UserCreate, UserRead, UserUpdate
import uuid

router = APIRouter(prefix="/users")

@router.get("", response_model=list[UserRead])
def list_users():
    with Session(engine) as s:
        return s.exec(select(User)).all()

@router.post("", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate):
    with Session(engine) as s:
        u = User(id=str(uuid.uuid4()), name=payload.name)
        s.add(u); s.commit(); s.refresh(u)
        return u

@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: str, payload: UserUpdate):
    with Session(engine) as s:
        u = s.get(User, user_id)
        if not u: raise HTTPException(404, "User not found")
        if payload.name is not None: u.name = payload.name
        s.add(u); s.commit(); s.refresh(u)
        return u

@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str):
    with Session(engine) as s:
        u = s.get(User, user_id)
        if not u: raise HTTPException(404, "User not found")
        s.delete(u); s.commit()
