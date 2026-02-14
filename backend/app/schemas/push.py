from pydantic import BaseModel
from datetime import datetime

class PushSubscriptionBase(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

class PushSubscriptionCreate(PushSubscriptionBase):
    pass

class PushSubscription(PushSubscriptionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
