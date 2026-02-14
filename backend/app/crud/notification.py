from sqlalchemy.orm import Session
from app.models.models import Notification, PushSubscription
from app.schemas import notification as schemas
from app.schemas import push as push_schemas

def create_notification(db: Session, notification: schemas.NotificationCreate):
    db_notification = Notification(
        user_id=notification.user_id,
        message=notification.message,
        link=notification.link,
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

def get_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 50):
    return db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

def create_push_subscription(db: Session, subscription: push_schemas.PushSubscriptionCreate, user_id: int):
    # Check if exists
    db_sub = db.query(PushSubscription).filter(PushSubscription.endpoint == subscription.endpoint).first()
    if db_sub:
        db_sub.user_id = user_id
        db_sub.p256dh = subscription.p256dh
        db_sub.auth = subscription.auth
    else:
        db_sub = PushSubscription(
            user_id=user_id,
            endpoint=subscription.endpoint,
            p256dh=subscription.p256dh,
            auth=subscription.auth
        )
        db.add(db_sub)
    
    db.commit()
    db.refresh(db_sub)
    return db_sub

def delete_push_subscription(db: Session, endpoint: str, user_id: int):
    db_sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == user_id
    ).first()
    if db_sub:
        db.delete(db_sub)
        db.commit()
        return True
    return False

def get_user_push_subscriptions(db: Session, user_id: int):
    return db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
