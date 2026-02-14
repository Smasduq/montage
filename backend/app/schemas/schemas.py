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
        if not any(c in "!@#$%^&*()_+-=[]{}|;:'\",.<>/?`~" for c in v):
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
    is_verified: bool
    is_onboarded: bool
    flash_uploads: int
    home_uploads: int
    flash_quota_limit: int
    home_quota_limit: int
    google_id: Optional[str] = None
    bio: Optional[str] = None
    role: str

class EmailVerification(BaseModel):
    email: str
    code: str

class VerificationResponse(BaseModel):
    message: str
    username: Optional[str] = None
    email: Optional[str] = None
    
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
    description: Optional[str] = None
    video_type: str
    tags: Optional[str] = None

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
    description: Optional[str] = None

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
    owner_followed: bool = False
    duration: int = 0
    processing_key: Optional[str] = None
    failed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PostBase(BaseModel):
    content: str
    image_url: Optional[str] = None
    tags: Optional[str] = None

class PostCreate(PostBase):
    original_post_id: Optional[int] = None

class Post(PostBase):
    id: int
    owner_id: int
    owner: Optional[UserBase] = None
    created_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0
    liked_by_user: bool = False
    original_post_id: Optional[int] = None
    original_post: Optional["Post"] = None
    views_count: int = 0
    reposted_by: Optional[UserBase] = None

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

class Achievement(BaseModel):
    id: int
    milestone_name: str
    reached_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UnifiedSearchResponse(BaseModel):
    videos: List[Video]
    users: List[User]
