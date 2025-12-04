# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for the Volunteer Flyer Distribution System.

## Overview

The application uses Google OAuth 2.0 to authenticate users. Users sign in with their Google accounts, and the application receives basic profile information (name, email, profile picture).

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project details:
   - **Project Name:** "Volunteer Flyer Distribution" (or your preferred name)
   - **Organization:** (optional)
5. Click **"Create"**
6. Wait for the project to be created and select it

### Step 2: Enable Required APIs

1. In the Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for and enable:
   - **Google+ API** (for user profile information)
   - **People API** (optional, for extended profile data)

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Select user type:
   - **Internal:** Only for Google Workspace users in your organization
   - **External:** For any Google account (recommended for most cases)
3. Click **"Create"**
4. Fill in the required information:

**OAuth Consent Screen:**
- **App name:** Volunteer Flyer Distribution
- **User support email:** Your email address
- **App logo:** (optional) Upload your app logo
- **App domain:** (optional) Your domain
- **Authorized domains:** Add your domain (e.g., `yourdomain.com`)
- **Developer contact information:** Your email address

5. Click **"Save and Continue"**

**Scopes:**
6. Click **"Add or Remove Scopes"**
7. Select these scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
8. Click **"Update"**
9. Click **"Save and Continue"**

**Test Users (if External and not published):**
10. Add test users by entering their Google email addresses
11. Click **"Save and Continue"**

12. Review the summary and click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Select **"Web application"**
4. Configure the OAuth client:

**Name:** Volunteer Flyer Distribution Web Client

**Authorized JavaScript origins:**
- For development: `http://localhost:3000`
- For production: `https://yourdomain.com`

**Authorized redirect URIs:**
- For development:
  - `http://localhost:8000/api/v1/auth/google/callback`
  - `http://localhost:3000`
- For production:
  - `https://yourdomain.com/api/v1/auth/google/callback`
  - `https://yourdomain.com`

5. Click **"Create"**

### Step 5: Save Your Credentials

After creating the OAuth client, you'll see a modal with:
- **Client ID:** A long string ending in `.apps.googleusercontent.com`
- **Client Secret:** A shorter string

**Important:** Copy both values immediately and store them securely.

Click **"Download JSON"** to download the credentials (optional, for backup).

### Step 6: Configure Your Application

#### Development Environment

1. Copy `.env.example` files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp .env.example .env
   ```

2. Edit `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
   ```

3. Edit `frontend/.env`:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

4. Edit root `.env` (for Docker Compose):
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
   ```

#### Production Environment

1. Update `.env` with production URLs:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback
   CORS_ORIGINS=https://yourdomain.com
   ```

2. In Google Cloud Console, update OAuth redirect URIs to match production domain

### Step 7: Test the Integration

1. Start your application:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. Open your browser to `http://localhost:3000`

3. Click the "Sign in with Google" button

4. You should be redirected to Google's consent screen

5. After authorizing, you should be redirected back to your application and logged in

## OAuth Flow

Here's how the authentication works:

```
1. User clicks "Sign in with Google" in frontend
   ↓
2. Frontend redirects to backend: /api/v1/auth/google/login
   ↓
3. Backend generates Google OAuth URL with state parameter
   ↓
4. User redirects to Google consent screen
   ↓
5. User authorizes the application
   ↓
6. Google redirects back to: /api/v1/auth/google/callback?code=...
   ↓
7. Backend exchanges code for access token
   ↓
8. Backend fetches user profile from Google
   ↓
9. Backend creates/updates user in database
   ↓
10. Backend generates JWT tokens
   ↓
11. Frontend receives tokens and stores them
   ↓
12. User is logged in
```

## Scopes Explained

- **openid:** Required for OAuth 2.0
- **userinfo.email:** Access to user's email address
- **userinfo.profile:** Access to user's name and profile picture

## Security Considerations

### State Parameter

The backend generates a random state parameter for each OAuth request to prevent CSRF attacks. This state is validated when the callback is received.

### Token Storage

- **Access tokens:** Stored in memory (not localStorage to prevent XSS)
- **Refresh tokens:** Stored in httpOnly cookies (not accessible via JavaScript)

### HTTPS Only in Production

Always use HTTPS in production to protect tokens in transit.

## Troubleshooting

### Error: redirect_uri_mismatch

**Cause:** The redirect URI in your request doesn't match those configured in Google Cloud Console.

**Solution:**
- Check that the redirect URI in your backend `.env` file matches exactly what's configured in Google Cloud Console
- Ensure no trailing slashes mismatch
- Verify the protocol (http vs https) matches

### Error: invalid_client

**Cause:** Invalid Client ID or Client Secret.

**Solution:**
- Double-check that you copied the credentials correctly
- Ensure no extra spaces or line breaks
- Regenerate credentials if necessary

### Error: access_denied

**Cause:** User denied permission or app not verified.

**Solution:**
- If in development, add user as a test user in OAuth consent screen
- If in production, submit app for verification if needed

### Can't See Consent Screen

**Cause:** Already authorized the app.

**Solution:**
- Go to [Google Account Permissions](https://myaccount.google.com/permissions)
- Find your app and remove access
- Try logging in again

### Invalid Grant Error

**Cause:** Authorization code expired or already used.

**Solution:**
- Authorization codes are single-use and expire quickly
- Ensure your system clock is accurate
- Check for race conditions in code

## Publishing Your App

### For Internal Use (Google Workspace)

If your organization uses Google Workspace:
1. Set OAuth consent screen to **"Internal"**
2. Only users in your workspace can sign in
3. No verification needed

### For Public Use

If you want anyone with a Google account to sign in:
1. Set OAuth consent screen to **"External"**
2. While in development, add test users
3. For production, submit for verification:
   - Go to OAuth consent screen
   - Click **"Publish App"**
   - May require verification if using sensitive scopes

## Managing Credentials

### Rotating Credentials

To rotate OAuth credentials:
1. Create new OAuth client in Google Cloud Console
2. Update `.env` files with new credentials
3. Deploy updated configuration
4. Delete old OAuth client after verifying new one works

### Multiple Environments

Create separate OAuth clients for each environment:
- **Development:** `App Name (Dev)`
- **Staging:** `App Name (Staging)`
- **Production:** `App Name (Production)`

This allows independent credential rotation and clearer audit logs.

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues not covered here, check:
1. Google Cloud Console error logs
2. Application backend logs
3. Browser developer console for frontend errors
