from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional

from app.db.session import get_db
from app.crud import user as crud_user
from app.schemas import schemas
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core import config
from app.models.models import User, Video, Like, Follow

router = APIRouter()

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserUpdateResponse)
def update_user_me(
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
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
    current_user: Optional[schemas.User] = Depends(get_current_user_optional)
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
    current_user: schemas.User = Depends(get_current_user)
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
    
    # Search for users
    users = db.query(User).filter(
        or_(
            User.username.ilike(f"%{q}%"),
            User.full_name.ilike(f"%{q}%")
        )
    ).limit(10).all()
    
    from app.crud import video as crud_video
    videos = crud_video.search_videos(db, query_str=q)
    
    return {"videos": videos, "users": users}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    from uuid import uuid4
    from app.core.storage import s3_client
    
    file_ext = file.filename.split(".")[-1]
    file_name = f"profiles/{uuid4()}.{file_ext}"
    
    avatar_url = None

    if config.B2_BUCKET_NAME:
        avatar_url = s3_client.upload_fileobj(
            file.file, 
            file_name, 
            content_type=file.content_type
        )
    else:
        # Local fallback
        import os
        import shutil
        
        static_dir = config.STATIC_DIR
        profiles_dir = os.path.join(static_dir, "profiles")
        os.makedirs(profiles_dir, exist_ok=True)
        
        local_filename = f"{uuid4()}.{file_ext}"
        local_path = os.path.join(profiles_dir, local_filename)
        
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        avatar_url = f"{config.BASE_URL}/static/profiles/{local_filename}"

    if not avatar_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    # Update user in DB
    current_user.profile_pic = avatar_url
    db.commit()
    db.refresh(current_user)
    
    return {"profile_pic": avatar_url}

@router.get("/me/insights")
def get_user_insights(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    user_id = current_user.id
    
    # Total Views
    total_views = db.query(func.sum(Video.views)).filter(Video.owner_id == user_id).scalar() or 0
    
    # Total Likes - Count likes on videos owned by user
    total_likes = db.query(func.count(Like.user_id)).join(Video).filter(Video.owner_id == user_id).scalar() or 0
    
    # Total Earnings
    total_earnings = db.query(func.sum(Video.earnings)).filter(Video.owner_id == user_id).scalar() or 0.0
    
    # Total Shares
    total_shares = db.query(func.sum(Video.shares)).filter(Video.owner_id == user_id).scalar() or 0
    
    # Video counts
    home_count = db.query(func.count(Video.id)).filter(Video.owner_id == user_id, Video.video_type == "home").scalar() or 0
    flash_count = db.query(func.count(Video.id)).filter(Video.owner_id == user_id, Video.video_type == "flash").scalar() or 0
    
    # Followers/Following
    followers_count = db.query(func.count(Follow.follower_id)).filter(Follow.followed_id == user_id).scalar() or 0
    following_count = db.query(func.count(Follow.followed_id)).filter(Follow.follower_id == user_id).scalar() or 0
    
    return {
        "total_views": total_views,
        "total_likes": total_likes,
        "total_earnings": total_earnings,
        "total_shares": total_shares,
        "home_videos": home_count,
        "flash_videos": flash_count,
        "followers": followers_count,
        "following": following_count
    }
