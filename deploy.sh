#!/bin/bash

# Smart AAC API Deployment Script for Google Cloud Run
# This script builds and deploys the Smart AAC API to Google Cloud Run

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables (set these before running)
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="smart-aac-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
SERVICE_ACCOUNT="${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    if [ -z "$PROJECT_ID" ]; then
        print_error "PROJECT_ID is not set. Please set GOOGLE_CLOUD_PROJECT environment variable."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Set the project
    gcloud config set project "$PROJECT_ID"
    
    print_success "Configuration validated"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        containerregistry.googleapis.com \
        firestore.googleapis.com \
        storage.googleapis.com \
        aiplatform.googleapis.com \
        --project="$PROJECT_ID"
    
    print_success "APIs enabled"
}

# Function to create service account if it doesn't exist
create_service_account() {
    print_status "Setting up service account..."
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project="$PROJECT_ID" &>/dev/null; then
        print_warning "Service account $SERVICE_ACCOUNT already exists"
    else
        print_status "Creating service account..."
        gcloud iam service-accounts create "${SERVICE_NAME}-sa" \
            --display-name="Smart AAC API Service Account" \
            --description="Service account for Smart AAC API Cloud Run service" \
            --project="$PROJECT_ID"
    fi
    
    # Grant necessary roles
    print_status "Granting IAM roles to service account..."
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/firestore.user"
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/storage.admin"
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/aiplatform.user"
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/firebase.admin"
    
    print_success "Service account configured"
}

# Function to build and push Docker image
build_and_push_image() {
    print_status "Building Docker image..."
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker --quiet
    
    # Build the image
    docker build -t "$IMAGE_NAME" .
    
    print_status "Pushing image to Container Registry..."
    docker push "$IMAGE_NAME"
    
    print_success "Image built and pushed successfully"
}

# Function to deploy to Cloud Run
deploy_to_cloud_run() {
    print_status "Deploying to Cloud Run..."
    
    # Update the service configuration with actual project ID
    sed "s/PROJECT_ID/$PROJECT_ID/g" cloud-run-service.yaml > cloud-run-service-deploy.yaml
    
    # Deploy using gcloud run services replace
    gcloud run services replace cloud-run-service-deploy.yaml \
        --region="$REGION" \
        --project="$PROJECT_ID"
    
    # Clean up temporary file
    rm cloud-run-service-deploy.yaml
    
    print_success "Deployment completed"
}

# Function to get service URL
get_service_url() {
    print_status "Getting service URL..."
    
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="value(status.url)")
    
    print_success "Service deployed successfully!"
    echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
    echo -e "${GREEN}Health Check: ${SERVICE_URL}/health${NC}"
    echo -e "${GREEN}API Health Check: ${SERVICE_URL}/api/v1/health${NC}"
}

# Function to set up Cloud Storage bucket
setup_storage_bucket() {
    print_status "Setting up Cloud Storage bucket..."
    
    BUCKET_NAME="${PROJECT_ID}-aac-storage"
    
    # Check if bucket exists
    if gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
        print_warning "Bucket gs://$BUCKET_NAME already exists"
    else
        print_status "Creating storage bucket..."
        gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$BUCKET_NAME"
        
        # Set bucket permissions
        gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:roles/storage.admin" "gs://$BUCKET_NAME"
    fi
    
    print_success "Storage bucket configured"
}

# Main deployment function
main() {
    echo -e "${BLUE}=== Smart AAC API Deployment ===${NC}"
    echo -e "Project ID: ${PROJECT_ID}"
    echo -e "Region: ${REGION}"
    echo -e "Service Name: ${SERVICE_NAME}"
    echo ""
    
    check_prerequisites
    validate_config
    enable_apis
    create_service_account
    setup_storage_bucket
    build_and_push_image
    deploy_to_cloud_run
    get_service_url
    
    echo ""
    print_success "Deployment completed successfully!"
    echo -e "${YELLOW}Note: Make sure to update your frontend applications with the new service URL.${NC}"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi