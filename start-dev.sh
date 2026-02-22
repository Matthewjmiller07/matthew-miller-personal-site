#!/bin/bash

# Start the development server with Supabase environment variables
export PUBLIC_SUPABASE_URL="https://qukziojymwlvmrzapgyo.supabase.co"
export PUBLIC_SUPABASE_ANON_KEY="sb_publishable__aLEcTprJpumgIBhcwE_BA_XVMDW9vQ"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in PATH"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting development server..."
npm run dev
