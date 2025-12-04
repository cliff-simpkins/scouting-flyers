"""User schemas"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: str
    picture_url: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    google_id: str


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    name: Optional[str] = None
    picture_url: Optional[str] = None


class User(UserBase):
    """Schema for user response"""
    id: UUID
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(User):
    """Schema for user in database (includes google_id)"""
    google_id: str

    class Config:
        from_attributes = True
