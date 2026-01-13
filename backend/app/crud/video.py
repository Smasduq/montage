from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models import models
from app.schemas import schemas

def get_videos(db: Session, video_type: str = None, status: str = "approved", current_user_id: int = None):
    # Safe Mode: Basic query first
    query = db.query(models.Video).options(joinedload(models.Video.owner))
    if video_type:
        query = query.filter(models.Video.video_type == video_type)
    if status:
        query = query.filter(models.Video.status == status)
    
    videos = query.all()
    # Populate calculated fields explicitly
    for video in videos:
        try:
            video.likes_count = db.query(models.Like).filter(models.Like.video_id == video.id).count()
            video.comments_count = db.query(models.Comment).filter(models.Comment.video_id == video.id).count()
            if current_user_id:
                existing_like = db.query(models.Like).filter(models.Like.video_id == video.id, models.Like.user_id == current_user_id).first()
                video.liked_by_user = existing_like is not None
            else:
                video.liked_by_user = False
        except Exception as e:
            print(f"Error calculating counts for video {video.id}: {e}")
            video.likes_count = 0
            video.comments_count = 0
            video.liked_by_user = False
    return videos

def search_videos(db: Session, query_str: str, status: str = "approved", current_user_id: int = None):
    query = db.query(models.Video).options(joinedload(models.Video.owner))
    if query_str:
        # Improved search matching: search for each word separately to be more inclusive
        words = query_str.split()
        if words:
            from sqlalchemy import or_
            word_filters = [models.Video.title.ilike(f"%{word}%") for word in words]
            # Also search for the exact phrase for higher relevance
            word_filters.append(models.Video.title.ilike(f"%{query_str}%"))
            query = query.filter(or_(*word_filters))
    if status:
        query = query.filter(models.Video.status == status)
    
    videos = query.all()
    for video in videos:
        try:
            video.likes_count = db.query(models.Like).filter(models.Like.video_id == video.id).count()
            video.comments_count = db.query(models.Comment).filter(models.Comment.video_id == video.id).count()
            if current_user_id:
                existing_like = db.query(models.Like).filter(models.Like.video_id == video.id, models.Like.user_id == current_user_id).first()
                video.liked_by_user = existing_like is not None
            else:
                video.liked_by_user = False
        except Exception as e:
            print(f"Error in search counts {video.id}: {e}")
    return videos

def get_video(db: Session, video_id: int, current_user_id: int = None):
    # Safe Mode: Basic query
    video = db.query(models.Video).options(joinedload(models.Video.owner)).filter(models.Video.id == video_id).first()
    if video:
        try:
            video.likes_count = db.query(models.Like).filter(models.Like.video_id == video.id).count()
            video.comments_count = db.query(models.Comment).filter(models.Comment.video_id == video.id).count()
            if current_user_id:
                existing_like = db.query(models.Like).filter(models.Like.video_id == video.id, models.Like.user_id == current_user_id).first()
                video.liked_by_user = existing_like is not None
            else:
                video.liked_by_user = False
        except Exception as e:
            print(f"Error calculating counts for video {video.id}: {e}")

    return video

def create_video(db: Session, video: schemas.VideoCreate, user_id: int):
    db_video = models.Video(**video.model_dump(), owner_id=user_id)
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video

def create_post(db: Session, post: schemas.PostCreate, user_id: int):
    db_post = models.Post(**post.model_dump(), owner_id=user_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    db.refresh(db_post)
    return db_post

def toggle_like(db: Session, video_id: int, user_id: int):
    existing_like = db.query(models.Like).filter(models.Like.video_id == video_id, models.Like.user_id == user_id).first()
    if existing_like:
        db.delete(existing_like)
        liked = False
    else:
        new_like = models.Like(video_id=video_id, user_id=user_id)
        db.add(new_like)
        liked = True
    db.commit()
    return liked

def increment_share(db: Session, video_id: int):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if video:
        video.shares += 1
        db.commit()
        db.refresh(video)
    return video

def increment_view(db: Session, video_id: int, user_id: int = None):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        return None

    if user_id:
        # Check daily limit
        import datetime
        today = datetime.datetime.now().date()
        view_count = db.query(models.View).filter(
            models.View.video_id == video_id,
            models.View.user_id == user_id,
            func.date(models.View.created_at) == today
        ).count()

        if view_count >= 5:
            return video
        
        # Record view
        new_view = models.View(video_id=video_id, user_id=user_id)
        db.add(new_view)
    
    video.views += 1
    db.commit()
    db.refresh(video)
    return video

def get_posts(db: Session):
    return db.query(models.Post).all()

def get_ads(db: Session):
    return db.query(models.SponsoredAd).filter(models.SponsoredAd.is_active == True).all()

def create_comment(db: Session, comment: schemas.CommentCreate, video_id: int, user_id: int):
    db_comment = models.Comment(
        **comment.model_dump(),
        video_id=video_id,
        owner_id=user_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_comments(db: Session, video_id: int):
    return db.query(models.Comment).options(joinedload(models.Comment.owner)).filter(models.Comment.video_id == video_id).all()
