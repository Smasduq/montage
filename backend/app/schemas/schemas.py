from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    profile_pic: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: Optional[str] = None

    @field_validator('password')
    @classmethod
    def password_complexity(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>/?`~" for c in v):
            raise ValueError('Password must contain at least one special character')
        return v

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    profile_pic: Optional[str] = None
    bio: Optional[str] = None
    is_onboarded: Optional[bool] = None

class User(UserBase):
    id: int
    is_premium: bool
    is_onboarded: bool
    flash_uploads: int
    home_uploads: int
    google_id: Optional[str] = None
    bio: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserProfile(User):
    followers_count: int
    following_count: int
    total_views: int
    videos_count: int
    flash_videos_count: int
    posts_count: int
    videos: List["Video"]
    flash_videos: List["Video"]
    posts: List["Post"]
    is_following: bool = False

class UserUpdateResponse(BaseModel):
    user: User
    access_token: Optional[str] = None

class UserGoogleAuth(BaseModel):
    credential: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class VideoBase(BaseModel):
    title: str
    video_type: str

class VideoCreate(VideoBase):
    video_url: str
    url_480p: Optional[str] = None
    url_720p: Optional[str] = None
    url_1080p: Optional[str] = None
    url_2k: Optional[str] = None
    url_4k: Optional[str] = None
    thumbnail_url: str
    duration: Optional[int] = 0
    processing_key: Optional[str] = None

class Video(VideoBase):
    id: int
    video_url: str
    url_480p: Optional[str] = None
    url_720p: Optional[str] = None
    url_1080p: Optional[str] = None
    url_2k: Optional[str] = None
    url_4k: Optional[str] = None
    thumbnail_url: str
    status: str
    owner_id: int
    owner: Optional[UserBase] = None
    views: int
    earnings: float
    shares: int = 0
    likes_count: int = 0
    comments_count: int = 0
    liked_by_user: bool = False
    duration: int = 0
    processing_key: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PostBase(BaseModel):
    content: str
    image_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class Post(PostBase):
    id: int
    owner_id: int
    owner: Optional[UserBase] = None

    model_config = ConfigDict(from_attributes=True)

class AdBase(BaseModel):
    title: str
    image_url: str
    is_active: bool

class Ad(AdBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    video_id: int
    owner_id: int
    owner: Optional[UserBase] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UnifiedSearchResponse(BaseModel):
    videos: List[Video]
    users: List[User]
