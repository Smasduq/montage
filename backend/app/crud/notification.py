from sqlalchemy.orm import Session
from app.models.models import Notification
from app.schemas import notification as schemas

def create_notification(db: Session, notification: schemas.NotificationCreate):
    db_notification = Notification(
        user_id=notification.user_id,
        message=notification.message,
        type=notification.type
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_unread_notifications(db: Session, user_id: int):
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()

def mark_notification_read(db: Session, notification_id: int, user_id: int):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    return notification
