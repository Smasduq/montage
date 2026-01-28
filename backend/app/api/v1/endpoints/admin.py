from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.schemas import schemas
from app.core.dependencies import admin_only
from app.core import security, config
from app.crud import user as crud_user
from app.models.models import User, Video
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
async def login_for_admin_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = crud_user.get_user_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges required",
        )

    access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users", response_model=List[schemas.User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/stats")
def read_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    user_count = db.query(func.count(User.id)).scalar() or 0
    video_count = db.query(func.count(Video.id)).scalar() or 0
    premium_count = db.query(func.count(User.id)).filter(User.is_premium == True).scalar() or 0
    
    # Sum views
    total_views_sum = db.query(func.sum(Video.views)).scalar() or 0

    return {
        "users": user_count,
        "videos": video_count,
        "premium_users": premium_count,
        "total_views": total_views_sum
    }

@router.post("/promote/{user_id}")
def promote_user(
    user_id: int,
    is_premium: bool = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    user = crud_user.get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_premium = is_premium
    db.commit()
    db.refresh(user)
    
    return {"message": f"User {user.username} premium status set to {is_premium}"}
