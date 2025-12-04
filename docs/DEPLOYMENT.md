# Deployment Guide

This guide explains how to deploy the Volunteer Flyer Distribution System to your Synology server using Portainer.

## Prerequisites

- Synology NAS with Docker support
- Portainer installed and running
- PostgreSQL database set up (see [DATABASE.md](DATABASE.md))
- Google OAuth credentials configured (see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md))
- Domain name (optional, for HTTPS)
- Git installed locally

## Deployment Overview

The application consists of three Docker containers:
1. **Backend** - FastAPI application
2. **Frontend** - React application served by Nginx
3. **Nginx** - Reverse proxy routing traffic to backend/frontend

## Pre-Deployment Steps

### 1. Database Setup

Follow the instructions in [DATABASE.md](DATABASE.md) to:
- Create the database and user on your PostgreSQL server (192.168.1.11:2775)
- Run the initialization scripts
- Verify the setup

### 2. OAuth Configuration

Follow [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) to:
- Create Google OAuth credentials
- Configure production redirect URIs
- Save Client ID and Client Secret

### 3. Prepare Environment Variables

Create a `.env` file in the project root with production values:

```env
# Database
DB_PASSWORD=your_strong_database_password

# Google OAuth
GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback

# JWT Security
JWT_SECRET=generate_with_openssl_rand_hex_32

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Generate JWT Secret:**
```bash
openssl rand -hex 32
```

## Deployment Methods

### Method 1: Deploy via Portainer (Recommended)

#### Step 1: Connect to Your Synology

1. Open Portainer in your browser:
   ```
   http://your-synology-ip:9000
   ```

2. Log in to Portainer

3. Select your Docker environment

#### Step 2: Create the Stack

1. Go to **Stacks** in the left sidebar
2. Click **"Add stack"**
3. Choose a method:

**Option A: Upload docker-compose.yml**
- Click **"Upload"**
- Select `docker-compose.yml` from your project
- Name the stack: `flyers-distribution`

**Option B: Web editor**
- Choose **"Web editor"**
- Copy and paste the contents of `docker-compose.yml`
- Name the stack: `flyers-distribution`

**Option C: Git repository**
- Choose **"Repository"**
- Enter repository URL: `https://github.com/cliff-simpkins/scouting-flyers.git`
- Branch: `main`
- Compose path: `docker-compose.yml`

#### Step 3: Configure Environment Variables

In Portainer, scroll to **"Environment variables"**:

Add each variable from your `.env` file:
- `DB_PASSWORD`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `JWT_SECRET`
- `CORS_ORIGINS`

Or toggle **"Load variables from .env file"** and paste the contents.

#### Step 4: Deploy

1. Click **"Deploy the stack"**
2. Wait for the containers to build and start
3. Check the logs for any errors

### Method 2: Deploy via SSH

If you prefer command-line deployment:

#### Step 1: SSH into Synology

```bash
ssh admin@your-synology-ip
```

#### Step 2: Navigate to Docker Directory

```bash
cd /volume1/docker/flyers-distribution
```

Or create it:
```bash
sudo mkdir -p /volume1/docker/flyers-distribution
cd /volume1/docker/flyers-distribution
```

#### Step 3: Clone Repository

```bash
git clone https://github.com/cliff-simpkins/scouting-flyers.git .
```

#### Step 4: Create .env File

```bash
nano .env
```

Paste your environment variables and save (Ctrl+X, Y, Enter).

#### Step 5: Deploy with Docker Compose

```bash
sudo docker-compose up -d
```

This will:
- Build the Docker images
- Create and start the containers
- Set up networking

#### Step 6: Verify Deployment

```bash
sudo docker-compose ps
```

All containers should show "Up" status.

## Post-Deployment Configuration

### 1. Verify Backend Health

```bash
curl http://your-synology-ip:8000/health
```

Should return: `{"status":"healthy"}`

### 2. Check Frontend

Open in browser:
```
http://your-synology-ip
```

You should see the application homepage.

### 3. Test Authentication

1. Click "Sign in with Google"
2. Authorize the application
3. Verify you're redirected back and logged in

### 4. Configure Domain (Optional)

#### Using Synology Reverse Proxy

1. Open **DSM Control Panel > Application Portal > Reverse Proxy**
2. Click **"Create"**
3. Configure:
   - **Source:**
     - Protocol: HTTPS
     - Hostname: `yourdomain.com`
     - Port: 443
   - **Destination:**
     - Protocol: HTTP
     - Hostname: localhost
     - Port: 80 (nginx container)
4. Enable **"Enable HSTS"** and **"Enable HTTP/2"**

#### Using Let's Encrypt SSL

1. In DSM, go to **Control Panel > Security > Certificate**
2. Click **"Add" > "Add a new certificate"**
3. Choose **"Get a certificate from Let's Encrypt"**
4. Enter your domain and email
5. Obtain certificate
6. Assign certificate to reverse proxy rule

### 5. Configure Nginx SSL (Alternative)

If not using Synology reverse proxy:

1. Obtain SSL certificates (Let's Encrypt):
   ```bash
   sudo docker run --rm \
     -v /volume1/docker/flyers-distribution/docker/nginx/ssl:/etc/letsencrypt \
     certbot/certbot certonly --standalone \
     -d yourdomain.com \
     --email your@email.com \
     --agree-tos
   ```

2. Uncomment HTTPS server block in `docker/nginx/nginx.conf`

3. Update paths to SSL certificates

4. Restart nginx:
   ```bash
   sudo docker-compose restart nginx
   ```

## Updating the Application

### Method 1: Via Portainer

1. Go to **Stacks**
2. Select your stack (`flyers-distribution`)
3. Click **"Editor"**
4. Click **"Pull and redeploy"** or update the compose file
5. Click **"Update the stack"**

### Method 2: Via SSH

```bash
cd /volume1/docker/flyers-distribution
git pull origin main
sudo docker-compose down
sudo docker-compose up -d --build
```

### Database Migrations

After updating, run migrations if schema changed:

```bash
sudo docker-compose exec backend alembic upgrade head
```

## Monitoring

### View Logs

#### All Containers
```bash
sudo docker-compose logs -f
```

#### Specific Container
```bash
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
sudo docker-compose logs -f nginx
```

#### In Portainer
1. Go to **Containers**
2. Click on a container
3. Click **"Logs"**
4. Toggle **"Auto-refresh"**

### Container Resource Usage

#### Via Docker
```bash
sudo docker stats
```

#### Via Portainer
1. Go to **Containers**
2. View resource usage in the list
3. Click on a container for detailed stats

## Backup Strategy

### 1. Database Backups

Create automated backup script:

```bash
#!/bin/bash
# /volume1/docker/flyers-distribution/scripts/backup-db.sh

BACKUP_DIR="/volume1/backups/flyers-db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/flyers_db_$DATE.dump"

mkdir -p $BACKUP_DIR

pg_dump -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db -F c -f $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "flyers_db_*.dump" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Schedule with cron:
```bash
crontab -e

# Add this line for daily backup at 2 AM:
0 2 * * * /volume1/docker/flyers-distribution/scripts/backup-db.sh
```

### 2. Application Backups

The application code is in Git, so:
1. Ensure all changes are committed
2. Push to GitHub regularly
3. Back up `.env` file separately (securely!)

### 3. User Data Export

Implement data export features in the application to allow users to export their projects and data.

## Troubleshooting

### Container Won't Start

1. Check logs:
   ```bash
   sudo docker-compose logs backend
   ```

2. Common issues:
   - Database connection failure (check `DATABASE_URL`)
   - Missing environment variables
   - Port already in use

### Database Connection Errors

1. Verify database is accessible:
   ```bash
   psql -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db
   ```

2. Check firewall rules on database server

3. Verify `DATABASE_URL` in `.env` is correct

### OAuth Not Working

1. Check redirect URI in Google Cloud Console matches your domain
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
3. Check browser console for errors

### Nginx 502 Bad Gateway

1. Backend container not running:
   ```bash
   sudo docker-compose ps backend
   ```

2. Backend not responding:
   ```bash
   curl http://backend:8000/health
   ```

3. Restart backend:
   ```bash
   sudo docker-compose restart backend
   ```

### Permission Denied Errors

1. Ensure Docker has permissions:
   ```bash
   sudo usermod -aG docker $USER
   ```

2. Check file permissions:
   ```bash
   sudo chown -R $USER:$USER /volume1/docker/flyers-distribution
   ```

## Security Checklist

- [ ] Database user has strong password
- [ ] JWT secret is randomly generated (32+ characters)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured to block direct access to containers
- [ ] CORS origins restricted to your domain only
- [ ] Database backups automated and tested
- [ ] Sensitive data not committed to Git
- [ ] Regular updates applied to dependencies
- [ ] Container health checks configured
- [ ] Log monitoring set up for errors

## Performance Optimization

### 1. Enable Caching

Add Redis container for session/data caching (future enhancement).

### 2. Database Optimization

- Ensure indexes are used (already configured in schema)
- Monitor slow queries
- Run `VACUUM ANALYZE` periodically

### 3. Static File CDN

Serve frontend static assets via CDN for better performance (future enhancement).

### 4. Container Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Rollback Procedure

If deployment fails:

### 1. Via Portainer
1. Go to **Stacks** > Your stack
2. Click **"Editor"**
3. Click **"Revert"**

### 2. Via Git
```bash
cd /volume1/docker/flyers-distribution
git log --oneline  # Find last working commit
git checkout <commit-hash>
sudo docker-compose down
sudo docker-compose up -d --build
```

### 3. Database Rollback
```bash
# Restore from backup
pg_restore -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db /path/to/backup.dump

# Or rollback migrations
sudo docker-compose exec backend alembic downgrade -1
```

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review application logs for errors
- Check container health status
- Monitor disk usage

**Monthly:**
- Update Docker images to latest versions
- Test backup restoration procedure
- Review and update SSL certificates
- Check for security updates

**Quarterly:**
- Performance audit
- Security audit
- User feedback review
- Feature planning

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Portainer Documentation](https://docs.portainer.io/)
- [Synology Docker Guide](https://www.synology.com/en-global/dsm/packages/Docker)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
