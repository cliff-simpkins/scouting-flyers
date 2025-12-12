# Portainer Full Stack Deployment

This guide explains how to deploy the complete Scouting Flyers application stack to your Synology NAS using Portainer.

## Differences from Windows Deployment

### Windows (Docker Desktop)
- Uses Docker Desktop
- Commands: `docker-compose up -d`
- File paths: Windows paths (C:\Users\...)
- Access: localhost only
- Best for: Development and local testing

### Synology (Portainer)
- Uses Docker Engine + Portainer UI
- Deployment: Via Portainer Stacks interface
- File paths: Linux paths (/volume1/docker/...)
- Access: Network-accessible (LAN or Internet)
- Best for: **Sharing with testers and production**

---

## Prerequisites

- Portainer installed on Synology
- Database already set up (PostgreSQL + PostGIS)
- Google OAuth credentials configured
- Network access to Synology NAS

---

## Deployment Methods

You have **two options** for deploying to Portainer:

### **Option 1: Upload Method (Easier)**
Upload docker-compose.yml directly through Portainer UI

### **Option 2: Git Repository (Better)**
Connect Portainer to your GitHub repo for automatic updates

---

## Option 1: Upload Method (Recommended for First Deployment)

### Step 1: Prepare Files on Synology

Upload these files to your Synology at `/volume1/docker/flyers-app/`:

**Via File Station:**
1. Open DSM → File Station
2. Create folder: `/docker/flyers-app/`
3. Upload:
   - `docker-compose.yml`
   - `.env` (your configured environment file)

**Via SCP:**
```bash
scp docker-compose.yml .env admin@192.168.1.11:/volume1/docker/flyers-app/
```

### Step 2: Create .env File

SSH into Synology or use File Station to create `.env`:

```env
# Database
DB_HOST=192.168.1.11
DB_PORT=2775
DB_PASSWORD=your_database_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://YOUR_NAS_IP/api/v1/auth/google/callback

# JWT
JWT_SECRET=your_random_secret_key_here

# CORS - Add your NAS IP/domain
CORS_ORIGINS=http://YOUR_NAS_IP,http://localhost:3000
```

**Important:** Update `YOUR_NAS_IP` with your actual Synology IP (e.g., `192.168.1.11`)

### Step 3: Build Docker Images

Since Portainer Stacks don't automatically build custom images, you need to:

**Option A: Pre-build and push to registry (Recommended)**

On your Windows machine:
```bash
# Build backend
cd backend
docker build -t your-dockerhub-username/flyers-backend:latest -f Dockerfile --target production .
docker push your-dockerhub-username/flyers-backend:latest

# Build frontend
cd ../frontend
docker build -t your-dockerhub-username/flyers-frontend:latest -f Dockerfile --target production .
docker push your-dockerhub-username/flyers-frontend:latest
```

Then modify `docker-compose.yml` to use these images instead of building:
```yaml
services:
  backend:
    image: your-dockerhub-username/flyers-backend:latest
    # Remove 'build' section

  frontend:
    image: your-dockerhub-username/flyers-frontend:latest
    # Remove 'build' section
```

**Option B: Build on Synology (Advanced)**

SSH into Synology and build there:
```bash
ssh admin@192.168.1.11
cd /volume1/docker/flyers-app/

# Upload backend and frontend folders to Synology first
# Then build:
docker build -t flyers-backend:latest -f backend/Dockerfile --target production backend/
docker build -t flyers-frontend:latest -f frontend/Dockerfile --target production frontend/
```

### Step 4: Create Stack in Portainer

1. **Open Portainer**: http://YOUR_NAS_IP:9000
2. **Go to Stacks** → **+ Add stack**
3. **Name**: `flyers-app`
4. **Build method**: Upload
5. **Upload**: `docker-compose.yml`
6. **Environment variables**: Load from `.env` or manually add each variable
7. Click **Deploy the stack**

### Step 5: Verify Deployment

1. **Check containers**: Portainer → Containers
   - `flyers-backend` should show "running" (healthy)
   - `flyers-frontend` should show "running"
   - `flyers-nginx` should show "running"

2. **Check logs**: Click each container → Logs
   - Backend: Look for "Application startup complete"
   - Frontend: Should show nginx logs
   - No errors in any container

3. **Test health endpoint**:
   ```bash
   curl http://YOUR_NAS_IP/health/ready
   ```

4. **Access application**:
   - Open browser: `http://YOUR_NAS_IP/`
   - Should show login page

---

## Option 2: Git Repository Method

### Step 1: Push Code to GitHub (if not already)

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Create Stack from Git

1. **Portainer** → **Stacks** → **+ Add stack**
2. **Name**: `flyers-app`
3. **Build method**: Repository
4. **Repository URL**: `https://github.com/cliff-simpkins/scouting-flyers`
5. **Repository reference**: `main`
6. **Compose path**: `docker-compose.yml`
7. **Environment variables**: Add all required env vars manually
8. **Enable automatic updates**: Check box (optional)
9. Click **Deploy the stack**

### Benefits of Git Method
- Easy updates: Just push to GitHub and redeploy stack
- Version control: Track what's deployed
- Rollback: Easy to revert to previous version

---

## Adding Monitoring Stack

To also deploy monitoring (Prometheus + Grafana):

### Step 1: Create Second Stack

1. **Portainer** → **Stacks** → **+ Add stack**
2. **Name**: `flyers-monitoring`
3. **Upload**: `docker-compose.monitoring.yml`
4. **Environment variables**:
   ```env
   GRAFANA_ADMIN_USER=admin
   GRAFANA_ADMIN_PASSWORD=your_secure_password
   ```
5. **Deploy the stack**

### Step 2: Access Monitoring

- **Grafana**: http://YOUR_NAS_IP:3001
- **Prometheus**: http://YOUR_NAS_IP:9090

---

## Network Configuration

### Internal Access (LAN Only)

Default configuration works on your local network:
- Application: `http://192.168.1.11/`
- Grafana: `http://192.168.1.11:3001/`

### External Access (Internet)

For testers outside your network:

1. **Configure Synology Router/Firewall**:
   - Forward port 80 → Synology IP:80
   - Forward port 443 → Synology IP:443 (for HTTPS)

2. **Update Environment Variables**:
   ```env
   GOOGLE_REDIRECT_URI=http://YOUR_DOMAIN_OR_IP/api/v1/auth/google/callback
   CORS_ORIGINS=http://YOUR_DOMAIN_OR_IP
   ```

3. **Optional: Setup HTTPS**:
   - Use Synology's built-in SSL certificate
   - Or use Let's Encrypt via Synology

---

## Updating the Deployment

### Method 1: Via Portainer UI

1. **Stacks** → Select `flyers-app`
2. **Editor** → Make changes
3. **Update the stack** button
4. **Pull and redeploy** checkbox (if using images)

### Method 2: Rebuild Images

If you made code changes:

```bash
# On Windows, rebuild and push
docker build -t your-dockerhub-username/flyers-backend:latest backend/
docker push your-dockerhub-username/flyers-backend:latest

# In Portainer, click "Pull and redeploy"
```

### Method 3: Git Method

```bash
# On Windows, push changes
git add .
git commit -m "Update features"
git push origin main

# In Portainer
# Stacks → flyers-app → Pull and redeploy
```

---

## Troubleshooting Portainer Deployment

### "Build failed" Error

**Cause**: Portainer can't build custom Dockerfiles in stacks easily

**Solution**: Use pre-built images from Docker Hub (see Step 3, Option A above)

### "Port already in use"

**Cause**: Another container is using port 80

**Solution**:
- Check running containers in Portainer
- Stop conflicting container
- Or change port mapping in docker-compose.yml

### "Cannot connect to database"

**Cause**: Wrong DB_HOST in environment

**Solution**:
- Verify DB_HOST matches your Synology IP
- Check database container is running
- Test connection: `psql -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db`

### "Health check failing"

**Cause**: Container started but application isn't healthy

**Solution**:
- Check container logs in Portainer
- Verify environment variables are correct
- Test health endpoint: `curl http://YOUR_NAS_IP:8000/health/ready`

### "Cannot access from browser"

**Cause**: Network/firewall issues

**Solution**:
- Verify all containers are running
- Check Synology firewall allows port 80
- Try accessing from same network first
- Check nginx logs for errors

---

## Resource Limits (Recommended)

Add to `docker-compose.yml` to prevent containers from using too much memory:

```yaml
services:
  backend:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M

  frontend:
    deploy:
      resources:
        limits:
          memory: 256M
```

---

## Backup Strategy

### Portainer Backup

Portainer automatically backs up stack configurations.

### Database Backup

Your existing database backup strategy continues to work.

### Volume Backup

Important data is in Docker volumes. Back up with:

```bash
# Backup volumes via Synology Hyper Backup
# Or manually:
docker run --rm -v flyers_app_data:/data -v /volume1/backups:/backup \
  ubuntu tar czf /backup/flyers-app-backup.tar.gz /data
```

---

## Comparison: Windows vs Portainer

| Feature | Windows | Portainer/Synology |
|---------|---------|-------------------|
| **Setup Complexity** | Easy | Medium |
| **Always Available** | No (sleep/shutdown) | Yes (24/7) |
| **Multi-User Access** | Hard | Easy |
| **Remote Access** | Requires setup | Built-in |
| **Resource Usage** | Shared with desktop | Dedicated |
| **Backup/Restore** | Manual | Automated |
| **Production Ready** | No | Yes |
| **Best For** | Development | **Testing & Production** |

---

## When to Use Each

### Use Windows When:
- Developing locally
- Testing changes before deployment
- Debugging issues
- Learning/experimenting

### Use Synology/Portainer When:
- **Sharing with testers** ← Your use case!
- Running production
- Need 24/7 availability
- Multiple users need access
- Want centralized management

---

## Recommended Workflow

1. **Develop on Windows**:
   ```bash
   docker-compose up -d
   # Make changes, test locally
   ./test-deployment.sh
   ```

2. **Commit to Git**:
   ```bash
   git add .
   git commit -m "Feature: XYZ"
   git push origin main
   ```

3. **Deploy to Synology**:
   - Portainer → Update stack from Git
   - Or rebuild and push Docker images

4. **Share with Testers**:
   - Send them: `http://YOUR_NAS_IP/`
   - They test in shared environment

5. **Monitor & Debug**:
   - Grafana: `http://YOUR_NAS_IP:3001/`
   - Logs: Portainer → Container logs

---

## Quick Reference

### Deployment Commands

**Windows:**
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

**Synology/Portainer:**
- Use Portainer web UI
- Or SSH and use same docker-compose commands

### Access URLs

**Windows:**
- App: http://localhost
- Grafana: http://localhost:3001

**Synology:**
- App: http://YOUR_NAS_IP
- Grafana: http://YOUR_NAS_IP:3001
- Portainer: http://YOUR_NAS_IP:9000

---

## Next Steps After Portainer Deployment

1. ✅ Test health endpoints
2. ✅ Verify OAuth works with NAS IP
3. ✅ Set up monitoring in Grafana
4. ✅ Configure backups
5. ✅ Share URL with testers
6. ✅ Monitor usage and logs

---

**For your tester scenario: Deploy to Synology/Portainer!** 🚀

This gives testers 24/7 access to a stable, shared environment while you continue developing on Windows.
