from typing import Optional
from sqlmodel import SQLModel
from datetime import datetime

class UserCreate(SQLModel):
    name: str

class UserRead(SQLModel):
    id: str
    name: str

class UserUpdate(SQLModel):
    name: Optional[str] = None

class MedCreate(SQLModel):
    name: str
    halfLifeDays: float
    freqDays: int

class MedRead(SQLModel):
    id: str
    name: str
    halfLifeDays: float
    freqDays: int

class MedUpdate(SQLModel):
    name: Optional[str] = None
    halfLifeDays: Optional[float] = None
    freqDays: Optional[int] = None

class ShotCreate(SQLModel):
    userId: str
    medId: str
    doseMg: float
    when: datetime

class ShotRead(SQLModel):
    id: str
    userId: str
    medId: str
    doseMg: float
    when: datetime

class ShotUpdate(SQLModel):
    userId: Optional[str] = None
    medId: Optional[str] = None
    doseMg: Optional[float] = None
    when: Optional[datetime] = None

class WeightCreate(SQLModel):
    userId: str
    kg: float
    when: datetime

class WeightRead(SQLModel):
    id: str
    userId: str
    kg: float
    when: datetime

class WeightUpdate(SQLModel):
    userId: Optional[str] = None
    kg: Optional[float] = None
    when: Optional[datetime] = None
