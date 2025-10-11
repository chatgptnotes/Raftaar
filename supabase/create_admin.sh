#!/bin/bash

# ================================================
# Create Admin User in Supabase
# ================================================

# Supabase Configuration
SUPABASE_URL="https://feuqkbefbfqnqkkfzgwt.supabase.co"
# Replace with your service role key
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# Admin User Details
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD="bhupendra"
ADMIN_NAME="Admin User"

echo "Creating admin user..."

# Create admin user using Supabase Auth Admin API
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$ADMIN_EMAIL"'",
    "password": "'"$ADMIN_PASSWORD"'",
    "email_confirm": true,
    "user_metadata": {
      "role": "admin",
      "full_name": "'"$ADMIN_NAME"'"
    }
  }')

echo "Response: $RESPONSE"

# Extract user ID from response
USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$USER_ID" ]; then
  echo "✅ Admin user created successfully!"
  echo "   User ID: $USER_ID"
  echo "   Email: $ADMIN_EMAIL"
  echo ""
  echo "Now updating role in users table..."

  # Note: The trigger should have already created the users table entry
  # This is just to ensure the role is set to admin
  echo "Run this SQL in Supabase SQL Editor:"
  echo "UPDATE users SET role = 'admin', full_name = 'Admin User' WHERE email = 'admin@gmail.com';"
else
  echo "❌ Error creating admin user"
  echo "Response: $RESPONSE"
fi
