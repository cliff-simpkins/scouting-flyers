"""Google OAuth service"""
from typing import Dict, Optional
import httpx
import secrets
from urllib.parse import urlencode
from app.config import settings


class GoogleOAuthService:
    """Service for handling Google OAuth 2.0 authentication"""

    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def generate_auth_url(self) -> tuple[str, str]:
        """
        Generate Google OAuth authorization URL

        Returns:
            tuple: (authorization_url, state)
        """
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join([
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ]),
            "state": state,
            "access_type": "offline",
            "prompt": "consent"
        }

        auth_url = f"{self.GOOGLE_AUTH_URL}?{urlencode(params)}"
        return auth_url, state

    async def exchange_code_for_token(self, code: str) -> Optional[str]:
        """
        Exchange authorization code for access token

        Args:
            code: Authorization code from Google

        Returns:
            Access token or None if failed
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GOOGLE_TOKEN_URL,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )

                if response.status_code != 200:
                    return None

                token_data = response.json()
                return token_data.get("access_token")

            except Exception as e:
                print(f"Error exchanging code for token: {e}")
                return None

    async def get_user_info(self, access_token: str) -> Optional[Dict[str, str]]:
        """
        Get user info from Google

        Args:
            access_token: Google access token

        Returns:
            User info dict or None if failed
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

                if response.status_code != 200:
                    return None

                user_info = response.json()

                return {
                    "google_id": user_info.get("id"),
                    "email": user_info.get("email"),
                    "name": user_info.get("name"),
                    "picture_url": user_info.get("picture")
                }

            except Exception as e:
                print(f"Error fetching user info: {e}")
                return None


# Global instance
google_oauth_service = GoogleOAuthService()
