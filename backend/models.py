from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str
    password_hash: str

class Video(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    views: int = 0
    user_id: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    content: str
    user_id: int
    video_id: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
