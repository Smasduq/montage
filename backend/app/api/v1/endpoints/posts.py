from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.schemas import schemas
from app.core import config
from app.models.models import Post
from app.crud import video as crud_video # Post is in crud_video for now

router = APIRouter()

@router.get("/", response_model=List[schemas.Post])
def get_posts(
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    # Fetch posts with owner details
    # SQLAlchemy's relationship loading will handle owner details if lazy='joined' or distinct query
    # Default is lazy loading, but Pydantic might trigger N+1 if not careful.
    # For now simple query is fine.
    posts = db.query(Post).order_by(Post.id.desc()).offset(skip).limit(limit).all()
    return posts

@router.post("/create", response_model=schemas.Post)
async def create_post(
    content: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    image_url = None
    if image:
        import os
        import shutil
        
        file_ext = image.filename.split(".")[-1]
        local_filename = f"{uuid4()}.{file_ext}"
        
        # Local Storage for post images
        posts_dir = os.path.join(config.STATIC_DIR, "posts")
        os.makedirs(posts_dir, exist_ok=True)
        local_path = os.path.join(posts_dir, local_filename)
        
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        image_url = f"{config.BASE_URL}/static/posts/{local_filename}"
    
    post_in = schemas.PostCreate(content=content, image_url=image_url)
    return crud_video.create_post(db, post=post_in, user_id=current_user.id)

@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check ownership or admin
    if post.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    # Delete local image if exists
    if post.image_url and post.image_url.startswith(config.BASE_URL):
        import os
        relative_path = post.image_url.replace(f"{config.BASE_URL}/static/", "")
        local_path = os.path.join(config.STATIC_DIR, relative_path.replace("/", os.sep))
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                print(f"Failed to delete post image {local_path}: {e}")
                
    db.delete(post)
    db.commit()
    return {"status": "success", "message": "Post deleted successfully"}
