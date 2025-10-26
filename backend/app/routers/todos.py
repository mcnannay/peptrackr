from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from ..db import engine
from ..models import Todo
from ..schemas import TodoCreate, TodoRead, TodoUpdate

router = APIRouter(prefix="/todos")

@router.get("", response_model=list[TodoRead])
def list_todos():
    with Session(engine) as session:
        todos = session.exec(select(Todo)).all()
        return todos

@router.post("", response_model=TodoRead, status_code=201)
def create_todo(payload: TodoCreate):
    todo = Todo(title=payload.title, completed=False)
    with Session(engine) as session:
        session.add(todo)
        session.commit()
        session.refresh(todo)
        return todo

@router.patch("/{todo_id}", response_model=TodoRead)
def update_todo(todo_id: int, payload: TodoUpdate):
    with Session(engine) as session:
        todo = session.get(Todo, todo_id)
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")
        if payload.title is not None:
            todo.title = payload.title
        if payload.completed is not None:
            todo.completed = payload.completed
        session.add(todo)
        session.commit()
        session.refresh(todo)
        return todo

@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int):
    with Session(engine) as session:
        todo = session.get(Todo, todo_id)
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")
        session.delete(todo)
        session.commit()
        return None
