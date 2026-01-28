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
        file_ext = image.filename.split(".")[-1]
        file_name = f"posts/{uuid4()}.{file_ext}"
        
        from app.core.storage import s3_client
        if not config.B2_BUCKET_NAME:
            raise HTTPException(status_code=500, detail="Server storage not configured")

        image_url = s3_client.upload_fileobj(
            image.file,
            file_name,
            content_type=image.content_type
        )
    
    post_in = schemas.PostCreate(content=content, image_url=image_url)
    return crud_video.create_post(db, post=post_in, user_id=current_user.id)
