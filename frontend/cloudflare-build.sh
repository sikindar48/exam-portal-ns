#!/bin/bash

# Cloudflare Pages build script
# This script ensures environment variables are set for the build

echo "Starting Cloudflare Pages build..."

# Set environment variables for production build
export VITE_API_URL="https://exam-portal-api-479112457276.asia-south1.run.app"
export VITE_FIREBASE_API_KEY="AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8"
export VITE_FIREBASE_AUTH_DOMAIN="ns-exam-portal.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="ns-exam-portal"
export VITE_FIREBASE_STORAGE_BUCKET="ns-exam-portal.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="479112457276"
export VITE_FIREBASE_APP_ID="1:479112457276:web:9c5bfddc5e0b6d1e286739"

echo "Environment variables set for production build"
echo "VITE_API_URL: $VITE_API_URL"

# Run the build
npm run build

echo "Build completed successfully!"
