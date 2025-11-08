#!/bin/bash

# Smart AAC API Deployment Validation Script
# This script validates that the deployment is working correctly

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="smart-aac-api"

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

# Function to validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    if [ -z "$PROJECT_ID" ]; then
        print_error "PROJECT_ID is not set. Please set GOOGLE_CLOUD_PROJECT environment variable."
        exit 1
    fi
    
    print_success "Configuration validated"
}

# Function to get service URL
get_service_url() {
    print_status "Getting service URL..."
    
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="value(status.url)" 2>/dev/null)
    
    if [ -z "$SERVICE_URL" ]; then
        print_error "Service not found or not deployed"
        exit 1
    fi
    
    echo "$SERVICE_URL"
}

# Function to test health endpoint
test_health_endpoint() {
    local service_url=$1
    print_status "Testing health endpoint..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url/health" || echo "000")
    
    if [ "$response" = "200" ]; then
        print_success "Health endpoint is working"
        return 0
    else
        print_error "Health endpoint failed with status: $response"
        return 1
    fi
}

# Function to test API health endpoint
test_api_health_endpoint() {
    local service_url=$1
    print_status "Testing API health endpoint..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url/api/v1/health" || echo "000")
    
    if [ "$response" = "200" ]; then
        print_success "API health endpoint is working"
        return 0
    else
        print_error "API health endpoint failed with status: $response"
        return 1
    fi
}

# Function to test service connectivity
test_service_connectivity() {
    local service_url=$1
    print_status "Testing service connectivity..."
    
    # Test basic connectivity
    if curl -s --max-time 10 "$service_url/health" > /dev/null; then
        print_success "Service is reachable"
    else
        print_error "Service is not reachable"
        return 1
    fi
    
    # Test response time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "$service_url/health")
    print_status "Response time: ${response_time}s"
    
    if (( $(echo "$response_time < 5.0" | bc -l) )); then
        print_success "Response time is acceptable"
    else
        print_warning "Response time is slow (${response_time}s)"
    fi
}

# Function to check service configuration
check_service_config() {
    print_status "Checking service configuration..."
    
    # Get service details
    service_info=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="json" 2>/dev/null)
    
    if [ -z "$service_info" ]; then
        print_error "Could not retrieve service information"
        return 1
    fi
    
    # Check memory allocation
    memory=$(echo "$service_info" | jq -r '.spec.template.spec.containers[0].resources.limits.memory // "unknown"')
    print_status "Memory allocation: $memory"
    
    # Check CPU allocation
    cpu=$(echo "$service_info" | jq -r '.spec.template.spec.containers[0].resources.limits.cpu // "unknown"')
    print_status "CPU allocation: $cpu"
    
    # Check concurrency
    concurrency=$(echo "$service_info" | jq -r '.spec.template.spec.containerConcurrency // "unknown"')
    print_status "Container concurrency: $concurrency"
    
    # Check service account
    service_account=$(echo "$service_info" | jq -r '.spec.template.spec.serviceAccountName // "unknown"')
    print_status "Service account: $service_account"
    
    print_success "Service configuration checked"
}

# Function to test authentication (if token is available)
test_authentication() {
    local service_url=$1
    print_status "Testing authentication..."
    
    # Test without authentication (should return 401 for protected endpoints)
    response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url/api/v1/boards" || echo "000")
    
    if [ "$response" = "401" ]; then
        print_success "Authentication is properly enforced"
    else
        print_warning "Authentication test returned unexpected status: $response"
    fi
}

# Function to run all validation tests
run_validation() {
    echo -e "${BLUE}=== Smart AAC API Deployment Validation ===${NC}"
    echo -e "Project ID: ${PROJECT_ID}"
    echo -e "Region: ${REGION}"
    echo -e "Service Name: ${SERVICE_NAME}"
    echo ""
    
    validate_config
    
    SERVICE_URL=$(get_service_url)
    print_success "Service URL: $SERVICE_URL"
    echo ""
    
    # Run tests
    local test_results=0
    
    test_health_endpoint "$SERVICE_URL" || ((test_results++))
    test_api_health_endpoint "$SERVICE_URL" || ((test_results++))
    test_service_connectivity "$SERVICE_URL" || ((test_results++))
    check_service_config || ((test_results++))
    test_authentication "$SERVICE_URL" || ((test_results++))
    
    echo ""
    
    if [ $test_results -eq 0 ]; then
        print_success "All validation tests passed!"
        echo -e "${GREEN}Your Smart AAC API deployment is working correctly.${NC}"
        echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
    else
        print_warning "$test_results validation test(s) failed or returned warnings"
        echo -e "${YELLOW}Please review the output above and address any issues.${NC}"
        exit 1
    fi
}

# Main function
main() {
    # Check if required tools are installed
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed - some checks will be limited"
    fi
    
    run_validation
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi