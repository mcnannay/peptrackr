from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str

class Med(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    halfLifeDays: float
    freqDays: int

class Shot(SQLModel, table=True):
    id: str = Field(primary_key=True)
    userId: str = Field(foreign_key="user.id")
    medId: str = Field(foreign_key="med.id")
    doseMg: float
    when: datetime

class Weight(SQLModel, table=True):
    id: str = Field(primary_key=True)
    userId: str = Field(foreign_key="user.id")
    kg: float
    when: datetime
