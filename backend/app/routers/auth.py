"""Authentication router"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegistration, UserLogin, TokenResponse, UserResponse
from app.services.oauth_service import google_oauth_service
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    hash_password,
    verify_password
)
from app.dependencies import get_current_user
from uuid import UUID

router = APIRouter()

# In-memory store for OAuth state (in production, use Redis)
# Format: {state: timestamp}
oauth_states = {}


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegistration,
    db: Session = Depends(get_db)
):
    """
    Register a new user with email and password

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        JWT tokens and user info
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        last_login=datetime.utcnow()
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate JWT tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Create response with refresh token in httpOnly cookie
    response = JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "picture_url": user.picture_url,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            }
        }
    )

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=604800  # 7 days in seconds
    )

    return response


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email and password

    Args:
        credentials: User login credentials
        db: Database session

    Returns:
        JWT tokens and user info
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Generate JWT tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Create response with refresh token in httpOnly cookie
    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture_url": user.picture_url,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    })

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=604800  # 7 days in seconds
    )

    return response


@router.get("/auth/google/login")
async def google_login():
    """
    Initiate Google OAuth login

    Returns redirect URL to Google's consent screen
    """
    auth_url, state = google_oauth_service.generate_auth_url()

    # Store state for CSRF verification (expires in 10 minutes)
    oauth_states[state] = datetime.utcnow()

    # Clean up old states (older than 10 minutes)
    cutoff = datetime.utcnow().timestamp() - 600
    oauth_states.clear()  # Simple cleanup for now

    return {"authorization_url": auth_url, "state": state}


@router.get("/auth/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback

    Args:
        code: Authorization code from Google
        state: CSRF protection state
        db: Database session

    Returns:
        JWT tokens and user info
    """
    # Verify state (CSRF protection)
    if state not in oauth_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter"
        )

    # Remove used state
    del oauth_states[state]

    # Exchange code for access token
    google_access_token = await google_oauth_service.exchange_code_for_token(code)

    if not google_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange code for token"
        )

    # Get user info from Google
    user_info = await google_oauth_service.get_user_info(google_access_token)

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch user info from Google"
        )

    # Check if user exists
    user = db.query(User).filter(User.google_id == user_info["google_id"]).first()

    if user:
        # Update existing user
        user.name = user_info["name"]
        user.picture_url = user_info["picture_url"]
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
    else:
        # Create new user
        user = User(
            google_id=user_info["google_id"],
            email=user_info["email"],
            name=user_info["name"],
            picture_url=user_info["picture_url"],
            last_login=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate JWT tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Create response with refresh token in httpOnly cookie
    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 900,  # 15 minutes in seconds
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "picture_url": user.picture_url
        }
    })

    # Set refresh token in httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Use HTTPS in production
        samesite="lax",
        max_age=604800  # 7 days in seconds
    )

    return response


@router.post("/auth/refresh")
async def refresh_access_token(
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token

    Args:
        refresh_token: Refresh token from cookie
        db: Database session

    Returns:
        New access token
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )

    # Verify refresh token
    payload = verify_token(refresh_token, token_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Get user ID from token
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID"
        )

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Generate new access token
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 900
    }


@router.post("/auth/logout")
async def logout(response: Response):
    """
    Logout user by clearing refresh token cookie

    Args:
        response: FastAPI response object
    """
    response.delete_cookie(key="refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user's information

    Args:
        current_user: Current user from JWT token

    Returns:
        User information
    """
    return current_user
