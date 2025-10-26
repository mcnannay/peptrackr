from sqlmodel import SQLModel, create_engine, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

def init_db():
    from .models import User, Med, Shot, Weight
    SQLModel.metadata.create_all(engine)
    # seed presets if empty
    with Session(engine) as s:
        if not s.query(User).first():
            s.add(User(id="u1", name="User 1"))
        if not s.query(Med).first():
            s.add(Med(id="m1", name="Retatrutide", halfLifeDays=6.0, freqDays=7))
            s.add(Med(id="m2", name="Tirzepatide", halfLifeDays=5.0, freqDays=7))
        s.commit()
