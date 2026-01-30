#!/bin/bash

# Script to set Cloudflare Pages environment variables via API
# You'll need to provide your Cloudflare API token and account ID

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cloudflare Pages Environment Variable Setup${NC}"
echo ""

# Check if required tools are available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. JSON parsing will be limited.${NC}"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Get credentials
if [ -z "$CF_API_TOKEN" ]; then
    echo -e "${YELLOW}Enter your Cloudflare API Token:${NC}"
    echo "  (Get one from: https://dash.cloudflare.com/profile/api-tokens)"
    echo "  (Create token with 'Cloudflare Pages:Edit' permission)"
    read -s CF_API_TOKEN
    echo ""
fi

if [ -z "$CF_ACCOUNT_ID" ]; then
    echo -e "${YELLOW}Enter your Cloudflare Account ID:${NC}"
    echo "  (NOT your email! It's a long alphanumeric string like 'a1b2c3d4e5f6...')"
    echo "  Find it:"
    echo "    1. Go to any Cloudflare dashboard page"
    echo "    2. Look at the right sidebar - Account ID is shown there"
    echo "    3. Or check the URL when viewing your account"
    echo "    4. Format: Usually 32 characters, alphanumeric"
    read CF_ACCOUNT_ID
    
    # Validate it's not an email
    if [[ "$CF_ACCOUNT_ID" == *"@"* ]]; then
        echo -e "${RED}Error: That looks like an email address, not an Account ID!${NC}"
        echo -e "${YELLOW}Account ID is a long string like: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6${NC}"
        echo "Please find your Account ID in the Cloudflare dashboard and try again."
        exit 1
    fi
fi

if [ -z "$CF_PROJECT_NAME" ]; then
    echo -e "${YELLOW}Enter your Cloudflare Pages project name:${NC}"
    echo "  (e.g., 'disobedience-archive')"
    read CF_PROJECT_NAME
fi

# API endpoint
API_URL="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT_NAME}"

echo ""
echo -e "${YELLOW}Fetching current project info...${NC}"

# Get project info to verify credentials
PROJECT_INFO=$(curl -s -X GET "${API_URL}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

if [ "$JQ_AVAILABLE" = true ]; then
    SUCCESS=$(echo "$PROJECT_INFO" | jq -r '.success')
    if [ "$SUCCESS" != "true" ]; then
        echo -e "${RED}Error: Failed to fetch project. Check your credentials.${NC}"
        echo "$PROJECT_INFO" | jq '.'
        exit 1
    fi
    echo -e "${GREEN}✓ Project found: $(echo "$PROJECT_INFO" | jq -r '.result.name')${NC}"
else
    echo "$PROJECT_INFO"
fi

echo ""
echo -e "${YELLOW}Setting environment variables...${NC}"

# Prepare environment variables
# Note: Empty string for NEXT_PUBLIC_BASE_PATH
ENV_VARS='{
  "deployment_configs": {
    "production": {
      "env_vars": {
        "NEXT_PUBLIC_BASE_PATH": {
          "value": ""
        },
        "NEXT_PUBLIC_MEDIA_BASE_URL": {
          "value": "https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies"
        }
      }
    },
    "preview": {
      "env_vars": {
        "NEXT_PUBLIC_BASE_PATH": {
          "value": ""
        },
        "NEXT_PUBLIC_MEDIA_BASE_URL": {
          "value": "https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies"
        }
      }
    }
  }
}'

# Update project with environment variables
RESPONSE=$(curl -s -X PATCH "${API_URL}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$ENV_VARS")

if [ "$JQ_AVAILABLE" = true ]; then
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo -e "${GREEN}✓ Environment variables set successfully!${NC}"
        echo ""
        echo -e "${GREEN}Variables set:${NC}"
        echo "  - NEXT_PUBLIC_BASE_PATH = (empty string)"
        echo "  - NEXT_PUBLIC_MEDIA_BASE_URL = https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies"
        echo ""
        echo -e "${YELLOW}Note: You may need to trigger a new deployment for changes to take effect.${NC}"
    else
        echo -e "${RED}Error: Failed to set environment variables.${NC}"
        echo "$RESPONSE" | jq '.'
        exit 1
    fi
else
    echo "$RESPONSE"
fi

