from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum
from app.core.config import BASE_URL

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class VideoType(str, enum.Enum):
    HOME = "home"
    FLASH = "flash"

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    role = Column(String, default=UserRole.USER)
    is_premium = Column(Boolean, default=False)
    is_onboarded = Column(Boolean, default=False)
    profile_pic = Column(String, default=f"{BASE_URL}/static/defaults/default_avatar.png")
    
    # Quotas for free users
    flash_uploads = Column(Integer, default=0)
    home_uploads = Column(Integer, default=0)
    bio = Column(String, nullable=True)

    videos = relationship("Video", back_populates="owner")
    posts = relationship("Post", back_populates="owner")
    reposts = relationship("Repost", back_populates="user")
    comments = relationship("Comment", back_populates="owner")
    likes = relationship("Like", back_populates="user")

    # Followers
    followers = relationship(
        "Follow",
        foreign_keys="Follow.followed_id",
        back_populates="followed",
        cascade="all, delete-orphan",
    )
    following = relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan",
    )

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    video_url = Column(String) # This will now be the fallback (likely 720p or original)
    url_480p = Column(String, nullable=True)
    url_720p = Column(String, nullable=True)
    url_1080p = Column(String, nullable=True)
    url_2k = Column(String, nullable=True)
    url_4k = Column(String, nullable=True)
    thumbnail_url = Column(String)
    video_type = Column(String) # home or flash
    status = Column(String, default=ApprovalStatus.PENDING)
    owner_id = Column(Integer, ForeignKey("users.id"))
    views = Column(Integer, default=0)
    earnings = Column(Float, default=0.0)
    shares = Column(Integer, default=0)
    duration = Column(Integer, default=0)
    processing_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

    owner = relationship("User", back_populates="videos")
    comments = relationship("Comment", back_populates="video")
    likes = relationship("Like", back_populates="video")

    @property
    def owner_username(self):
        return self.owner.username if self.owner else "Unknown"

class View(Base):
    __tablename__ = "views"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    created_at = Column(DateTime, default=func.now())

    user = relationship("User")
    video = relationship("Video")

class Like(Base):
    __tablename__ = "likes"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id"), primary_key=True)

    user = relationship("User", back_populates="likes")
    video = relationship("Video", back_populates="likes")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    image_url = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="posts")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    video_id = Column(Integer, ForeignKey("videos.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())

    owner = relationship("User", back_populates="comments")
    video = relationship("Video", back_populates="comments")

class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    followed_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, default=func.now())

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    followed = relationship("User", foreign_keys=[followed_id], back_populates="followers")

class Repost(Base):
    __tablename__ = "reposts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="reposts")
    video = relationship("Video")
