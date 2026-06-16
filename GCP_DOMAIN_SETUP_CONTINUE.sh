#!/bin/bash

# GCP Cloud Load Balancer Setup - Continue (skip IP reservation)

set -e

# Configuration
PROJECT_ID="ns-exam-portal"
REGION="asia-south2"
CLOUD_RUN_SERVICE="exam-portal-ns"
YOUR_DOMAIN="test.nssoftwaresolutions.in"
CERTIFICATE_NAME="exam-portal-cert"
BACKEND_SERVICE="exam-portal-backend"
NEG_NAME="exam-portal-neg"
URL_MAP="exam-portal-map"
HTTPS_PROXY="exam-portal-proxy"
FORWARDING_RULE="exam-portal-rule"
STATIC_IP="exam-portal-ip"
RESERVED_IP="34.8.157.241"

echo "========================================"
echo "GCP Cloud Load Balancer Setup (Continued)"
echo "========================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Domain: $YOUR_DOMAIN"
echo "Reserved IP: $RESERVED_IP"
echo ""

# Step 2: Create Network Endpoint Group (NEG) for Cloud Run
echo "Step 1: Creating Network Endpoint Group for Cloud Run..."
gcloud compute network-endpoint-groups create $NEG_NAME \
  --region=$REGION \
  --network-endpoint-type=SERVERLESS \
  --cloud-run-service=$CLOUD_RUN_SERVICE \
  --cloud-run-region=$REGION \
  --project=$PROJECT_ID 2>/dev/null || echo "NEG already exists, continuing..."

echo "✓ NEG ready: $NEG_NAME"
echo ""

# Step 3: Create backend service
echo "Step 2: Creating backend service..."
gcloud compute backend-services create $BACKEND_SERVICE \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTPS \
  --project=$PROJECT_ID 2>/dev/null || echo "Backend service already exists, continuing..."

echo "✓ Backend service ready: $BACKEND_SERVICE"
echo ""

# Step 4: Add NEG to backend service
echo "Step 3: Adding NEG to backend service..."
gcloud compute backend-services add-backend $BACKEND_SERVICE \
  --instance-group=$NEG_NAME \
  --instance-group-region=$REGION \
  --global \
  --project=$PROJECT_ID 2>/dev/null || echo "NEG already added to backend, continuing..."

echo "✓ NEG added to backend service"
echo ""

# Step 5: Create SSL certificate
echo "Step 4: Creating Google-managed SSL certificate..."
gcloud compute ssl-certificates create $CERTIFICATE_NAME \
  --domains=$YOUR_DOMAIN \
  --global \
  --project=$PROJECT_ID 2>/dev/null || echo "SSL certificate already exists, continuing..."

echo "✓ SSL certificate: $CERTIFICATE_NAME"
echo ""

# Step 6: Create URL map
echo "Step 5: Creating URL map..."
gcloud compute url-maps create $URL_MAP \
  --default-service=$BACKEND_SERVICE \
  --global \
  --project=$PROJECT_ID 2>/dev/null || echo "URL map already exists, continuing..."

echo "✓ URL map: $URL_MAP"
echo ""

# Step 7: Create HTTPS proxy
echo "Step 6: Creating HTTPS proxy..."
gcloud compute target-https-proxies create $HTTPS_PROXY \
  --url-map=$URL_MAP \
  --ssl-certificates=$CERTIFICATE_NAME \
  --global \
  --project=$PROJECT_ID 2>/dev/null || echo "HTTPS proxy already exists, continuing..."

echo "✓ HTTPS proxy: $HTTPS_PROXY"
echo ""

# Step 8: Create forwarding rule
echo "Step 7: Creating forwarding rule..."
gcloud compute forwarding-rules create $FORWARDING_RULE \
  --global \
  --target-https-proxy=$HTTPS_PROXY \
  --address=$STATIC_IP \
  --project=$PROJECT_ID 2>/dev/null || echo "Forwarding rule already exists, continuing..."

echo "✓ Forwarding rule: $FORWARDING_RULE"
echo ""

echo "========================================"
echo "✓ Setup Complete!"
echo "========================================"
echo ""
echo "YOUR STATIC IP: $RESERVED_IP"
echo ""
echo "NEXT STEPS - Add DNS Record:"
echo ""
echo "Go to your domain registrar (nssoftwaresolutions.in) and add:"
echo ""
echo "Type:  A"
echo "Host:  test"
echo "Value: $RESERVED_IP"
echo ""
echo "Example DNS records:"
echo "  test  A  $RESERVED_IP"
echo ""
echo "DNS propagation typically takes 5-30 minutes."
echo ""
echo "VERIFY SETUP (after DNS propagates):"
echo "  1. dig test.nssoftwaresolutions.in"
echo "  2. curl https://test.nssoftwaresolutions.in"
echo "  3. Check certificate:"
echo "     gcloud compute ssl-certificates describe $CERTIFICATE_NAME --global --project=$PROJECT_ID"
echo ""
echo "========================================"
