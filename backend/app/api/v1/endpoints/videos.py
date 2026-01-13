from typing import List, Optional
import os
import shutil
import tempfile
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import video as crud_video
from app.schemas import schemas
from app.models import models
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core import config

router = APIRouter()

@router.get("/", response_model=List[schemas.Video])
def read_videos(video_type: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user_optional)):
    user_id = current_user.id if current_user else None
    return crud_video.get_videos(db, video_type=video_type, current_user_id=user_id)

@router.get("/search", response_model=List[schemas.Video])
async def search_videos(
    q: Optional[str] = "", 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    return crud_video.search_videos(db, query_str=q, current_user_id=user_id)

@router.get("/suggestions")
async def get_search_suggestions(q: Optional[str] = "", db: Session = Depends(get_db)):
    if not q or len(q) < 2: return []
    
    # 1. Search Videos (Home & Flash)
    videos = db.query(models.Video.title).filter(
        (models.Video.title.ilike(f"%{q}%")) & 
        (models.Video.status == "approved")
    ).order_by(models.Video.views.desc()).limit(10).all()
    
    # 2. Search Users
    users = db.query(models.User.username).filter(
        models.User.username.ilike(f"%{q}%")
    ).limit(5).all()
    
    seen = set()
    suggestions = []
    
    # Prioritize users in suggestions
    for u in users:
        val = f"@{u[0]}"
        if val not in seen:
            suggestions.append(val)
            seen.add(val)
            
    for v in videos:
        if v[0] not in seen:
            suggestions.append(v[0])
            seen.add(v[0])
            
    return suggestions[:10]

@router.get("/trending-suggestions")
async def get_trending_suggestions(db: Session = Depends(get_db)):
    # 1. High views (Trending)
    trending = db.query(models.Video.title).filter(
        models.Video.status == "approved"
    ).order_by(models.Video.views.desc()).limit(5).all()
    
    # 2. Recent uploads
    recent = db.query(models.Video.title).filter(
        models.Video.status == "approved"
    ).order_by(models.Video.created_at.desc()).limit(5).all()
    
    # 3. Popular Creators
    # Simple logic: users with most total video views (placeholder logic)
    # For now just some active users
    users = db.query(models.User.username).limit(3).all()

    seen = set()
    suggestions = []
    
    for v in trending:
        if v[0] not in seen:
            suggestions.append(v[0])
            seen.add(v[0])
            
    for v in recent:
        if v[0] not in seen:
            suggestions.append(v[0])
            seen.add(v[0])
            
    for u in users:
        val = f"@{u[0]}"
        if val not in seen:
            suggestions.append(val)
            seen.add(val)
            
    return suggestions[:10]

@router.get("/{video_id}", response_model=schemas.Video)
def read_video(video_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user_optional)):
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
    thumbnail_provided: bool, # Better name
    db_session_factory,
    task_id: str
):
    # This runs in background
    async with httpx.AsyncClient() as client:
        try:
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
                                print(f"Rust processing error: {status_data.get('message')}")
                                return
                    elif status_resp.status_code == 404:
                         # Task not found usually means it hasn't started or crashed
                         pass
                except Exception as e:
                    print(f"Polling error (try {retries}): {e}")
                
                await asyncio.sleep(2)
                retries += 1
            
            if retries >= max_retries:
                print(f"Background processing timed out for task {task_id}")
                return

        except Exception as e:
            print(f"Error in background processing: {e}")
            return

    # Post-processing: Move files (now Upload to S3)
    db = db_session_factory()
    try:
        from app.core.storage import s3_client
        
        base_filename = f"{title.replace(' ', '_')}_{int(os.path.getmtime(temp_file_path))}"
        
        def save_resolution(suffix):
            src = f"{temp_file_path}_{suffix}.mp4"
            if os.path.exists(src):
                object_name = f"videos/{base_filename}_{suffix}.mp4"
                if config.S3_BUCKET_NAME:
                    return s3_client.upload_file(src, object_name, content_type="video/mp4")
                else:
                    print("S3 not configured, video lost")
                    return None
            return None

        url_480p = save_resolution("480p")
        url_720p = save_resolution("720p")
        url_1080p = save_resolution("1080p")
        url_2k = save_resolution("1440p")
        url_4k = save_resolution("2160p")
        
        video_url = url_720p or url_1080p or url_480p or ""
        temp_thumb_path = f"{temp_file_path}.jpg"
        thumbnail_url = None
        
        if not thumbnail_provided and os.path.exists(temp_thumb_path):
            object_name = f"thumbs/{base_filename}.jpg"
            if config.S3_BUCKET_NAME:
                thumbnail_url = s3_client.upload_file(
                    temp_thumb_path, 
                    object_name, 
                    content_type="image/jpeg"
                )

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

        # Update DB
        video = db.query(models.Video).filter(models.Video.id == video_id).first()
        if video:
            video.video_url = video_url
            video.url_480p = url_480p
            video.url_720p = url_720p
            video.url_1080p = url_1080p
            video.url_2k = url_2k
            video.url_4k = url_4k
            video.duration = duration
            if thumbnail_url:
                video.thumbnail_url = thumbnail_url
            video.status = "approved"
            db.commit()
            
    finally:
        # Clean up temp
        temp_dir = os.path.dirname(temp_file_path)
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        db.close()

@router.post("/upload", response_model=schemas.Video)
async def upload_video(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    video_type: str = Form(...),
    file: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_premium:
        if video_type == "flash" and current_user.flash_uploads >= 20:
            raise HTTPException(status_code=403, detail="Flash quota exceeded (20 max)")
        if video_type == "home" and current_user.home_uploads >= 50:
            raise HTTPException(status_code=403, detail="Home quota exceeded (50 max)")

    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Initial DB record
    video_data = schemas.VideoCreate(
        title=title,
        video_type=video_type,
        video_url="", # Will be updated
        thumbnail_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60",
        processing_key=os.path.basename(temp_dir)
    )
    
    if thumbnail:
        from app.core.storage import s3_client
        safe_filename = thumbnail.filename.replace(" ", "_")
        object_name = f"thumbs/custom_{int(os.path.getmtime(temp_file_path))}_{safe_filename}"
        
        if config.S3_BUCKET_NAME:
            video_data.thumbnail_url = s3_client.upload_fileobj(
                thumbnail.file,
                object_name,
                content_type=thumbnail.content_type
            )
        else:
            # Temporary fallback if bucket not set, but better to enforce
             print("WARNING: S3 not configured, skipping custom thumbnail upload")
             video_data.thumbnail_url = None

    if video_type == "flash":
        current_user.flash_uploads += 1
    else:
        current_user.home_uploads += 1
    
    db_video = crud_video.create_video(db, video_data, user_id=current_user.id)
    # create_video already commits and refreshes

    from app.db.session import SessionLocal
    background_tasks.add_task(
        background_process_video,
        temp_file_path,
        video_type,
        title,
        db_video.id,
        thumbnail is not None, # Passes as bool
        SessionLocal,
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
    current_user: models.User = Depends(get_current_user_optional)
):
    video = crud_video.get_video(db, video_id=video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    user_id = current_user.id if current_user else None
    crud_video.increment_view(db, video_id=video_id, user_id=user_id)
    return {"status": "success", "views": video.views}

@router.post("/{video_id}/comments", response_model=schemas.Comment)
def create_comment(
    video_id: int,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify video exists
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
    current_user: models.User = Depends(get_current_user)
):
    video = crud_video.get_video(db, video_id=video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    is_liked = crud_video.toggle_like(db, video_id=video_id, user_id=current_user.id)
    likes_count = db.query(models.Like).filter(models.Like.video_id == video_id).count()
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
