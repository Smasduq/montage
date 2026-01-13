from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.crud import user as crud_user
from app.schemas import schemas
from app.models import models
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core import config

router = APIRouter()

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserUpdateResponse)
def update_user_me(
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if username is taken if changing
    if user_in.username and user_in.username != current_user.username:
        existing_user = crud_user.get_user_by_username(db, username=user_in.username)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already registered"
            )
    
    updated_user = crud_user.update_user(db, user_id=current_user.id, user_update=user_in)
    
    # If username changed, generate new token
    access_token = None
    if user_in.username and user_in.username != current_user.username:
        from app.core.security import create_access_token
        from app.core import config
        from datetime import timedelta
        
        access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_in.username}, expires_delta=access_token_expires
        )
        
    return {"user": updated_user, "access_token": access_token}

@router.get("/profile/{username}", response_model=schemas.UserProfile)
def get_profile(
    username: str, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    current_user_id = current_user.id if current_user else None
    profile = crud_user.get_user_profile(db, username=username, current_user_id=current_user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile

@router.post("/follow/{user_id}")
def follow_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    is_following = crud_user.toggle_follow(db, follower_id=current_user.id, followed_id=user_id)
    return {"is_following": is_following}

@router.get("/search", response_model=schemas.UnifiedSearchResponse)
def search_unified(
    q: str = "", 
    db: Session = Depends(get_db)
):
    if not q:
        return {"videos": [], "users": []}
    
    # Simple search for users and videos
    users = db.query(models.User).filter(
        (models.User.username.ilike(f"%{q}%")) | 
        (models.User.full_name.ilike(f"%{q}%"))
    ).limit(10).all()
    
    from app.crud import video as crud_video
    videos = crud_video.search_videos(db, query_str=q)
    
    return {"videos": videos, "users": users}
@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    import os
    import shutil
    from uuid import uuid4
    
    file_ext = file.filename.split(".")[-1]
    file_name = f"profiles/{uuid4()}.{file_ext}"
    
    from app.core.storage import s3_client
    
    if not config.S3_BUCKET_NAME:
         # Fallback to local if no S3 configured or raise error?
         # For now, let's assume S3 is desired.
         # But to prevent crashing if user didn't set env yet:
         raise HTTPException(status_code=500, detail="Server storage not configured")

    avatar_url = s3_client.upload_fileobj(
        file.file, 
        file_name, 
        content_type=file.content_type
    )
    
    if not avatar_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    current_user.profile_pic = avatar_url
    db.commit()
    db.refresh(current_user)
    
    return {"profile_pic": avatar_url}
