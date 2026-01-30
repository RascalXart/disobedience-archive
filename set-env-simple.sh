#!/bin/bash

# Simpler script that tries to find Account ID automatically

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Cloudflare Pages Environment Variable Setup (Simplified)${NC}"
echo ""

# Get API token
if [ -z "$CF_API_TOKEN" ]; then
    echo -e "${YELLOW}Enter your Cloudflare API Token:${NC}"
    read -s CF_API_TOKEN
    echo ""
fi

# Get project name
if [ -z "$CF_PROJECT_NAME" ]; then
    echo -e "${YELLOW}Enter your Cloudflare Pages project name:${NC}"
    read CF_PROJECT_NAME
fi

echo ""
echo -e "${YELLOW}Trying to find your Account ID automatically...${NC}"

# Method 1: Try to list Pages projects (this might work without account ID)
echo "Attempting Method 1: List all Pages projects..."
PAGES_LIST=$(curl -s -X GET "https://api.cloudflare.com/client/v4/pages/projects" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

if command -v jq &> /dev/null; then
    SUCCESS=$(echo "$PAGES_LIST" | jq -r '.success // false')
    
    if [ "$SUCCESS" = "true" ]; then
        # Try to find our project
        PROJECT=$(echo "$PAGES_LIST" | jq -r ".result[] | select(.name == \"$CF_PROJECT_NAME\")")
        
        if [ ! -z "$PROJECT" ]; then
            echo -e "${GREEN}✓ Found project: $CF_PROJECT_NAME${NC}"
            # The project object might have account info, but let's try a different approach
        fi
    fi
fi

# Method 2: Try to access the project directly and see what error we get
echo "Attempting Method 2: Access project directly..."
# We'll try with a placeholder and see the error message
TEST_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/pages/projects/$CF_PROJECT_NAME" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" 2>&1)

# Method 3: Try to get user info which might include account info
echo "Attempting Method 3: Get user info..."
USER_INFO=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

if command -v jq &> /dev/null; then
    echo ""
    echo -e "${YELLOW}User info response:${NC}"
    echo "$USER_INFO" | jq '.'
    
    # Check if there's account info in user response
    ACCOUNTS=$(echo "$USER_INFO" | jq -r '.result.organizations[]?.id // empty')
    if [ ! -z "$ACCOUNTS" ]; then
        echo ""
        echo -e "${GREEN}Found organization IDs (might work as Account ID):${NC}"
        echo "$ACCOUNTS"
    fi
fi

echo ""
echo -e "${YELLOW}If automatic detection failed, let's try a different approach:${NC}"
echo "We can try to set the environment variables using the project name only."
echo ""
echo "Enter your Account ID manually (or press Enter to try without it):"
read CF_ACCOUNT_ID

if [ -z "$CF_ACCOUNT_ID" ]; then
    echo -e "${YELLOW}Trying alternative API endpoint...${NC}"
    # Some Cloudflare APIs work without account ID in the path
    # Let's try the Pages API with just the project name
    ENV_VARS='{
      "deployment_configs": {
        "production": {
          "env_vars": {
            "NEXT_PUBLIC_BASE_PATH": {"value": ""},
            "NEXT_PUBLIC_MEDIA_BASE_URL": {"value": "https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies"}
          }
        }
      }
    }'
    
    # Try without account ID (some endpoints work this way)
    RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/pages/projects/$CF_PROJECT_NAME" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$ENV_VARS")
    
    if command -v jq &> /dev/null; then
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}✓ Success! Environment variables set.${NC}"
            exit 0
        else
            echo -e "${RED}That didn't work. Error:${NC}"
            echo "$RESPONSE" | jq '.'
            echo ""
            echo -e "${YELLOW}The error message above might contain your Account ID.${NC}"
        fi
    else
        echo "$RESPONSE"
    fi
else
    # Use the account ID they provided
    API_URL="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT_NAME}"
    
    ENV_VARS='{
      "deployment_configs": {
        "production": {
          "env_vars": {
            "NEXT_PUBLIC_BASE_PATH": {"value": ""},
            "NEXT_PUBLIC_MEDIA_BASE_URL": {"value": "https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies"}
          }
        },
        "preview": {
          "env_vars": {
            "NEXT_PUBLIC_BASE_PATH": {"value": ""},
            "NEXT_PUBLIC_MEDIA_BASE_URL": {"value": "https://pub-71ed1655b8674186957a0405561cd60a.r2.dev/dailies"}
          }
        }
      }
    }'
    
    RESPONSE=$(curl -s -X PATCH "$API_URL" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$ENV_VARS")
    
    if command -v jq &> /dev/null; then
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}✓ Success! Environment variables set.${NC}"
        else
            echo -e "${RED}Error:${NC}"
            echo "$RESPONSE" | jq '.'
        fi
    else
        echo "$RESPONSE"
    fi
fi

