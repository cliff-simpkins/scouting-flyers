# Docker Deployment Guide for Testers

This guide will help you deploy the Scouting Flyers application using Docker for testing purposes.

## Prerequisites

- Docker and Docker Compose installed
- Access to a PostgreSQL database (or use the included database container)
- Google OAuth credentials (see `docs/GOOGLE_OAUTH_SETUP.md`)

## Option 1: Quick Start with External Database

If you already have a PostgreSQL database with PostGIS:

### 1. Clone the Repository

```bash
git clone https://github.com/cliff-simpkins/scouting-flyers.git
cd scouting-flyers
```

### 2. Create Environment File

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database (your existing PostgreSQL server)
DB_HOST=your_database_address
DB_PORT=your_database_port
DB_PASSWORD=your_database_password

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://your-domain:80/api/v1/auth/google/callback

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your_random_secret_key_here

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=http://your-domain:80,http://localhost:3000
```

### 3. Initialize the Database

Run the database initialization scripts:

```bash
# 1. Create database and user
psql -h YOUR_DB_HOST -p YOUR_DB_PORT -U postgres -f database/init-scripts/01-create-database.sql

# 2. Enable PostGIS and pgvector extensions
psql -h YOUR_DB_HOST -p YOUR_DB_PORT -U postgres -d flyers_db -f database/init-scripts/02-enable-postgis.sql

# 3. Create schema
psql -h YOUR_DB_HOST -p YOUR_DB_PORT -U flyers_user -d flyers_db -f database/init-scripts/03-schema.sql
```

### 4. Run Database Migrations

```bash
cd backend

# Run each migration in order:
python run_migration.py ../database/migrations/01-add-password-auth.sql
python run_migration.py ../database/migrations/02-add-viewer-role.sql
python run_migration.py ../database/migrations/03-rename-metadata-columns.sql
python run_migration.py ../database/migrations/04-add-completion-tracking.sql
python run_migration.py ../database/migrations/05-grant-completion-permissions.sql
python run_migration.py ../database/migrations/06-add-assignment-notes-and-percentage.sql
python run_migration.py ../database/migrations/07-add-project-status-enum.sql
python run_migration.py ../database/migrations/08-add-assignment-notes-table.sql

cd ..
```

### 5. Build and Start Containers

```bash
docker-compose up -d
```

This will:
- Build the backend (FastAPI) container
- Build the frontend (React) container
- Start an nginx reverse proxy
- Expose the application on port 80

### 6. Verify Deployment

Check that all containers are running:

```bash
docker-compose ps
```

You should see three containers:
- `flyers-backend` - Backend API (healthy)
- `flyers-frontend` - Frontend static files
- `flyers-nginx` - Nginx reverse proxy

### 7. Access the Application

Open your browser to: `http://your-server-ip`

- Frontend: `http://your-server-ip/`
- Backend API: `http://your-server-ip/api/v1/`
- API Docs: `http://your-server-ip/api/v1/docs`

## Option 2: All-in-One with Database Container

If you want to run everything in Docker including the database:

### 1. Use Development Compose File

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This includes a PostgreSQL container with PostGIS and pgvector pre-configured.

### 2. Initialize Database

The database container will automatically run the init scripts on first startup.

### 3. Run Migrations

```bash
# Wait for database to be ready (about 10 seconds)
sleep 10

# Run migrations
docker-compose exec backend python run_migration.py /app/database/migrations/01-add-password-auth.sql
# ... repeat for all 8 migrations
```

## Managing the Deployment

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services

```bash
docker-compose down
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database hostname | `192.168.1.11` |
| `DB_PORT` | Database port | `2775` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-xxx` |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `http://domain/api/v1/auth/google/callback` |
| `JWT_SECRET` | JWT signing key | (random 64-char hex string) |
| `CORS_ORIGINS` | Allowed frontend origins | `http://domain,https://domain` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `False` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token lifetime | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `7` |

## Troubleshooting

### Backend Health Check Failing

```bash
# Check backend logs
docker-compose logs backend

# Check if backend can connect to database
docker-compose exec backend python -c "from app.database import engine; engine.connect()"
```

### Frontend Not Loading

```bash
# Check nginx configuration
docker-compose exec nginx nginx -t

# Check nginx logs
docker-compose logs nginx
```

### Database Connection Issues

```bash
# Test database connection from host
psql -h DB_HOST -p DB_PORT -U flyers_user -d flyers_db

# Check if database has PostGIS
psql -h DB_HOST -p DB_PORT -U flyers_user -d flyers_db -c "SELECT PostGIS_version();"
```

### Migrations Failing

```bash
# Check if migration file exists
ls -la database/migrations/

# Run migration manually with verbose output
cd backend
python run_migration.py ../database/migrations/XX-migration-name.sql
```

## Security Checklist

Before sharing with testers:

- [ ] Change all default passwords
- [ ] Generate strong JWT secret: `openssl rand -hex 32`
- [ ] Configure CORS origins properly (no wildcards in production)
- [ ] Set `DEBUG=False` in production environment
- [ ] Use HTTPS with SSL certificates for production
- [ ] Restrict database access to application server only
- [ ] Review Google OAuth redirect URIs
- [ ] Ensure `.env` file is not committed to git

## Next Steps

After deployment:

1. Create the first admin user through Google OAuth
2. Test creating a project
3. Import zones from KML file
4. Assign zones to test volunteers
5. Test the mobile volunteer interface

## Support

For issues:
- Check logs: `docker-compose logs -f`
- Review health: `docker-compose ps`
- See main README: [README.md](README.md)
- Database docs: [docs/DATABASE.md](docs/DATABASE.md)
- API docs: `http://your-server/api/v1/docs`
