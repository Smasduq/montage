from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import models
from app.schemas import schemas
from app.core.dependencies import admin_only
from app.core import security, config
from app.crud import user as crud_user
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
    
    if user.role != models.UserRole.ADMIN:
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
    current_user: models.User = Depends(admin_only)
):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.get("/stats")
def read_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(admin_only)
):
    user_count = db.query(models.User).count()
    video_count = db.query(models.Video).count()
    premium_count = db.query(models.User).filter(models.User.is_premium == True).count()
    total_views = db.query(models.Video.views).count() # This just counts rows, slightly wrong logic for sum, fixing below
    
    # Correct logic for sum of views
    total_views_sum = 0
    videos = db.query(models.Video).all()
    for v in videos:
        if v.views:
            total_views_sum += v.views

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
    current_user: models.User = Depends(admin_only)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_premium = is_premium
    db.commit()
    db.refresh(user)
    return {"message": f"User {user.username} premium status set to {is_premium}"}
