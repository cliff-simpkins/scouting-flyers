# API Documentation

This document provides an overview of the API endpoints for the Volunteer Flyer Distribution System.

## Base URL

- **Development:** `http://localhost:8000`
- **Production:** `https://yourdomain.com`

## API Version

All endpoints are prefixed with `/api/v1`

## Interactive Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI:** `{BASE_URL}/api/v1/docs`
- **ReDoc:** `{BASE_URL}/api/v1/redoc`
- **OpenAPI JSON:** `{BASE_URL}/api/v1/openapi.json`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Token Types

- **Access Token:** Short-lived (15 minutes), used for API requests
- **Refresh Token:** Long-lived (7 days), stored in httpOnly cookie

### Authentication Header

Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### OAuth Flow

See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for detailed OAuth flow.

## Endpoints Overview

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/google/login` | Initiate Google OAuth | No |
| GET | `/api/v1/auth/google/callback` | OAuth callback handler | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/api/v1/auth/logout` | Logout user | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users/me` | Get current user profile | Yes |
| PUT | `/api/v1/users/me` | Update user profile | Yes |

### Projects

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/v1/projects` | List user's projects | Yes | Any |
| POST | `/api/v1/projects` | Create new project | Yes | Any |
| GET | `/api/v1/projects/{id}` | Get project details | Yes | Member |
| PUT | `/api/v1/projects/{id}` | Update project | Yes | Owner/Organizer |
| DELETE | `/api/v1/projects/{id}` | Delete project | Yes | Owner |
| GET | `/api/v1/projects/{id}/stats` | Get project statistics | Yes | Member |

### Collaborators

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/v1/projects/{id}/collaborators` | List collaborators | Yes | Member |
| POST | `/api/v1/projects/{id}/collaborators` | Invite collaborator | Yes | Owner/Organizer |
| DELETE | `/api/v1/projects/{id}/collaborators/{user_id}` | Remove collaborator | Yes | Owner |

### Zones

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/v1/projects/{id}/zones` | List zones | Yes | Member |
| POST | `/api/v1/projects/{id}/zones/import` | Import zones from KML | Yes | Owner/Organizer |
| GET | `/api/v1/zones/{id}` | Get zone details | Yes | Member |
| GET | `/api/v1/zones/{id}/geojson` | Get zone as GeoJSON | Yes | Member |
| PUT | `/api/v1/zones/{id}` | Update zone | Yes | Owner/Organizer |
| DELETE | `/api/v1/zones/{id}` | Delete zone | Yes | Owner/Organizer |
| POST | `/api/v1/zones/{id}/generate-houses` | Generate house points | Yes | Owner/Organizer |

### Assignments

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/v1/projects/{id}/assignments` | List all assignments | Yes | Owner/Organizer |
| POST | `/api/v1/zones/{id}/assignments` | Assign volunteers | Yes | Owner/Organizer |
| GET | `/api/v1/assignments/{id}` | Get assignment details | Yes | Assigned Volunteer |
| PUT | `/api/v1/assignments/{id}/status` | Update assignment status | Yes | Assigned Volunteer |
| DELETE | `/api/v1/assignments/{id}` | Remove assignment | Yes | Owner/Organizer |
| GET | `/api/v1/volunteers/my-assignments` | Get my assignments | Yes | Volunteer |

### Houses

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/v1/zones/{id}/houses` | List houses in zone | Yes | Member |
| POST | `/api/v1/zones/{id}/houses` | Add house manually | Yes | Owner/Organizer |
| GET | `/api/v1/houses/{id}` | Get house details | Yes | Member |
| DELETE | `/api/v1/houses/{id}` | Delete house | Yes | Owner/Organizer |

### Visits

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/api/v1/houses/{id}/visit` | Mark house visited | Yes | Assigned Volunteer |
| POST | `/api/v1/visits/bulk` | Mark multiple houses | Yes | Assigned Volunteer |
| GET | `/api/v1/assignments/{id}/visits` | Get visit history | Yes | Assigned Volunteer |
| DELETE | `/api/v1/visits/{id}` | Undo visit | Yes | Assigned Volunteer |

## Request/Response Examples

### Authentication

#### POST /api/v1/auth/google/login

**Request:**
```json
{}
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

Frontend should redirect user to `authorization_url`.

#### GET /api/v1/auth/google/callback

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - CSRF protection state

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "picture_url": "https://..."
  }
}
```

Refresh token is set in httpOnly cookie.

### Projects

#### POST /api/v1/projects

**Request:**
```json
{
  "name": "Spring 2024 Fundraiser",
  "description": "Annual spring fundraising campaign"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Spring 2024 Fundraiser",
  "description": "Annual spring fundraising campaign",
  "owner_id": "uuid",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /api/v1/projects/{id}/stats

**Response:**
```json
{
  "project_id": "uuid",
  "project_name": "Spring 2024 Fundraiser",
  "total_zones": 15,
  "assigned_zones": 12,
  "total_houses": 1250,
  "visited_houses": 480,
  "completion_percentage": 38.4
}
```

### Zones

#### POST /api/v1/projects/{id}/zones/import

**Request:**
- Content-Type: `multipart/form-data`
- Body: KML file upload

**Response:**
```json
{
  "imported": 15,
  "zones": [
    {
      "id": "uuid",
      "name": "Zone A",
      "description": "North neighborhood",
      "color": "#FF5733",
      "project_id": "uuid"
    }
  ]
}
```

#### GET /api/v1/zones/{id}/geojson

**Response:**
```json
{
  "type": "Feature",
  "id": "uuid",
  "properties": {
    "name": "Zone A",
    "color": "#FF5733",
    "assigned_volunteers": ["uuid1", "uuid2"],
    "progress": 45.5
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-122.4194, 37.7749],
        [-122.4184, 37.7749],
        [-122.4184, 37.7739],
        [-122.4194, 37.7739],
        [-122.4194, 37.7749]
      ]
    ]
  }
}
```

### Visits

#### POST /api/v1/visits/bulk

**Request:**
```json
{
  "house_ids": [
    "uuid1",
    "uuid2",
    "uuid3"
  ],
  "zone_assignment_id": "uuid",
  "notes": "Completed left side of Main Street"
}
```

**Response:**
```json
{
  "created": 3,
  "visits": [
    {
      "id": "uuid",
      "house_id": "uuid1",
      "volunteer_id": "uuid",
      "visited_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **204 No Content** - Request successful, no content to return
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required or failed
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource conflict (e.g., duplicate)
- **422 Unprocessable Entity** - Validation error
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error

### Error Examples

**401 Unauthorized:**
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden:**
```json
{
  "detail": "Insufficient permissions to access this resource"
}
```

**404 Not Found:**
```json
{
  "detail": "Project not found"
}
```

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## Rate Limiting

Rate limits are applied to prevent abuse:

- **Authentication endpoints:** 10 requests per minute
- **General API:** 100 requests per minute
- **File uploads:** 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642261800
```

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `skip` - Number of records to skip (default: 0)
- `limit` - Maximum records to return (default: 50, max: 100)

**Example:**
```
GET /api/v1/projects?skip=20&limit=10
```

**Response includes:**
```json
{
  "total": 45,
  "items": [ ],
  "skip": 20,
  "limit": 10
}
```

## Filtering and Sorting

Some endpoints support filtering and sorting:

**Example:**
```
GET /api/v1/projects?is_active=true&sort=-created_at
```

Query parameters:
- `is_active` - Filter by active status
- `sort` - Sort field (prefix with `-` for descending)

## WebSocket Support (Future)

Real-time updates for progress tracking (planned):

```
ws://localhost:8000/api/v1/ws/projects/{id}/updates
```

## CORS

Allowed origins configured in backend `.env`:
```
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## API Client Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Example: Get projects
const projects = await api.get('/projects');

// Example: Create project
const newProject = await api.post('/projects', {
  name: 'My Project',
  description: 'Description'
});
```

### Python (httpx)

```python
import httpx

async with httpx.AsyncClient(base_url='http://localhost:8000/api/v1') as client:
    # Get projects
    response = await client.get(
        '/projects',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    projects = response.json()
```

### cURL

```bash
# Get projects
curl -X GET http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create project
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"Description"}'
```

## API Versioning

Current version: `v1`

Future versions will be available at `/api/v2`, etc.

Old versions will be maintained for 12 months after new version release.

## Support

For API issues:
1. Check interactive documentation at `/api/v1/docs`
2. Review application logs
3. Check GitHub issues
4. Create new issue with reproducible example

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- Authentication with Google OAuth
- Project management
- Zone import from KML
- House tracking
- Progress statistics
