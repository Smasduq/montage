import json
import os
from pywebpush import webpush, WebPushException
from app.models.models import PushSubscription
from sqlalchemy.orm import Session
import logging
from app.crud.notification import create_notification
from app.schemas.notification import NotificationCreate

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:admin@montage.com")

def send_push_notification(subscription: PushSubscription, message_data: dict):
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            },
            data=json.dumps(message_data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": VAPID_EMAIL if VAPID_EMAIL.startswith("mailto:") else f"mailto:{VAPID_EMAIL}",
            }
        )
        return True
    except WebPushException as ex:
        logger.error("WebPush error: %s", ex)
        # If subscription is no longer valid, we should probably delete it
        # but we don't have db here. Caller should handle.
        return False
    except Exception as ex:
        logger.error("Failed to send push: %s", ex)
        return False

def notify_user_push(db: Session, user_id: int, title: str, body: str, link: str = None):
    # Always save to database first so it shows on the notification page
    notif_in = NotificationCreate(
        user_id=user_id,
        message=body,
        link=link,
        type="info" # Default type
    )
    create_notification(db, notif_in)

    from app.crud.notification import get_user_push_subscriptions
    
    subscriptions = get_user_push_subscriptions(db, user_id)
    if not subscriptions:
        return
    
    payload = {
        "title": title,
        "body": body,
        "icon": "/logo192.png", # Default icon
        "data": {
            "url": link
        }
    }
    
    for sub in subscriptions:
        send_push_notification(sub, payload)
