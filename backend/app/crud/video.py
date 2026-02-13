from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from app.models.models import Video, Like, Comment, View, User, Post, SponsoredAd
from app.schemas import schemas
from datetime import datetime

def get_videos(db: Session, video_type: str = None, filter_status: str = "approved", current_user_id: int = None):
    query = db.query(Video)
    from datetime import timedelta
    twenty_four_hours_ago = datetime.now() - timedelta(hours=24)
    
    # Filter out failed videos older than 24 hours
    query = query.filter(
        ~((Video.status == "failed") & (Video.failed_at < twenty_four_hours_ago))
    )
    
    if video_type:
        query = query.filter(Video.video_type == video_type)
    if filter_status:
        query = query.filter(Video.status == filter_status)
    
    videos = query.all()
    
    for video in videos:
        video.likes_count = db.query(func.count(Like.video_id)).filter(Like.video_id == video.id).scalar() or 0
        video.comments_count = db.query(func.count(Comment.id)).filter(Comment.video_id == video.id).scalar() or 0
        
        if current_user_id:
            video.liked_by_user = db.query(Like).filter(Like.video_id == video.id, Like.user_id == current_user_id).first() is not None
        else:
            video.liked_by_user = False
            
    return videos

def search_videos(db: Session, query_str: str, status: str = "approved", current_user_id: int = None):
    query = db.query(Video)
    if status:
        query = query.filter(Video.status == status)
    
    if query_str:
        query = query.filter(Video.title.ilike(f"%{query_str}%"))
        
    videos = query.all()
    
    for video in videos:
        video.likes_count = db.query(func.count(Like.video_id)).filter(Like.video_id == video.id).scalar() or 0
        video.comments_count = db.query(func.count(Comment.id)).filter(Comment.video_id == video.id).scalar() or 0
        
        if current_user_id:
            video.liked_by_user = db.query(Like).filter(Like.video_id == video.id, Like.user_id == current_user_id).first() is not None
        else:
            video.liked_by_user = False
            
    return videos

def get_video(db: Session, video_id: int, current_user_id: int = None):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        return None
    
    video.likes_count = db.query(func.count(Like.video_id)).filter(Like.video_id == video_id).scalar() or 0
    video.comments_count = db.query(func.count(Comment.id)).filter(Comment.video_id == video_id).scalar() or 0
    
    if current_user_id:
        video.liked_by_user = db.query(Like).filter(Like.video_id == video_id, Like.user_id == current_user_id).first() is not None
    else:
        video.liked_by_user = False
        
    return video

def create_video(db: Session, video: schemas.VideoCreate, user_id: int):
    # Separate additional fields from model_dump if necessary or assume model matches
    # schemas.VideoCreate has fields that match Video model except processing_key might be handled
    video_data = video.model_dump()
    db_video = Video(**video_data, owner_id=user_id)
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

def create_post(db: Session, post: schemas.PostCreate, user_id: int):
    post_data = post.model_dump()
    db_post = Post(**post_data, owner_id=user_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

def toggle_like(db: Session, video_id: int, user_id: int):
    existing = db.query(Like).filter(Like.video_id == video_id, Like.user_id == user_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return False
    else:
        new_like = Like(video_id=video_id, user_id=user_id)
        db.add(new_like)
        db.commit()
        return True

def increment_share(db: Session, video_id: int):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        video.shares = (video.shares or 0) + 1
        db.commit()
        db.refresh(video)
        return video
    return None

def increment_view(db: Session, video_id: int, user_id: int = None):
    if user_id:
        # Check daily limit
        today = datetime.now().date()
        start_of_day = datetime(today.year, today.month, today.day, 0, 0, 0)
        end_of_day = datetime(today.year, today.month, today.day, 23, 59, 59)
        
        view_count = db.query(func.count(View.id)).filter(
            View.video_id == video_id,
            View.user_id == user_id,
            View.created_at >= start_of_day,
            View.created_at <= end_of_day
        ).scalar() or 0
        
        if view_count >= 5:
            return get_video(db, video_id)
            
        new_view = View(video_id=video_id, user_id=user_id)
        db.add(new_view)
        db.commit() # Commit view insertion first
        
    # Increment view count
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        video.views = (video.views or 0) + 1
        db.commit()
        db.refresh(video)
        return video
    return None

def get_posts(db: Session):
    return db.query(Post).all()

def get_ads(db: Session):
    return db.query(SponsoredAd).filter(SponsoredAd.is_active == True).all()

def create_comment(db: Session, comment: schemas.CommentCreate, video_id: int, user_id: int):
    comment_data = comment.model_dump()
    db_comment = Comment(**comment_data, video_id=video_id, owner_id=user_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_comments(db: Session, video_id: int):
    return db.query(Comment).filter(Comment.video_id == video_id).all()

def delete_video(db: Session, video_id: int):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video:
        db.delete(video)
        db.commit()
        return True
    return False
