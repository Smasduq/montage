import os
import sys
from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User
from app.core.config import BASE_URL

def fix_avatars():
    # Use absolute path to montage.db in project root
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(root_dir, "montage.db")
    engine = create_engine(f"sqlite:///{db_path}")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        default_url = f"{BASE_URL}/static/defaults/default_avatar.png"
        users = db.query(User).all()
        fixed_count = 0
        
        for user in users:
            # If profile pic is missing, null, or contains an old default path that doesn't exist
            if not user.profile_pic or "default_avatar" in user.profile_pic:
                if user.profile_pic != default_url:
                    print(f"Updating avatar for {user.username}...")
                    user.profile_pic = default_url
                    fixed_count += 1
        
        db.commit()
        print(f"Successfully fixed {fixed_count} users.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_avatars()
