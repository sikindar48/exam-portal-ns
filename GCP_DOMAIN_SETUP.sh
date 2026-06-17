#!/bin/bash

# GCP Cloud Load Balancer Setup for Custom Domain
# This script sets up a global load balancer to map your custom domain to Cloud Run

set -e

# Configuration - EDIT THESE VALUES
PROJECT_ID="ns-exam-portal"
REGION="asia-south2"
CLOUD_RUN_SERVICE="exam-portal-ns"
YOUR_DOMAIN="test.nssoftwaresolutions.in"  # ← CHANGE THIS TO YOUR ACTUAL DOMAIN
CERTIFICATE_NAME="exam-portal-cert"
BACKEND_SERVICE="exam-portal-backend"
NEG_NAME="exam-portal-neg"
URL_MAP="exam-portal-map"
HTTPS_PROXY="exam-portal-proxy"
FORWARDING_RULE="exam-portal-rule"
STATIC_IP="exam-portal-ip"

echo "========================================"
echo "GCP Cloud Load Balancer Setup"
echo "========================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Cloud Run Service: $CLOUD_RUN_SERVICE"
echo "Domain: $YOUR_DOMAIN"
echo ""

# Step 1: Reserve a static IP
echo "Step 1: Reserving static IP address..."
gcloud compute addresses create $STATIC_IP \
  --global \
  --project=$PROJECT_ID

RESERVED_IP=$(gcloud compute addresses describe $STATIC_IP \
  --global \
  --project=$PROJECT_ID \
  --format='get(address)')

echo "✓ Reserved IP: $RESERVED_IP"
echo ""

# Step 2: Create Network Endpoint Group (NEG) for Cloud Run
echo "Step 2: Creating Network Endpoint Group for Cloud Run..."
gcloud compute network-endpoint-groups create $NEG_NAME \
  --region=$REGION \
  --network-endpoint-type=SERVERLESS \
  --cloud-run-service=$CLOUD_RUN_SERVICE \
  --cloud-run-region=$REGION \
  --project=$PROJECT_ID

echo "✓ Created NEG: $NEG_NAME"
echo ""

# Step 3: Create backend service
echo "Step 3: Creating backend service..."
gcloud compute backend-services create $BACKEND_SERVICE \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTPS \
  --project=$PROJECT_ID

echo "✓ Created backend service: $BACKEND_SERVICE"
echo ""

# Step 4: Add NEG to backend service
echo "Step 4: Adding NEG to backend service..."
gcloud compute backend-services add-backend $BACKEND_SERVICE \
  --instance-group=$NEG_NAME \
  --instance-group-region=$REGION \
  --global \
  --project=$PROJECT_ID

echo "✓ Added NEG to backend service"
echo ""

# Step 5: Create SSL certificate (Google-managed)
echo "Step 5: Creating Google-managed SSL certificate..."
echo "Note: Certificate provisioning may take 5-15 minutes after DNS is set up"
gcloud compute ssl-certificates create $CERTIFICATE_NAME \
  --domains=$YOUR_DOMAIN \
  --global \
  --project=$PROJECT_ID

echo "✓ Created SSL certificate: $CERTIFICATE_NAME"
echo ""

# Step 6: Create URL map
echo "Step 6: Creating URL map..."
gcloud compute url-maps create $URL_MAP \
  --default-service=$BACKEND_SERVICE \
  --global \
  --project=$PROJECT_ID

echo "✓ Created URL map: $URL_MAP"
echo ""

# Step 7: Create HTTPS proxy
echo "Step 7: Creating HTTPS proxy..."
gcloud compute target-https-proxies create $HTTPS_PROXY \
  --url-map=$URL_MAP \
  --ssl-certificates=$CERTIFICATE_NAME \
  --global \
  --project=$PROJECT_ID

echo "✓ Created HTTPS proxy: $HTTPS_PROXY"
echo ""

# Step 8: Create forwarding rule
echo "Step 8: Creating forwarding rule..."
gcloud compute forwarding-rules create $FORWARDING_RULE \
  --global \
  --target-https-proxy=$HTTPS_PROXY \
  --address=$STATIC_IP \
  --project=$PROJECT_ID

echo "✓ Created forwarding rule: $FORWARDING_RULE"
echo ""

# Step 9: Display DNS setup instructions
echo "========================================"
echo "✓ Setup Complete!"
echo "========================================"
echo ""
echo "NEXT STEPS - Add DNS Record at your registrar:"
echo ""
echo "Type:  A"
echo "Name:  @ (or leave blank for root domain)"
echo "Value: $RESERVED_IP"
echo ""
echo "Example for DNS providers:"
echo "  • GoDaddy: Create A record pointing to $RESERVED_IP"
echo "  • Namecheap: Add A record with value $RESERVED_IP"
echo "  • Route 53: Create A record with value $RESERVED_IP"
echo "  • Cloudflare: Create A record with value $RESERVED_IP"
echo ""
echo "DNS propagation typically takes 5-30 minutes."
echo ""
echo "VERIFY SETUP:"
echo "  1. Wait 5-10 minutes for DNS to propagate"
echo "  2. Check DNS: dig $YOUR_DOMAIN"
echo "  3. Test HTTPS: curl https://$YOUR_DOMAIN"
echo "  4. Check certificate status:"
echo "     gcloud compute ssl-certificates describe $CERTIFICATE_NAME --global"
echo ""
echo "TROUBLESHOOTING:"
echo "  • If certificate shows 'Provisioning': DNS hasn't propagated yet"
echo "  • If HTTPS fails: Check DNS records are correct"
echo "  • View resources: gcloud compute addresses list --global"
echo "                    gcloud compute backend-services list --global"
echo "                    gcloud compute ssl-certificates list --global"
echo ""
echo "========================================"
