from sqlalchemy.orm import Session
from app.models.models import Achievement
from app.schemas import schemas
from datetime import datetime

def get_achievements(db: Session, user_id: int):
    return db.query(Achievement).filter(Achievement.user_id == user_id).all()

def create_achievement(db: Session, user_id: int, milestone_name: str):
    # Check if already exists
    existing = db.query(Achievement).filter(
        Achievement.user_id == user_id, 
        Achievement.milestone_name == milestone_name
    ).first()
    
    if existing:
        return existing
        
    db_achievement = Achievement(
        user_id=user_id,
        milestone_name=milestone_name,
        reached_at=datetime.now() # Explicitly set time or use default
    )
    db.add(db_achievement)
    db.commit()
    db.refresh(db_achievement)
    return db_achievement
