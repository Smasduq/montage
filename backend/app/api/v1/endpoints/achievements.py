from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core import dependencies
from app.crud import achievement as crud_achievement
from app.schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Achievement])
def read_achievements(
    db: Session = Depends(get_db),
    current_user: dict = Depends(dependencies.get_current_user)
):
    return crud_achievement.get_achievements(db, user_id=current_user.id)
