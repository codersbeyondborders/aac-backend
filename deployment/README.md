# Smart AAC API Deployment Guide

This guide covers the deployment of the Smart AAC API to Google Cloud Run.

## Prerequisites

Before deploying, ensure you have:

1. **Google Cloud SDK** installed and configured
2. **Docker** installed and running
3. **Node.js 18+** for local development
4. **Google Cloud Project** with billing enabled
5. **Required permissions** in your Google Cloud project

## Required Google Cloud APIs

The following APIs must be enabled in your Google Cloud project:

- Cloud Run API (`run.googleapis.com`)
- Cloud Build API (`cloudbuild.googleapis.com`)
- Container Registry API (`containerregistry.googleapis.com`)
- Firestore API (`firestore.googleapis.com`)
- Cloud Storage API (`storage.googleapis.com`)
- Vertex AI API (`aiplatform.googleapis.com`)

## Environment Setup

### 1. Configure Environment Variables

Copy the appropriate environment file for your deployment:

```bash
# For production
cp deployment/environments/production.env .env

# For staging
cp deployment/environments/staging.env .env
```

Update the `.env` file with your actual project values:

```bash
# Required: Update these values
GOOGLE_CLOUD_PROJECT=your-actual-project-id
FIREBASE_PROJECT_ID=your-actual-project-id
STORAGE_BUCKET_NAME=your-actual-project-id-aac-storage
```

### 2. Authentication

Authenticate with Google Cloud:

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Configure Docker authentication
gcloud auth configure-docker
```

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

The easiest way to deploy is using the provided deployment script:

```bash
# Set your project ID
export GOOGLE_CLOUD_PROJECT=your-project-id

# Run the deployment script
./deploy.sh
```

The script will:
- Check prerequisites
- Enable required APIs
- Create service accounts and IAM roles
- Set up Cloud Storage bucket
- Build and push Docker image
- Deploy to Cloud Run
- Perform health checks

### Method 2: Manual Deployment

#### Step 1: Enable APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    aiplatform.googleapis.com
```

#### Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create smart-aac-api-sa \
    --display-name="Smart AAC API Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:smart-aac-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firestore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:smart-aac-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:smart-aac-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:smart-aac-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"
```

#### Step 3: Create Cloud Storage Bucket

```bash
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://YOUR_PROJECT_ID-aac-storage
gsutil iam ch serviceAccount:smart-aac-api-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com:roles/storage.admin gs://YOUR_PROJECT_ID-aac-storage
```

#### Step 4: Build and Push Docker Image

```bash
# Build the image
docker build -t gcr.io/YOUR_PROJECT_ID/smart-aac-api .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/smart-aac-api
```

#### Step 5: Deploy to Cloud Run

```bash
# Update the service configuration with your project ID
sed "s/PROJECT_ID/YOUR_PROJECT_ID/g" cloud-run-service.yaml > cloud-run-service-deploy.yaml

# Deploy the service
gcloud run services replace cloud-run-service-deploy.yaml \
    --region=us-central1
```

### Method 3: CI/CD with Cloud Build

For automated deployments, set up Cloud Build triggers:

1. **Connect your repository** to Cloud Build
2. **Create a trigger** that uses `cloudbuild.yaml`
3. **Set substitution variables**:
   - `_REGION`: `us-central1`

The Cloud Build pipeline will:
- Run tests
- Build Docker image
- Deploy to Cloud Run
- Perform health checks

## Local Development

### Using Docker Compose

```bash
# Start local development environment
docker-compose up -d

# View logs
docker-compose logs -f smart-aac-api

# Stop environment
docker-compose down
```

### Using Firestore Emulator

```bash
# Start with Firestore emulator
docker-compose --profile emulator up -d

# The API will connect to the local Firestore emulator
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT` | Google Cloud Project ID | Yes |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | Yes |
| `VERTEX_AI_LOCATION` | Vertex AI region | Yes |
| `STORAGE_BUCKET_NAME` | Cloud Storage bucket name | Yes |
| `NODE_ENV` | Environment (production/staging/development) | Yes |
| `PORT` | Server port (default: 8080) | No |
| `LOG_LEVEL` | Logging level (info/debug/error) | No |

### Cloud Run Configuration

The service is configured with:
- **Memory**: 2GB
- **CPU**: 2 vCPUs
- **Concurrency**: 100 requests per instance
- **Timeout**: 300 seconds
- **Auto-scaling**: 0-10 instances

## Monitoring and Troubleshooting

### Health Checks

- **Basic health**: `GET /health`
- **Detailed health**: `GET /api/v1/health`

### Logs

View Cloud Run logs:

```bash
gcloud logs read --service=smart-aac-api --region=us-central1
```

### Common Issues

1. **Authentication errors**: Ensure service account has proper roles
2. **API not enabled**: Check that all required APIs are enabled
3. **Firestore permissions**: Verify Firestore database exists and is accessible
4. **Storage bucket**: Ensure bucket exists and service account has access
5. **Vertex AI quota**: Check Vertex AI quotas and limits

### Debugging

Enable debug logging by setting `LOG_LEVEL=debug` in your environment configuration.

## Security Considerations

1. **Service Account**: Uses least-privilege principle
2. **CORS**: Configured for specific origins in production
3. **HTTPS**: All traffic encrypted in transit
4. **Authentication**: Firebase JWT tokens required for protected endpoints
5. **Input validation**: All inputs validated and sanitized

## Scaling and Performance

The service automatically scales based on:
- Request volume
- CPU utilization
- Memory usage

Configure scaling parameters in `cloud-run-service.yaml`:
- `autoscaling.knative.dev/minScale`
- `autoscaling.knative.dev/maxScale`
- `containerConcurrency`

## Cost Optimization

- **Cold starts**: Minimized with optimized Docker image
- **Auto-scaling**: Scales to zero when not in use
- **Resource allocation**: Right-sized for workload
- **Request batching**: Efficient handling of concurrent requests

## Support

For deployment issues:
1. Check the logs using `gcloud logs read`
2. Verify all prerequisites are met
3. Ensure environment variables are correctly set
4. Test health endpoints after deployment