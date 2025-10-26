from fastapi import APIRouter, HTTPException, Query
from typing import Any, Dict, List, Optional
from sqlmodel import Session, select
from ..db import engine
from ..models_kv import KV

router = APIRouter(prefix="/store")

@router.get("", response_model=Dict[str, Any])
def get_many(keys: Optional[List[str]] = Query(default=None)):
    result: Dict[str, Any] = {}
    with Session(engine) as session:
        if keys is None:
            # Return all keys
            rows = session.exec(select(KV)).all()
            return {row.key: row.value for row in rows}
        for k in keys:
            row = session.get(KV, k)
            if row is not None:
                result[k] = row.value
    return result

@router.get("/{key}", response_model=Any)
def get_one(key: str):
    with Session(engine) as session:
        row = session.get(KV, key)
        if row is None:
            raise HTTPException(status_code=404, detail="Key not found")
        return row.value

@router.put("/{key}", response_model=Dict[str, Any])
def put_one(key: str, value: Any):
    with Session(engine) as session:
        row = session.get(KV, key)
        if row is None:
            row = KV(key=key, value=value)
        else:
            row.value = value
        session.add(row)
        session.commit()
        session.refresh(row)
        return {"ok": True, "key": row.key}

@router.delete("/{key}", response_model=Dict[str, Any])
def delete_one(key: str):
    with Session(engine) as session:
        row = session.get(KV, key)
        if row is None:
            raise HTTPException(status_code=404, detail="Key not found")
        session.delete(row)
        session.commit()
        return {"ok": True}
