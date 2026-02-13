from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.v1.endpoints import auth
from app.db.session import get_db
from app.crud import notification as crud_notification
from app.models.models import User
from app.schemas import notification as schemas

router = APIRouter()

@router.get("/unread", response_model=List[schemas.Notification])
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    return crud_notification.get_unread_notifications(db, user_id=current_user.id)

@router.put("/{notification_id}/read", response_model=schemas.Notification)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    notification = crud_notification.mark_notification_read(db, notification_id=notification_id, user_id=current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification
