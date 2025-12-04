# Volunteer Flyer Distribution Management System

A web application for managing volunteer flyer distribution with zone assignment, progress tracking, and mobile-friendly house marking.

## Features

- **Google OAuth Authentication** - Secure login with Google accounts
- **Multi-Project Management** - Create and manage multiple distribution projects
- **Zone Import** - Import zones from Google My Maps (KML format)
- **Volunteer Assignment** - Assign zones to volunteers
- **Mobile-First House Tracking** - Mark houses as visited with single-tap or multi-select
- **Progress Dashboard** - Track completion across zones and volunteers
- **Google Maps Integration** - Get driving directions to assigned zones

## Tech Stack

- **Frontend:** React with TypeScript, Leaflet.js for maps
- **Backend:** FastAPI (Python), SQLAlchemy ORM
- **Database:** PostgreSQL with PostGIS extension
- **Authentication:** Google OAuth 2.0
- **Deployment:** Docker containers via Portainer

## Project Structure

```
scouting-flyers/
├── backend/          # FastAPI application
├── frontend/         # React application
├── database/         # PostgreSQL init scripts
├── docker/           # Docker configurations
└── docs/             # Documentation
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with PostGIS extension
- Docker & Docker Compose
- Google OAuth credentials

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/cliff-simpkins/scouting-flyers.git
cd scouting-flyers
```

### 2. Setup Database

Run the initialization scripts in `database/init-scripts/` on your PostgreSQL server (192.168.1.11:2775):

```bash
psql -h 192.168.1.11 -p 2775 -U postgres -f database/init-scripts/01-create-database.sql
psql -h 192.168.1.11 -p 2775 -U postgres -d flyers_db -f database/init-scripts/02-enable-postgis.sql
psql -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db -f database/init-scripts/03-schema.sql
```

### 3. Configure Google OAuth

Follow the guide in `docs/GOOGLE_OAUTH_SETUP.md` to create OAuth credentials.

### 4. Setup Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://flyers_user:YOUR_PASSWORD@192.168.1.11:2775/flyers_db
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_random_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
```

### 5. Run with Docker Compose (Development)

```bash
docker-compose -f docker-compose.dev.yml up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### 6. Run Locally (Without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## Development

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

## Deployment

See `docs/DEPLOYMENT.md` for instructions on deploying to Synology via Portainer.

## User Roles

### Organizers
- Create and manage projects
- Import zones from KML files
- Assign zones to volunteers
- Track progress across all zones
- Invite collaborators

### Volunteers
- View assigned zones on mobile
- Mark houses as visited
- Get Google Maps directions
- Track personal progress

## Documentation

- [Database Schema](docs/DATABASE.md)
- [API Documentation](docs/API.md) (auto-generated)
- [Google OAuth Setup](docs/GOOGLE_OAUTH_SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please create an issue on GitHub.
