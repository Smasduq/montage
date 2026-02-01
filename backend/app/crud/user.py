from sqlalchemy.orm import Session
from sqlalchemy import func
from app.schemas import schemas
from app.core import security
from app.models.models import User, Follow, Video, Post, VerificationCode
from datetime import datetime, timedelta
import random
import string

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate, google_id: str = None, is_onboarded: bool = False):
    hashed_password = security.get_password_hash(user.password) if user.password else None
    
    # Get user count for admin assignment
    user_count = db.query(func.count(User.id)).scalar() or 0
    is_first_user = user_count == 0
    is_requested_admin = user.username.lower() == "smasduq"
    
    role = "admin" if (is_first_user or is_requested_admin) else "user"

    db_user = User(
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
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.role = role
        db.commit()
        db.refresh(user)
    return user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    if user_update.username:
        user.username = user_update.username
    if user_update.full_name:
        user.full_name = user_update.full_name
    if user_update.profile_pic:
        user.profile_pic = user_update.profile_pic
    if user_update.bio is not None:
        user.bio = user_update.bio
    if user_update.is_onboarded is not None:
        user.is_onboarded = user_update.is_onboarded
    
    db.commit()
    db.refresh(user)
    return user

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_profile(db: Session, username: str, current_user_id: int = None):
    db_user = get_user_by_username(db, username)
    if not db_user:
        return None
    
    user_id = db_user.id
    
    # Counts
    followers_count = db.query(func.count(Follow.follower_id)).filter(Follow.followed_id == user_id).scalar() or 0
    following_count = db.query(func.count(Follow.followed_id)).filter(Follow.follower_id == user_id).scalar() or 0
    
    # Total Views
    total_views = db.query(func.sum(Video.views)).filter(Video.owner_id == user_id).scalar() or 0
    
    is_following = False
    if current_user_id:
        is_following = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.followed_id == user_id).first() is not None

    # Videos - Fetch all statuses (Pending, Approved, Failed) for user's own view
    all_videos = db.query(Video).filter(Video.owner_id == user_id).all()
    videos = [v for v in all_videos if v.video_type == "home"]
    flash_videos = [v for v in all_videos if v.video_type == "flash"]
    
    # Posts
    posts = db.query(Post).filter(Post.owner_id == user_id).all()

    profile_data = {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "profile_pic": db_user.profile_pic,
        "is_premium": db_user.is_premium,
        "is_verified": db_user.is_verified,
        "is_onboarded": db_user.is_onboarded,
        "flash_uploads": db_user.flash_uploads,
        "home_uploads": db_user.home_uploads,
        "bio": db_user.bio,
        "role": db_user.role,
        "google_id": db_user.google_id,
        "flash_quota_limit": db_user.flash_quota_limit,
        "home_quota_limit": db_user.home_quota_limit,
        
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
    
    existing = db.query(Follow).filter(Follow.follower_id == follower_id, Follow.followed_id == followed_id).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return False
    else:
        new_follow = Follow(follower_id=follower_id, followed_id=followed_id)
        db.add(new_follow)
        db.commit()
        return True

def create_verification_code(db: Session, email: str):
    # Delete existing codes
    db.query(VerificationCode).filter(VerificationCode.email == email).delete()
    
    code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.now() + timedelta(minutes=10)
    
    ver_code = VerificationCode(
        email=email,
        code=code,
        expires_at=expires_at
    )
    db.add(ver_code)
    db.commit()
    return code

def verify_code(db: Session, email: str, code: str):
    db_code = db.query(VerificationCode).filter(VerificationCode.email == email, VerificationCode.code == code).first()
    if not db_code:
        return False
    
    if db_code.expires_at < datetime.now():
        db.delete(db_code)
        db.commit()
        return False
    
    # Success
    db.delete(db_code)
    db.commit()
    return True
