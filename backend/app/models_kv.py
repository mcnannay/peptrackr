from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, JSON

class KV(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: Any = Field(sa_column=Column(JSON))
