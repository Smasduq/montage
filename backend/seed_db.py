from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models.models import User, Video, VideoType, ApprovalStatus, Base
from app.core.config import BASE_URL
import sys

# Sample Data
SAMPLE_VIDEOS = [
    {
        "title": "Big Buck Bunny",
        "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/640px-Big_buck_bunny_poster_big.jpg",
        "video_type": VideoType.HOME,
        "views": 12500,
        "duration": 596
    },
    {
        "title": "Elephants Dream",
        "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_poster_metric_year_of_snake.jpg/640px-Elephants_Dream_poster_metric_year_of_snake.jpg",
        "video_type": VideoType.HOME,
        "views": 8400,
        "duration": 653
    },
    {
        "title": "For Bigger Blazes",
        "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "thumbnail_url": "https://via.placeholder.com/640x360.png?text=For+Bigger+Blazes",
        "video_type": VideoType.FLASH,
        "views": 45000,
        "duration": 15
    },
    {
        "title": "For Bigger Escapes",
        "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "thumbnail_url": "https://via.placeholder.com/640x360.png?text=For+Bigger+Escapes",
        "video_type": VideoType.FLASH,
        "views": 32000,
        "duration": 15
    },
    {
        "title": "Tears of Steel",
        "video_url": "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Tears_of_Steel_poster.jpg/640px-Tears_of_Steel_poster.jpg",
        "video_type": VideoType.HOME,
        "views": 5600,
        "duration": 734
    }
]

def seed_db():
    print("Seeding database...")
    db = SessionLocal()
    try:
        # Ensure tables exist
        Base.metadata.create_all(bind=engine)
        
        # Check/Create User
        demo_user = db.query(User).filter(User.username == "demo_user").first()
        if not demo_user:
            print("Creating demo user...")
            demo_user = User(
                username="demo_user",
                email="demo@example.com",
                full_name="Demo User",
                # hashed_password will be null/invalid but that's fine for now, or we can hash one
                is_verified=True,
                is_onboarded=True,
                profile_pic="https://via.placeholder.com/150",
                role="user"
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        else:
            print("Demo user already exists.")

        # Check/Create Videos
        for vid_data in SAMPLE_VIDEOS:
            exists = db.query(Video).filter(Video.title == vid_data["title"]).first()
            if not exists:
                print(f"Creating video: {vid_data['title']}")
                video = Video(
                    title=vid_data["title"],
                    video_url=vid_data["video_url"],
                    thumbnail_url=vid_data["thumbnail_url"],
                    video_type=vid_data["video_type"],
                    status=ApprovalStatus.APPROVED,
                    owner_id=demo_user.id,
                    views=vid_data["views"],
                    duration=vid_data["duration"]
                )
                db.add(video)
        
        db.commit()
        print("Seeding complete.")
    except Exception as e:
        print(f"Error seeding DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
