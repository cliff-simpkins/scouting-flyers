"""Token schemas"""
from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: UUID  # User ID
    exp: int  # Expiration timestamp
    type: str  # Token type: "access" or "refresh"
