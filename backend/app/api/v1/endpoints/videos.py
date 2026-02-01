from typing import List, Optional
import os
import shutil
import tempfile
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.crud import video as crud_video
from app.schemas import schemas
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core import config
from app.core.config import FLASH_QUOTA_LIMIT, HOME_QUOTA_LIMIT
from app.models.models import Video, User

router = APIRouter()

@router.get("/", response_model=List[schemas.Video])
def read_videos(video_type: str = None, db: Session = Depends(get_db), current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_id = current_user.id if current_user else None
    return crud_video.get_videos(db, video_type=video_type, current_user_id=user_id)

@router.get("/search", response_model=List[schemas.Video])
async def search_videos(
    q: Optional[str] = "", 
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    return crud_video.search_videos(db, query_str=q, current_user_id=user_id)

@router.get("/suggestions")
async def get_search_suggestions(q: Optional[str] = "", db: Session = Depends(get_db)):
    if not q or len(q) < 2: return []
    
    # 1. Search Videos (Home & Flash)
    videos = crud_video.search_videos(db, query_str=q)
    
    # 2. Search Users
    from app.models.models import User
    users = db.query(User).filter(User.username.ilike(f"%{q}%")).limit(5).all()
    
    seen = set()
    suggestions = []
    
    # Prioritize users in suggestions
    for u in users:
        val = f"@{u.username}"
        if val not in seen:
            suggestions.append(val)
            seen.add(val)
            
    for v in videos[:10]:
        if v.title not in seen:
            suggestions.append(v.title)
            seen.add(v.title)
            
    return suggestions[:10]

@router.get("/trending-suggestions")
async def get_trending_suggestions(db: Session = Depends(get_db)):
    # 1. High views (Trending)
    trending_videos = db.query(Video).filter(Video.status == "approved").order_by(Video.views.desc()).limit(5).all()
    
    # 2. Recent uploads
    recent_videos = db.query(Video).filter(Video.status == "approved").order_by(Video.created_at.desc()).limit(5).all()
    
    # 3. Popular Creators
    from app.models.models import User
    users = db.query(User).limit(3).all()

    seen = set()
    suggestions = []
    
    for v in trending_videos:
        if v.title not in seen:
            suggestions.append(v.title)
            seen.add(v.title)
            
    for v in recent_videos:
        if v.title not in seen:
            suggestions.append(v.title)
            seen.add(v.title)
            
    for u in users:
        val = f"@{u.username}"
        if val not in seen:
            suggestions.append(val)
            seen.add(val)
            
    return suggestions[:10]

@router.get("/{video_id}", response_model=schemas.Video)
def read_video(video_id: int, db: Session = Depends(get_db), current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_id = current_user.id if current_user else None
    db_video = crud_video.get_video(db, video_id=video_id, current_user_id=user_id)
    if db_video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return db_video


async def background_process_video(
    temp_file_path: str,
    video_type: str,
    title: str,
    video_id: int,
    thumbnail_provided: bool,
    task_id: str
):
    db = SessionLocal()
    try:
        # Phase 1: Communication with Rust Service
        try:
            async with httpx.AsyncClient() as client:
                rust_response = await client.post(
                    f"{config.RUST_SERVICE_URL}/process",
                    json={
                        "video_id": temp_file_path,
                        "target_format": video_type,
                        "skip_thumbnail": thumbnail_provided,
                        "task_id": task_id
                    },
                    timeout=600.0
                )
                
                import asyncio
                max_retries = 300 # 10 minutes with 2s sleep
                retries = 0
                while retries < max_retries:
                    try:
                        status_resp = await client.get(f"{config.RUST_SERVICE_URL}/status/{task_id}")
                        if status_resp.status_code == 200:
                            status_data = status_resp.json()
                            if status_data:
                                if status_data.get("status") == "completed":
                                    break
                                if status_data.get("status") == "error":
                                    raise Exception(f"Rust processing error: {status_data.get('message')}")
                        elif status_resp.status_code == 404:
                             pass
                    except Exception as e:
                        if "Rust processing error" in str(e):
                            raise e
                        print(f"Polling error (try {retries}): {e}")
                    
                    await asyncio.sleep(2)
                    retries += 1
                
                if retries >= max_retries:
                    raise Exception(f"Background processing timed out for task {task_id}")

        except Exception as e:
            print(f"Error in background processing phase: {e}")
            # Rollback quota and mark as failed
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                video.failed_at = func.now()
                owner = db.query(User).filter(User.id == video.owner_id).first()
                if owner:
                    if video.video_type == "flash":
                        owner.flash_uploads = max(0, (owner.flash_uploads or 1) - 1)
                    else:
                        owner.home_uploads = max(0, (owner.home_uploads or 1) - 1)
                db.commit()
            return

        # Phase 2: Post-processing (Moving files and updating DB to approved)
        try:
            # Ensure base filename is safe and unique
            clean_title = "".join([c if c.isalnum() else "_" for c in title])
            timestamp = int(os.path.getmtime(temp_file_path))
            base_filename = f"{clean_title}_{timestamp}"
            
            def save_resolution(suffix):
                src = f"{temp_file_path}_{suffix}.mp4"
                if not os.path.exists(src):
                    return None
                    
                # Local Storage
                dest_dir = os.path.join(config.STATIC_DIR, "videos")
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, f"{base_filename}_{suffix}.mp4")
                shutil.copy2(src, dest_path)
                return f"{config.BASE_URL}/static/videos/{base_filename}_{suffix}.mp4"

            url_480p = save_resolution("480p")
            url_720p = save_resolution("720p")
            url_1080p = save_resolution("1080p")
            url_2k = save_resolution("1440p")
            url_4k = save_resolution("2160p")
            
            # Fallback logic for the main video URL
            video_url = url_720p or url_1080p or url_480p or ""
            
            temp_thumb_path = f"{temp_file_path}.jpg"
            thumbnail_url = None
            
            if not thumbnail_provided and os.path.exists(temp_thumb_path):
                # Local Storage
                dest_dir = os.path.join(config.STATIC_DIR, "thumbs")
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, f"{base_filename}.jpg")
                shutil.copy2(temp_thumb_path, dest_path)
                thumbnail_url = f"{config.BASE_URL}/static/thumbs/{base_filename}.jpg"

            # Get Duration
            duration = 0
            try:
                import subprocess
                probe_cmd = [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", temp_file_path
                ]
                duration_str = subprocess.check_output(probe_cmd).decode('utf-8').strip()
                duration = int(float(duration_str))
            except Exception as e:
                print(f"Failed to get duration: {e}")

            # Update Database
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.video_url = video_url
                video.url_480p = url_480p
                video.url_720p = url_720p
                video.url_1080p = url_1080p
                video.url_2k = url_2k
                video.url_4k = url_4k
                video.duration = duration
                video.status = "approved"
                video.failed_at = None # Clear if it was a retry
                
                if thumbnail_url:
                    video.thumbnail_url = thumbnail_url
                
                db.commit()
        except Exception as e:
            print(f"Error in post-processing: {e}")

    finally:
        db.close()
        # Clean up temp
        temp_dir = os.path.dirname(temp_file_path)
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                print(f"Error cleaning up temp dir {temp_dir}: {e}")
def delete_video_files(video: Video):
    """Utility to delete all local files associated with a video."""
    urls = [
        video.video_url,
        video.url_480p,
        video.url_720p,
        video.url_1080p,
        video.url_2k,
        video.url_4k,
        video.thumbnail_url
    ]
    
    for url in urls:
        if url and url.startswith(config.BASE_URL):
            # Convert URL back to local path
            # BASE_URL/static/videos/... -> config.STATIC_DIR/videos/...
            relative_path = url.replace(f"{config.BASE_URL}/static/", "")
            # Handle mixed slashes on Windows
            local_path = os.path.join(config.STATIC_DIR, relative_path.replace("/", os.sep))
            
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    print(f"Deleted file: {local_path}")
                except Exception as e:
                    print(f"Failed to delete file {local_path}: {e}")

@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check ownership or admin status
    if video.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")
    
    # Delete physical files
    delete_video_files(video)
    
    # Delete from DB
    db.delete(video)
    db.commit()
    
    return {"status": "success", "message": "Video deleted successfully"}


@router.post("/upload", response_model=schemas.Video)
async def upload_video(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    video_type: str = Form(...),
    file: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # current_user is now a User model instance, not dict
    if not current_user.is_premium:
        if video_type == "flash" and current_user.flash_uploads >= FLASH_QUOTA_LIMIT:
            raise HTTPException(status_code=403, detail=f"Flash quota exceeded ({FLASH_QUOTA_LIMIT} max)")
        if video_type == "home" and current_user.home_uploads >= HOME_QUOTA_LIMIT:
            raise HTTPException(status_code=403, detail=f"Home quota exceeded ({HOME_QUOTA_LIMIT} max)")

    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Initial DB record
    video_create_data = schemas.VideoCreate(
        title=title,
        video_type=video_type,
        video_url="", 
        thumbnail_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60",
        processing_key=os.path.basename(temp_dir)
    )
    
    if thumbnail:
        from app.core.storage import s3_client
        safe_filename = thumbnail.filename.replace(" ", "_")
        object_name = f"thumbs/custom_{int(os.path.getmtime(temp_file_path))}_{safe_filename}"
        
        if config.B2_BUCKET_NAME:
            video_create_data.thumbnail_url = s3_client.upload_fileobj(
                thumbnail.file,
                object_name,
                content_type=thumbnail.content_type
            )

    # Update quota
    if video_type == "flash":
        current_user.flash_uploads = (current_user.flash_uploads or 0) + 1
    else:
        current_user.home_uploads = (current_user.home_uploads or 0) + 1
    
    db.commit() # Save user updates
    
    db_video = crud_video.create_video(db, video_create_data, user_id=current_user.id)

    background_tasks.add_task(
        background_process_video,
        temp_file_path,
        video_type,
        title,
        db_video.id,
        thumbnail is not None,
        db_video.processing_key
    )

    return db_video

@router.get("/status/{key}")
async def get_processing_status(key: str):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{config.RUST_SERVICE_URL}/status/{key}")
            return resp.json()
        except Exception:
            return {"status": "unknown"}


@router.post("/{video_id}/view")
def view_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    video = crud_video.get_video(db, video_id=video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    user_id = current_user.id if current_user else None
    updated_video = crud_video.increment_view(db, video_id=video_id, user_id=user_id)
    return {"status": "success", "views": updated_video.views if updated_video else 0}

@router.post("/{video_id}/comments", response_model=schemas.Comment)
def create_comment(
    video_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    video = crud_video.get_video(db, video_id=video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return crud_video.create_comment(db, comment=comment, video_id=video_id, user_id=current_user.id)

@router.get("/{video_id}/comments", response_model=List[schemas.Comment])
def read_comments(video_id: int, db: Session = Depends(get_db)):
    return crud_video.get_comments(db, video_id=video_id)

@router.post("/{video_id}/like")
def like_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    video = crud_video.get_video(db, video_id=video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    is_liked = crud_video.toggle_like(db, video_id=video_id, user_id=current_user.id)
    
    from app.models.models import Like
    likes_count = db.query(func.count(Like.video_id)).filter(Like.video_id == video_id).scalar() or 0
    
    return {"status": "success", "liked": is_liked, "likes_count": likes_count}


@router.post("/{video_id}/share")
def share_video(
    video_id: int,
    db: Session = Depends(get_db)
):
    video = crud_video.get_video(db, video_id=video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    crud_video.increment_share(db, video_id=video_id)
    return {"status": "success"}
