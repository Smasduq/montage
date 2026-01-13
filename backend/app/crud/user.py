from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.core import security

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate, google_id: str = None, is_onboarded: bool = False):
    hashed_password = security.get_password_hash(user.password) if user.password else None
    # If this is the very first user, make them an admin
    user_count = db.query(models.User).count()
    role = models.UserRole.ADMIN if user_count == 0 else models.UserRole.USER

    db_user = models.User(
        username=user.username, 
        email=user.email,
        full_name=user.full_name,
        profile_pic=user.profile_pic,
        hashed_password=hashed_password,
        google_id=google_id,
        is_onboarded=is_onboarded,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_role(db: Session, user_id: int, role: str):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.role = role
        db.commit()
        db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        if user_update.username:
            db_user.username = user_update.username
        if user_update.full_name:
            db_user.full_name = user_update.full_name
        if user_update.profile_pic:
            db_user.profile_pic = user_update.profile_pic
        if user_update.bio is not None:
            db_user.bio = user_update.bio
        if user_update.is_onboarded is not None:
            db_user.is_onboarded = user_update.is_onboarded
        db.commit()
        db.refresh(db_user)
    return db_user

def get_user_profile(db: Session, username: str, current_user_id: int = None):
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if not db_user:
        return None
    
    from sqlalchemy import func
    followers_count = db.query(models.Follow).filter(models.Follow.followed_id == db_user.id).count()
    following_count = db.query(models.Follow).filter(models.Follow.follower_id == db_user.id).count()
    total_views = db.query(func.sum(models.Video.views)).filter(models.Video.owner_id == db_user.id).scalar() or 0
    
    is_following = False
    if current_user_id:
        is_following = db.query(models.Follow).filter(
            models.Follow.follower_id == current_user_id,
            models.Follow.followed_id == db_user.id
        ).first() is not None

    # approved content only
    from app.crud.video import get_videos
    videos = [v for v in db_user.videos if v.video_type == "home" and v.status == "approved"]
    flash_videos = [v for v in db_user.videos if v.video_type == "flash" and v.status == "approved"]
    posts = db_user.posts

    # Create profile object
    profile_data = {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "profile_pic": db_user.profile_pic,
        "role": db_user.role,
        "is_premium": db_user.is_premium,
        "is_onboarded": db_user.is_onboarded,
        "flash_uploads": db_user.flash_uploads,
        "home_uploads": db_user.home_uploads,
        "bio": db_user.bio,
        "followers_count": followers_count,
        "following_count": following_count,
        "total_views": total_views,
        "videos_count": len(videos),
        "flash_videos_count": len(flash_videos),
        "posts_count": len(posts),
        "videos": videos,
        "flash_videos": flash_videos,
        "posts": posts,
        "is_following": is_following
    }
    return profile_data

def toggle_follow(db: Session, follower_id: int, followed_id: int):
    if follower_id == followed_id:
        return False
    
    existing = db.query(models.Follow).filter(
        models.Follow.follower_id == follower_id,
        models.Follow.followed_id == followed_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return False
    else:
        new_follow = models.Follow(follower_id=follower_id, followed_id=followed_id)
        db.add(new_follow)
        db.commit()
        return True
