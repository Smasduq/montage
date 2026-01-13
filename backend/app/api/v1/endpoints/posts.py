from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import os
import shutil
from uuid import uuid4
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.schemas import schemas
from app.models import models
from app.core import config

router = APIRouter()

@router.get("/", response_model=List[schemas.Post])
def get_posts(
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    posts = db.query(models.Post).options(joinedload(models.Post.owner)).order_by(models.Post.id.desc()).offset(skip).limit(limit).all()
    # We need to ensure the schema matches. owner needs to be populated.
    # The Schema Post has 'owner_id'. Models Post has 'owner'. 
    # Let's verify Schema. Post schema currently doesn't have 'owner'.
    return posts

@router.post("/create", response_model=schemas.Post)
async def create_post(
    content: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    image_url = None
    if image:
        file_ext = image.filename.split(".")[-1]
        file_name = f"posts/{uuid4()}.{file_ext}"
        
        from app.core.storage import s3_client
        if not config.S3_BUCKET_NAME:
            raise HTTPException(status_code=500, detail="Server storage not configured")

        image_url = s3_client.upload_fileobj(
            image.file,
            file_name,
            content_type=image.content_type
        )
    
    new_post = models.Post(
        content=content,
        image_url=image_url,
        owner_id=current_user.id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post
