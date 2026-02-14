from sqlalchemy.orm import Session
from app.models.models import Achievement
from app.schemas import schemas
from datetime import datetime

from app.crud import notification as crud_notification
from app.schemas import notification as notification_schemas

def get_achievements(db: Session, user_id: int):
    return db.query(Achievement).filter(Achievement.user_id == user_id).all()

def create_achievement(db: Session, user_id: int, milestone_name: str):
    existing = db.query(Achievement).filter(
        Achievement.user_id == user_id, 
        Achievement.milestone_name == milestone_name
    ).first()
    
    if existing:
        return existing
        
    db_achievement = Achievement(
        user_id=user_id,
        milestone_name=milestone_name,
        reached_at=datetime.now()
    )
    db.add(db_achievement)
    db.commit()
    db.refresh(db_achievement)
    
    # Create notification
    # Clean up milestone name for display (e.g. FIRST_UPLOAD -> First Upload)
    display_name = milestone_name.replace("_", " ").title()
    crud_notification.create_notification(
        db, 
        notification_schemas.NotificationCreate(
            user_id=user_id,
            message=f"You earned a new badge: {display_name}!",
            type="achievement",
            link="/achievements"
        )
    )
    
    return db_achievement
