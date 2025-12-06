# Portainer Stack Setup Guide

This guide walks you through deploying the PostgreSQL + PostGIS + pgvector database using Portainer Stacks.

## Prerequisites

- Portainer running on your Synology NAS
- Access to Synology File Station or SSH
- Your existing PostgreSQL superuser password

## Step-by-Step Instructions

### Step 1: Upload Files to Synology

You need to upload these files to your Synology:
- `Dockerfile`
- `docker-compose.yml`

**Option A: Via File Station (Web UI)**
1. Open Synology DSM → File Station
2. Navigate to or create: `/docker/flyers-postgres/`
3. Upload both `Dockerfile` and `docker-compose.yml` to this folder

**Option B: Via SCP (Command Line)**
```bash
# From your Windows machine, in the database directory
scp Dockerfile docker-compose.yml admin@192.168.1.11:/volume1/docker/flyers-postgres/
```

### Step 2: Stop Your Existing PostgreSQL Container

**Important:** Before creating the new stack, stop your current `postgres:17` container to free up port 2775.

1. In Portainer, go to **Containers**
2. Find your existing PostgreSQL container
3. Click **Stop** (don't remove it yet - we may need to reference its volume)
4. Note the **volume name** it's using (check under Volumes tab)

### Step 3: Create Stack in Portainer

1. **Open Portainer** in your browser
2. Go to **Stacks** in the left menu
3. Click **+ Add stack**
4. Configure the stack:

   **Name:** `flyers-postgres`

   **Build method:** Select **Repository** or **Upload**

   **Option A: Upload (Easier)**
   - Click **Upload**
   - Upload the `docker-compose.yml` file

   **Option B: Git Repository**
   - If your files are in a Git repo, enter the repository URL
   - Set repository reference: `main` or `master`
   - Set compose path: `database/docker-compose.yml`

5. **Environment variables:**

   Click **+ Add environment variable** and add:
   ```
   POSTGRES_PASSWORD=<your_postgres_superuser_password>
   ```

6. **Advanced settings (Optional):**

   If you want to use your **existing PostgreSQL volume** (to keep the `flyers_db` you already created):

   - Scroll down to **Environment variables** section
   - In the docker-compose editor, modify the volumes section:
   ```yaml
   volumes:
     postgres_data:
       external: true
       name: <your_existing_volume_name>  # e.g., postgres_data or postgres17_data
   ```

### Step 4: Build Configuration

**IMPORTANT:** Since the stack uses a Dockerfile that needs to be built, you need to ensure Portainer can access the Dockerfile.

**For Upload method:**
After uploading docker-compose.yml, you need to make the Dockerfile available:

1. **Before deploying the stack**, SSH into your Synology:
   ```bash
   ssh admin@192.168.1.11
   cd /var/lib/docker/volumes/portainer_data/_data/compose/<stack-number>
   ```

2. Or better yet, **modify the docker-compose.yml to use full path**:

   Edit the uploaded docker-compose.yml in Portainer's editor:
   ```yaml
   services:
     postgres:
       build:
         context: /volume1/docker/flyers-postgres
         dockerfile: Dockerfile
   ```

### Step 5: Deploy the Stack

1. Click **Deploy the stack**
2. Portainer will:
   - Build the custom image (takes ~3-5 minutes)
   - Create and start the container
   - Create the network
   - Create or mount the volume

3. Monitor the build progress in the stack logs

### Step 6: Verify Deployment

1. Go to **Containers** in Portainer
2. You should see `postgres-postgis-pgvector` running
3. Check the logs to confirm it started successfully:
   ```
   PostgreSQL Database directory appears to contain a database; Skipping initialization
   database system is ready to accept connections
   ```

### Step 7: Run Database Initialization Scripts

Now connect via pgAdmin and run:

1. **Script 02:** `02-enable-postgis.sql` (as postgres user on flyers_db)
   - Enables PostGIS and pgvector extensions

2. **Script 03:** `03-schema.sql` (as flyers_user on flyers_db)
   - Creates all tables and indexes

**Connection details remain the same:**
- Host: 192.168.1.11
- Port: 2775
- Database: flyers_db
- User: flyers_user
- Password: x1ONQ71pb_vRMbarHtd7Z8b39uSW3_LF

## Troubleshooting

### Problem: "Cannot build - Dockerfile not found"

**Solution:** The build context path needs to point to where the Dockerfile is located. Edit the stack's docker-compose.yml:

```yaml
build:
  context: /volume1/docker/flyers-postgres
  dockerfile: Dockerfile
```

### Problem: "Port 2775 is already allocated"

**Solution:** Your old PostgreSQL container is still running. Stop it first.

### Problem: "Volume not found"

**Solution:** If using external volume, make sure the volume name exactly matches your existing volume. List volumes with:
```bash
docker volume ls
```

### Problem: Build takes too long or fails

**Solution:** Check stack logs for errors. Common issues:
- Network timeout downloading base image
- Insufficient disk space on Synology
- Try rebuilding the stack

## Alternative: Pre-built Image

If you have trouble with builds in Portainer, you can build the image locally and push to Docker Hub, then modify the docker-compose.yml to use the pre-built image instead of building.

## Managing the Stack

- **Update:** Edit stack → Update the stack
- **Stop:** Stacks → Select stack → Stop
- **Remove:** Stacks → Select stack → Remove (volumes persist by default)
- **Logs:** Stacks → Select stack → View logs
