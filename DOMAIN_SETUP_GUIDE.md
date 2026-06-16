# GCP Custom Domain Setup Guide (Cloud Load Balancer)

Since `asia-south2` doesn't support direct domain mapping, we'll use Google Cloud Load Balancer to route your custom domain to Cloud Run.

## Prerequisites

- Your Cloud Run service is deployed: `https://exam-portal-ns-479112457276.asia-south2.run.app`
- You own a domain name
- `gcloud` CLI is installed and authenticated

## Step-by-Step Setup

### Option A: Using the Automated Script (Recommended)

1. **Edit the script with your domain:**
```bash
cd /Users/nssikinar/Sites/exam-portal/exam-portal-ns
nano GCP_DOMAIN_SETUP.sh
# Change this line:
# YOUR_DOMAIN="yourdomain.com"  # ← CHANGE THIS TO YOUR ACTUAL DOMAIN
```

2. **Make it executable:**
```bash
chmod +x GCP_DOMAIN_SETUP.sh
```

3. **Run the script:**
```bash
./GCP_DOMAIN_SETUP.sh
```

4. **Note the reserved IP address** from the output (you'll need this for DNS)

### Option B: Manual Setup (If you prefer step-by-step)

If you want to understand each step, follow the commands below:

#### Step 1: Reserve a Static IP

```bash
gcloud compute addresses create exam-portal-ip \
  --global \
  --project=exam-portal-ns-479112457276

# Get your reserved IP
gcloud compute addresses describe exam-portal-ip \
  --global \
  --project=exam-portal-ns-479112457276 \
  --format='get(address)'
```

**Save the output IP address** - you'll use it in DNS setup.

#### Step 2: Create Network Endpoint Group (NEG)

This connects the load balancer to your Cloud Run service:

```bash
gcloud compute network-endpoint-groups create exam-portal-neg \
  --region=asia-south2 \
  --network-endpoint-type=SERVERLESS \
  --cloud-run-service=exam-portal-ns \
  --cloud-run-region=asia-south2 \
  --project=exam-portal-ns-479112457276
```

#### Step 3: Create Backend Service

```bash
gcloud compute backend-services create exam-portal-backend \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTPS \
  --project=exam-portal-ns-479112457276
```

#### Step 4: Add NEG to Backend Service

```bash
gcloud compute backend-services add-backend exam-portal-backend \
  --instance-group=exam-portal-neg \
  --instance-group-region=asia-south2 \
  --global \
  --project=exam-portal-ns-479112457276
```

#### Step 5: Create Google-Managed SSL Certificate

Replace `yourdomain.com` with your actual domain:

```bash
gcloud compute ssl-certificates create exam-portal-cert \
  --domains=yourdomain.com \
  --global \
  --project=exam-portal-ns-479112457276
```

**Note:** The certificate will show "Provisioning" status until DNS is set up (next step).

#### Step 6: Create URL Map

```bash
gcloud compute url-maps create exam-portal-map \
  --default-service=exam-portal-backend \
  --global \
  --project=exam-portal-ns-479112457276
```

#### Step 7: Create HTTPS Proxy

```bash
gcloud compute target-https-proxies create exam-portal-proxy \
  --url-map=exam-portal-map \
  --ssl-certificates=exam-portal-cert \
  --global \
  --project=exam-portal-ns-479112457276
```

#### Step 8: Create Forwarding Rule

```bash
gcloud compute forwarding-rules create exam-portal-rule \
  --global \
  --target-https-proxy=exam-portal-proxy \
  --address=exam-portal-ip \
  --project=exam-portal-ns-479112457276
```

---

## DNS Configuration

After running the setup, you'll have a static IP address. Now you need to add a DNS record at your domain registrar.

### Add DNS Record

**Record Type:** A  
**Name:** @ (or leave blank)  
**Value:** `<YOUR_RESERVED_IP>` (from Step 1 output)

**Examples for popular registrars:**

#### GoDaddy
1. Go to DNS Management
2. Add A record
3. Host: `@`
4. Points to: `<YOUR_RESERVED_IP>`

#### Namecheap
1. Go to Domain → Manage
2. Advanced DNS tab
3. Add A record
4. Host: `@`
5. Value: `<YOUR_RESERVED_IP>`

#### Google Domains / Google Cloud Domains
1. Go to DNS settings
2. Create A record
3. Name: Leave blank (for root) or enter subdomain
4. IPv4: `<YOUR_RESERVED_IP>`

#### Route 53 (AWS)
1. Go to Hosted Zone for your domain
2. Create A record
3. Name: Leave blank (for root)
4. Value: `<YOUR_RESERVED_IP>`

#### Cloudflare
1. Go to DNS
2. Add A record
3. Name: `@` (for root) or subdomain
4. IPv4 Address: `<YOUR_RESERVED_IP>`

---

## Verification & Troubleshooting

### Check DNS Propagation

```bash
# Should show your reserved IP
dig yourdomain.com
nslookup yourdomain.com
```

### Check Certificate Status

```bash
gcloud compute ssl-certificates describe exam-portal-cert \
  --global \
  --project=exam-portal-ns-479112457276
```

**Expected states:**
- `PROVISIONING` → Certificate is being validated (takes 5-15 mins after DNS is set)
- `ACTIVE` → Ready to use
- `MANAGED_RENEWAL` → Automatically renewing

### Test HTTPS Connection

```bash
curl https://yourdomain.com
curl -I https://yourdomain.com
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Certificate stuck on "Provisioning" | DNS hasn't propagated yet, wait 10-15 mins |
| Connection refused | DNS record not added or incorrect IP |
| SSL/TLS error | Certificate still provisioning, try again in 5 mins |
| Wrong content served | Check load balancer is pointing to correct Cloud Run service |

### View All Resources

```bash
# List all static IPs
gcloud compute addresses list --global

# List all backend services
gcloud compute backend-services list --global

# List all SSL certificates
gcloud compute ssl-certificates list --global

# List all forwarding rules
gcloud compute forwarding-rules list --global
```

---

## What's Happening Behind the Scenes

```
Your Domain (yourdomain.com)
    ↓
DNS A Record (points to: <RESERVED_IP>)
    ↓
Cloud Load Balancer (listens on <RESERVED_IP>:443)
    ↓
Forwarding Rule (routes HTTPS traffic)
    ↓
Target HTTPS Proxy (handles SSL/TLS encryption)
    ↓
URL Map (routes requests to backend)
    ↓
Backend Service (distributes traffic)
    ↓
Network Endpoint Group (routes to Cloud Run)
    ↓
Cloud Run Service (exam-portal-ns)
```

---

## Next Steps

Once your domain is working:

1. **Update frontend environment variables** (if applicable):
   - Change API base URL from `https://exam-portal-ns-479112457276.asia-south2.run.app` to `https://yourdomain.com`

2. **Update CORS settings** (if needed):
   - Update backend CORS to allow requests from `https://yourdomain.com`

3. **Add HTTP to HTTPS redirect** (optional but recommended):
```bash
gcloud compute url-maps create exam-portal-http-redirect \
  --global

gcloud compute url-maps add-path-rule exam-portal-http-redirect \
  --path-rule="/=exam-portal-redirect-to-https" \
  --global

gcloud compute target-http-proxies create exam-portal-http-proxy \
  --url-map=exam-portal-http-redirect \
  --global

gcloud compute forwarding-rules create exam-portal-http-rule \
  --global \
  --target-http-proxy=exam-portal-http-proxy \
  --address=exam-portal-ip \
  --ports=80
```

4. **Monitor traffic**:
   - View logs in Cloud Console
   - Check Cloud Run metrics
   - Monitor Load Balancer traffic

---

## Cleanup (If Needed)

If you need to remove the load balancer:

```bash
# Delete in reverse order
gcloud compute forwarding-rules delete exam-portal-rule --global
gcloud compute target-https-proxies delete exam-portal-proxy --global
gcloud compute url-maps delete exam-portal-map --global
gcloud compute ssl-certificates delete exam-portal-cert --global
gcloud compute backend-services delete exam-portal-backend --global
gcloud compute network-endpoint-groups delete exam-portal-neg --region=asia-south2
gcloud compute addresses delete exam-portal-ip --global
```

---

## Support

For issues, check:
- [GCP Load Balancer Documentation](https://cloud.google.com/load-balancing/docs)
- [GCP SSL Certificate Documentation](https://cloud.google.com/load-balancing/docs/ssl-certificates)
- [Cloud Run to Load Balancer Guide](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
