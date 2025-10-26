from typing import Optional
from sqlmodel import SQLModel

class TodoCreate(SQLModel):
    title: str

class TodoRead(SQLModel):
    id: int
    title: str
    completed: bool

class TodoUpdate(SQLModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
